# Obsidian デイリーノート連携 設計

- 日付: 2026-08-24
- 対象: 思考整理（voice-memo PWA）
- 状態: 設計確定待ち

## 背景と目的

音声メモの整理結果を Obsidian に流し込みたい。利用端末は **Android**、アプリは Render 上でホストされた PWA。

データは全て端末の localStorage にあり、サーバ（`server.js`）は AI API への中継のみで何も保存しない。したがって Obsidian の vault へサーバ経由で書き込む経路は存在しない。連携は端末上で完結させる必要がある。

利用者が選んだ運用は **「デイリーノートに追記」**（1日1ファイルに、その日のメモを積み上げる）。

## 方式

`obsidian://daily` URI を使う。

```
obsidian://daily?vault=<vault名>&append=true&content=<URIエンコードしたMarkdown>
```

公式ドキュメントより、`daily` アクションは `new` と同じパラメータを受け取り、`content` / `append` / `clipboard` / `silent` / `vault` に対応する。

この方式を選ぶ理由:

- **Obsidian 側のデイリーノート設定（保存フォルダ・ファイル名形式・テンプレート）をそのまま使う。** アプリ側で日付書式やフォルダを保持しないため、設定のズレによる事故が起きない。
- **ワンタップ。** Android 共有シート経由（Obsidian を選ぶ → 追記先を選ぶ）は3タップかかるうえ、新規ノート作成が煩雑という既知の弱点がある。
- サーバ改修・OAuth・ファイルシステム権限のいずれも不要。

### 検討したが採らなかった案

| 案 | 不採用の理由 |
|---|---|
| Android 共有シート（`navigator.share`） | 動作はするが3タップ。追記先を毎回手で選ぶ必要がある |
| File System Access API で vault へ直接書き込み | Chrome for Android M132 で `showDirectoryPicker()` ごと出荷済みだが、出荷時点で「新規ファイルを作成できない」「ファイル数の多いフォルダで固まる」等の不具合報告がある。現状は要実機検証で、リスクに見合わない |
| Obsidian Local REST API プラグイン | デスクトップの localhost のみ。別端末の PWA からは到達不能。加えて HTTPS ページから HTTP への通信はブロックされる |

## スコープ

### やること

- メモ1件を、その日のデイリーノートの末尾に Markdown で追記する
- 送信済みメモを識別し、二重送信を抑止する
- vault 名を設定画面から登録する

### やらないこと

- Obsidian → アプリの逆方向の同期（一方通行のみ）
- 日記タブ・週間まとめの送信（今回はメモのみ）
- 複数メモの一括送信
- 文字起こし全文の送信（後述）

## Markdown 生成仕様

関数 `memoToMarkdown(memo)` を新設する。入力は既存のメモオブジェクト、出力は文字列。

### 入力データ構造（既存・確認済み）

```js
memo = {
  id, ts, transcription,
  organized: {
    title, summary, workspace,
    categories: {
      tasks|shopping|ideas|reminders|notes: [
        { text, due, done, priority }   // due: "YYYY-MM-DD"|null, priority: "high"|"medium"|null
      ]
    }
  }
}
```

### 出力形式

先頭に空行を1つ置く（既存の内容と続き文字にならないようにするため）。

```markdown

## 14:32 会議の準備
明日の定例に向けた資料作成。

- [ ] 資料を作る 📅 2026-08-25 ⏫
- [ ] 🔔 田中さんに連絡
- [ ] 🛒 牛乳
- 💡 通知の出し方を変える案
- 雑多なメモ
```

### 変換ルール

| 要素 | 出力 |
|---|---|
| 見出し | `## HH:MM {title}` — 時刻は `memo.ts` のローカル時刻、`title` が空なら `音声メモ` |
| 要約 | `summary` があれば見出しの次行に段落として出力。なければ省略 |
| tasks | `- [ ] {text}` / 完了済みは `- [x] {text}` |
| reminders | `- [ ] 🔔 {text}` / 完了済みは `- [x] 🔔 {text}` |
| shopping | `- [ ] 🛒 {text}` / 完了済みは `- [x] 🛒 {text}` |
| ideas | `- 💡 {text}`（チェックボックスなし） |
| notes | `- {text}`（チェックボックスなし） |
| 期限 | 項目末尾に ` 📅 {due}`（`due` が null なら付けない） |
| 優先度 | 期限のさらに後ろに ` ⏫`（high）/ ` 🔼`(medium) / なし（null） |

カテゴリの出力順は既存の `CATEGORY_CONFIG` の定義順（tasks → shopping → ideas → reminders → notes）ではなく、上表の実用順（tasks → reminders → shopping → ideas → notes）とする。デイリーノートでは行動可能な項目を上に置きたいため。

空のカテゴリは行を出さない。全カテゴリが空でも `summary` があれば、見出しと要約だけを出力する。

`summary` が空かつ全カテゴリが空の場合は「送る内容なし」と判定する（`title` は常に既定値 `音声メモ` が入りうるため、判定条件に含めない）。この場合の挙動はエラー処理の節を参照。

### 前提（Tasks プラグイン）

`📅` / `⏫` / `🔼` は Obsidian Tasks プラグインの記法。**プラグイン未導入でも絵文字＋日付として素直に読めるため、既定でこの記法を使う。**

利用者は Tasks プラグインの使用有無を明言していない。未導入で表記を変えたい場合は、変換ルール表の「期限」「優先度」の2行を差し替えるだけで済む（例: `（期限: 8/25）`）。

### エスケープ

Markdown としてのエスケープは行わない。メモ本文は AI が生成した平文で、Markdown 記法が混入する可能性は低く、エスケープすると Obsidian 上で読みにくくなるため。

URI に載せる際は `encodeURIComponent()` を使う。公式ドキュメントが「値は適切に URI エンコードすること。`/` は `%2F`、空白は `%20`」と明記しているとおり、`encodeURIComponent` はこの要件を満たす。

## URL 長対策

`content=` パラメータは URL に載るため長さの上限を受ける。**Android 実機での実効上限は未検証**なので、以下の二段構えにする。

1. 組み立てた URI 全体の長さが `OBSIDIAN_URL_LIMIT`（既定 2000 文字）以下なら、`content=` で送る
2. 超える場合は、Markdown を `navigator.clipboard.writeText()` でクリップボードに書き、`clipboard=true` を付けて送る（`content` は付けない）

`clipboard=true` は公式パラメータで、クリップボードの内容を本文として使う。**この経路には URL 長の制限がかからない**ため、どれだけ長いメモでも詰まない。

`OBSIDIAN_URL_LIMIT` は定数として1箇所にまとめ、実機検証後に調整できるようにする。

**文字起こし全文（`memo.transcription`）は送らない。** デイリーノートに全文が積み上がると読みづらく、URL 長も押し上げるため。要約と整理済み項目のみを送る。

### クリップボード経路の失敗時

`navigator.clipboard.writeText()` は権限やブラウザ状態で失敗しうる。失敗したら Obsidian を開かず、`toast()` でエラーを表示し、送信済みマークも付けない。

## 送信済みの管理

localStorage キー `voiceMemoObsidianSent`（`string[]`、メモ ID の配列）に送信済み ID を保持する。保存には既存の `persist()` ヘルパーを使う。

- 未送信: ボタン表記 `🔮 Obsidian`
- 送信済み: ボタン表記 `🔮 送信済`（既存の「📔 日記済」と同じ見せ方）

**送信の成否は検知できない。** URI を開いた後に Obsidian が実際に追記したかどうかを Web 側から知る手段はないため、マークは「開いた時点で楽観的に付ける」。

このため、送信済みボタンをもう一度押したときは `confirm()` で確認を取ってから再送する（Obsidian が起動しなかった場合の救済）。

## UI 変更

### メモカード

`memoBodyHTML()` の操作ボタン列、「共有」の直前に追加する:

```
[Todoistへ追加] [💼仕事] [追記] [編集] [📔日記] [🔮 Obsidian] [共有] [削除]
```

クリックは既存のイベント委譲（`data-action="obsidian"`）に載せる。

### 設定画面

`index.html` の設定ビューに、Todoist カードと同じ体裁でカードを1枚追加する。

- 入力欄1つ: vault 名（localStorage キー `obsidianVault`）
- 保存 / 削除ボタン
- 説明文: 空欄でも動作し、その場合は最後に開いた vault が使われる旨

`vault` が空なら URI から `vault` パラメータ自体を省く。

## 実装箇所

| ファイル | 変更内容 |
|---|---|
| `public/app.js` | `memoToMarkdown()`、`sendToObsidian()`、送信済みリストの読み書きを追加。`memoBodyHTML()` にボタン追加。click 委譲に `obsidian` アクション追加。設定の保存/削除ハンドラ追加 |
| `public/index.html` | 設定ビューに Obsidian カードを追加 |
| `public/style.css` | 既存の `.pill-btn` / `.settings-card` を流用するため、原則追加なし。送信済みの色分けが必要なら `.diary-added` に倣って1クラス追加 |
| `public/sw.js` | キャッシュ名と `ASSETS` のバージョン付き URL を更新 |
| `server.js` | `/api/health` の `version` を上げるのみ。**API の追加・変更はなし** |

キャッシュバスティングは CLAUDE.md の規約どおり、`index.html` の `app.js?v=` / `style.css?v=`、`sw.js` の `CACHE` 名、`server.js` の `/api/health` が返す `version` を揃えて次の番号（v53）に上げる。`server.js` はこの1行のみの変更。

## エラー処理

| 状況 | 挙動 |
|---|---|
| メモに送る内容がない（title も summary も項目も空） | `toast('送る内容がありません')`、Obsidian を開かない |
| クリップボード書き込み失敗 | `toast()` でエラー、Obsidian を開かない、送信済みにしない |
| Obsidian が未インストール | 検知不能。Android 側で「アプリが見つからない」挙動になる。アプリからは制御しない |

## 検証方法

自動テストは置かない（このリポジトリにテスト基盤がなく、中核が外部アプリ起動のため）。以下を実機で確認する。

1. 短いメモを送り、その日のデイリーノートの末尾に追記されること
2. 同じ日にもう1件送り、**上書きではなく追記**されること（`append=true` の確認）
3. デイリーノートがまだ存在しない日に送り、Obsidian 側の設定どおりに新規作成されること
4. タスク項目が Obsidian 上でチェックボックスとして描画されること
5. 長いメモ（項目20件以上）を送り、`clipboard` 経路に切り替わって全文が欠けずに入ること
6. 5 の結果を見て `OBSIDIAN_URL_LIMIT` を調整する
7. vault 名を空にしても動くこと

デスクトップ環境からは Obsidian の URI 起動を検証できないため、**Markdown 生成（`memoToMarkdown`）と URI 組み立てまでは開発側で確認し、起動以降は実機確認**とする。

## 未確定事項と既定値

| 項目 | 既定 | 変更が必要になる条件 |
|---|---|---|
| Tasks プラグイン記法 | 使う（`📅` `⏫` `🔼`） | 利用者が別表記を希望した場合 |
| `OBSIDIAN_URL_LIMIT` | 2000 | 実機検証の結果 |
| 文字起こし全文 | 送らない | 利用者が全文も欲しいと言った場合 |

## 参考

- Obsidian URI 公式ドキュメント: https://obsidian.md/help/Extending+Obsidian/Obsidian+URI
- File System Access API on Android（不採用案の根拠）: https://groups.google.com/a/chromium.org/g/blink-dev/c/x3IcFv2jY6c

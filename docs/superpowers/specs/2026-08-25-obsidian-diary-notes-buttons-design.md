# 日記タブ・ノートタブへの Obsidian 送信ボタン 設計

- 日付: 2026-08-25
- 対象: 思考整理（voice-memo PWA）
- 前提: `2026-08-24-obsidian-daily-note-integration-design.md`（v53）と `2026-08-24-obsidian-wikilinks-design.md`（v54）で実装済みの Obsidian 連携
- 状態: 設計確定待ち

## 背景と目的

現在「🔮 Obsidian」ボタンはメモカード（録音タブの結果・履歴タブ）にしかない。日記タブとノートタブからも同じように Obsidian へ送れるようにする。

## 方式

既存の `obsidian://daily?append=true` の仕組みをそのまま使い、**その日のデイリーノートに追記する**（利用者が A 案を選択）。

送信処理（URL 長の判定、クリップボードへの切り替え、送信済みの記録、Obsidian の起動）は既存のものを再利用する。現在それは「メモを受け取って Markdown 化する」処理と一体になっているので、**Markdown を受け取る形に切り出す**。日記もノートも同じ経路に乗る。

### 検討したが採らなかった案

| 案 | 不採用の理由 |
|---|---|
| 日記ごとに `obsidian://new` で独立したノートを作る | Obsidian 側の「新規ノートの既定の場所」に作られ、保存先を指定できない。既にデイリーノートを使っている場合に散らばる |
| 日記の日付のデイリーノートへ入れる | **技術的に不可能。** 利用者のデイリーノートのファイル名形式も保存フォルダもアプリからは分からない。それを知らずに済ませることが `obsidian://daily` を選んだ理由 |
| ノートタブでは表示中の要約・アイデア・メモだけを送る | 同じメモに対して2種類の出力ができ、「送信済」の意味が曖昧になる（ノートだけ送った状態を送信済と呼ぶのか） |

## スコープ

### やること

- 日記カードに「🔮 Obsidian」ボタンを追加し、日記1件をデイリーノートに追記する
- ノートカードに「🔮 Obsidian」ボタンを追加する（挙動はメモカードと同一）
- 送信処理を Markdown 受け取り型に切り出して再利用する

### やらないこと

- 日記の独立ノート化
- 週間まとめ・AI 会話の回答の送信
- 複数まとめて送る機能
- Obsidian → アプリの逆方向の同期

## 日記の Markdown 生成

関数 `diaryToMarkdown(entry)` を新設する。送る内容がなければ空文字列 `''` を返す。

### 入力データ構造（既存・確認済み）

```js
entry = {
  id,          // 'diy_' + Date.now()
  ts,          // 数値
  date,        // 'YYYY-MM-DD'
  title,       // 空文字列でありうる
  text,        // 生の下書き
  formatted,   // AI整形済み本文。未整形なら text と同じ
  highlights,  // string[]。空配列でありうる
  memoId,      // 音声メモ由来の場合のみ存在
}
```

### 出力形式

先頭に空行を1つ置く（既存の内容と行が繋がらないようにするため。メモと同じ）。

```markdown

## 2026-08-20 日記「暑い一日」
朝から気温が高かった。見積もりの件が片付いた。

- ✨ 朝の散歩が気持ちよかった
- ✨ 見積もりの件が片付いた
```

### 変換ルール

| 要素 | 出力 |
|---|---|
| 見出し（今日の日記） | `## 日記「{title}」`。`title` が空なら `## 日記` |
| 見出し（今日以外） | `## {entry.date} 日記「{title}」`。`title` が空なら `## {entry.date} 日記` |
| 本文 | `entry.formatted || entry.text` をそのまま出力（改行を保つ） |
| ハイライト | 各要素を `- ✨ {highlight}` として本文の後に空行を挟んで出力。空配列なら省略 |

「今日かどうか」の判定は `entry.date === todayISO()`。メモの見出しと同じ考え方（`obsidian://daily` は常に今日のノートに追記されるため、過去のものは日付が分からなくなる）。

`entry.date` が無い壊れたデータの場合は `todayISO()` を使う。

### 送る内容がない判定

本文（`entry.formatted || entry.text` を trim したもの）が空、かつハイライトも空なら `''` を返す。`title` は判定に含めない（空でありうるため）。

### ウィキリンク

`applyWikiLinks()` を、**本文全体に1回**、そして**ハイライトの各要素にそれぞれ1回**適用する。

**リンク対象語は登録語（`getLinkWords()`）のみ。** 日記は `/api/organize` を通っていないので `entities` を持たない。

本文は複数行の長文になりうるが、`applyWikiLinks()` は**1回の呼び出しにつき各語1回**しか置換しないため、本文全体を1回の呼び出しで処理すれば、長い日記でもその語のリンクは1つで済む（行ごとに分割してはならない。分割すると行数分リンクが増える）。

ハイライトは要素ごとに別の呼び出しになるため、同じ語が本文とハイライトの両方にあれば両方リンクになる。これはメモの「要約と項目の両方に付く」挙動と同じで、意図した動作。

## ノートタブのボタン

ノートカードが並べているのは**メモそのもの**なので、メモカードと同じ属性のボタンを出すだけでよい。

```html
<button class="pill-btn" data-action="obsidian" data-id="{memo.id}">🔮 Obsidian</button>
```

既存の click イベント委譲が `data-action="obsidian"` を拾い、`findMemo(btn.dataset.id)` でメモを引いて `handleObsidianSend()` を呼ぶ。**新しい配線は不要。**

送信内容はメモ全体（タスク・買い物も含む）。ノートタブの表示は要約・アイデア・メモに絞られているが、送信内容は絞らない。

## 送信済みの管理

既存の `obsidianSent`（localStorage キー `voiceMemoObsidianSent`、ID の配列）をそのまま使う。日記の ID は `diy_` 始まり、メモの ID は `m` 始まりで衝突しない。**新しい保存領域は作らない。**

結果として、**同じメモの送信済み状態は履歴タブ・録音タブ・ノートタブで共有される。** 履歴タブで送ったメモはノートタブでも「🔮 送信済」になる。同じメモなのでこれが正しい。

日記の送信済みも同じ配列に入るので、バックアップ（v4 で `obsidianSent` を含む）にそのまま乗る。**バックアップ形式の変更は不要。**

## 送信処理の切り出し

現在の `prepareObsidianSend(memo)` は「メモ → Markdown」と「Markdown → URI」が一体になっている。後者だけを `prepareObsidianSendMarkdown(md)` として切り出す。

```
prepareObsidianSendMarkdown(md)      ← 新設（URL長判定・クリップボード切替）
prepareObsidianSend(memo)            ← memoToMarkdown() してから上を呼ぶ（既存の呼び出し側はそのまま）
```

同様に `handleObsidianSend(memo, btn)` の中身を `sendMarkdownToObsidian(id, md, btn, label)` に切り出す。`label` は確認ダイアログの文言に使い、文面は `${label}は送信済みです。もう一度Obsidianに追記しますか？` とする。`label` はメモなら `'このメモ'`、日記なら `'この日記'`。既存の文面「このメモは送信済みです。もう一度Obsidianに追記しますか？」がそのまま再現される。

```
sendMarkdownToObsidian(id, md, btn, label)  ← 新設（確認・送信・送信済み記録・起動）
handleObsidianSend(memo, btn)               ← memoToMarkdown() してから上を呼ぶ
handleObsidianSendDiary(entry, btn)         ← diaryToMarkdown() してから上を呼ぶ
```

**既存の呼び出し側（メモカードの click 委譲）は一切変更しない。**

## UI 変更

### 日記タブ

`renderDiaryView()` の `.diary-entry-btns` 内、「共有」の**直前**に追加する。

```
[🔮 Obsidian] [共有] [削除]
```

日記は独自の属性方式（`data-diary-share` / `data-diary-del`）を使っているので、それに揃えて `data-diary-obsidian="{entry.id}"` とする。既存の日記用 click ハンドラの並びに1つ足す。

送信済みなら表記を `🔮 送信済`、クラスに `obsidian-sent` を追加（メモカードと同じ）。

### ノートタブ

`renderNotesView()` のノートカードに、上記のボタンを1つ追加する。現在このカードにはボタンが1つもないため、本文の後に操作行を1つ設ける。

```html
<div class="notes-card-actions"><button class="pill-btn" data-action="obsidian" data-id="{memo.id}">🔮 Obsidian</button></div>
```

`.notes-card-actions` は `style.css` に新規追加する（`display: flex; justify-content: flex-end; margin-top: 0.5rem;` の1ルールのみ）。ボタン自体の見た目は既存の `.pill-btn` / `.pill-btn.obsidian-sent` を流用する。

## エラー処理

| 状況 | 挙動 |
|---|---|
| 日記の本文もハイライトも空 | `toast('送る内容がありません')`、Obsidian を開かない |
| クリップボード書き込み失敗 | `toast()` でエラー、Obsidian を開かない、送信済みにしない |
| 送信済みのものを再度押す | `confirm()` で確認してから再送 |

メモ側と同じく、**送信の成否は検知できない**ため送信済みは「起動した時点」で楽観的に付ける。

## 実装箇所

| ファイル | 変更内容 |
|---|---|
| `public/app.js` | `diaryToMarkdown()` を新設。`prepareObsidianSendMarkdown()` / `sendMarkdownToObsidian()` を切り出し。`handleObsidianSendDiary()` を新設。`renderDiaryView()` と `renderNotesView()` にボタン追加。日記用 click ハンドラを1つ追加 |
| `public/index.html` | **変更なし**（ボタンは JS が描画する） |
| `public/style.css` | `.notes-card-actions` を1ルール追加。ボタン自体は既存の `.pill-btn` / `.pill-btn.obsidian-sent` を流用 |
| `server.js` | `/api/health` の `version` を上げるのみ |
| `public/sw.js` | キャッシュ名と `ASSETS` のバージョンを更新 |

キャッシュバスティングは CLAUDE.md の規約どおり **v55** に統一する。

## 検証方法

自動テストは置かない（テスト基盤がなく、既存タスクと同じ方針）。ブラウザ上のコンソール評価で確認する。

`diaryToMarkdown()` は純粋関数なので単体で完全に検証できる。最低限、次を確認する。

1. 今日の日記・タイトルあり → 見出しが `## 日記「暑い一日」`（日付なし）
2. 過去の日記・タイトルあり → 見出しが `## 2026-08-20 日記「暑い一日」`
3. タイトルが空 → 見出しが `## 日記` / `## 2026-08-20 日記`
4. ハイライトあり → `- ✨ ...` が本文の後に出る。空配列なら出ない
5. 本文もハイライトも空 → `''` を返す
6. 登録語がある → 本文中の該当語が `[[...]]` になる。同じ語が複数回出ても1回だけ
7. `formatted` が無く `text` だけ → `text` が使われる
8. 日記カード・ノートカードにボタンが描画され、押すと起動先 URI が `obsidian://daily?append=true` で始まる
9. 送信済みの状態が履歴タブとノートタブで共有される

Obsidian の実際の起動と追記はデスクトップから検証できないため、実機（Android）で確認する。

## 未確定事項と既定値

| 項目 | 既定 | 変更が必要になる条件 |
|---|---|---|
| ハイライトの記号 | `- ✨` | 見た目が気に入らない場合 |
| 日記の見出し語 | `日記` | 別の語にしたい場合 |
| ノートタブの送信範囲 | メモ全体 | 表示部分だけを送りたいと利用者が言った場合（送信済みの意味の再定義が必要） |

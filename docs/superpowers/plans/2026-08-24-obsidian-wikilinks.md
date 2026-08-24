# Obsidian ウィキリンク自動付与 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obsidian へ送る Markdown の中の人名・案件名などを `[[語]]` に自動変換し、日々のメモが Obsidian のグラフ上で繋がるようにする。

**Architecture:** リンク化は送信時（`memoToMarkdown()`）の文字列置換で行い、メモのデータ自体は書き換えない。リンク対象は「設定画面で登録した語」と「`/api/organize` の応答に相乗りさせた AI 抽出語（`entities`）」の2系統。表記ゆれ対策として、過去に使ったリンク語の一覧を `vocab` としてリクエストに含め、AI に同じ表記を再利用させる。AI 呼び出しの回数は増やさない。

**Tech Stack:** バニラ JS（ビルドなし・依存追加なし）、localStorage、Express、Gemini/Claude。

設計書: `docs/superpowers/specs/2026-08-24-obsidian-wikilinks-design.md`

## Global Constraints

- **依存パッケージを追加しない。** ビルド工程を持たない素の PWA。
- **クライアントのコードは `public/app.js` に置く。** 単一ファイル構成。モジュール分割しない。
- **自動テストは追加しない。** テスト基盤が存在せず、既存タスクと同じ方針。検証は各タスクの手順（`node -e` によるロジック確認とブラウザ上のコンソール評価）で行う。テストファイルやテストフレームワークを新設しないこと。
- **リンク付与は「あれば嬉しい」機能。失敗しても送信自体は必ず成功させる。** リンク処理で例外を投げて送信を止めてはならない。
- **`server.js` の変更は本計画の Task 3 のみ。** 他のタスクでサーバに触らない。
- **既存メモには `organized.entities` が存在しない。** 常に `undefined` を許容すること。
- **リンク対象語は「登録語 ＋ そのメモ自身の `entities`」。** 全メモの語彙を横断適用してはならない（過剰リンクになる）。語彙一覧（`vocab`）は AI プロンプト用であって、リンク化には使わない。
- 既存コードのスタイル（2スペースインデント、日本語コメント、シングルクォート）に合わせる。
- 最終タスクでキャッシュバスティングを **v54** に統一する（`index.html` の `?v=`、`sw.js` の `CACHE` 名と `ASSETS`、`server.js` の `/api/health`）。

## ブラウザ検証の共通手順

1. `mcp__Claude_Browser__preview_start` を `{"name": "voice-memo"}` で呼ぶ（`tabId` が返る）
2. `mcp__Claude_Browser__javascript_tool` に `{"action":"javascript_exec","tabId":"<tabId>","text":"<スニペット>"}` を渡して評価
3. 出力を「Expected」と突き合わせる
4. コード変更後は `mcp__Claude_Browser__navigate` で同じ URL に再アクセスしてリロード

Service Worker が古いコードを返す場合は、先にこれを評価してからリロード:

```js
(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);return 'sw cleared';})()
```

検証後は `mcp__Claude_Browser__preview_stop` でサーバを止め、テストで書き込んだ localStorage を消すこと。

## File Structure

| ファイル | 責務 | 変更 |
|---|---|---|
| `public/app.js` | リンク置換・登録語・語彙算出・リクエストへの `vocab` 付与・書き出し/読み込み | 変更（`// ===== Obsidian連携 =====` セクション内に追加） |
| `public/index.html` | Obsidian連携カードへの登録語入力欄 | 変更（既存カード内に追加。新カードは作らない） |
| `server.js` | `entities` の抽出指示・正規化・`vocab` のプロンプト埋め込み | 変更（Task 3 のみ） |
| `public/sw.js` | キャッシュ名・プリキャッシュ URL のバージョン | 変更（Task 5） |
| `public/style.css` | 既存の `.text-area` / `.settings-card` を流用 | **変更なし** |

---

### Task 1: リンク置換（純粋関数）

外部依存のない純粋関数なので単体で完全に検証できる。機能の中核。

**Files:**
- Modify: `public/app.js`（`// ===== Obsidian連携 =====` セクション内、`memoToMarkdown` の**直前**）

**Interfaces:**
- Consumes: なし
- Produces:
  - `WIKILINK_UNSAFE_RE: RegExp`
  - `applyWikiLinks(text: string, terms: string[]) -> string`

- [ ] **Step 1: 実装を追加する**

`public/app.js` の `// メモ1件をデイリーノート追記用のMarkdownにする。` というコメント行の**直前**に、以下をそのまま挿入する。

```js
// Obsidianのリンク記法を壊す文字。これらを含む語はリンク化しない
const WIKILINK_UNSAFE_RE = /[\[\]|#^]/;

// text 中の terms を [[語]] に置換する。各語につき最初の1回だけ。
// すでに [[...]] の中にある部分には手を触れない。
// 日本語には単語境界がないので、形態素解析は使わず単純な部分文字列マッチにしている。
function applyWikiLinks(text, terms) {
  let out = String(text || '');
  if (!out || !Array.isArray(terms) || terms.length === 0) return out;

  // 長い語を先に処理する（「ABC」より「ABCプロジェクト」を優先するため）
  const sorted = terms
    .map((t) => String(t || '').trim())
    .filter((t) => t && !WIKILINK_UNSAFE_RE.test(t))
    .sort((a, b) => b.length - a.length);

  for (const term of sorted) {
    // 既存の [[...]] の範囲を先に洗い出し、その内側にはマッチさせない
    const spans = [];
    const linkRe = /\[\[[^\]]*\]\]/g;
    let m;
    while ((m = linkRe.exec(out)) !== null) spans.push([m.index, m.index + m[0].length]);

    let from = 0;
    for (;;) {
      const idx = out.indexOf(term, from);
      if (idx === -1) break;
      const end = idx + term.length;
      if (!spans.some(([s, e]) => idx < e && end > s)) {
        out = out.slice(0, idx) + '[[' + term + ']]' + out.slice(end);
        break; // 各語につき最初の1回だけ
      }
      from = idx + 1;
    }
  }
  return out;
}
```

- [ ] **Step 2: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし（終了コード 0）

- [ ] **Step 3: ブラウザ検証 — 11ケース**

「ブラウザ検証の共通手順」に従い、以下を評価する。

```js
(() => {
  const cases = [
    ['単純な置換',     ['田中さんと会議', ['田中さん']],                  '[[田中さん]]と会議'],
    ['1行1回',         ['田中さんと田中さん', ['田中さん']],              '[[田中さん]]と田中さん'],
    ['長い語優先',     ['ABCプロジェクトの件', ['ABC','ABCプロジェクト']], '[[ABCプロジェクト]]の件'],
    ['二重リンク防止', ['[[田中さん]]と会議', ['田中さん']],              '[[田中さん]]と会議'],
    ['危険文字は除外', ['a|b の件', ['a|b']],                             'a|b の件'],
    ['対象語なし',     ['ふつうの文', []],                                'ふつうの文'],
    ['複数語',         ['田中さんとABCの件', ['田中さん','ABC']],         '[[田中さん]]と[[ABC]]の件'],
    ['部分一致の途中', ['再ABC再ABC', ['ABC']],                           '再[[ABC]]再ABC'],
    ['リンク後に別語', ['[[ABC]]と田中さん', ['ABC','田中さん']],         '[[ABC]]と[[田中さん]]'],
    ['空文字',         ['', ['x']],                                       ''],
    ['null text',      [null, ['x']],                                     ''],
  ];
  const results = cases.map(([name, args, want]) => {
    const got = applyWikiLinks(...args);
    return { name, ok: got === want, got, want };
  });
  return JSON.stringify({ ng: results.filter((r) => !r.ok), allOk: results.every((r) => r.ok) });
})()
```

Expected: `allOk` が `true`、`ng` が空配列

`false` の場合は `ng` の中身を見て、どのケースが崩れているか特定してから直す。

- [ ] **Step 4: コミット**

```bash
git add public/app.js
git commit -m "feat(obsidian): テキスト中の語を[[ウィキリンク]]に置換する関数を追加"
```

---

### Task 2: 登録語の設定欄

**Files:**
- Modify: `public/index.html`（Obsidian連携カード内、`<p id="vaultStatus" class="token-status"></p>` の**直後**）
- Modify: `public/app.js`（Obsidian連携セクション内、`refreshVaultStatus` と vault 設定ハンドラの**直後**）

**Interfaces:**
- Consumes: 既存の `persist(key, value, label) -> boolean`、`toast(msg) -> void`
- Produces: `LINK_WORDS_KEY: string`、`getLinkWords() -> string[]`、`refreshLinkWordsStatus() -> void`

- [ ] **Step 1: 入力欄を追加する**

`public/index.html` の `<p id="vaultStatus" class="token-status"></p>` の**直後**（Obsidian連携カードの `</div>` より前）に挿入する。

```html
          <p class="settings-help">リンクにしたい語を1行に1つ登録すると、Obsidianへ送るときに [[語]] へ自動変換されます。ここに登録した語は古いメモにも効きます。</p>
          <textarea id="obsidianLinkWords" class="text-input text-area" rows="4" placeholder="田中さん&#10;ABCプロジェクト" autocapitalize="none" autocorrect="off" spellcheck="false"></textarea>
          <div class="settings-actions">
            <button id="saveLinkWordsBtn" class="pill-btn primary">リンク語を保存</button>
          </div>
          <p id="linkWordsStatus" class="token-status"></p>
```

- [ ] **Step 2: 読み書きと配線を追加する**

`public/app.js` の Obsidian連携セクション、`clearVaultBtn` のイベントハンドラ（`});` で終わる）の**直後**に追加する。

```js
const LINK_WORDS_KEY = 'voiceMemoLinkWords';

function getLinkWords() {
  try {
    const s = JSON.parse(localStorage.getItem(LINK_WORDS_KEY));
    return Array.isArray(s) ? s : [];
  } catch { return []; }
}

function refreshLinkWordsStatus() {
  const el = document.getElementById('linkWordsStatus');
  const ta = document.getElementById('obsidianLinkWords');
  if (!el) return;
  const words = getLinkWords();
  el.textContent = words.length ? `✓ ${words.length}語を登録中` : '（未登録）';
  if (ta) ta.value = words.join('\n');
}

document.getElementById('saveLinkWordsBtn')?.addEventListener('click', () => {
  const raw = document.getElementById('obsidianLinkWords')?.value || '';
  const words = [...new Set(raw.split('\n').map((w) => w.trim()).filter((w) => w))];
  persist(LINK_WORDS_KEY, words, 'リンク語');
  refreshLinkWordsStatus();
  toast(words.length ? `${words.length}語を保存しました` : 'リンク語を空にしました');
});
```

- [ ] **Step 3: 初期化で状態を反映する**

`public/app.js` の初期化ブロックにある `refreshVaultStatus();` の**直後**に1行足す。

```js
refreshLinkWordsStatus();
```

注意: `refreshVaultStatus();` はファイル内に複数回現れる可能性がある。足すのは**インデントのないトップレベルの行**（`setStatus('タップして録音');` の直前あたり）。イベントハンドラの中に足さないこと。

- [ ] **Step 4: 書き出し・読み込みに登録語を含める**

書き出し側。`public/app.js` の以下の部分（`exportBtn` のハンドラ内）:

```js
    focusTasks,
    obsidianSent,
  };
```

を、次に置き換える。

```js
    focusTasks,
    obsidianSent,
    linkWords: getLinkWords(),
  };
```

同じハンドラ内の `version: 3,` を `version: 4,` に変更する。

読み込み側。`importFile` の change ハンドラ内、`obsidianSent` を復元している処理の**直後**に追加する（メモ・日記と同じマージ方式）。

```js
    // リンク語（重複はスキップしてマージ）
    if (Array.isArray(parsed.linkWords)) {
      const merged = [...new Set([...getLinkWords(), ...parsed.linkWords.map((w) => String(w || '').trim()).filter((w) => w)])];
      persist(LINK_WORDS_KEY, merged, 'リンク語');
      refreshLinkWordsStatus();
    }
```

- [ ] **Step 5: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 6: ブラウザ検証**

ハードリロード後、設定タブを開いて評価する。

```js
(() => {
  const r = {};
  document.querySelector('.nav-btn[data-view="settings"]').click();
  r.textareaExists = !!document.getElementById('obsidianLinkWords');
  r.initialStatus = document.getElementById('linkWordsStatus').textContent;
  document.getElementById('obsidianLinkWords').value = ' 田中さん \n\nABCプロジェクト\n田中さん\n';
  document.getElementById('saveLinkWordsBtn').click();
  r.saved = getLinkWords();
  r.statusAfter = document.getElementById('linkWordsStatus').textContent;
  return JSON.stringify(r);
})()
```

Expected:
- `textareaExists` === `true`
- `initialStatus` === `"（未登録）"`
- `saved` === `["田中さん","ABCプロジェクト"]`（空白が落ち、空行が消え、重複が1つに）
- `statusAfter` === `"✓ 2語を登録中"`

続けて書き出しの中身を確認する。

```js
(() => {
  let cap = null;
  const oc = URL.createObjectURL; URL.createObjectURL = (b) => { cap = b; return 'blob:stub'; };
  const ock = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){};
  document.getElementById('exportBtn').click();
  URL.createObjectURL = oc; HTMLAnchorElement.prototype.click = ock;
  return cap.text().then((t) => { const j = JSON.parse(t); return JSON.stringify({ version: j.version, linkWords: j.linkWords }); });
})()
```

Expected: `version` === `4`、`linkWords` === `["田中さん","ABCプロジェクト"]`

検証後は `localStorage.clear()` すること。

- [ ] **Step 7: コミット**

```bash
git add public/app.js public/index.html
git commit -m "feat(obsidian): リンク語の登録欄とバックアップ対応(v4)を追加"
```

---

### Task 3: サーバ側の entities 抽出

**このタスクだけ `server.js` を触る。ここを壊すとメモの整理そのものが動かなくなるので、既存の整理結果が壊れていないことの確認を必ず行うこと。**

**Files:**
- Modify: `server.js`（`JSON_FORMAT_SPEC` 定数、`parseOrganized()`、`/api/organize` と `/api/append` のハンドラ）

**Interfaces:**
- Consumes: なし
- Produces:
  - `normalizeEntities(arr) -> string[]`（最大5件）
  - `vocabHint(vocab) -> string`（プロンプトに差し込む断片。空なら `''`）
  - `parseOrganized()` の戻り値に `entities: string[]` が加わる
  - `/api/organize` と `/api/append` がリクエストボディの `vocab: string[]` を受け付ける

- [ ] **Step 1: `entities` の正規化関数を追加する**

`server.js` の `function parseOrganized(rawText) {` の**直前**に挿入する。

```js
// AIが返した固有名詞リストを正規化する。壊れた形で返ってきても落とさず空配列にする
function normalizeEntities(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const e of arr) {
    const t = String(e == null ? '' : e).trim();
    if (!t || t.length > 40) continue;
    if (!out.includes(t)) out.push(t);
    if (out.length >= 5) break;
  }
  return out;
}
```

- [ ] **Step 2: パーサに `entities` を通す**

`server.js` の `parseOrganized()` 内、以下の部分:

```js
  const organized = {
    title: String(parsed.title || '音声メモ').slice(0, 40),
    summary: String(parsed.summary || ''),
    workspace: ws,
    categories: {},
  };
```

を、次に置き換える。

```js
  const organized = {
    title: String(parsed.title || '音声メモ').slice(0, 40),
    summary: String(parsed.summary || ''),
    workspace: ws,
    entities: normalizeEntities(parsed.entities),
    categories: {},
  };
```

**注意:** `parseOrganized()` は返すフィールドを許可リストで絞っている。この1行を入れないと、AI が `entities` を返しても捨てられる。

- [ ] **Step 3: 応答スキーマの指示に `entities` を足す**

`server.js` の `JSON_FORMAT_SPEC` 定数を、次でそっくり置き換える。

```js
const JSON_FORMAT_SPEC = `以下のJSON形式のみで返してください（Markdownコードブロック不要）:
{
  "title": "20文字以内のタイトル",
  "summary": "1〜2文の要約",
  "workspace": "work",
  "entities": ["田中さん", "ABCプロジェクト"],
  "categories": {
    "tasks": [{"text": "やること", "due": null, "done": false, "priority": "high"}],
    "shopping": [{"text": "買う物", "due": null, "done": false, "priority": null}],
    "ideas": [{"text": "アイデア", "due": null, "done": false, "priority": null}],
    "reminders": [{"text": "覚えておくこと", "due": null, "done": false, "priority": "medium"}],
    "notes": [{"text": "その他のメモ", "due": null, "done": false, "priority": null}]
  }
}

- workspace: 内容が仕事・業務・ビジネス関連なら "work"、個人・家族・趣味・日常なら "private"
- priorityはtasks・remindersのみ設定: "high"=今日中・緊急、"medium"=近いうちに、null=特に急がない
- entities: 本文に出てくる固有名詞（人名・組織名・案件名/プロジェクト名・場所名・製品名）を最大5つ。「牛乳」「会議」「資料」のような一般名詞は入れないでください。本文に現れる表記のまま返してください。該当がなければ空配列。
- 空のカテゴリは省略。JSONのみ返してください。`;
```

- [ ] **Step 4: 表記ゆれ対策のプロンプト断片を追加する**

`server.js` の `const JSON_FORMAT_SPEC = ...` の**直後**に挿入する。

```js
// 既出のキーワードをAIに渡し、同じ対象には同じ表記を使わせる（[[田中さん]]と[[田中]]への分裂を防ぐ）
function vocabHint(vocab) {
  if (!Array.isArray(vocab)) return '';
  const list = vocab.map((v) => String(v == null ? '' : v).trim()).filter((v) => v).slice(0, 100);
  if (list.length === 0) return '';
  return `
既出のキーワード一覧: ${list.join('、')}
- entities は、同じ対象を指す語がこの一覧にあれば、一覧の表記をそのまま使ってください。
`;
}
```

- [ ] **Step 5: `/api/organize` で `vocab` を受け取る**

`server.js` の `/api/organize` ハンドラ内、以下の行:

```js
  const text = ((req.body && req.body.text) || '').trim();
```

の**直後**に1行足す。

```js
  const vocab = (req.body && req.body.vocab) || [];
```

同じハンドラ内のプロンプト末尾、以下の部分:

```js
${JSON_FORMAT_SPEC}`,
      1500
    );
```

これは `/api/organize` と `/api/append` の両方に現れる。**`/api/organize` 側**（`- 「眠い」「お腹が減った」…` の直後にあるもので、プロンプト冒頭が `以下の音声メモを分析して` のもの）を次に置き換える。

```js
${vocabHint(vocab)}
${JSON_FORMAT_SPEC}`,
      1500
    );
```

- [ ] **Step 6: `/api/append` で `vocab` を受け取る**

`server.js` の `/api/append` ハンドラ内、以下の行:

```js
  const existing = (req.body && req.body.organized) || null;
```

の**直後**に1行足す。

```js
  const vocab = (req.body && req.body.vocab) || [];
```

同じハンドラ内、プロンプト冒頭が `既存の音声メモの整理結果に、` のものの末尾を、次に置き換える。

```js
${vocabHint(vocab)}
${JSON_FORMAT_SPEC}`,
      1500
    );
```

- [ ] **Step 7: 構文チェック**

Run: `node --check server.js`
Expected: エラー出力なし

- [ ] **Step 8: `normalizeEntities` のロジック確認（API 不要）**

追加した `normalizeEntities` の中身をそのまま貼って実行する。

```bash
node -e "
function normalizeEntities(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const e of arr) {
    const t = String(e == null ? '' : e).trim();
    if (!t || t.length > 40) continue;
    if (!out.includes(t)) out.push(t);
    if (out.length >= 5) break;
  }
  return out;
}
const r = {
  normal: normalizeEntities([' 田中さん ', 'ABC']),
  notArray: normalizeEntities('こわれた'),
  undef: normalizeEntities(undefined),
  dedupe: normalizeEntities(['A','A','B']),
  cap5: normalizeEntities(['1','2','3','4','5','6','7']),
  dropEmpty: normalizeEntities(['', '  ', null, 'X']),
  dropLong: normalizeEntities(['x'.repeat(41), 'Y']),
};
console.log(JSON.stringify(r));
"
```

Expected:
```
{"normal":["田中さん","ABC"],"notArray":[],"undef":[],"dedupe":["A","B"],"cap5":["1","2","3","4","5"],"dropEmpty":["X"],"dropLong":["Y"]}
```

- [ ] **Step 9: 実際に `/api/organize` を呼んで確認する（回帰確認を含む）**

「ブラウザ検証の共通手順」でプレビューを起動し、以下を評価する。**これは実際に AI を1回呼ぶ**（費用は1円未満）。

```js
(async () => {
  const r = await fetch('/api/organize', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: '田中さんとABCプロジェクトの打ち合わせをした。金曜までに見積もりを出す。あと牛乳を買う。',
      vocab: ['田中さん'],
    }),
  });
  const d = await r.json();
  return JSON.stringify({
    status: r.status,
    ok: d.success,
    title: d.organized && d.organized.title,
    summary: (d.organized && d.organized.summary || '').slice(0, 30),
    hasTasks: !!(d.organized && d.organized.categories && d.organized.categories.tasks),
    hasShopping: !!(d.organized && d.organized.categories && d.organized.categories.shopping),
    workspace: d.organized && d.organized.workspace,
    entities: d.organized && d.organized.entities,
    error: d.error,
  }, null, 1);
})()
```

Expected（**回帰確認が主目的**）:
- `status` === `200`、`ok` === `true`
- `title` が空でない文字列 ← **既存機能が壊れていないこと**
- `hasTasks` === `true`（見積もりを出す） ← **既存機能が壊れていないこと**
- `hasShopping` === `true`（牛乳） ← **既存機能が壊れていないこと**
- `workspace` が `"work"` または `"private"` ← **既存機能が壊れていないこと**
- `entities` が配列で、`田中さん` と `ABCプロジェクト` を含む。`牛乳` を**含まない**

**`status` が 500 で `error` に API キー・残高の話が出た場合は、コードの問題ではなくローカルの `.env` の問題。** その場合は勝手に回避策を入れず、`NEEDS_CONTEXT` として報告すること。

- [ ] **Step 10: コミット**

```bash
git add server.js
git commit -m "feat(obsidian): 整理結果に固有名詞(entities)を追加し表記ゆれ対策のvocabを受け取る"
```

---

### Task 4: クライアント配線

ここで初めてリンクが実際に付く。

**Files:**
- Modify: `public/app.js`（Obsidian連携セクション、`obsidianItemLine()`、`memoToMarkdown()`、`organize()`、`appendToMemo()`）

**Interfaces:**
- Consumes: `applyWikiLinks(text, terms)`（Task 1）、`getLinkWords()`（Task 2）、`organized.entities`（Task 3）
- Produces: `getLinkVocabulary() -> string[]`（最大100語）、`memoLinkTerms(memo) -> string[]`
- 変更: `obsidianItemLine(item, conf)` → `obsidianItemLine(item, conf, terms)`

- [ ] **Step 1: 語彙とリンク対象語の算出を追加する**

`public/app.js` の `applyWikiLinks` 関数の**直後**に追加する。

**注意:** ここで呼ぶ `getLinkWords()` は Task 2 でファイルのもっと後ろ（vault 設定ハンドラの直後）に定義される。関数宣言は巻き上げられ、`LINK_WORDS_KEY`（`const`）も呼び出し時にしか読まれないため、この順序で問題ない。**定義を手前に移動させるなどの並べ替えをしないこと。**

```js
// AIに渡す既出キーワードの一覧。登録語を先に置き、その後メモのentitiesを新しい順。上限100語。
// 保存はせず毎回算出する（保存すると実体とズレるため）
function getLinkVocabulary() {
  const out = [];
  const seen = new Set();
  const push = (w) => {
    const t = String(w || '').trim();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  };
  getLinkWords().forEach(push);
  for (const m of memos) {
    const ents = (m.organized && m.organized.entities) || [];
    if (Array.isArray(ents)) ents.forEach(push);
    if (out.length >= 100) break;
  }
  return out.slice(0, 100);
}

// このメモでリンク化する語。登録語＋そのメモ自身のentitiesのみ。
// 全メモの語彙を横断適用すると過剰リンクになるので、あえて広げない
function memoLinkTerms(memo) {
  const ents = (memo && memo.organized && memo.organized.entities) || [];
  return [...getLinkWords(), ...(Array.isArray(ents) ? ents : [])];
}
```

- [ ] **Step 2: 項目行にリンクを適用する**

`public/app.js` の `obsidianItemLine` を次でそっくり置き換える。

```js
// 期限・優先度は Obsidian Tasks プラグインの記法。未導入でも絵文字＋日付として読める
function obsidianItemLine(item, conf, terms) {
  const bullet = conf.checkbox ? (item.done ? '- [x] ' : '- [ ] ') : '- ';
  // リンク化は本文にだけ効かせる。期限や優先度の記法に [[ ]] が混ざらないよう先に処理する
  const text = applyWikiLinks(String(item.text || '').trim(), terms);
  let line = bullet + conf.prefix + text;
  if (item.due) line += ` 📅 ${item.due}`;
  if (item.priority === 'high') line += ' ⏫';
  else if (item.priority === 'medium') line += ' 🔼';
  return line;
}
```

- [ ] **Step 3: `memoToMarkdown` でリンクを適用する**

`memoToMarkdown` 内、以下の部分:

```js
  const summary = String(o.summary || '').trim();

  const lines = [];
  for (const conf of OBSIDIAN_CAT_ORDER) {
    for (const item of cats[conf.key] || []) {
      if (item && String(item.text || '').trim()) lines.push(obsidianItemLine(item, conf));
    }
  }
```

を、次に置き換える。

```js
  const terms = memoLinkTerms(memo);
  const summary = applyWikiLinks(String(o.summary || '').trim(), terms);

  const lines = [];
  for (const conf of OBSIDIAN_CAT_ORDER) {
    for (const item of cats[conf.key] || []) {
      if (item && String(item.text || '').trim()) lines.push(obsidianItemLine(item, conf, terms));
    }
  }
```

**見出し（`## HH:MM タイトル`）にはリンクを付けない。** `title` の行は触らないこと。

- [ ] **Step 4: リクエストに `vocab` を付ける**

`public/app.js` の `organize()` 内:

```js
      body: JSON.stringify({ text }),
```

を、次に置き換える。

```js
      body: JSON.stringify({ text, vocab: getLinkVocabulary() }),
```

`appendToMemo()` 内:

```js
      body: JSON.stringify({ text, organized: memo.organized }),
```

を、次に置き換える。

```js
      body: JSON.stringify({ text, organized: memo.organized, vocab: getLinkVocabulary() }),
```

- [ ] **Step 5: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 6: ブラウザ検証 — リンクが付き、見出しには付かないこと**

ハードリロード後、以下を評価する。

```js
(() => {
  localStorage.setItem('voiceMemoLinkWords', JSON.stringify(['田中さん']));
  const now = new Date(); now.setHours(14, 32, 0, 0);
  const memo = {
    id: 'mlink', ts: now.getTime(), transcription: '全文',
    organized: {
      title: '田中さんとの打ち合わせ',
      summary: '田中さんと打ち合わせ。ABCプロジェクトの話。',
      workspace: 'work',
      entities: ['ABCプロジェクト'],
      categories: {
        tasks: [{ text: 'ABCプロジェクトの見積もりを出す', due: '2026-08-28', done: false, priority: 'high' }],
        shopping: [{ text: '牛乳', due: null, done: false, priority: null }],
      },
    },
  };
  const md = memoToMarkdown(memo);
  return JSON.stringify({
    md,
    headingHasLink: md.split('\n')[1].includes('[['),
    summaryLinked: md.includes('[[田中さん]]と打ち合わせ。[[ABCプロジェクト]]の話。'),
    taskLinked: md.includes('- [ ] [[ABCプロジェクト]]の見積もりを出す 📅 2026-08-28 ⏫'),
    milkPlain: md.includes('- [ ] 🛒 牛乳'),
  }, null, 1);
})()
```

Expected:
- `headingHasLink` === `false` ← **見出しにリンクが付いていないこと**
- `summaryLinked` === `true`（登録語とentitiesの両方が効いている）
- `taskLinked` === `true`（リンクが本文にだけ付き、`📅` と `⏫` が壊れていない）
- `milkPlain` === `true`（対象外の語はそのまま）

- [ ] **Step 7: ブラウザ検証 — 語彙の算出と既存メモの互換**

```js
(() => {
  localStorage.setItem('voiceMemoLinkWords', JSON.stringify(['登録語A']));
  memos = [
    { id: 'm1', ts: Date.now(),     organized: { title: 'x', summary: 's', entities: ['新しい語'], categories: {} } },
    { id: 'm2', ts: Date.now() - 1, organized: { title: 'y', summary: 's', categories: {} } }, // entitiesなし＝既存メモ
  ];
  const r = {};
  r.vocab = getLinkVocabulary();
  r.termsForOld = memoLinkTerms(memos[1]);
  r.oldMemoMarkdownOk = typeof memoToMarkdown(memos[1]) === 'string';
  return JSON.stringify(r);
})()
```

Expected:
- `vocab` === `["登録語A","新しい語"]`（登録語が先頭）
- `termsForOld` === `["登録語A"]`（`entities` を持たない既存メモでも落ちない）
- `oldMemoMarkdownOk` === `true`

検証後は `localStorage.clear()` してリロードすること。

- [ ] **Step 8: コミット**

```bash
git add public/app.js
git commit -m "feat(obsidian): 送信時のMarkdownに[[リンク]]を適用しvocabを送るようにした"
```

---

### Task 5: バージョン更新

CLAUDE.md のキャッシュバスティング規約に従う。**`git push`（デプロイ）は行わない。** 最終レビュー後に別途実施する。

**Files:**
- Modify: `public/index.html`（`?v=53` → `?v=54` の2箇所）
- Modify: `public/sw.js`（`CACHE` 名と `ASSETS` の2 URL）
- Modify: `server.js`（`/api/health` の `version`）

- [ ] **Step 1: index.html のクエリ文字列を上げる**

```
  <link rel="stylesheet" href="style.css?v=54">
  <script src="app.js?v=54"></script>
```

- [ ] **Step 2: sw.js を上げる**

```js
const CACHE = 'voice-memo-v54';
const ASSETS = [
  '/',
  '/style.css?v=54',
  '/app.js?v=54',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
```

- [ ] **Step 3: server.js を上げる**

```js
  res.json({ ok: true, version: 54, ai: GEMINI_API_KEY ? 'gemini' : 'claude' });
```

- [ ] **Step 4: 全ファイルの構文チェック**

```bash
node --check public/app.js && node --check public/sw.js && node --check server.js
```

Expected: 3つともエラーなし

- [ ] **Step 5: 取りこぼしがないか確認**

```bash
grep -rn "v=53\|voice-memo-v53\|version: 53" public server.js
```

Expected: 出力なし（1件でも出たら上げ忘れ）

- [ ] **Step 6: コミット（push はしない）**

```bash
git add -A
git commit -m "chore: ウィキリンク対応リリースに向けてv54にバージョン更新"
```

`git push` は実行しないこと。

---

## Self-Review

**1. Spec coverage**

| 設計書の要求 | 対応タスク |
|---|---|
| 送信時に置換、メモのデータは書き換えない | Task 4 Step 3（`memoToMarkdown` 内で算出） |
| 要約と項目に適用、見出しは対象外 | Task 4 Step 3、Step 6（`headingHasLink` で確認） |
| 1回の呼び出しにつき各語1回だけ | Task 1（`break`）、Step 3 の「1行1回」ケース |
| 長い語を優先 | Task 1（長さ降順ソート）、Step 3 の「長い語優先」ケース |
| 既にリンク内の語は二重リンクしない | Task 1（`spans` 判定）、Step 3 の「二重リンク防止」ケース |
| リンク記法を壊す文字を含む語を除外 | Task 1（`WIKILINK_UNSAFE_RE`）、Step 3 の「危険文字は除外」ケース |
| 登録語（全メモに効く） | Task 2、Task 4 Step 1（`memoLinkTerms`） |
| AI抽出語 `entities`（固有名詞・最大5語） | Task 3 Step 1〜3 |
| `parseOrganized` の許可リストに追加 | Task 3 Step 2 |
| `vocab` をリクエストに含めプロンプトに埋める | Task 3 Step 4〜6、Task 4 Step 4 |
| 語彙は保存せず毎回算出、登録語が先、上限100 | Task 4 Step 1、Step 7（`vocab` の順序を確認） |
| 既存メモに `entities` がなくても動く | Task 4 Step 7（`termsForOld` / `oldMemoMarkdownOk`） |
| バックアップ v4 に `linkWords` | Task 2 Step 4、Step 6 |
| 設定画面の入力欄（既存カード内） | Task 2 Step 1 |
| AI が壊れた `entities` を返しても落とさない | Task 3 Step 1、Step 8（`notArray` / `undef`） |
| v54 へのバージョン統一 | Task 5 |

漏れなし。

**2. Placeholder scan**

「TBD」「後で実装」「適切にエラー処理」等は不在。全コードステップに実際のコードを記載済み。Task 1 の実装は本計画作成前に Node で11ケース実行して通過を確認済み。

**3. Type consistency**

- `applyWikiLinks(text, terms) -> string`：Task 1 で定義、Task 4 Step 2/3 で使用。引数の順序・型とも一致。
- `getLinkWords() -> string[]`：Task 2 で定義、Task 4 Step 1（`getLinkVocabulary` / `memoLinkTerms`）と Task 2 Step 4（書き出し）で使用。一致。
- `obsidianItemLine(item, conf, terms)`：Task 4 Step 2 で第3引数を追加し、同 Step 3 の呼び出し側も同時に更新。**呼び出し箇所は `memoToMarkdown` の1箇所のみ**なので取り残しは出ない。
- `memoLinkTerms(memo) -> string[]`：Task 4 Step 1 で定義、同 Step 3 で使用。一致。
- `getLinkVocabulary() -> string[]`：Task 4 Step 1 で定義、同 Step 4 で使用。一致。
- `normalizeEntities(arr) -> string[]` / `vocabHint(vocab) -> string`：Task 3 内で定義・使用。一致。
- `persist(key, value, label) -> boolean`：既存。Task 2 の呼び出しと引数一致。
- `LINK_WORDS_KEY`：Task 2 で定義、Task 2 Step 4 の読み込み処理でも使用。同一セクション内なので参照可能。

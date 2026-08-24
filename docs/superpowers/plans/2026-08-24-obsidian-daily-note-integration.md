# Obsidian デイリーノート連携 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 音声メモ1件を、ワンタップで Obsidian のその日のデイリーノートに Markdown で追記できるようにする。

**Architecture:** `obsidian://daily?append=true&content=...` URI を端末上で開くだけの一方通行連携。Obsidian 側のデイリーノート設定（フォルダ・ファイル名形式・テンプレート）をそのまま使うため、アプリは日付書式を一切持たない。URL 長の上限は `clipboard=true` への切り替えで回避する。サーバ（`server.js`）は API を一切追加しない。

**Tech Stack:** バニラ JS（ビルドなし・依存追加なし）、localStorage、Obsidian URI スキーム。

設計書: `docs/superpowers/specs/2026-08-24-obsidian-daily-note-integration-design.md`

## Global Constraints

- **依存パッケージを追加しない。** このプロジェクトはビルド工程を持たない素の PWA。
- **`server.js` は `/api/health` の `version` 行以外を変更しない。** API の追加・変更はスコープ外。
- **すべてのコードは `public/app.js` に置く。** このリポジトリは単一ファイル構成。モジュール分割はしない。
- **自動テストは追加しない。** テスト基盤が存在せず、機能の中核が外部アプリ起動のため。設計書で合意済み。各タスクの検証は、後述の「ブラウザ検証」手順（実際に開発サーバで動かし、コンソール評価で期待値と突き合わせる）で行う。
- **文字起こし全文（`memo.transcription`）は Obsidian に送らない。**
- **期限・優先度は Tasks プラグイン記法** `📅 YYYY-MM-DD` / `⏫`(high) / `🔼`(medium) を既定とする。
- **`.pill-btn.diary-added` を流用しない。** このクラスは `pointer-events: none` を含みボタンを無効化する。Obsidian の「送信済」は再送のため押せる必要がある。
- 最終タスクでキャッシュバスティングを **v53** に統一する（`index.html` の `?v=`、`sw.js` の `CACHE` 名と `ASSETS`、`server.js` の `/api/health`）。

## ブラウザ検証の共通手順

各タスクの検証ステップで使う。

1. 開発サーバを起動する（Claude Code のプレビュー機能、または `npm start`）
2. `http://localhost:3000` を開く
3. DevTools コンソール、またはブラウザツールの JS 評価で、各タスクに書かれたスニペットを実行する
4. 出力が「期待値」と一致することを確認する

`app.js` はクラシックスクリプトなので、トップレベルの関数・定数はコンソールから名前で直接呼べる。編集後はハードリロードすること。

## File Structure

| ファイル | 責務 | 変更 |
|---|---|---|
| `public/app.js` | Obsidian 連携ロジック一式（Markdown 生成 / URI 組み立て / 送信済み管理 / UI 配線） | 変更（`// ===== Todoist =====` と `// ===== 設定 =====` の間に `// ===== Obsidian連携 =====` セクションを新設） |
| `public/index.html` | 設定画面の vault 名カード | 変更（Todoist カードの直後に1枚追加） |
| `public/style.css` | 送信済みボタンの見た目 | 変更（1クラス追加） |
| `public/sw.js` | キャッシュ名・プリキャッシュ URL のバージョン | 変更（最終タスク） |
| `server.js` | `/api/health` の `version` | 変更（最終タスク・1行） |

---

### Task 1: Markdown 生成（純粋関数）

外部依存のない純粋関数なので、単体で完全に検証できる。ここが機能の中核。

**Files:**
- Modify: `public/app.js`（`// ===== 設定 =====` の行の直前に新セクションを追加）

**挿入位置がここでなければならない理由:** Task 4 で `obsidianSent` を `let` で宣言する。`let` は巻き上げされない（一時的死角）ため、初期化ブロック（`refreshTokenStatus();` から始まる一連の `render*()` 呼び出し）より**前**に置く必要がある。`// ===== 設定 =====` は初期化ブロックの直前のセクションなので、その手前に入れれば安全で、かつ Todoist 連携のコードと隣り合って収まりが良い。

**Interfaces:**
- Consumes: 既存のメモ構造 `memo.organized.categories[key][] = { text, due, done, priority }`
- Produces:
  - `OBSIDIAN_CAT_ORDER: Array<{key:string, checkbox:boolean, prefix:string}>`
  - `obsidianItemLine(item, conf) -> string`
  - `memoToMarkdown(memo) -> string`（送る内容がなければ空文字列 `''`）

- [ ] **Step 1: セクションを追加する**

`public/app.js` の `// ===== 共通 =====` 行の直前に、以下をそのまま挿入する。

```js
// ===== Obsidian連携 =====

// カテゴリ→Markdown記法。デイリーノートでは行動可能な項目を上に置きたいので、
// 画面表示に使う CATEGORY_CONFIG の並びではなくこの順で出力する
const OBSIDIAN_CAT_ORDER = [
  { key: 'tasks',     checkbox: true,  prefix: '' },
  { key: 'reminders', checkbox: true,  prefix: '🔔 ' },
  { key: 'shopping',  checkbox: true,  prefix: '🛒 ' },
  { key: 'ideas',     checkbox: false, prefix: '💡 ' },
  { key: 'notes',     checkbox: false, prefix: '' },
];

// 期限・優先度は Obsidian Tasks プラグインの記法。未導入でも絵文字＋日付として読める
function obsidianItemLine(item, conf) {
  const bullet = conf.checkbox ? (item.done ? '- [x] ' : '- [ ] ') : '- ';
  let line = bullet + conf.prefix + String(item.text || '').trim();
  if (item.due) line += ` 📅 ${item.due}`;
  if (item.priority === 'high') line += ' ⏫';
  else if (item.priority === 'medium') line += ' 🔼';
  return line;
}

// メモ1件をデイリーノート追記用のMarkdownにする。送る内容がなければ '' を返す。
// 文字起こし全文は含めない（デイリーノートが読みにくくなり、URL長も押し上げるため）
function memoToMarkdown(memo) {
  const o = (memo && memo.organized) || {};
  const cats = o.categories || {};
  const summary = String(o.summary || '').trim();

  const lines = [];
  for (const conf of OBSIDIAN_CAT_ORDER) {
    for (const item of cats[conf.key] || []) {
      if (item && String(item.text || '').trim()) lines.push(obsidianItemLine(item, conf));
    }
  }
  // title は既定値 '音声メモ' が入りうるので、中身の有無の判定には使わない
  if (!summary && lines.length === 0) return '';

  const d = new Date(memo.ts || Date.now());
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const title = String(o.title || '').trim() || '音声メモ';

  // 先頭の空行は、追記先の既存内容と行が繋がらないようにするため
  let md = `\n## ${time} ${title}\n`;
  if (summary) md += `${summary}\n`;
  if (lines.length) md += `\n${lines.join('\n')}\n`;
  return md;
}
```

- [ ] **Step 2: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし（終了コード 0）

- [ ] **Step 3: ブラウザ検証 — 全カテゴリが揃ったメモ**

「ブラウザ検証の共通手順」に従い、以下を評価する。

```js
(() => {
  const FIXTURE = {
    id: 'mfix1',
    ts: new Date(2026, 7, 24, 14, 32).getTime(),
    transcription: 'これは文字起こし全文です',
    organized: {
      title: '会議の準備',
      summary: '明日の定例に向けた資料作成。',
      workspace: 'work',
      categories: {
        tasks: [
          { text: '資料を作る', due: '2026-08-25', done: false, priority: 'high' },
          { text: '見積もりを確認', due: null, done: true, priority: null },
        ],
        shopping:  [{ text: '牛乳', due: null, done: false, priority: null }],
        ideas:     [{ text: '通知の出し方を変える案', due: null, done: false, priority: null }],
        reminders: [{ text: '田中さんに連絡', due: null, done: false, priority: 'medium' }],
        notes:     [{ text: '雑多なメモ', due: null, done: false, priority: null }],
      },
    },
  };
  const expected =
    '\n## 14:32 会議の準備\n' +
    '明日の定例に向けた資料作成。\n' +
    '\n' +
    '- [ ] 資料を作る 📅 2026-08-25 ⏫\n' +
    '- [x] 見積もりを確認\n' +
    '- [ ] 🔔 田中さんに連絡 🔼\n' +
    '- [ ] 🛒 牛乳\n' +
    '- 💡 通知の出し方を変える案\n' +
    '- 雑多なメモ\n';
  const actual = memoToMarkdown(FIXTURE);
  return JSON.stringify({ match: actual === expected, actual });
})()
```

Expected: `match` が `true`

`false` の場合は `actual` を `expected` と1文字ずつ比べ、カテゴリ順・絵文字・改行のどれがずれているか特定してから直す。**文字起こし全文（`これは文字起こし全文です`）が `actual` に含まれていないことも確認する。**

- [ ] **Step 4: ブラウザ検証 — 境界ケース**

```js
(() => {
  const r = {};
  // 送る内容なし → 空文字列
  r.empty = memoToMarkdown({ id: 'a', ts: Date.now(), organized: { title: '音声メモ', summary: '', categories: {} } });
  // 要約だけ → 見出し＋要約のみ、箇条書きなし
  r.summaryOnly = memoToMarkdown({ id: 'b', ts: new Date(2026,7,24,9,5).getTime(), organized: { title: 'x', summary: 'ようやく', categories: {} } });
  // 項目だけ（要約なし）
  r.itemsOnly = memoToMarkdown({ id: 'c', ts: new Date(2026,7,24,9,5).getTime(), organized: { title: '', summary: '', categories: { notes: [{ text: 'ぽつん', due: null, done: false, priority: null }] } } });
  // organized 自体がない壊れたメモでも落ちない
  r.broken = memoToMarkdown({ id: 'd', ts: Date.now() });
  return JSON.stringify(r);
})()
```

Expected:
- `empty` === `""`
- `summaryOnly` === `"\n## 09:05 x\nようやく\n"`
- `itemsOnly` === `"\n## 09:05 音声メモ\n\n- ぽつん\n"`（`title` が空なので既定値 `音声メモ`）
- `broken` === `""`（例外を投げないこと）

- [ ] **Step 5: コミット**

```bash
git add public/app.js
git commit -m "feat(obsidian): メモをデイリーノート用Markdownに変換する関数を追加"
```

---

### Task 2: vault 名の設定

**Files:**
- Modify: `public/index.html`（Todoist カードの直後）
- Modify: `public/app.js`（Task 1 で作った Obsidian セクション内）

**Interfaces:**
- Consumes: 既存の `persist()`、`toast()`
- Produces: `getObsidianVault() -> string`（未設定なら `''`）、`refreshVaultStatus() -> void`

- [ ] **Step 1: 設定カードを追加する**

`public/index.html` の Todoist カード（`<p id="tokenStatus" class="token-status"></p>` で終わる `</div>`）の直後に挿入する。

```html
        <div class="glass-card settings-card">
          <h3 class="card-label">Obsidian連携</h3>
          <p class="settings-help">メモを「🔮 Obsidian」ボタンで、その日のデイリーノートに追記できます。保存先やファイル名はObsidian側のデイリーノート設定がそのまま使われます。vault名は空欄でも動作し、その場合は最後に開いたvaultが使われます。</p>
          <input type="text" id="obsidianVault" class="text-input" placeholder="vault名（任意）">
          <div class="settings-actions">
            <button id="saveVaultBtn" class="pill-btn primary">保存</button>
            <button id="clearVaultBtn" class="pill-btn">削除</button>
          </div>
          <p id="vaultStatus" class="token-status"></p>
        </div>
```

- [ ] **Step 2: 読み書きと配線を追加する**

`public/app.js` の Obsidian セクション、`memoToMarkdown` の直後に追加する。

```js
const OBSIDIAN_VAULT_KEY = 'obsidianVault';

function getObsidianVault() {
  return (localStorage.getItem(OBSIDIAN_VAULT_KEY) || '').trim();
}

function refreshVaultStatus() {
  const el = document.getElementById('vaultStatus');
  const input = document.getElementById('obsidianVault');
  if (!el) return;
  const v = getObsidianVault();
  el.textContent = v ? `✓ vault: ${v}` : '（最後に開いたvaultを使用）';
  if (input) input.value = v;
}

document.getElementById('saveVaultBtn')?.addEventListener('click', () => {
  const v = (document.getElementById('obsidianVault')?.value || '').trim();
  if (v) localStorage.setItem(OBSIDIAN_VAULT_KEY, v);
  else localStorage.removeItem(OBSIDIAN_VAULT_KEY);
  refreshVaultStatus();
  toast(v ? '保存しました' : 'vault名を空にしました');
});

document.getElementById('clearVaultBtn')?.addEventListener('click', () => {
  localStorage.removeItem(OBSIDIAN_VAULT_KEY);
  refreshVaultStatus();
  toast('削除しました');
});
```

- [ ] **Step 3: 初期化で状態を反映する**

`public/app.js` の初期化ブロック、`refreshTokenStatus();` が単独の行として現れる箇所（ファイル末尾寄り、`setStatus('タップして録音');` の直前）の**直後**に1行足す。

```js
refreshVaultStatus();
```

注意: `refreshTokenStatus();` はファイル内に3回現れる。足すのは**インデントのない行**（設定ハンドラの中ではなく、トップレベルの初期化ブロック）。

- [ ] **Step 4: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 5: ブラウザ検証**

ハードリロード後、設定タブを開いて以下を評価する。

```js
(() => {
  const r = {};
  r.cardExists = !!document.getElementById('obsidianVault');
  r.initialStatus = document.getElementById('vaultStatus').textContent;
  document.getElementById('obsidianVault').value = ' MyVault ';
  document.getElementById('saveVaultBtn').click();
  r.afterSave = getObsidianVault();
  r.statusAfterSave = document.getElementById('vaultStatus').textContent;
  document.getElementById('clearVaultBtn').click();
  r.afterClear = getObsidianVault();
  return JSON.stringify(r);
})()
```

Expected:
- `cardExists` === `true`
- `initialStatus` === `"（最後に開いたvaultを使用）"`
- `afterSave` === `"MyVault"`（前後の空白が落ちていること）
- `statusAfterSave` === `"✓ vault: MyVault"`
- `afterClear` === `""`

- [ ] **Step 6: コミット**

```bash
git add public/app.js public/index.html
git commit -m "feat(obsidian): vault名の設定欄を追加"
```

---

### Task 3: URI 組み立てと長さ対策

起動（`window.location.href` への代入）を含めない形で切り出す。デスクトップのブラウザで検証したときに外部アプリ起動ダイアログが出ないようにするため、そして URI の中身だけを純粋に確かめられるようにするため。

**Files:**
- Modify: `public/app.js`（Obsidian セクション内、Task 2 の続き）

**Interfaces:**
- Consumes: `memoToMarkdown()`（Task 1）、`getObsidianVault()`（Task 2）
- Produces:
  - `OBSIDIAN_URL_LIMIT: number`
  - `buildObsidianDailyURI(params: object) -> string`
  - `prepareObsidianSend(memo) -> Promise<{ok:true, uri:string, mode:'content'|'clipboard', markdown:string} | {ok:false, reason:'empty'|'clipboard'}>`

- [ ] **Step 1: 実装を追加する**

Obsidian セクションの末尾に追加する。

```js
// Android実機での実効上限は未検証。超えたらクリップボード経由に切り替える。
// 実機で長いメモを試した結果を見てこの値を調整する
const OBSIDIAN_URL_LIMIT = 2000;

// 公式ドキュメントの指定どおり、値は encodeURIComponent で URI エンコードする
function buildObsidianDailyURI(params) {
  const vault = getObsidianVault();
  const qs = ['append=true'];
  if (vault) qs.push(`vault=${encodeURIComponent(vault)}`);
  for (const [k, v] of Object.entries(params)) {
    qs.push(v === true ? `${k}=true` : `${k}=${encodeURIComponent(v)}`);
  }
  return `obsidian://daily?${qs.join('&')}`;
}

// URIの組み立てまでを行い、Obsidianの起動はしない（検証しやすくするため分離）
async function prepareObsidianSend(memo) {
  const md = memoToMarkdown(memo);
  if (!md) return { ok: false, reason: 'empty' };

  const withContent = buildObsidianDailyURI({ content: md });
  if (withContent.length <= OBSIDIAN_URL_LIMIT) {
    return { ok: true, uri: withContent, mode: 'content', markdown: md };
  }
  // clipboard=true はクリップボードの内容を本文に使う公式パラメータ。URL長の制限を受けない
  try {
    await navigator.clipboard.writeText(md);
  } catch (err) {
    console.error('[Obsidian] clipboard', err);
    return { ok: false, reason: 'clipboard' };
  }
  return { ok: true, uri: buildObsidianDailyURI({ clipboard: true }), mode: 'clipboard', markdown: md };
}
```

- [ ] **Step 2: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 3: ブラウザ検証 — 短いメモは content 経路**

```js
(async () => {
  localStorage.setItem('obsidianVault', 'My Vault');
  const memo = { id: 'm1', ts: new Date(2026,7,24,9,5).getTime(),
    organized: { title: 'テスト', summary: '要約', categories: {} } };
  const r = await prepareObsidianSend(memo);
  return JSON.stringify({
    ok: r.ok, mode: r.mode,
    startsRight: r.uri.startsWith('obsidian://daily?append=true&vault=My%20Vault&content='),
    hasEncodedNewline: r.uri.includes('%0A'),
    len: r.uri.length,
  });
})()
```

Expected: `ok` true / `mode` `"content"` / `startsRight` true / `hasEncodedNewline` true（改行が生で入っていないこと）

- [ ] **Step 4: ブラウザ検証 — vault 未設定なら vault パラメータを省く**

```js
(async () => {
  localStorage.removeItem('obsidianVault');
  const memo = { id: 'm1', ts: Date.now(), organized: { title: 'テスト', summary: '要約', categories: {} } };
  const r = await prepareObsidianSend(memo);
  return JSON.stringify({ hasVault: r.uri.includes('vault='), uri: r.uri.slice(0, 60) });
})()
```

Expected: `hasVault` === `false`

- [ ] **Step 5: ブラウザ検証 — 長いメモは clipboard 経路に切り替わる**

```js
(async () => {
  localStorage.removeItem('obsidianVault');
  const items = [];
  for (let i = 0; i < 60; i++) items.push({ text: `とても長いタスクの名前です${i}`, due: '2026-08-25', done: false, priority: 'high' });
  const memo = { id: 'm2', ts: Date.now(), organized: { title: '長いメモ', summary: '要約', categories: { tasks: items } } };
  const r = await prepareObsidianSend(memo);
  const clip = await navigator.clipboard.readText().catch(() => '(読めず)');
  return JSON.stringify({
    ok: r.ok, mode: r.mode,
    uri: r.uri,
    clipboardMatchesMarkdown: clip === r.markdown,
    markdownLen: r.markdown.length,
  });
})()
```

Expected: `mode` === `"clipboard"` / `uri` === `"obsidian://daily?append=true&clipboard=true"` / `clipboardMatchesMarkdown` === `true`

補足: クリップボード読み取りには権限が要る。`clipboardMatchesMarkdown` が確認できない環境なら `markdownLen` が 2000 を超えていることと `mode` が `clipboard` であることで代替とする。

- [ ] **Step 6: ブラウザ検証 — 中身のないメモ**

```js
(async () => {
  const r = await prepareObsidianSend({ id: 'm3', ts: Date.now(), organized: { title: '音声メモ', summary: '', categories: {} } });
  return JSON.stringify(r);
})()
```

Expected: `{"ok":false,"reason":"empty"}`

- [ ] **Step 7: コミット**

```bash
git add public/app.js
git commit -m "feat(obsidian): daily URIの組み立てとURL長のクリップボード回避を追加"
```

---

### Task 4: 送信済み管理と UI 配線

ここで初めてボタンが画面に出る。

**Files:**
- Modify: `public/app.js`（Obsidian セクション、`memoBodyHTML()`、click イベント委譲）
- Modify: `public/style.css`（末尾に1クラス）

**Interfaces:**
- Consumes: `prepareObsidianSend()`（Task 3）、既存の `persist()` / `toast()` / `findMemo()`
- Produces: `isObsidianSent(id) -> boolean`、`markObsidianSent(id) -> void`、`handleObsidianSend(memo, btn) -> Promise<void>`

- [ ] **Step 1: 送信済みリストと送信ハンドラを追加する**

Obsidian セクションの末尾に追加する。

```js
const OBSIDIAN_SENT_KEY = 'voiceMemoObsidianSent';

let obsidianSent = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(OBSIDIAN_SENT_KEY));
    return Array.isArray(s) ? s : [];
  } catch { return []; }
})();

function isObsidianSent(id) { return obsidianSent.includes(id); }

function markObsidianSent(id) {
  if (obsidianSent.includes(id)) return;
  obsidianSent.push(id);
  if (obsidianSent.length > 500) obsidianSent = obsidianSent.slice(-500);
  persist(OBSIDIAN_SENT_KEY, obsidianSent, 'Obsidian送信履歴');
}

// Obsidianが実際に追記できたかはWeb側から知る手段がないので、
// 送信済みは「起動した時点」で楽観的に付ける。起動しなかった場合に備えて再送を許す
async function handleObsidianSend(memo, btn) {
  if (isObsidianSent(memo.id) && !confirm('このメモは送信済みです。もう一度Obsidianに追記しますか？')) return;

  const r = await prepareObsidianSend(memo);
  if (!r.ok) {
    toast(r.reason === 'empty' ? '送る内容がありません' : '内容が長く、クリップボードにも書けませんでした');
    return;
  }

  markObsidianSent(memo.id);
  if (btn) {
    btn.textContent = '🔮 送信済';
    btn.classList.add('obsidian-sent');
  }
  if (r.mode === 'clipboard') toast('長いのでクリップボード経由で送ります');
  window.location.href = r.uri;
}
```

- [ ] **Step 2: メモカードにボタンを追加する**

`public/app.js` の `memoBodyHTML()` 内、共有ボタンを出している行

```js
    html += `<button class="pill-btn" data-action="share" data-id="${memo.id}">共有</button>`;
```

を、以下の3行に置き換える。

```js
    const sentToObsidian = isObsidianSent(memo.id);
    html += `<button class="pill-btn${sentToObsidian ? ' obsidian-sent' : ''}" data-action="obsidian" data-id="${memo.id}">${sentToObsidian ? '🔮 送信済' : '🔮 Obsidian'}</button>`;
    html += `<button class="pill-btn" data-action="share" data-id="${memo.id}">共有</button>`;
```

- [ ] **Step 3: click 委譲に配線する**

`public/app.js` の

```js
  if (action === 'share') shareMemo(memo);
```

の**直前**に1行足す。

```js
  if (action === 'obsidian') handleObsidianSend(memo, btn);
```

- [ ] **Step 4: 送信済みの見た目を追加する**

`public/style.css` の末尾に追加する。

```css
/* 日記の .diary-added と違い pointer-events は殺さない（再送できる必要があるため） */
.pill-btn.obsidian-sent { opacity: 0.55; }
```

- [ ] **Step 5: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 6: ブラウザ検証 — ボタンの表示と送信済みの永続化**

ハードリロード後、以下を評価する。`window.location.href` への代入で外部アプリ起動が走らないよう、検証中だけ差し替える。

```js
(async () => {
  localStorage.setItem('voiceMemos.v1', JSON.stringify([{
    id: 'mtest9', ts: Date.now(), transcription: 'a',
    organized: { title: '検証メモ', summary: '要約', workspace: 'private',
      categories: { tasks: [{ text: '牛乳を買う', due: null, done: false, priority: null }] } },
  }]));
  localStorage.removeItem('voiceMemoObsidianSent');
  return 'reload';
})()
```

これを実行してから**ページをリロード**し、続けて以下を評価する。

```js
(() => {
  const r = {};
  let navigated = null;
  const orig = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
  Object.defineProperty(window.location, 'href', { configurable: true, set(v) { navigated = v; }, get() { return orig.get.call(window.location); } });

  document.querySelector('.nav-btn[data-view="history"]').click();
  const btn = document.querySelector('[data-action="obsidian"][data-id="mtest9"]');
  r.buttonLabelBefore = btn.textContent;
  btn.click();

  return new Promise(res => setTimeout(res, 300)).then(() => {
    r.navigatedTo = navigated;
    r.buttonLabelAfter = document.querySelector('[data-action="obsidian"][data-id="mtest9"]').textContent;
    r.sentStored = JSON.parse(localStorage.getItem('voiceMemoObsidianSent') || '[]');
    r.sentFlag = isObsidianSent('mtest9');
    delete window.location.href;
    return JSON.stringify(r);
  });
})()
```

Expected:
- `buttonLabelBefore` === `"🔮 Obsidian"`
- `navigatedTo` が `"obsidian://daily?append=true"` で始まり `content=` を含む
- `buttonLabelAfter` === `"🔮 送信済"`
- `sentStored` === `["mtest9"]`
- `sentFlag` === `true`

続けてページをリロードし、履歴タブでボタンが `🔮 送信済` のままであること（localStorage から復元されていること）を目視で確認する。

- [ ] **Step 7: 検証データを片付ける**

```js
localStorage.clear(); location.reload();
```

- [ ] **Step 8: コミット**

```bash
git add public/app.js public/style.css
git commit -m "feat(obsidian): メモカードに送信ボタンと送信済み表示を追加"
```

---

### Task 5: バージョン更新とデプロイ

CLAUDE.md の規約（キャッシュバスティング、変更後は必ずデプロイ）に従う。

**Files:**
- Modify: `public/index.html`（`?v=52` → `?v=53` の2箇所）
- Modify: `public/sw.js`（`CACHE` 名と `ASSETS` の2 URL）
- Modify: `server.js`（`/api/health` の `version`）

- [ ] **Step 1: index.html のクエリ文字列を上げる**

```
  <link rel="stylesheet" href="style.css?v=53">
  <script src="app.js?v=53"></script>
```

- [ ] **Step 2: sw.js を上げる**

```js
const CACHE = 'voice-memo-v53';
const ASSETS = [
  '/',
  '/style.css?v=53',
  '/app.js?v=53',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
```

- [ ] **Step 3: server.js を上げる**

```js
  res.json({ ok: true, version: 53, ai: GEMINI_API_KEY ? 'gemini' : 'claude' });
```

- [ ] **Step 4: 全ファイルの構文チェック**

```bash
node --check public/app.js && node --check public/sw.js && node --check server.js
```

Expected: 3つともエラーなし

- [ ] **Step 5: バージョンの取りこぼしがないか確認**

```bash
grep -rn "v=52\|voice-memo-v52\|version: 52" public server.js
```

Expected: 出力なし（1件でも出たら上げ忘れ）

- [ ] **Step 6: コミットしてデプロイ**

```bash
git add -A
git commit -m "chore: Obsidian連携リリースに向けてv53にバージョン更新"
git push origin master
```

Render が master を監視して自動デプロイする。**push が失敗した場合は成功と報告しない。**

- [ ] **Step 7: 実機確認の依頼**

デスクトップからは Obsidian の起動を検証できない。以下を Android 実機で確認してもらう（設計書「検証方法」より）。

1. 短いメモを送り、その日のデイリーノートの末尾に追記される
2. 同じ日にもう1件送り、上書きではなく**追記**される
3. デイリーノートがまだ無い日に送り、Obsidian 側の設定どおり新規作成される
4. タスクがチェックボックスとして描画される
5. 項目20件以上の長いメモを送り、クリップボード経路で全文が欠けずに入る
6. vault 名を空にしても動く

5 の結果を見て `OBSIDIAN_URL_LIMIT`（既定 2000）を調整する。

---

## Self-Review

**1. Spec coverage**

| 設計書の要求 | 対応タスク |
|---|---|
| `obsidian://daily` + `append=true` | Task 3 |
| Markdown 変換ルール（カテゴリ順・記法・期限・優先度） | Task 1 |
| 先頭の空行 | Task 1 |
| 「送る内容なし」の判定（summary 空かつ全カテゴリ空） | Task 1 Step 4、Task 3 Step 6 |
| 文字起こし全文を送らない | Task 1（実装コメント＋Step 3 で不在を確認） |
| URL 長対策（2000 → clipboard 切替） | Task 3 |
| クリップボード失敗時は起動しない・マークしない | Task 3（`reason:'clipboard'`）、Task 4（`!r.ok` で return） |
| 送信済み管理（`voiceMemoObsidianSent`） | Task 4 |
| 楽観的マーク＋`confirm()` での再送 | Task 4 |
| メモカードのボタン（共有の直前） | Task 4 Step 2 |
| 設定画面の vault 欄 | Task 2 |
| vault 空なら parameter を省く | Task 3 Step 4 |
| `.diary-added` を流用しない | Task 4 Step 4 |
| キャッシュバスティング v53 | Task 5 |
| `server.js` は version 行のみ | Task 5 Step 3 |

漏れなし。

**2. Placeholder scan**

「TBD」「後で実装」「適切にエラー処理」等は不在。全コードステップに実際のコードを記載済み。

**3. Type consistency**

- `memoToMarkdown(memo) -> string`：Task 1 で定義、Task 3 で使用。一致。
- `getObsidianVault() -> string`：Task 2 で定義、Task 3 の `buildObsidianDailyURI` で使用。一致。
- `prepareObsidianSend` の戻り値 `{ok, uri, mode, markdown}` / `{ok, reason}`：Task 3 で定義、Task 4 で `r.ok` / `r.reason` / `r.mode` / `r.uri` を参照。一致。
- `isObsidianSent` / `markObsidianSent`：Task 4 内で定義・使用。`memoBodyHTML()` からも `isObsidianSent` を参照。関数宣言なので巻き上げされ、定義順は問題にならない。ただし内部で読む `obsidianSent` は `let` のため巻き上げされない — Obsidian セクションを初期化ブロックより前（`// ===== 設定 =====` の直前）に置くことで、初期化中に `memoBodyHTML()` が呼ばれても未初期化参照にならないようにしている（Task 1 の「挿入位置がここでなければならない理由」を参照）。
- `persist(key, value, label)`：既存（前回のバグ修正で追加済み）。Task 4 の呼び出しと引数一致。
- `OBSIDIAN_CAT_ORDER` の要素形状 `{key, checkbox, prefix}` と `obsidianItemLine(item, conf)` の `conf.checkbox` / `conf.prefix` 参照：一致。

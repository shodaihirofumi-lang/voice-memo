# 日記タブ・ノートタブへの Obsidian 送信ボタン 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日記タブとノートタブからも「🔮 Obsidian」ボタンでその日のデイリーノートに送れるようにする。

**Architecture:** 既存の `obsidian://daily?append=true` の送信処理をそのまま再利用する。現在それは「メモ → Markdown → URI → 起動」が一体になっているので、**Markdown を受け取る形に切り出して**、メモ・日記の両方が同じ経路に乗るようにする。ノートカードは中身がメモそのものなので、既存のボタンと同じ属性を出すだけで既存の click 委譲が拾う。

**Tech Stack:** バニラ JS（ビルドなし・依存追加なし）、localStorage。

設計書: `docs/superpowers/specs/2026-08-25-obsidian-diary-notes-buttons-design.md`

## Global Constraints

- **依存パッケージを追加しない。** ビルド工程を持たない素の PWA。
- **クライアントのコードは `public/app.js` に置く。** 単一ファイル構成。モジュール分割しない。
- **自動テストは追加しない。** テスト基盤が存在せず、既存タスクと同じ方針。検証は各タスクのブラウザ上コンソール評価で行う。テストファイルやテストフレームワークを新設しないこと。
- **`server.js` の変更は最終タスクの `/api/health` の `version` 1行のみ。** API の追加・変更はスコープ外。
- **`public/index.html` は変更しない。** ボタンは JS が描画する。
- **既存の呼び出し側（メモカードの click 委譲）は一切変更しない。** 切り出しは後方互換で行う。
- **日記のリンク対象語は登録語（`getLinkWords()`）のみ。** 日記は `/api/organize` を通っておらず `entities` を持たない。
- **`applyWikiLinks()` は本文全体に1回だけ呼ぶ。** 行ごとに分割してはならない（分割すると行数分リンクが増える）。
- **送信済みは既存の `obsidianSent` 配列を共用する。** 新しい保存領域を作らない。バックアップ形式（v4）も変更しない。
- 既存コードのスタイル（2スペースインデント、日本語コメント、シングルクォート）に合わせる。
- 最終タスクでキャッシュバスティングを **v55** に統一する（`index.html` の `?v=`、`sw.js` の `CACHE` 名と `ASSETS`、`server.js` の `/api/health`）。

## ブラウザ検証の共通手順

1. `mcp__Claude_Browser__preview_start` を `{"name": "voice-memo"}` で呼ぶ（`tabId` が返る）
2. `mcp__Claude_Browser__javascript_tool` に `{"action":"javascript_exec","tabId":"<tabId>","text":"<スニペット>"}` を渡して評価
3. 出力を「Expected」と突き合わせる
4. コード変更後は `mcp__Claude_Browser__navigate` で同じ URL に再アクセスしてリロード

Service Worker が古いコードを返す場合は、先にこれを評価してからリロード:

```js
(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);return 'sw cleared';})()
```

検証後は `mcp__Claude_Browser__preview_stop` でサーバを止め、`localStorage.clear()` すること。

## File Structure

| ファイル | 責務 | 変更 |
|---|---|---|
| `public/app.js` | 日記の Markdown 化・送信処理の切り出し・両タブのボタン描画と配線 | 変更（`// ===== Obsidian連携 =====` セクション内と各 render 関数） |
| `public/style.css` | ノートカードの操作行 | 変更（1ルール追加、Task 3） |
| `public/sw.js` | キャッシュ名・プリキャッシュ URL のバージョン | 変更（Task 4） |
| `server.js` | `/api/health` の `version` | 変更（Task 4・1行） |
| `public/index.html` | — | **変更なし** |

---

### Task 1: 送信処理の切り出し（後方互換のリファクタ）

見た目は何も変わらない。後続タスクが日記を同じ経路に乗せられるようにするための準備。**既存のメモ送信が壊れていないことの確認が主目的。**

**Files:**
- Modify: `public/app.js`（`// ===== Obsidian連携 =====` セクション内の `prepareObsidianSend` と `handleObsidianSend`）

**Interfaces:**
- Consumes: 既存の `memoToMarkdown(memo)`、`buildObsidianDailyURI(params)`、`OBSIDIAN_URL_LIMIT`、`isObsidianSent(id)`、`markObsidianSent(id)`、`openObsidianURI(uri)`、`toast(msg)`
- Produces:
  - `prepareObsidianSendMarkdown(md) -> Promise<{ok:true, uri, mode:'content'|'clipboard', markdown} | {ok:false, reason:'empty'|'clipboard'}>`
  - `sendMarkdownToObsidian(id, md, btn, label) -> Promise<void>`
  - `prepareObsidianSend(memo)` と `handleObsidianSend(memo, btn)` はシグネチャ・挙動とも従来どおり

- [ ] **Step 1: `prepareObsidianSend` を2つに分ける**

`public/app.js` の以下をそっくり置き換える。

```js
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

置き換え後:

```js
// Markdownを受け取ってURIを組み立てる。メモ・日記の両方がここを通る
async function prepareObsidianSendMarkdown(md) {
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

async function prepareObsidianSend(memo) {
  return prepareObsidianSendMarkdown(memoToMarkdown(memo));
}
```

- [ ] **Step 2: `handleObsidianSend` を2つに分ける**

`public/app.js` の以下をそっくり置き換える。

```js
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
  openObsidianURI(r.uri);
}
```

置き換え後:

```js
// 確認 → 送信 → 送信済み記録 → 起動。メモ・日記の両方がここを通る。
// label は確認ダイアログの文言に使う（'このメモ' / 'この日記'）
async function sendMarkdownToObsidian(id, md, btn, label) {
  if (isObsidianSent(id) && !confirm(`${label}は送信済みです。もう一度Obsidianに追記しますか？`)) return;

  const r = await prepareObsidianSendMarkdown(md);
  if (!r.ok) {
    toast(r.reason === 'empty' ? '送る内容がありません' : '内容が長く、クリップボードにも書けませんでした');
    return;
  }

  markObsidianSent(id);
  if (btn) {
    btn.textContent = '🔮 送信済';
    btn.classList.add('obsidian-sent');
  }
  if (r.mode === 'clipboard') toast('長いのでクリップボード経由で送ります');
  openObsidianURI(r.uri);
}

async function handleObsidianSend(memo, btn) {
  return sendMarkdownToObsidian(memo.id, memoToMarkdown(memo), btn, 'このメモ');
}
```

- [ ] **Step 3: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし（終了コード 0）

- [ ] **Step 4: ブラウザ検証 — 既存のメモ送信が壊れていないこと**

「ブラウザ検証の共通手順」に従い、以下を評価する。**このタスクは見た目が変わらないリファクタなので、回帰が起きていないことの確認がすべて。**

```js
(async () => {
  localStorage.clear();
  const now = new Date(); now.setHours(14, 32, 0, 0);
  const memo = {
    id: 'mrefactor', ts: now.getTime(), transcription: '全文',
    organized: {
      title: '打ち合わせ', summary: '要約です。', workspace: 'work',
      categories: { tasks: [{ text: '資料を作る', due: '2026-08-28', done: false, priority: 'high' }] },
    },
  };
  const r = {};
  // 既存の関数がそのまま動くか
  r.markdown = memoToMarkdown(memo);
  const p = await prepareObsidianSend(memo);
  r.prepareOk = p.ok;
  r.prepareMode = p.mode;
  r.uriStartsRight = p.uri.startsWith('obsidian://daily?append=true');
  r.uriHasContent = p.uri.includes('content=');
  // 新設した関数が同じ結果を返すか
  const p2 = await prepareObsidianSendMarkdown(memoToMarkdown(memo));
  r.sameAsDirect = p2.uri === p.uri;
  // 中身が空なら empty
  const empty = await prepareObsidianSendMarkdown('');
  r.emptyReason = empty.reason;
  return JSON.stringify(r, null, 1);
})()
```

Expected:
- `markdown` が `\n## 14:32 打ち合わせ\n要約です。\n\n- [ ] 資料を作る 📅 2026-08-28 ⏫\n`
- `prepareOk` === `true`、`prepareMode` === `"content"`
- `uriStartsRight` === `true`、`uriHasContent` === `true`
- `sameAsDirect` === `true` ← **切り出し前後で結果が変わっていないこと**
- `emptyReason` === `"empty"`

- [ ] **Step 5: ブラウザ検証 — ボタンから送る経路が生きていること**

```js
(() => {
  localStorage.setItem('voiceMemos.v1', JSON.stringify([{
    id: 'mbtn', ts: Date.now(), transcription: 'a',
    organized: { title: '検証', summary: '要約', workspace: 'private',
      categories: { tasks: [{ text: '牛乳を買う', due: null, done: false, priority: null }] } },
  }]));
  localStorage.removeItem('voiceMemoObsidianSent');
  return 'seeded — リロードしてから次を評価';
})()
```

これを評価してから**ページをリロード**し、続けて以下を評価する。

```js
(() => {
  const r = {};
  let navigated = null;
  const realOpen = openObsidianURI;
  openObsidianURI = (uri) => { navigated = uri; };

  document.querySelector('.nav-btn[data-view="history"]').click();
  const btn = document.querySelector('[data-action="obsidian"][data-id="mbtn"]');
  r.labelBefore = btn.textContent;
  btn.click();

  return new Promise(res => setTimeout(res, 300)).then(() => {
    r.navigatedStartsRight = String(navigated).startsWith('obsidian://daily?append=true');
    r.labelAfter = document.querySelector('[data-action="obsidian"][data-id="mbtn"]').textContent;
    r.sentStored = JSON.parse(localStorage.getItem('voiceMemoObsidianSent') || '[]');
    openObsidianURI = realOpen;
    return JSON.stringify(r);
  });
})()
```

Expected:
- `labelBefore` === `"🔮 Obsidian"`
- `navigatedStartsRight` === `true`
- `labelAfter` === `"🔮 送信済"`
- `sentStored` === `["mbtn"]`

検証後は `localStorage.clear()` してリロードすること。

- [ ] **Step 6: コミット**

```bash
git add public/app.js
git commit -m "refactor(obsidian): 送信処理をMarkdown受け取り型に切り出す"
```

---

### Task 2: 日記の Markdown 生成と送信ボタン

**Files:**
- Modify: `public/app.js`（Obsidian連携セクションに `diaryToMarkdown` と `handleObsidianSendDiary` を追加、`renderDiaryView()` にボタン追加、日記用 click ハンドラを1つ追加）

**Interfaces:**
- Consumes: `applyWikiLinks(text, terms)`、`getLinkWords()`、`todayISO()`、`sendMarkdownToObsidian(id, md, btn, label)`（Task 1）、`isObsidianSent(id)`、`esc(str)`
- Produces: `diaryToMarkdown(entry) -> string`（送る内容がなければ `''`）、`handleObsidianSendDiary(entry, btn) -> Promise<void>`

- [ ] **Step 1: `diaryToMarkdown` を追加する**

`public/app.js` の次の行の**直前**に挿入する（この行はファイル内に1箇所しかなく、ちょうど `memoToMarkdown` 関数の直後にある）。

```js
const OBSIDIAN_VAULT_KEY = 'obsidianVault';
```

```js
// 日記1件をデイリーノート追記用のMarkdownにする。送る内容がなければ '' を返す。
// 日記は /api/organize を通っていないので entities を持たない。リンクは登録語のみ。
function diaryToMarkdown(entry) {
  const e = entry || {};
  const terms = getLinkWords();
  // 本文は行ごとに分けず全体で1回だけ処理する（分けると行数分リンクが増える）
  const body = applyWikiLinks(String(e.formatted || e.text || '').trim(), terms);
  const hi = (Array.isArray(e.highlights) ? e.highlights : [])
    .map((h) => String(h || '').trim())
    .filter((h) => h)
    .map((h) => `- ✨ ${applyWikiLinks(h, terms)}`);

  // title は空でありうるので、中身の有無の判定には使わない
  if (!body && hi.length === 0) return '';

  // obsidian://daily は常に今日のノートに追記されるため、今日でなければ見出しに日付を足す
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) ? e.date : todayISO();
  const dateLabel = date === todayISO() ? '' : `${date} `;
  const title = String(e.title || '').trim();
  const heading = title ? `日記「${title}」` : '日記';

  // 先頭の空行は、追記先の既存内容と行が繋がらないようにするため
  let md = `\n## ${dateLabel}${heading}\n`;
  if (body) md += `${body}\n`;
  if (hi.length) md += `\n${hi.join('\n')}\n`;
  return md;
}
```

- [ ] **Step 2: 日記用の送信ハンドラを追加する**

`public/app.js` の `handleObsidianSend` 関数の**直後**に挿入する。

```js
async function handleObsidianSendDiary(entry, btn) {
  return sendMarkdownToObsidian(entry.id, diaryToMarkdown(entry), btn, 'この日記');
}
```

- [ ] **Step 3: 日記カードにボタンを追加する**

`public/app.js` の `renderDiaryView()` 内、以下の行:

```js
          <button class="pill-btn diary-share-btn" data-diary-share="${entry.id}">共有</button>
```

を、次の2行に置き換える。

```js
          <button class="pill-btn${isObsidianSent(entry.id) ? ' obsidian-sent' : ''}" data-diary-obsidian="${entry.id}">${isObsidianSent(entry.id) ? '🔮 送信済' : '🔮 Obsidian'}</button>
          <button class="pill-btn diary-share-btn" data-diary-share="${entry.id}">共有</button>
```

- [ ] **Step 4: click 委譲に配線する**

`public/app.js` の以下の2行:

```js
  const diaryShareBtn = e.target.closest('[data-diary-share]');
  if (diaryShareBtn) { shareDiaryEntry(diaryShareBtn.dataset.diaryShare); return; }
```

の**直前**に、次を挿入する。

```js
  const diaryObsBtn = e.target.closest('[data-diary-obsidian]');
  if (diaryObsBtn) {
    const entry = diaries.find((d) => d.id === diaryObsBtn.dataset.diaryObsidian);
    if (entry) handleObsidianSendDiary(entry, diaryObsBtn);
    return;
  }
```

- [ ] **Step 5: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 6: ブラウザ検証 — `diaryToMarkdown` の13ケース**

ハードリロード後、以下を評価する。**このスニペットは `todayISO()` を一時的に固定日付に差し替えて実行し、最後に必ず戻す。**

```js
(() => {
  const realToday = todayISO;
  todayISO = () => '2026-08-25';
  localStorage.setItem('voiceMemoLinkWords', JSON.stringify([]));

  const run = (entry, words) => {
    localStorage.setItem('voiceMemoLinkWords', JSON.stringify(words || []));
    return diaryToMarkdown(entry);
  };
  const W = ['田中さん'];
  const cases = [
    ['1 今日・タイトルあり',   run({date:'2026-08-25',title:'暑い一日',formatted:'朝から暑かった。'}), '\n## 日記「暑い一日」\n朝から暑かった。\n'],
    ['2 過去・タイトルあり',   run({date:'2026-08-20',title:'暑い一日',formatted:'朝から暑かった。'}), '\n## 2026-08-20 日記「暑い一日」\n朝から暑かった。\n'],
    ['3 今日・タイトル空',     run({date:'2026-08-25',title:'',formatted:'本文'}), '\n## 日記\n本文\n'],
    ['3b 過去・タイトル空',    run({date:'2026-08-20',formatted:'本文'}), '\n## 2026-08-20 日記\n本文\n'],
    ['4 ハイライトあり',       run({date:'2026-08-25',title:'x',formatted:'本文',highlights:['朝の散歩','見積もり']}), '\n## 日記「x」\n本文\n\n- ✨ 朝の散歩\n- ✨ 見積もり\n'],
    ['4b ハイライト空配列',    run({date:'2026-08-25',title:'x',formatted:'本文',highlights:[]}), '\n## 日記「x」\n本文\n'],
    ['5 本文もハイライトも空', run({date:'2026-08-25',title:'x',formatted:'',text:'',highlights:[]}), ''],
    ['5b entryがnull',         run(null), ''],
    ['6 登録語がリンクに',     run({date:'2026-08-25',title:'x',formatted:'田中さんと会った。田中さんは元気。'}, W), '\n## 日記「x」\n[[田中さん]]と会った。田中さんは元気。\n'],
    ['6b 複数行でも1回',       run({date:'2026-08-25',title:'x',formatted:'田中さんと会った。\n夜も田中さんと話した。'}, W), '\n## 日記「x」\n[[田中さん]]と会った。\n夜も田中さんと話した。\n'],
    ['6c 本文とハイライト両方', run({date:'2026-08-25',title:'x',formatted:'田中さんと会った。',highlights:['田中さんの話']}, W), '\n## 日記「x」\n[[田中さん]]と会った。\n\n- ✨ [[田中さん]]の話\n'],
    ['7 formattedなしtextのみ', run({date:'2026-08-25',title:'x',text:'生テキスト'}), '\n## 日記「x」\n生テキスト\n'],
    ['8 dateが壊れている',     run({date:'へんな値',title:'x',formatted:'本文'}), '\n## 日記「x」\n本文\n'],
  ];
  const results = cases.map(([name, got, want]) => ({ name, ok: got === want, got, want }));
  todayISO = realToday;
  localStorage.removeItem('voiceMemoLinkWords');
  return JSON.stringify({ ng: results.filter((r) => !r.ok), allOk: results.every((r) => r.ok) });
})()
```

Expected: `allOk` が `true`、`ng` が空配列

`false` の場合は `ng` の中身（`got` と `want`）を1文字ずつ比べて原因を特定してから直す。

- [ ] **Step 7: ブラウザ検証 — 日記カードのボタンが動くこと**

```js
(() => {
  localStorage.setItem('voiceMemoDiary.v1', JSON.stringify([{
    id: 'diy_test1', ts: Date.now(), date: '2026-08-20', title: 'テスト日記',
    text: '本文です', formatted: '本文です', highlights: ['気づき'],
  }]));
  localStorage.removeItem('voiceMemoObsidianSent');
  return 'seeded — リロードしてから次を評価';
})()
```

これを評価してから**ページをリロード**し、続けて以下を評価する。

```js
(() => {
  const r = {};
  let navigated = null;
  const realOpen = openObsidianURI;
  openObsidianURI = (uri) => { navigated = uri; };

  document.querySelector('.nav-btn[data-view="diary"]').click();
  const btn = document.querySelector('[data-diary-obsidian="diy_test1"]');
  r.buttonExists = !!btn;
  r.labelBefore = btn.textContent;
  btn.click();

  return new Promise(res => setTimeout(res, 300)).then(() => {
    r.navigatedStartsRight = String(navigated).startsWith('obsidian://daily?append=true');
    r.navigatedHasHeading = decodeURIComponent(String(navigated)).includes('## 2026-08-20 日記「テスト日記」');
    r.labelAfter = document.querySelector('[data-diary-obsidian="diy_test1"]').textContent;
    r.sentStored = JSON.parse(localStorage.getItem('voiceMemoObsidianSent') || '[]');
    openObsidianURI = realOpen;
    return JSON.stringify(r);
  });
})()
```

Expected:
- `buttonExists` === `true`
- `labelBefore` === `"🔮 Obsidian"`
- `navigatedStartsRight` === `true`
- `navigatedHasHeading` === `true` ← **見出しが正しく組まれていること**
- `labelAfter` === `"🔮 送信済"`
- `sentStored` === `["diy_test1"]`

続けてページをリロードし、日記タブのボタンが `🔮 送信済` のままであること（localStorage から復元されていること）を目視で確認する。

検証後は `localStorage.clear()` してリロードすること。

- [ ] **Step 8: コミット**

```bash
git add public/app.js
git commit -m "feat(obsidian): 日記カードから送信できるようにした"
```

---

### Task 3: ノートカードのボタン

**Files:**
- Modify: `public/app.js`（`renderNotesView()`）
- Modify: `public/style.css`（末尾に1ルール追加）

**Interfaces:**
- Consumes: `isObsidianSent(id)`、既存の click 委譲（`data-action="obsidian"` を拾って `handleObsidianSend()` を呼ぶ）
- Produces: なし（**新しい JS の配線は不要**）

- [ ] **Step 1: ノートカードにボタンを追加する**

`public/app.js` の `renderNotesView()` 内、以下をそっくり置き換える。

```js
      html += `<div class="notes-card glass-card">
        <div class="notes-card-head"><span class="notes-card-title">${esc(title)}</span><span class="notes-card-time">${timeStr}</span></div>
        ${body}
      </div>`;
```

置き換え後:

```js
      const sentObs = isObsidianSent(m.id);
      html += `<div class="notes-card glass-card">
        <div class="notes-card-head"><span class="notes-card-title">${esc(title)}</span><span class="notes-card-time">${timeStr}</span></div>
        ${body}
        <div class="notes-card-actions"><button class="pill-btn${sentObs ? ' obsidian-sent' : ''}" data-action="obsidian" data-id="${m.id}">${sentObs ? '🔮 送信済' : '🔮 Obsidian'}</button></div>
      </div>`;
```

**click の配線は追加しない。** 既存の委譲が `data-action="obsidian"` を拾い、`findMemo(btn.dataset.id)` でメモを引いて `handleObsidianSend()` を呼ぶ。

- [ ] **Step 2: 操作行のスタイルを追加する**

`public/style.css` の**末尾**に追加する。

```css
/* ノートカードの操作行。ボタン自体は既存の .pill-btn / .pill-btn.obsidian-sent を流用 */
.notes-card-actions { display: flex; justify-content: flex-end; margin-top: 0.5rem; }
```

- [ ] **Step 3: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 4: ブラウザ検証 — ノートカードのボタンと送信済みの共有**

ハードリロード後、以下を評価する。

```js
(() => {
  localStorage.setItem('voiceMemos.v1', JSON.stringify([{
    id: 'mnote1', ts: Date.now(), transcription: 'a',
    organized: { title: 'ノート検証', summary: '要約テキスト', workspace: 'private',
      categories: { notes: [{ text: 'メモ本文', due: null, done: false, priority: null }] } },
  }]));
  localStorage.removeItem('voiceMemoObsidianSent');
  return 'seeded — リロードしてから次を評価';
})()
```

これを評価してから**ページをリロード**し、続けて以下を評価する。

```js
(() => {
  const r = {};
  let navigated = null;
  const realOpen = openObsidianURI;
  openObsidianURI = (uri) => { navigated = uri; };

  document.querySelector('.nav-btn[data-view="notes"]').click();
  const btn = document.querySelector('.notes-card-actions [data-action="obsidian"][data-id="mnote1"]');
  r.buttonExists = !!btn;
  r.labelBefore = btn.textContent;
  r.actionsRowAligned = getComputedStyle(btn.parentElement).justifyContent;
  btn.click();

  return new Promise(res => setTimeout(res, 300)).then(() => {
    r.navigatedStartsRight = String(navigated).startsWith('obsidian://daily?append=true');
    r.sentStored = JSON.parse(localStorage.getItem('voiceMemoObsidianSent') || '[]');
    // 履歴タブでも送信済みになっているか（3タブで状態が共有されること）
    document.querySelector('.nav-btn[data-view="history"]').click();
    r.historyLabel = document.querySelector('[data-action="obsidian"][data-id="mnote1"]').textContent;
    openObsidianURI = realOpen;
    return JSON.stringify(r);
  });
})()
```

Expected:
- `buttonExists` === `true`
- `labelBefore` === `"🔮 Obsidian"`
- `actionsRowAligned` === `"flex-end"` ← CSS が効いていること
- `navigatedStartsRight` === `true`
- `sentStored` === `["mnote1"]`
- `historyLabel` === `"🔮 送信済"` ← **送信済みがタブ間で共有されていること**

検証後は `localStorage.clear()` してリロードすること。

- [ ] **Step 5: コミット**

```bash
git add public/app.js public/style.css
git commit -m "feat(obsidian): ノートカードから送信できるようにした"
```

---

### Task 4: バージョン更新

CLAUDE.md のキャッシュバスティング規約に従う。**`git push`（デプロイ）は行わない。** 最終レビュー後に別途実施する。

**Files:**
- Modify: `public/index.html`（`?v=54` → `?v=55` の2箇所）
- Modify: `public/sw.js`（`CACHE` 名と `ASSETS` の2 URL）
- Modify: `server.js`（`/api/health` の `version`）

- [ ] **Step 1: index.html のクエリ文字列を上げる**

```
  <link rel="stylesheet" href="style.css?v=55">
  <script src="app.js?v=55"></script>
```

- [ ] **Step 2: sw.js を上げる**

```js
const CACHE = 'voice-memo-v55';
const ASSETS = [
  '/',
  '/style.css?v=55',
  '/app.js?v=55',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
```

- [ ] **Step 3: server.js を上げる**

```js
  res.json({ ok: true, version: 55, ai: GEMINI_API_KEY ? 'gemini' : 'claude' });
```

- [ ] **Step 4: 全ファイルの構文チェック**

```bash
node --check public/app.js && node --check public/sw.js && node --check server.js
```

Expected: 3つともエラーなし

- [ ] **Step 5: 取りこぼしがないか確認**

```bash
grep -rn "v=54\|voice-memo-v54\|version: 54" public server.js
```

Expected: 出力なし（1件でも出たら上げ忘れ）

- [ ] **Step 6: コミット（push はしない）**

```bash
git add -A
git commit -m "chore: 日記・ノートのObsidianボタン対応でv55にバージョン更新"
```

`git push` は実行しないこと。

---

## Self-Review

**1. Spec coverage**

| 設計書の要求 | 対応タスク |
|---|---|
| 送信処理を Markdown 受け取り型に切り出す | Task 1 Step 1・2 |
| 既存の呼び出し側を変更しない | Task 1（`prepareObsidianSend` / `handleObsidianSend` のシグネチャ維持）、Step 4・5 で回帰確認 |
| `diaryToMarkdown(entry)` の新設 | Task 2 Step 1 |
| 見出しのルール（今日/今日以外、タイトル空） | Task 2 Step 1、Step 6 のケース1〜3b |
| 本文は `formatted || text` | Task 2 Step 1、Step 6 のケース7 |
| ハイライトは `- ✨`、空なら省略 | Task 2 Step 1、Step 6 のケース4・4b |
| `date` が壊れていたら `todayISO()` | Task 2 Step 1、Step 6 のケース8 |
| 送る内容がない判定（本文もハイライトも空） | Task 2 Step 1、Step 6 のケース5・5b |
| リンクは登録語のみ・本文全体で1回 | Task 2 Step 1、Step 6 のケース6・6b・6c |
| 日記カードのボタン（共有の直前） | Task 2 Step 3 |
| `data-diary-obsidian` での配線 | Task 2 Step 4 |
| ノートカードのボタン（配線不要） | Task 3 Step 1 |
| `.notes-card-actions` の追加 | Task 3 Step 2 |
| 送信内容はメモ全体 | Task 3 Step 1（`data-id` でメモを引くため自動的にメモ全体） |
| 送信済みを既存配列で共用・タブ間共有 | Task 2 Step 7、Task 3 Step 4（`historyLabel` で確認） |
| 確認ダイアログの文言（`label`） | Task 1 Step 2、Task 2 Step 2 |
| `index.html` を変更しない | 全タスクで `index.html` に触れていない |
| v55 へのバージョン統一 | Task 4 |

漏れなし。

**2. Placeholder scan**

「TBD」「後で実装」「適切にエラー処理」等は不在。全コードステップに実際のコードを記載済み。Task 2 の `diaryToMarkdown` は本計画作成前に Node で13ケース実行して全通過を確認済み。

**3. Type consistency**

- `prepareObsidianSendMarkdown(md) -> Promise<{ok,...}>`：Task 1 で定義、同 Task の `prepareObsidianSend` と `sendMarkdownToObsidian` から使用。一致。
- `sendMarkdownToObsidian(id, md, btn, label) -> Promise<void>`：Task 1 で定義、Task 1 の `handleObsidianSend` と Task 2 の `handleObsidianSendDiary` から使用。引数の順序・型とも一致。
- `diaryToMarkdown(entry) -> string`：Task 2 Step 1 で定義、同 Step 2 で使用。一致。
- `handleObsidianSendDiary(entry, btn)`：Task 2 Step 2 で定義、同 Step 4 の click 委譲から使用。一致。
- `isObsidianSent(id) -> boolean`：既存。Task 2 Step 3 と Task 3 Step 1 の呼び出しと一致。
- `applyWikiLinks(text, terms) -> string` / `getLinkWords() -> string[]` / `todayISO() -> string`：いずれも既存。Task 2 Step 1 の呼び出しと引数一致。
- `data-action="obsidian"` + `data-id`：Task 3 が出す属性と、既存 click 委譲が期待する属性が一致（`findMemo(btn.dataset.id)`）。

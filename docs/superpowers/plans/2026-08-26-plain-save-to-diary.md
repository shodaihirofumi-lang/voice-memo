# 録音タブの「そのまま保存」ボタン 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 録音タブのキーボード入力カードに「そのまま保存」ボタンを足し、AI を一切通さず入力テキストをそのまま日記に1件保存できるようにする。

**Architecture:** 日記タブの「保存」ボタンが既に同じ形のエントリを作っているので、その処理を `addDiaryEntry()` に切り出して両方から共用する。新しいボタンのハンドラは、既存の「整理する」ハンドラと同じ前処理（音声入力の停止・空判定）をしてから、その共通関数を呼ぶだけ。AI 呼び出しもサーバ通信も発生しない。

**Tech Stack:** バニラ JS（ビルドなし・依存追加なし）、localStorage。

設計書: `docs/superpowers/specs/2026-08-26-plain-save-to-diary-design.md`

## Global Constraints

- **依存パッケージを追加しない。** ビルド工程を持たない素の PWA。
- **クライアントのコードは `public/app.js` に置く。** 単一ファイル構成。モジュール分割しない。
- **自動テストは追加しない。** テスト基盤が存在せず、既存タスクと同じ方針。検証は各タスクのブラウザ上コンソール評価で行う。テストファイルやテストフレームワークを新設しないこと。
- **`server.js` の変更は最終タスクの `/api/health` の `version` 1行のみ。**
- **`public/style.css` は変更しない。** `.text-actions` は既に `flex-wrap: wrap` なので4つ目のボタンでも折り返す。
- **録音（マイク）の流れは変更しない。** 文字起こし後に自動で整理される既存の動作をそのまま残す。
- **日記タブの挙動を変えない。** 共通化は内部的な切り出しに留め、画面の動きは従来どおりにする。
- **この機能では AI を呼ばない。** `/api/organize` も `/api/diary` も呼ばないこと。
- **「整理する」だけが `pill-btn primary`。** 「そのまま保存」は `pill-btn`（塗りなし）にする。AI を使う方と使わない方を見た目で区別し、押し間違いを防ぐため。
- 既存コードのスタイル（2スペースインデント、日本語コメント、シングルクォート）に合わせる。
- 最終タスクでキャッシュバスティングを **v57** に統一する（`index.html` の `?v=`、`sw.js` の `CACHE` 名と `ASSETS`、`server.js` の `/api/health`）。

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
| `public/index.html` | キーボード入力カードのボタン列 | 変更（Task 2 で1行追加） |
| `public/app.js` | 日記保存の共通関数と新ボタンのハンドラ | 変更（Task 1・Task 2） |
| `public/sw.js` | キャッシュ名・プリキャッシュ URL のバージョン | 変更（Task 3） |
| `server.js` | `/api/health` の `version` | 変更（Task 3・1行） |
| `public/style.css` | — | **変更なし** |

---

### Task 1: 日記保存の共通関数を切り出す

見た目も動きも何も変わらない後方互換のリファクタ。**日記タブの「保存」が壊れていないことの確認が主目的。**

**Files:**
- Modify: `public/app.js`（`diaryDateStr` 関数の直前に新関数、`initDiaryEditor()` 内の `saveBtn` ハンドラ）

**Interfaces:**
- Consumes: 既存の `diaries`（配列）、`saveDiaries()`、`diaryDateStr(d)`
- Produces: `addDiaryEntry(text, title, date) -> entry`

- [ ] **Step 1: 共通関数を追加する**

`public/app.js` の次の行の**直前**に挿入する（この行はファイル内に1箇所しかない）。

```js
function diaryDateStr(d) {
```

挿入する内容:

```js
// 日記を1件追加して保存する。日記タブの「保存」と録音タブの「そのまま保存」が共用する。
// 空文字の検証と、保存後の画面更新・トーストは呼び出し側の責任にしている
// （日記タブと録音タブで後処理が違うため）
function addDiaryEntry(text, title, date) {
  const entry = {
    id: 'diy_' + Date.now(),
    ts: Date.now(),
    date: date || diaryDateStr(),
    title: title || '',
    text,
    formatted: text,
    highlights: [],
  };
  diaries.unshift(entry);
  saveDiaries();
  return entry;
}
```

- [ ] **Step 2: 日記タブの保存ハンドラを共通関数に載せ替える**

`public/app.js` の次の2行:

```js
    diaries.unshift({ id: 'diy_' + Date.now(), ts: Date.now(), date, title, text, formatted: text, highlights: [] });
    saveDiaries();
```

を、次の1行に置き換える。

```js
    addDiaryEntry(text, title, date);
```

**このハンドラの他の行（空判定・入力欄のクリア・`renderDiaryView()`・トースト）は一切変更しないこと。**

- [ ] **Step 3: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし（終了コード 0）

- [ ] **Step 4: ブラウザ検証 — 日記タブの保存が従来どおり動くこと**

「ブラウザ検証の共通手順」に従い、以下を評価する。**このタスクは見た目が変わらないリファクタなので、回帰が起きていないことの確認がすべて。**

```js
(() => {
  localStorage.clear();
  diaries = [];
  document.querySelector('.nav-btn[data-view="diary"]').click();
  document.getElementById('diaryText').value = '  今日のできごと  ';
  document.getElementById('diaryTitle').value = ' タイトルです ';
  document.getElementById('diaryDate').value = '2026-08-20';
  document.getElementById('diarySaveBtn').click();

  const saved = JSON.parse(localStorage.getItem('voiceMemoDiary.v1') || '[]');
  const e = saved[0] || {};
  return JSON.stringify({
    count: saved.length,
    text: e.text,
    title: e.title,
    date: e.date,
    formattedSameAsText: e.formatted === e.text,
    highlights: e.highlights,
    idPrefix: String(e.id).slice(0, 4),
    textInputCleared: document.getElementById('diaryText').value === '',
    titleInputCleared: document.getElementById('diaryTitle').value === '',
    renderedCards: document.querySelectorAll('#diaryList .diary-entry').length,
  }, null, 1);
})()
```

Expected:
- `count` === `1`
- `text` === `"今日のできごと"`（前後の空白が落ちていること）
- `title` === `"タイトルです"`
- `date` === `"2026-08-20"` ← **日付入力欄の値が使われていること**
- `formattedSameAsText` === `true`
- `highlights` === `[]`
- `idPrefix` === `"diy_"`
- `textInputCleared` === `true`、`titleInputCleared` === `true`
- `renderedCards` === `1`

- [ ] **Step 5: ブラウザ検証 — 空のときは保存されないこと**

```js
(() => {
  localStorage.clear();
  diaries = [];
  document.querySelector('.nav-btn[data-view="diary"]').click();
  document.getElementById('diaryText').value = '   ';
  document.getElementById('diarySaveBtn').click();
  return JSON.stringify({
    saved: JSON.parse(localStorage.getItem('voiceMemoDiary.v1') || '[]').length,
    toast: document.getElementById('toast').textContent,
  });
})()
```

Expected: `saved` === `0`、`toast` === `"内容を入力してください"`

検証後は `localStorage.clear()` してリロードすること。

- [ ] **Step 6: コミット**

```bash
git add public/app.js
git commit -m "refactor: 日記の追加処理を addDiaryEntry に切り出す"
```

---

### Task 2: 「そのまま保存」ボタン

**Files:**
- Modify: `public/index.html`（キーボード入力カードのボタン列）
- Modify: `public/app.js`（`textOrganizeBtn` のハンドラの直後に新ハンドラ）

**Interfaces:**
- Consumes: `addDiaryEntry(text, title, date)`（Task 1）、既存の `stopDictation()`、`textInput`、`textCard`、`renderDiaryView()`、`toast(msg)`
- Produces: なし

- [ ] **Step 1: ボタンを追加する**

`public/index.html` の次の行:

```html
            <button id="textOrganizeBtn" class="pill-btn primary">整理する</button>
```

の**直後**に、次を挿入する。

```html
            <button id="plainSaveBtn" class="pill-btn">そのまま保存</button>
```

**`class` に `primary` を付けないこと。** 「整理する」（AI を使う）と「そのまま保存」（AI を使わない）を見た目で区別し、押し間違いを防ぐため。

- [ ] **Step 2: ハンドラを追加する**

`public/app.js` の `textOrganizeBtn.addEventListener('click', async () => {` から始まるブロックの**閉じ括弧 `});` の直後**に、次を挿入する。

```js
// AIを通さず、入力したテキストをそのまま日記に1件保存する
document.getElementById('plainSaveBtn').addEventListener('click', () => {
  stopDictation();
  const text = textInput.value.trim();
  if (!text) {
    toast('テキストを入力してください');
    return;
  }
  addDiaryEntry(text);
  textInput.value = '';
  textCard.classList.add('hidden');
  renderDiaryView();
  toast('📔 日記に保存しました');
});
```

`addDiaryEntry(text)` は `title` と `date` を省略しているので、タイトルは空、日付は今日になる。

- [ ] **Step 3: 構文チェック**

Run: `node --check public/app.js`
Expected: エラー出力なし

- [ ] **Step 4: ブラウザ検証 — ボタンの並びと見た目**

ハードリロード後、以下を評価する。

```js
(() => {
  const btns = [...document.querySelectorAll('#textCard .text-actions .pill-btn')];
  return JSON.stringify({
    count: btns.length,
    labels: btns.map((b) => b.textContent),
    ids: btns.map((b) => b.id),
    primaryIds: btns.filter((b) => b.classList.contains('primary')).map((b) => b.id),
  });
})()
```

Expected:
- `count` === `4`
- `labels` === `["🎤 音声入力","整理する","そのまま保存","閉じる"]`
- `ids` === `["dictateBtn","textOrganizeBtn","plainSaveBtn","textCloseBtn"]`
- `primaryIds` === `["textOrganizeBtn"]` ← **「そのまま保存」に primary が付いていないこと**

- [ ] **Step 5: ブラウザ検証 — 保存され、AI が呼ばれないこと**

```js
(() => {
  localStorage.clear();
  diaries = [];
  memos = [];
  // AIが呼ばれないことを確かめるため fetch を監視する
  const calls = [];
  const realFetch = window.fetch;
  window.fetch = (...args) => { calls.push(String(args[0])); return realFetch(...args); };

  document.querySelector('.nav-btn[data-view="record"]').click();
  // textModeBtn はトグルなので、既に開いていたら押さない
  const cardEl = document.getElementById('textCard');
  if (cardEl.classList.contains('hidden')) document.getElementById('textModeBtn').click();
  const textInputEl = document.getElementById('textInput');
  textInputEl.value = '  今日は暑かった。  ';
  document.getElementById('plainSaveBtn').click();

  const saved = JSON.parse(localStorage.getItem('voiceMemoDiary.v1') || '[]');
  const e = saved[0] || {};
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
  const r = {
    count: saved.length,
    text: e.text,
    title: e.title,
    dateIsToday: e.date === today,
    formattedSameAsText: e.formatted === e.text,
    inputCleared: textInputEl.value === '',
    cardClosed: document.getElementById('textCard').classList.contains('hidden'),
    toast: document.getElementById('toast').textContent,
    memosUnchanged: JSON.parse(localStorage.getItem('voiceMemos.v1') || '[]').length,
    aiCalls: calls.filter((u) => u.includes('/api/organize') || u.includes('/api/diary')),
  };
  window.fetch = realFetch;
  return JSON.stringify(r, null, 1);
})()
```

Expected:
- `count` === `1`
- `text` === `"今日は暑かった。"`（前後の空白が落ちていること）
- `title` === `""` ← **タイトルは空**
- `dateIsToday` === `true`
- `formattedSameAsText` === `true`
- `inputCleared` === `true`、`cardClosed` === `true`
- `toast` === `"📔 日記に保存しました"`
- `memosUnchanged` === `0` ← **メモが作られていないこと**
- `aiCalls` === `[]` ← **AI が1回も呼ばれていないこと**

- [ ] **Step 6: ブラウザ検証 — 空のときは保存もせずカードも閉じないこと**

```js
(() => {
  localStorage.clear();
  diaries = [];
  document.querySelector('.nav-btn[data-view="record"]').click();
  const card = document.getElementById('textCard');
  if (card.classList.contains('hidden')) document.getElementById('textModeBtn').click();
  document.getElementById('textInput').value = '   ';
  document.getElementById('plainSaveBtn').click();
  return JSON.stringify({
    saved: JSON.parse(localStorage.getItem('voiceMemoDiary.v1') || '[]').length,
    cardStillOpen: !card.classList.contains('hidden'),
    toast: document.getElementById('toast').textContent,
  });
})()
```

Expected: `saved` === `0`、`cardStillOpen` === `true`、`toast` === `"テキストを入力してください"`

- [ ] **Step 7: ブラウザ検証 — 375px でボタン行がはみ出さないこと**

`mcp__Claude_Browser__resize_window` を `{"preset": "mobile", "tabId": "<tabId>"}` で 375px にしてから評価する。

```js
(() => {
  document.querySelector('.nav-btn[data-view="record"]').click();
  const card = document.getElementById('textCard');
  if (card.classList.contains('hidden')) document.getElementById('textModeBtn').click();
  const row = document.querySelector('#textCard .text-actions');
  const rowRect = row.getBoundingClientRect();
  const btns = [...row.querySelectorAll('.pill-btn')];
  const overflow = btns.filter((b) => b.getBoundingClientRect().right > rowRect.right + 1).map((b) => b.id);
  return JSON.stringify({
    rowWidth: Math.round(rowRect.width),
    rowHeight: Math.round(rowRect.height),
    overflowingButtons: overflow,
    docScrollsHorizontally: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  });
})()
```

Expected: `overflowingButtons` === `[]`、`docScrollsHorizontally` === `false`

検証後は `localStorage.clear()` してリロードすること。

- [ ] **Step 8: コミット**

```bash
git add public/app.js public/index.html
git commit -m "feat: 録音タブに「そのまま保存」ボタンを追加"
```

---

### Task 3: バージョン更新

CLAUDE.md のキャッシュバスティング規約に従う。**`git push`（デプロイ）は行わない。** 最終レビュー後に別途実施する。

**Files:**
- Modify: `public/index.html`（`?v=56` → `?v=57` の2箇所）
- Modify: `public/sw.js`（`CACHE` 名と `ASSETS` の2 URL）
- Modify: `server.js`（`/api/health` の `version`）

- [ ] **Step 1: index.html のクエリ文字列を上げる**

```
  <link rel="stylesheet" href="style.css?v=57">
  <script src="app.js?v=57"></script>
```

- [ ] **Step 2: sw.js を上げる**

```js
const CACHE = 'voice-memo-v57';
const ASSETS = [
  '/',
  '/style.css?v=57',
  '/app.js?v=57',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
```

- [ ] **Step 3: server.js を上げる**

```js
  res.json({ ok: true, version: 57, ai: GEMINI_API_KEY ? 'gemini' : 'claude' });
```

- [ ] **Step 4: 全ファイルの構文チェック**

```bash
node --check public/app.js && node --check public/sw.js && node --check server.js
```

Expected: 3つともエラーなし

- [ ] **Step 5: 取りこぼしがないか確認**

```bash
grep -rn "v=56\|voice-memo-v56\|version: 56" public server.js
```

Expected: 出力なし（1件でも出たら上げ忘れ）

- [ ] **Step 6: コミット（push はしない）**

```bash
git add -A
git commit -m "chore: そのまま保存ボタン対応でv57にバージョン更新"
```

`git push` は実行しないこと。

---

## Self-Review

**1. Spec coverage**

| 設計書の要求 | 対応タスク |
|---|---|
| ボタンを「整理する」の隣に追加 | Task 2 Step 1 |
| 「そのまま保存」に `primary` を付けない | Task 2 Step 1、Step 4（`primaryIds` で確認） |
| ボタン ID は `plainSaveBtn` | Task 2 Step 1・2 |
| `stopDictation()` を呼ぶ | Task 2 Step 2 |
| 空なら `toast('テキストを入力してください')` | Task 2 Step 2、Step 6 |
| 日付は今日、タイトルは空 | Task 2 Step 2（引数省略）、Step 5（`dateIsToday` / `title`） |
| `formatted` は `text` と同じ、`highlights` は `[]` | Task 1 Step 1、Task 2 Step 5 |
| 入力欄を空にしてカードを閉じる | Task 2 Step 2、Step 5 |
| `renderDiaryView()` を呼ぶ | Task 2 Step 2 |
| `toast('📔 日記に保存しました')` | Task 2 Step 2、Step 5 |
| AI を呼ばない | Task 2 Step 5（`aiCalls` が空であることを fetch 監視で確認） |
| メモを作らない | Task 2 Step 5（`memosUnchanged`） |
| `addDiaryEntry()` の切り出し | Task 1 Step 1 |
| 空判定は呼び出し側の責任 | Task 1 Step 1（コメントに明記、関数内に検証なし） |
| 日記タブの挙動を変えない | Task 1 Step 2（他の行は変更しない）、Step 4・5 で回帰確認 |
| `style.css` を変更しない | 全タスクで `style.css` に触れていない。Task 2 Step 7 で折り返しを実測確認 |
| 録音の流れを変更しない | 全タスクで録音経路に触れていない |
| v57 へのバージョン統一 | Task 3 |

漏れなし。

**2. Placeholder scan**

「TBD」「後で実装」「適切にエラー処理」等は不在。全コードステップに実際のコードを記載済み。全アンカー文字列が対象ファイル内で一意であることを計画作成前に機械的に確認済み。

**3. Type consistency**

- `addDiaryEntry(text, title, date) -> entry`：Task 1 Step 1 で定義、同 Step 2（日記タブ、3引数すべて渡す）と Task 2 Step 2（録音タブ、`text` のみ）から使用。省略時の既定値（`title` → `''`、`date` → `diaryDateStr()`）が両方の呼び方と整合。
- `diaryDateStr(d) -> string`：既存。`addDiaryEntry` 内の呼び出しと一致（引数省略で今日）。
- `saveDiaries() -> void`：既存。`addDiaryEntry` 内の呼び出しと一致。
- `stopDictation()` / `renderDiaryView()` / `toast(msg)`：いずれも既存。Task 2 Step 2 の呼び出しと一致。
- `textInput` / `textCard`：既存のトップレベル定数。Task 2 Step 2 の参照と一致。
- ボタン ID `plainSaveBtn`：Task 2 Step 1（HTML）と Step 2（JS）で一致。Step 4 の検証でも同じ ID を期待。

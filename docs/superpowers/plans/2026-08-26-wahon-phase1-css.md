# 和本UIリデザイン 第1段（v59） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** グローバルCSSの色トークンと書体を和本（和紙・墨・朱＋明朝体）に置き換え、全タブの見た目を一気に和本にする。文言・ゲーム要素の非表示・装飾は第2段以降で行う。

**Architecture:** 既存の `:root` トークン（`--bg`, `--text`, `--accent` など）を残したまま、和本トークン（`--wa-paper`, `--wa-sumi`, `--wa-shu` など）を新設し、既存トークンを和本トークンの値で再定義する。既存のCSS本文（`background: var(--bg)` など）は一切触らない — 変数の値だけが変わることで全体が和本に切り替わる。直値で色を持つ数少ない例外だけ個別に調整する。

**Tech Stack:** バニラCSS、Google Fonts（Shippori Mincho, Klee One, Noto Serif JP）。

設計書: `docs/superpowers/specs/2026-08-26-wahon-redesign-design.md`

## Global Constraints

- **依存パッケージを追加しない。** ビルド工程を持たない素の PWA。
- **このタスクで変更するのは `public/style.css` / `public/index.html`（Google Fonts の link だけ） / `public/sw.js` / `server.js`（バージョン行のみ）。** `public/app.js` には触らない。
- **既存の `:root` トークン名（`--bg`, `--text` など）を削除・改名しない。** 値だけを和本の値に再定義する。既存のCSS本文（`background: var(--bg)` などの参照）は一切書き換えない。
- **`prefers-color-scheme: dark` は対応しない。** 常にライト（和紙）で描画する。
- **文言変更（保存→綴じる 等）はこの段階ではやらない。** 第2段の担当。
- **ゲーム要素の非表示化もこの段階ではやらない。** 第2段の担当。
- **機能変更ゼロ。** JS は触らない。既存の録音・保存・整理・Obsidian送信などが全て従来どおり動くこと。
- 既存コードのスタイル（2スペースインデント、日本語コメント、シングルクォート）に合わせる。
- 最終タスクでキャッシュバスティングを **v59** に統一する。

## デザイントークン（設計書より）

```css
--wa-paper:   #ede4d0;   /* 生成りの和紙・背景 */
--wa-paper-2: #f5eed8;   /* カード裏（少し明るい紙） */
--wa-sumi:    #241d18;   /* 墨・本文/見出し */
--wa-sumi-2:  #6a5a48;   /* 淡墨・副次テキスト */
--wa-shu:     #a83a2a;   /* 朱・アクセント */
--wa-line:    #2d251c;   /* 濃い罫線 */
--wa-line-2:  rgba(30,20,15,0.2); /* 淡い罫線 */
--wa-shadow:  rgba(60,40,22,0.15); /* 影 */
```

書体:
- 見出し: `'Shippori Mincho', 'Noto Serif JP', serif`（500〜700）
- 本文: `'Klee One', 'Noto Serif JP', serif`（400/600）

## ブラウザ検証の共通手順

1. `mcp__Claude_Browser__preview_start` を `{"name": "voice-memo"}` で呼ぶ（`tabId` が返る）
2. `mcp__Claude_Browser__resize_window` を `{"preset": "mobile", "tabId": "<tabId>"}` で 375px にする
3. `mcp__Claude_Browser__javascript_tool` に `{"action":"javascript_exec","tabId":"<tabId>","text":"<スニペット>"}` を渡して評価
4. `mcp__Claude_Browser__computer` の `screenshot` で見た目を撮る（各タブ）
5. コード変更後は `mcp__Claude_Browser__navigate` で同じ URL に再アクセスしてリロード

Service Worker が古いコードを返す場合は、先にこれを評価してからリロード:

```js
(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);return 'sw cleared';})()
```

検証後は `mcp__Claude_Browser__preview_stop` でサーバを止め、`localStorage.clear()` すること。

## File Structure

| ファイル | 責務 | 変更 |
|---|---|---|
| `public/style.css` | 和本トークン追加、既存トークン再定義、body/フォント切替、直値色の上書き | 変更（Task 1・Task 2） |
| `public/index.html` | Google Fonts の `<link>` を Shippori Mincho / Klee One / Noto Serif JP に | 変更（Task 1） |
| `public/sw.js` | キャッシュ名・プリキャッシュ URL のバージョン | 変更（Task 3） |
| `server.js` | `/api/health` の `version` を 59 に | 変更（Task 3・1行） |
| `public/app.js` | — | **変更なし** |

---

### Task 1: 和本トークン追加＋既存トークンの再定義＋書体切替

このタスクだけで見た目の大半が和本になる。まず設計書のトークンを追加し、そのうえで**既存トークンを和本の値で再定義**して既存の全 CSS 参照を自動で追随させる。

**Files:**
- Modify: `public/index.html`（`<head>` 内の Google Fonts の `<link>`）
- Modify: `public/style.css`（`:root` ブロックと `body` の `font-family`）

**Interfaces:**
- Consumes: 既存の `:root` トークン名
- Produces: `--wa-*` トークン一式、再定義された既存トークン、和本フォント適用

- [ ] **Step 1: Google Fonts の link を差し替える**

`public/index.html` の次の行:

```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
```

を、次の行に置き換える。

```html
  <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Klee+One:wght@400;600&family=Noto+Serif+JP:wght@400;500;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: `:root` を和本トークンで書き換える**

`public/style.css` の既存の `:root` ブロック（`--bg` から `--accent2` まで13変数）:

```css
:root {
  --bg: #09090b;
  --surface: #121215;
  --surface-2: #19191d;
  --border: rgba(255, 255, 255, 0.09);
  --border-strong: rgba(255, 255, 255, 0.18);
  --text: #f8f8fa;
  --text-2: #b8b8c4;
  --text-3: #7e7e8a;
  --red: #ef4444;
  --red-soft: #f87171;
  --green: #4ade80;
  --accent: #fbbf24;
  --accent2: #f97316;
}
```

を、次でそっくり置き換える。**既存の変数名は残す**（値だけ和本に）。

```css
:root {
  /* ===== 和本デザイントークン ===== */
  --wa-paper:   #ede4d0;
  --wa-paper-2: #f5eed8;
  --wa-sumi:    #241d18;
  --wa-sumi-2:  #6a5a48;
  --wa-shu:     #a83a2a;
  --wa-line:    #2d251c;
  --wa-line-2:  rgba(30,20,15,0.2);
  --wa-shadow:  rgba(60,40,22,0.15);

  /* ===== 既存トークンを和本の値に再定義（変数名は残して全参照を追随させる）===== */
  --bg: var(--wa-paper);
  --surface: var(--wa-paper-2);
  --surface-2: rgba(30,20,15,0.06);
  --border: rgba(30,20,15,0.14);
  --border-strong: rgba(30,20,15,0.28);
  --text: var(--wa-sumi);
  --text-2: var(--wa-sumi-2);
  --text-3: #8b7c68;
  --red: var(--wa-shu);
  --red-soft: #c05540;
  --green: #4a6b2f;
  --accent: var(--wa-shu);
  --accent2: #7a3a26;
}
```

- [ ] **Step 3: body のフォントを和本に切り替える**

`public/style.css` の `body` セレクタ内、次の行:

```css
  font-family: Inter, 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif;
```

を、次に置き換える。

```css
  font-family: 'Klee One', 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif;
```

- [ ] **Step 4: 構文チェック**

`node --check` は CSS には効かないので、代わりに CSS の全 `{` と `}` の数が一致しているか確認する。

```bash
awk 'BEGIN{o=0;c=0} {o+=gsub(/\{/,"{"); c+=gsub(/\}/,"}")} END{print o " { / } " c; if(o!=c) exit 1}' public/style.css
```

Expected: 開き `{` と閉じ `}` の数が一致、終了コード 0

- [ ] **Step 5: ブラウザ検証 — 全タブが描画され、色が和本になっていること**

「ブラウザ検証の共通手順」に従いプレビューを起動し、以下を評価する。

```js
(() => {
  localStorage.clear();
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const bodyFg = getComputedStyle(document.body).color;
  const bodyFont = getComputedStyle(document.body).fontFamily;
  // 全タブに切り替えて例外が出ないかチェック
  const tabs = ['record','history','game','diary','notes','calendar','advisor','settings'];
  const results = [];
  for (const v of tabs) {
    try {
      document.querySelector(`.nav-btn[data-view="${v}"]`).click();
      const el = document.getElementById('view-' + v);
      results.push(v + ':' + (el && el.classList.contains('active') ? 'ok' : 'NG'));
    } catch (e) { results.push(v + ':ERR ' + e.message); }
  }
  return JSON.stringify({
    bodyBg, bodyFg,
    fontHasKlee: bodyFont.includes('Klee One'),
    fontHasNoto: bodyFont.includes('Noto Serif JP'),
    tabs: results,
  }, null, 1);
})()
```

Expected:
- `bodyBg` が `"rgb(237, 228, 208)"`（`#ede4d0` の和紙色）
- `bodyFg` が `"rgb(36, 29, 24)"`（`#241d18` の墨色）
- `fontHasKlee` === `true`、`fontHasNoto` === `true`
- `tabs` 全部が `":ok"` で終わる（**全タブがクラッシュせず切り替わること**）

- [ ] **Step 6: ブラウザ検証 — スクリーンショットで4タブの見た目を確認**

各タブに切り替えてスクリーンショットを撮る。以下を順に評価してから `mcp__Claude_Browser__computer` の `screenshot` を1回ずつ撮る。

```js
document.querySelector('.nav-btn[data-view="record"]').click(); window.scrollTo(0,0); 'record'
```

```js
document.querySelector('.nav-btn[data-view="history"]').click(); window.scrollTo(0,0); 'history'
```

```js
document.querySelector('.nav-btn[data-view="diary"]').click(); window.scrollTo(0,0); 'diary'
```

```js
document.querySelector('.nav-btn[data-view="settings"]').click(); window.scrollTo(0,0); 'settings'
```

**目視確認**: 4枚とも背景が和紙色、本文が墨色、明朝体になっているか。ゲーム要素（Lv.4など）は**まだ残っている**（第2段の対象）が、色は和紙に馴染んでいるはず。ボタンの一部（白い録音ボタンなど）はまだ現代的な白色で浮いて見える可能性がある — それは Task 2 で調整する。

- [ ] **Step 7: コミット**

```bash
git add public/style.css public/index.html
git commit -m "feat(wahon): 和本トークンを追加し既存トークンを和本の値に再定義（v59 第1段）"
```

---

### Task 2: 直値で色を持つ要素の調整

Task 1 で全体は和紙・墨色になったが、直値（`#fff` や `#09090b` など）で色を持つ要素は自動追随しない。目視で浮いて見える要素を和本に合わせる。

**Files:**
- Modify: `public/style.css`（`.record-btn` などの直値色を持つルール）

**Interfaces:**
- Consumes: Task 1 で定義された `--wa-*` トークン
- Produces: なし

- [ ] **Step 1: 直値の白・黒を上書きする**

`public/style.css` の次の行:

```css
  background: #fff;
  color: #09090b;
```

は録音ボタン（`.record-btn`）内で使われている。これを次で置き換える。

```css
  background: var(--wa-shu);
  color: var(--wa-paper);
```

続けて、`.record-btn.alt:hover:not(:disabled) { background: #202026; }` を次に置き換える。

```css
.record-btn.alt:hover:not(:disabled) { background: rgba(30,20,15,0.08); }
```

`  border-top-color: #fff;`（スピナーの色）を次に置き換える。

```css
  border-top-color: var(--wa-paper);
```

- [ ] **Step 2: ワークスペースタブ（仕事・プライベート）の色を和本に**

`public/style.css` の次の2行:

```css
.ws-tab.active[data-ws="work"]    { color: #60a5fa; border-color: rgba(96,165,250,0.45); background: rgba(96,165,250,0.1); }
.ws-tab.active[data-ws="private"] { color: #c084fc; border-color: rgba(192,132,252,0.45); background: rgba(192,132,252,0.1); }
```

を、次に置き換える（青紫の代わりに墨と朱の濃淡で分ける）。

```css
.ws-tab.active[data-ws="work"]    { color: var(--wa-shu); border-color: var(--wa-shu); background: rgba(168,58,42,0.08); }
.ws-tab.active[data-ws="private"] { color: var(--wa-sumi); border-color: var(--wa-sumi); background: rgba(30,20,15,0.06); }
```

続けて `.ws-toggle-btn.work` と `.ws-toggle-btn.private`:

```css
.ws-toggle-btn.work    { color: #60a5fa; border-color: rgba(96,165,250,0.4); }
.ws-toggle-btn.private { color: #c084fc; border-color: rgba(192,132,252,0.4); }
```

を、次に置き換える。

```css
.ws-toggle-btn.work    { color: var(--wa-shu); border-color: rgba(168,58,42,0.4); }
.ws-toggle-btn.private { color: var(--wa-sumi); border-color: rgba(30,20,15,0.35); }
```

- [ ] **Step 3: カテゴリ色（`CATEGORY_CONFIG` の色ドット）は残す**

`public/app.js` の `CATEGORY_CONFIG` で `color: '#4ade80'`（緑・タスク）などが定義されており、これは JS が動的に `.dot` にインライン背景色として当てている。**この5色は変えない**（カテゴリの視認性のため）。CSS では対応しない。

- [ ] **Step 4: 構文チェック（`{` と `}` の対応）**

```bash
awk 'BEGIN{o=0;c=0} {o+=gsub(/\{/,"{"); c+=gsub(/\}/,"}")} END{print o " { / } " c; if(o!=c) exit 1}' public/style.css
```

Expected: 開き `{` と閉じ `}` の数が一致

- [ ] **Step 5: ブラウザ検証 — 録音ボタンとワークスペースタブが和本色に**

「ブラウザ検証の共通手順」でプレビューを起動し、以下を評価する。

```js
(() => {
  document.querySelector('.nav-btn[data-view="record"]').click();
  const recBtn = document.getElementById('recordBtn');
  const workTab = document.querySelector('.ws-tab[data-ws="work"]');
  // work タブをアクティブにする
  workTab.click();
  const wsActiveBg = getComputedStyle(document.querySelector('.ws-tab.active')).backgroundColor;
  const wsActiveColor = getComputedStyle(document.querySelector('.ws-tab.active')).color;
  return JSON.stringify({
    recBtnBg: getComputedStyle(recBtn).backgroundColor,
    recBtnColor: getComputedStyle(recBtn).color,
    wsActiveBg,
    wsActiveColor,
  }, null, 1);
})()
```

Expected:
- `recBtnBg` が `"rgb(168, 58, 42)"`（朱色）
- `recBtnColor` が `"rgb(237, 228, 208)"`（和紙色 = 朱の上に紙色の文字）
- `wsActiveBg` が `"rgba(168, 58, 42, 0.08)"`
- `wsActiveColor` が `"rgb(168, 58, 42)"`

- [ ] **Step 6: スクリーンショット — 録音タブの見た目確認**

`mcp__Claude_Browser__computer` の `screenshot` で録音タブを撮る。**録音ボタンが白から朱色に変わり、和紙背景に馴染んでいる**ことを目視確認する。

- [ ] **Step 7: コミット**

```bash
git add public/style.css
git commit -m "feat(wahon): 録音ボタンとワークスペースタブの直値色を和本に統一（v59 第1段）"
```

---

### Task 3: バージョン更新

CLAUDE.md のキャッシュバスティング規約に従う。**`git push`（デプロイ）は行わない。** 最終レビュー後に別途実施する。

**Files:**
- Modify: `public/index.html`（`?v=58` → `?v=59` の2箇所）
- Modify: `public/sw.js`（`CACHE` 名と `ASSETS` の2 URL）
- Modify: `server.js`（`/api/health` の `version`）

- [ ] **Step 1: index.html のクエリ文字列を上げる**

```
  <link rel="stylesheet" href="style.css?v=59">
  <script src="app.js?v=59"></script>
```

- [ ] **Step 2: sw.js を上げる**

```js
const CACHE = 'voice-memo-v59';
const ASSETS = [
  '/',
  '/style.css?v=59',
  '/app.js?v=59',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
```

- [ ] **Step 3: server.js を上げる**

```js
  res.json({ ok: true, version: 59, ai: GEMINI_API_KEY ? 'gemini' : 'claude' });
```

- [ ] **Step 4: 構文チェック（`node --check`）**

```bash
node --check public/app.js && node --check public/sw.js && node --check server.js
```

Expected: 3つともエラーなし

- [ ] **Step 5: 取りこぼしがないか確認**

```bash
grep -rn "v=58\|voice-memo-v58\|version: 58" public server.js
```

Expected: 出力なし（1件でも出たら上げ忘れ）

- [ ] **Step 6: コミット（push はしない）**

```bash
git add -A
git commit -m "chore: 和本UI第1段でv59にバージョン更新"
```

`git push` は実行しないこと。

---

## Self-Review

**1. Spec coverage（第1段の範囲のみ）**

| 設計書の要求（第1段） | 対応タスク |
|---|---|
| 和本トークン `--wa-*` の追加 | Task 1 Step 2 |
| 既存トークンの再定義（`--bg` を `--wa-paper` に等） | Task 1 Step 2 |
| body の書体を Klee One / Noto Serif JP に | Task 1 Step 3 |
| Google Fonts の link を Shippori Mincho / Klee One / Noto Serif JP に | Task 1 Step 1 |
| `prefers-color-scheme: dark` は対応しない | 全タスクで media query を追加していない |
| カード（`.glass-card`）の変更 | **Task 1 の変数再定義で `background: var(--surface)` が和紙色になり自動追随**（追加のCSSは不要） |
| 下ナビの変更 | 同上（`background`/`color` が変数参照なので自動追随） |
| 直値色の上書き（録音ボタン・ワークスペースタブ） | Task 2 |
| CATEGORY_CONFIG の色は残す | Task 2 Step 3（明示的に触らない） |
| 全タブがクラッシュせず描画される | Task 1 Step 5 |
| v59 へのバージョン統一 | Task 3 |

**第2段以降の担当**（欠落ではない）:
- 文言変更（保存→綴じる 等）
- ゲーム要素の `display: none`
- 縦書き題字・綴じ糸・朱印

漏れなし。

**2. Placeholder scan**

「TBD」「後で実装」「適切にエラー処理」等は不在。全コードステップに実際のコードを記載済み。

**3. Type consistency**

- 既存トークン名（`--bg`, `--text`, `--text-2` など）は削除も改名もせず、値だけを差し替えるので、既存の全 CSS 参照（`background: var(--bg)` 等）が壊れない。
- 新設トークン `--wa-paper`, `--wa-sumi`, `--wa-shu` はこの第1段の Task 1 で定義し、Task 2 の直値上書きでも使う。同一ファイル内・宣言済みなので参照可能。
- `public/app.js` を触らないので、JS からの CSS クラス名参照（`.pill-btn`, `.obsidian-sent` 等）にも影響なし。

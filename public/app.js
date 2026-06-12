// ===== 要素 =====
const recordBtn = document.getElementById('recordBtn');
const micIcon = document.getElementById('micIcon');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const vizCanvas = document.getElementById('visualizer');
const liveEl = document.getElementById('live');
const liveFinalEl = document.getElementById('liveFinal');
const liveInterimEl = document.getElementById('liveInterim');
const resultEl = document.getElementById('result');
const historyListEl = document.getElementById('historyList');
const historyEmptyEl = document.getElementById('historyEmpty');
const tokenInput = document.getElementById('todoistToken');
const tokenStatusEl = document.getElementById('tokenStatus');
const toastEl = document.getElementById('toast');
const searchInput = document.getElementById('searchInput');
const weeklyBtn = document.getElementById('weeklyBtn');
const weeklyResultEl = document.getElementById('weeklyResult');

const SpeechRecognitionImpl =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
const STOP_SVG = '<svg viewBox="0 0 24 24" fill="#ef4444"><rect x="7" y="7" width="10" height="10" rx="2.5"/></svg>';
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const CATEGORY_CONFIG = {
  tasks:     { label: 'タスク',       color: '#4ade80' },
  shopping:  { label: '買い物',       color: '#fbbf24' },
  ideas:     { label: 'アイデア',     color: '#c084fc' },
  reminders: { label: 'リマインダー', color: '#60a5fa' },
  notes:     { label: 'メモ',         color: '#71717a' },
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// ===== 保存（localStorage）=====
const STORE_KEY = 'voiceMemos.v1';
const TOKEN_KEY = 'todoistToken';

function loadMemos() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMemos(memos) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(memos));
  } catch {}
}

let memos = loadMemos();
let editingId = null;
let searchQuery = '';
let currentResultId = null;

function findMemo(id) {
  return memos.find((m) => m.id === id);
}

// ===== 画面切替 =====
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'history') renderHistory();
  });
});

// ===== 録音 =====
let recognition = null;
let isRecording = false;
let finalText = '';
let timerInterval = null;
let seconds = 0;

recordBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

function startRecording() {
  if (!SpeechRecognitionImpl) {
    setStatus('このブラウザは音声認識に対応していません。ChromeかSafariで開いてください', 'error');
    return;
  }

  finalText = '';
  recognition = new SpeechRecognitionImpl();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalText += t;
      } else {
        interim += t;
      }
    }
    liveFinalEl.textContent = finalText;
    liveInterimEl.textContent = interim;
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      isRecording = false;
      stopTimer();
      stopVisualizer();
      resetButton();
      setStatus('マイクへのアクセスを許可してください', 'error');
    }
  };

  // スマホは無音で勝手に止まるので、録音中なら自動で再開する
  recognition.onend = () => {
    if (isRecording) {
      try { recognition.start(); } catch {}
    }
  };

  try {
    recognition.start();
  } catch {
    setStatus('音声認識を開始できませんでした。ページを再読み込みしてください', 'error');
    return;
  }

  isRecording = true;
  recordBtn.classList.add('recording');
  micIcon.innerHTML = STOP_SVG;
  setStatus('録音中... 話してください', 'recording');
  liveFinalEl.textContent = '';
  liveInterimEl.textContent = '';
  liveEl.classList.remove('hidden');
  resultEl.innerHTML = '';
  startTimer();
  startVisualizer();
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    try { recognition.stop(); } catch {}
  }
  stopTimer();
  stopVisualizer();
  recordBtn.classList.remove('recording');

  const text = finalText.trim();
  if (!text) {
    resetButton();
    liveEl.classList.add('hidden');
    setStatus('音声が認識できませんでした。もう一度お試しください', 'error');
    return;
  }

  recordBtn.disabled = true;
  recordBtn.classList.add('processing');
  micIcon.innerHTML = MIC_SVG;
  setStatus('AIが整理中です...', 'processing');
  organize(text);
}

async function organize(text) {
  try {
    const response = await fetch('/api/organize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'サーバーエラー');

    const memo = {
      id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      transcription: data.transcription,
      organized: data.organized,
    };
    memos.unshift(memo);
    saveMemos(memos);

    liveEl.classList.add('hidden');
    currentResultId = memo.id;
    renderResult();
    setStatus('完了！保存しました', 'success');
  } catch (err) {
    setStatus(`エラー: ${err.message}`, 'error');
  } finally {
    resetButton();
  }
}

function resetButton() {
  recordBtn.disabled = false;
  recordBtn.classList.remove('processing');
  micIcon.innerHTML = MIC_SVG;
}

// ===== 波形ビジュアライザー =====
let vizStream = null;
let audioCtx = null;
let analyser = null;
let vizRaf = null;

async function startVisualizer() {
  try {
    vizStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    audioCtx.createMediaStreamSource(vizStream).connect(analyser);

    const ctx = vizCanvas.getContext('2d');
    const freq = new Uint8Array(analyser.frequencyBinCount);
    vizCanvas.classList.add('on');

    const BARS = 44;
    const W = vizCanvas.width, H = vizCanvas.height;
    const gap = 6;
    const barW = (W - gap * (BARS - 1)) / BARS;

    const draw = () => {
      analyser.getByteFrequencyData(freq);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < BARS; i++) {
        const v = freq[Math.floor((i * freq.length) / BARS)] / 255;
        const h = Math.max(4, v * H * 0.95);
        const x = i * (barW + gap);
        const y = (H - h) / 2;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barW, h, barW / 2);
        } else {
          ctx.rect(x, y, barW, h);
        }
        ctx.fill();
      }
      vizRaf = requestAnimationFrame(draw);
    };
    draw();
  } catch {
    // 飾りなので失敗しても録音は続行
  }
}

function stopVisualizer() {
  if (vizRaf) cancelAnimationFrame(vizRaf);
  vizRaf = null;
  if (vizStream) {
    vizStream.getTracks().forEach((t) => t.stop());
    vizStream = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  vizCanvas.classList.remove('on');
  const ctx = vizCanvas.getContext('2d');
  ctx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
}

// ===== メモ描画 =====
function memoBodyHTML(memo, opts) {
  const o = memo.organized || {};
  const cats = o.categories || {};
  const editing = !!(opts && opts.editing);
  let html = '';

  if (editing) {
    html += `<input class="title-edit" data-id="${memo.id}" value="${esc(o.title || '')}" placeholder="タイトル">`;
  } else if (!(opts && opts.hideHeader)) {
    html += `<div class="memo-title">${esc(o.title || '音声メモ')}</div>`;
    html += `<div class="memo-date">${formatDate(memo.ts)}</div>`;
  }
  if (!editing && o.summary) html += `<div class="memo-summary">${esc(o.summary)}</div>`;

  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    const items = cats[key] || [];
    if (!editing && items.length === 0) continue;

    html += `<div class="category-section">`;
    html += `<h4><span class="dot" style="background:${config.color}"></span>${config.label}</h4><ul>`;
    items.forEach((item, idx) => {
      if (editing) {
        html += `
        <li class="item-row editing">
          <input type="text" class="item-edit" data-id="${memo.id}" data-cat="${key}" data-idx="${idx}" value="${esc(item.text)}">
          <button class="del-item-btn" data-action="del-item" data-id="${memo.id}" data-cat="${key}" data-idx="${idx}" aria-label="項目を削除">${X_SVG}</button>
        </li>`;
      } else {
        const due = item.due ? `<span class="due">${formatDue(item.due)}</span>` : '';
        html += `
        <li class="item-row${item.done ? ' done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''}
            data-id="${memo.id}" data-cat="${key}" data-idx="${idx}">
          <span class="item-text">${esc(item.text)}</span>${due}
        </li>`;
      }
    });
    html += `</ul>`;
    if (editing) {
      html += `<button class="add-item-btn" data-action="add-item" data-id="${memo.id}" data-cat="${key}">＋ 追加</button>`;
    }
    html += `</div>`;
  }

  if (!editing) {
    html += `
    <details class="transcription-detail">
      <summary>文字起こし全文</summary>
      <p>${esc(memo.transcription || '')}</p>
    </details>`;
  }

  html += `<div class="memo-actions">`;
  if (editing) {
    html += `<button class="pill-btn primary" data-action="done-edit" data-id="${memo.id}">完了</button>`;
  } else {
    const hasTasks =
      (cats.tasks || []).length > 0 || (cats.reminders || []).length > 0;
    if (hasTasks) {
      html += `<button class="pill-btn primary" data-action="todoist" data-id="${memo.id}">Todoistへ追加</button>`;
    }
    html += `<button class="pill-btn" data-action="edit" data-id="${memo.id}">編集</button>`;
    html += `<button class="pill-btn" data-action="share" data-id="${memo.id}">共有</button>`;
    if (opts && opts.deletable) {
      html += `<button class="pill-btn danger" data-action="delete" data-id="${memo.id}">削除</button>`;
    }
  }
  html += `</div>`;
  return html;
}

function renderResult() {
  const m = currentResultId ? findMemo(currentResultId) : null;
  resultEl.innerHTML = m
    ? `<div class="glass-card memo-card">${memoBodyHTML(m, { editing: editingId === m.id })}</div>`
    : '';
}

function rerenderAll() {
  renderResult();
  renderHistory();
}

function memoSearchText(m) {
  const o = m.organized || {};
  const parts = [o.title || '', o.summary || '', m.transcription || ''];
  for (const items of Object.values(o.categories || {})) {
    for (const it of items) parts.push(it.text || '');
  }
  return parts.join(' ').toLowerCase();
}

function cleanupMemo(memo) {
  const cats = (memo.organized && memo.organized.categories) || {};
  for (const key of Object.keys(cats)) {
    cats[key] = cats[key]
      .map((it) => ({ ...it, text: (it.text || '').trim() }))
      .filter((it) => it.text !== '');
    if (cats[key].length === 0) delete cats[key];
  }
  if (memo.organized && !(memo.organized.title || '').trim()) {
    memo.organized.title = '音声メモ';
  }
}

const HISTORY_EMPTY_DEFAULT = 'まだメモがありません。<br>録音タブから話してみてください。';

function renderHistory() {
  const q = searchQuery.trim().toLowerCase();
  const list = q ? memos.filter((m) => memoSearchText(m).includes(q)) : memos;

  if (list.length === 0) {
    historyListEl.innerHTML = '';
    historyEmptyEl.innerHTML = q
      ? `「${esc(searchQuery.trim())}」に一致するメモがありません`
      : HISTORY_EMPTY_DEFAULT;
    historyEmptyEl.classList.remove('hidden');
    return;
  }
  historyEmptyEl.classList.add('hidden');
  historyListEl.innerHTML = list
    .map(
      (m) => `
      <div class="glass-card memo-card history-card${editingId === m.id ? ' open' : ''}" data-card="${m.id}">
        <div class="history-head" data-toggle="${m.id}">
          <div>
            <div class="memo-title">${esc((m.organized && m.organized.title) || '音声メモ')}</div>
            <div class="memo-date">${formatDate(m.ts)}</div>
          </div>
          <span class="chevron">${CHEVRON_SVG}</span>
        </div>
        <div class="history-body">${memoBodyHTML(m, { deletable: true, hideHeader: true, editing: editingId === m.id })}</div>
      </div>`
    )
    .join('');
}

// ===== 操作（イベント委譲）=====
document.addEventListener('change', (e) => {
  const cb = e.target;
  if (cb.matches('input[type="checkbox"][data-id]')) {
    const memo = findMemo(cb.dataset.id);
    if (!memo) return;
    const item = ((memo.organized.categories || {})[cb.dataset.cat] || [])[cb.dataset.idx];
    if (!item) return;
    item.done = cb.checked;
    saveMemos(memos);
    cb.closest('.item-row').classList.toggle('done', cb.checked);
  }
});

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-toggle]');
  if (toggle && !e.target.closest('.history-body')) {
    toggle.closest('.history-card').classList.toggle('open');
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'close-weekly') {
    weeklyResultEl.innerHTML = '';
    return;
  }

  const memo = findMemo(btn.dataset.id);
  if (!memo) return;

  if (action === 'share') shareMemo(memo);
  if (action === 'todoist') addToTodoist(memo, btn);

  if (action === 'edit') {
    editingId = memo.id;
    rerenderAll();
  }

  if (action === 'done-edit') {
    cleanupMemo(memo);
    editingId = null;
    saveMemos(memos);
    rerenderAll();
    toast('保存しました');
  }

  if (action === 'del-item') {
    const arr = ((memo.organized || {}).categories || {})[btn.dataset.cat];
    if (arr) arr.splice(Number(btn.dataset.idx), 1);
    rerenderAll();
  }

  if (action === 'add-item') {
    const o = memo.organized || (memo.organized = {});
    const cats = o.categories || (o.categories = {});
    (cats[btn.dataset.cat] = cats[btn.dataset.cat] || []).push({ text: '', due: null, done: false });
    rerenderAll();
    const scope = document.querySelector('.view.active') || document;
    const inputs = scope.querySelectorAll(`.item-edit[data-id="${memo.id}"][data-cat="${btn.dataset.cat}"]`);
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  if (action === 'delete') {
    if (confirm('このメモを削除しますか？')) {
      memos = memos.filter((m) => m.id !== memo.id);
      if (currentResultId === memo.id) currentResultId = null;
      if (editingId === memo.id) editingId = null;
      saveMemos(memos);
      rerenderAll();
      toast('削除しました');
    }
  }
});

// 編集中のテキスト入力をモデルに反映（保存は「完了」時）
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.matches('.item-edit')) {
    const memo = findMemo(el.dataset.id);
    if (!memo) return;
    const item = (((memo.organized || {}).categories || {})[el.dataset.cat] || [])[el.dataset.idx];
    if (item) item.text = el.value;
  } else if (el.matches('.title-edit')) {
    const memo = findMemo(el.dataset.id);
    if (memo && memo.organized) memo.organized.title = el.value;
  }
});

// ===== 検索 =====
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderHistory();
});

// ===== 週間まとめ =====
weeklyBtn.addEventListener('click', async () => {
  const recent = memos.filter((m) => Date.now() - m.ts < 7 * 86400000).slice(0, 50);
  if (recent.length === 0) {
    toast('この1週間のメモがありません');
    return;
  }

  weeklyBtn.disabled = true;
  const original = weeklyBtn.textContent;
  weeklyBtn.textContent = '作成中...';

  try {
    const payload = recent.map((m) => ({
      date: formatDate(m.ts),
      title: (m.organized && m.organized.title) || '',
      categories: Object.fromEntries(
        Object.entries((m.organized && m.organized.categories) || {}).map(([k, items]) => [
          k,
          items.map((it) => ({ text: it.text, due: it.due, done: !!it.done })),
        ])
      ),
    }));

    const r = await fetch('/api/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memos: payload }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'エラー');

    weeklyResultEl.innerHTML = `
      <div class="glass-card weekly-card">
        <div class="weekly-head">
          <h3 class="card-label">今週のまとめ</h3>
          <button class="del-item-btn" data-action="close-weekly" aria-label="閉じる">${X_SVG}</button>
        </div>
        <p class="weekly-text">${esc(data.summary)}</p>
      </div>`;
  } catch (err) {
    toast(`エラー: ${err.message}`);
  } finally {
    weeklyBtn.disabled = false;
    weeklyBtn.textContent = original;
  }
});

// ===== バックアップ =====
document.getElementById('exportBtn').addEventListener('click', () => {
  if (memos.length === 0) {
    toast('書き出すメモがありません');
    return;
  }
  const data = { app: 'voice-memo', version: 1, exportedAt: new Date().toISOString(), memos };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voice-memo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${memos.length}件を書き出しました`);
});

const importFileEl = document.getElementById('importFile');
document.getElementById('importBtn').addEventListener('click', () => importFileEl.click());

importFileEl.addEventListener('change', async () => {
  const file = importFileEl.files && importFileEl.files[0];
  importFileEl.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const arr = Array.isArray(parsed) ? parsed : parsed.memos;
    if (!Array.isArray(arr)) throw new Error('invalid');

    const map = new Map(memos.map((m) => [m.id, m]));
    let added = 0;
    for (const m of arr) {
      if (m && m.id && m.organized && !map.has(m.id)) {
        map.set(m.id, m);
        added++;
      }
    }
    memos = [...map.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    saveMemos(memos);
    renderHistory();
    toast(added > 0 ? `${added}件を復元しました` : '新しいメモはありませんでした');
  } catch {
    toast('ファイルを読み込めませんでした');
  }
});

// ===== 共有 =====
async function shareMemo(memo) {
  const o = memo.organized || {};
  const cats = o.categories || {};
  let text = `${o.title || '音声メモ'}\n`;
  if (o.summary) text += `${o.summary}\n`;
  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    const items = cats[key];
    if (!items || items.length === 0) continue;
    text += `\n${config.label}\n`;
    for (const item of items) {
      text += `・${item.text}${item.due ? `（期限: ${formatDue(item.due)}）` : ''}\n`;
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: o.title || '声でメモ', text });
    } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(text);
      toast('コピーしました。LINEなどに貼り付けてください');
    } catch {
      toast('コピーできませんでした');
    }
  }
}

// ===== Todoist =====
async function addToTodoist(memo, btn) {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  if (!token) {
    toast('先に設定画面でTodoistトークンを保存してください');
    return;
  }

  const cats = (memo.organized && memo.organized.categories) || {};
  const tasks = [...(cats.tasks || []), ...(cats.reminders || [])].filter((t) => !t.done);
  if (tasks.length === 0) {
    toast('追加できるタスクがありません');
    return;
  }

  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '追加中...';

  try {
    const r = await fetch('/api/todoist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, tasks: tasks.map((t) => ({ text: t.text, due: t.due })) }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'エラー');

    btn.textContent = '✓ 追加済み';
    toast(`✓ ${data.added}件をTodoistに追加しました`);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = original;
    toast(`エラー: ${err.message}`);
  }
}

// ===== 設定 =====
function refreshTokenStatus() {
  const saved = !!localStorage.getItem(TOKEN_KEY);
  tokenStatusEl.textContent = saved ? '✓ トークン保存済み' : '';
}

document.getElementById('saveTokenBtn').addEventListener('click', () => {
  const v = tokenInput.value.trim();
  if (!v) {
    toast('トークンを入力してください');
    return;
  }
  localStorage.setItem(TOKEN_KEY, v);
  tokenInput.value = '';
  refreshTokenStatus();
  toast('保存しました');
});

document.getElementById('clearTokenBtn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  refreshTokenStatus();
  toast('削除しました');
});

refreshTokenStatus();
setStatus('タップして録音');

// ===== 共通 =====
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]}) ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDue(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}/${d}(${WEEKDAYS[date.getDay()]})`;
}

let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2600);
}

function setStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`.trim();
}

function startTimer() {
  seconds = 0;
  timerEl.textContent = '0:00';
  timerInterval = setInterval(() => {
    seconds++;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerEl.textContent = '';
}

// ===== PWA =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

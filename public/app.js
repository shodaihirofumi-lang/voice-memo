// ===== 要素 =====
const recordBtn = document.getElementById('recordBtn');
const micIcon = document.getElementById('micIcon');
const btnText = document.getElementById('btnText');
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

const SpeechRecognitionImpl =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const CATEGORY_CONFIG = {
  tasks:     { label: '✅ タスク',       color: 'var(--c-tasks)' },
  shopping:  { label: '🛒 買い物',       color: 'var(--c-shopping)' },
  ideas:     { label: '💡 アイデア',     color: 'var(--c-ideas)' },
  reminders: { label: '⏰ リマインダー', color: 'var(--c-reminders)' },
  notes:     { label: '📝 メモ',         color: 'var(--c-notes)' },
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
  micIcon.textContent = '⏹️';
  btnText.textContent = '録音停止';
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
  micIcon.textContent = '⏳';
  btnText.textContent = '処理中...';
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
    resultEl.innerHTML = `<div class="glass-card memo-card">${memoBodyHTML(memo, { deletable: false })}</div>`;
    setStatus('完了！保存しました', 'success');
  } catch (err) {
    setStatus(`エラー: ${err.message}`, 'error');
  } finally {
    resetButton();
  }
}

function resetButton() {
  recordBtn.disabled = false;
  micIcon.textContent = '🎙️';
  btnText.textContent = '録音開始';
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

    const BARS = 28;
    const W = vizCanvas.width, H = vizCanvas.height;
    const gap = 6;
    const barW = (W - gap * (BARS - 1)) / BARS;
    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, '#8b5cf6');
    grad.addColorStop(1, '#f0abfc');

    const draw = () => {
      analyser.getByteFrequencyData(freq);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = grad;
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
  let html = '';

  if (!(opts && opts.hideHeader)) {
    html += `<div class="memo-title">${esc(o.title || '音声メモ')}</div>`;
    html += `<div class="memo-date">${formatDate(memo.ts)}</div>`;
  }
  if (o.summary) html += `<div class="memo-summary">${esc(o.summary)}</div>`;

  for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
    const items = cats[key];
    if (!items || items.length === 0) continue;

    html += `<div class="category-section" style="--cat-color:${config.color}">`;
    html += `<h4>${config.label}</h4><ul>`;
    items.forEach((item, idx) => {
      const due = item.due
        ? `<span class="due-chip">⏰ ${formatDue(item.due)}</span>`
        : '';
      html += `
        <li class="item-row${item.done ? ' done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''}
            data-id="${memo.id}" data-cat="${key}" data-idx="${idx}">
          <span class="item-text">${esc(item.text)}${due}</span>
        </li>`;
    });
    html += `</ul></div>`;
  }

  html += `
    <details class="transcription-detail">
      <summary>文字起こし全文</summary>
      <p>${esc(memo.transcription || '')}</p>
    </details>`;

  const hasTasks =
    (cats.tasks || []).length > 0 || (cats.reminders || []).length > 0;
  html += `<div class="memo-actions">`;
  if (hasTasks) {
    html += `<button class="pill-btn primary" data-action="todoist" data-id="${memo.id}">Todoistへ追加</button>`;
  }
  html += `<button class="pill-btn" data-action="share" data-id="${memo.id}">共有</button>`;
  if (opts && opts.deletable) {
    html += `<button class="pill-btn danger" data-action="delete" data-id="${memo.id}">削除</button>`;
  }
  html += `</div>`;
  return html;
}

function renderHistory() {
  if (memos.length === 0) {
    historyListEl.innerHTML = '';
    historyEmptyEl.classList.remove('hidden');
    return;
  }
  historyEmptyEl.classList.add('hidden');
  historyListEl.innerHTML = memos
    .map(
      (m) => `
      <div class="glass-card memo-card history-card" data-card="${m.id}">
        <div class="history-head" data-toggle="${m.id}">
          <div>
            <div class="memo-title">${esc((m.organized && m.organized.title) || '音声メモ')}</div>
            <div class="memo-date">${formatDate(m.ts)}</div>
          </div>
          <span class="chevron">▼</span>
        </div>
        <div class="history-body">${memoBodyHTML(m, { deletable: true, hideHeader: true })}</div>
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
  const memo = findMemo(btn.dataset.id);
  if (!memo) return;

  if (btn.dataset.action === 'share') shareMemo(memo);
  if (btn.dataset.action === 'todoist') addToTodoist(memo, btn);
  if (btn.dataset.action === 'delete') {
    if (confirm('このメモを削除しますか？')) {
      memos = memos.filter((m) => m.id !== memo.id);
      saveMemos(memos);
      renderHistory();
      toast('削除しました');
    }
  }
});

// ===== 共有 =====
async function shareMemo(memo) {
  const o = memo.organized || {};
  const cats = o.categories || {};
  let text = `📝 ${o.title || '音声メモ'}\n`;
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

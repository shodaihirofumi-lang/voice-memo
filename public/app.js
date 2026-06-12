const recordBtn = document.getElementById('recordBtn');
const micIcon = document.getElementById('micIcon');
const btnText = document.getElementById('btnText');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const liveEl = document.getElementById('live');
const liveFinalEl = document.getElementById('liveFinal');
const liveInterimEl = document.getElementById('liveInterim');
const resultsEl = document.getElementById('results');
const transcriptionTextEl = document.getElementById('transcriptionText');
const memoHeaderEl = document.getElementById('memoHeader');
const memoTitleEl = document.getElementById('memoTitle');
const memoSummaryEl = document.getElementById('memoSummary');
const categoriesEl = document.getElementById('categories');

const SpeechRecognitionImpl =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isRecording = false;
let finalText = '';
let timerInterval = null;
let seconds = 0;

const CATEGORY_CONFIG = {
  tasks:     { label: 'タスク',       icon: '✅' },
  shopping:  { label: '買い物',       icon: '🛒' },
  ideas:     { label: 'アイデア',     icon: '💡' },
  reminders: { label: 'リマインダー', icon: '⏰' },
  notes:     { label: 'メモ',         icon: '📝' },
};

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
      resetButton();
      setStatus('マイクへのアクセスを許可してください', 'error');
    }
    // 'no-speech' などは無視（onend の自動再開に任せる）
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
  resultsEl.classList.add('hidden');
  startTimer();
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    try { recognition.stop(); } catch {}
  }
  stopTimer();
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

    liveEl.classList.add('hidden');
    renderResults(data);
    setStatus('完了！', 'success');
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

function renderResults(data) {
  transcriptionTextEl.textContent = data.transcription;

  const { organized } = data;
  memoHeaderEl.classList.add('hidden');
  categoriesEl.innerHTML = '';

  if (organized) {
    if (organized.title || organized.summary) {
      memoTitleEl.textContent = organized.title || '';
      memoSummaryEl.textContent = organized.summary || '';
      memoHeaderEl.classList.remove('hidden');
    }

    const cats = organized.categories || {};
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      const items = cats[key];
      if (!items || items.length === 0) continue;

      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <h3>${config.icon} ${config.label}</h3>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      `;
      categoriesEl.appendChild(card);
    }
  }

  resultsEl.classList.remove('hidden');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

const recordBtn = document.getElementById('recordBtn');
const micIcon = document.getElementById('micIcon');
const btnText = document.getElementById('btnText');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const transcriptionTextEl = document.getElementById('transcriptionText');
const memoHeaderEl = document.getElementById('memoHeader');
const memoTitleEl = document.getElementById('memoTitle');
const memoSummaryEl = document.getElementById('memoSummary');
const categoriesEl = document.getElementById('categories');

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let timerInterval = null;
let seconds = 0;

const CATEGORY_CONFIG = {
  tasks:     { label: 'タスク',       icon: '✅' },
  shopping:  { label: '買い物',       icon: '🛒' },
  ideas:     { label: 'アイデア',     icon: '💡' },
  reminders: { label: 'リマインダー', icon: '⏰' },
  notes:     { label: 'メモ',         icon: '📝' },
};

recordBtn.addEventListener('click', toggleRecording);

async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      processAudio();
    };

    mediaRecorder.start(100);
    isRecording = true;

    recordBtn.classList.add('recording');
    micIcon.textContent = '⏹️';
    btnText.textContent = '録音停止';
    setStatus('録音中...', 'recording');
    resultsEl.classList.add('hidden');
    startTimer();
  } catch (err) {
    setStatus('マイクへのアクセスを許可してください', 'error');
  }
}

function stopRecording() {
  if (!mediaRecorder || !isRecording) return;
  mediaRecorder.stop();
  isRecording = false;
  stopTimer();
  recordBtn.classList.remove('recording');
  recordBtn.disabled = true;
  micIcon.textContent = '⏳';
  btnText.textContent = '処理中...';
  setStatus('AIが分析中です...', 'processing');
}

async function processAudio() {
  try {
    const mimeType = (audioChunks[0] && audioChunks[0].type) || 'audio/webm';
    const audioBlob = new Blob(audioChunks, { type: mimeType });

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');

    const response = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'サーバーエラー');
    if (!data.transcription) {
      setStatus('音声が検出されませんでした。もう一度お試しください。', 'error');
      return;
    }

    renderResults(data);
    setStatus('完了！', 'success');
  } catch (err) {
    setStatus(`エラー: ${err.message}`, 'error');
  } finally {
    recordBtn.disabled = false;
    micIcon.textContent = '🎙️';
    btnText.textContent = '録音開始';
  }
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
  return str
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

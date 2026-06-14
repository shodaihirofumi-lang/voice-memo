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
const chatInput = document.getElementById('chatInput');
const chatBtn = document.getElementById('chatBtn');
const chatResultEl = document.getElementById('chatResult');
const pendingBtn = document.getElementById('pendingBtn');
const pendingResultEl = document.getElementById('pendingResult');
const todayTasksEl = document.getElementById('todayTasks');


const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
const STOP_SVG = '<svg viewBox="0 0 24 24" fill="#ef4444"><rect x="7" y="7" width="10" height="10" rx="2.5"/></svg>';
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>';
const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

const CATEGORY_CONFIG = {
  tasks:     { label: 'タスク',       color: '#4ade80' },
  shopping:  { label: '買い物',       color: '#fbbf24' },
  ideas:     { label: 'アイデア',     color: '#c084fc' },
  reminders: { label: 'リマインダー', color: '#60a5fa' },
  notes:     { label: 'メモ',         color: '#71717a' },
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const GAME_KEY = 'voiceMemoGame.v1';
const LEVELS = [
  { level: 1,  xp: 0,      title: '見習いメモ屋' },
  { level: 2,  xp: 100,    title: 'タスク見習い' },
  { level: 3,  xp: 300,    title: 'メモの達人' },
  { level: 4,  xp: 600,    title: 'タスク職人' },
  { level: 5,  xp: 1100,   title: 'メモスター' },
  { level: 6,  xp: 2000,   title: 'タスク忍者' },
  { level: 7,  xp: 3500,   title: 'メモの鬼' },
  { level: 8,  xp: 6000,   title: 'タスクマスター' },
  { level: 9,  xp: 10000,  title: '伝説のメモリスト' },
  { level: 10, xp: 20000,  title: '神' },
];

const BADGES = [
  { id: 'first_memo',  icon: '🎙️', label: '初録音',     desc: '初めてメモを保存',           check: (g) => (g.memoCount || 0) >= 1 },
  { id: 'task_10',     icon: '✅', label: '10タスク',    desc: 'タスクを10個完了',            check: (g) => (g.totalCompleted || 0) >= 10 },
  { id: 'task_50',     icon: '💪', label: '50タスク',    desc: 'タスクを50個完了',            check: (g) => (g.totalCompleted || 0) >= 50 },
  { id: 'task_100',    icon: '🏆', label: '100タスク',   desc: 'タスクを100個完了',           check: (g) => (g.totalCompleted || 0) >= 100 },
  { id: 'streak_3',    icon: '🔥', label: '3日連続',     desc: '3日連続でタスクを完了',       check: (g) => (g.streak || 0) >= 3 },
  { id: 'streak_7',    icon: '🌟', label: '1週間連続',   desc: '7日連続でタスクを完了',       check: (g) => (g.streak || 0) >= 7 },
  { id: 'streak_30',   icon: '👑', label: '1ヶ月連続',   desc: '30日連続でタスクを完了',      check: (g) => (g.streak || 0) >= 30 },
  { id: 'urgent_5',    icon: '⚡', label: '緊急5連撃',   desc: '緊急タスクを5個撃破',         check: (g) => (g.urgentCompleted || 0) >= 5 },
  { id: 'urgent_20',   icon: '💀', label: '緊急20連撃',  desc: '緊急タスクを20個撃破',        check: (g) => (g.urgentCompleted || 0) >= 20 },
  { id: 'combo_5',     icon: '🎯', label: 'コンボ王',    desc: 'コンボ×5を達成',              check: (g) => (g.maxCombo || 0) >= 5 },
  { id: 'level_5',     icon: '⭐', label: 'Lv.5到達',    desc: 'レベル5に到達',               check: (g) => getLevelInfo(g.xp).cur.level >= 5 },
  { id: 'level_max',   icon: '🌠', label: '神',          desc: 'レベル10（最大）に到達',      check: (g) => getLevelInfo(g.xp).cur.level >= 10 },
  { id: 'lucky',       icon: '🎰', label: 'ラッキー',    desc: 'ガチャで大当たり（XP×3）',    check: (g) => !!g.gotJackpot },
  { id: 'night_owl',   icon: '🦉', label: '夜型',        desc: '深夜（23時以降）にタスク完了',check: (g) => !!g.nightOwl },
  { id: 'early_bird',  icon: '🌅', label: '朝型',        desc: '早朝（6時前）にタスク完了',   check: (g) => !!g.earlyBird },
  { id: 'slayer_10',   icon: '🗡️', label: '10体撃破',    desc: 'モンスターを10体倒す',        check: (g) => (g.enemiesDefeated || 0) >= 10 },
  { id: 'slayer_50',   icon: '🏰', label: '50体撃破',    desc: 'モンスターを50体倒す',        check: (g) => (g.enemiesDefeated || 0) >= 50 },
  { id: 'boss_1',      icon: '⚔️', label: 'ボスハンター',desc: 'ボスを初撃破',                check: (g) => (g.bossDefeats || 0) >= 1 },
  { id: 'boss_5',      icon: '🛡️', label: 'ボスマスター',desc: 'ボスを5体撃破',              check: (g) => (g.bossDefeats || 0) >= 5 },
];

// 雑魚モンスター（5体ごとのボス以外で順番に出現）
const MONSTERS = [
  { name: 'スライム', glow: '#3b82f6', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 9 C17 9 11 23 10 31 C9.4 36.5 16 39 24 39 C32 39 38.6 36.5 38 31 C37 23 31 9 24 9 Z" fill="#3b82f6"/><path d="M14 34 Q24 38 34 34" stroke="#1e40af" stroke-width="1.4" fill="none" opacity="0.5"/><ellipse cx="19.5" cy="27" rx="2.6" ry="3" fill="#fff"/><ellipse cx="28.5" cy="27" rx="2.6" ry="3" fill="#fff"/><circle cx="19.5" cy="28" r="1.3" fill="#0b1e3f"/><circle cx="28.5" cy="28" r="1.3" fill="#0b1e3f"/><path d="M20 33 Q24 36 28 33" stroke="#0b1e3f" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>` },
  { name: 'あかスライム', glow: '#ef4444', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 9 C17 9 11 23 10 31 C9.4 36.5 16 39 24 39 C32 39 38.6 36.5 38 31 C37 23 31 9 24 9 Z" fill="#ef4444"/><path d="M16 25 l4 1.6 M32 25 l-4 1.6" stroke="#7f1d1d" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="19.5" cy="28.5" rx="2.4" ry="2.8" fill="#fff"/><ellipse cx="28.5" cy="28.5" rx="2.4" ry="2.8" fill="#fff"/><circle cx="19.5" cy="29.2" r="1.2" fill="#3f0a0a"/><circle cx="28.5" cy="29.2" r="1.2" fill="#3f0a0a"/><path d="M20 34.5 Q24 32.5 28 34.5" stroke="#7f1d1d" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>` },
  { name: 'こうもり', glow: '#8b5cf6', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M5 19 L17 23 L14 31 Z" fill="#6d28d9"/><path d="M43 19 L31 23 L34 31 Z" fill="#6d28d9"/><circle cx="24" cy="26" r="10" fill="#8b5cf6"/><path d="M18 18 l2 5 M30 18 l-2 5" stroke="#8b5cf6" stroke-width="3.4" stroke-linecap="round"/><circle cx="20.5" cy="25" r="1.9" fill="#fff"/><circle cx="27.5" cy="25" r="1.9" fill="#fff"/><circle cx="20.5" cy="25.4" r="0.9" fill="#2e1065"/><circle cx="27.5" cy="25.4" r="0.9" fill="#2e1065"/><path d="M22 30 l1 1.6 1-1.6 1 1.6 1-1.6" stroke="#fff" stroke-width="1" fill="none"/></svg>` },
  { name: 'がいこつ', glow: '#e2e8f0', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 8 C14 8 9 15 9 23 C9 28 12 31 15 32 L15 37 C15 38.2 16 39 18 39 L30 39 C32 39 33 38.2 33 37 L33 32 C36 31 39 28 39 23 C39 15 34 8 24 8 Z" fill="#f1f5f9"/><circle cx="18" cy="23" r="4.2" fill="#1e293b"/><circle cx="30" cy="23" r="4.2" fill="#1e293b"/><circle cx="18" cy="22.5" r="1.4" fill="#f87171"/><circle cx="30" cy="22.5" r="1.4" fill="#f87171"/><path d="M24 28 l-2 4 4 0 Z" fill="#1e293b"/><path d="M19 36 v3 M24 36 v3 M29 36 v3" stroke="#94a3b8" stroke-width="1.4"/></svg>` },
  { name: 'おばけ', glow: '#22d3ee', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M11 28 a13 13 0 0 1 26 0 V41 l-4-3 -4 3 -4-3 -4 3 -3-2 Z" fill="#a5f3fc"/><circle cx="19" cy="25" r="2.8" fill="#0e7490"/><circle cx="29" cy="25" r="2.8" fill="#0e7490"/><ellipse cx="24" cy="31" rx="2.2" ry="2.9" fill="#0e7490"/></svg>` },
  { name: 'キノコ', glow: '#f43f5e', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="26" width="12" height="13" rx="5" fill="#fde68a"/><circle cx="22" cy="33" r="1.4" fill="#78350f"/><circle cx="26.5" cy="33" r="1.4" fill="#78350f"/><path d="M21 37 Q24 39 27 37" stroke="#78350f" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M9 27 C9 16 16 10 24 10 C32 10 39 16 39 27 C39 28.2 38 29 36 29 L12 29 C10 29 9 28.2 9 27 Z" fill="#f43f5e"/><circle cx="17" cy="20" r="2.4" fill="#fecdd3"/><circle cx="27.5" cy="18" r="3" fill="#fecdd3"/><circle cx="32" cy="24" r="2" fill="#fecdd3"/></svg>` },
];

// ボス（5体ごとに出現、HP・報酬とも大きい）
const BOSS_ENEMIES = [
  { name: 'ドラゴン', glow: '#16a34a', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M10 12 L14 19 M38 12 L34 19" stroke="#166534" stroke-width="3.5" stroke-linecap="round"/><path d="M24 6 L20 12 L28 12 Z" fill="#15803d"/><circle cx="24" cy="26" r="16" fill="#16a34a"/><path d="M8 25 q-4 2 -2 6 q3 -1 4 -3 Z M40 25 q4 2 2 6 q-3 -1 -4 -3 Z" fill="#15803d"/><ellipse cx="24" cy="33" rx="10" ry="7" fill="#15803d"/><circle cx="20.5" cy="34" r="1.3" fill="#052e16"/><circle cx="27.5" cy="34" r="1.3" fill="#052e16"/><path d="M17 38 l2-2 2 2 2-2 2 2 2-2 2 2" stroke="#fff" stroke-width="1.3" fill="none"/><ellipse cx="18" cy="23" rx="3" ry="3.4" fill="#fff"/><ellipse cx="30" cy="23" rx="3" ry="3.4" fill="#fff"/><circle cx="18" cy="23.5" r="1.4" fill="#b91c1c"/><circle cx="30" cy="23.5" r="1.4" fill="#b91c1c"/></svg>` },
  { name: 'まおう', glow: '#7c3aed', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M9 16 C7 8 12 5 14 5 C13 10 17 13 18 16 Z" fill="#5b21b6"/><path d="M39 16 C41 8 36 5 34 5 C35 10 31 13 30 16 Z" fill="#5b21b6"/><circle cx="24" cy="27" r="16" fill="#7c3aed"/><path d="M14 21 L21 24 M34 21 L27 24" stroke="#2e1065" stroke-width="2.4" stroke-linecap="round"/><path d="M17 25 l4.5 1.6 -3.5 2.6 Z" fill="#fde047"/><path d="M31 25 l-4.5 1.6 3.5 2.6 Z" fill="#fde047"/><path d="M16 34 Q24 40 32 34 Q28 33 24 33 Q20 33 16 34 Z" fill="#2e1065"/><path d="M19.5 34 l1.4 3 1.4-3 M25.7 34 l1.4 3 1.4-3" fill="#fff"/></svg>` },
  { name: 'ゴーレム', glow: '#a8a29e', svg:
    `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="11" y="12" width="26" height="26" rx="5" fill="#78716c"/><rect x="14" y="8" width="20" height="6" rx="2" fill="#57534e"/><rect x="15.5" y="22" width="7.5" height="5" rx="1.5" fill="#1c1917"/><rect x="25" y="22" width="7.5" height="5" rx="1.5" fill="#1c1917"/><circle cx="19.5" cy="24.5" r="1.5" fill="#fbbf24"/><circle cx="28.5" cy="24.5" r="1.5" fill="#fbbf24"/><path d="M17 32 h14" stroke="#1c1917" stroke-width="2.4" stroke-linecap="round"/><path d="M13 18 l3 0 M32 30 l3 0 M24 14 l0 -3" stroke="#57534e" stroke-width="1.6"/></svg>` },
];

const DAILY_MISSIONS = [
  { type: 'tasks_3',  label: 'タスクを3個完了する',     target: 3, bonusXP: 50,  key: 'tasksDone' },
  { type: 'tasks_5',  label: 'タスクを5個完了する',     target: 5, bonusXP: 100, key: 'tasksDone' },
  { type: 'urgent_1', label: '緊急タスクを1個撃破する', target: 1, bonusXP: 80,  key: 'urgentDone' },
  { type: 'combo_3',  label: 'コンボ×3を達成する',      target: 1, bonusXP: 60,  key: 'comboDone' },
  { type: 'record_1', label: '音声メモを1件録る',        target: 1, bonusXP: 40,  key: 'memosDone' },
];

// ===== ゲーム =====
function loadGameStats() {
  const defaults = { xp: 0, streak: 0, lastDate: null, totalCompleted: 0,
    maxStreak: 0, urgentCompleted: 0, weekdayStats: [0,0,0,0,0,0,0],
    badges: [], dailyMission: null, maxCombo: 0, memoCount: 0,
    gotJackpot: false, nightOwl: false, earlyBird: false };
  try {
    const saved = JSON.parse(localStorage.getItem(GAME_KEY));
    return saved ? { ...defaults, ...saved } : defaults;
  } catch { return defaults; }
}
function saveGameStats(s) { localStorage.setItem(GAME_KEY, JSON.stringify(s)); }

function getLevelInfo(xp) {
  let cur = LEVELS[0], nxt = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { cur = LEVELS[i]; nxt = LEVELS[i + 1] || null; break; }
  }
  return { cur, nxt };
}

function prevDayISO(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

let gameStats = loadGameStats();
let comboCount = 0, comboTimer = null, comboPopupTimer = null;

// ===== 効果音（Web Audioで生成） =====
let soundEnabled = localStorage.getItem('voiceMemoSound') !== '0';
let hapticEnabled = localStorage.getItem('voiceMemoHaptic') !== '0';
let sfxCtx = null;
function getSfxCtx() {
  try {
    if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sfxCtx.state === 'suspended') sfxCtx.resume().catch(() => {});
    return sfxCtx;
  } catch { return null; }
}
function beep(ctx, freq, start, dur, type = 'sine', gain = 0.14) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}
function playSound(kind) {
  if (!soundEnabled) return;
  const ctx = getSfxCtx();
  if (!ctx) return;
  try {
    if (kind === 'complete') { beep(ctx, 660, 0, 0.12); beep(ctx, 880, 0.07, 0.14); }
    else if (kind === 'combo') { beep(ctx, 620 + Math.min(comboCount, 8) * 70, 0, 0.11, 'square', 0.12); }
    else if (kind === 'levelup') { [523, 659, 784, 1047].forEach((f, i) => beep(ctx, f, i * 0.1, 0.2, 'triangle', 0.18)); }
    else if (kind === 'gacha') { [880, 1175, 1568].forEach((f, i) => beep(ctx, f, i * 0.06, 0.13, 'sine', 0.14)); }
    else if (kind === 'boss') { [392, 523, 659, 784, 1047].forEach((f, i) => beep(ctx, f, i * 0.12, 0.28, 'sawtooth', 0.16)); }
  } catch {}
}
function haptic(pattern) {
  if (!hapticEnabled) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

// ===== バトル進行（ドラクエ式：雑魚を倒すと次が出現、5体ごとにボス） =====
function makeEnemy(stage) {
  if (stage % 5 === 0) {
    const idx = (Math.floor(stage / 5) - 1) % BOSS_ENEMIES.length;
    const maxHp = 16 + stage * 2;
    return { stage, isBoss: true, idx, hp: maxHp, maxHp };
  }
  const idx = (stage - 1) % MONSTERS.length;
  const maxHp = 4 + Math.floor(stage / 2);
  return { stage, isBoss: false, idx, hp: maxHp, maxHp };
}
function getQuest() {
  if (!gameStats.quest || typeof gameStats.quest.stage !== 'number') {
    gameStats.quest = makeEnemy(1);
    saveGameStats(gameStats);
  }
  return gameStats.quest;
}
function attackEnemy(item) {
  const q = getQuest();
  const bonus = taskTypeBonus(item.text);
  const dmg = (item.priority === 'high' ? 3 : item.priority === 'medium' ? 2 : 1) * bonus.dmgMult;
  q.hp = Math.max(0, q.hp - dmg);
  if (q.hp === 0) {
    const e = q.isBoss ? BOSS_ENEMIES[q.idx] : MONSTERS[q.idx];
    const reward = q.isBoss ? (80 + q.stage * 6) : (8 + q.stage);
    gameStats.xp += reward;
    gameStats.enemiesDefeated = (gameStats.enemiesDefeated || 0) + 1;
    if (q.isBoss) gameStats.bossDefeats = (gameStats.bossDefeats || 0) + 1;
    // モンスター図鑑：種類ごとの撃破数を記録
    const dexKey = (q.isBoss ? 'b' : 'm') + q.idx;
    gameStats.monsterDex = gameStats.monsterDex || {};
    gameStats.monsterDex[dexKey] = (gameStats.monsterDex[dexKey] || 0) + 1;
    gameStats.quest = makeEnemy(q.stage + 1);
    saveGameStats(gameStats);
    playSound(q.isBoss ? 'boss' : 'complete');
    haptic(q.isBoss ? [60, 40, 60, 40, 140] : [35, 25, 55]);
    if (q.isBoss) showConfetti(true);
    setTimeout(() => toast(`${q.isBoss ? '⚔️ ボス' : '🗡'} ${e.name} を たおした！ +${reward} XP`), 480);
  } else {
    saveGameStats(gameStats);
  }
  renderBattle();
  showAttackEffect(dmg, bonus);
}

// タスク完了時の攻撃エフェクト（斬撃・敵ゆれ・ダメージ数字）
function showAttackEffect(dmg, bonus) {
  const card = document.querySelector('#bossCard .battle-card');
  if (!card) return;
  card.classList.remove('slash');
  void card.offsetWidth;
  card.classList.add('slash');
  const avatar = card.querySelector('.battle-avatar');
  if (avatar) { avatar.classList.remove('hit'); void avatar.offsetWidth; avatar.classList.add('hit'); }
  const big = dmg >= 8 || (bonus && bonus.type === 'work');
  const el = document.createElement('div');
  el.className = 'dmg-pop' + (bonus && bonus.type !== 'normal' ? ' ' + bonus.type : '') + (big ? ' big' : '');
  el.textContent = '-' + dmg;
  card.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}
function renderBattle() {
  const el = document.getElementById('bossCard');
  if (!el) return;
  const q = getQuest();
  const e = q.isBoss ? BOSS_ENEMIES[q.idx] : MONSTERS[q.idx];
  const pct = Math.round((q.hp / q.maxHp) * 100);
  const tag = q.isBoss
    ? `<span class="battle-tag boss">★BOSS★</span>`
    : `<span class="battle-tag">${q.stage}体目</span>`;
  el.innerHTML = `<div class="glass-card battle-card${q.isBoss ? ' boss' : ''}">
    <div class="battle-avatar" style="--enemy-glow:${e.glow}">${e.svg}</div>
    <div class="battle-info">
      <div class="battle-name">${tag}${esc(e.name)}</div>
      <div class="boss-hpbar"><div class="boss-hpfill" style="width:${pct}%"></div></div>
      <div class="boss-hptext">HP ${q.hp}/${q.maxHp}　タスク完了でこうげき！</div>
    </div>
  </div>`;
}

function renderGameSettings() {
  const el = document.getElementById('gameSettings');
  if (!el) return;
  el.innerHTML = `<div class="glass-card settings-card">
    <h3 class="card-label">ゲーム設定</h3>
    <div class="toggle-row"><span>効果音</span>
      <button class="toggle-btn${soundEnabled ? ' on' : ''}" data-toggle-game="sound">${soundEnabled ? 'ON' : 'OFF'}</button></div>
    <div class="toggle-row"><span>バイブ（振動）</span>
      <button class="toggle-btn${hapticEnabled ? ' on' : ''}" data-toggle-game="haptic">${hapticEnabled ? 'ON' : 'OFF'}</button></div>
    <div class="toggle-row"><span>締め切り通知</span>
      <button class="toggle-btn${notifyEnabled ? ' on' : ''}" data-toggle-game="notify">${notifyEnabled ? 'ON' : 'OFF'}</button></div>
  </div>`;
}

// ===== テーマ（着せ替え） =====
const THEMES = [
  { id: 'default', name: 'スタンダード', level: 1,  accent: '#fbbf24', accent2: '#f97316' },
  { id: 'forest',  name: 'フォレスト',   level: 3,  accent: '#4ade80', accent2: '#16a34a' },
  { id: 'ocean',   name: 'オーシャン',   level: 5,  accent: '#38bdf8', accent2: '#2563eb' },
  { id: 'sunset',  name: 'サンセット',   level: 7,  accent: '#fb7185', accent2: '#f59e0b' },
  { id: 'legend',  name: '伝説の勇者',   level: 10, accent: '#fcd34d', accent2: '#a855f7' },
];
let currentTheme = localStorage.getItem('voiceMemoTheme') || 'default';
function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  document.documentElement.style.setProperty('--accent', t.accent);
  document.documentElement.style.setProperty('--accent2', t.accent2);
  currentTheme = t.id;
}
function renderThemes() {
  const el = document.getElementById('themeSection');
  if (!el) return;
  const lvl = getLevelInfo(gameStats.xp).cur.level;
  el.innerHTML = `<div class="glass-card settings-card">
    <h3 class="card-label">着せ替え（テーマ）</h3>
    <div class="theme-grid">
      ${THEMES.map((t) => {
        const unlocked = lvl >= t.level;
        const active = currentTheme === t.id;
        return `<button class="theme-item${active ? ' active' : ''}${unlocked ? '' : ' locked'}" data-theme-id="${t.id}"${unlocked ? '' : ' disabled'}>
          <span class="theme-swatch" style="background:linear-gradient(135deg,${t.accent},${t.accent2})"></span>
          <span class="theme-name">${unlocked ? esc(t.name) : 'Lv.' + t.level}</span>
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

// ===== モンスター図鑑 =====
function renderMonsterDex() {
  const el = document.getElementById('monsterDexSection');
  if (!el) return;
  const dex = gameStats.monsterDex || {};
  let seen = 0;
  MONSTERS.forEach((_, i) => { if (dex['m' + i] > 0) seen++; });
  BOSS_ENEMIES.forEach((_, i) => { if (dex['b' + i] > 0) seen++; });
  const total = MONSTERS.length + BOSS_ENEMIES.length;
  const cell = (e, key, isBoss) => {
    const count = dex[key] || 0;
    const got = count > 0;
    return `<div class="dex-item${got ? '' : ' locked'}${isBoss ? ' boss' : ''}">
      <div class="dex-icon">${got ? e.svg : '<span class="dex-q">？</span>'}</div>
      <span class="dex-name">${got ? esc(e.name) : '？？？'}</span>
      <span class="dex-count">${got ? '×' + count : (isBoss ? 'BOSS' : '未発見')}</span>
    </div>`;
  };
  el.innerHTML = `<div class="glass-card settings-card">
    <h3 class="card-label">モンスター図鑑（${seen}/${total}）</h3>
    <div class="dex-grid">
      ${MONSTERS.map((e, i) => cell(e, 'm' + i, false)).join('')}
      ${BOSS_ENEMIES.map((e, i) => cell(e, 'b' + i, true)).join('')}
    </div>
  </div>`;
}

// ===== 活動カレンダー =====
function renderActivityCalendar() {
  const el = document.getElementById('calendarSection');
  if (!el) return;
  const log = gameStats.dailyLog || {};
  const base = new Date();
  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ iso, count: log[iso] || 0, isToday: i === 0 });
  }
  const lv = (c) => c === 0 ? 0 : c <= 1 ? 1 : c <= 3 ? 2 : c <= 6 ? 3 : 4;
  const grid = days.map((d) => `<div class="cal-cell lv${lv(d.count)}${d.isToday ? ' today' : ''}" title="${d.iso}：${d.count}件"></div>`).join('');
  const active = days.filter((d) => d.count > 0).length;
  el.innerHTML = `<div class="glass-card settings-card">
    <h3 class="card-label">活動カレンダー（直近5週・${active}日達成）</h3>
    <div class="cal-grid">${grid}</div>
    <div class="cal-legend"><span>少</span><span class="cal-cell lv0"></span><span class="cal-cell lv1"></span><span class="cal-cell lv2"></span><span class="cal-cell lv3"></span><span class="cal-cell lv4"></span><span>多</span></div>
  </div>`;
}

// ===== 今日のクエスト（緊急度上位3つ） =====
function renderDailyQuest() {
  const el = document.getElementById('questSection');
  if (!el) return;
  const today = todayISO();
  const cand = [];
  for (const memo of memos) {
    const cats = (memo.organized && memo.organized.categories) || {};
    for (const key of ['tasks', 'reminders']) {
      (cats[key] || []).forEach((item, idx) => {
        if (item.done) return;
        let score = 0;
        if (item.due && item.due < today) score += 100;
        else if (item.due === today) score += 80;
        else if (item.due) score += 40;
        if (item.priority === 'high') score += 30;
        else if (item.priority === 'medium') score += 15;
        if (taskTypeBonus(item.text).type !== 'normal') score += 5;
        cand.push({ memoId: memo.id, cat: key, idx, text: item.text, due: item.due || null, priority: item.priority || null, score });
      });
    }
  }
  if (cand.length === 0) { el.innerHTML = ''; return; }
  cand.sort((a, b) => b.score - a.score);
  const rows = cand.slice(0, 3).map((t) => {
    const pri = t.priority === 'high' ? '<span class="priority-badge high">急</span>' : t.priority === 'medium' ? '<span class="priority-badge medium">中</span>' : '';
    const due = t.due ? `<span class="today-task-due${t.due < today ? ' overdue' : t.due === today ? ' today-due' : ''}">${formatDue(t.due)}${t.due < today ? ' 期限切れ' : t.due === today ? ' 今日' : ''}</span>` : '';
    const rep = recurringType(t.text) ? '🔁 ' : '';
    return `<div class="today-task-row">
      <input type="checkbox" data-id="${t.memoId}" data-cat="${t.cat}" data-idx="${t.idx}">
      <span class="today-task-body">${pri}<span class="today-task-text">${rep}${esc(t.text)}</span>${due}</span>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="glass-card quest-card">
    <h3 class="card-label">⭐ 今日のクエスト</h3>
    <p class="quest-sub">まずはこの${Math.min(3, cand.length)}つを倒そう</p>
    ${rows}
  </div>`;
}

// ===== 繰り返しタスク =====
function recurringType(text) {
  const t = String(text || '');
  if (/毎日|毎朝|毎晩|毎ばん/.test(t)) return 'daily';
  if (/毎週/.test(t)) return 'weekly';
  if (/毎月/.test(t)) return 'monthly';
  return null;
}
function nextDueISO(rep) {
  const d = new Date();
  if (rep === 'weekly') d.setDate(d.getDate() + 7);
  else if (rep === 'monthly') d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ===== 締め切り通知 =====
let notifyEnabled = localStorage.getItem('voiceMemoNotify') === '1';
function checkDueNotifications() {
  if (!notifyEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  const today = todayISO();
  if (gameStats.lastNotifyDate === today) return;
  let due = 0;
  for (const memo of memos) {
    const cats = (memo.organized && memo.organized.categories) || {};
    for (const key of ['tasks', 'reminders']) {
      (cats[key] || []).forEach((item) => { if (!item.done && item.due && item.due <= today) due++; });
    }
  }
  if (due > 0) {
    gameStats.lastNotifyDate = today;
    saveGameStats(gameStats);
    try { new Notification('声でメモ', { body: `期限が来ているタスクが ${due}件 あります`, icon: 'icons/icon-192.png' }); } catch {}
  }
}

function renderGameStats() {
  const el = document.getElementById('gameStats');
  if (!el) return;
  const { cur, nxt } = getLevelInfo(gameStats.xp);
  const pct = nxt ? Math.min(100, Math.round(((gameStats.xp - cur.xp) / (nxt.xp - cur.xp)) * 100)) : 100;
  const streak = gameStats.streak >= 2 ? `<span class="gs-streak">🔥${gameStats.streak}</span>` : '';
  el.innerHTML = `<div class="gs-row"><span class="gs-title">${cur.title}</span><span class="gs-level">Lv.${cur.level}</span>${streak}</div><div class="gs-bar"><div class="gs-bar-fill" style="width:${pct}%"></div></div>`;
}

function showConfetti(isUrgent) {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  const colors = isUrgent
    ? ['#ef4444', '#f97316', '#fbbf24', '#fff', '#4ade80']
    : ['#4ade80', '#60a5fa', '#c084fc', '#fbbf24'];
  const count = isUrgent ? 40 : 20;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'confetti-p';
      p.style.cssText = `left:${5 + Math.random() * 90}%;background:${colors[i % colors.length]};width:${5 + Math.random() * 5}px;height:${6 + Math.random() * 8}px;animation-duration:${0.8 + Math.random() * 0.7}s`;
      container.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }, i * 25);
  }
}

function showXpPopup(xp, isUrgent, leveledUp, bonus) {
  const special = bonus && bonus.type !== 'normal';
  const el = document.createElement('div');
  el.className = 'xp-popup' + (isUrgent ? ' urgent' : '') + (special ? ' ' + bonus.type : '');
  el.textContent = special ? `${bonus.label}！ +${xp} XP`
    : isUrgent ? `🎯 緊急タスク撃破！ +${xp} XP`
    : `+${xp} XP`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
  if (leveledUp) {
    const { cur } = getLevelInfo(gameStats.xp);
    setTimeout(() => toast(`🎉 レベルアップ！ ${cur.title} Lv.${cur.level} になった！`), 400);
  }
}

function showComboPopup(count) {
  const el = document.getElementById('comboPopup');
  if (!el) return;
  const labels = ['', '', 'コンボ ×2!', 'コンボ ×3!! 🔥', 'コンボ ×4!!! 🔥🔥', 'コンボ ×5!!!! ⚡'];
  el.textContent = labels[Math.min(count, 5)] || `コンボ ×${count}!!!! ⚡⚡`;
  el.className = 'combo-popup show';
  clearTimeout(comboPopupTimer);
  comboPopupTimer = setTimeout(() => el.classList.remove('show'), 1300);
}

function checkGacha() {
  if (Math.random() > 0.22) return null;
  const r = Math.random();
  if (r < 0.05) return { label: '🎰 JACKPOT！XP×3!!', mult: 3, rare: true };
  if (r < 0.30) return { label: '🎉 ラッキー！+50XP', bonus: 50 };
  return { label: '✨ ボーナス！+30XP', bonus: 30 };
}

function showGachaPopup(gacha) {
  const el = document.createElement('div');
  el.className = 'gacha-popup' + (gacha.rare ? ' jackpot' : '');
  el.textContent = gacha.label;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
  if (gacha.rare) showConfetti(true);
}

function checkAchievements(prevBadges) {
  if (!Array.isArray(gameStats.badges)) gameStats.badges = [];
  const newBadges = [];
  for (const b of BADGES) {
    if (!prevBadges.includes(b.id) && !gameStats.badges.includes(b.id) && b.check(gameStats)) {
      gameStats.badges.push(b.id);
      newBadges.push(b);
    }
  }
  if (newBadges.length > 0) {
    saveGameStats(gameStats);
    newBadges.forEach((b, i) => setTimeout(() => toast(`🏅 実績解除！「${b.label}」${b.icon}`), i * 700 + 300));
  }
}

function getDailyMission() {
  const today = todayISO();
  if (gameStats.dailyMission && gameStats.dailyMission.date === today) return gameStats.dailyMission;
  const m = DAILY_MISSIONS[Math.floor(Math.random() * DAILY_MISSIONS.length)];
  gameStats.dailyMission = { date: today, type: m.type, label: m.label, target: m.target, bonusXP: m.bonusXP, key: m.key, progress: 0, completed: false };
  saveGameStats(gameStats);
  return gameStats.dailyMission;
}

function updateDailyMission(key) {
  const dm = getDailyMission();
  if (dm.completed || dm.key !== key) return;
  dm.progress = Math.min(dm.progress + 1, dm.target);
  if (dm.progress >= dm.target) {
    dm.completed = true;
    gameStats.xp += dm.bonusXP;
    saveGameStats(gameStats);
    renderGameStats();
    renderDailyMission();
    setTimeout(() => toast(`🎯 デイリーミッション達成！+${dm.bonusXP} XP`), 500);
    showConfetti(false);
  } else {
    saveGameStats(gameStats);
    renderDailyMission();
  }
}

function renderDailyMission() {
  const el = document.getElementById('dailyMission');
  if (!el) return;
  const dm = getDailyMission();
  const pct = Math.round((dm.progress / dm.target) * 100);
  const done = dm.completed;
  el.innerHTML = `<div class="glass-card daily-mission-card${done ? ' done' : ''}">
    <div class="dm-head">
      <span class="card-label">デイリーミッション</span>
      ${done ? '<span class="dm-badge">✅ 達成！</span>' : `<span class="dm-xp">+${dm.bonusXP} XP</span>`}
    </div>
    <div class="dm-label">${esc(dm.label)}</div>
    <div class="dm-bar-wrap">
      <div class="dm-bar"><div class="dm-bar-fill" style="width:${pct}%"></div></div>
      <span class="dm-progress">${dm.progress}/${dm.target}</span>
    </div>
  </div>`;
}

function renderStats() {
  const el = document.getElementById('statsSection');
  if (!el) return;
  const ws = Array.isArray(gameStats.weekdayStats) ? gameStats.weekdayStats : [0,0,0,0,0,0,0];
  const maxW = Math.max(...ws, 1);
  el.innerHTML = `<div class="glass-card settings-card">
    <h3 class="card-label">あなたの記録</h3>
    <div class="stats-grid">
      <div class="stat-item"><span class="stat-num">${gameStats.totalCompleted || 0}</span><span class="stat-label">総完了タスク</span></div>
      <div class="stat-item"><span class="stat-num">${gameStats.xp || 0}</span><span class="stat-label">累計XP</span></div>
      <div class="stat-item"><span class="stat-num">${gameStats.streak || 0}</span><span class="stat-label">現在ストリーク</span></div>
      <div class="stat-item"><span class="stat-num">${gameStats.maxStreak || 0}</span><span class="stat-label">最長ストリーク</span></div>
      <div class="stat-item"><span class="stat-num">${gameStats.enemiesDefeated || 0}</span><span class="stat-label">倒した敵</span></div>
      <div class="stat-item"><span class="stat-num">${gameStats.bossDefeats || 0}</span><span class="stat-label">ボス撃破</span></div>
    </div>
    <div class="stats-week">
      <div class="stats-week-label">曜日別完了数</div>
      <div class="stats-bars">
        ${WEEKDAYS.map((d, i) => `<div class="stats-bar-col">
          <div class="stats-bar-fill${ws[i] === Math.max(...ws) && ws[i] > 0 ? ' best' : ''}" style="height:${Math.max(4, Math.round((ws[i] / maxW) * 48))}px"></div>
          <div class="stats-bar-day">${d}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderBadges() {
  const el = document.getElementById('badgesSection');
  if (!el) return;
  const unlocked = Array.isArray(gameStats.badges) ? gameStats.badges : [];
  el.innerHTML = `<div class="glass-card settings-card">
    <h3 class="card-label">実績バッジ（${unlocked.length}/${BADGES.length}）</h3>
    <div class="badge-grid">
      ${BADGES.map(b => {
        const got = unlocked.includes(b.id);
        return `<div class="badge-item${got ? '' : ' locked'}" title="${esc(b.desc)}">
          <span class="badge-icon">${got ? b.icon : '🔒'}</span>
          <span class="badge-label">${esc(b.label)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// 特別タスク：瞑想=XP3倍/ダメージ2倍、仕事=XP2倍/ダメージ5倍
function taskTypeBonus(text) {
  const t = String(text || '');
  if (/瞑想|めいそう|マインドフルネス|座禅|ヨガ/.test(t)) {
    return { type: 'meditation', xpMult: 3, dmgMult: 2, label: '🧘 瞑想ボーナス' };
  }
  if (/仕事|業務|会議|商談|営業|プレゼン|資料|打ち合わせ|打合せ|クライアント|取引先|納品|請求|報告|提案|案件|タスク管理|資料作成|メール対応/.test(t)) {
    return { type: 'work', xpMult: 2, dmgMult: 5, label: '💼 仕事ボーナス' };
  }
  return { type: 'normal', xpMult: 1, dmgMult: 1, label: '' };
}

function onTaskComplete(item) {
  comboCount++;
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => { comboCount = 0; }, 3000);
  if (comboCount > (gameStats.maxCombo || 0)) gameStats.maxCombo = comboCount;

  const bonus = taskTypeBonus(item.text);
  const baseXP = (item.priority === 'high' ? 50 : item.priority === 'medium' ? 20 : 10) * bonus.xpMult;
  const comboBonus = comboCount >= 5 ? 30 : comboCount >= 4 ? 20 : comboCount >= 3 ? 10 : comboCount >= 2 ? 5 : 0;

  const gacha = checkGacha();
  let gachaBonus = 0;
  if (gacha) {
    gachaBonus = gacha.mult ? baseXP * (gacha.mult - 1) : (gacha.bonus || 0);
    if (gacha.rare) gameStats.gotJackpot = true;
  }

  const totalXP = baseXP + comboBonus + gachaBonus;
  const prevInfo = getLevelInfo(gameStats.xp);
  const prevBadges = [...(gameStats.badges || [])];

  gameStats.xp += totalXP;
  gameStats.totalCompleted = (gameStats.totalCompleted || 0) + 1;
  if (item.priority === 'high') gameStats.urgentCompleted = (gameStats.urgentCompleted || 0) + 1;

  const hour = new Date().getHours();
  if (hour >= 23) gameStats.nightOwl = true;
  if (hour < 6) gameStats.earlyBird = true;

  const dow = new Date().getDay();
  if (!Array.isArray(gameStats.weekdayStats)) gameStats.weekdayStats = [0,0,0,0,0,0,0];
  gameStats.weekdayStats[dow]++;

  const today = todayISO();
  if (gameStats.lastDate !== today) {
    gameStats.streak = gameStats.lastDate === prevDayISO(today) ? (gameStats.streak || 0) + 1 : 1;
    gameStats.lastDate = today;
  }
  if ((gameStats.streak || 0) > (gameStats.maxStreak || 0)) gameStats.maxStreak = gameStats.streak;
  // 連続記録カレンダー：日別の完了数
  gameStats.dailyLog = gameStats.dailyLog || {};
  gameStats.dailyLog[today] = (gameStats.dailyLog[today] || 0) + 1;

  saveGameStats(gameStats);

  const newInfo = getLevelInfo(gameStats.xp);
  const isUrgent = item.priority === 'high';
  const leveledUp = newInfo.cur.level > prevInfo.cur.level;
  showConfetti(isUrgent || bonus.type === 'work');
  showXpPopup(totalXP, isUrgent, leveledUp, bonus);
  if (comboCount >= 2) showComboPopup(comboCount);
  if (gacha) setTimeout(() => showGachaPopup(gacha), 350);

  playSound('complete');
  haptic(isUrgent ? [25, 20, 45] : 22);
  if (comboCount >= 2) playSound('combo');
  if (gacha) setTimeout(() => playSound('gacha'), 350);
  if (leveledUp) { playSound('levelup'); haptic([40, 30, 90]); }

  attackEnemy(item);

  renderGameStats();
  checkAchievements(prevBadges);
  updateDailyMission('tasksDone');
  if (item.priority === 'high') updateDailyMission('urgentDone');
  if (comboCount >= 3) updateDailyMission('comboDone');
}

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
let categoryFilter = '';
let currentResultId = null;
let appendTargetId = null;
let pendingChatSave = null;
let pendingWeeklySave = null;

function findMemo(id) {
  return memos.find((m) => m.id === id);
}

// ===== ゴミ箱（localStorage）=====
const TRASH_KEY = 'voiceMemoTrash.v1';

function loadTrash() {
  try {
    return JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTrash(t) {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(t));
  } catch {}
}

let trash = loadTrash();

// ===== 画面切替 =====
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'record') { renderTodayTasks(); renderDailyMission(); renderDailyQuest(); renderBattle(); }
    if (btn.dataset.view === 'history') renderHistory();
    if (btn.dataset.view === 'settings') { renderTrash(); renderStats(); renderMonsterDex(); renderActivityCalendar(); renderThemes(); renderBadges(); renderGameSettings(); }
  });
});

// アプリ復帰（バックグラウンド→前面）時は必ずホーム（録音画面）に戻す
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || isRecording) return;
  const recNav = document.querySelector('.nav-btn[data-view="record"]');
  if (recNav && !recNav.classList.contains('active')) recNav.click();
});

// ===== 録音（Web AudioでPCMを拾いWAVで送信 → Groq/Gemini文字起こし）=====
// 一部端末(Android等)のWebM/OpusはWhisper側でうまくデコードできず誤認識(幻聴)が出るため、
// PCMを直接拾って確実に読めるWAVに変換して送る
let isRecording = false;
let timerInterval = null;
let seconds = 0;
let recStream = null, recCtx = null, recSource = null, recProcessor = null, recAnalyser = null;
let pcmChunks = [], pcmLen = 0, recRaf = null;

recordBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    setStatus('マイクへのアクセスを許可してください', 'error');
    return;
  }

  try {
    recStream = stream;
    pcmChunks = [];
    pcmLen = 0;
    recCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (recCtx.state === 'suspended') { try { await recCtx.resume(); } catch {} }
    recSource = recCtx.createMediaStreamSource(stream);
    recAnalyser = recCtx.createAnalyser();
    recAnalyser.fftSize = 128;
    recProcessor = recCtx.createScriptProcessor(4096, 1, 1);
    recProcessor.onaudioprocess = (e) => {
      const ch = e.inputBuffer.getChannelData(0);
      pcmChunks.push(new Float32Array(ch));
      pcmLen += ch.length;
      e.outputBuffer.getChannelData(0).fill(0); // 出力は無音（ハウリング防止）
    };
    recSource.connect(recAnalyser);
    recSource.connect(recProcessor);
    recProcessor.connect(recCtx.destination);
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    setStatus('録音を開始できませんでした', 'error');
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
  drawViz();
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  stopTimer();
  recordBtn.classList.remove('recording');
  if (recRaf) cancelAnimationFrame(recRaf);
  recRaf = null;
  vizCanvas.classList.remove('on');
  const vctx = vizCanvas.getContext('2d');
  vctx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);

  try { if (recProcessor) { recProcessor.disconnect(); recProcessor.onaudioprocess = null; } } catch {}
  try { if (recSource) recSource.disconnect(); } catch {}
  try { if (recAnalyser) recAnalyser.disconnect(); } catch {}

  const sampleRate = recCtx ? recCtx.sampleRate : 48000;
  const samples = mergePcm(pcmChunks, pcmLen);
  pcmChunks = [];
  pcmLen = 0;

  if (recStream) recStream.getTracks().forEach((t) => t.stop());
  if (recCtx) { recCtx.close().catch(() => {}); recCtx = null; }

  processRecording(samples, sampleRate);
}

// 波形（録音中のAnalyserから描画）
function drawViz() {
  try {
    const ctx = vizCanvas.getContext('2d');
    const freq = new Uint8Array(recAnalyser.frequencyBinCount);
    vizCanvas.classList.add('on');
    const BARS = 44, W = vizCanvas.width, H = vizCanvas.height, gap = 6;
    const barW = (W - gap * (BARS - 1)) / BARS;
    const draw = () => {
      recAnalyser.getByteFrequencyData(freq);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < BARS; i++) {
        const v = freq[Math.floor((i * freq.length) / BARS)] / 255;
        const h = Math.max(4, v * H * 0.95);
        const x = i * (barW + gap), y = (H - h) / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barW, h, barW / 2);
        else ctx.rect(x, y, barW, h);
        ctx.fill();
      }
      recRaf = requestAnimationFrame(draw);
    };
    draw();
  } catch {}
}

// PCMチャンクを1つのFloat32Arrayに結合
function mergePcm(chunks, total) {
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

// 16kHzへダウンサンプル（Whisper用。アップロードも軽くなる）
function downsampleTo16k(samples, inRate) {
  const outRate = 16000;
  if (inRate <= outRate) return { data: samples, rate: inRate };
  const ratio = inRate / outRate;
  const outLen = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = idx - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return { data: out, rate: outRate };
}

// Float32 PCM → 16bit PCM WAV(Blob)
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);   // PCM
  view.setUint16(22, 1, true);   // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// 録音停止後の処理：WAV化→文字起こし→整理
async function processRecording(samples, inRate) {
  if (!samples || samples.length < inRate * 0.4) {
    appendTargetId = null;
    resetButton();
    liveEl.classList.add('hidden');
    setStatus('音声が短すぎました。もう一度お試しください', 'error');
    return;
  }
  const { data, rate } = downsampleTo16k(samples, inRate);
  const blob = encodeWAV(data, rate);

  recordBtn.disabled = true;
  recordBtn.classList.add('processing');
  micIcon.innerHTML = MIC_SVG;
  liveEl.classList.add('hidden');
  setStatus('文字起こし中...', 'processing');

  const text = await transcribeAudio(blob, 'audio/wav');
  if (!text) { resetButton(); return; }

  liveFinalEl.textContent = text;
  liveInterimEl.textContent = '';
  liveEl.classList.remove('hidden');
  setStatus('AIが整理中です...', 'processing');

  if (appendTargetId) appendToMemo(appendTargetId, text);
  else organize(text);
}

async function transcribeAudio(blob, mimeType) {
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const r = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64, mimeType }),
    });
    const data = await r.json();

    if (!r.ok) {
      setStatus(`文字起こしエラー: ${data.error || 'エラー'}`, 'error');
      return null;
    }
    if (!data.text || !data.text.trim()) {
      setStatus('音声が認識できませんでした。もう一度お試しください', 'error');
      return null;
    }
    return data.text.trim();
  } catch (err) {
    setStatus(`エラー: ${err.message}`, 'error');
    return null;
  }
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

    const prevBadges = [...(gameStats.badges || [])];
    gameStats.memoCount = (gameStats.memoCount || 0) + 1;
    saveGameStats(gameStats);
    checkAchievements(prevBadges);
    updateDailyMission('memosDone');

    liveEl.classList.add('hidden');
    currentResultId = memo.id;
    renderResult();
    setStatus('完了！保存しました', 'success');
    return true;
  } catch (err) {
    setStatus(`エラー: ${err.message}`, 'error');
    return false;
  } finally {
    resetButton();
  }
}

// 既存メモへの追記（サーバーで統合）
async function appendToMemo(id, text) {
  const memo = findMemo(id);
  appendTargetId = null;
  if (!memo) return organize(text);

  try {
    const response = await fetch('/api/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, organized: memo.organized }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'サーバーエラー');

    memo.organized = data.organized;
    memo.transcription = (memo.transcription ? memo.transcription + '\n' : '') + text;
    saveMemos(memos);

    liveEl.classList.add('hidden');
    currentResultId = memo.id;
    rerenderAll();
    setStatus('追記しました', 'success');
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
        const pri = item.priority === 'high' ? '<span class="priority-badge high">急</span>'
          : item.priority === 'medium' ? '<span class="priority-badge medium">中</span>' : '';
        html += `
        <li class="item-row${item.done ? ' done' : ''}">
          <input type="checkbox" ${item.done ? 'checked' : ''}
            data-id="${memo.id}" data-cat="${key}" data-idx="${idx}">
          ${pri}<span class="item-text">${esc(item.text)}</span>${due}
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
    html += `<button class="pill-btn" data-action="append" data-id="${memo.id}">追記</button>`;
    html += `<button class="pill-btn" data-action="edit" data-id="${memo.id}">編集</button>`;
    html += `<button class="pill-btn" data-action="share" data-id="${memo.id}">共有</button>`;
    if (opts && opts.deletable) {
      html += `<button class="pill-btn danger" data-action="delete" data-id="${memo.id}">削除</button>`;
    }
  }
  html += `</div>`;
  return html;
}

function findRelatedMemos(memo, n = 2) {
  const words = memoSearchText(memo).split(/[\s、。！？\n]+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  return memos
    .filter((m) => m.id !== memo.id)
    .map((m) => {
      const text = memoSearchText(m);
      const score = words.filter((w) => text.includes(w)).length;
      return { m, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ m }) => m);
}

function relatedMemosHTML(related) {
  return `<div class="related-section">
    <div class="related-label">関連メモ</div>
    ${related.map((m) => `
      <button class="related-item" data-action="open-related" data-id="${m.id}">
        <span class="related-title">${esc((m.organized && m.organized.title) || '音声メモ')}</span>
        <span class="related-date">${formatDate(m.ts)}</span>
      </button>`).join('')}
  </div>`;
}

function renderResult() {
  const m = currentResultId ? findMemo(currentResultId) : null;
  if (!m) { resultEl.innerHTML = ''; return; }
  const related = findRelatedMemos(m);
  resultEl.innerHTML =
    `<div class="glass-card memo-card">${memoBodyHTML(m, { editing: editingId === m.id, deletable: true })}</div>`
    + (related.length ? relatedMemosHTML(related) : '');
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

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getPendingTasks() {
  const tasks = [];
  for (const memo of memos) {
    const cats = (memo.organized && memo.organized.categories) || {};
    for (const key of ['tasks', 'reminders']) {
      (cats[key] || []).forEach((item, idx) => {
        if (!item.done) {
          tasks.push({
            memoId: memo.id, cat: key, idx,
            text: item.text, due: item.due || null,
            priority: item.priority || null,
            memoTitle: (memo.organized && memo.organized.title) || '音声メモ',
            ts: memo.ts,
          });
        }
      });
    }
  }
  tasks.sort((a, b) => {
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    return (b.ts || 0) - (a.ts || 0);
  });
  return tasks;
}

function renderPendingTasks() {
  const tasks = getPendingTasks();
  const today = todayISO();
  const head = `<div class="weekly-head">
    <h3 class="card-label">未完了タスク${tasks.length ? `（${tasks.length}件）` : ''}</h3>
    <button class="del-item-btn" data-action="close-pending" aria-label="閉じる">${X_SVG}</button>
  </div>`;
  if (tasks.length === 0) {
    pendingResultEl.innerHTML = `<div class="glass-card">${head}<p class="pending-empty">未完了のタスクはありません</p></div>`;
    return;
  }
  const rows = tasks.map((t) => {
    const overdue = t.due && t.due < today;
    const isToday = t.due === today;
    const dueCls = overdue ? ' overdue' : isToday ? ' today-due' : '';
    const dueLabel = t.due ? `<span class="ptask-due${dueCls}">${formatDue(t.due)}${overdue ? ' 期限切れ' : isToday ? ' 今日' : ''}</span>` : '';
    const pri = t.priority === 'high' ? '<span class="priority-badge high">急</span>'
      : t.priority === 'medium' ? '<span class="priority-badge medium">中</span>' : '';
    return `<div class="ptask-row">
      <input type="checkbox" data-id="${t.memoId}" data-cat="${t.cat}" data-idx="${t.idx}">
      <div class="ptask-body">
        <div class="ptask-text">${pri}${esc(t.text)}</div>
        <div class="ptask-meta">${esc(t.memoTitle)}${dueLabel ? ' · ' + dueLabel : ''}</div>
      </div>
    </div>`;
  }).join('');
  pendingResultEl.innerHTML = `<div class="glass-card">${head}<div class="ptask-list">${rows}</div></div>`;
}

function renderTodayTasks() {
  const today = todayISO();
  const byCat = { tasks: [], reminders: [], shopping: [], ideas: [], notes: [] };
  let total = 0;
  for (const memo of memos) {
    const cats = (memo.organized && memo.organized.categories) || {};
    for (const key of Object.keys(byCat)) {
      (cats[key] || []).forEach((item, idx) => {
        if (!item.done) {
          byCat[key].push({ memoId: memo.id, cat: key, idx, text: item.text, due: item.due || null, priority: item.priority || null, ts: memo.ts || 0 });
          total++;
        }
      });
    }
  }
  if (total === 0) {
    todayTasksEl.classList.add('hidden');
    todayTasksEl.innerHTML = '';
    return;
  }
  // 期限ありを期限順で先頭に、期限なしは新しい順で後ろに（全件表示）
  const sortFn = (a, b) => {
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    return (b.ts || 0) - (a.ts || 0);
  };
  const rowHtml = (t) => {
    let dueLabel = '';
    if (t.due) {
      const overdue = t.due < today;
      const isToday = t.due === today;
      const dueCls = overdue ? ' overdue' : isToday ? ' today-due' : '';
      dueLabel = `<span class="today-task-due${dueCls}">${formatDue(t.due)}${overdue ? ' 期限切れ' : isToday ? ' 今日' : ''}</span>`;
    }
    const pri = t.priority === 'high' ? '<span class="priority-badge high">急</span>'
      : t.priority === 'medium' ? '<span class="priority-badge medium">中</span>' : '';
    const rep = recurringType(t.text) ? '🔁 ' : '';
    return `<div class="today-task-row">
      <input type="checkbox" data-id="${t.memoId}" data-cat="${t.cat}" data-idx="${t.idx}">
      <span class="today-task-body">${pri}<span class="today-task-text">${rep}${esc(t.text)}</span>${dueLabel}</span>
    </div>`;
  };
  const card = (label, list) => list.length
    ? `<div class="glass-card today-tasks-card"><h3 class="card-label">${label}（${list.length}）</h3>${list.sort(sortFn).map(rowHtml).join('')}</div>`
    : '';
  // タスクは仕事系とその他で分割、他カテゴリはそのまま
  const work = byCat.tasks.filter((t) => taskTypeBonus(t.text).type === 'work');
  const otherTasks = byCat.tasks.filter((t) => taskTypeBonus(t.text).type !== 'work');
  todayTasksEl.classList.remove('hidden');
  todayTasksEl.innerHTML =
    card('💼 仕事', work) +
    card('🗒 タスク', otherTasks) +
    card('🔔 リマインダー', byCat.reminders) +
    card('🛒 買い物', byCat.shopping) +
    card('💡 アイデア', byCat.ideas) +
    card('📝 メモ', byCat.notes);
}

function getDateGroup(ts) {
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < day) return '今日';
  if (diff < 2 * day) return '昨日';
  if (diff < 7 * day) return '今週';
  return 'それ以前';
}

function completionStats(memo) {
  const cats = (memo.organized && memo.organized.categories) || {};
  let total = 0, done = 0;
  for (const items of Object.values(cats)) {
    for (const it of items) { total++; if (it.done) done++; }
  }
  return { total, done };
}

function renderHistory() {
  const q = searchQuery.trim().toLowerCase();
  let list = q ? memos.filter((m) => memoSearchText(m).includes(q)) : memos;

  if (categoryFilter) {
    list = list.filter((m) => {
      const cats = (m.organized && m.organized.categories) || {};
      return (cats[categoryFilter] || []).length > 0;
    });
  }

  if (list.length === 0) {
    historyListEl.innerHTML = '';
    historyEmptyEl.innerHTML = q || categoryFilter
      ? '条件に一致するメモがありません'
      : HISTORY_EMPTY_DEFAULT;
    historyEmptyEl.classList.remove('hidden');
    return;
  }
  historyEmptyEl.classList.add('hidden');

  const sorted = list
    .slice()
    .sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || ((b.ts || 0) - (a.ts || 0)));

  const groupOrder = ['今日', '昨日', '今週', 'それ以前'];
  const groups = {};
  for (const m of sorted) {
    const g = getDateGroup(m.ts || 0);
    (groups[g] = groups[g] || []).push(m);
  }

  let html = '';
  for (const group of groupOrder) {
    if (!groups[group]) continue;
    html += `<div class="date-group-label">${group}</div>`;
    for (const m of groups[group]) {
      const { total, done } = completionStats(m);
      const badge = total > 0
        ? `<span class="completion-badge${done === total ? ' all-done' : ''}">${done}/${total}</span>`
        : '';
      html += `<div class="swipe-wrapper" data-swipe-id="${m.id}">
        <div class="swipe-delete-bg">${TRASH_SVG}<span>削除</span></div>
        <div class="glass-card memo-card history-card${editingId === m.id ? ' open' : ''}" data-card="${m.id}">
          <div class="history-head" data-toggle="${m.id}">
            <div class="history-head-main">
              <div class="memo-title-row"><span class="memo-title">${esc((m.organized && m.organized.title) || '音声メモ')}</span>${badge}</div>
              <div class="memo-date">${formatDate(m.ts)}</div>
            </div>
            <div class="head-right">
              <button class="pin-btn${m.pinned ? ' pinned' : ''}" data-action="pin" data-id="${m.id}" aria-label="ピン留め">${PIN_SVG}</button>
              <span class="chevron">${CHEVRON_SVG}</span>
            </div>
          </div>
          <div class="history-body">${memoBodyHTML(m, { deletable: true, hideHeader: true, editing: editingId === m.id })}</div>
        </div>
      </div>`;
    }
  }
  historyListEl.innerHTML = html;
}

// ===== ゴミ箱描画 =====
function renderTrash() {
  const el = document.getElementById('trashList');
  if (trash.length === 0) {
    el.innerHTML = '<p class="trash-empty">空です</p>';
    return;
  }
  el.innerHTML =
    trash
      .map(
        (m) => `
      <div class="trash-row">
        <div class="trash-meta">
          <div class="trash-title">${esc((m.organized && m.organized.title) || '音声メモ')}</div>
          <div class="trash-date">${formatDate(m.ts)}</div>
        </div>
        <div class="trash-actions">
          <button class="pill-btn sm" data-action="restore-trash" data-id="${m.id}">復元</button>
          <button class="pill-btn sm danger" data-action="purge-trash" data-id="${m.id}">削除</button>
        </div>
      </div>`
      )
      .join('') +
    `<div class="trash-foot"><button class="pill-btn sm danger" data-action="empty-trash">ゴミ箱を空にする</button></div>`;
}

// ===== 操作（イベント委譲）=====
document.addEventListener('change', (e) => {
  const cb = e.target;
  if (!cb.matches('input[type="checkbox"][data-id]')) return;
  const memo = findMemo(cb.dataset.id);
  if (!memo) return;
  const item = ((memo.organized.categories || {})[cb.dataset.cat] || [])[cb.dataset.idx];
  if (!item) return;
  item.done = cb.checked;
  saveMemos(memos);
  if (cb.checked) {
    onTaskComplete(item);
    // 繰り返しタスク：完了したら次回分として自動で復活
    const rep = recurringType(item.text);
    if (rep) {
      setTimeout(() => {
        item.done = false;
        item.due = nextDueISO(rep);
        saveMemos(memos);
        renderTodayTasks();
        renderDailyQuest();
        renderHistory();
      }, 950);
    }
  }
  const row = cb.closest('.item-row');
  if (row) {
    row.classList.toggle('done', cb.checked);
  } else if (cb.closest('#pendingResult')) {
    renderPendingTasks();
    renderTodayTasks();
    renderDailyQuest();
  } else if (cb.closest('#todayTasks') || cb.closest('#questSection')) {
    renderTodayTasks();
    renderDailyQuest();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.ai-save-btn') && pendingChatSave) {
    const { question, answer } = pendingChatSave;
    const memo = {
      id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      transcription: `Q: ${question}`,
      organized: {
        title: `AI: ${question.slice(0, 18)}`,
        summary: question,
        categories: { notes: [{ text: answer, due: null, done: false, priority: null }] },
      },
    };
    memos.unshift(memo);
    saveMemos(memos);
    pendingChatSave = null;
    e.target.textContent = '✓ 保存済み';
    e.target.disabled = true;
    toast('AIの回答をメモに保存しました');
    return;
  }

  const filterBtn = e.target.closest('.filter-btn');
  if (filterBtn) {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    filterBtn.classList.add('active');
    categoryFilter = filterBtn.dataset.cat;
    renderHistory();
    return;
  }

  const gameToggle = e.target.closest('[data-toggle-game]');
  if (gameToggle) {
    const kind = gameToggle.dataset.toggleGame;
    if (kind === 'sound') {
      soundEnabled = !soundEnabled;
      localStorage.setItem('voiceMemoSound', soundEnabled ? '1' : '0');
      if (soundEnabled) playSound('complete');
      renderGameSettings();
    } else if (kind === 'haptic') {
      hapticEnabled = !hapticEnabled;
      localStorage.setItem('voiceMemoHaptic', hapticEnabled ? '1' : '0');
      if (hapticEnabled) haptic(35);
      renderGameSettings();
    } else if (kind === 'notify') {
      if (notifyEnabled) {
        notifyEnabled = false;
        localStorage.setItem('voiceMemoNotify', '0');
        renderGameSettings();
      } else if (!('Notification' in window)) {
        toast('この端末は通知に対応していません');
      } else if (Notification.permission === 'granted') {
        notifyEnabled = true;
        localStorage.setItem('voiceMemoNotify', '1');
        renderGameSettings();
        checkDueNotifications();
      } else if (Notification.permission === 'denied') {
        toast('ブラウザの設定で通知がブロックされています');
      } else {
        Notification.requestPermission().then((p) => {
          notifyEnabled = p === 'granted';
          localStorage.setItem('voiceMemoNotify', notifyEnabled ? '1' : '0');
          toast(notifyEnabled ? '締め切り通知をオンにしました' : '通知が許可されませんでした');
          renderGameSettings();
          if (notifyEnabled) checkDueNotifications();
        });
      }
    }
    return;
  }

  const themeBtn = e.target.closest('[data-theme-id]');
  if (themeBtn && !themeBtn.disabled) {
    applyTheme(themeBtn.dataset.themeId);
    localStorage.setItem('voiceMemoTheme', currentTheme);
    renderThemes();
    renderGameStats();
    return;
  }

  const btn = e.target.closest('[data-action]');

  if (!btn) {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle && !e.target.closest('.history-body')) {
      toggle.closest('.history-card').classList.toggle('open');
    }
    return;
  }

  const action = btn.dataset.action;

  if (action === 'open-related') {
    currentResultId = btn.dataset.id;
    document.querySelector('.nav-btn[data-view="record"]').click();
    renderResult();
    return;
  }

  if (action === 'close-weekly') {
    weeklyResultEl.innerHTML = '';
    pendingWeeklySave = null;
    return;
  }

  if (action === 'close-pending') {
    pendingResultEl.innerHTML = '';
    return;
  }

  if (action === 'save-weekly' && pendingWeeklySave) {
    const today = new Date();
    const label = `${today.getMonth() + 1}/${today.getDate()} 週間まとめ`;
    const memo = {
      id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      transcription: '',
      organized: {
        title: label,
        summary: '',
        categories: { notes: [{ text: pendingWeeklySave, due: null, done: false, priority: null }] },
      },
    };
    memos.unshift(memo);
    saveMemos(memos);
    pendingWeeklySave = null;
    btn.textContent = '✓ 保存済み';
    btn.disabled = true;
    toast('週間まとめをメモに保存しました');
    return;
  }

  if (action === 'restore-trash') {
    const m = trash.find((t) => t.id === btn.dataset.id);
    if (!m) return;
    trash = trash.filter((t) => t.id !== m.id);
    delete m.deletedAt;
    memos.push(m);
    memos.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    saveTrash(trash);
    saveMemos(memos);
    renderTrash();
    renderHistory();
    toast('復元しました');
    return;
  }

  if (action === 'purge-trash') {
    if (!confirm('完全に削除しますか？元に戻せません')) return;
    trash = trash.filter((t) => t.id !== btn.dataset.id);
    saveTrash(trash);
    renderTrash();
    return;
  }

  if (action === 'empty-trash') {
    if (!confirm('ゴミ箱を空にしますか？元に戻せません')) return;
    trash = [];
    saveTrash(trash);
    renderTrash();
    return;
  }

  const memo = findMemo(btn.dataset.id);
  if (!memo) return;

  if (action === 'share') shareMemo(memo);
  if (action === 'todoist') addToTodoist(memo, btn);

  if (action === 'pin') {
    memo.pinned = !memo.pinned;
    saveMemos(memos);
    renderHistory();
  }

  if (action === 'append') {
    if (isRecording) return;
    appendTargetId = memo.id;
    document.querySelector('.nav-btn[data-view="record"]').click();
    startRecording();
    if (isRecording) {
      setStatus('追記を録音中... 話してください', 'recording');
    } else {
      appendTargetId = null;
    }
  }

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
    memos = memos.filter((m) => m.id !== memo.id);
    if (currentResultId === memo.id) currentResultId = null;
    if (editingId === memo.id) editingId = null;
    memo.deletedAt = Date.now();
    trash.unshift(memo);
    trash = trash.slice(0, 20);
    saveTrash(trash);
    saveMemos(memos);
    rerenderAll();
    toast('ゴミ箱に移動しました（設定から復元できます）');
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

// ===== AI会話モード =====
async function submitChat() {
  const question = chatInput.value.trim();
  if (!question) return;

  chatBtn.disabled = true;
  chatBtn.textContent = '...';
  chatResultEl.classList.remove('hidden');
  chatResultEl.innerHTML = '<div class="ai-chat-thinking">考え中...</div>';

  try {
    const payload = memos.slice(0, 30).map((m) => ({
      date: formatDate(m.ts),
      title: (m.organized && m.organized.title) || '',
      categories: (m.organized && m.organized.categories) || {},
    }));

    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, memos: payload }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'エラー');

    pendingChatSave = { question, answer: data.answer };
    chatResultEl.innerHTML = `<div class="ai-chat-answer">${esc(data.answer)}</div><button class="pill-btn sm ai-save-btn">メモに保存</button>`;
    chatInput.value = '';
  } catch (err) {
    chatResultEl.innerHTML = `<div class="ai-chat-error">${esc(err.message)}</div>`;
  } finally {
    chatBtn.disabled = false;
    chatBtn.textContent = '送信';
  }
}

chatBtn.addEventListener('click', submitChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitChat(); });

// ===== テキスト入力モード =====
const textCard = document.getElementById('textCard');
const textInput = document.getElementById('textInput');
const textOrganizeBtn = document.getElementById('textOrganizeBtn');

// ブラウザ内蔵の音声認識（キーボードの音声入力の代わりに、開いたらすぐ話せる）
let recog = null, dictating = false, dictBase = '';
function supportsDictation() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function updateDictateBtn() {
  const btn = document.getElementById('dictateBtn');
  if (!btn) return;
  if (!supportsDictation()) { btn.style.display = 'none'; return; }
  btn.classList.toggle('listening', dictating);
  btn.textContent = dictating ? '⏹ 停止（聞いてます…）' : '🎤 音声入力';
}
function startDictation() {
  if (!supportsDictation() || dictating) return false;
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recog = new SR();
    recog.lang = 'ja-JP';
    recog.continuous = true;
    recog.interimResults = true;
    dictBase = textInput.value ? textInput.value.replace(/\s*$/, '') + ' ' : '';
    recog.onresult = (e) => {
      let interim = '', finalAdd = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalAdd += tr; else interim += tr;
      }
      if (finalAdd) dictBase += finalAdd;
      textInput.value = dictBase + interim;
    };
    recog.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('マイクの使用が許可されていません');
    };
    recog.onend = () => { dictating = false; updateDictateBtn(); };
    recog.start();
    dictating = true;
    updateDictateBtn();
    return true;
  } catch { return false; }
}
function stopDictation() {
  if (recog) { try { recog.stop(); } catch {} }
  recog = null;
  dictating = false;
  updateDictateBtn();
}

document.getElementById('textModeBtn').addEventListener('click', () => {
  const opening = textCard.classList.contains('hidden');
  textCard.classList.toggle('hidden');
  if (opening) {
    updateDictateBtn();
    textInput.focus();
    startDictation(); // 開いたら最初から音声入力ON
  } else {
    stopDictation();
  }
});

document.getElementById('dictateBtn').addEventListener('click', () => {
  if (dictating) stopDictation(); else startDictation();
});

document.getElementById('textCloseBtn').addEventListener('click', () => {
  stopDictation();
  textCard.classList.add('hidden');
});

textOrganizeBtn.addEventListener('click', async () => {
  stopDictation();
  const text = textInput.value.trim();
  if (!text) {
    toast('テキストを入力してください');
    return;
  }
  textOrganizeBtn.disabled = true;
  textOrganizeBtn.textContent = '整理中...';
  setStatus('AIが整理中です...', 'processing');
  const ok = await organize(text);
  textOrganizeBtn.disabled = false;
  textOrganizeBtn.textContent = '整理する';
  if (ok) {
    textInput.value = '';
    textCard.classList.add('hidden');
  }
});

// ===== 週間まとめ =====
pendingBtn.addEventListener('click', () => {
  weeklyResultEl.innerHTML = '';
  pendingWeeklySave = null;
  if (pendingResultEl.innerHTML) {
    pendingResultEl.innerHTML = '';
  } else {
    renderPendingTasks();
  }
});

weeklyBtn.addEventListener('click', async () => {
  pendingResultEl.innerHTML = '';
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
          <div class="weekly-head-actions">
            <button class="pill-btn sm" data-action="save-weekly">メモに保存</button>
            <button class="del-item-btn" data-action="close-weekly" aria-label="閉じる">${X_SVG}</button>
          </div>
        </div>
        <p class="weekly-text">${esc(data.summary)}</p>
      </div>`;
    pendingWeeklySave = data.summary;
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
applyTheme(currentTheme);
renderTodayTasks();
renderGameStats();
renderDailyMission();
renderDailyQuest();
renderBattle();
checkDueNotifications();

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

// ===== スワイプ削除 =====
{
  let swipeEl = null, swipeId = null, swipeStartX = 0, swipeStartY = 0, axisLocked = false;
  const THRESHOLD = 88;

  historyListEl.addEventListener('touchstart', (e) => {
    const card = e.target.closest('.history-card');
    if (!card || card.classList.contains('open') || e.target.closest('.history-body')) return;
    swipeEl = card;
    swipeId = card.closest('[data-swipe-id]') && card.closest('[data-swipe-id]').dataset.swipeId;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    axisLocked = false;
  }, { passive: true });

  historyListEl.addEventListener('touchmove', (e) => {
    if (!swipeEl) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;
    if (!axisLocked) {
      if (Math.abs(dy) > Math.abs(dx)) { swipeEl = null; return; }
      axisLocked = true;
    }
    e.preventDefault();
    if (dx >= 0) return;
    const tx = Math.max(dx, -THRESHOLD * 1.8);
    swipeEl.style.cssText = `transform:translateX(${tx}px);transition:none`;
    const bg = swipeEl.previousElementSibling;
    if (bg) bg.style.opacity = Math.min(Math.abs(tx) / THRESHOLD, 1);
  }, { passive: false });

  historyListEl.addEventListener('touchend', () => {
    if (!swipeEl) return;
    const match = swipeEl.style.transform.match(/-?\d+\.?\d*/);
    const dx = match ? parseFloat(match[0]) : 0;
    const bg = swipeEl.previousElementSibling;

    if (dx <= -THRESHOLD) {
      swipeEl.style.cssText = 'transform:translateX(-110%);transition:transform 0.2s ease';
      const id = swipeId;
      setTimeout(() => {
        const memo = findMemo(id);
        if (memo) {
          memos = memos.filter((m) => m.id !== id);
          if (currentResultId === id) currentResultId = null;
          if (editingId === id) editingId = null;
          memo.deletedAt = Date.now();
          trash.unshift(memo);
          trash = trash.slice(0, 20);
          saveTrash(trash);
          saveMemos(memos);
          rerenderAll();
          toast('ゴミ箱に移動しました（設定から復元できます）');
        }
      }, 210);
    } else {
      swipeEl.style.cssText = 'transform:translateX(0);transition:transform 0.25s ease';
      if (bg) bg.style.opacity = 0;
    }
    swipeEl = null; swipeId = null; axisLocked = false;
  });
}

// ===== PWA =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

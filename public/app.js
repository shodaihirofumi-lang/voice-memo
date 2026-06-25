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
const FOCUS_KEY = 'voiceMemoFocus.v1';
const DIARY_KEY = 'voiceMemoDiary.v1';
const WORKSPACE_FILTER_KEY = 'voiceMemoWsFilter';

// ワークスペースフィルター
let currentWorkspace = localStorage.getItem(WORKSPACE_FILTER_KEY) || 'all'; // 'all'|'work'|'private'

const WS_WORK_RE = /会議|ミーティング|打ち?合わせ|プレゼン|報告書?|業務|仕事|上司|部下|クライアント|顧客|プロジェクト|締[切め]|企画|見積|請求|契約|出張|社内|会社|職場|残業|納期|資料|発注|営業|商談|採用|面接|コスト|予算|売上|開発|リリース|デプロイ/;

function guessWorkspace(memo) {
  if (memo.workspace) return memo.workspace;
  const o = memo.organized || {};
  const allText = [o.title || '', o.summary || ''].concat(
    Object.values(o.categories || {}).flat().map((i) => i.text || '')
  ).join(' ');
  return WS_WORK_RE.test(allText) ? 'work' : 'private';
}

function renderWorkspaceTabs() {
  const el = document.getElementById('workspaceTabs');
  if (!el) return;
  const tabs = [
    { id: 'all', label: '全て' },
    { id: 'work', label: '💼 仕事' },
    { id: 'private', label: '🏠 プライベート' },
  ];
  el.innerHTML = tabs.map((t) =>
    `<button class="ws-tab${currentWorkspace === t.id ? ' active' : ''}" data-ws="${t.id}">${t.label}</button>`
  ).join('');
}
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

// 相棒モンスター（3段階進化）
const COMPANION_STAGES = [
  { name: 'プチ',   stageLabel: 'Lv.1 幼体', xpNeeded: 0,
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 16 C17 16 12 22 12 28 C12 33 16 36 24 36 C32 36 36 33 36 28 C36 22 31 16 24 16 Z" fill="#c084fc"/><path d="M19 14 l1 3 M29 14 l-1 3" stroke="#a855f7" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="27" r="2.2" fill="#fff"/><circle cx="28" cy="27" r="2.2" fill="#fff"/><circle cx="20" cy="27.5" r="1" fill="#4c1d95"/><circle cx="28" cy="27.5" r="1" fill="#4c1d95"/><path d="M21 31 Q24 33 27 31" stroke="#4c1d95" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>` },
  { name: 'プチ改',  stageLabel: 'Lv.2 成長', xpNeeded: 500,
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M8 26 L17 22 L14 29 Z" fill="#a855f7"/><path d="M40 26 L31 22 L34 29 Z" fill="#a855f7"/><path d="M24 13 C16 13 11 20 11 27 C11 32.5 16 36 24 36 C32 36 37 32.5 37 27 C37 20 32 13 24 13 Z" fill="#c084fc"/><ellipse cx="20" cy="26" rx="2.8" ry="3" fill="#fff"/><ellipse cx="28" cy="26" rx="2.8" ry="3" fill="#fff"/><circle cx="20" cy="26.5" r="1.2" fill="#3b0764"/><circle cx="28" cy="26.5" r="1.2" fill="#3b0764"/><path d="M21 31 Q24 34 27 31" stroke="#3b0764" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M22 19 l-1 -3 M26 19 l1 -3" stroke="#c084fc" stroke-width="2.5" stroke-linecap="round"/></svg>` },
  { name: 'プチ神',  stageLabel: 'Lv.3 最強進化', xpNeeded: 2000,
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="10" r="3.5" fill="#fde047" opacity="0.85"/><path d="M6 24 L17 21 L13 29 Z" fill="#7c3aed"/><path d="M42 24 L31 21 L35 29 Z" fill="#7c3aed"/><path d="M24 12 C15 12 10 20 10 27 C10 33 16 38 24 38 C32 38 38 33 38 27 C38 20 33 12 24 12 Z" fill="#7c3aed"/><path d="M10 27 C8 20 24 12 24 12 C24 12 40 20 38 27 Z" fill="#6d28d9"/><ellipse cx="19" cy="26" rx="3" ry="3.5" fill="#fff"/><ellipse cx="29" cy="26" rx="3" ry="3.5" fill="#fff"/><circle cx="19" cy="26.5" r="1.4" fill="#a855f7"/><circle cx="29" cy="26.5" r="1.4" fill="#a855f7"/><circle cx="19.5" cy="26" r="0.6" fill="#fff"/><circle cx="29.5" cy="26" r="0.6" fill="#fff"/><path d="M20 32 Q24 35.5 28 32" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>` },
];

// 冒険ストーリー章（ボス討伐数で進む）
const STORY_CHAPTERS = [
  { bossesNeeded: 0,  text: '旅の始まり。タスクを倒して、強くなろう！' },
  { bossesNeeded: 1,  text: 'ドラゴンを倒した！次なる強敵が目の前に現れた…' },
  { bossesNeeded: 2,  text: '魔王すら打ち倒した！でも、ゴーレムの咆哮が聞こえる…' },
  { bossesNeeded: 3,  text: '三大ボスを制覇！英雄の名がとどろく。さらなる挑戦が待つ！' },
  { bossesNeeded: 6,  text: 'すべての強敵を圧倒！思考整理の達人として伝説に名を残した。' },
  { bossesNeeded: 10, text: '神の域に達した！もうここには敵など存在しない…今は自分との戦いだ。' },
];
function getCurrentStory() {
  const bosses = gameStats.bossDefeats || 0;
  let ch = STORY_CHAPTERS[0];
  for (const c of STORY_CHAPTERS) { if (bosses >= c.bossesNeeded) ch = c; }
  return ch;
}

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
    gotJackpot: false, nightOwl: false, earlyBird: false,
    todayDefeated: [], todayDefeatedDate: null };
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

// フォーカスタスク（今日の3フォーカス）
let focusTasks = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(FOCUS_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return [];
})();
function saveFocusTasks() { localStorage.setItem(FOCUS_KEY, JSON.stringify(focusTasks)); }
let focusAllDoneCelebrated = false;

// ===== 効果音（Web Audioで生成） =====
let soundEnabled = localStorage.getItem('voiceMemoSound') !== '0';
let hapticEnabled = localStorage.getItem('voiceMemoHaptic') !== '0';
let sfxCtx = null;

// ===== 集中BGM =====
const BGM_KEY = 'voiceMemoBGM';
const BGM_TYPES = [
  { id: 'none',  label: 'なし' },
  { id: 'white', label: 'ホワイトノイズ' },
  { id: 'rain',  label: '雨音' },
  { id: 'fire',  label: '焚き火' },
];
let bgmType = localStorage.getItem(BGM_KEY) || 'none';
let bgmCtx = null;
let bgmSources = [];
let bgmGainNode = null;

function stopBGM() {
  bgmSources.forEach((n) => { try { n.stop(); } catch {} });
  bgmSources = [];
  if (bgmGainNode) { bgmGainNode.disconnect(); bgmGainNode = null; }
}

function startBGM() {
  stopBGM();
  if (bgmType === 'none') return;
  try {
    if (!bgmCtx) bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (bgmCtx.state === 'suspended') bgmCtx.resume();
    const ctx = bgmCtx;
    bgmGainNode = ctx.createGain();
    bgmGainNode.gain.value = 0.26;
    bgmGainNode.connect(ctx.destination);

    const makeNoiseBuf = (type) => {
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      if (type === 'brown') {
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          d[i] = Math.max(-1, Math.min(1, (last + 0.02 * w) / 1.02 * 3.5));
          last = d[i] / 3.5;
        }
      } else {
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      return buf;
    };

    if (bgmType === 'white') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuf('white');
      src.loop = true;
      src.connect(bgmGainNode);
      src.start();
      bgmSources.push(src);

    } else if (bgmType === 'rain') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuf('white');
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.4;
      src.connect(f); f.connect(bgmGainNode); src.start();
      bgmSources.push(src);

    } else if (bgmType === 'fire') {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuf('brown');
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 600;
      src.connect(f); f.connect(bgmGainNode); src.start();
      bgmSources.push(src);
    }
  } catch (err) { console.warn('[BGM]', err); }
}

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
// ===== ポモドーロ（集中モード）=====
let pomodoroRunning = false;
let pomodoroElapsed = 0;
const POMODORO_DURATION = 25 * 60;
let pomodoroInterval = null;

// ===== 今日の3フォーカス =====
function isFocused(text) {
  return focusTasks.some((f) => f.text === text);
}

function toggleFocus(memoId, cat, text) {
  const idx = focusTasks.findIndex((f) => f.text === text);
  if (idx !== -1) {
    focusTasks.splice(idx, 1);
    saveFocusTasks();
    focusAllDoneCelebrated = false;
    renderFocusCard();
    renderTodayTasks();
    return;
  }
  if (focusTasks.length >= 10) {
    toast('フォーカスは10件まで！');
    return;
  }
  focusTasks.push({ memoId, cat, text });
  saveFocusTasks();
  renderFocusCard();
  renderTodayTasks();
}

function renderFocusCard() {
  const el = document.getElementById('focusCard');
  if (!el) return;

  const slots = focusTasks.map((f) => {
    const memo = findMemo(f.memoId);
    const cats = (memo && memo.organized && memo.organized.categories) || {};
    const item = (cats[f.cat] || []).find((it) => it.text === f.text);
    return { ...f, done: item ? item.done : false };
  });

  const doneCount = slots.filter((s) => s.done).length;
  if (slots.length > 0 && slots.length === doneCount && !focusAllDoneCelebrated) {
    focusAllDoneCelebrated = true;
    setTimeout(() => { showConfetti(false); toast('🎉 今日のフォーカス全達成！素晴らしい！'); }, 300);
  }
  if (doneCount < slots.length) focusAllDoneCelebrated = false;

  const slotHtml = (s, i) => `<div class="focus-slot${s.done ? ' done' : ''}">
    <span class="focus-slot-num">${i + 1}</span>
    <span class="focus-slot-text">${esc(s.text)}</span>
    <button class="focus-slot-remove" data-focus-remove="${i}" title="外す">✕</button>
  </div>`;

  const emptyHtml = `<div class="focus-slot empty"><span class="focus-slot-text">タスク行の ⭐ で追加</span></div>`;

  el.innerHTML = `<div class="glass-card focus-card">
    <div class="focus-head">
      <span class="card-label">⭐ 今日のフォーカス</span>
      <span class="focus-badge">${doneCount}/${slots.length || 10}</span>
    </div>
    <div class="focus-slots">${slots.length ? slots.map(slotHtml).join('') : emptyHtml}</div>
  </div>`;

  el.querySelectorAll('[data-focus-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      focusTasks.splice(Number(btn.dataset.focusRemove), 1);
      saveFocusTasks();
      focusAllDoneCelebrated = false;
      renderFocusCard();
      renderTodayTasks();
    });
  });
}


function renderPomodoro() {
  const el = document.getElementById('pomodoroCard');
  if (!el) return;
  const remaining = POMODORO_DURATION - pomodoroElapsed;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const pct = Math.round((pomodoroElapsed / POMODORO_DURATION) * 100);
  const bgmLabel = BGM_TYPES.find((t) => t.id === bgmType)?.label || 'なし';
  const bgmSelector = pomodoroRunning
    ? (bgmType !== 'none' ? `<p class="pom-bgm-active">♪ ${bgmLabel}</p>` : '')
    : `<div class="pom-bgm-row">${BGM_TYPES.map((t) => `<button class="pom-bgm-btn${bgmType === t.id ? ' active' : ''}" data-bgm="${t.id}">${t.label}</button>`).join('')}</div>`;
  el.innerHTML = `<div class="glass-card pomodoro-card${pomodoroRunning ? ' running' : ''}">
    <div class="pom-head">
      <span class="card-label">⏱ 集中モード（ポモドーロ）</span>
      ${pomodoroRunning ? '<span class="pom-badge blink">集中中</span>' : ''}
    </div>
    <div class="pom-timer">${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</div>
    <div class="pom-bar"><div class="pom-fill" style="width:${pct}%"></div></div>
    ${bgmSelector}
    <div class="pom-actions">
      ${pomodoroRunning
        ? '<button class="pill-btn" id="pomStopBtn">⏹ 中断</button>'
        : '<button class="pill-btn primary" id="pomStartBtn">▶ 集中開始</button>'}
    </div>
    <p class="pom-hint">25分集中すると敵に大ダメージ＋150XP！</p>
  </div>`;
  if (pomodoroRunning) {
    document.getElementById('pomStopBtn')?.addEventListener('click', stopPomodoro);
  } else {
    document.getElementById('pomStartBtn')?.addEventListener('click', startPomodoro);
    el.querySelectorAll('.pom-bgm-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        bgmType = btn.dataset.bgm;
        localStorage.setItem(BGM_KEY, bgmType);
        renderPomodoro();
      });
    });
  }
}

function startPomodoro() {
  if (pomodoroRunning) return;
  pomodoroRunning = true;
  pomodoroElapsed = 0;
  pomodoroInterval = setInterval(() => {
    pomodoroElapsed++;
    if (pomodoroElapsed >= POMODORO_DURATION) pomodoroComplete();
    else renderPomodoro();
  }, 1000);
  renderPomodoro();
  startBGM();
  haptic([20, 10, 20]);
  toast('⏱ 集中モード開始！25分間タスクに集中しよう！');
}

function stopPomodoro() {
  clearInterval(pomodoroInterval);
  stopBGM();
  pomodoroRunning = false;
  pomodoroElapsed = 0;
  renderPomodoro();
  toast('集中モードを中断しました');
}

function pomodoroComplete() {
  clearInterval(pomodoroInterval);
  stopBGM();
  pomodoroRunning = false;
  pomodoroElapsed = 0;

  const xpReward = 150;
  gameStats.xp += xpReward;
  saveGameStats(gameStats);
  renderGameStats();

  const q = getQuest();
  const bigDmg = 10;
  q.hp = Math.max(0, q.hp - bigDmg);
  if (q.hp === 0) {
    const e = q.isBoss ? BOSS_ENEMIES[q.idx] : MONSTERS[q.idx];
    const reward = q.isBoss ? (80 + q.stage * 6) : (8 + q.stage);
    gameStats.xp += reward;
    gameStats.enemiesDefeated = (gameStats.enemiesDefeated || 0) + 1;
    if (q.isBoss) gameStats.bossDefeats = (gameStats.bossDefeats || 0) + 1;
    const dexKey = (q.isBoss ? 'b' : 'm') + q.idx;
    gameStats.monsterDex = gameStats.monsterDex || {};
    gameStats.monsterDex[dexKey] = (gameStats.monsterDex[dexKey] || 0) + 1;
    gameStats.quest = makeEnemy(q.stage + 1);
    saveGameStats(gameStats);
    playSound(q.isBoss ? 'boss' : 'complete');
    if (q.isBoss) showConfetti(true);
    setTimeout(() => toast(`⏱ 集中完了！⚔️ ${e.name} を たおした！ +${reward} XP`), 500);
  } else {
    saveGameStats(gameStats);
  }
  renderBattle();
  showAttackEffect(bigDmg, { type: 'work' });
  showConfetti(true);
  playSound('boss');
  haptic([60, 40, 60, 40, 60]);
  showXpPopup(xpReward, false, false, { type: 'work', label: '⏱ 集中完了！' });
  renderPomodoro();
  renderCompanion();
  if (notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification('思考整理', { body: '25分集中完了！+150 XP & 大ダメージ獲得！', icon: 'icons/icon-192.png' }); } catch {}
  }
}

// ===== 相棒モンスター =====
function getCompanionInfo() {
  const xp = gameStats.xp;
  let idx = 0;
  for (let i = COMPANION_STAGES.length - 1; i >= 0; i--) {
    if (xp >= COMPANION_STAGES[i].xpNeeded) { idx = i; break; }
  }
  return { stage: COMPANION_STAGES[idx], stageIdx: idx, nextStage: COMPANION_STAGES[idx + 1] || null };
}

function renderCompanion() {
  const el = document.getElementById('companionCard');
  if (!el) return;
  const xp = gameStats.xp;
  const { stage, nextStage } = getCompanionInfo();
  let xpBarHtml = '';
  if (nextStage) {
    const pct = Math.min(100, Math.round(((xp - stage.xpNeeded) / (nextStage.xpNeeded - stage.xpNeeded)) * 100));
    xpBarHtml = `<div class="companion-xpbar"><div class="companion-xpfill" style="width:${pct}%"></div></div>
      <div class="companion-next">あと ${nextStage.xpNeeded - xp} XPで進化！</div>`;
  } else {
    xpBarHtml = `<div class="companion-evolve">✨ 最強形態！</div>`;
  }
  el.innerHTML = `<div class="glass-card companion-card">
    <div class="companion-body">
      <div class="companion-avatar">${stage.svg}</div>
      <div>
        <div class="companion-stage">${stage.stageLabel}</div>
        <div class="companion-name">🐾 ${stage.name}</div>
        ${xpBarHtml}
      </div>
    </div>
  </div>`;
}

// ===== 討伐記録（今日完了したタスク）=====
function renderDefeatedToday() {
  const el = document.getElementById('defeatedToday');
  if (!el) return;
  const today = todayISO();
  const list = (gameStats.todayDefeatedDate === today && gameStats.todayDefeated) || [];
  if (list.length === 0) { el.innerHTML = ''; return; }
  const totalXP = list.reduce((s, d) => s + (d.xp || 0), 0);
  const rows = list.slice().reverse().map((d) =>
    `<div class="defeated-row">
      <span class="defeated-icon">${d.bonus === 'meditation' ? '🧘' : d.bonus === 'work' ? '💼' : '⚔️'}</span>
      <span class="defeated-text">${esc(d.text)}</span>
      <span class="defeated-xp">+${d.xp}XP</span>
    </div>`
  ).join('');
  el.innerHTML = `<div class="glass-card defeated-card">
    <div class="defeated-head">
      <h3 class="card-label">⚔️ 今日の討伐記録（${list.length}体・合計${totalXP}XP）</h3>
      <button class="review-open-btn" id="openReviewBtn">✨ 振り返る</button>
    </div>
    <div class="defeated-list">${rows}</div>
  </div>`;
  document.getElementById('openReviewBtn')?.addEventListener('click', showEveningReview);
}

// ===== 夕方振り返り =====
async function showEveningReview() {
  const today = todayISO();
  const list = (gameStats.todayDefeatedDate === today && gameStats.todayDefeated) || [];
  if (list.length === 0) { toast('今日はまだタスクを完了していません'); return; }

  const totalXP = list.reduce((s, d) => s + (d.xp || 0), 0);
  const rows = list.slice().reverse().map((d) =>
    `<div class="review-task-row">
      <span>${d.bonus === 'meditation' ? '🧘' : d.bonus === 'work' ? '💼' : '⚔️'}</span>
      <span class="review-task-text">${esc(d.text)}</span>
      <span class="review-task-xp">+${d.xp}XP</span>
    </div>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.className = 'review-overlay';
  overlay.innerHTML = `
    <div class="review-card">
      <div class="review-head">
        <h2 class="review-title">✨ 今日の振り返り</h2>
        <button class="review-close" id="rvClose">✕</button>
      </div>
      <div class="review-stats">
        <div class="review-stat-item"><span class="review-stat-num">${list.length}</span><span class="review-stat-label">件完了</span></div>
        <div class="review-stat-sep">·</div>
        <div class="review-stat-item"><span class="review-stat-num">${totalXP}</span><span class="review-stat-label">XP獲得</span></div>
      </div>
      <div class="review-tasks">${rows}</div>
      <div id="rvPraise" class="review-praise hidden"></div>
      <div class="review-actions">
        <button class="pill-btn primary" id="rvPraiseBtn">🤖 AIに褒めてもらう</button>
        <button class="pill-btn" id="rvClose2">閉じる</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('rvClose').onclick = close;
  document.getElementById('rvClose2').onclick = close;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('rvPraiseBtn').onclick = async () => {
    const btn = document.getElementById('rvPraiseBtn');
    const praiseEl = document.getElementById('rvPraise');
    btn.disabled = true;
    btn.textContent = '🤖 考え中...';
    praiseEl.classList.remove('hidden');
    praiseEl.textContent = '…';
    try {
      const res = await fetch('/api/praise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: list.map((d) => d.text), count: list.length, xp: totalXP }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'エラー');
      praiseEl.textContent = data.message;

      // 振り返りボーナス（1日1回）
      if (gameStats.todayReviewedDate !== today) {
        gameStats.todayReviewedDate = today;
        gameStats.xp += 30;
        saveGameStats(gameStats);
        renderGameStats();
        setTimeout(() => showXpPopup(30, false, false, { type: 'normal' }), 300);
        toast('✨ 振り返りボーナス +30XP！');
      }

      btn.textContent = '🤖 もう一度褒めてもらう';
      btn.disabled = false;
    } catch {
      praiseEl.textContent = 'AIへの接続に失敗しました';
      btn.disabled = false;
      btn.textContent = '🤖 再試行';
    }
  };
}

// ===== AIタスク分解 =====
async function handleDecompose(memoId, cat, idx) {
  const memo = findMemo(memoId);
  if (!memo) return;
  const item = (((memo.organized || {}).categories || {})[cat] || [])[idx];
  if (!item) return;

  const btn = document.querySelector(`[data-decomp-id="${memoId}"][data-decomp-cat="${cat}"][data-decomp-idx="${idx}"]`);
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  try {
    const r = await fetch('/api/decompose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: item.text }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'エラー');

    const steps = data.steps;
    if (!steps || steps.length === 0) { toast('分解できませんでした'); return; }

    const cats = memo.organized.categories;
    const groupId = 'dg' + Date.now();
    const newItems = steps.map((s) => ({ text: s, due: item.due, done: false, priority: item.priority, _dg: groupId, _dgOriginal: item.text }));
    decompGroups[groupId] = { memoId, cat, original: { ...item } };
    cats[cat].splice(idx, 1, ...newItems);
    saveMemos(memos);
    renderTodayTasks();
    renderDailyQuest();
    renderResult();
    toast(`✂️ 「${item.text.slice(0, 14)}」を${newItems.length}つに分解しました`);
  } catch (err) {
    toast(`分解エラー: ${err.message}`);
    if (btn) { btn.disabled = false; btn.textContent = '🔪分解'; }
  }
}

function undoDecompose(groupId, memoId, cat) {
  const h = decompGroups[groupId];
  const resolvedMemoId = memoId || (h && h.memoId);
  const resolvedCat = cat || (h && h.cat);
  if (!resolvedMemoId || !resolvedCat) return;
  const memo = findMemo(resolvedMemoId);
  if (!memo) return;
  const arr = (((memo.organized || {}).categories || {})[resolvedCat]);
  if (!arr) return;
  const first = arr.findIndex((it) => it._dg === groupId);
  if (first === -1) return;
  const count = arr.filter((it) => it._dg === groupId).length;
  const dgOriginal = arr[first]._dgOriginal;
  const src = h ? h.original : { text: dgOriginal, due: arr[first].due, done: false, priority: arr[first].priority };
  const original = { ...src };
  delete original._dg;
  delete original._dgOriginal;
  arr.splice(first, count, original);
  if (h) delete decompGroups[groupId];
  saveMemos(memos);
  renderTodayTasks();
  renderDailyQuest();
  renderResult();
  toast('↩️ 元のタスクに戻しました');
}

function startItemEdit(memoId, cat, idx) {
  const memo = findMemo(memoId);
  const item = ((memo?.organized?.categories || {})[cat] || [])[idx];
  if (!item) return;
  const row = document.querySelector(`.edit-tap[data-edit-id="${memoId}"][data-edit-cat="${cat}"][data-edit-idx="${idx}"]`)?.closest('.today-task-row');
  if (!row) return;
  row.innerHTML = `
    <input class="item-edit-input" type="text" value="${esc(item.text)}">
    <button class="pill-btn primary item-edit-ok">保存</button>
    <button class="pill-btn item-edit-ng">取消</button>
  `;
  const input = row.querySelector('.item-edit-input');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  const save = () => {
    const newText = input.value.trim();
    if (newText && newText !== item.text) {
      item.text = newText;
      saveMemos(memos);
      toast('✏️ 更新しました');
    }
    renderTodayTasks();
    renderResult();
  };
  const cancel = () => renderTodayTasks();
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); save(); }
    if (ev.key === 'Escape') cancel();
  });
  row.querySelector('.item-edit-ok').addEventListener('click', save);
  row.querySelector('.item-edit-ng').addEventListener('click', cancel);
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
      <div class="story-text">${esc(getCurrentStory().text)}</div>
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
    try { new Notification('思考整理', { body: `期限が来ているタスクが ${due}件 あります`, icon: 'icons/icon-192.png' }); } catch {}
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
    setTimeout(() => showLevelUpScreen(cur.level, cur.title), 600);
  }
}

function showLevelUpScreen(level, title) {
  const existing = document.querySelector('.levelup-overlay');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'levelup-overlay';
  el.innerHTML = `
    <div class="levelup-rays"></div>
    <div class="levelup-label">LEVEL UP!</div>
    <div class="levelup-num">${level}</div>
    <div class="levelup-title">${esc(title)}</div>
    <div class="levelup-hint">タップで閉じる</div>`;
  document.body.appendChild(el);
  showConfetti(true);
  const dismiss = () => {
    el.style.animation = 'lvOverlayIn 0.3s ease reverse forwards';
    setTimeout(() => el.remove(), 300);
  };
  el.addEventListener('click', dismiss, { once: true });
  setTimeout(dismiss, 4000);
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

  // 討伐記録に追加（日付が変わったらリセット）
  const todayForDefeated = todayISO();
  if (gameStats.todayDefeatedDate !== todayForDefeated) {
    gameStats.todayDefeated = [];
    gameStats.todayDefeatedDate = todayForDefeated;
  }
  gameStats.todayDefeated = gameStats.todayDefeated || [];
  gameStats.todayDefeated.push({ text: item.text, xp: totalXP, bonus: bonus.type });
  saveGameStats(gameStats);

  attackEnemy(item);

  renderGameStats();
  renderDefeatedToday();
  renderCompanion();
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
const decompGroups = {}; // groupId → { memoId, cat, original } — 分解のundo用（メモリ内のみ）
const todayCollapseState = {}; // key → boolean (collapsed) — タスク一覧の折りたたみ状態

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
    if (btn.dataset.view === 'record') { renderTodayTasks(); renderDailyMission(); renderFocusCard(); }
    if (btn.dataset.view === 'game') { renderPomodoro(); renderDailyQuest(); renderBattle(); renderCompanion(); renderDefeatedToday(); }
    if (btn.dataset.view === 'history') renderHistory();
    if (btn.dataset.view === 'diary') renderDiaryView();
    if (btn.dataset.view === 'notes') renderNotesView();
    if (btn.dataset.view === 'calendar') renderCalendarView();
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

// 同義語マップ（意味が同じ言葉を同一キーに統一して重複判定の精度を上げる）
const SYNONYMS_MAP = [
  [/ミルク|みるく/g,                  '牛乳'],
  [/パソコン|ぱそこん|コンピューター/g, 'pc'],
  [/スマホ|すまほ/g,                   'スマートフォン'],
  [/ごはん|メシ|めし/g,               'ご飯'],
  [/ミーティング|みーてぃんぐ|mtg|打合せ|打合/g, '会議'],
  [/メール|eメール/g,                  'メール'],
  [/テレビ|てれび/g,                   'tv'],
  [/洗濯もの|せんたくもの/g,           '洗濯物'],
  [/コーヒー|こーひー/g,               'コーヒー'],
  [/ビール|びーる/g,                   'ビール'],
];

// 重複判定用にテキストを正規化（空白・記号・助詞を除去＋同義語統一）
function normalizeForMerge(text) {
  let t = String(text || '')
    .toLowerCase()
    .replace(/[\s、。・,.!！?？「」『』【】（）()〜~ー-]/g, '')
    .replace(/[をがはにへでのともやねよ]/g, '');
  for (const [pat, rep] of SYNONYMS_MAP) t = t.replace(pat, rep);
  return t;
}

// 新メモの項目を、既存の未完了項目と照合してまとめる（同カテゴリで正規化一致なら統合）
function mergeDuplicates(newMemo) {
  const newCats = (newMemo.organized && newMemo.organized.categories) || {};
  const rank = { high: 2, medium: 1 };
  let merged = 0;
  for (const key of Object.keys(newCats)) {
    const keep = [];
    for (const item of newCats[key]) {
      const norm = normalizeForMerge(item.text);
      let found = null;
      if (norm.length >= 2) {
        for (const m of memos) {
          const exItems = ((m.organized && m.organized.categories) || {})[key] || [];
          for (const ex of exItems) {
            if (!ex.done && normalizeForMerge(ex.text) === norm) { found = ex; break; }
          }
          if (found) break;
        }
      }
      if (found) {
        // 既存の項目に新しい情報（より近い期限・高い優先度）を反映
        if (item.due && (!found.due || item.due < found.due)) found.due = item.due;
        if ((rank[item.priority] || 0) > (rank[found.priority] || 0)) found.priority = item.priority;
        merged++;
      } else {
        keep.push(item);
      }
    }
    if (keep.length) newCats[key] = keep;
    else delete newCats[key];
  }
  return merged;
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
      workspace: data.organized.workspace || 'private',
    };
    // 同じような項目は既存とまとめる（重複を増やさない）
    const mergedCount = mergeDuplicates(memo);
    memos.unshift(memo);
    saveMemos(memos);

    // 日記に自動保存
    if (!diaries.some((d) => d.memoId === memo.id)) {
      diaries.unshift({
        id: 'diy_' + Date.now(),
        ts: memo.ts,
        date: diaryDateStr(new Date(memo.ts)),
        title: (memo.organized && memo.organized.title) || '音声メモ',
        text: memo.transcription || '',
        formatted: buildDiaryFormatted(memo),
        highlights: [],
        memoId: memo.id,
      });
      saveDiaries();
    }

    const prevBadges = [...(gameStats.badges || [])];
    gameStats.memoCount = (gameStats.memoCount || 0) + 1;
    saveGameStats(gameStats);
    checkAchievements(prevBadges);
    updateDailyMission('memosDone');

    liveEl.classList.add('hidden');
    currentResultId = memo.id;
    renderResult();
    renderTodayTasks();
    renderDailyQuest();
    setStatus('完了！保存しました', 'success');
    if (mergedCount > 0) setTimeout(() => toast(`似た項目 ${mergedCount}件を既存のメモとまとめました`), 700);
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
    const ws = guessWorkspace(memo);
    html += `<button class="pill-btn ws-toggle-btn ${ws}" data-action="toggle-ws" data-id="${memo.id}">${ws === 'work' ? '💼 仕事' : '🏠 プライベート'}</button>`;
    html += `<button class="pill-btn" data-action="append" data-id="${memo.id}">追記</button>`;
    html += `<button class="pill-btn" data-action="edit" data-id="${memo.id}">編集</button>`;
    const alreadyInDiary = diaries.some((d) => d.memoId === memo.id);
    html += `<button class="pill-btn${alreadyInDiary ? ' diary-added' : ''}" data-action="diary-save" data-id="${memo.id}">${alreadyInDiary ? '📔 日記済' : '📔 日記'}</button>`;
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
  renderNotesView();
}

// ===== カレンダービュー =====
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calSelected = new Date().toISOString().split('T')[0];

function getDueTasks() {
  const map = {};
  for (const memo of memos) {
    const cats = (memo.organized && memo.organized.categories) || {};
    for (const [cat, items] of Object.entries(cats)) {
      items.forEach((item, idx) => {
        if (item.due) {
          (map[item.due] = map[item.due] || []).push({ text: item.text, cat, memoId: memo.id, idx, done: item.done, priority: item.priority || null });
        }
      });
    }
  }
  return map;
}

function renderCalendarView() {
  const el = document.getElementById('calendarView');
  if (!el) return;
  const dueTasks = getDueTasks();
  const today = new Date().toISOString().split('T')[0];
  const y = calYear, m = calMonth;
  const firstDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const DOW = ['日','月','火','水','木','金','土'];
  const dowHtml = DOW.map((d, i) => `<div class="cal-dow${i===0?' sun':i===6?' sat':''}">${d}</div>`).join('');

  const cellHtml = cells.map((d) => {
    if (!d) return `<div class="cal-cell empty"></div>`;
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const tasks = dueTasks[dateStr] || [];
    const isToday = dateStr === today;
    const isSel = dateStr === calSelected;
    const isOverdue = !isToday && dateStr < today && tasks.some(t => !t.done);
    const dots = tasks.slice(0, 3).map(t =>
      `<span class="cal-dot${t.done?' done':''}${t.priority==='high'?' high':''}"></span>`
    ).join('') + (tasks.length > 3 ? `<span class="cal-dot-more">+${tasks.length-3}</span>` : '');
    return `<div class="cal-cell${isToday?' today':''}${isSel?' selected':''}${isOverdue?' overdue':''}" data-cal-date="${dateStr}">
      <span class="cal-day-num">${d}</span>
      ${tasks.length ? `<span class="cal-dot-row">${dots}</span>` : ''}
    </div>`;
  }).join('');

  let detailHtml = '';
  if (calSelected) {
    const tasks = dueTasks[calSelected] || [];
    const [sy, sm, sd] = calSelected.split('-');
    const dt = new Date(Number(sy), Number(sm)-1, Number(sd));
    const label = `${Number(sm)}月${Number(sd)}日（${WEEKDAYS[dt.getDay()]}）`;
    const rowsHtml = tasks.length
      ? tasks.map(t => `<div class="cal-task-row${t.done?' done':''}">
          <span class="cal-task-pri${t.priority==='high'?' high':t.priority==='medium'?' med':''}"></span>
          <span class="cal-task-text">${esc(t.text)}</span>
        </div>`).join('')
      : `<p class="cal-no-task">この日のタスクはありません</p>`;
    detailHtml = `<div class="cal-day-detail glass-card"><div class="cal-detail-head">${label}</div>${rowsHtml}</div>`;
  }

  el.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav-btn" id="calPrev">‹</button>
      <span class="cal-month-label">${y}年${m+1}月</span>
      <button class="cal-nav-btn" id="calNext">›</button>
    </div>
    <div class="cal-grid">${dowHtml}${cellHtml}</div>
    ${detailHtml}`;

  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendarView();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendarView();
  });
  el.querySelectorAll('[data-cal-date]').forEach(cell => {
    cell.addEventListener('click', () => { calSelected = cell.dataset.calDate; renderCalendarView(); });
  });
}

// ===== 日記 =====
let diaries = JSON.parse(localStorage.getItem(DIARY_KEY) || '[]');
function saveDiaries() { localStorage.setItem(DIARY_KEY, JSON.stringify(diaries)); }

const DIARY_CAT_LABELS = { tasks: 'タスク', shopping: '買い物', ideas: 'アイデア', reminders: 'リマインダー', notes: 'メモ' };
function buildDiaryFormatted(memo) {
  const organized = memo.organized || {};
  const cats = organized.categories || {};
  const parts = [];
  if (organized.summary) parts.push(organized.summary);
  for (const [cat, label] of Object.entries(DIARY_CAT_LABELS)) {
    const items = cats[cat] || [];
    if (items.length) parts.push(`【${label}】\n${items.map((i) => `・${i.text}`).join('\n')}`);
  }
  return parts.join('\n\n') || memo.transcription || '';
}

function diaryDateStr(d) {
  d = d || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDiaryDate(dateStr) {
  const [y, m, d] = (dateStr || diaryDateStr()).split('-');
  const dt = new Date(Number(y), Number(m)-1, Number(d));
  return `${y}年${m}月${d}日（${WEEKDAYS[dt.getDay()]}）`;
}

function shareDiaryEntry(id) {
  const entry = diaries.find((e) => e.id === id);
  if (!entry) return;
  const date = formatDiaryDate(entry.date);
  const title = entry.title || '日記';
  const content = entry.formatted || entry.text || '';
  const shareText = `${date}\n\n【${title}】\n\n${content}`;
  if (navigator.share) {
    navigator.share({ title, text: shareText }).catch(() => {});
  } else {
    navigator.clipboard.writeText(shareText).then(() => toast('📋 クリップボードにコピーしました')).catch(() => toast('共有に失敗しました'));
  }
}

function renderDiaryView() {
  const dateInput = document.getElementById('diaryDate');
  if (dateInput && !dateInput.value) dateInput.value = diaryDateStr();
  const listEl = document.getElementById('diaryList');
  const emptyEl = document.getElementById('diaryEmpty');
  if (!listEl) return;
  const sorted = [...diaries].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (sorted.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  listEl.innerHTML = sorted.map((entry) => {
    const highlights = (entry.highlights || []).map((h) => `<li>${esc(h)}</li>`).join('');
    return `<div class="diary-entry glass-card">
      <div class="diary-entry-head">
        <div>
          <div class="diary-entry-date">${formatDiaryDate(entry.date)}</div>
          ${entry.title ? `<div class="diary-entry-title">${esc(entry.title)}</div>` : ''}
        </div>
        <div class="diary-entry-btns">
          <button class="pill-btn diary-share-btn" data-diary-share="${entry.id}">共有</button>
          <button class="pill-btn danger diary-del-btn" data-diary-del="${entry.id}">削除</button>
        </div>
      </div>
      <p class="diary-entry-content">${esc(entry.formatted || entry.text || '').replace(/\n/g, '<br>')}</p>
      ${highlights ? `<ul class="diary-highlights">${highlights}</ul>` : ''}
    </div>`;
  }).join('');
}

function initDiaryEditor() {
  const saveBtn = document.getElementById('diarySaveBtn');
  const aiBtn = document.getElementById('diaryAiBtn');
  const aiResult = document.getElementById('diaryAiResult');

  if (saveBtn) saveBtn.addEventListener('click', () => {
    const text = (document.getElementById('diaryText')?.value || '').trim();
    const date = document.getElementById('diaryDate')?.value || diaryDateStr();
    const title = (document.getElementById('diaryTitle')?.value || '').trim();
    if (!text) { toast('内容を入力してください'); return; }
    diaries.unshift({ id: 'diy_' + Date.now(), ts: Date.now(), date, title, text, formatted: text, highlights: [] });
    saveDiaries();
    document.getElementById('diaryText').value = '';
    document.getElementById('diaryTitle').value = '';
    if (aiResult) { aiResult.innerHTML = ''; aiResult.classList.add('hidden'); }
    renderDiaryView();
    toast('📔 日記を保存しました');
  });

  if (aiBtn) aiBtn.addEventListener('click', async () => {
    const text = (document.getElementById('diaryText')?.value || '').trim();
    const date = document.getElementById('diaryDate')?.value || diaryDateStr();
    if (!text) { toast('内容を入力してください'); return; }
    aiBtn.disabled = true; aiBtn.textContent = '✨ まとめ中…';
    try {
      const res = await fetch('/api/diary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, date }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'エラー');
      if (aiResult) {
        const hi = (data.highlights || []).map((h) => `<li>${esc(h)}</li>`).join('');
        aiResult.innerHTML = `
          <div class="diary-ai-title">${esc(data.title || '')}</div>
          <p class="diary-ai-content">${esc(data.content || '').replace(/\n/g, '<br>')}</p>
          ${hi ? `<ul class="diary-highlights">${hi}</ul>` : ''}
          <button class="pill-btn primary diary-ai-save-btn">この内容で保存</button>`;
        aiResult.classList.remove('hidden');
        aiResult.querySelector('.diary-ai-save-btn').addEventListener('click', () => {
          diaries.unshift({ id: 'diy_' + Date.now(), ts: Date.now(), date, title: data.title || '', text, formatted: data.content || text, highlights: data.highlights || [] });
          saveDiaries();
          document.getElementById('diaryText').value = '';
          document.getElementById('diaryTitle').value = '';
          aiResult.innerHTML = ''; aiResult.classList.add('hidden');
          renderDiaryView();
          toast('📔 日記を保存しました');
        });
      }
    } catch (err) { toast(`エラー: ${err.message}`); }
    finally { aiBtn.disabled = false; aiBtn.textContent = '✨ AIでまとめる'; }
  });
}

function renderNotesView() {
  const el = document.getElementById('notesList');
  const emptyEl = document.getElementById('notesEmpty');
  if (!el) return;
  const relevant = memos.filter((m) => {
    const cats = (m.organized && m.organized.categories) || {};
    return (cats.notes || []).length > 0 || (cats.ideas || []).length > 0 || !!(m.organized && m.organized.summary);
  }).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  if (relevant.length === 0) {
    el.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  const byDay = {};
  relevant.forEach((m) => {
    const d = new Date(m.ts || 0);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    (byDay[key] = byDay[key] || []).push(m);
  });
  const DOW = ['日','月','火','水','木','金','土'];
  let html = '';
  Object.keys(byDay).sort().reverse().forEach((day) => {
    const [y, mo, d] = day.split('-');
    const dt = new Date(Number(y), Number(mo)-1, Number(d));
    html += `<div class="notes-day-group"><div class="notes-day-label">${mo}/${d}（${DOW[dt.getDay()]}）</div>`;
    byDay[day].forEach((m) => {
      const cats = (m.organized && m.organized.categories) || {};
      const notes = cats.notes || [];
      const ideas = cats.ideas || [];
      const summary = (m.organized && m.organized.summary) || '';
      const title = (m.organized && m.organized.title) || '無題';
      const t = new Date(m.ts || 0);
      const timeStr = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
      let body = '';
      if (summary) body += `<p class="notes-summary">${esc(summary)}</p>`;
      if (ideas.length) {
        body += `<div class="notes-section-label">💡 アイデア</div><ul class="notes-list">`;
        ideas.forEach((it) => { body += `<li>${esc(it.text)}</li>`; });
        body += `</ul>`;
      }
      if (notes.length) {
        body += `<ul class="notes-list notes-plain">`;
        notes.forEach((it) => { body += `<li>${esc(it.text)}</li>`; });
        body += `</ul>`;
      }
      html += `<div class="notes-card glass-card">
        <div class="notes-card-head"><span class="notes-card-title">${esc(title)}</span><span class="notes-card-time">${timeStr}</span></div>
        ${body}
      </div>`;
    });
    html += `</div>`;
  });
  el.innerHTML = html;
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
    const memoWs = guessWorkspace(memo);
    const cats = (memo.organized && memo.organized.categories) || {};
    for (const key of Object.keys(byCat)) {
      (cats[key] || []).forEach((item, idx) => {
        if (!item.done) {
          const itemWs = item.workspace || memoWs;
          if (currentWorkspace !== 'all' && itemWs !== currentWorkspace) return;
          byCat[key].push({ memoId: memo.id, cat: key, idx, text: item.text, due: item.due || null, priority: item.priority || null, ts: memo.ts || 0, workspace: itemWs, _dg: item._dg || null, _dgOriginal: item._dgOriginal || null });
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
  const seenDgGroups = new Set();
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
    // 分解済み（_dg付き）→グループの先頭アイテムにのみ↩️、未分解→🔪
    let actionBtn = '';
    if (t.cat === 'tasks') {
      if (t._dg && t._dgOriginal && !seenDgGroups.has(t._dg)) {
        seenDgGroups.add(t._dg);
        actionBtn = `<button class="decompose-btn" data-undo-dg="${t._dg}" data-undo-memo="${t.memoId}" data-undo-cat="${t.cat}" title="元のタスクに戻す">↩️</button>`;
      } else if (!t._dg) {
        actionBtn = `<button class="decompose-btn" data-decomp-id="${t.memoId}" data-decomp-cat="${t.cat}" data-decomp-idx="${t.idx}" title="AIでステップに分解">🔪</button>`;
      }
    }
    const starred = isFocused(t.text);
    const starBtn = `<button class="focus-star-btn${starred ? ' starred' : ''}" data-focus-id="${t.memoId}" data-focus-cat="${t.cat}" data-focus-text="${esc(t.text)}" title="フォーカスに追加">${starred ? '⭐' : '☆'}</button>`;
    const wsBtn = `<button class="item-ws-btn" data-iws-id="${t.memoId}" data-iws-cat="${t.cat}" data-iws-idx="${t.idx}" title="${t.workspace === 'work' ? 'プライベートに移動' : '仕事に移動'}">${t.workspace === 'work' ? '💼' : '🏠'}</button>`;
    const delBtn = `<button class="item-del-btn" data-idel-id="${t.memoId}" data-idel-cat="${t.cat}" data-idel-idx="${t.idx}" title="削除">✕</button>`;
    return `<div class="today-task-row">
      <input type="checkbox" data-id="${t.memoId}" data-cat="${t.cat}" data-idx="${t.idx}">
      <span class="today-task-body">${pri}<span class="today-task-text edit-tap" data-edit-id="${t.memoId}" data-edit-cat="${t.cat}" data-edit-idx="${t.idx}">${rep}${esc(t.text)}</span>${dueLabel}</span>
      ${wsBtn}${starBtn}${actionBtn}${delBtn}
    </div>`;
  };
  const card = (label, list, key) => {
    if (!list.length) return '';
    const sorted = list.sort(sortFn);
    const hasUrgent = sorted.some((t) => t.due && t.due <= today);
    // デフォルト: 期限なし5件以上は折りたたむ。ユーザー操作があればそれを優先
    if (todayCollapseState[key] === undefined) {
      todayCollapseState[key] = !hasUrgent && sorted.length >= 5;
    }
    const collapsed = todayCollapseState[key];
    const urgentCount = sorted.filter((t) => t.due && t.due < today).length;
    const todayCount = sorted.filter((t) => t.due === today).length;
    let badge = '';
    if (urgentCount) badge += `<span class="tc-badge overdue">${urgentCount}件期限切れ</span>`;
    else if (todayCount) badge += `<span class="tc-badge today">今日${todayCount}件</span>`;
    return `<div class="glass-card today-tasks-card${collapsed ? ' collapsed' : ''}" data-task-section="${key}">
      <div class="task-section-head">
        <div class="task-section-title"><span class="card-label">${label}</span><span class="tc-count">${sorted.length}</span>${badge}</div>
        <span class="task-section-chevron">${CHEVRON_SVG}</span>
      </div>
      <div class="task-section-body">${sorted.map(rowHtml).join('')}</div>
    </div>`;
  };
  // タスクは仕事系とその他で分割、他カテゴリはそのまま
  const work = byCat.tasks.filter((t) => taskTypeBonus(t.text).type === 'work');
  const otherTasks = byCat.tasks.filter((t) => taskTypeBonus(t.text).type !== 'work');
  todayTasksEl.classList.remove('hidden');
  todayTasksEl.innerHTML =
    card('💼 仕事', work, 'work') +
    card('🗒 タスク', otherTasks, 'tasks') +
    card('🔔 リマインダー', byCat.reminders, 'reminders') +
    card('🛒 買い物', byCat.shopping, 'shopping') +
    card('💡 アイデア', byCat.ideas, 'ideas') +
    card('📝 メモ', byCat.notes, 'notes');
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

  if (currentWorkspace !== 'all') {
    list = list.filter((m) => guessWorkspace(m) === currentWorkspace);
  }

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
              <button class="ws-badge-btn ${guessWorkspace(m)}" data-action="toggle-ws" data-id="${m.id}" title="ワークスペースを切り替え">${guessWorkspace(m) === 'work' ? '💼' : '🏠'}</button>
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

// ワークスペースタブ切替
document.getElementById('workspaceTabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ws]');
  if (!btn) return;
  currentWorkspace = btn.dataset.ws;
  localStorage.setItem(WORKSPACE_FILTER_KEY, currentWorkspace);
  renderWorkspaceTabs();
  renderTodayTasks();
  renderHistory();
  renderFocusCard();
});

document.addEventListener('click', (e) => {
  const sectionHead = e.target.closest('.task-section-head');
  if (sectionHead) {
    const card = sectionHead.closest('[data-task-section]');
    if (card) {
      const key = card.dataset.taskSection;
      todayCollapseState[key] = !card.classList.contains('collapsed');
      card.classList.toggle('collapsed');
    }
    return;
  }

  const iwsBtn = e.target.closest('[data-iws-id]');
  if (iwsBtn) {
    const memo = findMemo(iwsBtn.dataset.iwsId);
    const item = ((memo?.organized?.categories || {})[iwsBtn.dataset.iwsCat] || [])[Number(iwsBtn.dataset.iwsIdx)];
    if (item) {
      const cur = item.workspace || guessWorkspace(memo);
      item.workspace = cur === 'work' ? 'private' : 'work';
      saveMemos(memos);
      toast(item.workspace === 'work' ? '💼 仕事に移動しました' : '🏠 プライベートに移動しました');
      renderTodayTasks();
    }
    return;
  }

  const starBtn = e.target.closest('.focus-star-btn');
  if (starBtn) {
    toggleFocus(starBtn.dataset.focusId, starBtn.dataset.focusCat, starBtn.dataset.focusText);
    return;
  }

  const diaryShareBtn = e.target.closest('[data-diary-share]');
  if (diaryShareBtn) { shareDiaryEntry(diaryShareBtn.dataset.diaryShare); return; }

  const diaryDelBtn = e.target.closest('[data-diary-del]');
  if (diaryDelBtn) {
    diaries = diaries.filter((d) => d.id !== diaryDelBtn.dataset.diaryDel);
    saveDiaries();
    renderDiaryView();
    toast('削除しました');
    return;
  }

  const editTap = e.target.closest('.edit-tap[data-edit-id]');
  if (editTap) {
    startItemEdit(editTap.dataset.editId, editTap.dataset.editCat, Number(editTap.dataset.editIdx));
    return;
  }

  const idelBtn = e.target.closest('[data-idel-id]');
  if (idelBtn) {
    const memo = findMemo(idelBtn.dataset.idelId);
    if (!memo) return;
    const arr = ((memo.organized?.categories || {})[idelBtn.dataset.idelCat] || []);
    const idx = Number(idelBtn.dataset.idelIdx);
    if (idx >= 0 && idx < arr.length) {
      arr.splice(idx, 1);
      if (arr.length === 0) delete memo.organized.categories[idelBtn.dataset.idelCat];
      saveMemos(memos);
      toast('削除しました');
      renderTodayTasks();
      renderDailyQuest();
      renderResult();
    }
    return;
  }

  const undoDgBtn = e.target.closest('[data-undo-dg]');
  if (undoDgBtn) {
    undoDecompose(undoDgBtn.dataset.undoDg, undoDgBtn.dataset.undoMemo, undoDgBtn.dataset.undoCat);
    return;
  }

  const decompBtn = e.target.closest('[data-decomp-id]');
  if (decompBtn) {
    handleDecompose(decompBtn.dataset.decompId, decompBtn.dataset.decompCat, Number(decompBtn.dataset.decompIdx));
    return;
  }

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

  if (action === 'diary-save') {
    if (diaries.some((d) => d.memoId === memo.id)) { toast('すでに日記に追加済みです'); return; }
    diaries.unshift({
      id: 'diy_' + Date.now(),
      ts: memo.ts || Date.now(),
      date: diaryDateStr(new Date(memo.ts || Date.now())),
      title: (memo.organized && memo.organized.title) || '音声メモ',
      text: memo.transcription || '',
      formatted: buildDiaryFormatted(memo),
      highlights: [],
      memoId: memo.id,
    });
    saveDiaries();
    rerenderAll();
    toast('📔 日記に追加しました');
    return;
  }

  if (action === 'share') shareMemo(memo);
  if (action === 'todoist') addToTodoist(memo, btn);

  if (action === 'toggle-ws') {
    const current = guessWorkspace(memo);
    memo.workspace = current === 'work' ? 'private' : 'work';
    if (memo.organized) memo.organized.workspace = memo.workspace;
    saveMemos(memos);
    const label = memo.workspace === 'work' ? '💼 仕事に移動しました' : '🏠 プライベートに移動しました';
    toast(label);
    renderResult();
    renderHistory();
    renderTodayTasks();
    return;
  }

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
      await navigator.share({ title: o.title || '思考整理', text });
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
renderWorkspaceTabs();
renderTodayTasks();
renderGameStats();
renderDailyMission();
renderFocusCard();
renderPomodoro();
renderDailyQuest();
renderBattle();
renderCompanion();
renderDefeatedToday();
checkDueNotifications();
initDiaryEditor();

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

// ===== ホームのタスク：右スワイプで完了 =====
{
  let swEl = null, swCb = null, swStartX = 0, swStartY = 0, swAxisLocked = false;
  const SW_COMPLETE_THRESHOLD = 72;

  todayTasksEl.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.today-task-row');
    if (!row) return;
    const cb = row.querySelector('input[type="checkbox"]');
    if (!cb || cb.checked) return;
    swEl = row;
    swCb = cb;
    swStartX = e.touches[0].clientX;
    swStartY = e.touches[0].clientY;
    swAxisLocked = false;
  }, { passive: true });

  todayTasksEl.addEventListener('touchmove', (e) => {
    if (!swEl) return;
    const dx = e.touches[0].clientX - swStartX;
    const dy = e.touches[0].clientY - swStartY;
    if (!swAxisLocked) {
      if (Math.abs(dy) > Math.abs(dx)) { swEl = null; return; }
      swAxisLocked = true;
    }
    if (dx <= 0) return;
    e.preventDefault();
    const tx = Math.min(dx, SW_COMPLETE_THRESHOLD * 1.6);
    const alpha = Math.min(tx / SW_COMPLETE_THRESHOLD, 1) * 0.25;
    swEl.style.cssText = `transform:translateX(${tx}px);transition:none;background:rgba(74,222,128,${alpha})`;
  }, { passive: false });

  todayTasksEl.addEventListener('touchend', () => {
    if (!swEl) return;
    const match = swEl.style.transform.match(/[\d.]+/);
    const dx = match ? parseFloat(match[0]) : 0;
    if (dx >= SW_COMPLETE_THRESHOLD) {
      swEl.style.cssText = 'transform:translateX(110%);transition:transform 0.22s ease;background:rgba(74,222,128,0.2)';
      const cb = swCb;
      setTimeout(() => {
        if (!cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 160);
    } else {
      swEl.style.cssText = 'transform:translateX(0);transition:transform 0.22s ease';
    }
    swEl = null; swCb = null; swAxisLocked = false;
  });
}

// ===== PWA =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

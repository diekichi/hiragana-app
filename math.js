// === 足し算（たしざん）練習ツール ===

const MATH_STORAGE_KEY = 'math_progress';
const CLEAR_STREAK = 5; // 連続◯問正解でそのレベルクリア

// レベル定義（桁数で段階分け）
const LEVELS = [
  { id: 1, label: '1けた ＋ 1けた', a: [1, 9],   b: [1, 9]   },
  { id: 2, label: '2けた ＋ 1けた', a: [10, 99],  b: [1, 9]   },
  { id: 3, label: '2けた ＋ 2けた', a: [10, 99],  b: [10, 99] },
  { id: 4, label: '3けた ＋ 2けた', a: [100, 999],b: [10, 99] },
  { id: 5, label: '3けた ＋ 3けた', a: [100, 999],b: [100, 999] },
];

// --- 進捗管理 ---

function loadMathProgress() {
  try {
    return JSON.parse(localStorage.getItem(MATH_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveMathProgress(data) {
  localStorage.setItem(MATH_STORAGE_KEY, JSON.stringify(data));
}

function isLevelCleared(levelId) {
  const p = loadMathProgress();
  return !!(p[levelId] && p[levelId].cleared);
}

function markLevelCleared(levelId) {
  const p = loadMathProgress();
  if (!p[levelId]) p[levelId] = {};
  p[levelId].cleared = true;
  saveMathProgress(p);
}

// --- 画面切り替え ---

function showMathScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// --- 読み上げ ---

function mathSpeak(text) {
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// --- レベル選択画面 ---

function renderLevelSelect() {
  const container = document.getElementById('level-list');
  container.innerHTML = '';
  LEVELS.forEach(lv => {
    const cleared = isLevelCleared(lv.id);
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (cleared ? ' cleared' : '');
    btn.innerHTML = `<span class="level-name">Lv${lv.id}　${lv.label}</span>` +
      (cleared ? '<span class="level-star">⭐</span>' : '');
    btn.onclick = () => startLevel(lv.id);
    container.appendChild(btn);
  });
}

function goMathHome() {
  renderLevelSelect();
  showMathScreen('screen-level');
}

// --- 出題ロジック ---

let currentLevel = null;
let currentA = 0;
let currentB = 0;
let currentAnswer = 0;
let inputValue = '';
let streak = 0;
let answered = false; // 結果表示中フラグ

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startLevel(levelId) {
  currentLevel = LEVELS.find(l => l.id === levelId);
  streak = 0;
  document.getElementById('math-level-label').textContent =
    `Lv${currentLevel.id}　${currentLevel.label}`;
  showMathScreen('screen-math');
  nextProblem();
}

function nextProblem() {
  answered = false;
  inputValue = '';
  hideMathResult();

  currentA = randInt(currentLevel.a[0], currentLevel.a[1]);
  currentB = randInt(currentLevel.b[0], currentLevel.b[1]);
  currentAnswer = currentA + currentB;

  document.getElementById('problem-text').textContent =
    `${currentA} ＋ ${currentB} ＝ ?`;
  updateInputDisplay();
  renderStreak();

  document.getElementById('keypad').classList.remove('hidden');
  document.getElementById('answer-box').classList.remove('hidden');

  mathSpeak(`${currentA} たす ${currentB} は？`);
}

function renderStreak() {
  const el = document.getElementById('math-streak');
  el.innerHTML = '';
  for (let i = 0; i < CLEAR_STREAK; i++) {
    const dot = document.createElement('span');
    dot.className = 'mdot' + (i < streak ? ' filled' : '');
    el.appendChild(dot);
  }
}

// --- テンキー入力 ---

function pressKey(n) {
  if (answered) return;
  if (inputValue.length >= 5) return; // 桁数の上限
  inputValue += String(n);
  updateInputDisplay();
}

function clearKey() {
  if (answered) return;
  inputValue = '';
  updateInputDisplay();
}

function updateInputDisplay() {
  const box = document.getElementById('answer-box');
  box.textContent = inputValue === '' ? '?' : inputValue;
}

// --- 判定 ---

function submitAnswer() {
  if (answered) return;
  if (inputValue === '') return; // 未入力は無視

  answered = true;
  const guess = parseInt(inputValue, 10);
  const correct = guess === currentAnswer;

  document.getElementById('keypad').classList.add('hidden');

  if (correct) {
    streak++;
    renderStreak();
    showMathResult(true);
    if (streak >= CLEAR_STREAK) {
      const wasCleared = isLevelCleared(currentLevel.id);
      markLevelCleared(currentLevel.id);
      mathSpeak(`せいかい！レベル ${currentLevel.id} クリア！`);
      setTimeout(() => showLevelComplete(wasCleared), 1200);
    } else {
      mathSpeak(`せいかい！こたえは ${currentAnswer}`);
    }
  } else {
    streak = 0;
    renderStreak();
    showMathResult(false);
    mathSpeak(`ちがうよ。こたえは ${currentAnswer} だよ`);
  }
}

function showMathResult(correct) {
  const area = document.getElementById('math-result');
  const text = document.getElementById('math-result-text');
  area.classList.remove('hidden');
  if (correct) {
    area.className = 'result-area correct';
    text.innerHTML = `<span class="result-kana">${currentA} ＋ ${currentB} ＝ ${currentAnswer}</span><br>せいかい！`;
  } else {
    area.className = 'result-area wrong';
    text.innerHTML = `<span class="result-kana">${currentA} ＋ ${currentB} ＝ ${currentAnswer}</span><br>ちがうよ`;
  }
}

function hideMathResult() {
  const area = document.getElementById('math-result');
  area.classList.add('hidden');
  area.className = 'result-area hidden';
}

function showLevelComplete(wasAlreadyCleared) {
  const msg = wasAlreadyCleared
    ? `レベル ${currentLevel.id} クリア！\nよくできました！`
    : `レベル ${currentLevel.id} クリア！⭐\nはじめてクリア！すごい！`;
  document.getElementById('math-complete-message').innerHTML = msg.replace(/\n/g, '<br>');
  showMathScreen('screen-math-complete');
}

// --- 起動 ---

renderLevelSelect();

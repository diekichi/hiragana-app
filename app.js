const WORKER_URL = 'https://long-dew-0c82.diekichi77.workers.dev';

// 五十音データ（行ごと）
const KANA_ROWS = [
  ['ぱ','ば','だ','ざ','が','わ','ら','ま','は','な','た','さ','か','あ'],
  ['ぴ','び','ぢ','じ','ぎ','　','り','み','ひ','に','ち','し','き','い'],
  ['ぷ','ぶ','づ','ず','ぐ','を','る','む','ふ','ぬ','つ','す','く','う'],
  ['ぺ','べ','で','ぜ','げ','　','れ','め','へ','ね','て','せ','け','え'],
  ['ぽ','ぼ','ど','ぞ','ご','ん','ろ','も','ほ','の','と','そ','こ','お'],
];

const KATAKANA_ROWS = [
  ['パ','バ','ダ','ザ','ガ','ワ','ラ','マ','ハ','ナ','タ','サ','カ','ア'],
  ['ピ','ビ','ヂ','ジ','ギ','　','リ','ミ','ヒ','ニ','チ','シ','キ','イ'],
  ['プ','ブ','ヅ','ズ','グ','ヲ','ル','ム','フ','ヌ','ツ','ス','ク','ウ'],
  ['ペ','ベ','デ','ゼ','ゲ','　','レ','メ','ヘ','ネ','テ','セ','ケ','エ'],
  ['ポ','ボ','ド','ゾ','ゴ','ン','ロ','モ','ホ','ノ','ト','ソ','コ','オ'],
];

const ALL_KANA = KANA_ROWS.flat().filter(k => k.trim() !== '');
const ALL_KATAKANA = KATAKANA_ROWS.flat().filter(k => k.trim() !== '');

const STORAGE_KEY = 'hiragana_progress';
const KATAKANA_STORAGE_KEY = 'katakana_progress';
const STREAK_TO_MASTER = 3;
const BATCH_SIZE = 4;

// --- データ管理 ---

let currentCharset = 'hiragana'; // 'hiragana' | 'katakana'

function getStorageKey() {
  return currentCharset === 'katakana' ? KATAKANA_STORAGE_KEY : STORAGE_KEY;
}

function getAllKana() {
  return currentCharset === 'katakana' ? ALL_KATAKANA : ALL_KANA;
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey())) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  localStorage.setItem(getStorageKey(), JSON.stringify(data));
}

function getKanaData(kana) {
  const progress = loadProgress();
  return progress[kana] || { streak: 0, mastered: false };
}

function updateKana(kana, correct) {
  const progress = loadProgress();
  if (!progress[kana]) progress[kana] = { streak: 0, mastered: false };
  const d = progress[kana];
  if (correct) {
    d.streak = (d.streak || 0) + 1;
    if (d.streak >= STREAK_TO_MASTER) {
      d.streak = STREAK_TO_MASTER;
      d.mastered = true;
    }
  } else {
    d.streak = Math.max(0, (d.streak || 0) - 1);
    if (d.streak < STREAK_TO_MASTER) d.mastered = false;
  }
  saveProgress(progress);
}

function getMasteredList() {
  const progress = loadProgress();
  return getAllKana().filter(k => progress[k] && progress[k].mastered);
}

function getUnmasteredList() {
  const progress = loadProgress();
  return getAllKana().filter(k => !(progress[k] && progress[k].mastered));
}

// --- 画面切り替え ---

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goHome() {
  renderHome();
  showScreen('screen-home');
}

// --- ホーム画面 ---

function renderHome() {
  const hiProgress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  const katProgress = JSON.parse(localStorage.getItem(KATAKANA_STORAGE_KEY)) || {};
  const hiMastered = ALL_KANA.filter(k => hiProgress[k] && hiProgress[k].mastered).length;
  const katMastered = ALL_KATAKANA.filter(k => katProgress[k] && katProgress[k].mastered).length;
  document.getElementById('hiragana-progress').textContent = `ひらがな：${hiMastered}／${ALL_KANA.length}`;
  document.getElementById('katakana-progress').textContent = `カタカナ：${katMastered}／${ALL_KATAKANA.length}`;

  const hiMapEl = document.getElementById('hiragana-map');
  hiMapEl.innerHTML = '';
  renderKanaMap(hiMapEl, KANA_ROWS, hiProgress);

  const katMapEl = document.getElementById('katakana-map');
  katMapEl.innerHTML = '';
  renderKanaMap(katMapEl, KATAKANA_ROWS, katProgress);
}

function renderKanaMap(container, rows, progress) {
  rows.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kana-row';
    row.forEach(k => {
      const cell = document.createElement('div');
      if (k.trim() === '') {
        cell.className = 'kana-cell empty';
      } else {
        const d = progress[k] || { streak: 0, mastered: false };
        cell.className = 'kana-cell' + (d.mastered ? ' mastered' : '');
        cell.textContent = k;
        if (!d.mastered && d.streak > 0) {
          const dots = document.createElement('span');
          dots.className = 'streak-mini';
          dots.textContent = '●'.repeat(d.streak);
          cell.appendChild(dots);
        }
        cell.addEventListener('click', () => speakKana(k));
      }
      rowEl.appendChild(cell);
    });
    container.appendChild(rowEl);
  });
}

// --- 音声読み上げ ---

function speakKana(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.8;
  window.speechSynthesis.speak(utterance);
}

function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.85;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

// --- モード管理 ---

let currentMode = null; // 'quiz' | 'practice' | 'review'
let currentBatch = [];
let currentKana = null;
let lastKana = null;
let waitingForNext = false;
let reviewQueue = [];

function startHiraganaPractice() { currentCharset = 'hiragana'; startPractice(); }
function startHiraganaReview()   { currentCharset = 'hiragana'; startReview(); }
function startKatakanaPractice() { currentCharset = 'katakana'; startPractice(); }
function startKatakanaReview()   { currentCharset = 'katakana'; startReview(); }

function startPractice() {
  const unmastered = getUnmasteredList();
  const label = currentCharset === 'katakana' ? 'カタカナ' : 'ひらがな';
  if (unmastered.length === 0) {
    showComplete(`${label} ぜんぶ おぼえたよ！\nすごい！`);
    return;
  }
  currentMode = 'practice';
  currentBatch = shuffle(unmastered).slice(0, BATCH_SIZE);
  document.getElementById('mode-label').textContent = `${label} れんしゅう：` + currentBatch.join(' ');
  showScreen('screen-quiz');
  nextQuestion();
}

function startReview() {
  const mastered = getMasteredList();
  const label = currentCharset === 'katakana' ? 'カタカナ' : 'ひらがな';
  if (mastered.length === 0) {
    goHome();
    return;
  }
  currentMode = 'review';
  reviewQueue = shuffle([...mastered]);
  document.getElementById('mode-label').textContent = `${label} かくにん`;
  showScreen('screen-quiz');
  nextQuestion();
}

// --- 出題 ---

function nextQuestion() {
  waitingForNext = false;
  hideResult();
  hideChoices();

  if (currentMode === 'practice') {
    const batchMasteredCount = currentBatch.filter(k => getKanaData(k).mastered).length;
    if (batchMasteredCount === currentBatch.length) {
      const names = currentBatch.join('・');
      showComplete(`れんしゅう おわり！\n「${names}」\nおぼえたよ！`);
      return;
    }
    const practicePool = currentBatch.length > 1 ? currentBatch.filter(k => k !== lastKana) : currentBatch;
    currentKana = practicePool[Math.floor(Math.random() * practicePool.length)];
    document.getElementById('batch-progress').textContent =
      `${batchMasteredCount} / ${currentBatch.length} ○`;
  } else if (currentMode === 'review') {
    if (reviewQueue.length === 0) {
      const mastered = getMasteredList();
      if (mastered.length === getAllKana().length) {
        showComplete('ぜんぶ おぼえたよ！\nすごい！');
      } else {
        showComplete(`かくにん おわり！\nおぼえてる もじ：${mastered.length} こ`);
      }
      return;
    }
    currentKana = reviewQueue.shift();
    document.getElementById('batch-progress').textContent =
      `のこり ${reviewQueue.length + 1} もじ`;
  }

  lastKana = currentKana;
  displayKana(currentKana);
  showMicArea();
}

function displayKana(kana) {
  const el = document.getElementById('kana-display');
  el.textContent = kana;
  el.classList.remove('hidden');
  const d = getKanaData(kana);
  renderStreakDots(d.streak);
}

function renderStreakDots(streak) {
  const el = document.getElementById('streak-dots');
  el.innerHTML = '';
  for (let i = 0; i < STREAK_TO_MASTER; i++) {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i < streak ? ' filled' : '');
    el.appendChild(dot);
  }
}

// --- 音声認識 ---

function showMicArea() {
  document.getElementById('mic-area').classList.remove('hidden');
  document.getElementById('listening-msg').classList.add('hidden');
  document.getElementById('mic-btn').disabled = false;
}

function hideMicArea() {
  document.getElementById('mic-area').classList.add('hidden');
}

// カタカナ→ひらがな変換
function toHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// 音声認識が漢字・数字で返した場合の対応表
const KANJI_TO_KANA = {
  // あ行
  '亜':'あ', '阿':'あ', '吾':'あ',
  '居':'い', '意':'い', '以':'い', '位':'い', '伊':'い', '医':'い',
  '有':'う', '宇':'う', '卯':'う',
  '絵':'え', '江':'え', '笑':'え', '栄':'え',
  '御':'お', '尾':'お', '緒':'お',
  // か行
  '花':'か', '夏':'か', '歌':'か', '菓':'か', '課':'か', '蚊':'か', '下':'か', '過':'か',
  '木':'き', '気':'き', '機':'き', '起':'き', '記':'き', '期':'き', '基':'き', '来':'き',
  '九':'く', '句':'く', '区':'く', '苦':'く', '口':'く',
  '毛':'け', '怪':'け',
  '子':'こ', '個':'こ', '古':'こ', '湖':'こ', '故':'こ', '声':'こ', '粉':'こ',
  // さ行
  '差':'さ', '左':'さ', '佐':'さ', '砂':'さ', '咲':'さ',
  '死':'し', '四':'し', '詩':'し', '師':'し', '指':'し', '試':'し', '塩':'し',
  '寿':'す', '素':'す', '巣':'す', '酢':'す', '数':'す',
  '背':'せ', '瀬':'せ', '世':'せ', '制':'せ',
  '粗':'そ', '側':'そ', '祖':'そ',
  // た行
  '多':'た', '他':'た', '太':'た', '田':'た',
  '知':'ち', '千':'ち', '地':'ち', '智':'ち', '茶':'ち',
  '津':'つ', '爪':'つ',
  '手':'て', '照':'て', '天':'て',
  '都':'と', '戸':'と', '止':'と', '途':'と',
  // な行
  '名':'な', '奈':'な', '那':'な', '並':'な',
  '荷':'に', '二':'に', '丹':'に', '虹':'に',
  '根':'ね', '値':'ね', '音':'ね',
  '野':'の', '乃':'の',
  // は行
  '葉':'は', '波':'は', '端':'は', '母':'は',
  '日':'ひ', '比':'ひ', '非':'ひ', '火':'ひ',
  '不':'ふ', '風':'ふ', '府':'ふ', '富':'ふ', '布':'ふ',
  '辺':'へ', '部':'へ',
  '保':'ほ', '法':'ほ', '穂':'ほ', '星':'ほ', '本':'ほ',
  // ま行
  '真':'ま', '又':'ま', '馬':'ま', '摩':'ま',
  '見':'み', '身':'み', '美':'み', '実':'み', '三':'み', '耳':'み',
  '夢':'む', '無':'む', '務':'む', '霧':'む',
  '目':'め', '芽':'め', '眼':'め', '女':'め',
  '物':'も', '者':'も', '模':'も',
  // や行
  '矢':'や', '屋':'や',
  '由':'ゆ', '湯':'ゆ',
  '与':'よ', '余':'よ', '代':'よ', '夜':'よ',
  // ら行
  '等':'ら', '裸':'ら',
  '利':'り', '里':'り', '理':'り',
  '留':'る', '流':'る', '瑠':'る',
  '礼':'れ', '令':'れ',
  '路':'ろ', '呂':'ろ', '炉':'ろ',
  // わ行
  '和':'わ', '話':'わ', '輪':'わ',
  // 数字
  '1':'い', '１':'い',
  '2':'に', '２':'に',
  '3':'み', '３':'み',
  '4':'し', '４':'し',
  '5':'こ', '５':'こ',
  '6':'む', '６':'む',
  '7':'な', '７':'な',
  '8':'は', '８':'は',
  '9':'く', '９':'く',
  // アルファベット（Whisperが文字名で返す場合 例: ぴ→P）
  'P':'ぴ', 'p':'ぴ',
  'B':'び', 'b':'び',
  'C':'し', 'c':'し',
  'G':'じ', 'g':'じ',
  'K':'け', 'k':'け',
  'T':'て', 't':'て',
  'Z':'ぜ', 'z':'ぜ',
  'O':'お', 'o':'お',
  'Ｐ':'ぴ', 'Ｂ':'び', 'Ｃ':'し', 'Ｇ':'じ', 'Ｋ':'け', 'Ｔ':'て', 'Ｚ':'ぜ', 'Ｏ':'お',
};

// Whisperが濁音・半濁音を清音で認識してしまうケースの対応マップ
const HOMOPHONE_MAP = {
  'ぢ': 'じ', 'づ': 'ず', 'を': 'お',
  'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
  'ざ': 'さ', 'ぜ': 'せ', 'ぞ': 'そ',
  'だ': 'た', 'で': 'て', 'ど': 'と',
  'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
  'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
};

function normalizeRecognition(text) {
  let result = toHiragana(text.trim());
  result = [...result].map(ch => KANJI_TO_KANA[ch] || ch).join('');
  return result;
}

function getBaseKana(kana) {
  return HOMOPHONE_MAP[kana] || kana;
}

async function startListening() {
  window.speechSynthesis.cancel();

  const micBtn = document.getElementById('mic-btn');
  const listeningMsg = document.getElementById('listening-msg');
  micBtn.disabled = true;
  listeningMsg.classList.remove('hidden');
  listeningMsg.textContent = 'きいてるよ...';

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });
  } catch (e) {
    listeningMsg.textContent = '';
    showMicArea();
    return;
  }

  const recorder = new MediaRecorder(stream);
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

  recorder.start();
  listeningMsg.textContent = '🎤 きいてるよ...（2びょう）';

  await new Promise(resolve => setTimeout(resolve, 2000));
  recorder.stop();
  stream.getTracks().forEach(t => t.stop());

  listeningMsg.textContent = 'んー...';

  await new Promise(resolve => { recorder.onstop = resolve; });

  const audioBlob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'ja');
  formData.append('response_format', 'text');

  let transcript = null;
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const text = (await res.text()).trim();
      transcript = normalizeRecognition(text);
      listeningMsg.textContent = '「' + transcript + '」';
    }
  } catch (e) {
    // ネットワークエラー時は再チャレンジ
  }

  hideMicArea();
  listeningMsg.textContent = 'きいてるよ...';

  const cleaned = transcript ? transcript.replace(/[。、！？\s.,!?ー・]/g, '') : '';
  const isNoise = !cleaned || cleaned.length > 6;

  const compareKana = currentCharset === 'katakana' ? toHiragana(currentKana) : currentKana;
  const baseTarget = getBaseKana(compareKana);
  const transcriptBase = [...cleaned].map(ch => getBaseKana(ch)).join('');

  if (!isNoise && transcriptBase.includes(baseTarget)) {
    judgeAnswer(currentKana, false, transcript);
  } else if (!isNoise) {
    judgeAnswer(transcript, false, transcript);
  } else {
    showMicArea();
  }
}

function hideChoices() {
  const area = document.getElementById('choices-area');
  area.classList.add('hidden');
  area.innerHTML = '';
}

// --- 正誤判定 ---

function judgeAnswer(answer, fromChoice, heard) {
  const correct = answer === currentKana;
  updateKana(currentKana, correct);

  if (correct) {
    const d = getKanaData(currentKana);
    renderStreakDots(d.streak);
    showResult(true, currentKana, d.mastered, heard);
    speak(`せいかい！これは ${currentKana} だよ`);
  } else {
    renderStreakDots(0);
    showResult(false, currentKana, false, heard);
    speak(`ちがうよ。これは ${currentKana} だよ`);
  }
}

function showResult(correct, kana, newlyMastered, heard) {
  waitingForNext = true;
  const area = document.getElementById('result-area');
  const text = document.getElementById('result-text');
  area.classList.remove('hidden');

  const heardLine = heard ? `<br><span style="font-size:0.75rem;color:#888;">「${heard}」ときこえたよ</span>` : '';

  if (correct) {
    area.className = 'result-area correct';
    if (newlyMastered) {
      text.innerHTML = `<span class="result-kana">${kana}</span><br>○ おぼえた！${heardLine}`;
    } else {
      text.innerHTML = `<span class="result-kana">${kana}</span><br>せいかい！${heardLine}`;
    }
  } else {
    area.className = 'result-area wrong';
    text.innerHTML = `<span class="result-kana">${kana}</span><br>ちがうよ${heardLine}`;
  }
}

function hideResult() {
  const area = document.getElementById('result-area');
  area.classList.add('hidden');
  area.className = 'result-area hidden';
}

// --- 完了画面 ---

function showComplete(message) {
  document.getElementById('complete-message').innerHTML =
    message.replace(/\n/g, '<br>');
  showScreen('screen-complete');
}

// --- リセット ---

function confirmReset() {
  if (confirm('しんちょくを ぜんぶ リセットしますか？')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(KATAKANA_STORAGE_KEY);
    renderHome();
  }
}

// --- ユーティリティ ---

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Chrome チェック ---

function checkBrowser() {
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const notice = document.getElementById('chrome-notice');
  if (isChrome) notice.style.display = 'none';
}

// --- 起動 ---

checkBrowser();
renderHome();

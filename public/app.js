const PAGES = ['page1', 'page2', 'page3', 'page4', 'page5', 'page6', 'page7', 'page8'];
const PAGE_THEMES = {
  1: 'theme-home',
  2: 'theme-action-1',
  3: 'theme-action-2',
  4: 'theme-rule-result',
  5: 'theme-action-3',
  6: 'theme-action-3',
  7: 'theme-action-3',
  8: 'theme-rule-result'
};
const CHOICES = [
  'ตะโกนบอกคนในบ้าน',
  'คลานต่ำ',
  'เปิดประตูออกจากห้อง',
  'โทรแจ้ง 199',
  'ไปหยิบโทรศัพท์, ของมีค่า'
];

const state = {
  page: 1,
  participantName: '',
  sessionId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
  selected: [],
  secondsRemaining: 20,
  timerId: null,
  submitted: false
};

const timerDisplay = document.getElementById('timerDisplay');
const timerWrap = document.getElementById('timerWrap');
const participantInput = document.getElementById('participantName');
const startBtn = document.getElementById('startBtn');
const beginQuizBtn = document.getElementById('beginQuizBtn');
const restartBtn = document.getElementById('restartBtn');
const phoneFrame = document.getElementById('phoneFrame');
const pageVideoBg = document.getElementById('pageVideoBg');

function applyPageTheme(pageNumber) {
  const allThemes = Object.values(PAGE_THEMES);
  phoneFrame.classList.remove(...allThemes);
  phoneFrame.classList.add(PAGE_THEMES[pageNumber]);

  const shouldShowVideo = pageNumber >= 5 && pageNumber <= 7;
  pageVideoBg.classList.toggle('hidden', !shouldShowVideo);

  if (shouldShowVideo) {
    const playPromise = pageVideoBg.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  } else {
    pageVideoBg.pause();
    pageVideoBg.currentTime = 0;
  }
}

function showPage(pageNumber) {
  state.page = pageNumber;
  PAGES.forEach((pageId, index) => {
    const page = document.getElementById(pageId);
    page.classList.toggle('active', index === pageNumber - 1);
  });
  timerWrap.classList.toggle('hidden', !(pageNumber >= 5 && pageNumber <= 7));
  applyPageTheme(pageNumber);
}

function formatTime(seconds) {
  return `00:${String(Math.max(0, seconds)).padStart(2, '0')}`;
}

function updateTimer() {
  timerDisplay.textContent = formatTime(state.secondsRemaining);
}

function renderChoices(rank) {
  const container = document.getElementById(`rank${rank}Choices`);
  const available = CHOICES.filter((choice) => !state.selected.includes(choice));
  container.innerHTML = '';

  available.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'choice-btn';
    button.type = 'button';
    button.textContent = choice;
    button.addEventListener('click', () => handleSelectChoice(rank, choice));
    container.appendChild(button);
  });
}

function renderAllChoicePages() {
  renderChoices(1);
  renderChoices(2);
  renderChoices(3);
}

function goToNextNarrative(event) {
  const next = Number(event.currentTarget.dataset.next);
  showPage(next);
}

document.querySelectorAll('[data-next]').forEach((btn) => {
  btn.addEventListener('click', goToNextNarrative);
});

startBtn.addEventListener('click', () => {
  const value = participantInput.value.trim();
  if (!value) {
    alert('กรุณากรอกชื่อก่อนเริ่ม');
    participantInput.focus();
    return;
  }
  state.participantName = value;
  showPage(2);
});

participantInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startBtn.click();
  }
});

beginQuizBtn.addEventListener('click', () => {
  state.selected = [];
  state.secondsRemaining = 20;
  state.submitted = false;
  updateTimer();
  renderAllChoicePages();
  showPage(5);
  startTimer();
});

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.secondsRemaining -= 1;
    updateTimer();
    if (state.secondsRemaining <= 0) {
      clearInterval(state.timerId);
      state.secondsRemaining = 0;
      updateTimer();
      finishQuiz(false);
    }
  }, 1000);
}

function handleSelectChoice(rank, choice) {
  const expectedRank = state.selected.length + 1;
  if (rank !== expectedRank) return;

  state.selected.push(choice);

  if (rank < 3) {
    renderAllChoicePages();
    showPage(rank + 5);
    return;
  }

  clearInterval(state.timerId);
  finishQuiz(true);
}

function getScores() {
  const rank1Choice = state.selected[0] || 'ไม่ได้เลือก';
  const rank2Choice = state.selected[1] || 'ไม่ได้เลือก';
  const rank3Choice = state.selected[2] || 'ไม่ได้เลือก';

  const rank1Score = rank1Choice === 'ตะโกนบอกคนในบ้าน' ? 1 : 0;
  const rank2Score = rank2Choice === 'เปิดประตูออกจากห้อง' ? 1 : 0;
  const rank3Score = rank3Choice === 'คลานต่ำ' ? 1 : 0;
  const totalScore = rank1Score + rank2Score + rank3Score;

  return {
    rank1Choice,
    rank2Choice,
    rank3Choice,
    rank1Score,
    rank2Score,
    rank3Score,
    totalScore
  };
}

async function finishQuiz(completedInTime) {
  if (state.submitted) return;
  state.submitted = true;

  const scores = getScores();
  const resultHeading = document.getElementById('resultHeading');
  const resultDescription = document.getElementById('resultDescription');
  const resultAdvice = document.getElementById('resultAdvice');
  const reviewName = document.getElementById('reviewName');
  const reviewScore = document.getElementById('reviewScore');
  const reviewTime = document.getElementById('reviewTime');

  const isTimeout = !completedInTime;
  const isSurvivor = scores.totalScore === 3;

  if (isTimeout) {
    resultHeading.textContent = 'หมดเวลา';
    resultDescription.textContent = 'คุณใช้เวลาครบ 20 วินาทีแล้ว ระบบได้บันทึกคำตอบที่คุณเลือกไว้และสรุปแนวทางที่ควรทำเมื่อเกิดไฟไหม้ให้ด้านล่าง';
  } else {
    resultHeading.textContent = isSurvivor ? 'คุณรอดแล้ว!' : 'เกือบตุยแล้ว!';
    resultDescription.textContent = isSurvivor
      ? 'หากคุณเจอสถานการณ์ไฟไหม้ คุณจะต้องปฏิบัติดังนี้'
      : 'หากคุณเจอสถานการณ์ไฟไหม้ คุณควรปฏิบัติดังนี้';
  }

  resultAdvice.innerHTML = '';
  const adviceItems = [
    'ตะโกนบอกคนในบ้าน',
    'เปิดประตูออกจากห้อง',
    'คลานต่ำ'
  ];
  adviceItems.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    resultAdvice.appendChild(li);
  });

  reviewName.textContent = state.participantName;
  reviewScore.textContent = String(scores.totalScore);
  reviewTime.textContent = `${20 - state.secondsRemaining} วินาที`;

  try {
    await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantName: state.participantName,
        sessionId: state.sessionId,
        rank1Choice: scores.rank1Choice,
        rank2Choice: scores.rank2Choice,
        rank3Choice: scores.rank3Choice,
        secondsRemaining: state.secondsRemaining,
        completedInTime
      })
    });
  } catch (error) {
    console.error('Submit error:', error);
  }

  showPage(8);
}

restartBtn.addEventListener('click', () => {
  clearInterval(state.timerId);
  state.page = 1;
  state.participantName = '';
  state.sessionId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  state.selected = [];
  state.secondsRemaining = 20;
  state.submitted = false;
  participantInput.value = '';
  updateTimer();
  showPage(1);
});

updateTimer();
renderAllChoicePages();
showPage(1);

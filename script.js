let csvData = [];
let questions = [];
let currentIndex = 0;
let answers = [];
let selectedOption = null;
let startTime;

async function startTest() {
  const csvFile = document.getElementById('csv-select').value;
  const topic = document.getElementById('topic-select').value;
  const count = parseInt(document.getElementById('question-count').value);

  await loadCSV(csvFile);
  generateQuestions(topic, count);
  startTime = new Date();

  document.getElementById('input-screen').classList.add('hidden');
  document.getElementById('test-screen').classList.remove('hidden');
  showQuestion();
}

async function loadCSV(filename) {
  const response = await fetch(filename);
  const text = await response.text();
  csvData = text.trim().split('\n').slice(1).map(line => {
    const [word, numId] = line.split(',');
    return { word: word.trim(), numId: parseInt(numId.trim()) };
  });
}

function generateQuestions(topic, count) {
  const used = new Set();

  while (questions.length < count) {
    const entry = csvData[Math.floor(Math.random() * csvData.length)];
    if (used.has(entry.word)) continue;
    used.add(entry.word);

    let qType = topic === 'mixed' ? (Math.random() < 0.5 ? 'synonyms' : 'antonyms') : topic;
    const correctGroup = csvData.filter(e =>
      qType === 'synonyms' ? e.numId === entry.numId && e.word !== entry.word :
      e.numId === -entry.numId
    );
    if (correctGroup.length === 0) continue;

    const correct = correctGroup[Math.floor(Math.random() * correctGroup.length)];
    const distractors = csvData.filter(e => e.word !== entry.word && e.word !== correct.word);
    shuffleArray(distractors);

    const options = shuffleArray([correct.word, ...distractors.slice(0, 3).map(e => e.word)]);
    questions.push({ word: entry.word, correct: correct.word, options, type: qType });
  }
}

function showQuestion() {
  const q = questions[currentIndex];
  document.getElementById('question-number').innerText = `Question ${currentIndex + 1}`;
  document.getElementById('question-text').innerText = `Choose the ${q.type.slice(0, -1)} of "${q.word}"`;

  const container = document.getElementById('options-container');
  container.innerHTML = '';
  document.getElementById('feedback').innerText = '';
  document.getElementById('next-btn').disabled = true;
  selectedOption = null;

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.innerText = opt;
    btn.onclick = () => {
      if (answers[currentIndex]) return;
      document.querySelectorAll('#options-container button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedOption = opt;
    };
    container.appendChild(btn);
  });
}

function saveAnswer() {
  if (!selectedOption || answers[currentIndex]) return;

  const q = questions[currentIndex];
  const isCorrect = selectedOption === q.correct;
  answers[currentIndex] = { selected: selectedOption, correct: q.correct, isCorrect };

  document.querySelectorAll('#options-container button').forEach(btn => {
    if (btn.innerText === q.correct) btn.classList.add('correct');
    else if (btn.innerText === selectedOption) btn.classList.add('wrong');
    btn.disabled = true;
  });

  document.getElementById('feedback').innerText = isCorrect
    ? 'Very Good! Your answer is correct!'
    : 'Oops! That was wrong!';
  document.getElementById('next-btn').disabled = false;

  // Auto-submit if all questions are answered
  if (answers.filter(a => a).length === questions.length) submitTest();
}

function nextQuestion() {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    showQuestion();
  }
}

function submitTest() {
  document.getElementById('test-screen').classList.add('hidden');
  document.getElementById('result-screen').classList.remove('hidden');

  const total = questions.length;
  const correct = answers.filter(a => a?.isCorrect).length;
  const wrong = answers.filter(a => a && !a.isCorrect).length;
  const unattempted = total - answers.length;

  const endTime = new Date();
  const seconds = Math.floor((endTime - startTime) / 1000);
  const timeTaken = `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;

  document.getElementById('result-summary').innerText =
    `Correct: ${correct}\nWrong: ${wrong}\nUnattempted: ${unattempted}\nTime Taken: ${timeTaken}`;
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

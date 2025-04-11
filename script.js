let csvData = [];
let currentQuestionIndex = 0;
let selectedMode = "synonym";
let selectedCSVUrl = "";
let questions = [];
let userAnswers = [];
let totalQuestions = 10;

async function loadCSVList() {
  const response = await fetch("https://raw.githubusercontent.com/amzt-pixel/Vocabulary/main/csv-list.json");
  const list = await response.json();
  const select = document.getElementById("csvSelector");

  list.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.url;
    option.textContent = item.name;
    select.appendChild(option);
  });
}

document.getElementById("csvSelector").addEventListener("change", async (e) => {
  selectedCSVUrl = e.target.value;
  if (selectedCSVUrl) {
    await loadCSV(selectedCSVUrl);
  }
});

document.getElementById("topicSelector").addEventListener("change", (e) => {
  selectedMode = e.target.value;
});

async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const rows = text.trim().split("\n").slice(1); // skip header
  csvData = rows.map((row) => {
    const [word, id] = row.split(",");
    return { word: word.trim(), id: parseInt(id.trim()) };
  });
  console.log("CSV Data Loaded: ", csvData);  // Debugging log
}

function startTest() {
  const num = parseInt(document.getElementById("questionCount").value);
  if (isNaN(num) || num <= 0) {
    alert("Enter a valid number of questions");
    return;
  }
  totalQuestions = num;
  questions = generateQuestions(num);
  userAnswers = new Array(num).fill(null);
  currentQuestionIndex = 0;
  displayQuestion();
}

function generateQuestions(num) {
  const qList = [];
  const used = new Set();

  while (qList.length < num) {
    const base = csvData[Math.floor(Math.random() * csvData.length)];
    if (used.has(base.word)) continue;
    used.add(base.word);

    let isSyn = selectedMode === "synonym";
    if (selectedMode === "mixed") isSyn = Math.random() < 0.5;

    const correctId = isSyn ? base.id : -base.id;
    const optionsPool = csvData.filter(w => w.id === correctId);
    if (optionsPool.length === 0) continue;

    const correctAnswer = optionsPool[Math.floor(Math.random() * optionsPool.length)];
    let wrongOptions = csvData.filter(w => w.word !== correctAnswer.word && w.id !== correctId && w.id !== -correctId);
    wrongOptions = shuffle(wrongOptions).slice(0, 3).map(w => w.word);

    const allOptions = shuffle([correctAnswer.word, ...wrongOptions]);

    qList.push({
      questionWord: base.word,
      correct: correctAnswer.word,
      options: allOptions,
      type: isSyn ? "Synonym" : "Antonym"
    });
  }

  return qList;
}

function displayQuestion() {
  const q = questions[currentQuestionIndex];
  document.getElementById("questionBox").innerHTML = `
    <div><strong>Q${currentQuestionIndex + 1} (${q.type}):</strong> What is a ${q.type.toLowerCase()} of <em>${q.questionWord}</em>?</div>
    <div id="optionsBox">${q.options.map((opt, i) => `
      <div class="option" onclick="selectOption(${i})" id="option${i}">${opt}</div>
    `).join("")}</div>
  `;
  updateButtons();
}

let selectedOptionIndex = null;

function selectOption(index) {
  if (userAnswers[currentQuestionIndex] !== null) return; // Already saved
  selectedOptionIndex = index;
  document.querySelectorAll(".option").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });
}

function saveAnswer() {
  if (selectedOptionIndex === null) {
    alert("Please select an option before saving.");
    return;
  }

  const q = questions[currentQuestionIndex];
  const selected = q.options[selectedOptionIndex];
  userAnswers[currentQuestionIndex] = selected;

  const isCorrect = selected === q.correct;
  const message = isCorrect ? "Very Good! Your answer is correct!" : "Oops! That was wrong!";
  document.getElementById("questionBox").insertAdjacentHTML("beforeend", `<div class="feedback">${message}</div>`);

  document.querySelectorAll(".option").forEach(el => {
    el.classList.add("disabled");
    if (el.textContent === selected) {
      el.classList.add(isCorrect ? "correct" : "wrong");
    }
  });

  selectedOptionIndex = null;
  updateButtons();
  checkAutoSubmit();
}

function nextQuestion() {
  if (currentQuestionIndex < totalQuestions - 1) {
    currentQuestionIndex++;
    displayQuestion();
  }
}

function updateButtons() {
  document.getElementById("nextBtn").disabled = userAnswers[currentQuestionIndex] === null || currentQuestionIndex === totalQuestions - 1;
  document.getElementById("saveBtn").disabled = userAnswers[currentQuestionIndex] !== null;
}

function submitTest() {
  const correct = questions.filter((q, i) => userAnswers[i] === q.correct).length;
  const wrong = userAnswers.filter((ans, i) => ans && ans !== questions[i].correct).length;
  const unattempted = totalQuestions - userAnswers.filter(ans => ans !== null).length;

  document.getElementById("resultBox").innerHTML = `
    <h2>Test Complete</h2>
    <p>Correct: ${correct}</p>
    <p>Wrong: ${wrong}</p>
    <p>Unattempted: ${unattempted}</p>
  `;

  document.getElementById("questionBox").innerHTML = "";
  document.getElementById("controlBox").style.display = "none";
}

function checkAutoSubmit() {
  if (userAnswers.every(ans => ans !== null)) {
    submitTest();
  }
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

document.getElementById("startBtn").addEventListener("click", startTest);
document.getElementById("saveBtn").addEventListener("click", saveAnswer);
document.getElementById("nextBtn").addEventListener("click", nextQuestion);
document.getElementById("submitBtn").addEventListener("click", submitTest);

window.onload = loadCSVList;

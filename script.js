let csvData = [];
let currentQuestionIndex = 0;
let selectedMode = "synonym";
let selectedCSVUrl = "";
let questions = [];
let userAnswers = [];
let clockInterval;
let startTime;
let totalQuestions = 10;

window.onload = () => {
  loadCSVList();
  document.getElementById("csvSelector").addEventListener("change", async (e) => {
    selectedCSVUrl = e.target.value;
    if (selectedCSVUrl) await loadCSV(selectedCSVUrl);
  });

  document.getElementById("topicSelector").addEventListener("change", (e) => {
    selectedMode = e.target.value;
  });

  document.getElementById("startBtn").addEventListener("click", startTest);
  document.getElementById("saveBtn").addEventListener("click", saveAnswer);
  document.getElementById("nextBtn").addEventListener("click", nextQuestion);
  document.getElementById("submitBtn").addEventListener("click", submitTest);
};

async function loadCSVList() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/amzt-pixel/Vocabulary/main/csv-list.json");
    const list = await response.json();
    const select = document.getElementById("csvSelector");

    list.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.url;
      option.textContent = item.name;
      select.appendChild(option);
    });

    // Load the first CSV by default
    if (list.length > 0) {
      selectedCSVUrl = list[0].url;
      await loadCSV(selectedCSVUrl);
    }
  } catch (e) {
    alert("Failed to load CSV list.");
    console.error(e);
  }
}

async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const rows = text.trim().split("\n").slice(1);
  csvData = rows.map((row) => {
    const [word, id] = row.split(",");
    return { word: word.trim(), id: parseInt(id.trim()) };
  });
}

function startTest() {
  const num = parseInt(document.getElementById("questionCount").value);
  const csv = document.getElementById("csvSelector").value;
  const topic = document.getElementById("topicSelector").value;
  if (!csv || !topic || isNaN(num) || num <= 0) {
    alert("Please select all fields before starting the test.");
    return;
  }
  // Disable start button
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = true;
  
  totalQuestions = num;
  questions = generateQuestions(num);
  // If generation failed and redirected, questions will be empty
  if (questions.length === 0) {
    startBtn.disabled = false; // Re-enable if failed
    return;
  }
  userAnswers = new Array(num).fill(null);
  currentQuestionIndex = 0;
  startTime = Date.now(); // This records the exact time test starts
startClock(); // Starts the visible running clock

  document.getElementById("input-screen").classList.add("hidden");
  document.getElementById("test-screen").classList.remove("hidden");
  displayQuestion();
}
// Re-enable start button only after test starts
  setTimeout(() => {
    startBtn.disabled = false;
  }, 500);

function startClock() {
  const clockElement = document.getElementById("question-clock");
  if (!clockElement) return;

  clockInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    clockElement.textContent = `Time: ${minutes}m ${seconds}s`;
  }, 1000);
}

function generateQuestions(num) {
  const qList = [];
  const used = new Set();
  let attempts = 0;
  const maxAttempts = num * 10; // Try 10x the number of questions

  while (qList.length < num && attempts < maxAttempts) {
    attempts++;

    const base = csvData[Math.floor(Math.random() * csvData.length)];
    if (used.has(base.word)) continue;
    used.add(base.word);

    let isSyn = selectedMode === "synonym";
    if (selectedMode === "mixed") isSyn = Math.random() < 0.5;

    const correctId = isSyn ? base.id : -base.id;
    const optionsPool = csvData.filter(w => w.id === correctId);
    if (optionsPool.length === 0) continue;

    const filteredOptionsPool = optionsPool.filter(opt => opt.word.toLowerCase() !== base.word.toLowerCase());
    if (filteredOptionsPool.length === 0) continue;

    const correctAnswer = filteredOptionsPool[Math.floor(Math.random() * filteredOptionsPool.length)];
    let wrongOptions = csvData.filter(w =>
      w.word !== correctAnswer.word &&
      w.id !== correctId &&
      w.id !== -correctId
    );
    wrongOptions = shuffle(wrongOptions).slice(0, 3).map(w => w.word);

    if (wrongOptions.length < 3) continue;

    const allOptions = shuffle([correctAnswer.word, ...wrongOptions]);

    qList.push({
      questionWord: base.word,
      correct: correctAnswer.word,
      options: allOptions,
      type: isSyn ? "Synonym" : "Antonym"
    });
  }

  // If not enough questions were created, show message and redirect
  if (qList.length < num) {
    alert("Failed to generate questions");
    window.location.href = "index.html";
    return [];
  }

  return qList;
}

function displayQuestion() {
  const q = questions[currentQuestionIndex];
  document.getElementById("question-number").textContent = `Question ${currentQuestionIndex + 1} of ${totalQuestions}`;
  //document.getElementById("question-number").textContent = `Q${currentQuestionIndex + 1} (${q.type})`;
  document.getElementById("question-text").textContent = `What is a ${q.type.toLowerCase()} of "${q.questionWord}"?`;

  const optionsHTML = q.options.map((opt, i) =>
    `<button class="option" onclick="selectOption(${i})" id="option${i}">${opt}</button>`
  ).join("");
  document.getElementById("options-container").innerHTML = optionsHTML;

  document.getElementById("feedback").textContent = "";
  updateButtons();
}

let selectedOptionIndex = null;

function selectOption(index) {
  if (userAnswers[currentQuestionIndex] !== null) return;
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
  /*const message = isCorrect ? "Very Good! Your answer is correct!" : "Oops! That was wrong!";
  document.getElementById("feedback").textContent = message;*/
  let message;
if (isCorrect) {
  message = "Very Good! Your answer is correct!";
} else {
  message = `Oops! That was wrong! The correct answer was: "${q.correct}"`;
}
document.getElementById("feedback").textContent = message;

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

function submitTest() {
  const correct = questions.filter((q, i) => userAnswers[i] === q.correct).length;
  const wrong = userAnswers.filter((ans, i) => ans && ans !== questions[i].correct).length;
  const unattempted = totalQuestions - userAnswers.filter(ans => ans !== null).length;

  document.getElementById("test-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");

  clearInterval(clockInterval);
const elapsed = Math.floor((Date.now() - startTime) / 1000);
const minutes = Math.floor(elapsed / 60);
const seconds = elapsed % 60;

/*document.getElementById("result-summary").innerHTML = `
  Correct: ${correct}<br>
  Wrong: ${wrong}<br>
  Unattempted: ${unattempted}<br>
  Time Taken: ${minutes} min ${seconds} sec
`;*/
  document.getElementById("result-summary").innerHTML = `
  <p class="feedback-row correct">Correct: ${correct}</p>
  <p class="feedback-row wrong">Wrong: ${wrong}</p>
  <p class="feedback-row unattempted">Unattempted: ${unattempted}</p>
  <p class="feedback-row time">Time Taken: ${minutes} min ${seconds} sec</p>
`;
}

function checkAutoSubmit() {
  if (userAnswers.every(ans => ans !== null)) {
    submitTest();
  }
}

function updateButtons() {
  document.getElementById("nextBtn").disabled = userAnswers[currentQuestionIndex] === null || currentQuestionIndex === totalQuestions - 1;
  document.getElementById("saveBtn").disabled = userAnswers[currentQuestionIndex] !== null;
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
                                                          }

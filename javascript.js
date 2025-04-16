let csvData = [];
let selectedCSVUrl = "";
let selectedMode = "alphabetic";
let studyList = [];
let currentIndex = 0;
let visitedCount = 0;
let startTime = null;
let timerInterval;

/*window.onload = () => {
  loadCSVList();*/
window.onload = async () => {
  await loadCSVList(); // make this await
  checkInputs(); // <-- ADD THIS
  ...
};

  document.getElementById("csvSelector").addEventListener("change", async (e) => {
    selectedCSVUrl = e.target.value;
    if (selectedCSVUrl) await loadCSV(selectedCSVUrl);
    checkInputs();
  });

  document.getElementById("topicSelector").addEventListener("change", (e) => {
    selectedMode = e.target.value;
    checkInputs();
  });

  document.getElementById("wordCountInput").addEventListener("input", checkInputs);
  document.getElementById("startBtn").addEventListener("click", startSession);
  document.getElementById("nextBtn").addEventListener("click", nextWord);
  document.getElementById("prevBtn").addEventListener("click", prevWord);
  document.getElementById("completeBtn").addEventListener("click", completeSession);
  document.getElementById("restartBtn").addEventListener("click", () => showScreen("study"));
  document.getElementById("goHomeBtn").addEventListener("click", () => showScreen("setup"));
  document.getElementById("searchBar").addEventListener("input", handleSearch);
};

/*function checkInputs() {
  const mode = document.getElementById("topicSelector").value;
  const count = parseInt(document.getElementById("wordCountInput").value);
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = !(mode && count && !isNaN(count));
}*/
function checkInputs() {
  const csv = document.getElementById("csvSelector").value;
  const mode = document.getElementById("topicSelector").value;
  const count = parseInt(document.getElementById("wordCountInput").value);
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = !(csv && mode && count && !isNaN(count));
}

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

    if (list.length > 0) {
      selectedCSVUrl = list[0].url;
      await loadCSV(selectedCSVUrl);
    }
  } catch (e) {
    alert("Failed to load CSV list.");
    console.error(e);
  }
}

/*async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const rows = text.trim().split("\n").slice(1);
  csvData = rows.map((row) => {
    const [word, id] = row.split(",");
    return { word: word.trim(), id: parseInt(id.trim()) };
  });
}*/
async function loadCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const text = await response.text();
    const rows = text.trim().split("\n").slice(1);

    csvData = rows.map((row) => {
      const [word, id] = row.split(",");
      return { word: word.trim(), id: parseInt(id.trim()) };
    });

    if (!csvData.length) {
      throw new Error("CSV file is empty or invalid.");
    }

  } catch (err) {
    alert("Failed to load or parse CSV file. Please try another file.");
    console.error("CSV Load Error:", err);
    csvData = []; // make sure it doesn't have stale data
  }
}

function startSession() {

  if (!csvData.length) {
  alert("CSV data not loaded yet!");
  return;
  }

  console.log("Start button clicked"); // <- Add this to test if it's being called
  // logic to switch to study screen
  const count = parseInt(document.getElementById("wordCountInput").value);
  const wordMap = new Map();

  csvData.forEach(({ word, id }) => {
    if (!wordMap.has(word)) wordMap.set(word, []);
    wordMap.get(word).push(id);
  });

  const validWords = [...wordMap.keys()].filter((word) => {
    const ids = wordMap.get(word);
    const synonyms = new Set();
    const antonyms = new Set();

    ids.forEach((id1) => {
      csvData.forEach(({ word: w2, id: id2 }) => {
        if (id1 === id2 && w2 !== word) synonyms.add(w2);
        if (id1 === -id2) antonyms.add(w2);
      });
    });

    return synonyms.size > 0 || antonyms.size > 0;
  });

  let sortedWords;
  if (selectedMode === "alphabetic") sortedWords = validWords.sort();
  else if (selectedMode === "reverse") sortedWords = validWords.sort().reverse();
  else sortedWords = shuffleArray(validWords);

  studyList = sortedWords.slice(0, count);
  currentIndex = 0;
  visitedCount = 0;
  startTime = new Date();
  timerInterval = setInterval(updateClock, 1000);

  showScreen("study");
  displayWord();
}

function displayWord() {
  const word = studyList[currentIndex];
  const ids = csvData.filter(item => item.word === word).map(item => item.id);

  const synonyms = new Set();
  const antonyms = new Set();

  ids.forEach(id1 => {
    csvData.forEach(({ word: w2, id: id2 }) => {
      if (id1 === id2 && w2 !== word) synonyms.add(w2);
      if (id1 === -id2) antonyms.add(w2);
    });
  });

  document.getElementById("wordDisplay").textContent = `Word: ${word}`;
  document.getElementById("synDisplay").textContent = synonyms.size > 0 ? `Synonyms: ${[...synonyms].join(", ")}` : "";
  document.getElementById("antDisplay").textContent = antonyms.size > 0 ? `Antonyms: ${[...antonyms].join(", ")}` : "";

  if (visitedCount <= currentIndex) visitedCount = currentIndex + 1;
  document.getElementById("questionCount").textContent = `Questions Seen: ${visitedCount}`;

  const nextBtn = document.getElementById("nextBtn");
  nextBtn.textContent = currentIndex === studyList.length - 1 ? "Restart" : "Next";
}

function nextWord() {
  if (currentIndex === studyList.length - 1) {
    currentIndex = 0;
  } else {
    currentIndex++;
  }
  displayWord();
}

function prevWord() {
  if (currentIndex > 0) {
    currentIndex--;
    displayWord();
  }
}

function completeSession() {
  clearInterval(timerInterval);
  const endTime = new Date();
  const seconds = Math.floor((endTime - startTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  document.getElementById("sessionStats").textContent = `You studied ${visitedCount} word(s) in ${minutes} minute(s) and ${remainingSeconds} second(s).`;
  showScreen("complete");
}

function showScreen(screen) {
  document.getElementById("setupScreen").classList.add("hidden");
  document.getElementById("studyScreen").classList.add("hidden");
  document.getElementById("completeScreen").classList.add("hidden");
  if (screen === "setup") document.getElementById("setupScreen").classList.remove("hidden");
  if (screen === "study") document.getElementById("studyScreen").classList.remove("hidden");
  if (screen === "complete") document.getElementById("completeScreen").classList.remove("hidden");
}

function updateClock() {
  const now = new Date();
  const seconds = Math.floor((now - startTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  document.getElementById("clock").textContent = `Time: ${minutes}m ${remainingSeconds}s`;
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const resultDiv = document.getElementById("searchResults");
  resultDiv.innerHTML = "";

  if (!query) return resultDiv.classList.add("hidden");

  const matches = csvData.map(entry => entry.word)
    .filter((v, i, a) => a.indexOf(v) === i)
    .filter(word => word.toLowerCase().includes(query));

  const exact = matches.filter(word => word.toLowerCase() === query);
  const rest = matches.filter(word => word.toLowerCase() !== query).sort();
  const finalList = [...exact, ...rest];

  finalList.forEach(word => {
    const div = document.createElement("div");
    div.textContent = word;
    div.onclick = () => {
      const index = studyList.indexOf(word);
      if (index !== -1) {
        currentIndex = index;
        displayWord();
        resultDiv.classList.add("hidden");
        document.getElementById("searchBar").value = "";
      }
    };
    resultDiv.appendChild(div);
  });

  resultDiv.classList.remove("hidden");
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

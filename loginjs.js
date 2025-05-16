// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSVQV-Ewuv_XVgjOvI8Vz0CO7zH4RzIoo",
  authDomain: "vocabulary-webdata.firebaseapp.com",
  databaseURL: "https://vocabulary-webdata-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vocabulary-webdata",
  storageBucket: "vocabulary-webdata.appspot.com",
  messagingSenderId: "35145778827",
  appId: "1:35145778827:web:1d410961e0e145fb5ab68e",
  measurementId: "G-9YZKKF20PJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let csvData = [];
let selectedCSVUrl = "";
let selectedMode = "alphabetic";
let studyList = [];
let currentIndex = 0;
let wordsSeen = 0;
let startTime = null;
let timerInterval;
let notedWords = [];

// Initialize app
window.onload = async () => {
  await loadCSVList();
  checkInputs();
  auth.onAuthStateChanged(updateAuthState);
  loadNotedWords();
};

// ==================== CSV & Study Session Functions ====================

// Event Listeners for Study Session
document.getElementById("csvSelector").addEventListener("change", async (e) => {
  selectedCSVUrl = e.target.value;
  if (selectedCSVUrl) await loadCSV(selectedCSVUrl);
  checkInputs();
});

document.getElementById("topicSelector").addEventListener("change", (e) => {
  selectedMode = e.target.value;
  checkInputs();
});

document.getElementById("startBtn").addEventListener("click", startSession);
document.getElementById("nextBtn").addEventListener("click", nextWord);
document.getElementById("prevBtn").addEventListener("click", prevWord);
document.getElementById("completeBtn").addEventListener("click", completeSession);
document.getElementById("restartBtn").addEventListener("click", () => showScreen("study"));
document.getElementById("goHomeBtn").addEventListener("click", () => showScreen("setup"));

// Event Listeners for Vocabulary Management
document.getElementById('loginBtn').addEventListener('click', handleAuthClick);
document.getElementById('viewWordsBtn').addEventListener('click', showSavedWords);
document.getElementById('saveBtn').addEventListener('click', saveCurrentWord);
document.getElementById('deleteBtn').addEventListener('click', deleteCurrentWord);
document.getElementById('clearBtn').addEventListener('click', clearAllWords);
document.getElementById('closeBtn').addEventListener('click', () => {
  document.getElementById('savedWordsContainer').style.display = 'none';
});

// Delegated event listener for saved words
document.getElementById('savedWordsList').addEventListener('click', (e) => {
  if (e.target.classList.contains('saved-word')) {
    const word = e.target.textContent;
    const index = studyList.indexOf(word);
    if (index !== -1) {
      currentIndex = index;
      displayWord();
      showScreen("study");
    }
  }
});

// ==================== CORE FUNCTIONS ====================

// CSV Loading Functions
async function loadCSVList() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/amzt-pixel/word/main/csv-list.json");
    if (!response.ok) throw new Error("Failed to fetch CSV list");
    
    const list = await response.json();
    const select = document.getElementById("csvSelector");
    select.innerHTML = "";

    list.forEach((item) => {
      const option = new Option(item.name, item.url);
      select.add(option);
    });

    if (list.length > 0) {
      selectedCSVUrl = list[0].url;
      select.value = selectedCSVUrl;
      await loadCSV(selectedCSVUrl);
    }
  } catch (err) {
    console.error("CSV list load error:", err);
    alert("Error loading CSV list. Check console for details.");
  }
}

async function loadCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const text = await response.text();
    const rows = text.trim().split("\n").slice(1);

    csvData = rows.map((row) => {
      const [word, id] = row.split(",").map(item => item.trim());
      return { word, id: parseInt(id) };
    });

    if (csvData.length === 0) throw new Error("CSV is empty");
    console.log("CSV loaded successfully:", csvData.length, "words");
  } catch (err) {
    console.error("CSV load error:", err);
    csvData = [];
    alert("Error loading CSV. Please try another file.");
  }
}

function checkInputs() {
  const csv = document.getElementById("csvSelector").value;
  const mode = document.getElementById("topicSelector").value;
  document.getElementById("startBtn").disabled = !(csv && mode);
}

// Study Session Functions
function startSession() {
  studyList = filterAndSortWords(selectedMode);
  currentIndex = 0;
  wordsSeen = 1;
  startTime = new Date();

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateClock, 1000);

  showScreen("study");
  displayWord();
}

function displayWord() {
  if (!studyList.length || currentIndex < 0 || currentIndex >= studyList.length) return;

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

  document.getElementById("wordDisplay").textContent = `Word ${currentIndex + 1}: ${word}`;
  document.getElementById("synDisplay").textContent = [...synonyms].join(", ") || "None";
  document.getElementById("antDisplay").textContent = [...antonyms].join(", ") || "None";

  document.getElementById("wordOrder").textContent = `Word ${currentIndex + 1}`;
  document.getElementById("wordTotal").textContent = `Total Words: ${studyList.length}`;
  document.getElementById("modeDisplay").textContent = `Mode: ${selectedMode}`;
  document.getElementById("questionCount").textContent = `Words Seen: ${wordsSeen}`;

  document.getElementById("prevBtn").disabled = currentIndex === 0;
  document.getElementById("nextBtn").textContent = "Next";
  document.getElementById("nextBtn").onclick = nextWord;
}

function prevWord() {
  if (currentIndex === 0) return;
  currentIndex--;
  wordsSeen++;
  displayWord();
}

function nextWord() {
  if (currentIndex === studyList.length - 1) {
    document.getElementById("nextBtn").textContent = "Restart";
    document.getElementById("nextBtn").onclick = () => startSession();
    return;
  }
  currentIndex++;
  wordsSeen++;
  displayWord();
}

function completeSession() {
  clearInterval(timerInterval);
  const elapsed = Math.floor((new Date() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  
  document.getElementById("sessionStats").textContent = 
    `You studied ${wordsSeen} words in ${mins}m ${secs}s.`;
  showScreen("complete");
}

function filterAndSortWords(mode) {
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

  if (mode === "alphabetic") return validWords.sort();
  if (mode === "reverse") return validWords.sort().reverse();
  return shuffleArray(validWords);
}

// ==================== FIREBASE FUNCTIONS ====================

function updateAuthState(user) {
  const loginBtn = document.getElementById('loginBtn');
  if (user) {
    loginBtn.textContent = 'Logout';
    loadNotedWords();
  } else {
    loginBtn.textContent = 'Login';
  }
}

function handleAuthClick() {
  if (auth.currentUser) {
    auth.signOut();
  } else {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  }
}

function loadNotedWords() {
  const user = auth.currentUser;
  if (!user) return;
  
  db.collection("notedWords").doc(user.uid).get()
    .then(doc => {
      notedWords = doc.exists ? doc.data().words || [] : [];
      renderSavedWords();
    })
    .catch(err => console.error("Error loading words:", err));
}

function renderSavedWords() {
  const savedWordsList = document.getElementById('savedWordsList');
  savedWordsList.innerHTML = notedWords.map(word => 
    `<div class="saved-word">${word}</div>`
  ).join('');
}

function showSavedWords() {
  document.getElementById('savedWordsContainer').style.display = 'block';
}

function saveCurrentWord() {
  const user = auth.currentUser;
  if (!user) return alert("Please login first");
  
  const word = studyList[currentIndex];
  if (!word) return;
  
  if (!notedWords.includes(word)) {
    notedWords.push(word);
    db.collection("notedWords").doc(user.uid).set({
      words: firebase.firestore.FieldValue.arrayUnion(word)
    }, { merge: true })
    .then(() => renderSavedWords())
    .catch(err => console.error("Error saving word:", err));
  }
}

function deleteCurrentWord() {
  const user = auth.currentUser;
  if (!user) return alert("Please login first");
  
  const word = studyList[currentIndex];
  if (!word) return;
  
  const index = notedWords.indexOf(word);
  if (index !== -1) {
    notedWords.splice(index, 1);
    db.collection("notedWords").doc(user.uid).update({
      words: firebase.firestore.FieldValue.arrayRemove(word)
    })
    .then(() => renderSavedWords())
    .catch(err => console.error("Error deleting word:", err));
  }
}

function clearAllWords() {
  const user = auth.currentUser;
  if (!user) return alert("Please login first");
  
  if (confirm("Clear all saved words?")) {
    notedWords = [];
    db.collection("notedWords").doc(user.uid).set({ words: [] })
      .then(() => renderSavedWords())
      .catch(err => console.error("Error clearing words:", err));
  }
}

// ==================== UTILITY FUNCTIONS ====================

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("visible"));
  document.getElementById(`${screen}Screen`).classList.add("visible");
}

function updateClock() {
  const elapsed = Math.floor((new Date() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  document.getElementById("clock").textContent = `Time: ${mins}m ${secs}s`;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

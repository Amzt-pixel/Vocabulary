let csvData = [];
let selectedCSVUrl = "";
let selectedMode = "alphabetic";
let studyList = [];
let currentIndex = 0;
let visitedCount = 0;
let startTime = null;
let timerInterval;

// Initialize app
window.onload = async () => {
  await loadCSVList();
  checkInputs(); // Enable Start button if defaults are valid
};

// Event Listeners
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

// Enable Start button only when all inputs are valid
function checkInputs() {
  const csv = document.getElementById("csvSelector").value;
  const mode = document.getElementById("topicSelector").value;
  const count = parseInt(document.getElementById("wordCountInput").value);
  const startBtn = document.getElementById("startBtn");
  
  startBtn.disabled = !(csv && mode && count > 0 && !isNaN(count));
}

// Load CSV list from GitHub
async function loadCSVList() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/amzt-pixel/Vocabulary/main/csv-list.json");
    if (!response.ok) throw new Error("Failed to fetch CSV list");
    
    const list = await response.json();
    const select = document.getElementById("csvSelector");
    select.innerHTML = ""; // Clear existing options

    list.forEach((item) => {
      const option = new Option(item.name, item.url);
      select.add(option);
    });

    // Auto-select the first CSV and load it
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

// Load and parse CSV data
async function loadCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const text = await response.text();
    const rows = text.trim().split("\n").slice(1); // Skip header row

    csvData = rows.map((row) => {
      const [word, id] = row.split(",").map(item => item.trim());
      return { word, id: parseInt(id) };
    });

    if (csvData.length === 0) throw new Error("CSV is empty");
    console.log("CSV loaded successfully:", csvData.length, "words");
  } catch (err) {
    console.error("CSV load error:", err);
    csvData = []; // Reset to avoid stale data
    alert("Error loading CSV. Please try another file.");
  }
}

// Start study session
function startSession() {
  if (!csvData.length) {
    alert("No CSV data loaded!");
    return;
  }

  const count = parseInt(document.getElementById("wordCountInput").value);
  const wordMap = new Map();

  // Group words by their IDs
  csvData.forEach(({ word, id }) => {
    if (!wordMap.has(word)) wordMap.set(word, []);
    wordMap.get(word).push(id);
  });

  // Filter words with synonyms/antonyms
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

  // Sort based on selected mode
  let sortedWords;
  if (selectedMode === "alphabetic") sortedWords = validWords.sort();
  else if (selectedMode === "reverse") sortedWords = validWords.sort().reverse();
  else sortedWords = shuffleArray(validWords);

  studyList = sortedWords.slice(0, count);
  currentIndex = 0;
  visitedCount = 0;
  startTime = new Date();
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateClock, 1000);

  showScreen("study");
  displayWord();
}

// Display current word and its relations
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

  document.getElementById("wordDisplay").textContent = word;
  document.getElementById("synDisplay").textContent = [...synonyms].join(", ") || "None";
  document.getElementById("antDisplay").textContent = [...antonyms].join(", ") || "None";
  document.getElementById("questionCount").textContent = `Words Seen: ${visitedCount}`;
  
  const nextBtn = document.getElementById("nextBtn");
  nextBtn.textContent = currentIndex === studyList.length - 1 ? "Restart" : "Next";
}

// Navigation and utilities
function nextWord() {
  currentIndex = (currentIndex === studyList.length - 1) ? 0 : currentIndex + 1;
  visitedCount = Math.max(visitedCount, currentIndex + 1);
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
  const elapsed = Math.floor((new Date() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  
  document.getElementById("sessionStats").textContent = 
    `You studied ${visitedCount} words in ${mins}m ${secs}s.`;
  showScreen("complete");
}

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
/*
// Replace your existing handleSearch function with this:
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const resultsDiv = document.getElementById("searchResults");
  const closeBtn = document.getElementById("closeSearchBtn");
  
  resultsDiv.innerHTML = "";
  
  if (!query) {
    resultsDiv.classList.add("hidden");
    closeBtn.style.display = "none";
    return;
  }

  // Get all unique words
  const allWords = [...new Set(csvData.map(item => item.word))];
  
  // Find matches
  const exactMatches = allWords.filter(word => 
    word.toLowerCase() === query
  );
  
  const otherMatches = allWords.filter(word => 
    word.toLowerCase().includes(query) && word.toLowerCase() !== query
  ).sort();

  // Display results
  if (exactMatches.length > 0 || otherMatches.length > 0) {
    // Add exact matches section
    if (exactMatches.length > 0) {
      const exactTitle = document.createElement("div");
      exactTitle.className = "search-section-title";
      exactTitle.textContent = "Exact Match";
      resultsDiv.appendChild(exactTitle);
      
      exactMatches.forEach(word => {
        const div = createSearchResultItem(word);
        resultsDiv.appendChild(div);
      });
    }
    
    // Add other matches section
    if (otherMatches.length > 0) {
      const otherTitle = document.createElement("div");
      otherTitle.className = "search-section-title";
      otherTitle.textContent = "All Words";
      resultsDiv.appendChild(otherTitle);
      
      otherMatches.forEach(word => {
        const div = createSearchResultItem(word);
        resultsDiv.appendChild(div);
      });
    }
    
    closeBtn.style.display = "block";
  } else {
    const noResults = document.createElement("div");
    noResults.textContent = "No word found";
    noResults.style.padding = "10px";
    noResults.style.color = "#666";
    resultsDiv.appendChild(noResults);
    closeBtn.style.display = "none";
  }
  
  resultsDiv.classList.remove("hidden");
}
*/
function createSearchResultItem(word) {
  const div = document.createElement("div");
  div.textContent = word;
  div.onclick = () => {
    document.getElementById("searchResults").classList.add("hidden");
    document.getElementById("closeSearchBtn").style.display = "none";
    document.getElementById("searchBar").value = "";
    showWordPopup(word);
  };
  return div;
}
/*
function showWordPopup(word) {
  const ids = csvData.filter(item => item.word === word).map(item => item.id);
  const synonyms = new Set();
  const antonyms = new Set();

  ids.forEach(id1 => {
    csvData.forEach(({ word: w2, id: id2 }) => {
      if (id1 === id2 && w2 !== word) synonyms.add(w2);
      if (id1 === -id2) antonyms.add(w2);
    });
  });

  document.getElementById("popupWordTitle").textContent = word;
  document.getElementById("popupSynDisplay").textContent = 
    [...synonyms].join(", ") || "None";
  document.getElementById("popupAntDisplay").textContent = 
    [...antonyms].join(", ") || "None";
  
  document.getElementById("wordPopup").style.display = "block";
}

// Add close button functionality
document.getElementById("closePopupBtn").addEventListener("click", () => {
  document.getElementById("wordPopup").style.display = "none";
});

// Add close search results button
const searchContainer = document.querySelector(".top-bar");
const searchBar = document.getElementById("searchBar");
const closeSearchBtn = document.createElement("button");
closeSearchBtn.id = "closeSearchBtn";
closeSearchBtn.innerHTML = "×";
closeSearchBtn.addEventListener("click", () => {
  document.getElementById("searchResults").classList.add("hidden");
  closeSearchBtn.style.display = "none";
});
searchContainer.insertBefore(closeSearchBtn, searchBar.nextSibling);

// Close popup when clicking outside
document.addEventListener("click", (e) => {
  const popup = document.getElementById("wordPopup");
  if (popup.style.display === "block" && !popup.contains(e.target)) {
    popup.style.display = "none";
  }
});
*/
// Add these new functions
function showWordPopup(word) {
  const ids = csvData.filter(item => item.word === word).map(item => item.id);
  const synonyms = new Set();
  const antonyms = new Set();

  ids.forEach(id1 => {
    csvData.forEach(({ word: w2, id: id2 }) => {
      if (id1 === id2 && w2 !== word) synonyms.add(w2);
      if (id1 === -id2) antonyms.add(w2);
    });
  });

  document.getElementById("popupWordTitle").textContent = word;
  document.getElementById("popupSynDisplay").textContent = 
    [...synonyms].join(", ") || "None";
  document.getElementById("popupAntDisplay").textContent = 
    [...antonyms].join(", ") || "None";
  
  document.getElementById("wordPopup").style.display = "block";
}

// Update handleSearch function
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const resultsDiv = document.getElementById("searchResults");
  const clearBtn = document.getElementById("clearSearchBtn");
  
  resultsDiv.innerHTML = "";
  clearBtn.style.display = query ? "block" : "none";

  if (!query) {
    resultsDiv.classList.add("hidden");
    return;
  }

  const allWords = [...new Set(csvData.map(item => item.word))];
  const exactMatches = allWords.filter(word => word.toLowerCase() === query);
  const otherMatches = allWords.filter(word => 
    word.toLowerCase().includes(query) && word.toLowerCase() !== query
  ).sort();

  if (exactMatches.length > 0 || otherMatches.length > 0) {
    if (exactMatches.length > 0) {
      const exactTitle = document.createElement("div");
      exactTitle.className = "search-section-title";
      exactTitle.textContent = "Exact Match";
      resultsDiv.appendChild(exactTitle);
      
      exactMatches.forEach(word => {
        const div = document.createElement("div");
        div.textContent = word;
        div.onclick = () => {
          resultsDiv.classList.add("hidden");
          clearBtn.style.display = "none";
          e.target.value = "";
          showWordPopup(word);
        };
        resultsDiv.appendChild(div);
      });
    }
    
    if (otherMatches.length > 0) {
      const otherTitle = document.createElement("div");
      otherTitle.className = "search-section-title";
      otherTitle.textContent = "All Words";
      resultsDiv.appendChild(otherTitle);
      
      otherMatches.forEach(word => {
        const div = document.createElement("div");
        div.textContent = word;
        div.onclick = () => {
          resultsDiv.classList.add("hidden");
          clearBtn.style.display = "none";
          e.target.value = "";
          showWordPopup(word);
        };
        resultsDiv.appendChild(div);
      });
    }
  } else {
    const noResults = document.createElement("div");
    noResults.textContent = "No word found";
    noResults.style.padding = "10px";
    noResults.style.color = "#666";
    resultsDiv.appendChild(noResults);
  }
  
  resultsDiv.classList.remove("hidden");
}

// Add event listeners
document.getElementById("clearSearchBtn").addEventListener("click", () => {
  document.getElementById("searchBar").value = "";
  document.getElementById("searchResults").classList.add("hidden");
  document.getElementById("clearSearchBtn").style.display = "none";
});

document.getElementById("closePopupBtn").addEventListener("click", () => {
  document.getElementById("wordPopup").style.display = "none";
});

// Close popup when clicking outside
document.addEventListener("click", (e) => {
  const popup = document.getElementById("wordPopup");
  if (popup.style.display === "block" && !popup.contains(e.target)) {
    popup.style.display = "none";
  }
});
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

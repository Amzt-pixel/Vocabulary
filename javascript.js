let wordData = [];
let currentIndex = -1;
let seenWords = 0;
let lastWord = null;
let previousWord = null;
let mode = 'alphabetic';
let startTime;
let timerInterval;
let wordOrder = [];

async function loadCSVList() {
  const res = await fetch('https://raw.githubusercontent.com/amzt-pixel/word/main/csv-list.json');
  const csvList = await res.json();
  const select = document.getElementById('csvSelect');
  csvList.forEach(csv => {
    const option = document.createElement('option');
    option.value = csv;
    option.textContent = csv;
    select.appendChild(option);
  });
}

async function startSession() {
  const selectedCSV = document.getElementById('csvSelect').value;
  mode = document.getElementById('modeSelect').value;
  const response = await fetch(`https://raw.githubusercontent.com/your-username/word/main/csvs/${selectedCSV}`);
  const text = await response.text();
  parseCSV(text);
  prepareWordOrder();
  startTime = new Date();
  timerInterval = setInterval(updateClock, 1000);
  document.getElementById('startScreen').style.display = 'none';
  document.getElementById('sessionScreen').style.display = 'block';
  goNext();
}

function parseCSV(text) {
  const lines = text.trim().split('\n').slice(1);
  const map = new Map();
  lines.forEach(line => {
    const [word, idStr] = line.split(',');
    const id = parseInt(idStr);
    if (!map.has(word)) map.set(word, []);
    map.get(word).push(id);
  });
  wordData = Array.from(map.entries()).map(([word, ids]) => ({ word, ids }));
}

function prepareWordOrder() {
  wordOrder = wordData.map((_, i) => i);
  if (mode === 'alphabetic') {
    wordOrder.sort((a, b) => wordData[a].word.localeCompare(wordData[b].word));
  } else if (mode === 'reverse') {
    wordOrder.sort((a, b) => wordData[b].word.localeCompare(wordData[a].word));
  } else if (mode === 'random') {
    for (let i = wordOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordOrder[i], wordOrder[j]] = [wordOrder[j], wordOrder[i]];
    }
  }
}

function displayWord(index) {
  const entry = wordData[wordOrder[index]];
  const synonyms = new Set();
  const antonyms = new Set();
  entry.ids.forEach(id => {
    wordData.forEach(other => {
      if (other.word === entry.word) return;
      if (other.ids.includes(id)) synonyms.add(other.word);
      if (other.ids.includes(-id)) antonyms.add(other.word);
    });
  });

  const card = document.getElementById('wordCard');
  card.innerHTML = `<h2>Word: ${entry.word}</h2>`;
  card.innerHTML += synonyms.size ? `<p><strong>Synonyms:</strong> ${[...synonyms].join(', ')}</p>` : '';
  card.innerHTML += antonyms.size ? `<p><strong>Antonyms:</strong> ${[...antonyms].join(', ')}</p>` : '';

  card.querySelectorAll('p strong ~ text, p strong ~ span').forEach(el => {
    el.addEventListener('click', () => jumpToWord(el.textContent));
  });

  document.getElementById('seenCount').textContent = `Words Seen: ${seenWords}`;
}

function goNext() {
  previousWord = lastWord;
  currentIndex = (currentIndex + 1) % wordOrder.length;
  lastWord = wordData[wordOrder[currentIndex]].word;
  seenWords++;
  displayWord(currentIndex);
  document.getElementById('prevBtn').disabled = false;
}

function goPrevious() {
  if (!previousWord) return;
  const prevIndex = wordData.findIndex(w => w.word === previousWord);
  if (prevIndex === -1) return;
  currentIndex = wordOrder.findIndex(i => wordData[i].word === previousWord);
  [lastWord, previousWord] = [previousWord, null];
  displayWord(currentIndex);
  document.getElementById('prevBtn').disabled = true;
}

function jumpToWord(word) {
  const index = wordData.findIndex(w => w.word === word);
  if (index !== -1) {
    wordOrder.unshift(index);
    currentIndex = -1;
    goNext();
  }
}

function endSession() {
  clearInterval(timerInterval);
  const duration = Math.floor((new Date() - startTime) / 1000);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  document.getElementById('sessionScreen').style.display = 'none';
  document.getElementById('endScreen').style.display = 'block';
  document.getElementById('summary').textContent = `You studied ${seenWords} words in ${mins} min ${secs} sec.`;
}

function updateClock() {
  const now = new Date();
  const diff = Math.floor((now - startTime) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  document.getElementById('clock').textContent = `Time: ${m}m ${s}s`;
}

function handleSearch(query) {
  const results = wordData.filter(w => w.word.toLowerCase().includes(query.toLowerCase()));
  results.sort((a, b) => {
    if (a.word.toLowerCase() === query.toLowerCase()) return -1;
    if (b.word.toLowerCase() === query.toLowerCase()) return 1;
    return a.word.localeCompare(b.word);
  });
  const dropdown = document.getElementById('searchResults');
  dropdown.innerHTML = '';
  results.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r.word;
    li.onclick = () => jumpToWord(r.word);
    dropdown.appendChild(li);
  });
}

window.onload = () => {
  loadCSVList();
};

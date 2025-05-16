// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Global variables
let studyList = []; // Assuming this is populated from your CSV
let currentIndex = -1; // Index of currently selected word
let notedWords = []; // User's saved words

// Initialize
auth.onAuthStateChanged(updateAuthState);
loadNotedWords();

// Event listeners - ALL 8 PROPERLY ATTACHED
document.getElementById('loginBtn').addEventListener('click', handleAuthClick);
document.getElementById('viewWordsBtn').addEventListener('click', showSavedWords);
document.getElementById('saveBtn').addEventListener('click', saveWord);
document.getElementById('deleteBtn').addEventListener('click', deleteWord);
document.getElementById('clearBtn').addEventListener('click', clearAllWords);
document.getElementById('closeBtn').addEventListener('click', () => {
  document.getElementById('savedWordsContainer').style.display = 'none';
});
document.getElementById('savedWordsList').addEventListener('click', (e) => {
  if (e.target.classList.contains('saved-word')) {
    const word = e.target.textContent;
    const index = studyList.indexOf(word);
    if (index !== -1) {
      currentIndex = index;
      displayWord(currentIndex); // Make sure this exists
    }
  }
});

// Auth functions
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

// Word management functions
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

function saveWord() {
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

function deleteWord() {
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

// Make sure this exists in your code
function displayWord(index) {
  // Your implementation to display the word
  console.log("Display word:", studyList[index]);
    }

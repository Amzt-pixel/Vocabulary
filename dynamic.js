// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSVQV-Ewuv_XVgjOvI8Vz0CO7zH4RzIoo",
  authDomain: "vocabulary-webdata.firebaseapp.com",
  databaseURL: "https://vocabulary-webdata-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vocabulary-webdata",
  storageBucket: "vocabulary-webdata.firebasestorage.app",
  messagingSenderId: "35145778827",
  appId: "1:35145778827:web:1d410961e0e145fb5ab68e",
  measurementId: "G-9YZKKF20PJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const loginBtn = document.getElementById('loginBtn');
const viewWordsBtn = document.getElementById('viewWordsBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const clearBtn = document.getElementById('clearBtn');
const closeBtn = document.getElementById('closeBtn');
const savedWordsContainer = document.getElementById('savedWordsContainer');
const savedWordsList = document.getElementById('savedWordsList');

// Global variables
let studyList = []; // Assuming this is populated from your CSV
let currentIndex = -1; // Index of currently selected word
let notedWords = []; // User's saved words

// Initialize
auth.onAuthStateChanged(updateAuthState);
loadNotedWords();

// Event listeners
viewWordsBtn.addEventListener('click', showSavedWords);
closeBtn.addEventListener('click', () => savedWordsContainer.style.display = 'none');
saveBtn.addEventListener('click', saveWord);
deleteBtn.addEventListener('click', deleteWord);
clearBtn.addEventListener('click', clearAllWords);

// Authentication functions
function updateAuthState(user) {
    if (user) {
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = () => auth.signOut();
        loadNotedWords();
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.onclick = signIn;
    }
}

function signIn() {
    // Implement your preferred login method (Google, Email, etc.)
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
}

// Word management functions
function loadNotedWords() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection("notedWords").doc(user.uid).get()
        .then(doc => {
            notedWords = doc.exists ? doc.data().words || [] : [];
            renderSavedWords();
        });
}

function renderSavedWords() {
    savedWordsList.innerHTML = notedWords.map(word => 
        <div class="saved-word" onclick="handleWordClick('${word}')">${word}</div>
    ).join('');
}

function showSavedWords() {
    savedWordsContainer.style.display = 'block';
    renderSavedWords();
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
        }, { merge: true });
        renderSavedWords();
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
        });
        renderSavedWords();
    }
}

function clearAllWords() {
    const user = auth.currentUser;
    if (!user) return alert("Please login first");
    
    if (confirm("Clear all saved words?")) {
        notedWords = [];
        db.collection("notedWords").doc(user.uid).set({ words: [] });
        renderSavedWords();
    }
}

// Word click handler (called from HTML onclick)
function handleWordClick(word) {
    const index = studyList.indexOf(word);
    if (index !== -1) {
        currentIndex = index;
        // Call your existing display function
        displayWord(currentIndex);
    }
}

// Make functions available globally
window.handleWordClick = handleWordClick;

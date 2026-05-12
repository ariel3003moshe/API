const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");
const enterButton = document.getElementById("enterButton");

const ROWS = 6;
const COLS = 5;
const API_URL = "https://api.datamuse.com/words?sp=?????&max=1000";

let answer = "";
let validWords = new Set();
let currentRow = 0;
let currentCol = 0;
let boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
let isGameOver = false;

const keyboardRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["Delete", "z", "x", "c", "v", "b", "n", "m", "Reset"],
];

async function initGame() {
  showMessage("טוען מילים...", false);
  board.innerHTML = "";
  keyboard.innerHTML = "";
  answer = "";
  validWords.clear();
  currentRow = 0;
  currentCol = 0;
  isGameOver = false;
  boardState = Array.from({ length: ROWS }, () => Array(COLS).fill(""));

  const tiles = [];
  for (let row = 0; row < ROWS; row += 1) {
    const rowEl = document.createElement("div");
    rowEl.className = "row";
    for (let col = 0; col < COLS; col += 1) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.row = row;
      tile.dataset.col = col;
      rowEl.appendChild(tile);
      tiles.push(tile);
    }
    board.appendChild(rowEl);
  }

  createKeyboard();
  await loadWords();
  showMessage("הקלד ניחוש ראשון ונסה לנחש את המילה.", false);
}

function createKeyboard() {
  keyboardRows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "keys-row";
    row.forEach((key) => {
      const keyButton = document.createElement("button");
      keyButton.textContent = key;
      keyButton.className = "key";
      if (key === "Delete" || key === "Reset") {
        keyButton.classList.add("wide");
      }
      if (key === "Reset") {
        keyButton.classList.add("reset-key");
      }
      if (key === "Delete") {
        keyButton.classList.add("delete-key");
      }
      keyButton.addEventListener("click", () => handleKey(key));
      rowEl.appendChild(keyButton);
    });
    keyboard.appendChild(rowEl);
  });
}

async function loadWords() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    const words = data
      .map((item) => item.word.trim().toLowerCase())
      .filter((word) => /^[a-z]{5}$/.test(word));

    if (words.length === 0) {
      throw new Error("לא נמצאו מילים תקינות.");
    }

    words.forEach((word) => validWords.add(word));
    answer = words[Math.floor(Math.random() * words.length)];
    console.log("Answer:", answer);
  } catch (error) {
    showMessage("שגיאה בטעינת ה-API. נסה לרענן.", true);
    console.error(error);
  }
}

function handleKey(key) {
  if (key === "Reset") {
    initGame();
    return;
  }

  if (isGameOver) {
    return;
  }

  if (key === "Enter") {
    submitGuess();
    return;
  }

  if (key === "Delete") {
    deleteLetter();
    return;
  }

  insertLetter(key);
}

function insertLetter(letter) {
  if (currentCol >= COLS || currentRow >= ROWS) return;
  boardState[currentRow][currentCol] = letter;
  currentCol += 1;
  updateTile(currentRow, currentCol - 1);
}

function deleteLetter() {
  if (currentCol <= 0) return;
  currentCol -= 1;
  boardState[currentRow][currentCol] = "";
  updateTile(currentRow, currentCol);
}

function submitGuess() {
  if (currentCol !== COLS) {
    showMessage("המילה צריכה להיות בת 5 אותיות.", true);
    return;
  }

  const guess = boardState[currentRow].join("").toLowerCase();
  if (!validWords.has(guess)) {
    showMessage("המילה אינה קיימת ברשימה. נסה שוב.", true);
    return;
  }

  const evaluation = evaluateGuess(guess);
  applyEvaluation(evaluation);

  if (guess === answer) {
    showMessage(`!ניצחת, המילה היא ${answer.toUpperCase()}`, false);
    isGameOver = true;
    return;
  }

  currentRow += 1;
  currentCol = 0;

  if (currentRow === ROWS) {
    showMessage(`סיימת את הניסיונות. המילה הייתה ${answer.toUpperCase()}` , true);
    isGameOver = true;
    return;
  }

  showMessage("המשך לנחש.", false);
}

function evaluateGuess(guess) {
  const result = Array(COLS).fill("absent");
  const answerLetters = answer.split("");

  for (let i = 0; i < COLS; i += 1) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      answerLetters[i] = null;
    }
  }

  for (let i = 0; i < COLS; i += 1) {
    if (result[i] !== "correct") {
      const foundIndex = answerLetters.indexOf(guess[i]);
      if (foundIndex !== -1) {
        result[i] = "present";
        answerLetters[foundIndex] = null;
      }
    }
  }

  return result;
}

function applyEvaluation(evaluation) {
  for (let col = 0; col < COLS; col += 1) {
    const tile = getTile(currentRow, col);
    tile.classList.add(evaluation[col]);
    tile.classList.add("filled");
    updateKeyboardKey(boardState[currentRow][col], evaluation[col]);
  }
}

function getTile(row, col) {
  return board.querySelector(`.tile[data-row='${row}'][data-col='${col}']`);
}

function updateTile(row, col) {
  const tile = getTile(row, col);
  tile.textContent = boardState[row][col] || "";
  if (boardState[row][col]) {
    tile.classList.add("filled");
  } else {
    tile.classList.remove("filled", "correct", "present", "absent");
  }
}

function updateKeyboardKey(letter, status) {
  const keyButtons = Array.from(keyboard.querySelectorAll(".key"));
  const target = keyButtons.find((button) => button.textContent.toLowerCase() === letter.toLowerCase());
  if (!target || target.textContent === "Delete" || target.textContent === "Reset") return;

  if (target.classList.contains("correct")) return;
  if (target.classList.contains("present") && status === "absent") return;

  target.classList.remove("absent", "present", "correct");
  target.classList.add(status);
}

function showMessage(text, isError) {
  message.textContent = text;
  message.style.color = isError ? "#f87171" : "#d7dadc";
}

window.addEventListener("keydown", (event) => {
  if (isGameOver) return;
  const key = event.key;

  if (key === "Enter") {
    handleKey("Enter");
    event.preventDefault();
    return;
  }

  if (key === "Backspace") {
    handleKey("Delete");
    event.preventDefault();
    return;
  }

  if (/^[a-zA-Z]$/.test(key)) {
    handleKey(key.toLowerCase());
  }
});

enterButton.addEventListener("click", () => handleKey("Enter"));

initGame();

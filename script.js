// Declare variables to hold JSON data globally
let dictionary, dictionary6, targetWords, targetWords6;
let targetWord = 'stier';

// Function to fetch JSON files
async function loadJsonFiles() {
  try {
    const [dictData, dict6Data, targetData, target6Data] = await Promise.all([
      fetch('./dictionary.json').then((response) => response.json()),
      fetch('./dictionary6.json').then((response) => response.json()),
      fetch('./targetWords.json').then((response) => response.json()),
      fetch('./targetWords6.json').then((response) => response.json()),
    ]);

    // Assign fetched data to global variables
    dictionary = dictData;
    dictionary6 = dict6Data;
    targetWords = targetData;
    targetWords6 = target6Data;

    // Getting a random word from the targetlist
    targetWord = targetWords[Math.floor(Math.random() * targetWords.length)];

    // Set default word lists and start the game
    TargetWords = targetWords;
    Dictionary = dictionary;
    startInteraction(); // Start the game after JSON data has loaded
  } catch (error) {
    console.error('Error loading JSON files:', error);
    showAlert('Failed to load game data. Please refresh.');
  }
}

// Call the loadJsonFiles function when the page loads
window.addEventListener('load', loadJsonFiles);

let TargetWords = targetWords;
let Dictionary = dictionary;

let WORD_LENGTH = 5;
const FLIP_ANIMATION_DURATION = 500;
const DANCE_ANIMATION_DURATION = 500;
const keyboard = document.querySelector('[data-keyboard]');
const alertContainer = document.querySelector('[data-alert-container]');
const guessGrid = document.querySelector('[data-guess-grid]');

startInteraction();

// JavaScript for opening and closing the modal
const openModalBtn = document.getElementById('openModalBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');

openModalBtn.addEventListener('click', () => {
  modalOverlay.style.display = 'flex'; // Show modal
});

closeModalBtn.addEventListener('click', () => {
  modalOverlay.style.display = 'none'; // Hide modal
});

// Hide modal when clicking outside of the modal content
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) {
    modalOverlay.style.display = 'none';
  }
});

const radioButtons = document.querySelectorAll('input[name="letterCount"]');

// Add an event listener to each radio button
radioButtons.forEach((radio) => {
  radio.addEventListener('change', (event) => {
    if (event.target.checked) {
      // Update the variable with the selected value
      changeAmountOfLetters(parseInt(event.target.value, 10));
    }
  });
});

function changeAmountOfLetters(count) {
  // Set new word lenght
  WORD_LENGTH = count;

  // Change word list
  if (count == 6) {
    TargetWords = targetWords6;
    Dictionary = dictionary6;
  } else {
    TargetWords = targetWords;
    Dictionary = dictionary;
  }

  // Change the html
  const guessGrid = document.querySelector('.guess-grid');
  guessGrid.innerHTML = '';
  for (let i = 0; i < 6 * WORD_LENGTH; i++) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    guessGrid.appendChild(tile);
  }

  // Change the css
  let tileSize = '3rem';
  if (window.innerWidth > 600) tileSize = '4rem';
  if (window.innerWidth > 900 && window.innerHeight > 900) tileSize = '5rem';
  guessGrid.style.gridTemplateColumns = `repeat(${WORD_LENGTH}, ${tileSize})`;

  // Reset the game
  resetGame();
}

window.addEventListener('resize', () => {
  // Change gird size if needed
  let tileSize = '3rem';
  if (window.innerWidth > 600) tileSize = '4rem';
  if (window.innerWidth > 900 && window.innerHeight > 900) tileSize = '5rem';
  guessGrid.style.gridTemplateColumns = `repeat(${WORD_LENGTH}, ${tileSize})`;
});

function startInteraction() {
  document.addEventListener('click', handleMouseClick);
  document.addEventListener('keydown', handleKeyPress);
}

function stopInteraction() {
  document.removeEventListener('click', handleMouseClick);
  document.removeEventListener('keydown', handleKeyPress);
}

function handleMouseClick(e) {
  if (e.target.matches('[data-key]')) {
    pressKey(e.target.dataset.key);
    return;
  }

  if (e.target.matches('[data-enter]')) {
    submitGuess();
    return;
  }

  if (e.target.matches('[data-delete]')) {
    deleteKey();
    return;
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter') {
    submitGuess();
    return;
  }

  if (e.key === 'Backspace' || e.key === 'Delete') {
    deleteKey();
    return;
  }

  if (e.key.match(/^[a-z]$/)) {
    pressKey(e.key);
    return;
  }
}

function pressKey(key) {
  const activeTiles = getActiveTiles();
  if (activeTiles.length >= WORD_LENGTH) return;
  const nextTile = guessGrid.querySelector(':not([data-letter])');
  nextTile.dataset.letter = key.toLowerCase();
  nextTile.textContent = key;
  nextTile.dataset.state = 'active';
}

function deleteKey() {
  const activeTiles = getActiveTiles();
  const lastTile = activeTiles[activeTiles.length - 1];
  if (lastTile == null) return;
  lastTile.textContent = '';
  delete lastTile.dataset.state;
  delete lastTile.dataset.letter;
}

function submitGuess() {
  const activeTiles = [...getActiveTiles()];
  if (activeTiles.length !== WORD_LENGTH) {
    showAlert('Not enough letters');
    shakeTiles(activeTiles);
    return;
  }

  const guess = activeTiles.reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, '');

  if (!Dictionary.includes(guess)) {
    showAlert('Not in word list');
    shakeTiles(activeTiles);
    return;
  }

  stopInteraction();
  activeTiles.forEach((...params) => flipTile(...params, guess));
}

function flipTile(tile, index, array, guess) {
  const guessLetters = guess.split('');
  let tempTargetWord = targetWord.split(''); // Create a mutable copy of the target word

  // Store marking results here for applying after animation
  const markingResults = Array(array.length).fill('wrong');

  // First pass: Mark letters that are correct (green) and remove them from tempTargetWord
  guessLetters.forEach((letter, i) => {
    if (tempTargetWord[i] === letter) {
      markingResults[i] = 'correct';
      tempTargetWord[i] = null; // Remove from temp to prevent double-counting
    }
  });

  // Second pass: Mark letters that are in the word but in the wrong location (yellow)
  guessLetters.forEach((letter, i) => {
    if (markingResults[i] !== 'correct' && tempTargetWord.includes(letter)) {
      markingResults[i] = 'wrong-location';
      tempTargetWord[tempTargetWord.indexOf(letter)] = null; // Remove to prevent double-counting
    }
  });

  // Flip tiles with a smooth transition, applying marking results after flipping
  array.forEach((tile, i) => {
    const letter = tile.dataset.letter;
    const key = keyboard.querySelector(`[data-key="${letter}"i]`);

    // Apply flip effect with delay
    setTimeout(() => {
      tile.classList.add('flip');
    }, (i * FLIP_ANIMATION_DURATION) / 2);

    tile.addEventListener(
      'transitionend',
      () => {
        tile.classList.remove('flip');

        // Apply marking results to each tile
        tile.dataset.state = markingResults[i];
        if (markingResults[i] === 'correct') {
          key.classList.add('correct');
        } else if (markingResults[i] === 'wrong-location') {
          key.classList.add('wrong-location');
        } else {
          key.classList.add('wrong');
        }
      },
      { once: true }
    );
  });

  if (index === array.length - 1) {
    setTimeout(() => {
      startInteraction();
      checkWinLose(guess, array);
    }, (FLIP_ANIMATION_DURATION * 5) / 2);
  }
}

function getActiveTiles() {
  return guessGrid.querySelectorAll('[data-state="active"]');
}

function showAlert(message, duration = 1000, resetgame = false) {
  const alert = document.createElement('div');
  alert.textContent = message;
  alert.classList.add('alert');
  alertContainer.prepend(alert);
  if (duration == null) return;

  setTimeout(() => {
    alert.classList.add('hide');
    alert.addEventListener('transitionend', () => {
      alert.remove();
      if (resetgame) resetGame();
    });
  }, duration);
}

function resetGame() {
  // Clear the guess grid
  guessGrid.querySelectorAll('[data-letter]').forEach((tile) => {
    tile.textContent = '';
    delete tile.dataset.letter;
    delete tile.dataset.state;
  });

  // Reset keyboard states
  keyboard.querySelectorAll('[data-key]').forEach((key) => {
    key.classList.remove('correct', 'wrong-location', 'wrong');
  });

  // Select a new target word
  targetWord = TargetWords[Math.floor(Math.random() * TargetWords.length)];

  // Restart interaction
  startInteraction();
}

function shakeTiles(tiles) {
  tiles.forEach((tile) => {
    tile.classList.add('shake');
    tile.addEventListener(
      'animationend',
      () => {
        tile.classList.remove('shake');
      },
      { once: true }
    );
  });
}

function checkWinLose(guess, tiles) {
  if (guess === targetWord) {
    showAlert('You Win', 5000, true);
    danceTiles(tiles);
    stopInteraction();
    return;
  }

  const remainingTiles = guessGrid.querySelectorAll(':not([data-letter])');
  if (remainingTiles.length === 0) {
    showAlert(targetWord.toUpperCase(), 5000, true);
    stopInteraction();
  }
}

function danceTiles(tiles) {
  tiles.forEach((tile, index) => {
    setTimeout(() => {
      tile.classList.add('dance');
      tile.addEventListener(
        'animationend',
        () => {
          tile.classList.remove('dance');
        },
        { once: true }
      );
    }, (index * DANCE_ANIMATION_DURATION) / 5);
  });
}

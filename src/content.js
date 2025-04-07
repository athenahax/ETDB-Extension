const API_URL = 'https://etdb.athena.cn.com:3000/api';

let eloTerrorists = [];
let shareCode = '';
let syncInterval;

async function init() {
  const storage = await chrome.storage.local.get('shareCode');
  shareCode = storage.shareCode || '';

  if (shareCode) {
    syncTerroristList();
    startPeriodicSync();
    scanAndMarkPlayers();
    addMutationObserver();
  }
}

async function syncTerroristList() {
  try {
    if (!shareCode) return;

    const response = await fetch(`${API_URL}/users/${shareCode}`);

    if (!response.ok) {
      console.error('Failed to sync with database. Status:', response.status);
      return;
    }

    const data = await response.json();
    eloTerrorists = data.users || [];

    console.log('Synced Elo Terrorist list. Count:', eloTerrorists.length);
  } catch (error) {
    console.error('Error syncing with database:', error);
  }
}

function startPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(() => {
    syncTerroristList().then(() => {
      scanAndMarkPlayers();
    });
  }, 10000);
}

function scanAndMarkPlayers() {
  const nicknameElements = document.querySelectorAll('[class*="Nickname__Name"]');

  nicknameElements.forEach(element => {
    const nickname = element.textContent.trim();
    if (eloTerrorists.includes(nickname)) {
      markPlayerAsTerrorist(element);
    }
  });
}

function markPlayerAsTerrorist(nicknameElement) {
  let rosterPlayerElement = nicknameElement;

  for (let i = 0; i < 5; i++) {
    if (!rosterPlayerElement || !rosterPlayerElement.parentElement) break;
    rosterPlayerElement = rosterPlayerElement.parentElement;

    if (rosterPlayerElement.className && rosterPlayerElement.className.includes('RosterPlayer')) {
      break;
    }
  }

  if (!rosterPlayerElement) return;

  nicknameElement.style.color = '#FF0000';
  nicknameElement.style.fontWeight = 'bold';
  nicknameElement.title = 'This player is an ELO TERRORIST';
}

function addMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (eloTerrorists.length > 0) {
      scanAndMarkPlayers();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateShareCode') {
    shareCode = message.shareCode;
    chrome.storage.local.set({ shareCode });

    syncTerroristList().then(() => {
      scanAndMarkPlayers();
      startPeriodicSync();
    });

    sendResponse({ success: true });
  }
});

window.addEventListener('load', init);
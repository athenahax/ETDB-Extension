document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://etdb.athena.cn.com:3000/api';
  
  const shareCodeInput = document.getElementById('share-code');
  const saveButton = document.getElementById('save-button');
  const statusDiv = document.getElementById('status');
  
  chrome.storage.local.get('shareCode', (data) => {
    if (data.shareCode) {
      shareCodeInput.value = data.shareCode;
      showStatus('info', `Currently using share code: ${data.shareCode}`);
    }
  });
  
  saveButton.addEventListener('click', () => {
    const shareCode = shareCodeInput.value.trim();
    
    if (!shareCode) {
      showStatus('error', 'Please enter a share code');
      return;
    }
    
    fetch(`${API_URL}/users/${shareCode}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Invalid share code');
        }
        return response.json();
      })
      .then(() => {
        chrome.storage.local.set({ shareCode }, () => {
          showStatus('success', 'Share code saved successfully!');
          
          getCurrentTab().then(tab => {
            if (tab && tab.url && tab.url.includes('faceit.com')) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'updateShareCode',
                shareCode
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error(chrome.runtime.lastError);
                } else if (response && response.success) {
                  console.log('Share code updated in content script');
                }
              });
            }
          });
        });
      })
      .catch(error => {
        showStatus('error', 'Error: ' + error.message);
      });
  });
  
  function showStatus(type, message) {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
  }
  
  async function getCurrentTab() {
    const queryOptions = { active: true, currentWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }
}); 
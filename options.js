document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api_key');
  const saveButton = document.getElementById('save');

  // Load the saved API key
  chrome.storage.sync.get('apiKey', (data) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });

  // Save the API key when the Save button is clicked
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    chrome.storage.sync.set({ apiKey }, () => {
      alert('API key saved!');
    });
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generate_tldr",
    title: "Generate TLDR",
    contexts: ["all"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generate_tldr") {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["api.js", "content.js"],
      });
      chrome.tabs.sendMessage(tab.id, { text: "generate_tldr" });
    } catch (error) {
      console.error("Error injecting content script:", error.message);
    }
  }
});

async function fetchEmbeddingsFromBackground(apiKey, text) {
  return new Promise(async (resolve, reject) => {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: [text],
        model: "text-embedding-ada-002",
      }),
    });

    if (response.ok) {
      const json = await response.json();
      resolve(json.data[0].embedding);
    } else {
      reject(`Error fetching embeddings: ${response.statusText}`);
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "fetchEmbeddings") {
    fetchEmbeddingsFromBackground(request.apiKey, request.text)
      .then((embeddings) => sendResponse({ embeddings }))
      .catch((error) => sendResponse({ error }));
    return true;
  }
});

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

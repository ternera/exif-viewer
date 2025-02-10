let lastClick = { x: 0, y: 0 };

try {
  chrome.runtime.onInstalled.addListener(() => {
    try {
      chrome.contextMenus.create({
        id: "viewExif",
        title: "View EXIF Data",
        contexts: ["image"],
        documentUrlPatterns: ["*://*/*", "file:///*"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[EXIF Viewer] Context menu creation error:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('[EXIF Viewer] Error creating context menu:', error);
    }
  });

  if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === "viewExif") {
        lastClick = { x: info.x, y: info.y };
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["exif.min.js", "content.js"]
        }, () => {
          chrome.tabs.sendMessage(tab.id, {
            action: "showExif",
            imgSrc: info.srcUrl,
            pageUrl: info.pageUrl
          }, response => {
            if (chrome.runtime.lastError) {
              console.error('[EXIF Viewer] Error sending message:', chrome.runtime.lastError);
            }
          });
        });
      }
    });
  }
} catch (error) {
  console.error('[EXIF Viewer] Background script error:', error);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getClickPosition") {
    sendResponse(lastClick);
  }
});

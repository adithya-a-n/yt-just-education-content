// YouTube Educational Content Filter - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Educational Filter: Extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
        filterEnabled: true,
        blockedCount: 0
    });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateBadge') {
        // Update extension badge with blocked count
        const count = message.count;
        const badgeText = count > 0 ? count.toString() : '';
        
        chrome.action.setBadgeText({
            text: badgeText,
            tabId: sender.tab.id
        });
        
        chrome.action.setBadgeBackgroundColor({
            color: '#d73027' // Red color for blocked content
        });
        
        // Store the count
        chrome.storage.local.set({
            [`blockedCount_${sender.tab.id}`]: count
        });
    }
});

// Reset badge when tab is updated (new page load)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
        chrome.storage.local.remove(`blockedCount_${tabId}`);
    }
});

// Clean up storage when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(`blockedCount_${tabId}`);
});

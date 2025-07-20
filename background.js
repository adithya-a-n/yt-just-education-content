chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        filterEnabled: true,
        blockedCount: 0
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateBadge') {
        const count = message.count;
        const badgeText = count > 0 ? count.toString() : '';
        chrome.action.setBadgeText({text: badgeText, tabId: sender.tab.id});
        chrome.action.setBadgeBackgroundColor({color: '#d73027'});
        chrome.storage.local.set({[`blockedCount_${sender.tab.id}`]: count});
    }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
        chrome.storage.local.remove(`blockedCount_${tabId}`);
    }
});
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(`blockedCount_${tabId}`);
});

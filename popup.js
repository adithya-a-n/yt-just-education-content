// YouTube Educational Filter - Popup Script

document.addEventListener('DOMContentLoaded', function() {
    const filterToggle = document.getElementById('filter-toggle');
    const statusIndicator = document.getElementById('status-indicator');
    const blockedCountElement = document.getElementById('blocked-count');
    const allowedCountElement = document.getElementById('allowed-count');
    const resetStatsLink = document.getElementById('reset-stats');

    // Load current settings
    loadSettings();
    loadStatistics();

    filterToggle.addEventListener('click', function() {
        const isActive = filterToggle.classList.contains('active');
        const newState = !isActive;
        updateToggleUI(newState);
        chrome.storage.sync.set({ filterEnabled: newState }, function() {
            chrome.tabs.query({ url: '*://*.youtube.com/*' }, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.reload(tab.id);
                });
            });
        });
    });

    resetStatsLink.addEventListener('click', function(e) {
        e.preventDefault();
        resetStatistics();
    });

    function loadSettings() {
        chrome.storage.sync.get(['filterEnabled'], function(result) {
            const isEnabled = result.filterEnabled !== false; // default to true
            updateToggleUI(isEnabled);
        });
    }

    function updateToggleUI(isEnabled) {
        if (isEnabled) {
            filterToggle.classList.add('active');
            statusIndicator.classList.add('status-active');
            statusIndicator.classList.remove('status-inactive');
        } else {
            filterToggle.classList.remove('active');
            statusIndicator.classList.add('status-inactive');
            statusIndicator.classList.remove('status-active');
        }
    }

    function loadStatistics() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('youtube.com')) {
                const tabId = tabs[0].id;
                chrome.storage.local.get([`blockedCount_${tabId}`], function(result) {
                    const blockedCount = result[`blockedCount_${tabId}`] || 0;
                    blockedCountElement.textContent = blockedCount;
                });
            }
        });
        chrome.storage.sync.get(['totalBlocked', 'totalAllowed'], function(result) {
            const totalBlocked = result.totalBlocked || 0;
            const totalAllowed = result.totalAllowed || 0;
            allowedCountElement.textContent = Math.max(0, totalAllowed);
        });
    }

    function resetStatistics() {
        chrome.storage.sync.set({
            totalBlocked: 0,
            totalAllowed: 0
        }, function() {
            blockedCountElement.textContent = '0';
            allowedCountElement.textContent = '0';
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0]) {
                    chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
                }
            });
        });
    }

    const updateInterval = setInterval(loadStatistics, 2000);
    window.addEventListener('beforeunload', function() {
        clearInterval(updateInterval);
    });
});

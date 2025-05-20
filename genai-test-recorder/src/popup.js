// Minimal popup.js for three fields: start-recording, open-sidepanel, configPatterns

const startBtn = document.getElementById('start-recording');
const openSidePanelBtn = document.getElementById('open-sidepanel');
const configInput = document.getElementById('configPatterns');

// Save config patterns to background
function saveConfig() {
    if (configInput) {
        const patterns = configInput.value.split('\n').map(p => p.trim()).filter(Boolean);
        chrome.runtime.sendMessage({ action: 'updateConfig', patterns });
    }
}

// Start Recording: save config, start recording, open side panel, close popup
startBtn.addEventListener('click', () => {
    saveConfig();
    chrome.runtime.sendMessage({ action: 'startRecording' }, () => {
        chrome.windows.getCurrent({}, (win) => {
            if (win && win.id !== undefined && win.id !== chrome.windows.WINDOW_ID_NONE) {
                chrome.sidePanel.open({ windowId: win.id });
            } else {
                chrome.sidePanel.open({});
            }
            window.close();
        });
    });
});

// Open Side Panel: open side panel, close popup
if (openSidePanelBtn && chrome.sidePanel) {
    openSidePanelBtn.addEventListener('click', () => {
        chrome.windows.getCurrent({}, (win) => {
            if (win && win.id !== undefined && win.id !== chrome.windows.WINDOW_ID_NONE) {
                chrome.sidePanel.open({ windowId: win.id });
            } else {
                // fallback: open without windowId
                chrome.sidePanel.open({});
            }
            window.close();
        });
    });
}

// On popup load, fetch config patterns and display in textarea
chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
    if (response && Array.isArray(response.patterns) && configInput) {
        configInput.value = response.patterns.join('\n');
    }
});
// Minimal popup.js for three fields: start-recording, open-sidepanel

const startBtn = document.getElementById('start-recording');
const openSidePanelBtn = document.getElementById('open-sidepanel');



// Start Recording: save start recording, open side panel, close popup
startBtn.addEventListener('click', () => {
    window.recordedSteps = [];
    window.apiResponses = [];
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

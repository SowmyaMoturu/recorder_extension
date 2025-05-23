let isRecording = false;
let hasStoppedRecording = false;

const startBtn = document.getElementById('start-recording');
const stopBtn = document.getElementById('stop-recording');
const exportBtn = document.getElementById('export-json');
const scriptDisplay = document.getElementById('scriptDisplay');
const configInput = document.getElementById('configPatterns');
const statusDiv = document.getElementById('status');

let recordedSteps = [];

chrome.runtime.sendMessage({ action: 'getRecordingState' }, (response) => {
    if (response && typeof response.isRecording === "boolean") {
        isRecording = response.isRecording;
        updateButtons();
        statusDiv.textContent = isRecording ? "Recording started." : "";
    }
});
fetchRecordedSteps();

// Update UI button states
function updateButtons() {
    startBtn.disabled = isRecording;
    stopBtn.disabled = !isRecording;
    exportBtn.disabled = recordedSteps.length === 0;
}

// Save config and send to background
function saveConfig() {
    if (configInput) {
        const patterns = configInput.value.split('\n').map(p => p.trim()).filter(Boolean);
        chrome.runtime.sendMessage({ action: 'updateConfig', patterns });
    }
}

// Start recording
startBtn.addEventListener('click', () => {
    saveConfig();
    chrome.runtime.sendMessage({ action: 'startRecording' }, () => {
        isRecording = true;
        statusDiv.textContent = "Recording started.";
        recordedSteps = [];
        recordedApiCalls = [];
        scriptDisplay.textContent = "";
        if (typeof apiCallsDisplay !== "undefined") {
            apiCallsDisplay.textContent = "";
        }
        updateButtons();
    });
});


// Export as JSON
exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(recordedSteps, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "genai-recording.json";
    a.click();
    URL.revokeObjectURL(url);
});

function fetchRecordedSteps(callback) {
    chrome.runtime.sendMessage({ action: 'getRecordedSteps' }, (response) => {
        if (Array.isArray(response?.steps) && response.steps.length > 0) {
            recordedSteps = response.steps;
            scriptDisplay.innerHTML = syntaxHighlight(response.steps);
        } else {
            recordedSteps = [];
            scriptDisplay.textContent = "No actions recorded";
        }
        if (callback) callback();
    });
}

// Stop recording
stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopRecording' }, () => {
        isRecording = false;
        hasStoppedRecording = true;
        statusDiv.textContent = "Recording stopped.";
        fetchRecordedSteps(() => {
            fetchRecordedApiResponses(() => {
                updateButtons();
            });
        });
    });
});


// On popup load, get initial recording state, config, and steps
chrome.runtime.sendMessage({ action: 'getRecordingState' }, (response) => {
    if (response && typeof response.isRecording === "boolean") {
        isRecording = response.isRecording;
        updateButtons();
    }
});
chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
    if (response && Array.isArray(response.patterns) && configInput) {
        configInput.value = response.patterns.join('\n');
    }
});


// Listen for messages from background (optional, for live updates)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateSteps') {
        recordedSteps = request.steps || [];
        scriptDisplay.textContent = JSON.stringify(recordedSteps, null, 2);
        updateButtons();
    }
});

function syntaxHighlight(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

fetchRecordedSteps();

function fetchRecordedApiResponses(callback) {
    chrome.runtime.sendMessage({ action: 'getRecordedApiCalls' }, (response) => {
        if (Array.isArray(response?.apiCalls) && response.apiCalls.length > 0) {
            recordedApiCalls = response.apiCalls;
            if (typeof apiCallsDisplay !== "undefined") {
                apiCallsDisplay.innerHTML = syntaxHighlight(response.apiCalls);
            }
        } else {
            recordedApiCalls = [];
            if (typeof apiCallsDisplay !== "undefined") {
                apiCallsDisplay.textContent = "No API calls recorded.";
            }
        }
        if (callback) callback();
    });
}

fetchRecordedApiResponses();

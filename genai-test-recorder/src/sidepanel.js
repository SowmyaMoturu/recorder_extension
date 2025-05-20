let isRecording = false;
let hasStoppedRecording = false;

const startBtn = document.getElementById('start-recording');
const stopBtn = document.getElementById('stop-recording');
const exportBtn = document.getElementById('export-json');
const scriptDisplay = document.getElementById('scriptDisplay');

const statusDiv = document.getElementById('status');
let recordedSteps = [];

// Add at the top with your other DOM references and variables
const apiCallsDisplay = document.getElementById('apiCallsDisplay');
let apiResponses = [];


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



// Start recording
startBtn.addEventListener('click', () => {
    isRecording = true;
    window.recordedSteps = [];
    window.apiResponses = [];
    scriptDisplay.textContent = "";
    apiCallsDisplay.textContent = "";
    chrome.runtime.sendMessage({ action: 'startRecording' }, () => {
        isRecording = true;
        statusDiv.textContent = "Recording started.";
        recordedSteps = [];
        recordedApiResponses = [];
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


// On popup load, get initial recording state,  and steps
chrome.runtime.sendMessage({ action: 'getRecordingState' }, (response) => {
    if (response && typeof response.isRecording === "boolean") {
        isRecording = response.isRecording;
        updateButtons();
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
    chrome.runtime.sendMessage({ action: 'getRecordedApiResponses' }, (response) => {
        if (Array.isArray(response?.apiResponses) && response.apiResponses.length > 0) {
            apiResponses = response.apiResponses;
            if (typeof apiCallsDisplay !== "undefined") {
                apiCallsDisplay.innerHTML = syntaxHighlight(response.apiResponses);
            }
        } else {
            apiResponses = [];
            if (typeof apiCallsDisplay !== "undefined") {
                apiCallsDisplay.textContent = "No API Responses recorded";
            }
        }
        if (callback) callback();
    });
}

fetchRecordedApiResponses();

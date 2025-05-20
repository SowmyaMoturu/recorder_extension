let isRecording = false;
let recordedActions = [];
let recordedApiResponses = [];
let debugLogs = [];
let configPatterns = ["*://your-api-domain.com/*"]; // Default
let recordedApiCalls = [];

chrome.runtime.onInstalled.addListener(() => {
    console.log('GenAI Test Recorder extension installed or updated.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "startRecording":
            isRecording = true;
            recordedActions = [];
            recordedApiCalls = [];
            chrome.tabs.query({}, (tabs) => {
                for (const tab of tabs) {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, { action: "updateRecordingState", isRecording: true });
                    }
                }
            });
            console.log("Recording started.");
            sendResponse({ status: "started" });
            break;
        case "stopRecording":
            isRecording = false;
            chrome.tabs.query({}, (tabs) => {
                for (const tab of tabs) {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, { action: "updateRecordingState", isRecording: false });
                    }
                }
            });
            console.log("Recording stopped.");
            sendResponse({ status: "stopped" });
            console.log(recordedActions)
            break;
        case "recordAction":
            console.log("Recording action:", request.payload);
            if (isRecording) {
                recordedActions.push(request.payload);
            }
            sendResponse({ status: "recorded" });
            break;
        case "API_CAPTURED":
            if (isRecording && request.payload) {
                recordedApiResponses.push(request.payload);
            }
        break;
        case "getRecordingState":
            sendResponse({ isRecording });
            break;
        case "updateConfig":
            configPatterns = Array.isArray(request.patterns) && request.patterns.length ? request.patterns : configPatterns;
            sendResponse({ status: "updated", patterns: configPatterns });
            break;
        case "getConfig":
            sendResponse({ patterns: configPatterns });
            break;
        case "getExportData":
            sendResponse({ steps: recordedActions, apiCalls: recordedApiCalls });
            break;
        case "getRecordedSteps":
            sendResponse({ steps: recordedActions });
            break;
        case "getRecordedApiResponses":
            sendResponse({ apiResponses: recordedApiResponses });
            break;
        case "debugLog":
            debugLogs.push(`[${new Date().toLocaleTimeString()}] ${request.message}`);
            if (debugLogs.length > 200) debugLogs.shift();
            break;
        case "getDebugLogs":
            sendResponse({ logs: debugLogs });
            break;
        default:
            sendResponse({ status: "unknown action" });
    }
    return true;
});


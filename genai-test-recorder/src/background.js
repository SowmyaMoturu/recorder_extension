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
            if (isRecording) {
                recordedActions.push(request.payload);
            }
            sendResponse({ status: "recorded" });
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
        case "getRecordedApiCalls":
            sendResponse({ apiCalls: recordedApiCalls });
            break;
        case "debugLog":
            debugLogs.push(`[${new Date().toLocaleTimeString()}] ${request.message}`);
            if (debugLogs.length > 200) debugLogs.shift();
            break;
        case "getDebugLogs":
            sendResponse({ logs: debugLogs });
            break;
        case "apiResponseBody":
            console.log("BG received apiResponseBody:", request); // Add this
            if (isRecording) {
                recordedApiResponses.push({
                    url: request.url,
                    method: request.method,
                    status: request.status,
                    body: request.body,
                    timeStamp: Date.now()
                });
            }
            break;
        default:
            sendResponse({ status: "unknown action" });
    }
    return true;
});



chrome.webRequest.onCompleted.addListener(
    function (details) {
        if (!isRecording) return;
        // Filter for XHR and fetch requests only
        if (details.type === "xmlhttprequest" || details.type === "fetch") {
            recordedApiCalls.push({
                url: details.url,
                method: details.method,
                statusCode: details.statusCode,
                timeStamp: details.timeStamp,
                type: details.type,
                initiator: details.initiator,
                tabId: details.tabId
            });
            console.log("API intercepted:", details.url);
        }
    },
    { urls: ["<all_urls>"] }
);

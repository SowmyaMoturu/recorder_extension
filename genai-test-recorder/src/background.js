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
                        injectEventCaptureListeners(tab.id); // <-- Inject event listeners here
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
            console.log(recordedActions);
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

// Injects UI event listeners into the active tab
function injectEventCaptureListeners(tabId) {
    chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            console.log("Injected UI event listeners");

            document.addEventListener('click', (event) => {
                window.postMessage({
                    type: 'GENAI_EVENT',
                    eventType: 'click',
                    tag: event.target.tagName,
                    class: event.target.className,
                    id: event.target.id,
                    name: event.target.name,
                    value: event.target.value || event.target.innerText
                }, '*');
            }, true);

            document.addEventListener('input', (event) => {
                if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                    window.postMessage({
                        type: 'GENAI_EVENT',
                        eventType: 'input',
                        tag: event.target.tagName,
                        class: event.target.className,
                        id: event.target.id,
                        name: event.target.name,
                        value: event.target.value
                    }, '*');
                }
            }, true);

            document.addEventListener('change', (event) => {
                if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
                    window.postMessage({
                        type: 'GENAI_EVENT',
                        eventType: 'change',
                        tag: event.target.tagName,
                        class: event.target.className,
                        id: event.target.id,
                        name: event.target.name,
                        value: event.target.value
                    }, '*');
                }
            }, true);
        }
    });
}

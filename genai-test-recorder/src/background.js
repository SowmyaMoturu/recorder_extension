
let isRecording = false;
let recordedActions = [];
let recordedApiResponses = [];

 function handleMessage(request, sender, sendResponse) {
    switch (request.action) {
        case "startRecording":
            isRecording = true;
            recordedActions = [];
            recordedApiResponses = [];
            sendResponse && sendResponse({ status: "started" });
            break;
        case "stopRecording":
            isRecording = false;
            sendResponse && sendResponse({ status: "stopped" });
            break;
        case "recordAction":
            if (isRecording) recordedActions.push(request.payload);
            sendResponse && sendResponse({ status: "recorded" });
            break;
        case "apiCaptured":
            if (isRecording && request.payload) recordedApiResponses.push(request.payload);
            break;
        case "getRecordedSteps":
            sendResponse && sendResponse({ steps: recordedActions });
            break;
        case "getRecordedApiResponses":
            sendResponse && sendResponse({ apiResponses: recordedApiResponses });
            break;
        case "getRecordingState":
            sendResponse && sendResponse({ isRecording });
        break;
    }
}

 function resetState() {
    isRecording = false;
    recordedActions = [];
    recordedApiResponses = [];
}

 function getState() {
    return { isRecording, recordedActions, recordedApiResponses };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true;
});
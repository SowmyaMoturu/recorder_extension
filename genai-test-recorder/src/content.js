let isRecording = false;

// --- Inject API/User Action Interceptor ---
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/intercept.js');
script.onload = function () { this.remove(); };
(document.head || document.documentElement).appendChild(script);

// --- Listen for Intercepted API Calls and User Actions ---
window.addEventListener('message', (event) => {
  if (!event.data || event.source !== window) return;

  // User actions from injected script
  if (event.data.type === 'USER_ACTION_CAPTURED' || event.data.type === 'NAVIGATION_EVENT_CAPTURED') {
    chrome.runtime.sendMessage({ action: 'recordAction', payload: event.data.payload });
  }

  // API calls from injected script
  if (event.data.type === 'INTERCEPTED_FETCH' || event.data.type === 'INTERCEPTED_XHR') {
    const { type, url, method, requestBody, responseBody, status, headers } = event.data;
    const payload = {
      type,
      url,
      method,
      requestBody,
      responseBody,
      status,
      headers,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href
    };
    chrome.runtime.sendMessage({ action: 'apiCaptured', payload });
  }
});

// --- Recording State Sync ---
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "updateRecordingState") {
    isRecording = request.isRecording;
  }
});
chrome.runtime.sendMessage({ action: "getRecordingState" }, (response) => {
  if (response && typeof response.isRecording === "boolean") {
    isRecording = response.isRecording;
  }
});
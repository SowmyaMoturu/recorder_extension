let isRecording = false;
let lastHighlightedElement = null;
let lastRecordedUrl = window.location.href;
let lastDomHash = '';

const recentNetworkEvents = [];
let observer = null;

// --- DOM Highlighting ---
function highlightElement(element) {
  removeHighlight();
  if (element && element.style) {
    element.__originalOutline = element.style.outline;
    element.style.outline = '2px solid #ff9800';
    lastHighlightedElement = element;
  }
}

function removeHighlight() {
  if (lastHighlightedElement && lastHighlightedElement.style) {
    lastHighlightedElement.style.outline = lastHighlightedElement.__originalOutline || '';
    delete lastHighlightedElement.__originalOutline;
    lastHighlightedElement = null;
  }
}


// --- DOM Hashing for Change Detection ---
function getDomHash() {
  // Simple hash: can be replaced with a better hash if needed
  return document.body.innerHTML.length + ':' + document.body.childElementCount;
}

function getFullDomSnapshot(){
  return document.body.innerHTML;
}

// --- Payload Construction ---
function buildPayload(eventType, target) {
  return {
    eventType,
    tagName: target.tagName,
    id: target.id,
    name: target.name,
    className: target.className,
    innerText: (target.innerText || '').substring(0, 50),
    textContent: target.textContent || '',
    value: target.value !== undefined ? target.value : undefined,
    timestamp: Date.now(),
    xpath: generateXPath(target),
    cssSelector: generateSelector(target),
    attributes: getAttributes(target),
    relatives: getRelativesInfo(target),
    url: window.location.href
  };
}

function getAttributes(el) {
  const attrs = {};
  if (el.hasAttribute('id')) attrs.id = el.getAttribute('id');
  if (el.hasAttribute('name')) attrs.name = el.getAttribute('name');
  if (el.hasAttribute('type')) attrs.type = el.getAttribute('type');
  if (el.hasAttribute('placeholder')) attrs.placeholder = el.getAttribute('placeholder');
  if (el.hasAttribute('data-testid')) attrs['data-testid'] = el.getAttribute('data-testid');
  return attrs;
}

function generateSelector(el) {
  if (el.id) return `#${el.id}`;
  if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.className) selector += '.' + el.className.trim().split(/\s+/).join('.');
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(' > ');
}

function generateXPath(el) {
  if (el.id) return `//*[@id="${el.id}"]`;
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = el.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) index++;
      sibling = sibling.previousSibling;
    }
    parts.unshift(`${el.nodeName}[${index}]`);
    el = el.parentNode;
  }
  return '/' + parts.join('/');
}

function getRelativesInfo(element) {
  const parent = element.parentElement;
  const siblings = parent ? Array.from(parent.children).filter(el => el !== element) : [];
  return {
    parent: parent ? {
      tagName: parent.tagName,
      dataTestId: parent.getAttribute('data-testid') || null
    } : null,
    siblings: siblings.map(sib => ({
      tagName: sib.tagName,
      dataTestId: sib.getAttribute('data-testid') || null
    }))
  };
}


// --- User Event Handler ---
function handleEvent(event) {
  if (!isRecording) return;
  highlightElement(event.target);

  // If page URL changed since last event, record navigation and attach to main event
  if (window.location.href !== lastRecordedUrl) {
    const prevUrl = lastRecordedUrl;
    lastRecordedUrl = window.location.href;
    recordNavigation("navigation-urlchange", { from: prevUrl, to: window.location.href });
  }

  // Build and send main user event payload
  const payload = buildPayload(event.type, event.target);
  chrome.runtime.sendMessage({ action: "recordAction", payload });
}

// --- Navigation Event Handler ---
function recordNavigation(eventType, extra = {}) {
  if (!isRecording) return;
  const domSnapshot = getFullDomSnapshot()
  lastDomHash = getDomHash();
  if(domSnapshot === lastDomHash) return; // Skip if no change detected
  const payload = {
    eventType,
    url: window.location.href,
    timestamp: Date.now(),
    domSnapshot,
    ...extra
  };
  chrome.runtime.sendMessage({ action: "recordAction", payload });
}

// --- Robust MutationObserver Setup ---
function setupObserver() {
  if (observer) observer.disconnect();
  if (!document.body) {
    setTimeout(setupObserver, 50);
    return;
  }
  observer = new MutationObserver(() => {
    lastDomHash = getDomHash();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
}

// --- Event Listeners ---
[
  "mousedown", "mouseup", "dblclick", "contextmenu",
  "touchstart", "touchend", "dragstart", "drop", "scroll", "wheel"
].forEach(eventType => {
  document.addEventListener(eventType, handleEvent, true);
});

window.addEventListener("popstate", () => {
  setupObserver();
  recordNavigation("navigation-popstate");
});
window.addEventListener("hashchange", () => {
  setupObserver();
  recordNavigation("navigation-hashchange");
});
window.addEventListener("beforeunload", () => recordNavigation("navigation-beforeunload"));
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    setupObserver();
    recordNavigation("navigation-pageshow-backforward");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setupObserver();
  recordNavigation("navigation-domcontentloaded");
});

// --- Recording State Sync ---
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "updateRecordingState") {
    isRecording = request.isRecording;
    if (!isRecording) removeHighlight();
  }
});
chrome.runtime.sendMessage({ action: "getRecordingState" }, (response) => {
  if (response && typeof response.isRecording === "boolean") {
    isRecording = response.isRecording;
    if (!isRecording) removeHighlight();
  }
});

// --- Inject API Interceptor ---
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/intercept.js');
script.onload = function () { this.remove(); };
document.documentElement.appendChild(script);

// --- Listen for Intercepted API Calls ---
window.addEventListener('message', (event) => {
  if (!event.data || (event.source !== window)) return;
  const { type, url, method, requestBody, responseBody, status, headers } = event.data;
  if (type === 'INTERCEPTED_FETCH' || type === 'INTERCEPTED_XHR') {
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
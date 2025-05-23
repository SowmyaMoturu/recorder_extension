
let isRecording = false;
let lastHighlightedElement = null;

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

function buildPayload(eventType, target) {
  console.log("Building payload for event: " + eventType);
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

function sendDebugLog(message) {
  chrome.runtime.sendMessage({ action: "debugLog", message });
}

function handleEvent(event) {
  if (!isRecording) return;
  highlightElement(event.target);
  const payload = buildPayload(event.type, event.target);
  chrome.runtime.sendMessage({ action: "recordAction", payload });
}

["click", "input", "change", "keydown", "keyup", "focus", "blur", "submit"].forEach(eventType => {
  document.addEventListener(eventType, handleEvent, true);
});

function recordNavigation(eventType, extra = {}) {
  if (!isRecording) return;
  const payload = {
    eventType,
    url: window.location.href,
    timestamp: Date.now(),
    ...extra
  };
  chrome.runtime.sendMessage({ action: "recordAction", payload });
}

window.addEventListener("popstate", () => recordNavigation("navigation-popstate"));
window.addEventListener("hashchange", () => recordNavigation("navigation-hashchange"));
window.addEventListener("beforeunload", () => recordNavigation("navigation-beforeunload"));
window.addEventListener("pageshow", (e) => {
  if (e.persisted) recordNavigation("navigation-pageshow-backforward");
});
document.addEventListener("DOMContentLoaded", () => {
  recordNavigation("navigation-domcontentloaded");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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


let isRecording = false;
let lastHighlightedElement = null;
let lastRecordedUrl = window.location.href;

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

function isInteractable(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = node.tagName.toLowerCase();
  if (["button", "input", "select", "textarea"].includes(tag)) return true;
  if (tag === "a" && node.hasAttribute("href")) return true;
  if (node.hasAttribute("tabindex") && node.getAttribute("tabindex") !== "-1") return true;
  if (node.hasAttribute("role")) {
    const role = node.getAttribute("role");
    if (["button", "link", "checkbox", "radio", "textbox", "switch", "menuitem"].includes(role)) return true;
  }
  return false;
}

function getLabel(node) {
  // aria-label
  if (node.getAttribute("aria-label")) return node.getAttribute("aria-label");
  // placeholder
  if (node.getAttribute("placeholder")) return node.getAttribute("placeholder");
  // <label for="id">
  if (node.labels && node.labels.length > 0) return node.labels[0].innerText;
  if (node.id) {
    const label = document.querySelector(`label[for="${node.id}"]`);
    if (label) return label.innerText;
  }
  // Previous sibling (common in some UIs)
  let prev = node.previousElementSibling;
  if (prev && prev.tagName.toLowerCase() === "label") {
    return prev.innerText;
  }
  // Parent label (e.g., <label><input ...>Text</label>)
  if (node.parentElement && node.parentElement.tagName.toLowerCase() === "label") {
    return node.parentElement.innerText.replace(node.value || "", "").trim();
  }
  // Parent text node (sometimes label is just before input)
  if (node.parentElement) {
    const parentText = node.parentElement.innerText || node.parentElement.textContent;
    if (parentText && parentText.length < 100) return parentText.trim();
  }
  // Fallback to innerText
  return node.innerText || node.textContent || "";
}

function crawlDOMInteractables(node) {
  let results = [];
  if (isInteractable(node)) {
    results.push({
      tag: node.tagName,
      type: node.type || null,
      id: node.id || null,
      name: node.name || null,
      class: node.className || null,
      "data-testid": node.getAttribute("data-testid") || null,
      placeholder: node.getAttribute("placeholder") || null,
      ariaLabel: node.getAttribute("aria-label") || null,
      label: getLabel(node),
      innerText: (node.innerText || node.textContent || "").trim(),
      value: node.value !== undefined ? node.value : null,
      xpath: generateXPath(node),
      cssSelector: generateSelector(node)
    });
  }
  // Recursively check children
  for (let child of node.children) {
    results = results.concat(crawlDOMInteractables(child));
  }
  return results;
}

function handleEvent(event) {
  if (!isRecording) return;
  highlightElement(event.target);
  const payload = buildPayload(event.type, event.target);
  // Detect navigation (full page reload or SPA navigation)
  let navigation = null;
  if (window.location.href !== lastRecordedUrl) {
    navigation = {
      from: lastRecordedUrl,
      to: window.location.href,
      timestamp: Date.now()
    };
    lastRecordedUrl = window.location.href;
  }

  // Attach navigation info if navigation occurred
  if (navigation) {
    payload.navigation = navigation;
  }
  payload.domSnapshot = crawlDOMInteractables(document.body);
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

const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/intercept.js');
script.onload = function () {
  this.remove();
};
document.documentElement.appendChild(script);

// Listen for intercepted fetch/xhr messages
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

    console.log('Captured API call:', payload);

    chrome.runtime.sendMessage({ action: 'apiCaptured', payload });
    
    }
  });

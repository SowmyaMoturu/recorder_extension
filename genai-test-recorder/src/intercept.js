(() => {
  if (window.__userActionCaptureStarted) return;
  window.__userActionCaptureStarted = true;

  const eventsToCapture = [
    "click",
    "input",
    "change",
    "keydown",
    "keyup",
    "focus",
    "blur",
    "submit"
  ];

  function getElementInfo(el) {
    if (!el) return {};
    return {
      tagName: el.tagName,
      id: el.id || null,
      classes: el.className || null,
      name: el.name || null,
      type: el.type || null,
      text: el.innerText?.slice(0, 100) || null,
      xpath: getXPath(el)
    };
  }

  function getXPath(element) {
    if (element.id !== '') return `//*[@id="${element.id}"]`;
    if (element === document.body) return '/HTML/BODY';
    let ix = 0;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        return getXPath(element.parentNode) + '/' + element.tagName + `[${ix + 1}]`;
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
    return '';
  }

  function handleEvent(e) {
    const info = {
      eventType: e.type,
      timestamp: Date.now(),
      element: getElementInfo(e.target),
      value: e.target.value || null,
      key: e.key || null,
      checked: e.target.checked !== undefined ? e.target.checked : null,
    };
    window.postMessage({ type: 'USER_ACTION_CAPTURED', payload: info }, '*');
  }

  eventsToCapture.forEach(eventType => {
    document.addEventListener(eventType, handleEvent, true);
  });

  // --- Intercept fetch ---
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    const fetchStart = Date.now();
    return origFetch.apply(this, args).then(async response => {
      const cloned = response.clone();
      let responseBody;
      try {
        responseBody = await cloned.text();
      } catch (e) {
        responseBody = '[unreadable]';
      }
      window.postMessage({
        type: 'INTERCEPTED_FETCH',
        url: args[0],
        method: (args[1] && args[1].method) || 'GET',
        requestBody: (args[1] && args[1].body) || null,
        responseBody,
        status: response.status,
        headers: Object.fromEntries(cloned.headers.entries())
      }, '*');
      return response;
    });
  };

  // --- Intercept XHR ---
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__method = method;
    this.__url = url;
    return origOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', function() {
      window.postMessage({
        type: 'INTERCEPTED_XHR',
        url: this.__url,
        method: this.__method,
        requestBody: body || null,
        responseBody: this.responseText,
        status: this.status,
        headers: this.getAllResponseHeaders()
      }, '*');
    });
    return origSend.apply(this, [body]);
  };

  function postNavigationEvent(eventType) {
  window.postMessage({
    type: 'NAVIGATION_EVENT_CAPTURED',
    payload: {
      eventType,
      timestamp: Date.now(),
      url: window.location.href
    }
  }, '*');
}

window.addEventListener("popstate", () => postNavigationEvent("navigation-popstate"));
window.addEventListener("hashchange", () => postNavigationEvent("navigation-hashchange"));
window.addEventListener("DOMContentLoaded", () => postNavigationEvent("navigation-domcontentloaded"));
window.addEventListener("pageshow", (e) => {
  if (e.persisted) postNavigationEvent("navigation-pageshow-backforward");
});

  console.log(`User action and API capture started for events: ${eventsToCapture.join(', ')}`);
})();
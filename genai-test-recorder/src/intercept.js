// intercept.js - Injected directly into the page context

(function () {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch(...args);
    const cloned = response.clone();

    cloned.text().then(body => {
      window.postMessage({
        type: 'INTERCEPTED_FETCH',
        url: cloned.url,
        method: args[1]?.method || 'GET',
        requestBody: args[1]?.body || null,
        responseBody: body,
        status: cloned.status,
        headers: [...cloned.headers.entries()],
      }, '*');
    }).catch(err => console.warn('Fetch clone failed:', err));

    return response;
  };

  const originalXHR = window.XMLHttpRequest;
  function ProxyXHR() {
    const xhr = new originalXHR();
    const send = xhr.send;
    let requestBody = null;

    xhr.open = new Proxy(xhr.open, {
      apply(target, thisArg, args) {
        thisArg._url = args[1];
        thisArg._method = args[0];
        return Reflect.apply(target, thisArg, args);
      }
    });

    xhr.send = function (...args) {
      requestBody = args[0];
      this.addEventListener('load', function () {
        try {
          window.postMessage({
            type: 'INTERCEPTED_XHR',
            url: this._url,
            method: this._method,
            requestBody: requestBody,
            responseBody: this.responseText,
            status: this.status,
            headers: parseHeaders(this.getAllResponseHeaders()),
          }, '*');
        } catch (err) {
          console.warn('XHR interception failed:', err);
        }
      });
      return send.apply(this, args);
    };

    return xhr;
  }

  function parseHeaders(headerStr) {
    const headers = {};
    const lines = headerStr.trim().split(/\r?\n/);
    for (let line of lines) {
      const parts = line.split(': ');
      const key = parts.shift();
      const value = parts.join(': ');
      headers[key] = value;
    }
    return headers;
  }

  window.XMLHttpRequest = ProxyXHR;
})();
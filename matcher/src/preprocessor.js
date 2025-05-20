
let raw_data = require("../data/sessions.json")
let fs = require('fs')
const { JSDOM } = require('jsdom');

function isUserAction(event) {
    const userTriggeredTypes = ["click", "fill", "change", "select", "input", "submit",
         "dblclick", "contextmenu", "dragstart", "drop" 
    ];
    const relevantSystemFeedback = [
        "navigation-domcontentloaded",     // page load
        "navigation-popstate",             // dynamic nav after click
        "navigation-hashchange",           // anchor nav after click
        "alert",                           // synthetic alert/dialog
        "dom-mutation",                    // UI change like modal/toast
        "network-response"                 // optional: use if you track API outcomes
    ];

    return userTriggeredTypes.includes(event.eventType) ||
        relevantSystemFeedback.includes(event.eventType);
}


function groupEventsByPage(events) {
    const groups = [];
    let current = [];

    for (const e of events) {
        if (e.eventType.includes('navigation')) {
            if (current.length) groups.push(current);
            current = [e];
        } else if (current.length && isUserAction(e)) {
            // Only add user actions after a navigation event has started a group
            current.push(e);
        }
    }
    if (current.length) groups.push(current);
    return groups;
}


function extractUniqueElementMetadata(events) {
    const uniqueMetadata = new Map();

    for (let i = 0; i < events.length; i++) {
        if (events[i].hasOwnProperty("domSnapshot")) {
            const domSnapshot = events[i].domSnapshot;
            const dom = new JSDOM(domSnapshot);
            const doc = dom.window.document;
            const elements = doc.querySelectorAll('*');
           
            Array.from(elements).forEach((element, index) => {
                const metadata = extractElementMetadata(element, index);
                const key = JSON.stringify(metadata); // crude uniqueness
                if (!uniqueMetadata.has(key)) {
                    uniqueMetadata.set(key, metadata);
                }
            });
            delete events[i].domSnapshot; // remove domSnapshot to save space
        }
    }

    // Write unique metadata to metadata.json
    fs.writeFileSync('matcher/data/metadata.json', JSON.stringify(Array.from(uniqueMetadata.values()), null, 2));
    return events; // unchanged
}

function extractElementMetadata(element, depth = 0) {
  return {
    tagName: element.tagName,
    attributes: ['id', 'class', 'name', 'type', 'role', "data-testid"]
      .reduce((acc, attr) => {
        if (element.hasAttribute(attr)) acc[attr] = element.getAttribute(attr);
        return acc;
      }, {}),
    ariaAttributes: Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('aria-'))
      .reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}),
    innerText: (element.innerText || "").trim().slice(0, 50), // limit length
    depth,
    index: Array.from(element.parentNode ? element.parentNode.children : []).indexOf(element),
    // Optionally add xpath or css selector
  };
}

function processData() {
    data = extractUniqueElementMetadata(raw_data["steps"])
    groupedData = groupEventsByPage(data)
    fs.writeFileSync('matcher/data/processed_sessions.json', JSON.stringify(groupedData))
}


processData()
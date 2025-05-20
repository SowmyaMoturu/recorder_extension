# GenAI Test Recorder

## Overview
GenAI Test Recorder is a Chrome extension designed to facilitate the recording and testing of user interactions and API calls within web applications. This extension allows users to capture and manage their interactions seamlessly, including user actions, navigation events, and network requests.

---

## Project Structure

```
genai-test-recorder
├── src
│   ├── background.js         # Background service worker 
│   ├── backgroundLogic.js    # Pure logic for background 
│   ├── content.js            # Content script (captures user actions, DOM metadata, navigation)
│   ├── intercept.js          # Injected script for API interception (fetch/XHR)
│   ├── popup.html            # Popup UI
│   ├── popup.js              # Popup logic
│   ├── sidepanel.html        # Side panel UI
│   ├── sidepanel.js          # Side panel logic
│   ├── styles.css            # Shared styles
│   └── icons/
│       ├── icon16.png
│       ├── icon32.png
│       └── icon128.png
├── manifest.json             # Chrome extension manifest (MV3, ES module background)
├── tests/                    # Jest unit tests for logic modules
│   └── background.test.js
└── README.md
```

---

## Features

- **Start/Stop Recording:** Capture user interactions and navigation events.
- **API Interception:** Records fetch and XHR calls made by the page.
- **Export Session:** Download the recorded session as a JSON file.
- **Show Recorded Steps:** View all captured actions and API calls in the side panel.
- **DOM Metadata:** Captures selectors, XPath, attributes, and relatives for each interacted element.
- **SPA Navigation Support:** Handles navigation events in single-page apps.

---

## Installation

1. Clone the repository or download the project files.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the `genai-test-recorder` directory.

---

## Usage

1. Click on the extension icon in the Chrome toolbar to open the popup interface.
2. Click "Start Recording" to begin capturing actions and navigation.
3. Interact with your web application as needed.
4. Click "Stop Recording" in the side panel to end the session.
5. Click "Export as JSON" to download the recorded steps and API calls.
6. The "Recorded Steps" and "Recorded API Calls" sections in the side panel display all captured actions.

---

## Testing

This project uses **Jest** and **Babel** to test ES module logic.

### Running Tests

1. Install dependencies:
   ```sh
   npm install
   ```

2. Run tests:
   ```sh
   npm test
   ```



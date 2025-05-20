# GenAI Test Recorder

## Overview
GenAI Test Recorder is a Chrome extension designed to facilitate the recording and testing of AI interactions within web applications. This extension allows users to capture and manage their interactions seamlessly, including user actions, navigation events, and network requests.

## Project Structure
The project is organized as follows:

```
genai-test-recorder
├── src
│   ├── background.js        # Background service worker logic (handles recording state, network requests, config)
│   ├── content.js           # Content script injected into all URLs (captures user actions, DOM metadata, navigation)
│   ├── domUtils.js          # Utility functions for DOM metadata extraction (selectors, XPath, attributes, relatives)
│   ├── popup.html           # HTML structure for the popup interface
│   ├── popup.js             # JavaScript logic for the popup (UI, export, config)
│   └── icons                # Icons for the extension
│       ├── icon16.png
│       ├── icon32.png
│       └── icon128.png
├── manifest.json            # Configuration file for the Chrome extension
└── README.md                # Documentation for the project
```

## Features

- **Start/Stop Recording:** Capture user interactions and navigation events.
- **Export Session:** Download the recorded session as a JSON file.
- **Show Recorded Steps:** View all captured actions in the popup.
- **Crawl Mode:** Always enabled; navigation events are automatically captured.
- **Configurable Network Patterns:** Set URL patterns to filter which network requests are associated with actions.
- **DOM Metadata:** Captures selectors, XPath, attributes, and relatives for each interacted element.

## Installation

1. Clone the repository or download the project files.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the `genai-test-recorder` directory.

## Usage

1. Click on the extension icon in the Chrome toolbar to open the popup interface.
2. Enter any custom URL patterns for network request capture (one per line).
3. Click "Start Recording" to begin capturing actions and navigation.
4. Interact with your web application as needed.
5. Click "Stop Recording" to end the session.
6. Click "Export as JSON" to download the recorded steps.
7. The "Recorded Steps" section in the popup displays all captured actions.

## Configuration

- **URL Patterns:**  
  Use the textarea in the popup to specify which network requests should be associated with actions. Patterns use Chrome match patterns (e.g., `*://api.example.com/*`).

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
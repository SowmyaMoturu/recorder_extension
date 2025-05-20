// src/background.js
import { handleMessage } from './backgroundLogic.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true;
});
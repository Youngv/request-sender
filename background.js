/**
 * Background Service Worker for Webhook Sender
 * 
 * This script runs in the background and manages the lifecycle of the extension.
 * It can also handle events like installation, updates, and messages from other parts of the extension.
 */

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Webhook Sender installed.');

        // Check if there's already a saved language preference
        chrome.storage.local.get('language', (result) => {
            // Initialize storage with an empty webhooks array and default language
            chrome.storage.local.set({
                webhooks: [],
                // Use saved language if exists, otherwise use browser UI language or default to 'en'
                language: result.language || chrome.i18n.getUILanguage() || 'en'
            }, () => {
                console.log('Storage initialized.');
            });
        });
    } else if (details.reason === 'update') {
        console.log(`Webhook Sender updated from ${details.previousVersion} to ${chrome.runtime.getManifest().version}.`);
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'send_webhook') {
        sendWebhook(message.webhook)
            .then(response => {
                // Only pass the success status when response.success is true
                sendResponse(response);
            })
            .catch(error => {
                // Ensure network errors are properly handled
                sendResponse({
                    success: false,
                    error: error.message,
                    status: 0
                });
            });

        // Return true to indicate we will send a response asynchronously
        return true;
    } else if (message.action === 'reload_extension') {
        // This operation tries to tell the extension to reload, but it may not work in some cases
        // End users may need to manually reload the extension
        try {
            chrome.runtime.reload();
            return true;
        } catch (error) {
            console.error('Failed to reload extension:', error);
            return false;
        }
    }
});

/**
 * Send a webhook request
 * @param {Object} webhook - The webhook configuration
 * @returns {Promise} - Promise resolving to the webhook response
 */
async function sendWebhook(webhook) {
    // Construct the fetch options
    const options = {
        method: webhook.method,
        headers: webhook.headers || {}
    };

    // Add content type header
    if (webhook.contentType) {
        options.headers['Content-Type'] = webhook.contentType;
    }

    // Add request body (except for GET requests)
    if (webhook.method !== 'GET' && webhook.body) {
        if (webhook.contentType === 'application/json') {
            options.body = typeof webhook.body === 'string'
                ? webhook.body
                : JSON.stringify(webhook.body);
        } else {
            options.body = webhook.body;
        }
    }

    try {
        // Send the request
        const response = await fetch(webhook.url, options);

        // Get response headers
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // Set success status explicitly
        const result = {
            success: response.ok,  // Only true when HTTP status code is in 200-299 range
            status: response.status,
            responseHeaders
        };

        // Parse the response
        const text = await response.text();
        let data;

        try {
            // Try to parse as JSON
            data = JSON.parse(text);
        } catch (error) {
            // If not JSON, use text
            data = text;
        }

        // Add response data
        result.response = data;

        // Add error info if request failed
        if (!response.ok) {
            result.error = `${response.status} ${response.statusText}`;
        }

        return result;
    } catch (error) {
        // For network errors, return structured response instead of throwing error
        console.error('Error sending webhook:', error);
        return {
            success: false,
            error: error.message,
            status: 0
        };
    }
} 

/**
 * Background Service Worker for Request Sender
 * 
 * This script runs in the background and manages the lifecycle of the extension.
 * It can also handle events like installation, updates, and messages from other parts of the extension.
 */

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Request Sender installed.');

        // Initialize storage with an empty requests array and default language
        chrome.storage.local.set({
            requests: [],
            logs: [],
            // Use browser UI language or default to 'en'
            language: chrome.i18n.getUILanguage() || 'en'
        }, () => {
            console.log('Storage initialized successfully.');
        });

        // Create context menu
        createContextMenus();
    } else if (details.reason === 'update') {
        console.log(`Request Sender updated from ${details.previousVersion} to ${chrome.runtime.getManifest().version}.`);
        
        // Ensure we have a logs array for older versions
        chrome.storage.local.get(['logs'], (result) => {
            if (!result.logs) {
                chrome.storage.local.set({ logs: [] }, () => {
                    console.log('Logs storage initialized for update.');
                });
            }
        });

        // Recreate context menu after update
        createContextMenus();
    }
});

// Extract dynamic fields from a request
function extractDynamicFields(request) {
    const fields = [];
    const regex = /{{([^{}]+)}}/g;
    let match;
    
    // Check URL
    if (request.url) {
        while ((match = regex.exec(request.url)) !== null) {
            fields.push(match[1].trim());
        }
    }
    
    // Check headers
    if (request.headers) {
        const headersStr = typeof request.headers === 'string' 
            ? request.headers 
            : JSON.stringify(request.headers);
        
        regex.lastIndex = 0; // Reset regex
        while ((match = regex.exec(headersStr)) !== null) {
            fields.push(match[1].trim());
        }
    }
    
    // Check body
    if (request.body) {
        const bodyStr = typeof request.body === 'string' 
            ? request.body 
            : JSON.stringify(request.body);
        
        regex.lastIndex = 0; // Reset regex
        while ((match = regex.exec(bodyStr)) !== null) {
            fields.push(match[1].trim());
        }
    }
    
    // Remove duplicates and return
    return [...new Set(fields)];
}

// Create context menus for all requests
async function createContextMenus() {
    // Remove existing menu items to avoid duplicates
    await chrome.contextMenus.removeAll();

    // Create parent menu item
    chrome.contextMenus.create({
        id: 'request-sender',
        title: chrome.i18n.getMessage('contextMenuTitle'),
        contexts: ['selection']
    });

    // Get all requests and create menu items
    chrome.storage.local.get(['requests'], (result) => {
        const requests = result.requests || [];
        requests.forEach(request => {
            const dynamicFields = extractDynamicFields(request);
            
            if (dynamicFields.length > 0) {
                // Create submenu for request with dynamic fields
                chrome.contextMenus.create({
                    id: `request-${request.id}`,
                    parentId: 'request-sender',
                    title: request.name,
                    contexts: ['selection']
                });

                // Create dynamic field options
                dynamicFields.forEach(field => {
                    chrome.contextMenus.create({
                        id: `request-${request.id}-${field}`,
                        parentId: `request-${request.id}`,
                        title: field,
                        contexts: ['selection']
                    });
                });
            } else {
                // Create direct menu item for request without dynamic fields
                chrome.contextMenus.create({
                    id: `request-${request.id}-direct`,
                    parentId: 'request-sender',
                    title: request.name,
                    contexts: ['selection']
                });
            }
        });
    });
}

// Listen for storage changes to update context menu
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.requests) {
        createContextMenus();
    }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    const menuId = info.menuItemId;
    if (menuId.startsWith('request-') && info.selectionText) {
        // Extract request ID and field name
        const parts = menuId.split('-');
        const requestId = parts[1];
        const isDirect = parts[2] === 'direct';
        const fieldName = !isDirect ? parts[2] : null;
        
        // Get request configuration and send
        chrome.storage.local.get(['requests'], (result) => {
            const requests = result.requests || [];
            const request = requests.find(r => r.id === requestId);
            
            if (request) {
                if (isDirect) {
                    // Send directly without dynamic fields
                    sendRequestWithText(request, info.selectionText);
                } else {
                    // Open popup for dynamic field input
                    chrome.windows.create({
                        url: `popup.html?request=${requestId}&field=${fieldName}&text=${encodeURIComponent(info.selectionText)}&method=${request.method}&url=${encodeURIComponent(request.url)}&headers=${encodeURIComponent(JSON.stringify(request.headers))}&body=${encodeURIComponent(JSON.stringify(request.body))}&name=${encodeURIComponent(request.name)}&contentType=${encodeURIComponent(request.contentType || 'application/json')}`,
                        type: 'popup',
                        width: 420,
                        height: 600
                    });
                }
            }
        });
    }
});

// Send request with selected text
async function sendRequestWithText(request, selectedText, fieldName = null) {
    let requestBody = null;
    try {
        const timestamp = new Date().toISOString();
        
        // Replace dynamic field in URL, headers, and body
        let url = request.url;
        let headers = request.headers;
        let body = request.body;
        
        // Function to replace dynamic field in string
        const replaceDynamicField = (str, field, value) => {
            if (!str) return str;
            const pattern = new RegExp(`{{${field}}}`, 'g');
            return str.replace(pattern, value);
        };
        
        // If fieldName is provided, replace that specific field
        if (fieldName) {
            // Replace in URL
            url = replaceDynamicField(url, fieldName, selectedText);
            
            // Replace in headers
            if (headers) {
                if (typeof headers === 'string') {
                    headers = replaceDynamicField(headers, fieldName, selectedText);
                } else {
                    // Headers as object
                    for (const key in headers) {
                        headers[key] = replaceDynamicField(headers[key], fieldName, selectedText);
                    }
                }
            }
            
            // Replace in body
            if (body) {
                if (typeof body === 'string') {
                    body = replaceDynamicField(body, fieldName, selectedText);
                } else {
                    // Body as object - convert to string, replace, then parse back
                    const bodyStr = JSON.stringify(body);
                    const updatedBodyStr = replaceDynamicField(bodyStr, fieldName, selectedText);
                    try {
                        body = JSON.parse(updatedBodyStr);
                    } catch (e) {
                        console.error('Error parsing body after replacement:', e);
                        body = updatedBodyStr;
                    }
                }
            }
        }
        
        // Add selected text to body
        if (request.contentType === 'application/json') {
            try {
                // 确保 body 不为空，避免 JSON 解析错误
                let jsonBody = {};
                
                if (body) {
                    // 只有当 body 不为空时才尝试解析
                    jsonBody = typeof body === 'string' ? JSON.parse(body) : body;
                }

                requestBody = jsonBody;
            } catch (error) {
                console.error('Error parsing request body:', error);
                requestBody = fieldName ? body : { selectedText };
            }
        } else if (!fieldName) {
            // For non-JSON content types, only set body to selectedText if no fieldName was specified
            requestBody = selectedText;
        } else {
            // For non-JSON with fieldName, use the modified body
            requestBody = body;
        }

        const method = request.method || 'POST';
        const isGetOrHead = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD';
        
        // 我们不需要添加查询参数，因为动态字段已经在 URL 中替换
        // 只有在没有指定 fieldName 且是 GET/HEAD 请求时才需要处理
        if (isGetOrHead && selectedText && !fieldName) {
            // 这种情况下，我们不添加任何参数，因为没有指定动态字段
            // 用户需要在 request 配置中明确指定动态字段
            console.log('GET/HEAD request without dynamic field specified');
        }

        let responseData;
        try {
            // Create request options based on HTTP method
            const requestOptions = {
                method: method,
                headers: headers ? 
                    (typeof headers === 'string' ? JSON.parse(headers) : headers) : 
                    (isGetOrHead ? { 'Content-Type': 'text/plain' } : 
                        (request.contentType ? { 'Content-Type': request.contentType } : {}))
            };

            // Only add body for non-GET/HEAD requests
            if (!isGetOrHead && requestBody) {
                requestOptions.body = typeof requestBody === 'string' ? 
                    requestBody : JSON.stringify(requestBody);
            }

            // Send request
            const response = await fetch(url, requestOptions);

            // Get response text
            let responseText;
            try {
                responseText = await response.text();
            } catch (error) {
                console.error('Error reading response:', error);
                responseText = 'Error reading response';
            }

            // Get response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            
            console.log('Response headers:', responseHeaders);

            responseData = {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                response: responseText,
                responseHeaders: responseHeaders
            };
        } catch (error) {
            console.error('Network error:', error);
            responseData = {
                success: false,
                status: 0,
                statusText: 'Network Error',
                response: error.message,
                error: error.message
            };
        }

        // Create log entry
        const logEntry = {
            id: generateUUID(),
            timestamp,
            request: request.name,
            url: url,
            method: method,
            headers: request.headers ? 
                (typeof request.headers === 'string' ? JSON.parse(request.headers) : request.headers) : 
                (request.contentType ? { 'Content-Type': request.contentType } : {}),
            body: isGetOrHead ? null : requestBody,
            status: responseData.status,
            success: responseData.success,
            response: responseData.response,
            responseHeaders: responseData.responseHeaders
        };

        // Save log
        chrome.storage.local.get(['logs'], (result) => {
            const logs = result.logs || [];
            logs.unshift(logEntry);
            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.length = 100;
            }
            chrome.storage.local.set({ logs });
        });

        // Show notification
        const notificationId = generateUUID();
        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: chrome.i18n.getMessage(responseData.success ? 'requestSentSuccess' : 'requestSentFailed'),
            message: `${request.name}: ${responseData.status} ${responseData.statusText}`,
            priority: 2,
            requireInteraction: false
        });

        // Auto close notification after 3 seconds
        setTimeout(() => {
            chrome.notifications.clear(notificationId);
        }, 3000);

        return { success: responseData.success, status: responseData.status, response: responseData.response };
    } catch (error) {
        console.error('Error sending request:', error);
        
        // Create error log entry
        const logEntry = {
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            request: request.name || 'Unknown',
            url: request.url,
            method: request.method || 'POST',
            headers: request.headers,
            body: requestBody || { selectedText: selectedText },
            status: 0,
            success: false,
            error: error.message
        };

        // Save log
        chrome.storage.local.get(['logs'], (result) => {
            const logs = result.logs || [];
            logs.unshift(logEntry);
            if (logs.length > 100) {
                logs.length = 100;
            }
            chrome.storage.local.set({ logs });
        });

        // Show error notification
        const notificationId = generateUUID();
        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: chrome.i18n.getMessage('requestSentError'),
            message: error.message,
            priority: 2,
            requireInteraction: true
        });

        return { success: false, error: error.message };
    }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'send_request') {
        const requestConfig = request.request;
        console.log('Sending request:', requestConfig);
        
        // Extract selectedText from the body if it exists
        let selectedText = '';
        if (requestConfig.body && typeof requestConfig.body === 'object' && requestConfig.body.selectedText) {
            selectedText = requestConfig.body.selectedText;
        } else if (requestConfig.body && typeof requestConfig.body === 'string') {
            try {
                const bodyObj = JSON.parse(requestConfig.body);
                selectedText = bodyObj.selectedText || '';
            } catch (e) {
                selectedText = requestConfig.body;
            }
        }
        
        sendRequestWithText(requestConfig, selectedText)
            .then(response => {
                console.log('Request send response:', response);
                sendResponse(response);
            })
            .catch(error => {
                console.error('Error sending request:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Will respond asynchronously
    } else if (request.action === 'reload_extension') {
        console.log('Attempting to reload extension...');
        try {
            chrome.runtime.reload();
            sendResponse({ success: true });
        } catch (error) {
            console.error('Failed to reload extension:', error);
            sendResponse({ 
                success: false, 
                error: error.message || 'Failed to reload extension' 
            });
        }
        return true;
    } else if (request.action === 'get_version') {
        // Get version from manifest
        sendResponse({ 
            version: chrome.runtime.getManifest().version,
            success: true
        });
        return true;
    }
});

// Generate UUID for logs
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Send a request
 * @param {Object} request - The request configuration
 * @returns {Promise<Object>} - Promise resolving to the request response
 */
async function sendRequest(request) {
    // Input validation
    if (!request || !request.url) {
        throw new Error('Invalid request configuration: URL is required');
    }
    
    if (!request.method) {
        console.warn('Request method not specified, defaulting to GET');
        request.method = 'GET';
    }

    // Construct the fetch options
    const options = {
        method: request.method,
        headers: request.headers || {}
    };

    // Add content type header if specified
    if (request.contentType) {
        options.headers['Content-Type'] = request.contentType;
    }

    // Add request body (except for GET and HEAD requests)
    if (!['GET', 'HEAD'].includes(request.method) && request.body) {
        if (request.contentType === 'application/json') {
            try {
                options.body = typeof request.body === 'string'
                    ? request.body
                    : JSON.stringify(request.body);
            } catch (error) {
                throw new Error(`Error stringifying JSON body: ${error.message}`);
            }
        } else {
            options.body = request.body;
        }
    } else if (['GET', 'HEAD'].includes(request.method) && request.body) {
        // For GET/HEAD requests, append parameters to URL
        try {
            let params = '';
            if (typeof request.body === 'string') {
                // Try to parse as JSON first
                try {
                    const bodyObj = JSON.parse(request.body);
                    params = new URLSearchParams(
                        Object.entries(bodyObj).map(([key, value]) => 
                            [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]
                        )
                    ).toString();
                } catch (e) {
                    // If not JSON, assume it's a string parameter
                    params = `text=${encodeURIComponent(request.body)}`;
                }
            } else if (typeof request.body === 'object') {
                params = new URLSearchParams(
                    Object.entries(request.body).map(([key, value]) => 
                        [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]
                    )
                ).toString();
            }
            
            if (params) {
                request.url += (request.url.includes('?') ? '&' : '?') + params;
            }
        } catch (error) {
            console.error('Error converting body to URL parameters:', error);
        }
    }

    try {
        console.log(`Sending ${request.method} request to ${request.url}`);
        
        // Send the request
        const response = await fetch(request.url, options);

        // Get response headers
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });
        
        // Get response body
        let responseBody = null;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            try {
                responseBody = await response.json();
            } catch (e) {
                // If JSON parsing fails, get text
                responseBody = await response.text();
            }
        } else {
            responseBody = await response.text();
        }
        
        // Prepare result
        const result = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            response: responseBody
        };
        
        // Add error info if request failed
        if (!response.ok) {
            result.error = `${response.status} ${response.statusText}`;
            console.warn(`Request failed: ${result.error}`);
        } else {
            console.log(`Request successful: ${response.status}`);
        }

        return result;
    } catch (error) {
        // For network errors or other exceptions
        console.error('Error sending request:', error);
        
        return {
            success: false,
            status: 0,
            statusText: 'Network Error',
            error: error.message,
            response: null
        };
    }
}

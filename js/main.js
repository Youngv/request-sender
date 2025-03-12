/**
 * Main Application Entry Point
 * Initializes all modules and sets up the application
 */

// 全局语言切换函数
window.switchLanguage = function(lang) {
    console.log(`Switching language to ${lang}`);
    localStorage.setItem('currentLanguage', lang);
    location.reload();
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Application initializing...');
    
    try {
        // Get extension version
        chrome.runtime.sendMessage({ action: 'get_version' }, (response) => {
            if (response && response.success) {
                console.log(`Request Sender v${response.version}`);
            }
        });
        
        // Initialize I18n system first
        await I18nManager.init();
        console.log('I18n system initialized');
        
        // Initialize each module in the correct order
        UI.init();
        console.log('UI module initialized');
        
        RequestForm.init();
        console.log('RequestForm module initialized');
        
        Request.init();
        console.log('Request module initialized');
        
        LogsManager.init();
        console.log('LogsManager module initialized');

        // Check if opened from context menu
        const urlParams = new URLSearchParams(window.location.search);
        const requestId = urlParams.get('request');
        const selectedFieldName = urlParams.get('field');
        const selectedText = urlParams.get('text');
        const method = urlParams.get('method');
        const url = urlParams.get('url');
        const headers = urlParams.get('headers') ? JSON.parse(decodeURIComponent(urlParams.get('headers'))) : null;
        const body = urlParams.get('body') ? JSON.parse(decodeURIComponent(urlParams.get('body'))) : null;

        if (requestId && selectedFieldName && selectedText) {
            // Hide main UI
            document.querySelector('.container').style.display = 'none';

            // Extract all dynamic fields
            const dynamicFields = new Set();
            const pattern = /{{([^}]+)}}/g;
            let match;

            // Check URL
            while ((match = pattern.exec(url)) !== null) {
                dynamicFields.add(match[1]);
            }

            // Check headers
            if (headers) {
                const headersStr = JSON.stringify(headers);
                while ((match = pattern.exec(headersStr)) !== null) {
                    dynamicFields.add(match[1]);
                }
            }

            // Check body
            if (body) {
                const bodyStr = JSON.stringify(body);
                while ((match = pattern.exec(bodyStr)) !== null) {
                    dynamicFields.add(match[1]);
                }
            }

            // Create dynamic fields input UI
            const dynamicFieldUI = document.createElement('div');
            dynamicFieldUI.className = 'dynamic-field-container';
            
            let html = `<h2>${chrome.i18n.getMessage('fillParameters')}</h2>`;
            
            // Add all dynamic fields
            Array.from(dynamicFields).forEach(field => {
                const isSelectedField = field === selectedFieldName;
                html += `
                    <div class="form-group ${isSelectedField ? 'selected-field' : ''}">
                        <label for="field-${field}">${field}</label>
                        <input type="text" 
                               id="field-${field}" 
                               class="dynamic-field-input"
                               value="${isSelectedField ? selectedText : ''}" 
                               required>
                    </div>
                `;
            });

            html += `
                <div class="form-actions">
                    <button type="button" class="btn primary" id="send-dynamic">${chrome.i18n.getMessage('send')}</button>
                    <button type="button" class="btn" id="cancel-dynamic">${chrome.i18n.getMessage('cancel')}</button>
                </div>
            `;

            dynamicFieldUI.innerHTML = html;
            document.body.appendChild(dynamicFieldUI);

            // Add styles for dynamic field container
            const style = document.createElement('style');
            style.textContent = `
                .dynamic-field-container {
                    padding: 20px;
                    min-width: 300px;
                    max-width: 400px;
                }
                .dynamic-field-container h2 {
                    margin-bottom: 16px;
                    color: var(--primary-color);
                }
                .selected-field {
                    background: var(--background-secondary);
                    padding: 12px;
                    border-radius: var(--radius);
                    margin: 8px 0;
                }
                .selected-text-preview {
                    margin: 20px 0;
                    padding: 10px;
                    background: var(--background-secondary);
                    border-radius: var(--radius);
                }
                .selected-text-preview label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: var(--secondary-color);
                }
                .selected-text-preview .text-content {
                    word-break: break-word;
                    white-space: pre-wrap;
                    font-size: 14px;
                    line-height: 1.4;
                    max-height: 100px;
                    overflow-y: auto;
                }
            `;
            document.head.appendChild(style);

            // Handle send button click
            document.getElementById('send-dynamic').addEventListener('click', () => {
                // Get all field values
                const fieldValues = {};
                Array.from(dynamicFields).forEach(field => {
                    fieldValues[field] = document.getElementById(`field-${field}`).value;
                });

                // Replace all dynamic fields in request data
                let requestData = {
                    id: requestId,
                    method: method,
                    url: url,
                    headers: headers,
                    body: body
                };

                // Replace in URL
                Object.entries(fieldValues).forEach(([field, value]) => {
                    const placeholder = `{{${field}}}`;
                    requestData.url = requestData.url.replace(placeholder, value);
                });

                // Replace in headers
                if (requestData.headers) {
                    let headersStr = JSON.stringify(requestData.headers);
                    Object.entries(fieldValues).forEach(([field, value]) => {
                        const placeholder = `{{${field}}}`;
                        headersStr = headersStr.replace(placeholder, value);
                    });
                    requestData.headers = JSON.parse(headersStr);
                }

                // Replace in body
                if (requestData.body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
                    let bodyStr = JSON.stringify(requestData.body);
                    Object.entries(fieldValues).forEach(([field, value]) => {
                        const placeholder = `{{${field}}}`;
                        bodyStr = bodyStr.replace(placeholder, value);
                    });
                    
                    try {
                        requestData.body = JSON.parse(bodyStr);
                    } catch (error) {
                        console.error('Error parsing request body:', error);
                        requestData.body = null;
                    }
                } else {
                    requestData.body = null;
                }

                // Send request
                chrome.runtime.sendMessage({
                    action: 'send_request',
                    request: {
                        id: requestId,
                        name: decodeURIComponent(urlParams.get('name') || ''),
                        method: method,
                        url: requestData.url,
                        headers: requestData.headers,
                        body: requestData.body,
                        contentType: urlParams.get('contentType') || ''
                    }
                }, (response) => {
                    if (response && response.success) {
                        window.close();
                    } else {
                        // Show error in UI
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'error-message';
                        errorDiv.textContent = response?.error || chrome.i18n.getMessage('requestSentError');
                        document.querySelector('.dynamic-field-container').appendChild(errorDiv);
                    }
                });
            });

            // Handle cancel button click
            document.getElementById('cancel-dynamic').addEventListener('click', () => {
                window.close();
            });
        } else {
            // Switch to default tab if no context menu parameters
            UI.tabs.switchTo('requests');
        }
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        
        // Display error to user
        const errorElement = document.createElement('div');
        errorElement.className = 'app-error';
        errorElement.innerHTML = `
            <h2>Initialization Error</h2>
            <p>The application encountered an error during startup:</p>
            <pre>${error.message}</pre>
            <button id="reload-app">Reload Application</button>
        `;
        
        document.body.innerHTML = '';
        document.body.appendChild(errorElement);
        
        // Add reload handler
        document.getElementById('reload-app').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'reload_extension' });
        });
    }
});

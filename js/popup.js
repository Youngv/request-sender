// DOM Elements
const webhooksTab = document.getElementById('webhooks-tab');
const createTab = document.getElementById('create-tab');
const logsTab = document.getElementById('logs-tab');
const webhooksContent = document.getElementById('webhooks-content');
const createContent = document.getElementById('create-content');
const logsContent = document.getElementById('logs-content');
const webhookList = document.getElementById('webhook-list');
const logsList = document.getElementById('logs-list');
const emptyWebhooks = document.getElementById('empty-webhooks');
const emptyLogs = document.getElementById('empty-logs');
const clearLogsBtn = document.getElementById('clear-logs');
const refreshLogsBtn = document.getElementById('refresh-logs');
const webhookForm = document.getElementById('webhook-form');
const testWebhookBtn = document.getElementById('test-webhook');
const sendModal = document.getElementById('send-modal');
const closeModalBtn = document.getElementById('close-modal');
const dynamicForm = document.getElementById('dynamic-form');
const sendWithValuesBtn = document.getElementById('send-with-values');
const cancelSendBtn = document.getElementById('cancel-send');
const sendWithParamsBtn = document.getElementById('send-with-params');
const deleteModal = document.getElementById('delete-modal');
const closeDeleteModalBtn = document.getElementById('close-delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const clearLogsModal = document.getElementById('clear-logs-modal');
const closeClearLogsModalBtn = document.getElementById('close-clear-logs-modal');
const cancelClearLogsBtn = document.getElementById('cancel-clear-logs-btn');
const confirmClearLogsBtn = document.getElementById('confirm-clear-logs-btn');
const methodSelect = document.getElementById('webhook-method');
const bodyFormGroup = document.getElementById('webhook-body').parentNode;

// Current webhook ID being edited (if any)
let currentEditId = null;
// Current webhook object being sent
let currentSendingWebhook = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialization operations
    console.log('DOM fully loaded');

    // First ensure correct language is loaded
    chrome.storage.local.get('language', (result) => {
        const userLanguage = result.language;
        if (userLanguage) {
            console.log('Using saved user language preference:', userLanguage);
        }
    });

    // Listen for language change events
    document.addEventListener('languageChanged', (event) => {
        console.log('Language changed event received:', event.detail);

        // 延迟执行以确保DOM已更新
        setTimeout(() => {
            // 重新应用UI状态
            if (typeof toggleBodyVisibility === 'function') {
                console.log('从languageChanged事件中调用toggleBodyVisibility');
                toggleBodyVisibility();
            }
        }, 300);
    });

    // Ensure all necessary DOM elements are loaded
    if (!methodSelect || !bodyFormGroup) {
        console.error('Method select or body form group not found during DOM load');

        // Try to retrieve elements again
        const methodSelectRetry = document.getElementById('webhook-method');
        const bodyFormGroupRetry = document.getElementById('webhook-body')?.parentNode;

        if (methodSelectRetry && bodyFormGroupRetry) {
            console.log('Elements found on retry');
            // Rebind variables
            window.methodSelect = methodSelectRetry;
            window.bodyFormGroup = bodyFormGroupRetry;
        } else {
            console.error('Critical elements still not found after retry');
        }
    }

    // Load saved webhooks
    loadWebhooks();

    // Load saved logs
    loadLogs();

    // Tab switching
    webhooksTab.addEventListener('click', () => switchTab('webhooks'));
    createTab.addEventListener('click', () => switchTab('create', false));
    logsTab.addEventListener('click', () => switchTab('logs'));

    // Clear logs
    clearLogsBtn.addEventListener('click', clearLogs);

    // Refresh logs
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', loadLogs);
    }

    // Form submission
    webhookForm.addEventListener('submit', saveWebhook);

    // Test webhook
    testWebhookBtn.addEventListener('click', testWebhook);

    // Close modal
    closeModalBtn.addEventListener('click', closeModal);
    cancelSendBtn.addEventListener('click', closeModal);
    closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    closeClearLogsModalBtn.addEventListener('click', closeClearLogsModal);
    cancelClearLogsBtn.addEventListener('click', closeClearLogsModal);

    // Send webhook with dynamic values
    sendWithValuesBtn.addEventListener('click', sendWithDynamicValues);

    // Listen for HTTP method change, some methods don't need request body
    methodSelect.addEventListener('change', () => {
        console.log('Method changed');
        toggleBodyVisibility();
    });

    // Initial check on page load
    console.log('About to call toggleBodyVisibility on page load');
    setTimeout(() => {
        // Ensure DOM is fully rendered before executing
        toggleBodyVisibility();
        console.log('Called toggleBodyVisibility after timeout');
    }, 100);

    // Directly add method change listener in DOM event listeners
    document.getElementById('webhook-method').addEventListener('change', function () {
        console.log('Method changed (direct listener)');
        toggleBodyVisibility();
    });
});

/**
 * Switch tab pages
 * @param {string} tabName - Tab page name
 * @param {boolean} skipReset - Whether to skip form reset (for edit mode)
 */
function switchTab(tabName, skipReset) {
    // Reset form, but skip in edit mode
    if (tabName === 'create' && !skipReset) {
        resetForm();
    }

    // If switching to logs tab, ensure to load latest logs
    if (tabName === 'logs') {
        loadLogs();
    }

    // Update tab button status
    webhooksTab.classList.toggle('active', tabName === 'webhooks');
    createTab.classList.toggle('active', tabName === 'create');
    logsTab.classList.toggle('active', tabName === 'logs');

    // Update tab content display
    webhooksContent.classList.toggle('active', tabName === 'webhooks');
    createContent.classList.toggle('active', tabName === 'create');
    logsContent.classList.toggle('active', tabName === 'logs');

    // If switching to create tab, ensure request body is displayed/hidden correctly based on method
    if (tabName === 'create') {
        setTimeout(() => {
            toggleBodyVisibility();
            console.log('toggleBodyVisibility called after tab switch');
        }, 0);
    }
}

/**
 * Load saved webhooks
 */
function loadWebhooks() {
    chrome.storage.local.get(['webhooks'], (result) => {
        const webhooks = result.webhooks || [];

        // Update empty status display
        emptyWebhooks.style.display = webhooks.length === 0 ? 'block' : 'none';

        // Clear list
        const webhookItems = document.querySelectorAll('.webhook-item');
        webhookItems.forEach(item => item.remove());

        // Add webhooks to list
        webhooks.forEach(webhook => {
            const webhookElement = createWebhookElement(webhook);
            webhookList.appendChild(webhookElement);
        });

        // Update all internationalized elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const messageId = el.getAttribute('data-i18n');
            if (messageId) {
                el.textContent = i18n.getMessage(messageId);
            }
        });
    });
}

/**
 * Create webhook element
 * @param {Object} webhook - webhook object
 */
function createWebhookElement(webhook) {
    const webhookItem = document.createElement('div');
    webhookItem.className = 'webhook-item';
    webhookItem.dataset.id = webhook.id;

    // First row: Name
    const nameElement = document.createElement('h3');
    nameElement.className = 'webhook-item-name';
    nameElement.textContent = webhook.name;
    webhookItem.appendChild(nameElement);

    // Second row: Method + URL
    const methodUrlRow = document.createElement('div');
    methodUrlRow.className = 'webhook-item-method-url';

    // Display HTTP method
    const methodElement = document.createElement('span');
    methodElement.className = `webhook-item-method method-${webhook.method.toLowerCase()}`;
    methodElement.textContent = webhook.method;

    // URL
    const urlElement = document.createElement('span');
    urlElement.className = 'webhook-item-url';
    urlElement.textContent = webhook.url;

    methodUrlRow.appendChild(methodElement);
    methodUrlRow.appendChild(urlElement);
    webhookItem.appendChild(methodUrlRow);

    // Third row: Actions buttons
    const actionsElement = document.createElement('div');
    actionsElement.className = 'webhook-item-actions';

    // Edit button
    const editButton = document.createElement('button');
    editButton.className = 'action-btn';
    editButton.setAttribute('data-i18n', 'edit');
    editButton.textContent = i18n.getMessage('edit');
    editButton.addEventListener('click', () => editWebhook(webhook));

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'action-btn';
    deleteButton.setAttribute('data-i18n', 'delete');
    deleteButton.textContent = i18n.getMessage('delete');
    deleteButton.addEventListener('click', () => {
        deleteWebhook(webhook.id);
    });

    // Send button
    const sendButton = document.createElement('button');
    sendButton.className = 'action-btn';
    sendButton.setAttribute('data-i18n', 'send');
    sendButton.textContent = i18n.getMessage('send');
    sendButton.addEventListener('click', () => sendWebhook(webhook));

    actionsElement.appendChild(editButton);
    actionsElement.appendChild(deleteButton);
    actionsElement.appendChild(sendButton);

    webhookItem.appendChild(actionsElement);

    return webhookItem;
}

/**
 * Validate JSON format
 * @param {string} jsonText - JSON text
 * @param {string} fieldType - Field type (headers or body)
 */
function validateJSON(jsonText, fieldType) {
    if (!jsonText.trim()) {
        return '';
    }

    try {
        const parsedJSON = JSON.parse(jsonText);
        return parsedJSON;
    } catch (e) {
        const errorMessage = fieldType === 'headers' ?
            i18n.getMessage('jsonError') + ': ' + i18n.getMessage('headers') :
            i18n.getMessage('jsonError') + ': ' + i18n.getMessage('body');

        showNotification(errorMessage, 'error');
        throw new Error(i18n.getMessage('jsonError'));
    }
}

/**
 * Save webhook
 * @param {Event} e - Form submission event
 */
function saveWebhook(e) {
    e.preventDefault();

    // Get form data
    const name = document.getElementById('webhook-name').value.trim();
    const url = document.getElementById('webhook-url').value.trim();
    const method = document.getElementById('webhook-method').value;
    const contentType = document.getElementById('webhook-content-type').value;

    // Validate form
    if (!name || !url) {
        return;
    }

    // Parse Headers and Body (if any)
    const headersText = document.getElementById('webhook-headers').value.trim();
    const bodyText = document.getElementById('webhook-body').value.trim();

    let headers = '';
    let body = '';

    try {
        if (headersText) {
            headers = validateJSON(headersText, 'headers');
        }

        if (bodyText) {
            // Only validate JSON format when content type is JSON
            if (contentType === 'application/json') {
                body = validateJSON(bodyText, 'body');
            } else {
                body = bodyText;
            }
        }
    } catch (e) {
        return; // Validation failed, abort save
    }

    // Webhook object to save
    const webhook = {
        name,
        url,
        method,
        contentType,
        headers,
        body
    };

    // If editing existing webhook
    if (currentEditId) {
        webhook.id = currentEditId;
    } else {
        // Generate new ID
        webhook.id = Date.now().toString();
    }

    // Save to storage
    chrome.storage.local.get('webhooks', (result) => {
        const webhooks = result.webhooks || [];

        // If editing, replace existing webhook
        const existingIndex = webhooks.findIndex(w => w.id === webhook.id);

        if (existingIndex !== -1) {
            webhooks[existingIndex] = webhook;
        } else {
            // Otherwise add new webhook
            webhooks.push(webhook);
        }

        // Save updated list
        chrome.storage.local.set({ webhooks }, () => {
            // Reset form
            resetForm();

            // Switch to webhooks list
            switchTab('webhooks');

            // Reload webhooks
            loadWebhooks();

            // Show success message
            showNotification(i18n.getMessage('savedSuccess'), 'success');
        });
    });
}

/**
 * Edit webhook
 * @param {Object} webhook - Webhook object to edit
 */
function editWebhook(webhook) {
    // Switch to create tab
    switchTab('create', true);

    // Set form title
    document.getElementById('form-title').textContent = i18n.getMessage('createWebhook');

    // Fill form data
    document.getElementById('webhook-name').value = webhook.name;
    document.getElementById('webhook-url').value = webhook.url;
    document.getElementById('webhook-method').value = webhook.method;
    document.getElementById('webhook-content-type').value = webhook.contentType;

    // Fill JSON fields
    if (webhook.headers) {
        document.getElementById('webhook-headers').value = typeof webhook.headers === 'string' ?
            webhook.headers : JSON.stringify(webhook.headers, null, 2);
    }

    if (webhook.body) {
        document.getElementById('webhook-body').value = typeof webhook.body === 'string' ?
            webhook.body : JSON.stringify(webhook.body, null, 2);
    }

    // Save current edit ID
    currentEditId = webhook.id;

    // Toggle request body visibility based on HTTP method
    toggleBodyVisibility();
}

/**
 * Delete webhook
 * @param {string} id - Webhook ID
 */
function deleteWebhook(id) {
    // Show delete confirmation modal window
    deleteModal.style.display = 'block';

    // Set confirm button click event
    confirmDeleteBtn.onclick = function () {
        chrome.storage.local.get(['webhooks'], (result) => {
            const webhooks = result.webhooks || [];
            const updatedWebhooks = webhooks.filter(webhook => webhook.id !== id);

            chrome.storage.local.set({ webhooks: updatedWebhooks }, () => {
                showNotification(i18n.getMessage('webhookDeleted'), 'success');
                loadWebhooks();
                closeDeleteModal();
            });
        });
    };
}

/**
 * Close delete confirmation modal window
 */
function closeDeleteModal() {
    deleteModal.style.display = 'none';
    // Remove event to prevent memory leak
    confirmDeleteBtn.onclick = null;
}

/**
 * Send webhook
 * @param {Object} webhook - Webhook data
 */
function sendWebhook(webhook) {
    // First check if there are dynamic parameters to fill
    const hasParameters = checkForParameters(webhook);

    if (hasParameters) {
        // If there are parameters to fill, open parameter input window
        openSendModal(webhook);
        return;
    }

    // No parameters to fill, send directly
    executeSendWebhook(webhook);
}

/**
 * Check if webhook contains parameters to fill
 * @param {Object} webhook - Webhook data
 * @returns {boolean} - Whether contains parameters
 */
function checkForParameters(webhook) {
    // Check for placeholders in URL
    if (webhook.url && webhook.url.includes('{{')) {
        return true;
    }

    // Check for placeholders in request body
    if (webhook.body) {
        const body = typeof webhook.body === 'string' ? webhook.body : JSON.stringify(webhook.body);
        if (body.includes('{{')) {
            return true;
        }
    }

    // Check for placeholders in request headers
    if (webhook.headers) {
        const headers = typeof webhook.headers === 'string' ? webhook.headers : JSON.stringify(webhook.headers);
        if (headers.includes('{{')) {
            return true;
        }
    }

    return false;
}

/**
 * Execute sending webhook
 * @param {Object} webhook - Webhook object
 */
function executeSendWebhook(webhook) {
    // Create new log entry
    const logEntry = {
        id: Date.now().toString(),
        time: Date.now(),
        // Add top-level property, consistent with background.js format
        url: webhook.url,
        method: webhook.method,
        requestHeaders: webhook.headers,
        requestBody: webhook.body,
        // Keep webhook object for later use
        webhook: {
            name: webhook.name,
            url: webhook.url,
            method: webhook.method,
            contentType: webhook.contentType,
            headers: webhook.headers,
            body: webhook.body
        },
        expanded: false
    };

    // Send message to background script
    chrome.runtime.sendMessage(
        { action: 'send_webhook', webhook },
        (response) => {
            // Ensure response object exists
            if (!response) {
                logEntry.success = false;
                logEntry.error = i18n.getMessage('noResponse');
                showNotification(i18n.getMessage('sendFailed') + ': ' + i18n.getMessage('noResponse'), 'error');
                addLog(logEntry);
                return;
            }

            // Update log entry
            logEntry.success = response.success === true; // Ensure boolean true
            logEntry.status = response.status;
            logEntry.responseHeaders = response.responseHeaders;
            logEntry.response = response.response;

            if (logEntry.success) {
                showNotification(i18n.getMessage('sendSuccess'), 'success');
            } else {
                // For HTTP errors, use status code and status text
                if (response.status && response.status !== 0) {
                    if (!logEntry.error) {
                        logEntry.error = `${response.status} ${getStatusText(response.status)}`;
                    }
                    showNotification(i18n.getMessage('sendFailed') + ': ' + logEntry.error, 'error');
                } else if (response.error) {
                    // For network errors or other errors, use error message
                    logEntry.error = response.error;
                    showNotification(i18n.getMessage('sendFailed') + ': ' + response.error, 'error');
                } else {
                    // Unknown error
                    logEntry.error = i18n.getMessage('unknownError');
                    showNotification(i18n.getMessage('sendFailed') + ': ' + i18n.getMessage('unknownError'), 'error');
                }
            }

            // Add log
            addLog(logEntry);
        }
    );
}

/**
 * Test webhook
 */
function testWebhook() {
    // Get form data
    const name = document.getElementById('webhook-name').value.trim() || i18n.getMessage('test');
    const url = document.getElementById('webhook-url').value.trim();
    const method = document.getElementById('webhook-method').value;
    const contentType = document.getElementById('webhook-content-type').value;

    // Validate URL
    if (!url) {
        showNotification(i18n.getMessage('url') + ' ' + i18n.getMessage('required'), 'error');
        return;
    }

    // Parse Headers and Body (if any)
    const headersText = document.getElementById('webhook-headers').value.trim();
    const bodyText = document.getElementById('webhook-body').value.trim();

    let headers = '';
    let body = '';

    try {
        if (headersText) {
            headers = validateJSON(headersText, 'headers');
        }

        if (bodyText) {
            // Only validate JSON format when content type is JSON
            if (contentType === 'application/json') {
                body = validateJSON(bodyText, 'body');
            } else {
                body = bodyText;
            }
        }
    } catch (e) {
        return; // Validation failed, abort test
    }

    // Create temporary webhook object
    const webhook = {
        id: 'test',
        name,
        url,
        method,
        contentType,
        headers,
        body
    };

    // Send webhook
    sendWebhook(webhook);
}

/**
 * Reset form
 */
function resetForm() {
    webhookForm.reset();
    currentEditId = null;

    // Update form title to create mode
    document.getElementById('form-title').textContent = i18n.getMessage('createWebhook');
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success or error)
 */
function showNotification(message, type) {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // If it's an error message, add more detailed hint
    if (type === 'error' && message.includes(i18n.getMessage('jsonError'))) {
        notification.innerHTML = `
            <div>${message}</div>
            <div class="notification-details">
                ${i18n.getMessage('jsonErrorDetails')}
            </div>
        `;
    } else {
        notification.textContent = message;
    }

    // Add to DOM
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('visible');
    }, 10);

    // Set display time (error message shows longer)
    const displayTime = type === 'error' ? 6000 : 3000;

    // Hide notification
    setTimeout(() => {
        notification.classList.remove('visible');

        // Completely remove
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, displayTime);
}

/**
 * Send webhook with dynamic values
 */
function sendWithDynamicValues() {
    if (!currentSendingWebhook) return;

    // Collect values of all dynamic fields
    const dynamicValues = {};
    const inputFields = dynamicForm.querySelectorAll('input');

    inputFields.forEach(input => {
        dynamicValues[input.name] = input.value;
    });

    // Create a copy of the webhook
    const webhookWithValues = { ...currentSendingWebhook };

    // Replace placeholders in request body with actual values
    if (webhookWithValues.body) {
        let body = typeof webhookWithValues.body === 'string'
            ? webhookWithValues.body
            : JSON.stringify(webhookWithValues.body);

        // Replace all placeholders {{field_name}} with actual values
        Object.keys(dynamicValues).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            body = body.replace(placeholder, dynamicValues[key]);
        });

        // If it's JSON format, try to parse back to object
        if (webhookWithValues.contentType === 'application/json') {
            try {
                webhookWithValues.body = JSON.parse(body);
            } catch (e) {
                webhookWithValues.body = body;
            }
        } else {
            webhookWithValues.body = body;
        }
    }

    // Replace placeholders in URL with actual values
    if (webhookWithValues.url) {
        Object.keys(dynamicValues).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            webhookWithValues.url = webhookWithValues.url.replace(placeholder, encodeURIComponent(dynamicValues[key]));
        });
    }

    // Replace placeholders in request headers with actual values
    if (webhookWithValues.headers) {
        let headers = typeof webhookWithValues.headers === 'string'
            ? webhookWithValues.headers
            : JSON.stringify(webhookWithValues.headers);

        Object.keys(dynamicValues).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            headers = headers.replace(placeholder, dynamicValues[key]);
        });

        try {
            webhookWithValues.headers = JSON.parse(headers);
        } catch (e) {
            webhookWithValues.headers = headers;
        }
    }

    // Send webhook
    executeSendWebhook(webhookWithValues);

    // Close modal window
    closeModal();
}

/**
 * Open send modal window
 * @param {Object} webhook - Webhook to send
 */
function openSendModal(webhook) {
    // Save current webhook
    currentSendingWebhook = webhook;

    // Clear form
    dynamicForm.innerHTML = '';

    // Automatically detect all dynamic fields
    const placeholders = collectDynamicFields(webhook);

    // Create input field for each placeholder
    placeholders.forEach(placeholder => {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = placeholder;

        const input = document.createElement('input');
        input.type = 'text';
        input.name = placeholder;
        input.placeholder = i18n.getMessage('enterValue').replace('{0}', placeholder);

        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        dynamicForm.appendChild(fieldGroup);
    });

    // If there are no placeholders, show prompt message
    if (placeholders.length === 0) {
        const noFieldsMsg = document.createElement('p');
        noFieldsMsg.textContent = i18n.getMessage('noDynamicFields');
        dynamicForm.appendChild(noFieldsMsg);
    }

    // Show modal window
    sendModal.style.display = 'block';
}

/**
 * Close send modal window
 */
function closeModal() {
    sendModal.style.display = 'none';
    currentSendingWebhook = null;
}

/**
 * Automatically collect dynamic fields
 * @param {Object} webhookData - Webhook data
 * @returns {Array} - Field names array
 */
function collectDynamicFields(webhookData) {
    const dynamicFields = new Set();

    // Extract from URL
    if (webhookData.url) {
        const urlMatches = webhookData.url.match(/{{([^}]+)}}/g) || [];
        urlMatches.forEach(match => {
            const fieldName = match.replace(/{{|}}/g, '');
            dynamicFields.add(fieldName);
        });
    }

    // Extract from request headers
    if (webhookData.headers) {
        const headerStr = typeof webhookData.headers === 'string'
            ? webhookData.headers
            : JSON.stringify(webhookData.headers);

        const headerMatches = headerStr.match(/{{([^}]+)}}/g) || [];
        headerMatches.forEach(match => {
            const fieldName = match.replace(/{{|}}/g, '');
            dynamicFields.add(fieldName);
        });
    }

    // Extract from request body
    if (webhookData.body) {
        const bodyStr = typeof webhookData.body === 'string'
            ? webhookData.body
            : JSON.stringify(webhookData.body);

        const bodyMatches = bodyStr.match(/{{([^}]+)}}/g) || [];
        bodyMatches.forEach(match => {
            const fieldName = match.replace(/{{|}}/g, '');
            dynamicFields.add(fieldName);
        });
    }

    return Array.from(dynamicFields);
}

/**
 * Load saved logs
 */
function loadLogs() {
    // Show loading status
    emptyLogs.textContent = i18n.getMessage('loadingLogs');
    emptyLogs.style.display = 'block';

    // Clear list
    const logItems = document.querySelectorAll('.log-item');
    logItems.forEach(item => item.remove());

    chrome.storage.local.get(['requestLogs'], (result) => {
        const logs = result.requestLogs || [];

        // Update empty status display
        if (logs.length === 0) {
            emptyLogs.textContent = i18n.getMessage('noLogs');
            emptyLogs.style.display = 'block';
        } else {
            emptyLogs.style.display = 'none';
        }

        // Add logs to list, sorted by time descending
        logs.sort((a, b) => b.timestamp - a.timestamp)
            .forEach(log => {
                const logElement = createLogElement(log);
                logsList.appendChild(logElement);
            });
    });
}

/**
 * Create log DOM element
 * @param {Object} log - Log data
 * @returns {HTMLElement} - Log DOM element
 */
function createLogElement(log) {
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.dataset.id = log.id;

    const header = document.createElement('div');
    header.className = 'log-item-header';

    const time = document.createElement('div');
    time.className = 'log-item-time';
    time.textContent = new Date(log.timestamp).toLocaleString();

    // Handle URL: may be directly on log or on log.webhook
    const url = document.createElement('div');
    url.className = 'log-item-url';
    url.textContent = log.url || (log.webhook && log.webhook.url) || '';

    // Handle Method: may be directly on log or on log.webhook
    const methodValue = log.method || (log.webhook && log.webhook.method) || i18n.getMessage('unknownMethod');
    const method = document.createElement('span');
    method.className = `log-item-method method-${methodValue.toLowerCase()}`;
    method.textContent = methodValue;

    // Status display
    const status = document.createElement('span');
    let statusClass = log.success === true ? 'status-success' : 'status-error';
    let statusText = '';

    if (log.status && log.status !== 0) {
        // There's HTTP status code, use status code and status text
        statusText = `${log.status} ${getStatusText(log.status)}`;
    } else if (log.error) {
        // Check if error information is HTTP error format
        const httpErrorMatch = log.error.match(/HTTP error (\d+)/);
        if (httpErrorMatch) {
            // If it's old format HTTP error, convert to new format
            const statusCode = httpErrorMatch[1];
            statusText = `${statusCode} ${getStatusText(Number(statusCode))}`;
        } else {
            // Other type of error
            statusText = log.error;
        }
    } else {
        // Default status
        statusText = log.success === true ? i18n.getMessage('success') : i18n.getMessage('failure');
    }

    status.className = `log-item-status ${statusClass}`;
    status.textContent = statusText;

    // Details container (default folded)
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'log-item-details';
    detailsContainer.style.display = 'none';

    // Request information part
    const requestSection = document.createElement('div');
    requestSection.className = 'log-section';
    const requestTitle = document.createElement('h4');
    requestTitle.textContent = i18n.getMessage('requestInfo');
    requestSection.appendChild(requestTitle);

    // Request URL
    const requestUrlDiv = document.createElement('div');
    requestUrlDiv.className = 'log-item-section';
    requestUrlDiv.innerHTML = `<strong>${i18n.getMessage('url')}:</strong> <span>${log.url || (log.webhook && log.webhook.url) || ''}</span>`;
    requestSection.appendChild(requestUrlDiv);

    // Request method
    const requestMethodDiv = document.createElement('div');
    requestMethodDiv.className = 'log-item-section';
    requestMethodDiv.innerHTML = `<strong>${i18n.getMessage('method')}:</strong> <span>${log.method || (log.webhook && log.webhook.method) || i18n.getMessage('unknownMethod')}</span>`;
    requestSection.appendChild(requestMethodDiv);

    // Request header information
    if (log.requestHeaders || (log.webhook && log.webhook.headers)) {
        const requestHeadersDiv = document.createElement('div');
        requestHeadersDiv.className = 'log-item-section';
        const headersTitle = document.createElement('strong');
        headersTitle.textContent = i18n.getMessage('requestHeaders') + ':';

        const headersContent = document.createElement('pre');
        headersContent.className = 'log-item-code';

        // Format request headers
        let formattedHeaders = '';
        try {
            const headers = log.requestHeaders || (log.webhook && log.webhook.headers) || {};
            const headersObj = typeof headers === 'string'
                ? JSON.parse(headers)
                : headers;

            formattedHeaders = Object.entries(headersObj)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
        } catch (e) {
            const headers = log.requestHeaders || (log.webhook && log.webhook.headers) || {};
            formattedHeaders = JSON.stringify(headers, null, 2);
        }

        headersContent.textContent = formattedHeaders;

        requestHeadersDiv.appendChild(headersTitle);
        requestHeadersDiv.appendChild(document.createElement('br'));
        requestHeadersDiv.appendChild(headersContent);
        requestSection.appendChild(requestHeadersDiv);
    }

    // Request body
    if (log.requestBody || (log.webhook && log.webhook.body)) {
        const requestBodyDiv = document.createElement('div');
        requestBodyDiv.className = 'log-item-section';
        const bodyTitle = document.createElement('strong');
        bodyTitle.textContent = i18n.getMessage('requestBody') + ':';

        const bodyContent = document.createElement('pre');
        bodyContent.className = 'log-item-code';

        // Format request body
        let formattedBody = '';
        try {
            const body = log.requestBody || (log.webhook && log.webhook.body) || '';
            if (typeof body === 'string') {
                if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
                    formattedBody = JSON.stringify(JSON.parse(body), null, 2);
                } else {
                    formattedBody = body;
                }
            } else {
                formattedBody = JSON.stringify(body, null, 2);
            }
        } catch (e) {
            const body = log.requestBody || (log.webhook && log.webhook.body) || '';
            formattedBody = typeof body === 'string' ? body : JSON.stringify(body);
        }

        bodyContent.textContent = formattedBody;

        requestBodyDiv.appendChild(bodyTitle);
        requestBodyDiv.appendChild(document.createElement('br'));
        requestBodyDiv.appendChild(bodyContent);
        requestSection.appendChild(requestBodyDiv);
    }

    detailsContainer.appendChild(requestSection);

    // Response information part
    const responseSection = document.createElement('div');
    responseSection.className = 'log-section';
    const responseTitle = document.createElement('h4');
    responseTitle.textContent = i18n.getMessage('responseInfo');
    responseSection.appendChild(responseTitle);

    // Response status
    const responseStatusDiv = document.createElement('div');
    responseStatusDiv.className = 'log-item-section';
    responseStatusDiv.innerHTML = `<strong>${i18n.getMessage('status')}:</strong> <span>${statusText}</span>`;
    responseSection.appendChild(responseStatusDiv);

    // Response header
    if (log.responseHeaders) {
        const responseHeadersDiv = document.createElement('div');
        responseHeadersDiv.className = 'log-item-section';
        const headersTitle = document.createElement('strong');
        headersTitle.textContent = i18n.getMessage('responseHeaders') + ':';

        const headersContent = document.createElement('pre');
        headersContent.className = 'log-item-code';

        // Format response headers
        let formattedHeaders = '';
        try {
            const headers = typeof log.responseHeaders === 'string'
                ? JSON.parse(log.responseHeaders)
                : log.responseHeaders;

            formattedHeaders = Object.entries(headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
        } catch (e) {
            formattedHeaders = JSON.stringify(log.responseHeaders, null, 2);
        }

        headersContent.textContent = formattedHeaders;

        responseHeadersDiv.appendChild(headersTitle);
        responseHeadersDiv.appendChild(document.createElement('br'));
        responseHeadersDiv.appendChild(headersContent);
        responseSection.appendChild(responseHeadersDiv);
    }

    // Response body
    if (log.response) {
        const responseBodyDiv = document.createElement('div');
        responseBodyDiv.className = 'log-item-section';
        const bodyTitle = document.createElement('strong');
        bodyTitle.textContent = i18n.getMessage('responseBody') + ':';

        const bodyContent = document.createElement('pre');
        bodyContent.className = 'log-item-code';

        // Format response body
        let formattedResponse = '';
        try {
            if (typeof log.response === 'string' && log.response.trim().startsWith('{')) {
                formattedResponse = JSON.stringify(JSON.parse(log.response), null, 2);
            } else {
                formattedResponse = log.response;
            }
        } catch (e) {
            formattedResponse = log.response;
        }

        bodyContent.textContent = formattedResponse;

        responseBodyDiv.appendChild(bodyTitle);
        responseBodyDiv.appendChild(document.createElement('br'));
        responseBodyDiv.appendChild(bodyContent);
        responseSection.appendChild(responseBodyDiv);
    }

    detailsContainer.appendChild(responseSection);

    // Expand/fold button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'log-item-expand';
    expandBtn.textContent = i18n.getMessage('viewDetails');
    expandBtn.addEventListener('click', () => {
        const isHidden = detailsContainer.style.display === 'none';
        detailsContainer.style.display = isHidden ? 'block' : 'none';
        expandBtn.textContent = isHidden ? i18n.getMessage('hideDetails') : i18n.getMessage('viewDetails');
    });

    // Assemble elements
    header.appendChild(time);

    // Create first row: time and URL
    const firstRow = document.createElement('div');
    firstRow.className = 'log-item-row';
    firstRow.appendChild(header);
    firstRow.appendChild(url);

    // Create second row: method, status and view details button
    const secondRow = document.createElement('div');
    secondRow.className = 'log-item-row';
    secondRow.appendChild(method);
    secondRow.appendChild(status);
    secondRow.appendChild(expandBtn);

    logItem.appendChild(firstRow);
    logItem.appendChild(secondRow);
    logItem.appendChild(detailsContainer);

    return logItem;
}

/**
 * Get status text based on HTTP status code
 * @param {number} status - HTTP status code
 * @returns {string} - Status text
 */
function getStatusText(status) {
    const statusTexts = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        408: 'Request Timeout',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout'
    };

    return statusTexts[status] || '';
}

/**
 * Add new log
 * @param {Object} logData - Log data
 */
function addLog(logData) {
    // Show loading status (only if currently in logs tab)
    if (logsContent.classList.contains('active')) {
        emptyLogs.textContent = i18n.getMessage('loadingLogs');
        emptyLogs.style.display = 'block';
    }

    chrome.storage.local.get(['requestLogs'], (result) => {
        const logs = result.requestLogs || [];

        // Standardize log data
        const newLog = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            url: logData.url || (logData.webhook && logData.webhook.url) || '',
            method: logData.method || (logData.webhook && logData.webhook.method) || i18n.getMessage('unknownMethod'),
            requestHeaders: logData.requestHeaders || (logData.webhook && logData.webhook.headers) || {},
            requestBody: logData.requestBody || (logData.webhook && logData.webhook.body) || '',
            success: logData.success === true, // Ensure boolean
            error: logData.error || '',
            response: logData.response || '',
            responseHeaders: logData.responseHeaders || {},
            status: logData.status || 0,
            webhook: logData.webhook || null // Keep original webhook data for later use
        };

        // Limit log count to latest 50
        logs.unshift(newLog);
        if (logs.length > 50) {
            logs.length = 50;
        }

        // Save logs
        chrome.storage.local.set({ requestLogs: logs }, () => {
            // If currently in logs tab, refresh display
            if (logsContent.classList.contains('active')) {
                loadLogs();
            }
        });
    });
}

/**
 * Clear all logs
 */
function clearLogs() {
    // Show clear logs confirmation modal window
    clearLogsModal.style.display = 'block';

    // Set confirm button click event
    confirmClearLogsBtn.onclick = function () {
        chrome.storage.local.set({ requestLogs: [] }, () => {
            loadLogs();
            showNotification(i18n.getMessage('logsCleared'), 'success');
            closeClearLogsModal();
        });
    };
}

/**
 * Show clickable notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success' or 'error')
 * @param {string} actionText - Action text
 */
function showClickableNotification(message, type, actionText) {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type} clickable`;

    // Create message and action elements
    const messageElement = document.createElement('div');
    messageElement.className = 'notification-message';
    messageElement.textContent = message;

    const actionElement = document.createElement('div');
    actionElement.className = 'notification-action';
    actionElement.textContent = actionText;

    // Add child elements
    notification.appendChild(messageElement);
    notification.appendChild(actionElement);

    // Switch to logs tab when clicking on action area
    notification.addEventListener('click', () => {
        switchTab('logs');
        notification.classList.remove('visible');

        // Timer to remove notification
        setTimeout(() => {
            notification.remove();
        }, 300);
    });

    // Add to DOM
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('visible');
    }, 10);

    // Set display time (error message shows longer)
    const displayTime = 10000; // 10 seconds, give user enough time to click

    // Hide notification
    setTimeout(() => {
        notification.classList.remove('visible');

        // Completely remove
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, displayTime);
}

/**
 * Close clear logs modal window
 */
function closeClearLogsModal() {
    clearLogsModal.style.display = 'none';
    // Remove event to prevent memory leak
    confirmClearLogsBtn.onclick = null;
}

/**
 * 根据HTTP方法决定是否显示请求体输入框
 * Toggle request body visibility based on HTTP method
 */
function toggleBodyVisibility() {
    console.log('toggleBodyVisibility called');

    try {
        // Directly get elements from DOM, avoid using possibly uninitialized variables
        const methodElement = document.getElementById('webhook-method');
        const bodyElement = document.getElementById('webhook-body');
        const bodyFormGroup = bodyElement ? bodyElement.closest('.form-group') : null;

        if (!methodElement) {
            console.error('Method element not found');
            return;
        }

        if (!bodyElement) {
            console.error('Body element not found');
            return;
        }

        if (!bodyFormGroup) {
            console.error('Body form group not found');
            return;
        }

        const method = methodElement.value;
        console.log('Current method:', method);

        const isMethodWithoutBody = method === 'GET' || method === 'HEAD';
        console.log('Is method without body:', isMethodWithoutBody);

        if (isMethodWithoutBody) {
            console.log('Disabling body form group');
            bodyFormGroup.classList.add('disabled-form-group');
            bodyElement.disabled = true;

            // 获取翻译，如果i18n可用
            let placeholderText = `${method} requests don't need a body`;
            if (window.i18n && typeof window.i18n.getMessage === 'function') {
                const i18nMessage = window.i18n.getMessage('noBodyNeeded');
                if (i18nMessage) {
                    placeholderText = `${method} ${i18nMessage}`;
                }
            }
            bodyElement.placeholder = placeholderText;

            // 隐藏帮助文本
            const fieldHelp = bodyFormGroup.querySelector('.field-help');
            if (fieldHelp) {
                fieldHelp.style.display = 'none';
                console.log('Field help hidden');
            }
        } else {
            console.log('Enabling body form group');
            bodyFormGroup.classList.remove('disabled-form-group');
            bodyElement.disabled = false;
            bodyElement.placeholder = '{"key": "value"}';

            // 显示帮助文本
            const fieldHelp = bodyFormGroup.querySelector('.field-help');
            if (fieldHelp) {
                fieldHelp.style.display = '';
                console.log('Field help shown');
            }
        }
    } catch (error) {
        console.error('Error in toggleBodyVisibility:', error);
    }
} 

/**
 * Request Module
 * Handles all request operations including create, edit, delete and send
 */

const Request = {
    /**
     * Load saved requests
     */
    loadRequests() {
        console.log('Loading requests...');
        chrome.storage.local.get(['requests'], (result) => {
            const requests = result.requests || [];
            const requestsList = document.getElementById('requests-list');
            const emptyRequests = document.getElementById('empty-requests');

            if (!requestsList) {
                console.error('Request list element not found!');
                return;
            }

            console.log(`Found ${requests.length} requests`);

            // Update empty status display
            if (emptyRequests) {
                emptyRequests.style.display = requests.length === 0 ? 'block' : 'none';
            }

            // Clear list
            const requestItems = document.querySelectorAll('.request-item');
            requestItems.forEach(item => item.remove());

            // Add requests to list
            requests.forEach(request => {
                try {
                    const requestElement = this.createRequestElement(request);
                    requestsList.appendChild(requestElement);
                    console.log(`Added request: ${request.name}`);
                } catch (error) {
                    console.error(`Error creating request element for ${request.name}:`, error);
                }
            });

            // Update all internationalized elements
            if (typeof i18n !== 'undefined' && i18n.updateElements) {
                i18n.updateElements();
            } else {
                console.warn('i18n.updateElements not available');
            }
        });
    },

    /**
     * Create request DOM element
     * @param {Object} request - Request data
     * @returns {HTMLElement} - Request DOM element
     */
    createRequestElement(request) {
        console.log(`Creating request element for: ${request.name}`);
        const item = document.createElement('div');
        item.className = 'request-item';
        item.setAttribute('data-id', request.id);

        const header = document.createElement('div');
        header.className = 'request-header';

        const title = document.createElement('h3');
        title.className = 'request-title';
        title.textContent = request.name;

        const method = document.createElement('span');
        method.className = 'request-method';
        method.textContent = request.method;
        method.classList.add(request.method.toLowerCase());

        const actions = document.createElement('div');
        actions.className = 'request-actions';

        // 鍙戦€佹寜閽?- Send button
        const sendBtn = document.createElement('button');
        sendBtn.className = 'btn btn-primary request-send';
        
        try {
            if (typeof i18n !== 'undefined' && i18n.getMessage) {
                const msgText = i18n.getMessage('send');
                if (msgText && msgText !== 'send') {
                    sendBtn.textContent = msgText;
                }
            }
        } catch (e) {
            console.error('Error setting send button text:', e);
        }
        
        sendBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Check if request has parameters
            if (this.checkForParameters(request)) {
                UI.modals.openSendModal(request);
            } else {
                this.executeSendRequest(request);
            }
        });

        // 缂栬緫鎸夐挳 - Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn request-edit';
        
        try {
            if (typeof i18n !== 'undefined' && i18n.getMessage) {
                const msgText = i18n.getMessage('edit');
                if (msgText && msgText !== 'edit') {
                    editBtn.textContent = msgText;
                }
            }
        } catch (e) {
            console.error('Error setting edit button text:', e);
        }
        
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editRequest(request);
        });

        // 鍒犻櫎鎸夐挳 - Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger request-delete';
        
        try {
            if (typeof i18n !== 'undefined' && i18n.getMessage) {
                const msgText = i18n.getMessage('delete');
                if (msgText && msgText !== 'delete') {
                    deleteBtn.textContent = msgText;
                }
            }
        } catch (e) {
            console.error('Error setting delete button text:', e);
        }
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            UI.modals.openDeleteModal(request.id);
        });

        actions.appendChild(sendBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        header.appendChild(title);
        header.appendChild(method);
        
        // Create request details section 
        const details = document.createElement('div');
        details.className = 'request-details';
        details.style.display = 'none';

        const url = document.createElement('div');
        url.className = 'request-url';
        url.innerHTML = `<strong>${i18n.getMessage('url') || 'URL'}:</strong> ${request.url}`;

        details.appendChild(url);

        // Add dynamic fields info if present
        const dynamicFields = this.collectDynamicFields(request);
        if (dynamicFields.length > 0) {
            const fieldsContainer = document.createElement('div');
            fieldsContainer.className = 'request-dynamic-fields';
            fieldsContainer.innerHTML = `<strong>${i18n.getMessage('dynamicFields') || 'Dynamic Fields'}:</strong> ${dynamicFields.join(', ')}`;
            details.appendChild(fieldsContainer);
        }

        // Toggle details visibility on header click
        header.addEventListener('click', (e) => {
            // Don't toggle if clicked on action buttons
            if (!e.target.closest('.request-actions')) {
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            }
        });

        item.appendChild(header);
        item.appendChild(details);
        item.appendChild(actions);

        return item;
    },

    /**
     * Validate JSON format
     * @param {string} jsonText - JSON text to validate
     * @param {string} fieldType - Field type (headers or body)
     * @returns {Object|null} - Parsed JSON or null if invalid
     */
    validateJSON(jsonText, fieldType) {
        if (!jsonText || jsonText.trim() === '') {
            return null;
        }
        
        try {
            return JSON.parse(jsonText);
        } catch (error) {
            UI.showNotification(
                i18n.getMessage('invalidJson', [fieldType, error.message]), 
                'error'
            );
            return null;
        }
    },

    /**
     * Save request to storage
     * @param {Event} e - Form submission event
     */
    saveRequest(e) {
        e.preventDefault();
        
        const requestForm = document.getElementById('request-form');
        const nameField = document.getElementById('request-name');
        const urlField = document.getElementById('request-url');
        const methodField = document.getElementById('request-method');
        const headersField = document.getElementById('request-headers');
        const bodyField = document.getElementById('request-body');
        const contentTypeField = document.getElementById('request-content-type');
        
        // Form validation
        if (!nameField.value.trim()) {
            UI.showNotification(i18n.getMessage('nameRequired'), 'error');
            nameField.focus();
            return;
        }
        
        if (!urlField.value.trim()) {
            UI.showNotification(i18n.getMessage('urlRequired'), 'error');
            urlField.focus();
            return;
        }
        
        try {
            // Check if URL is valid
            new URL(urlField.value);
        } catch (error) {
            UI.showNotification(i18n.getMessage('invalidUrl'), 'error');
            urlField.focus();
            return;
        }
        
        // Validate headers JSON if present
        let headers = null;
        if (headersField.value.trim()) {
            headers = this.validateJSON(headersField.value, i18n.getMessage('headers'));
            if (headers === null) {
                headersField.focus();
                return;
            }
        }
        
        // Validate body JSON for JSON content type
        let body = bodyField.value;
        if (body.trim() && contentTypeField.value === 'application/json') {
            body = this.validateJSON(body, i18n.getMessage('body'));
            if (body === null) {
                bodyField.focus();
                return;
            }
        }
        
        // Create request object
        const request = {
            id: window.currentEditId || Date.now().toString(),
            name: nameField.value.trim(),
            url: urlField.value.trim(),
            method: methodField.value,
            contentType: contentTypeField.value,
            headers: headers,
            body: body
        };
        
        // Save request
        chrome.storage.local.get(['requests'], (result) => {
            let requests = result.requests || [];
            
            if (window.currentEditId) {
                // Update existing request
                requests = requests.map(r => r.id === window.currentEditId ? request : r);
                UI.showNotification(i18n.getMessage('requestUpdated'));
            } else {
                // Add new request
                requests.push(request);
                UI.showNotification(i18n.getMessage('requestAdded'));
            }
            
            // Save requests
            chrome.storage.local.set({ requests }, () => {
                // Reset form
                RequestForm.resetForm();
                
                // Switch to requests tab
                UI.tabs.switchTo('requests');
                
                // Reload requests
                this.loadRequests();
            });
        });
    },

    /**
     * Edit request
     * @param {Object} request - Request to edit
     */
    editRequest(request) {
        // Set form title
        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            try {
                if (typeof i18n !== 'undefined' && i18n.getMessage) {
                    const msgText = i18n.getMessage('editRequest');
                    formTitle.textContent = msgText || 'Edit Request';
                } else {
                    formTitle.textContent = 'Edit Request';
                }
            } catch (e) {
                console.error('Error setting form title text:', e);
                formTitle.textContent = 'Edit Request';
            }
        }
        
        // Fill form fields
        document.getElementById('request-name').value = request.name;
        document.getElementById('request-url').value = request.url;
        document.getElementById('request-method').value = request.method;
        document.getElementById('request-content-type').value = request.contentType || 'application/json';
        
        // Fill headers
        if (request.headers) {
            document.getElementById('request-headers').value = 
                typeof request.headers === 'string' 
                    ? request.headers 
                    : JSON.stringify(request.headers, null, 2);
        }
        
        // Fill body
        if (request.body) {
            document.getElementById('request-body').value = 
                typeof request.body === 'string' 
                    ? request.body 
                    : JSON.stringify(request.body, null, 2);
        }
        
        // Set edit mode
        window.currentEditId = request.id;
        
        // Show/hide body field based on method
        RequestForm.toggleBodyVisibility();
        
        // Switch to create tab
        UI.tabs.switchTo('create', true);
    },

    /**
     * Delete request
     * @param {string} id - Request ID
     */
    deleteRequest(id) {
        chrome.storage.local.get(['requests'], (result) => {
            const requests = result.requests || [];
            const updatedRequests = requests.filter(request => request.id !== id);
            
            chrome.storage.local.set({ requests: updatedRequests }, () => {
                UI.showNotification(i18n.getMessage('requestDeleted'));
                this.loadRequests();
            });
        });
    },

    /**
     * Check if request contains parameters to fill
     * @param {Object} request - Request data
     * @returns {boolean} - Whether request contains parameters
     */
    checkForParameters(request) {
        const fields = this.collectDynamicFields(request);
        return fields.length > 0;
    },

    /**
     * Collect dynamic fields from request data
     * @param {Object} requestData - Request data
     * @returns {Array} - Array of field names
     */
    collectDynamicFields(requestData) {
        const fields = new Set();
        const regex = /{{([^{}]+)}}/g;
        let match;
        
        // Check URL for parameters
        if (requestData.url) {
            while ((match = regex.exec(requestData.url)) !== null) {
                fields.add(match[1].trim());
            }
        }
        
        // Check headers for parameters
        if (requestData.headers) {
            const headersStr = typeof requestData.headers === 'string' 
                ? requestData.headers 
                : JSON.stringify(requestData.headers);
                
            regex.lastIndex = 0; // Reset regex
            while ((match = regex.exec(headersStr)) !== null) {
                fields.add(match[1].trim());
            }
        }
        
        // Check body for parameters
        if (requestData.body) {
            const bodyStr = typeof requestData.body === 'string' 
                ? requestData.body 
                : JSON.stringify(requestData.body);
                
            regex.lastIndex = 0; // Reset regex
            while ((match = regex.exec(bodyStr)) !== null) {
                fields.add(match[1].trim());
            }
        }
        
        return Array.from(fields);
    },

    /**
     * Send request with dynamic parameter values
     */
    sendWithDynamicValues() {
        const request = window.currentSendingRequest;
        if (!request) {
            console.error('No request selected for sending');
            return;
        }
        
        const dynamicForm = document.getElementById('dynamic-form');
        const inputs = dynamicForm.querySelectorAll('input');
        const values = {};
        
        // Collect values from form
        inputs.forEach(input => {
            values[input.name] = input.value;
        });
        
        // Close modal
        UI.modals.closeSendModal();
        
        // Replace parameters with values
        const preparedRequest = this.prepareRequestWithValues(request, values);
        
        // Send request
        this.executeSendRequest(preparedRequest);
    },

    /**
     * Prepare request by replacing parameters with values
     * @param {Object} request - Original request
     * @param {Object} values - Parameter values
     * @returns {Object} - Prepared request
     */
    prepareRequestWithValues(request, values) {
        // Clone request to avoid modifying original
        const preparedRequest = JSON.parse(JSON.stringify(request));
        
        // Replace parameters in URL
        if (preparedRequest.url) {
            Object.keys(values).forEach(key => {
                preparedRequest.url = preparedRequest.url.replace(
                    new RegExp(`{{${key}}}`, 'g'), 
                    encodeURIComponent(values[key])
                );
            });
        }
        
        // Replace parameters in headers
        if (preparedRequest.headers) {
            const headersStr = typeof preparedRequest.headers === 'string'
                ? preparedRequest.headers
                : JSON.stringify(preparedRequest.headers);
                
            let processedHeadersStr = headersStr;
            Object.keys(values).forEach(key => {
                processedHeadersStr = processedHeadersStr.replace(
                    new RegExp(`{{${key}}}`, 'g'), 
                    values[key]
                );
            });
            
            // Parse back to object
            preparedRequest.headers = JSON.parse(processedHeadersStr);
        }
        
        // Replace parameters in body
        if (preparedRequest.body) {
            const bodyStr = typeof preparedRequest.body === 'string'
                ? preparedRequest.body
                : JSON.stringify(preparedRequest.body);
                
            let processedBodyStr = bodyStr;
            Object.keys(values).forEach(key => {
                processedBodyStr = processedBodyStr.replace(
                    new RegExp(`{{${key}}}`, 'g'), 
                    values[key]
                );
            });
            
            // If JSON content type, parse back to object
            if (preparedRequest.contentType === 'application/json') {
                try {
                    preparedRequest.body = JSON.parse(processedBodyStr);
                } catch (error) {
                    preparedRequest.body = processedBodyStr;
                }
            } else {
                preparedRequest.body = processedBodyStr;
            }
        }
        
        return preparedRequest;
    },

    /**
     * Execute sending request
     * @param {Object} request - Request to send
     */
    executeSendRequest(request) {
        // Show loading indicator
        const loadingNotification = UI.showNotification('sendingRequest', 'info');
        
        // Send request to background script
        chrome.runtime.sendMessage(
            { action: 'send_request', request },
            (response) => {
                // Remove loading notification
                if (loadingNotification && loadingNotification.parentNode) {
                    loadingNotification.remove();
                }
                
                // Check for response
                if (!response) {
                    UI.showNotification('noResponse', 'error');
                    return;
                }
                
                // Check success status
                if (response.success) {
                    UI.showNotification('requestSent', 'success');
                } else {
                    UI.showNotification('sendFailed', 'error');
                }
            }
        );
    },

    /**
     * Test request from form inputs
     */
    testRequest() {
        const nameField = document.getElementById('request-name');
        const urlField = document.getElementById('request-url');
        const methodField = document.getElementById('request-method');
        const headersField = document.getElementById('request-headers');
        const bodyField = document.getElementById('request-body');
        const contentTypeField = document.getElementById('request-content-type');
        
        // Form validation
        if (!urlField.value.trim()) {
            UI.showNotification(i18n.getMessage('urlRequired'), 'error');
            urlField.focus();
            return;
        }
        
        try {
            // Check if URL is valid
            new URL(urlField.value);
        } catch (error) {
            UI.showNotification(i18n.getMessage('invalidUrl'), 'error');
            urlField.focus();
            return;
        }
        
        // Validate headers JSON if present
        let headers = null;
        if (headersField.value.trim()) {
            headers = this.validateJSON(headersField.value, i18n.getMessage('headers'));
            if (headers === null) {
                headersField.focus();
                return;
            }
        }
        
        // Validate body JSON for JSON content type
        let body = bodyField.value;
        if (body.trim() && contentTypeField.value === 'application/json') {
            body = this.validateJSON(body, i18n.getMessage('body'));
            if (body === null) {
                bodyField.focus();
                return;
            }
        }
        
        // Create request object
        const request = {
            id: 'test-' + Date.now().toString(),
            name: nameField.value.trim() || 'Test Request',
            url: urlField.value.trim(),
            method: methodField.value,
            contentType: contentTypeField.value,
            headers: headers,
            body: body
        };
        
        // Check if request has parameters
        if (this.checkForParameters(request)) {
            UI.modals.openSendModal(request);
        } else {
            this.executeSendRequest(request);
        }
    },

    /**
     * Initialize request module
     */
    init() {
        // Form submission handler
        document.getElementById('request-form').addEventListener('submit', (e) => this.saveRequest(e));
        
        // Test request button
        document.getElementById('test-request').addEventListener('click', () => this.testRequest());
        
        // Load requests initially
        this.loadRequests();
    }
};

// Export module
window.Request = Request;


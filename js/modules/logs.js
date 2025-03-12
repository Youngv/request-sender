/**
 * LogsManager Module
 * Handles request logs management
 */

const LogsManager = {
    // Maximum logs to store (prevent excessive storage usage)
    MAX_LOGS: 100,
    
    /**
     * Load saved logs
     */
    loadLogs() {
        chrome.storage.local.get(['logs'], (result) => {
            const logs = result.logs || [];
            const logsList = document.getElementById('logs-list');
            const emptyLogs = document.getElementById('empty-logs');
            
            // Update empty status display
            emptyLogs.style.display = logs.length === 0 ? 'block' : 'none';
            
            // Clear list
            const logItems = document.querySelectorAll('.log-item');
            logItems.forEach(item => item.remove());
            
            // Add logs to list (newest first)
            logs.forEach(log => {
                const logElement = this.createLogElement(log);
                logsList.appendChild(logElement);
            });
        });
    },
    
    /**
     * Create log DOM element
     * @param {Object} log - Log data
     * @returns {HTMLElement} - Log DOM element
     */
    createLogElement(log) {
        const item = document.createElement('div');
        item.className = 'log-item';
        item.classList.add(log.success ? 'success' : 'error');
        
        const header = document.createElement('div');
        header.className = 'log-header';
        
        const title = document.createElement('div');
        title.className = 'log-title';
        
        const name = document.createElement('strong');
        name.textContent = log.request;
        
        const method = document.createElement('span');
        method.className = 'log-method';
        const methodValue = log.method || 'UNKNOWN';
        method.textContent = methodValue;
        method.classList.add(methodValue.toLowerCase());
        
        const timestamp = document.createElement('span');
        timestamp.className = 'log-time';
        timestamp.textContent = new Date(log.timestamp).toLocaleString();
        
        const status = document.createElement('span');
        status.className = 'log-status';
        status.textContent = `${log.status} ${this.getStatusText(log.status)}`;
        status.classList.add(log.success ? 'success' : 'error');
        
        title.appendChild(name);
        title.appendChild(method);
        
        header.appendChild(title);
        header.appendChild(timestamp);
        header.appendChild(status);
        
        // Create log details section (hidden by default)
        const details = document.createElement('div');
        details.className = 'log-details';
        details.style.display = 'none';
        
        // Request details
        const requestSection = document.createElement('div');
        requestSection.className = 'log-section';
        
        const requestTitle = document.createElement('h4');
        requestTitle.textContent = i18n.getMessage('request');
        
        const requestUrl = document.createElement('div');
        requestUrl.className = 'log-url';
        requestUrl.innerHTML = `<strong>${i18n.getMessage('url')}:</strong> ${log.url}`;
        
        requestSection.appendChild(requestTitle);
        requestSection.appendChild(requestUrl);
        
        // Request headers
        const requestHeaders = document.createElement('div');
        requestHeaders.className = 'log-headers';
        
        const reqHeadersTitle = document.createElement('strong');
        reqHeadersTitle.textContent = i18n.getMessage('requestHeaders');
        
        const reqHeadersList = document.createElement('pre');
        reqHeadersList.className = 'code-block';
        
        // 确保显示请求头，即使为空
        const headersObj = log.requestDetails ? log.requestDetails.headers : (log.headers || {});
        reqHeadersList.textContent = JSON.stringify(headersObj, null, 2);
        
        requestHeaders.appendChild(reqHeadersTitle);
        requestHeaders.appendChild(reqHeadersList);
        requestSection.appendChild(requestHeaders);
        
        // Request body
        if (log.body) {
            const requestBody = document.createElement('div');
            requestBody.className = 'log-body';
            
            const bodyTitle = document.createElement('strong');
            bodyTitle.textContent = `${i18n.getMessage('body')}:`;
            
            const bodyContent = document.createElement('pre');
            bodyContent.className = 'code-block';
            
            // Format body based on type
            if (typeof log.body === 'object') {
                bodyContent.textContent = JSON.stringify(log.body, null, 2);
            } else {
                try {
                    // Try to parse as JSON for better display
                    const parsed = JSON.parse(log.body);
                    bodyContent.textContent = JSON.stringify(parsed, null, 2);
                } catch (error) {
                    // If not JSON, display as is
                    bodyContent.textContent = log.body;
                }
            }
            
            requestBody.appendChild(bodyTitle);
            requestBody.appendChild(bodyContent);
            requestSection.appendChild(requestBody);
        }
        
        details.appendChild(requestSection);
        
        // Response details
        const responseSection = document.createElement('div');
        responseSection.className = 'log-section';
        
        const responseTitle = document.createElement('h4');
        responseTitle.textContent = i18n.getMessage('response');
        responseSection.appendChild(responseTitle);
        
        // Error message
        if (log.error) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'log-error';
            errorMessage.innerHTML = `<strong>${i18n.getMessage('error')}:</strong> ${log.error}`;
            responseSection.appendChild(errorMessage);
        }
        
        // Response headers
        const responseHeaders = document.createElement('div');
        responseHeaders.className = 'log-headers';
        
        const respHeadersTitle = document.createElement('strong');
        respHeadersTitle.textContent = i18n.getMessage('responseHeaders');
        
        const respHeadersList = document.createElement('pre');
        respHeadersList.className = 'code-block';
        
        // 确保显示响应头，即使为空
        const responseHeadersObj = log.responseHeaders || {};
        respHeadersList.textContent = JSON.stringify(responseHeadersObj, null, 2);
        
        responseHeaders.appendChild(respHeadersTitle);
        responseHeaders.appendChild(respHeadersList);
        responseSection.appendChild(responseHeaders);
        
        // Response data
        if (log.response !== null && log.response !== undefined) {
            const responseData = document.createElement('div');
            responseData.className = 'log-response';
            
            const dataTitle = document.createElement('strong');
            dataTitle.textContent = `${i18n.getMessage('data')}:`;
            
            const dataContent = document.createElement('pre');
            dataContent.className = 'code-block';
            
            // Format response based on type
            if (typeof log.response === 'object') {
                dataContent.textContent = JSON.stringify(log.response, null, 2);
            } else {
                try {
                    // Try to parse as JSON for better display
                    const parsed = JSON.parse(log.response);
                    dataContent.textContent = JSON.stringify(parsed, null, 2);
                } catch (error) {
                    // If not JSON, display as is
                    dataContent.textContent = log.response;
                }
            }
            
            responseData.appendChild(dataTitle);
            responseData.appendChild(dataContent);
            responseSection.appendChild(responseData);
        }
        
        details.appendChild(responseSection);
        
        // Toggle details visibility on header click
        header.addEventListener('click', () => {
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        });
        
        item.appendChild(header);
        item.appendChild(details);
        
        return item;
    },
    
    /**
     * Get status text based on HTTP status code
     * @param {number} status - HTTP status code
     * @returns {string} - Status text
     */
    getStatusText(status) {
        const statusTexts = {
            0: i18n.getMessage('networkError'),
            200: i18n.getMessage('ok'),
            201: i18n.getMessage('created'),
            202: i18n.getMessage('accepted'),
            204: i18n.getMessage('noContent'),
            400: i18n.getMessage('badRequest'),
            401: i18n.getMessage('unauthorized'),
            403: i18n.getMessage('forbidden'),
            404: i18n.getMessage('notFound'),
            405: i18n.getMessage('methodNotAllowed'),
            408: i18n.getMessage('requestTimeout'),
            409: i18n.getMessage('conflict'),
            422: i18n.getMessage('unprocessableEntity'),
            429: i18n.getMessage('tooManyRequests'),
            500: i18n.getMessage('internalServerError'),
            502: i18n.getMessage('badGateway'),
            503: i18n.getMessage('serviceUnavailable'),
            504: i18n.getMessage('gatewayTimeout')
        };
        
        return statusTexts[status] || '';
    },
    
    /**
     * Add new log
     * @param {Object} logData - Log data
     */
    addLog(logData) {
        chrome.storage.local.get(['logs'], (result) => {
            let logs = result.logs || [];
            
            // Add new log
            logs.push(logData);
            
            // Limit number of logs to prevent excessive storage usage
            if (logs.length > this.MAX_LOGS) {
                logs = logs.slice(-this.MAX_LOGS);
            }
            
            // Save logs
            chrome.storage.local.set({ logs }, () => {
                // Reload logs if logs tab is active
                const logsContent = document.getElementById('logs-content');
                if (logsContent.classList.contains('active')) {
                    this.loadLogs();
                }
            });
        });
    },
    
    /**
     * Clear all logs
     */
    clearLogs() {
        chrome.storage.local.set({ logs: [] }, () => {
            UI.showNotification(i18n.getMessage('logsCleared'));
            this.loadLogs();
            UI.modals.closeClearLogsModal();
        });
    },
    
    /**
     * Initialize logs module
     */
    init() {
        // Clear logs button
        document.getElementById('clear-logs').addEventListener('click', () => UI.modals.openClearLogsModal());
    }
};

// Export module
window.LogsManager = LogsManager;


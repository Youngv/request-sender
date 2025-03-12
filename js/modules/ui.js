/**
 * UI Module
 * Handles UI interactions, tab switching and modal operations
 */

// UI Module namespace
const UI = {
    // Tab switching functionality
    tabs: {
        /**
         * Switch tab pages
         * @param {string} tabName - Tab page name
         * @param {boolean} skipReset - Whether to skip form reset (for edit mode)
         */
        switchTo(tabName, skipReset) {
            const elements = {
                tabs: {
                    requests: document.getElementById('requests-tab'),
                    create: document.getElementById('create-tab'),
                    logs: document.getElementById('logs-tab')
                },
                content: {
                    requests: document.getElementById('requests-content'),
                    create: document.getElementById('create-content'),
                    logs: document.getElementById('logs-content')
                }
            };

            // Reset form, but skip in edit mode
            if (tabName === 'create' && !skipReset) {
                RequestForm.resetForm();
            }

            // If switching to logs tab, ensure to load latest logs
            if (tabName === 'logs') {
                LogsManager.loadLogs();
            }

            // Update tab button status
            Object.keys(elements.tabs).forEach(tab => {
                elements.tabs[tab].classList.toggle('active', tab === tabName);
                elements.content[tab].classList.toggle('active', tab === tabName);
            });

            // If switching to create tab, ensure request body is displayed/hidden correctly based on method
            if (tabName === 'create') {
                // Use small timeout to ensure DOM is updated
                setTimeout(() => {
                    RequestForm.toggleBodyVisibility();
                }, 0);
            }
        },

        /**
         * Initialize tab event listeners
         */
        initTabListeners() {
            document.getElementById('requests-tab').addEventListener('click', () => UI.tabs.switchTo('requests'));
            document.getElementById('create-tab').addEventListener('click', () => UI.tabs.switchTo('create', false));
            document.getElementById('logs-tab').addEventListener('click', () => UI.tabs.switchTo('logs'));
        }
    },

    // Modal window handling
    modals: {
        /**
         * Open request parameters modal window
         * @param {Object} request - Request to send
         */
        openSendModal(request) {
            const sendModal = document.getElementById('send-modal');
            const dynamicForm = document.getElementById('dynamic-form');
            
            // Clear previous form content
            dynamicForm.innerHTML = '';
            
            // Get dynamic parameters from request
            const fieldNames = Request.collectDynamicFields(request);
            
            if (fieldNames.length === 0) {
                // If no parameters found, close modal and send directly
                this.closeSendModal();
                Request.executeSendRequest(request);
                return;
            }
            
            // Create form fields for each parameter
            fieldNames.forEach(fieldName => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                const label = document.createElement('label');
                label.setAttribute('for', `param-${fieldName}`);
                label.textContent = fieldName;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `param-${fieldName}`;
                input.name = fieldName;
                input.placeholder = i18n.getMessage('enterValue');
                
                formGroup.appendChild(label);
                formGroup.appendChild(input);
                dynamicForm.appendChild(formGroup);
            });
            
            // Store the current request object for later use
            window.currentSendingRequest = request;
            
            // Show modal
            sendModal.style.display = 'flex';
            
            // Focus on first input field
            const firstInput = dynamicForm.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        },
        
        /**
         * Close send modal window
         */
        closeSendModal() {
            document.getElementById('send-modal').style.display = 'none';
            window.currentSendingRequest = null;
        },
        
        /**
         * Open delete confirmation modal
         * @param {string} id - Request ID to delete
         */
        openDeleteModal(id) {
            const deleteModal = document.getElementById('delete-modal');
            deleteModal.style.display = 'flex';
            
            // Set up delete button to actually delete when clicked
            document.getElementById('confirm-delete-btn').setAttribute('data-id', id);
        },
        
        /**
         * Close delete confirmation modal
         */
        closeDeleteModal() {
            document.getElementById('delete-modal').style.display = 'none';
        },
        
        /**
         * Open clear logs confirmation modal
         */
        openClearLogsModal() {
            document.getElementById('clear-logs-modal').style.display = 'flex';
        },
        
        /**
         * Close clear logs confirmation modal
         */
        closeClearLogsModal() {
            document.getElementById('clear-logs-modal').style.display = 'none';
        },
        
        /**
         * Initialize all modal event listeners
         */
        initModalListeners() {
            // Send modal listeners
            document.getElementById('close-modal').addEventListener('click', () => this.closeSendModal());
            document.getElementById('cancel-send').addEventListener('click', () => this.closeSendModal());
            document.getElementById('send-with-values').addEventListener('click', () => Request.sendWithDynamicValues());
            
            // Delete modal listeners
            document.getElementById('close-delete-modal').addEventListener('click', () => this.closeDeleteModal());
            document.getElementById('cancel-delete-btn').addEventListener('click', () => this.closeDeleteModal());
            document.getElementById('confirm-delete-btn').addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (id) {
                    Request.deleteRequest(id);
                }
                UI.modals.closeDeleteModal();
            });
            
            // Clear logs modal listeners
            document.getElementById('close-clear-logs-modal').addEventListener('click', () => this.closeClearLogsModal());
            document.getElementById('cancel-clear-logs-btn').addEventListener('click', () => this.closeClearLogsModal());
            document.getElementById('confirm-clear-logs-btn').addEventListener('click', () => {
                LogsManager.clearLogs();
                this.closeClearLogsModal();
            });
        }
    },

    /**
     * Show notification toast
     * @param {string} message - Message or i18n key
     * @param {string} type - Notification type (success or error)
     * @returns {HTMLElement} The notification element
     */
    showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // Get i18n message if available
        let displayMessage = message;
        try {
            if (typeof i18n !== 'undefined' && i18n.getMessage) {
                const msgText = i18n.getMessage(message);
                if (msgText) {
                    displayMessage = msgText;
                }
            }
        } catch (e) {
            console.error('Error getting i18n message:', e);
        }

        notification.textContent = displayMessage;

        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });

        notification.appendChild(closeBtn);
        document.body.appendChild(notification);

        // Auto hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);

        return notification;
    },

    /**
     * Show clickable notification with action button
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {string} actionText - Action button text
     * @param {Function} actionCallback - Action button callback
     */
    showClickableNotification(message, type, actionText, actionCallback) {
        // Try to get i18n messages if available
        let displayMessage = message;
        let displayActionText = actionText;
        try {
            if (typeof i18n !== 'undefined' && i18n.getMessage) {
                const msgText = i18n.getMessage(message);
                if (msgText && msgText !== message) {
                    displayMessage = msgText;
                }
                const actionMsgText = i18n.getMessage(actionText);
                if (actionMsgText && actionMsgText !== actionText) {
                    displayActionText = actionMsgText;
                }
            }
        } catch (e) {
            console.error('Error getting i18n message:', e);
        }

        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = displayMessage;
        
        // Add action button if provided
        if (displayActionText && actionCallback) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'notification-action';
            actionBtn.textContent = displayActionText;
            actionBtn.addEventListener('click', () => {
                actionCallback();
                notification.remove();
            });
            
            // Insert before the close button
            notification.appendChild(actionBtn);
        }
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        notification.appendChild(closeBtn);
        document.body.appendChild(notification);
        
        // Add animation class after a small delay
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after timeout
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    },
    
    /**
     * Initialize all UI components and listeners
     */
    init() {
        this.tabs.initTabListeners();
        this.modals.initModalListeners();
    }
};

// Export module
window.UI = UI;

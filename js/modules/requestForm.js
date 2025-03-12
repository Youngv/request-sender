/**
 * RequestForm Module
 * Handles request form operations and validation
 */

const RequestForm = {
    /**
     * Update header help text based on content type
     */
    updateHeaderHelp(contentType) {
        const autoHeaderInfo = document.getElementById('auto-header-info');
        if (!autoHeaderInfo) return;
        
        // 根据 content type 更新提示文本
        if (contentType) {
            autoHeaderInfo.innerHTML = `<span class="highlight">Auto header:</span> <code>Content-Type: ${contentType}</code>`;
            autoHeaderInfo.style.display = 'block';
        } else {
            autoHeaderInfo.style.display = 'none';
        }
    },
    
    /**
     * Toggle request body visibility based on HTTP method
     */
    toggleBodyVisibility() {
        const methodSelect = document.getElementById('request-method');
        const bodyField = document.getElementById('request-body');
        const bodyFormGroup = bodyField ? bodyField.parentNode : null;
        const contentTypeSelect = document.getElementById('request-content-type');
        
        if (!methodSelect || !bodyFormGroup) {
            console.error('Required elements not found for toggleBodyVisibility');
            return;
        }
        
        console.log(`Toggle body visibility for method: ${methodSelect.value}`);
        
        // GET and HEAD methods typically don't have request bodies
        const isGetOrHead = ['GET', 'HEAD'].includes(methodSelect.value);
        
        // Show or hide body input based on method
        bodyFormGroup.style.display = isGetOrHead ? 'none' : 'block';
        
        // Set content type to text/plain for GET/HEAD methods
        if (contentTypeSelect && isGetOrHead) {
            contentTypeSelect.value = 'text/plain';
            this.updateHeaderHelp(contentTypeSelect.value);
        }
    },
    
    /**
     * Reset form to initial state
     */
    resetForm() {
        const requestForm = document.getElementById('request-form');
        const formTitle = document.getElementById('form-title');
        
        // Reset form values
        requestForm.reset();
        
        // Reset form title
        formTitle.textContent = i18n.getMessage('createRequest');
        
        // Clear edit ID
        window.currentEditId = null;
        
        // Reset body visibility based on method
        this.toggleBodyVisibility();
    },
    
    /**
     * Initialize form event listeners
     */
    init() {
        const methodSelect = document.getElementById('request-method');
        const contentTypeSelect = document.getElementById('request-content-type');
        
        // Method change listener
        methodSelect.addEventListener('change', () => this.toggleBodyVisibility());
        
        // Content type change listener
        if (contentTypeSelect) {
            contentTypeSelect.addEventListener('change', () => {
                this.updateHeaderHelp(contentTypeSelect.value);
            });
            
            // Initial header help update
            this.updateHeaderHelp(contentTypeSelect.value);
        }
        
        // Initial toggle on page load
        setTimeout(() => this.toggleBodyVisibility(), 100);
    }
};

// Export module
window.RequestForm = RequestForm;

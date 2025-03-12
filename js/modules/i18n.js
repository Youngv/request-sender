/**
 * Improved Internationalization Module
 * Provides a unified API for i18n operations combining Chrome i18n API and custom implementation
 */

const I18nManager = {
    // Cache for loaded language files
    languageCache: {},
    
    // Current active language
    currentLang: null,
    
    /**
     * Initialize I18n system
     * @returns {Promise<void>}
     */
    async init() {
        console.log('Initializing I18n system...');
        
        try {
            // 尝试获取浏览器的 UI 语言
            let browserLang = chrome.i18n.getUILanguage();
            console.log('Browser UI language:', browserLang);
            
            // 标准化语言代码
            browserLang = this.normalizeLanguageCode(browserLang);
            console.log(`Normalized language: ${browserLang}`);
            
            // 设置当前语言
            this.currentLang = browserLang;
            
            // 加载语言文件
            await this.loadLanguageFile(browserLang);
            
            // 更新 HTML 语言属性
            document.documentElement.lang = browserLang === 'zh_CN' ? 'zh' : browserLang;
            
            // 应用翻译到 DOM
            this.updateElements();
            
            console.log('I18n system initialized successfully');
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing I18n system:', error);
            
            // 如果出错，尝试使用默认语言
            try {
                console.log('Falling back to default language (en)');
                this.currentLang = 'en';
                await this.loadLanguageFile('en');
                document.documentElement.lang = 'en';
                this.updateElements();
            } catch (fallbackError) {
                console.error('Error loading fallback language:', fallbackError);
            }
            
            return Promise.reject(error);
        }
    },
    
    /**
     * Get message from current language
     * @param {string} messageId - Message key
     * @param {Array|string} [substitutions] - Optional replacement values
     * @returns {string} - Localized message
     */
    getMessage(messageId, substitutions) {
        // First try from Chrome i18n API
        let chromeMessage = chrome.i18n.getMessage(messageId, substitutions);
        
        if (chromeMessage) {
            return chromeMessage;
        }
        
        // If not found, try from cache
        const currentLang = this.getCurrentLanguage();
        
        if (this.languageCache[currentLang] && this.languageCache[currentLang][messageId]) {
            return this.formatMessage(
                this.languageCache[currentLang][messageId].message,
                substitutions
            );
        }
        
        // Third fallback - try English cache
        if (currentLang !== 'en' && this.languageCache['en'] && this.languageCache['en'][messageId]) {
            return this.formatMessage(
                this.languageCache['en'][messageId].message,
                substitutions
            );
        }
        
        // Last resort - hardcoded basic buttons
        const hardcodedMessages = {
            "send": "Send",
            "edit": "Edit", 
            "delete": "Delete",
            "url": "URL",
            "dynamicFields": "Dynamic Fields",
            "editRequest": "Edit Request"
        };
        
        if (hardcodedMessages[messageId]) {
            return hardcodedMessages[messageId];
        }
        
        // Return message ID as ultimate fallback
        return messageId;
    },
    
    /**
     * Format message with substitutions
     * @param {string} message - Message template
     * @param {Array|string} [substitutions] - Replacement values
     * @returns {string} - Formatted message
     */
    formatMessage(message, substitutions) {
        if (!substitutions) return message;

        let formattedMessage = message;

        if (Array.isArray(substitutions)) {
            substitutions.forEach((value, index) => {
                formattedMessage = formattedMessage.replace(
                    new RegExp('\\{' + index + '\\}', 'g'), 
                    value
                );
            });
        } else if (typeof substitutions === 'string') {
            formattedMessage = formattedMessage.replace(/\{0\}/g, substitutions);
        }

        return formattedMessage;
    },
    
    /**
     * Get current language
     * @returns {string} - Current language code
     */
    getCurrentLanguage() {
        // First try from localStorage for synchronous access
        let lang;
        
        try {
            lang = localStorage.getItem('currentLanguage');
        } catch (error) {
            console.warn('Error accessing localStorage:', error);
        }
        
        if (lang) {
            return this.normalizeLanguageCode(lang);
        }
        
        // Then try from class property
        if (this.currentLang) {
            return this.normalizeLanguageCode(this.currentLang);
        }
        
        // Fallback to Chrome i18n
        return this.normalizeLanguageCode(chrome.i18n.getUILanguage() || 'en');
    },
    
    /**
     * Normalize language code
     * @param {string} lang - Language code
     * @returns {string} - Normalized language code
     */
    normalizeLanguageCode(lang) {
        if (lang === 'zh') return 'zh_CN';
        if (lang.startsWith('zh-')) return 'zh_CN';
        if (lang.startsWith('en-')) return 'en';
        return lang;
    },
    
    /**
     * Load language file
     * @param {string} lang - Language code
     * @returns {Promise<Object>} - Language messages
     */
    async loadLanguageFile(lang) {
        lang = this.normalizeLanguageCode(lang);
        
        try {
            // If already in cache, return from cache
            if (this.languageCache[lang]) {
                console.log(`Using cached language file for ${lang}`);
                return this.languageCache[lang];
            }
            
            // Calculate language file path using Chrome's runtime API
            const filePath = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
            console.log(`Loading language file: ${filePath}`);
            
            const response = await fetch(filePath);
            if (!response.ok) {
                console.warn(`Language file not found for ${lang}, falling back to English`);
                // If requested language is not found, fallback to English
                if (lang !== 'en') {
                    return this.loadLanguageFile('en');
                }
                throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
            }
            
            const messages = await response.json();
            console.log(`Language file loaded for ${lang}, found ${Object.keys(messages).length} messages`);
            
            // Cache language
            this.languageCache[lang] = messages;
            
            return messages;
        } catch (error) {
            console.error(`Failed to load language file for ${lang}:`, error);
            
            // Always ensure we have some messages
            if (Object.keys(this.languageCache).length === 0) {
                // Hard-coded essential messages as last resort
                this.languageCache['en'] = {
                    "send": { "message": "Send" },
                    "edit": { "message": "Edit" },
                    "delete": { "message": "Delete" },
                    "url": { "message": "URL" },
                    "dynamicFields": { "message": "Dynamic Fields" }
                };
                return this.languageCache['en'];
            }
            
            return this.languageCache[Object.keys(this.languageCache)[0]] || {};
        }
    },
    
    /**
     * Update all internationalized elements on the page
     */
    updateElements() {
        // Replace text for all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const messageId = el.getAttribute('data-i18n');
            if (messageId) {
                el.textContent = this.getMessage(messageId);
            }
        });

        // Replace placeholder text for all input boxes with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const messageId = el.getAttribute('data-i18n-placeholder');
            if (messageId) {
                el.placeholder = this.getMessage(messageId);
            }
        });

        // Replace title text for all elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const messageId = el.getAttribute('data-i18n-title');
            if (messageId) {
                el.title = this.getMessage(messageId);
            }
        });

        // Update document title
        document.title = this.getMessage('appName');
    },
    
    /**
     * Update language switcher UI state
     * Note: This method is disabled as language switching has been removed
     */
    updateLanguageSwitcher() {
        // Language switcher has been removed
        console.log('Language switcher UI update skipped');
    },
    
    /**
     * Change language
     * @param {string} lang - Language code
     * @returns {Promise<void>}
     */
    async changeLanguage(lang) {
        try {
            lang = this.normalizeLanguageCode(lang);
            
            console.log(`Changing language to ${lang}`);
            
            // Save to storage
            await this.setStoragePromise({ language: lang });
            
            // Update current language
            this.currentLang = lang;
            
            // Save to localStorage for synchronous access
            localStorage.setItem('currentLanguage', lang);
            
            // Update HTML lang attribute
            document.documentElement.lang = lang === 'zh_CN' ? 'zh' : lang;
            
            // Load language file
            await this.loadLanguageFile(lang);
            
            // Update all elements
            this.updateElements();
            
            // Dispatch language changed event
            document.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: { language: lang } 
            }));
            
            console.log(`Language changed to ${lang} successfully`);
            return Promise.resolve();
        } catch (error) {
            console.error(`Error changing language to ${lang}:`, error);
            return Promise.reject(error);
        }
    },
    
    /**
     * Create element with internationalized text
     * @param {string} tag - HTML tag name
     * @param {string} messageId - Message ID
     * @param {Object} [attributes] - Element attributes
     * @returns {HTMLElement} - Created element
     */
    createI18nElement(tag, messageId, attributes = {}) {
        const element = document.createElement(tag);
        
        // Set attributes
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }
        
        // Set text content
        if (messageId) {
            element.textContent = this.getMessage(messageId);
            element.setAttribute('data-i18n', messageId);
        }
        
        return element;
    },
    
    /**
     * Get storage promise (Promise wrapper for chrome.storage.local.get)
     * @param {string|Array|Object} keys - Keys to get
     * @returns {Promise<Object>} - Storage items
     */
    getStoragePromise(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (result) => {
                resolve(result);
            });
        });
    },
    
    /**
     * Set storage promise (Promise wrapper for chrome.storage.local.set)
     * @param {Object} items - Items to set
     * @returns {Promise<void>}
     */
    setStoragePromise(items) {
        return new Promise((resolve) => {
            chrome.storage.local.set(items, () => {
                resolve();
            });
        });
    }
};

// Create global i18n object for backward compatibility
window.i18n = {
    getMessage: (messageId, substitutions) => I18nManager.getMessage(messageId, substitutions),
    formatMessage: (message, substitutions) => I18nManager.formatMessage(message, substitutions),
    getMessageFromFile: (messageId, lang) => {
        I18nManager.loadLanguageFile(lang).then(messages => {
            return messages[messageId]?.message || messageId;
        });
    },
    initializeI18n: () => I18nManager.updateElements(),
    initializeI18nWithLang: (lang) => I18nManager.changeLanguage(lang),
    updateElements: () => I18nManager.updateElements(),
    createI18nElement: (tag, messageId, attributes) => I18nManager.createI18nElement(tag, messageId, attributes)
};

// Export the new I18n Manager
window.I18nManager = I18nManager;

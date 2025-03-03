/**
 * Internationalization Utility Functions
 * 
 * Provides a simple way to get internationalization information and handle replacement values
 */

// Cache for loaded language files
const languageCache = {};

/**
 * Get internationalized message
 * @param {string} messageId - Message ID
 * @param {Array|string} [substitutions] - Replacement values, can be string or array
 * @returns {string} - Localized message
 */
function getMessage(messageId, substitutions) {
    return chrome.i18n.getMessage(messageId, substitutions);
}

/**
 * Get message directly from language file (for dynamic language switching)
 * @param {string} messageId - Message ID
 * @param {string} lang - Language code, such as 'zh_CN', 'en'
 * @returns {Promise<string>} - Localized message
 */
async function getMessageFromFile(messageId, lang) {
    try {
        // If language pack is already loaded, get from cache
        if (languageCache[lang]) {
            return languageCache[lang][messageId]?.message || messageId;
        }

        // Otherwise load language pack
        const response = await fetch(`_locales/${lang}/messages.json`);
        const messages = await response.json();

        // Cache language pack
        languageCache[lang] = messages;

        return messages[messageId]?.message || messageId;
    } catch (error) {
        console.error(`Error loading message ${messageId} from ${lang}:`, error);
        return messageId;
    }
}

/**
 * Initialize all elements with data-i18n attribute on the page
 */
function initializeI18n() {
    // Replace text for all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const messageId = el.getAttribute('data-i18n');
        if (messageId) {
            el.textContent = getMessage(messageId);
        }
    });

    // Replace placeholder text for all input boxes with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const messageId = el.getAttribute('data-i18n-placeholder');
        if (messageId) {
            el.placeholder = getMessage(messageId);
        }
    });

    // Replace title text for all elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const messageId = el.getAttribute('data-i18n-title');
        if (messageId) {
            el.title = getMessage(messageId);
        }
    });

    // Update document title
    document.title = getMessage('appName');

    // Update language switcher UI
    chrome.storage.local.get('language', (result) => {
        const currentLang = result.language || chrome.i18n.getUILanguage() || 'en';
        const languageOptions = document.querySelectorAll('.language-option');

        languageOptions.forEach(option => {
            if (option.dataset.lang === currentLang) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    });
}

/**
 * Initialize page with specific language directly (without using Chrome i18n API)
 * @param {string} lang - Language code
 */
async function initializeI18nWithLang(lang) {
    try {
        // Load specified language file
        if (!languageCache[lang]) {
            const response = await fetch(`_locales/${lang}/messages.json`);
            languageCache[lang] = await response.json();
        }

        const messages = languageCache[lang];

        // Replace text for all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const messageId = el.getAttribute('data-i18n');
            if (messageId && messages[messageId]) {
                el.textContent = messages[messageId].message;
            }
        });

        // Replace placeholder text for all input boxes with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const messageId = el.getAttribute('data-i18n-placeholder');
            if (messageId && messages[messageId]) {
                el.placeholder = messages[messageId].message;
            }
        });

        // Replace title text for all elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const messageId = el.getAttribute('data-i18n-title');
            if (messageId && messages[messageId]) {
                el.title = messages[messageId].message;
            }
        });

        // Update document title
        if (messages['appName']) {
            document.title = messages['appName'].message;
        }

    } catch (error) {
        console.error('Error initializing i18n with language file:', error);
        // Fallback to Chrome i18n API
        initializeI18n();
    }
}

/**
 * Create element with internationalized message
 * @param {string} tag - HTML tag name
 * @param {string} messageId - Message ID
 * @param {object} [attributes] - Element attributes
 * @returns {HTMLElement} - Created element
 */
function createI18nElement(tag, messageId, attributes = {}) {
    const element = document.createElement(tag);
    element.textContent = getMessage(messageId);

    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }

    return element;
}

// Initialize internationalization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // First get current language from storage
    chrome.storage.local.get('language', (result) => {
        const currentLang = result.language || chrome.i18n.getUILanguage() || 'en';

        // Try to initialize directly with language file
        initializeI18nWithLang(currentLang)
            .catch(() => {
                // Use Chrome i18n API if failed
                initializeI18n();
            });
    });
});

// Export functions for use in other JavaScript files
window.i18n = {
    getMessage,
    getMessageFromFile,
    initializeI18n,
    initializeI18nWithLang,
    createI18nElement
}; 

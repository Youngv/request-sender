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
    // Try to get from Chrome i18n API first
    const message = chrome.i18n.getMessage(messageId, substitutions);

    // If message is empty, try to load from current language file directly
    if (!message) {
        // 从storage同步获取当前语言，优先级高于HTML lang属性
        let currentLang;

        try {
            // 尝试从localStorage获取当前语言设置(同步操作)
            const storedLang = localStorage.getItem('currentLanguage');
            if (storedLang) {
                currentLang = storedLang;
            } else {
                // 如果localStorage中没有，则从HTML属性获取
                currentLang = document.documentElement.lang;
                // 标准化语言代码
                if (currentLang === 'zh') currentLang = 'zh_CN';
                if (currentLang === 'en') currentLang = 'en';
            }
        } catch (e) {
            console.error('Error getting language from localStorage:', e);
            // 回退到HTML属性
            currentLang = document.documentElement.lang;
            if (currentLang === 'zh') currentLang = 'zh_CN';
            if (currentLang === 'en') currentLang = 'en';
        }

        // Try to get message from cache
        if (languageCache[currentLang] && languageCache[currentLang][messageId]) {
            return formatMessage(languageCache[currentLang][messageId].message, substitutions);
        }
    }
    return message || messageId; // Return message ID as fallback if nothing found
}

/**
 * Format message with substitutions
 * @param {string} message - Message template
 * @param {Array|string} [substitutions] - Replacement values
 * @returns {string} - Formatted message
 */
function formatMessage(message, substitutions) {
    if (!substitutions) return message;

    let formattedMessage = message;

    if (Array.isArray(substitutions)) {
        substitutions.forEach((value, index) => {
            formattedMessage = formattedMessage.replace(new RegExp('\\{' + index + '\\}', 'g'), value);
        });
    } else if (typeof substitutions === 'string') {
        formattedMessage = formattedMessage.replace(/\{0\}/g, substitutions);
    }

    return formattedMessage;
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
        const filePath = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
        console.log(`Fetching message ${messageId} from ${filePath}`);

        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const messages = await response.json();
        console.log(`Language file loaded, found ${Object.keys(messages).length} messages`);

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
 * @returns {Promise<Object>} - Language messages object
 */
async function initializeI18nWithLang(lang) {
    try {
        console.log(`开始语言初始化 (${lang})`);

        // 确保使用完整的语言代码
        if (lang === 'zh') lang = 'zh_CN';

        const filePath = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
        console.log(`正在获取语言文件: ${filePath}`);

        // 清除其他语言缓存以避免混合问题
        if (lang === 'en' && languageCache['zh_CN']) {
            console.log('清除中文语言缓存避免混合');
            delete languageCache['zh_CN'];
        } else if (lang === 'zh_CN' && languageCache['en']) {
            console.log('清除英文语言缓存避免混合');
            delete languageCache['en'];
        }

        // Load specified language file
        if (!languageCache[lang]) {
            try {
                console.log(`语言缓存未命中，从文件加载 (${lang})`);
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
                }
                languageCache[lang] = await response.json();
                console.log(`语言文件加载成功: ${lang}，消息数量: ${Object.keys(languageCache[lang]).length}`);
            } catch (fetchError) {
                console.error(`加载语言文件失败: ${fetchError.message}`);
                // If direct fetch fails, try Chrome i18n as fallback
                throw fetchError;
            }
        } else {
            console.log(`使用缓存中的语言文件 (${lang})，消息数量: ${Object.keys(languageCache[lang]).length}`);
        }

        const messages = languageCache[lang];
        if (!messages) {
            throw new Error(`语言消息对象为空 (${lang})`);
        }

        console.log(`开始应用语言文本: ${lang}`);
        let updatedElementCount = 0;

        // Replace text for all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const messageId = el.getAttribute('data-i18n');
            if (messageId && messages[messageId]) {
                el.textContent = messages[messageId].message;
                updatedElementCount++;
            } else if (messageId) {
                console.warn(`缺少翻译: ${messageId} (${lang})`);
                // 尝试使用Chrome i18n API获取翻译
                const chromeMessage = chrome.i18n.getMessage(messageId);
                if (chromeMessage) {
                    el.textContent = chromeMessage;
                    updatedElementCount++;
                }
            }
        });

        // Replace placeholder text for all input boxes with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const messageId = el.getAttribute('data-i18n-placeholder');
            if (messageId && messages[messageId]) {
                el.placeholder = messages[messageId].message;
                updatedElementCount++;
            } else if (messageId) {
                console.warn(`缺少占位符翻译: ${messageId} (${lang})`);
                // 尝试使用Chrome i18n API获取翻译
                const chromeMessage = chrome.i18n.getMessage(messageId);
                if (chromeMessage) {
                    el.placeholder = chromeMessage;
                    updatedElementCount++;
                }
            }
        });

        // Replace title text for all elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const messageId = el.getAttribute('data-i18n-title');
            if (messageId && messages[messageId]) {
                el.title = messages[messageId].message;
                updatedElementCount++;
            } else if (messageId) {
                console.warn(`缺少标题翻译: ${messageId} (${lang})`);
                // 尝试使用Chrome i18n API获取翻译
                const chromeMessage = chrome.i18n.getMessage(messageId);
                if (chromeMessage) {
                    el.title = chromeMessage;
                    updatedElementCount++;
                }
            }
        });

        // Update document title
        if (messages['appName']) {
            document.title = messages['appName'].message;
            updatedElementCount++;
        }

        console.log(`语言初始化完成 (${lang})，已更新 ${updatedElementCount} 个元素`);

        // 保存当前语言到localStorage以便同步访问
        try {
            localStorage.setItem('currentLanguage', lang);
        } catch (e) {
            console.error('无法保存语言设置到localStorage:', e);
        }

        // 触发自定义事件，通知应用程序语言已更改
        try {
            console.log('发出语言变更事件');
            const event = new CustomEvent('languageChanged', {
                detail: { language: lang }
            });
            document.dispatchEvent(event);
        } catch (e) {
            console.error('发出语言变更事件失败:', e);
        }

        return messages;
    } catch (error) {
        console.error(`初始化语言失败 (${lang}):`, error);
        // Fallback to Chrome i18n API
        console.log('回退到Chrome i18n API');
        initializeI18n();
        throw error;
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
    // 尝试先从localStorage获取语言设置
    let storedLang;
    try {
        storedLang = localStorage.getItem('currentLanguage');
    } catch (e) {
        console.error('无法从localStorage获取语言设置:', e);
    }

    if (storedLang) {
        // 如果localStorage中有设置，直接使用
        console.log('Using language from localStorage:', storedLang);
        initializeI18nWithLang(storedLang)
            .catch(() => {
                // 如果失败，回退到chrome.storage
                fallbackToStorageLanguage();
            });
    } else {
        // 否则从chrome.storage获取
        fallbackToStorageLanguage();
    }

    function fallbackToStorageLanguage() {
        // First get current language from storage
        chrome.storage.local.get('language', (result) => {
            // Prioritize saved user language over system language
            const currentLang = result.language || chrome.i18n.getUILanguage() || 'en';
            console.log('Using language from chrome.storage:', currentLang);

            // 保存到localStorage方便同步访问
            try {
                localStorage.setItem('currentLanguage', currentLang);
            } catch (e) {
                console.error('无法保存语言设置到localStorage:', e);
            }

            // Try to initialize directly with language file
            initializeI18nWithLang(currentLang)
                .catch(() => {
                    // Use Chrome i18n API if failed
                    initializeI18n();
                });
        });
    }
});

// Export functions for use in other JavaScript files
window.i18n = {
    getMessage,
    getMessageFromFile,
    initializeI18n,
    initializeI18nWithLang,
    createI18nElement
}; 

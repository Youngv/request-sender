/**
 * Language Switcher Function
 * 
 * Responsible for managing language switching UI and saving language preferences
 */

document.addEventListener('DOMContentLoaded', () => {
    const languageOptions = document.querySelectorAll('.language-option');

    // Get current language setting from storage
    chrome.storage.local.get('language', (result) => {
        const currentLang = result.language || chrome.i18n.getUILanguage() || 'en';

        // Set current language to HTML's lang attribute
        document.documentElement.lang = currentLang.substring(0, 2); // 'zh_CN' -> 'zh', 'en' -> 'en'

        // Update language option highlight
        updateLanguageUI(currentLang);
    });

    // Add click event for each language option
    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;

            // Save language setting
            chrome.storage.local.set({ language: lang }, () => {
                // Set current language to HTML's lang attribute
                document.documentElement.lang = lang.substring(0, 2);

                // Update UI
                updateLanguageUI(lang);

                // Apply language setting (using the newly added method to load directly from file)
                i18n.initializeI18nWithLang(lang).then(() => {
                    // Show language changed notification
                    showLanguageChangeNotification(lang);
                });
            });
        });
    });

    /**
     * Update language option UI status
     * @param {string} currentLang - Current selected language
     */
    function updateLanguageUI(currentLang) {
        languageOptions.forEach(option => {
            if (option.dataset.lang === currentLang) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    /**
     * Show language changed notification
     * @param {string} lang - Newly set language
     */
    function showLanguageChangeNotification(lang) {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = 'notification success';

        // Show different messages based on language
        if (lang === 'zh_CN') {
            notification.textContent = i18n.getMessageFromFile('languageChangedChinese', lang) || '语言已更改为中文';
        } else {
            notification.textContent = i18n.getMessageFromFile('languageChangedEnglish', lang) || 'Language changed to English';
        }

        // Add to DOM
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);

        // Automatically hide notification
        setTimeout(() => {
            notification.classList.remove('visible');

            // Completely remove
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}); 

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

        // 同时保存到localStorage中方便同步访问
        try {
            localStorage.setItem('currentLanguage', currentLang);
        } catch (e) {
            console.error('无法保存语言设置到localStorage:', e);
        }

        // Set current language to HTML's lang attribute
        document.documentElement.lang = currentLang.substring(0, 2); // 'zh_CN' -> 'zh', 'en' -> 'en'

        // Update language option highlight
        updateLanguageUI(currentLang);
    });

    // Add click event for each language option
    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            const lang = option.dataset.lang;

            // 保存到localStorage方便同步访问
            try {
                localStorage.setItem('currentLanguage', lang);
            } catch (e) {
                console.error('无法保存语言设置到localStorage:', e);
            }

            // Save language setting to persist user's choice
            chrome.storage.local.set({ language: lang }, () => {
                console.log('User language preference saved:', lang);

                // Set current language to HTML's lang attribute
                document.documentElement.lang = lang.substring(0, 2);

                // Update UI
                updateLanguageUI(lang);

                // 预先准备通知消息
                let notificationMessage = '';
                if (lang === 'zh_CN') {
                    notificationMessage = '语言已更改为中文';
                } else {
                    notificationMessage = 'Language changed to English';
                }

                // Apply language setting (using the newly added method to load directly from file)
                i18n.initializeI18nWithLang(lang).then((messages) => {
                    // 使用成功加载的消息，如果有的话
                    if (lang === 'zh_CN' && messages['languageChangedChinese']) {
                        notificationMessage = messages['languageChangedChinese'].message;
                    } else if (lang === 'en' && messages['languageChangedEnglish']) {
                        notificationMessage = messages['languageChangedEnglish'].message;
                    }

                    // 显示通知
                    showLanguageChangeNotification(lang, notificationMessage);

                    // Reload webhooks to update button texts
                    if (typeof loadWebhooks === 'function') {
                        loadWebhooks();
                    }

                    // 重新应用表单UI状态
                    setTimeout(() => {
                        if (typeof toggleBodyVisibility === 'function') {
                            console.log('重新调用toggleBodyVisibility以更新表单UI');
                            toggleBodyVisibility();
                        }
                    }, 200);
                }).catch(error => {
                    console.error('Error switching language:', error);
                    // 即使出错也显示通知
                    showLanguageChangeNotification(lang, notificationMessage);

                    // 即使出错也尝试更新表单UI
                    setTimeout(() => {
                        if (typeof toggleBodyVisibility === 'function') {
                            console.log('在错误处理中重新调用toggleBodyVisibility');
                            toggleBodyVisibility();
                        }
                    }, 200);
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
     * @param {string} message - Notification message to display
     */
    function showLanguageChangeNotification(lang, message) {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;

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

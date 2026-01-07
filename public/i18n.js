/**
 * i18n - 国际化模块
 * 为 RMinte 多模态分析引擎提供多语言支持
 */

(function(global) {
  'use strict';

  // 支持的语言列表
  const SUPPORTED_LOCALES = ['zh-CN', 'en-US'];
  const DEFAULT_LOCALE = 'zh-CN';
  const STORAGE_KEY = 'vlmA_locale';

  // 语言包缓存
  const localesCache = {};

  // 当前语言
  let currentLocale = DEFAULT_LOCALE;

  /**
   * 检测用户首选语言
   */
  function detectLocale() {
    // 1. 首先检查 localStorage
    const savedLocale = localStorage.getItem(STORAGE_KEY);
    if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
      return savedLocale;
    }

    // 2. 检查浏览器语言设置
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      // 精确匹配
      if (SUPPORTED_LOCALES.includes(browserLang)) {
        return browserLang;
      }
      // 语言代码匹配（如 zh 匹配 zh-CN）
      const langCode = browserLang.split('-')[0];
      const matched = SUPPORTED_LOCALES.find(locale => locale.startsWith(langCode));
      if (matched) {
        return matched;
      }
    }

    // 3. 返回默认语言
    return DEFAULT_LOCALE;
  }

  /**
   * 加载语言包
   * @param {string} locale - 语言代码
   * @returns {Promise<object>} - 语言包对象
   */
  async function loadLocale(locale) {
    if (localesCache[locale]) {
      return localesCache[locale];
    }

    try {
      const response = await fetch(`/locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load locale: ${locale}`);
      }
      const data = await response.json();
      localesCache[locale] = data;
      return data;
    } catch (error) {
      console.error(`Error loading locale ${locale}:`, error);
      // 如果加载失败且不是默认语言，尝试加载默认语言
      if (locale !== DEFAULT_LOCALE) {
        return loadLocale(DEFAULT_LOCALE);
      }
      return {};
    }
  }

  /**
   * 根据键路径获取嵌套对象的值
   * @param {object} obj - 对象
   * @param {string} path - 键路径，如 "app.title"
   * @returns {string|undefined} - 值
   */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 翻译函数
   * @param {string} key - 翻译键，如 "app.title"
   * @param {object} params - 插值参数，如 {count: 5}
   * @returns {string} - 翻译后的文本
   */
  function t(key, params = {}) {
    const localeData = localesCache[currentLocale] || {};
    let text = getNestedValue(localeData, key);

    // 如果当前语言没有找到，尝试从默认语言获取
    if (text === undefined && currentLocale !== DEFAULT_LOCALE) {
      const defaultData = localesCache[DEFAULT_LOCALE] || {};
      text = getNestedValue(defaultData, key);
    }

    // 如果仍然没有找到，返回键名
    if (text === undefined) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }

    // 处理插值参数
    if (params && typeof text === 'string') {
      Object.keys(params).forEach(param => {
        const regex = new RegExp(`\\{${param}\\}`, 'g');
        text = text.replace(regex, params[param]);
      });
    }

    return text;
  }

  /**
   * 切换语言
   * @param {string} locale - 语言代码
   * @returns {Promise<void>}
   */
  async function setLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) {
      console.error(`Unsupported locale: ${locale}`);
      return;
    }

    // 加载语言包
    await loadLocale(locale);

    // 更新当前语言
    currentLocale = locale;

    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEY, locale);

    // 更新页面上的所有翻译
    updatePageTranslations();

    // 更新 HTML lang 属性
    document.documentElement.lang = locale.split('-')[0];

    // 触发自定义事件，通知其他组件语言已更改
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
  }

  /**
   * 获取当前语言
   * @returns {string}
   */
  function getLocale() {
    return currentLocale;
  }

  /**
   * 获取支持的语言列表
   * @returns {string[]}
   */
  function getSupportedLocales() {
    return [...SUPPORTED_LOCALES];
  }

  /**
   * 更新页面上所有带有 data-i18n 属性的元素
   */
  function updatePageTranslations() {
    // 更新文本内容
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const params = element.getAttribute('data-i18n-params');
      const parsedParams = params ? JSON.parse(params) : {};
      element.textContent = t(key, parsedParams);
    });

    // 更新 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = t(key);
    });

    // 更新 title (tooltip)
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = t(key);
    });

    // 更新 value (如按钮)
    document.querySelectorAll('[data-i18n-value]').forEach(element => {
      const key = element.getAttribute('data-i18n-value');
      element.value = t(key);
    });

    // 更新语言选择器的显示
    updateLanguageSwitcher();
  }

  /**
   * 更新语言选择器的显示
   */
  function updateLanguageSwitcher() {
    const switcher = document.getElementById('languageSwitcher');
    if (switcher) {
      switcher.value = currentLocale;
    }
  }

  /**
   * 创建语言选择器
   * @param {string} containerId - 容器元素的 ID
   */
  function createLanguageSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const select = document.createElement('select');
    select.id = 'languageSwitcher';
    select.className = 'language-switcher';
    select.style.cssText = `
      padding: 6px 12px;
      border: 2px solid #e1e4e8;
      border-radius: 6px;
      font-size: 0.85rem;
      background: white;
      cursor: pointer;
      outline: none;
      transition: all 0.2s;
    `;

    SUPPORTED_LOCALES.forEach(locale => {
      const option = document.createElement('option');
      option.value = locale;
      option.textContent = t(`language.${locale}`);
      if (locale === currentLocale) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      setLocale(e.target.value);
    });

    container.appendChild(select);
  }

  /**
   * 初始化 i18n 模块
   * @returns {Promise<void>}
   */
  async function init() {
    // 检测并设置初始语言
    currentLocale = detectLocale();

    // 预加载默认语言和当前语言
    await Promise.all([
      loadLocale(DEFAULT_LOCALE),
      currentLocale !== DEFAULT_LOCALE ? loadLocale(currentLocale) : Promise.resolve()
    ]);

    // 更新页面
    updatePageTranslations();

    // 更新 HTML lang 属性
    document.documentElement.lang = currentLocale.split('-')[0];

    console.log(`i18n initialized with locale: ${currentLocale}`);
  }

  // 导出到全局
  global.i18n = {
    init,
    t,
    setLocale,
    getLocale,
    getSupportedLocales,
    updatePageTranslations,
    createLanguageSwitcher,
    loadLocale
  };

})(window);

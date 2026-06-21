import LanguageDetector from 'i18next-browser-languagedetector';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ 只引入两个语言包
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// ✅ 自动构建 resources（关键优化点）
// 默认使用 translation 作为命名空间，避免每次使用时指定命名空间
const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,

    fallbackLng: 'zh-CN',

    // 👉 默认命名空间（固定 translation）
    defaultNS: 'translation',

    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
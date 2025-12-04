'use client'; // required because it uses client-only libraries

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../../public/locales/en/translation.json';
import frTranslations from '../../public/locales/fr/translation.json';
import deTranslations from '../../public/locales/de/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    lng: 'fr', // Set French as default language
    debug: false, // Set to false to reduce console noise
    interpolation: { escapeValue: false },
    detection: {
      // Override browser language detection to prefer French
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    resources: {
      en: { translation: enTranslations },
      fr: { translation: frTranslations },
      de: { translation: deTranslations },
    },
  });

export default i18n;

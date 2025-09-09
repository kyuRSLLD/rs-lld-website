import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Load saved language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('rs-lld-language');
    if (savedLanguage && ['en', 'zh', 'ko'].includes(savedLanguage)) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('rs-lld-language', currentLanguage);
    
    // Update document language attribute
    document.documentElement.lang = currentLanguage;
    
    // Update document title based on language
    const titles = {
      en: 'RS LLD - Restaurant Supply Solutions',
      zh: 'RS LLD - 餐厅供应解决方案',
      ko: 'RS LLD - 레스토랑 공급 솔루션'
    };
    document.title = titles[currentLanguage] || titles.en;
  }, [currentLanguage]);

  const changeLanguage = (language) => {
    if (['en', 'zh', 'ko'].includes(language)) {
      setCurrentLanguage(language);
    }
  };

  const t = (key) => {
    return getTranslation(currentLanguage, key);
  };

  const getLanguageLabel = (lang) => {
    const labels = {
      en: 'EN',
      zh: '中文',
      ko: '한국어'
    };
    return labels[lang] || lang.toUpperCase();
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    getLanguageLabel,
    availableLanguages: ['en', 'zh', 'ko']
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};


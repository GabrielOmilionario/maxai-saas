'use client';

import { createContext, useContext } from 'react';

const I18nContext = createContext({
  dict: {},
  lang: 'pt'
});

export function I18nProvider({ dict, lang, children }) {
  return (
    <I18nContext.Provider value={{ dict, lang }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

const dictionaries = {
  pt: () => import('../locales/pt.json').then((module) => module.default),
  es: () => import('../locales/es.json').then((module) => module.default),
}

export const getDictionary = async (locale) => {
  if (typeof dictionaries[locale] === 'function') {
    return dictionaries[locale]()
  }
  return dictionaries.pt()
}

import type en from './dictionaries/en.json'
import type { Locale } from './config'

export type Dictionary = typeof en

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
  ar: () => import('./dictionaries/ar.json').then((m) => m.default),
}

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]()
}

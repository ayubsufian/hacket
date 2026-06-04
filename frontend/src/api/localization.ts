import { apiRequest } from './client'

export interface TranslationDictionary {
  [key: string]: string
}

export async function getDictionary(locale: 'en' | 'am'): Promise<TranslationDictionary> {
  const response = await apiRequest<TranslationDictionary>(`/localization/dictionary/${locale}`, {
    auth: false,
  })
  return response.data
}

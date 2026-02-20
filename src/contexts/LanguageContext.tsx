/**
 * LanguageContext — Production-grade i18n for Patente Hub
 *
 * Design decisions:
 * - Zero raw-key rendering: missing keys fall back to fallback lang, then empty string
 * - Icons are NEVER translated — use <Icon name="..." /> directly
 * - RTL is set on <html> via useEffect, so ALL components inherit it
 * - Full re-render on language switch via React state (no partial updates)
 * - Browser language detection with "it" as default fallback
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import arMessages from '../locales/ar/ui.json';
import itMessages from '../locales/it/ui.json';

export type UILanguage = 'ar' | 'it';
export type ContentMode = 'ar' | 'it' | 'both';

export interface ContentBlock {
  text: string;
  lang: UILanguage;
  secondary: boolean;
}

export interface LanguageContextValue {
  uiLang: UILanguage;
  contentMode: ContentMode;
  smartLearning: boolean;
  isRTL: boolean;
  setUILanguage: (lang: UILanguage) => void;
  setContentMode: (mode: ContentMode) => void;
  setSmartLearning: (enabled: boolean) => void;
  resolveContent: (ar: string, it: string) => ContentBlock[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}

type LocaleTree = Record<string, unknown>;

const LOCALES: Record<UILanguage, LocaleTree> = {
  ar: arMessages as LocaleTree,
  it: itMessages as LocaleTree,
};

// Fallback order: requested lang → opposite lang → empty string
// Never returns a raw key — icons must be passed to <Icon name="..." /> directly
function deepGet(obj: LocaleTree, key: string): string | undefined {
  const parts = key.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as LocaleTree)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function safeGet(key: string, lang: UILanguage): string {
  // Try requested language
  const primary = deepGet(LOCALES[lang], key);
  if (primary !== undefined) return primary;

  // Fallback to opposite language
  const fallbackLang: UILanguage = lang === 'ar' ? 'it' : 'ar';
  const fallback = deepGet(LOCALES[fallbackLang], key);
  if (fallback !== undefined) return fallback;

  // Last resort: return empty string, log in dev
  if (import.meta.env.DEV) {
    console.warn(`[i18n] Missing key: "${key}" in both ar and it`);
  }
  return '';
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars || str === '') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

// Browser language detection
function detectBrowserLanguage(): UILanguage {
  const lang = navigator.language?.split('-')[0]?.toLowerCase();
  if (lang === 'ar') return 'ar';
  // Default to Italian for any non-Arabic browser
  return 'it';
}

const STORAGE_UI = 'ph_ui_lang';
const STORAGE_CONTENT = 'ph_content_mode';
const STORAGE_SMART = 'ph_smart_learning';

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  userSettings?: {
    uiLanguage?: UILanguage | null;
    contentMode?: ContentMode | null;
    smartLearning?: boolean | null;
  } | null;
  onSettingsChange?: (settings: {
    uiLanguage: UILanguage;
    contentMode: ContentMode;
    smartLearning: boolean;
  }) => void;
}

export function LanguageProvider({
  children,
  userSettings,
  onSettingsChange,
}: LanguageProviderProps) {
  const [uiLang, setUILangState] = useState<UILanguage>(() => {
    // Priority: user DB setting → localStorage → browser detection → 'it'
    if (userSettings?.uiLanguage) return userSettings.uiLanguage;
    const stored = localStorage.getItem(STORAGE_UI) as UILanguage | null;
    if (stored === 'ar' || stored === 'it') return stored;
    return detectBrowserLanguage();
  });

  const [contentMode, setContentModeState] = useState<ContentMode>(() => {
    if (userSettings?.contentMode) return userSettings.contentMode;
    const stored = localStorage.getItem(STORAGE_CONTENT) as ContentMode | null;
    if (stored === 'ar' || stored === 'it' || stored === 'both') return stored;
    return 'both';
  });

  const [smartLearning, setSmartLearningState] = useState<boolean>(() => {
    if (userSettings?.smartLearning != null) return userSettings.smartLearning;
    return localStorage.getItem(STORAGE_SMART) === 'true';
  });

  // Sync when user logs in with stored settings
  useEffect(() => {
    if (!userSettings) return;
    if (userSettings.uiLanguage) setUILangState(userSettings.uiLanguage);
    if (userSettings.contentMode) setContentModeState(userSettings.contentMode);
    if (userSettings.smartLearning != null) setSmartLearningState(userSettings.smartLearning);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings?.uiLanguage, userSettings?.contentMode, userSettings?.smartLearning]);

  // Apply dir + lang to <html> on every language change — this is the RTL switch
  useEffect(() => {
    const html = document.documentElement;
    if (uiLang === 'ar') {
      html.setAttribute('lang', 'ar');
      html.setAttribute('dir', 'rtl');
    } else {
      html.setAttribute('lang', 'it');
      html.setAttribute('dir', 'ltr');
    }
  }, [uiLang]);

  const setUILanguage = useCallback((lang: UILanguage) => {
    setUILangState(lang);
    localStorage.setItem(STORAGE_UI, lang);
    onSettingsChange?.({ uiLanguage: lang, contentMode, smartLearning });
  }, [contentMode, smartLearning, onSettingsChange]);

  const setContentMode = useCallback((mode: ContentMode) => {
    setContentModeState(mode);
    localStorage.setItem(STORAGE_CONTENT, mode);
    onSettingsChange?.({ uiLanguage: uiLang, contentMode: mode, smartLearning });
  }, [uiLang, smartLearning, onSettingsChange]);

  const setSmartLearning = useCallback((enabled: boolean) => {
    setSmartLearningState(enabled);
    localStorage.setItem(STORAGE_SMART, String(enabled));
    onSettingsChange?.({ uiLanguage: uiLang, contentMode, smartLearning: enabled });
  }, [uiLang, contentMode, onSettingsChange]);

  /**
   * Resolve bilingual content according to UI lang and content mode.
   *
   * Matrix:
   * UI=ar, mode=both  → [ar(primary), it(secondary)]
   * UI=ar, mode=ar    → [ar(primary)]
   * UI=ar, mode=it    → [it(primary)]
   * UI=it, mode=both  → [it(primary), ar(secondary)]
   * UI=it, mode=it    → [it(primary)]
   * UI=it, mode=ar    → [ar(primary)]
   */
  const resolveContent = useCallback(
    (ar: string, it: string): ContentBlock[] => {
      if (contentMode === 'ar') return [{ text: ar, lang: 'ar', secondary: false }];
      if (contentMode === 'it') return [{ text: it, lang: 'it', secondary: false }];
      if (uiLang === 'ar') {
        return [
          { text: ar, lang: 'ar', secondary: false },
          { text: it, lang: 'it', secondary: true },
        ];
      }
      return [
        { text: it, lang: 'it', secondary: false },
        { text: ar, lang: 'ar', secondary: true },
      ];
    },
    [uiLang, contentMode]
  );

  /**
   * t() — translate a dot-separated key with optional interpolation vars.
   * NEVER returns a raw key string. Returns '' for genuinely missing keys.
   * 
   * Usage:
   *   t('nav.home')               → "الرئيسية" or "Home"
   *   t('quiz.question_count', { current: 3, total: 10 }) → "سؤال 3 من 10"
   *
   * DO NOT pass icon names to t(). Use <Icon name="chevron_left" /> directly.
   */
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      return interpolate(safeGet(key, uiLang), vars);
    },
    [uiLang]
  );

  return (
    <LanguageContext.Provider
      value={{
        uiLang,
        contentMode,
        smartLearning,
        isRTL: uiLang === 'ar',
        setUILanguage,
        setContentMode,
        setSmartLearning,
        resolveContent,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

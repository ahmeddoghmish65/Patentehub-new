import { cn } from '@/utils/cn';
import { Icon } from '@/components/ui/Icon';
import { useLanguage, type UILanguage, type ContentMode } from '@/contexts/LanguageContext';

function OptionBtn({ active, onClick, children, className }: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 text-center',
        active
          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-100'
          : 'border-surface-200 bg-white text-surface-600 hover:border-surface-300',
        className
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div className="flex-1">
        <p className="text-sm font-medium text-surface-800">{label}</p>
        {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0',
          enabled ? 'bg-primary-500' : 'bg-surface-300'
        )}
      >
        <span className={cn(
          'absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300',
          enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
        )} />
      </button>
    </label>
  );
}

function ContentPreview({ contentMode, uiLang }: { contentMode: ContentMode; uiLang: UILanguage }) {
  const arSample = 'إشارة وقوف';
  const itSample = 'Segnale di stop';
  const blocks: { text: string; lang: UILanguage; secondary: boolean }[] = [];
  if (contentMode === 'ar') {
    blocks.push({ text: arSample, lang: 'ar', secondary: false });
  } else if (contentMode === 'it') {
    blocks.push({ text: itSample, lang: 'it', secondary: false });
  } else {
    if (uiLang === 'it') {
      blocks.push({ text: itSample, lang: 'it', secondary: false });
      blocks.push({ text: arSample, lang: 'ar', secondary: true });
    } else {
      blocks.push({ text: arSample, lang: 'ar', secondary: false });
      blocks.push({ text: itSample, lang: 'it', secondary: true });
    }
  }
  return (
    <div className="mt-3 p-3 bg-surface-50 rounded-xl border border-dashed border-surface-200">
      <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider mb-2">Preview</p>
      <div className="space-y-0.5">
        {blocks.map(b => (
          <p key={b.lang} dir={b.lang === 'ar' ? 'rtl' : 'ltr'} lang={b.lang}
            className={cn(b.secondary ? 'text-xs text-surface-400' : 'text-sm font-medium text-surface-800')}>
            {b.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export function LanguageSettings() {
  const { uiLang, contentMode, smartLearning, setUILanguage, setContentMode, setSmartLearning, t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* UI Language */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <Icon name="translate" size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900">{t('language.title')}</h3>
            <p className="text-xs text-surface-500">{t('language.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <OptionBtn active={uiLang === 'ar'} onClick={() => setUILanguage('ar')}>
            🇸🇦 {t('language.ar')}
          </OptionBtn>
          <OptionBtn active={uiLang === 'it'} onClick={() => setUILanguage('it')}>
            🇮🇹 {t('language.it')}
          </OptionBtn>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-surface-400">Direction:</span>
          <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full',
            uiLang === 'ar' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>
            {uiLang === 'ar' ? t('language.current_rtl') : t('language.current_ltr')}
          </span>
        </div>
      </div>

      {/* Content Language */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Icon name="menu_book" size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900">{t('content_language.title')}</h3>
            <p className="text-xs text-surface-500">{t('content_language.subtitle')}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <OptionBtn active={contentMode === 'ar'} onClick={() => setContentMode('ar')}>
            <span className="block text-base mb-0.5">🇸🇦</span>
            <span className="text-xs">{t('content_language.ar_only')}</span>
          </OptionBtn>
          <OptionBtn active={contentMode === 'it'} onClick={() => setContentMode('it')}>
            <span className="block text-base mb-0.5">🇮🇹</span>
            <span className="text-xs">{t('content_language.it_only')}</span>
          </OptionBtn>
          <OptionBtn active={contentMode === 'both'} onClick={() => setContentMode('both')}>
            <span className="block text-base mb-0.5">🌐</span>
            <span className="text-xs">{t('content_language.both')}</span>
          </OptionBtn>
        </div>
        <ContentPreview contentMode={contentMode} uiLang={uiLang} />
      </div>

      {/* Smart Learning */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Icon name="psychology" size={18} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-surface-900">{t('smart_learning.title')}</h3>
        </div>
        <Toggle
          enabled={smartLearning}
          onChange={setSmartLearning}
          label={smartLearning ? t('smart_learning.enabled') : t('smart_learning.disabled')}
          description={t('smart_learning.subtitle')}
        />
      </div>
    </div>
  );
}

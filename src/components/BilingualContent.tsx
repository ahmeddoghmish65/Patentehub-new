import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';

type AsEl = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div' | 'label';

interface BilingualContentProps {
  ar: string;
  it: string;
  as?: AsEl;
  secondaryAs?: AsEl;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  containerClassName?: string;
}

export function BilingualContent({
  ar, it,
  as: As = 'span',
  secondaryAs,
  className,
  primaryClassName,
  secondaryClassName,
  containerClassName,
}: BilingualContentProps) {
  const { resolveContent } = useLanguage();
  const blocks = resolveContent(ar, it);
  const SecAs = (secondaryAs ?? As) as AsEl;

  if (blocks.length === 1) {
    const b = blocks[0];
    return (
      <As
        className={cn(className, primaryClassName)}
        dir={b.lang === 'ar' ? 'rtl' : 'ltr'}
        lang={b.lang}
      >
        {b.text}
      </As>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0.5', containerClassName)}>
      {blocks.map(b =>
        b.secondary ? (
          <SecAs
            key={b.lang}
            className={cn('text-sm opacity-60', className, secondaryClassName)}
            dir={b.lang === 'ar' ? 'rtl' : 'ltr'}
            lang={b.lang}
          >
            {b.text}
          </SecAs>
        ) : (
          <As
            key={b.lang}
            className={cn(className, primaryClassName)}
            dir={b.lang === 'ar' ? 'rtl' : 'ltr'}
            lang={b.lang}
          >
            {b.text}
          </As>
        )
      )}
    </div>
  );
}

interface SmartQuestionProps extends BilingualContentProps {
  answered: boolean;
}

export function SmartQuestion({ answered, ...props }: SmartQuestionProps) {
  const { smartLearning, contentMode, uiLang } = useLanguage();

  if (!smartLearning || answered) {
    return <BilingualContent {...props} />;
  }

  const primaryText = contentMode === 'it' ? props.it
    : contentMode === 'ar' ? props.ar
    : uiLang === 'ar' ? props.ar : props.it;
  const primaryLang: 'ar' | 'it' = contentMode === 'it' ? 'it'
    : contentMode === 'ar' ? 'ar'
    : uiLang;
  const As = (props.as ?? 'span') as AsEl;

  return (
    <As
      className={cn(props.className, props.primaryClassName)}
      dir={primaryLang === 'ar' ? 'rtl' : 'ltr'}
      lang={primaryLang}
    >
      {primaryText}
    </As>
  );
}

interface TranslationRevealProps {
  ar: string;
  it: string;
  show: boolean;
}

export function TranslationReveal({ ar, it, show }: TranslationRevealProps) {
  const { smartLearning, uiLang, contentMode, t } = useLanguage();
  if (!smartLearning || !show || contentMode !== 'both') return null;
  const secondary = uiLang === 'ar' ? it : ar;
  const lang: 'ar' | 'it' = uiLang === 'ar' ? 'it' : 'ar';
  return (
    <div className="mt-3 pt-3 border-t border-dashed border-surface-200">
      <p className="text-xs font-medium text-surface-400 mb-1">{t('smart_learning.translation_label')}</p>
      <p dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} className="text-sm text-surface-600 italic">{secondary}</p>
    </div>
  );
}

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';
import { BilingualContent } from '@/components/BilingualContent';

export function MistakesPage() {
  const { mistakes, loadMistakes } = useAuthStore();
  const { t, isRTL } = useLanguage();
  useEffect(() => { loadMistakes(); }, [loadMistakes]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 mb-2">{t('mistakes.title')}</h1>
        <p className="text-surface-500">{t('mistakes.subtitle')}</p>
      </div>

      {mistakes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-surface-100">
          <Icon name="check_circle" size={48} className="text-success-300 mx-auto mb-4" />
          <p className="text-surface-500 text-lg mb-2">{t('mistakes.empty')}</p>
          <p className="text-sm text-surface-400">{t('mistakes.empty_sub')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map(m => (
            <div key={m.id} className="bg-white rounded-xl p-5 border border-surface-100">
              <div className={cn('flex items-start gap-3', isRTL ? 'flex-row-reverse' : '')}>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', m.count >= 3 ? 'bg-danger-50' : 'bg-warning-50')}>
                  <Icon name="error" size={22} className={m.count >= 3 ? 'text-danger-500' : 'text-warning-500'} />
                </div>
                <div className="flex-1">
                  <BilingualContent
                    ar={m.questionAr}
                    it={m.questionIt}
                    as="p"
                    primaryClassName="font-semibold text-surface-800 text-sm mb-1"
                    secondaryClassName="text-sm text-surface-400 mb-2"
                  />
                  <div className={cn('flex items-center gap-4 text-xs flex-wrap', isRTL ? 'flex-row-reverse' : '')}>
                    <span className="text-danger-500 flex items-center gap-1">
                      <Icon name="close" size={14} />
                      {t('mistakes.your_answer')} {m.userAnswer ? t('questions.true') : t('questions.false')}
                    </span>
                    <span className="text-success-500 flex items-center gap-1">
                      <Icon name="check" size={14} />
                      {t('mistakes.correct_answer')} {m.correctAnswer ? t('questions.true') : t('questions.false')}
                    </span>
                    <span className="text-surface-400 flex items-center gap-1">
                      <Icon name="repeat" size={14} />
                      {m.count} {t('mistakes.times')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

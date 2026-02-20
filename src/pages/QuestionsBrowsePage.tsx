import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/utils/cn';

interface Props {
  onNavigate: (page: string, data?: Record<string, string>) => void;
}

export function QuestionsBrowsePage({ onNavigate: _onNavigate }: Props) {
  void _onNavigate;
  const { sections, questions, loadSections, loadQuestions, user } = useAuthStore();
  const { t, isRTL } = useLanguage();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const lang = user?.settings.language || 'both';

  useEffect(() => { loadSections(); loadQuestions(); }, [loadSections, loadQuestions]);

  const sectionQuestions = selectedSection
    ? questions.filter(q => q.sectionId === selectedSection)
    : [];

  const difficultyLabel = (d: string) => {
    if (d === 'easy') return t('common.easy');
    if (d === 'medium') return t('common.medium');
    return t('common.hard');
  };

  if (selectedSection) {
    const section = sections.find(s => s.id === selectedSection);

    return (
      <div>
        <button onClick={() => setSelectedSection(null)}
          className={cn('flex items-center gap-2 text-surface-500 hover:text-primary-600 mb-5 transition-colors', isRTL ? 'flex-row-reverse' : '')}>
          <Icon name="arrow_forward" size={20} flip />
          <span className="text-sm font-medium">{t('common.back')}</span>
        </button>

        <div className="bg-white rounded-2xl p-5 border border-surface-100 mb-6">
          <div className={cn('flex items-center gap-3', isRTL ? 'flex-row-reverse' : '')}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: (section?.color || '#8b5cf6') + '15' }}>
              {section?.image ? (
                <img src={section.image} alt={section.nameAr} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Icon name={section?.icon || 'quiz'} size={26} style={{ color: section?.color || '#8b5cf6' }} filled />
              )}
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h1 className="text-xl font-bold text-surface-900">{section?.nameAr || t('common.questions')}</h1>
              <p className="text-sm text-surface-500">{sectionQuestions.length} {t('common.questions_count')}</p>
            </div>
          </div>
        </div>

        {sectionQuestions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-surface-100">
            <Icon name="quiz" size={40} className="text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500">{t('common.no_questions_section')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sectionQuestions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-xl border border-surface-100 overflow-hidden">
                <button
                  className={cn('w-full p-4 flex items-start gap-3 hover:bg-surface-50 transition-colors', isRTL ? 'flex-row-reverse text-right' : 'text-left')}
                  onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                  <span className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-xs font-bold text-surface-500 shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {(lang === 'ar' || lang === 'both') && (
                      <p className="text-sm font-medium text-surface-800 leading-relaxed">{q.questionAr}</p>
                    )}
                    {(lang === 'it' || lang === 'both') && (
                      <p className={cn('text-sm text-surface-500 leading-relaxed', lang === 'both' && 'mt-1')} dir="ltr">
                        {q.questionIt}
                      </p>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-2 shrink-0', isRTL ? 'flex-row-reverse' : '')}>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      q.isTrue ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>
                      {q.isTrue ? t('quiz.correct') : t('quiz.incorrect')}
                    </span>
                    <Icon name={expandedQ === q.id ? 'expand_less' : 'expand_more'} size={20} className="text-surface-400" />
                  </div>
                </button>

                {expandedQ === q.id && (
                  <div className={cn('px-4 pb-4 border-t border-surface-50 pt-3', isRTL ? 'mr-0 ml-11 text-right' : 'mr-0 ms-11')}>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className={cn('text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1', isRTL ? 'flex-row-reverse' : '')}>
                        <Icon name="lightbulb" size={14} filled /> {t('quiz.explanation')}
                      </p>
                      {(lang === 'ar' || lang === 'both') && (
                        <p className="text-sm text-surface-700 leading-relaxed">{q.explanationAr}</p>
                      )}
                      {(lang === 'it' || lang === 'both') && (
                        <p className={cn('text-sm text-surface-500 leading-relaxed', lang === 'both' && 'mt-1')} dir="ltr">
                          {q.explanationIt}
                        </p>
                      )}
                    </div>
                    <div className={cn('flex items-center gap-3 mt-2 text-xs text-surface-400', isRTL ? 'flex-row-reverse' : '')}>
                      <span className={cn('flex items-center gap-1', isRTL ? 'flex-row-reverse' : '')}>
                        <Icon name="signal_cellular_alt" size={12} />
                        {difficultyLabel(q.difficulty)}
                      </span>
                      <span className={cn('flex items-center gap-1', isRTL ? 'flex-row-reverse' : '')}>
                        <Icon name={q.isTrue ? 'check_circle' : 'cancel'} size={12} />
                        {t('quiz.answer')}: {q.isTrue ? `${t('quiz.correct')} (Vero)` : `${t('quiz.incorrect')} (Falso)`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={cn('mb-6', isRTL ? 'text-right' : '')}>
        <h1 className="text-2xl font-bold text-surface-900 mb-1">{t('training.browse_questions')}</h1>
        <p className="text-surface-500 text-sm">
          {t('training.browse_subtitle', { count: questions.length })}
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-surface-100">
          <Icon name="quiz" size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500">{t('common.no_sections')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(section => {
            const sectionQs = questions.filter(q => q.sectionId === section.id);
            return (
              <button
                key={section.id}
                className={cn('w-full bg-white rounded-xl p-4 border border-surface-100 hover:border-purple-200 hover:shadow-md transition-all flex items-center gap-4 group', isRTL ? 'flex-row-reverse text-right' : 'text-left')}
                onClick={() => setSelectedSection(section.id)}
              >
                <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: section.color + '12' }}>
                  {section.image ? (
                    <img src={section.image} alt={section.nameAr} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Icon name={section.icon || 'quiz'} size={32} style={{ color: section.color }} filled />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-surface-800 text-sm group-hover:text-purple-600 transition-colors">
                    {section.nameAr}
                  </h3>
                  <p className="text-xs text-surface-400 mt-0.5">{section.nameIt}</p>
                </div>
                <div className={cn('flex items-center gap-2 shrink-0', isRTL ? 'flex-row-reverse' : '')}>
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                    {sectionQs.length} {t('common.questions_count')}
                  </span>
                  <Icon name="chevron_left" size={18} className="text-surface-300 group-hover:text-purple-400" flip />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

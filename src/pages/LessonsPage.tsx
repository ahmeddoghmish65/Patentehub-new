import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';
import { BilingualContent } from '@/components/BilingualContent';

interface Props { onNavigate: (page: string, data?: Record<string, string>) => void; }

export function LessonsPage({ onNavigate }: Props) {
  const { sections, lessons, loadSections, loadLessons, user } = useAuthStore();
  const { t, isRTL } = useLanguage();
  const completed = user?.progress.completedLessons || [];
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  useEffect(() => { loadSections(); loadLessons(); }, [loadSections, loadLessons]);

  if (selectedSection) {
    const section = sections.find(s => s.id === selectedSection);
    const sectionLessons = lessons.filter(l => l.sectionId === selectedSection).sort((a, b) => a.order - b.order);
    const completedCount = sectionLessons.filter(l => completed.includes(l.id)).length;
    const pct = sectionLessons.length > 0 ? Math.round((completedCount / sectionLessons.length) * 100) : 0;

    return (
      <div>
        <button onClick={() => setSelectedSection(null)}
          className={cn('flex items-center gap-2 text-surface-500 hover:text-primary-600 mb-5 transition-colors', isRTL ? 'flex-row-reverse' : '')}>
          <Icon name={isRTL ? 'arrow_forward' : 'arrow_back'} size={20} />
          <span className="text-sm font-medium">{t('lessons.back')}</span>
        </button>

        <div className="bg-white rounded-2xl p-5 border border-surface-100 mb-6">
          <div className={cn('flex items-center gap-4 mb-4', isRTL ? 'flex-row-reverse' : '')}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: (section?.color || '#3b82f6') + '12' }}>
              {section?.image ? (
                <img src={section.image} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Icon name={section?.icon || 'school'} size={28} style={{ color: section?.color || '#3b82f6' }} filled />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <BilingualContent
                ar={section?.nameAr || ''}
                it={section?.nameIt || ''}
                as="h1"
                primaryClassName="text-xl font-bold text-surface-900"
                secondaryClassName="text-sm text-primary-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-surface-100 rounded-full h-2">
              <div className={cn('rounded-full h-2 transition-all', pct === 100 ? 'bg-success-500' : 'bg-primary-500')} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-surface-500 font-medium shrink-0">{completedCount}/{sectionLessons.length} {t('lessons.completed')}</span>
          </div>
        </div>

        {sectionLessons.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-surface-100">
            <Icon name="school" size={40} className="text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500">{t('lessons.no_lessons')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sectionLessons.map((lesson, idx) => {
              const isCompleted = completed.includes(lesson.id);
              return (
                <button key={lesson.id}
                  className={cn('w-full bg-white rounded-xl p-4 border border-surface-100 hover:border-primary-200 hover:shadow-sm transition-all flex items-center gap-3 group', isRTL ? 'flex-row-reverse text-right' : 'text-left')}
                  onClick={() => onNavigate('lesson-detail', { lessonId: lesson.id, sectionId: selectedSection })}>
                  <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden', isCompleted ? 'bg-success-50' : 'bg-surface-100')}>
                    {lesson.image ? (
                      <img src={lesson.image} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : isCompleted ? (
                      <Icon name="check" size={22} className="text-success-500" />
                    ) : (
                      <span className="text-sm font-bold text-surface-500">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <BilingualContent
                      ar={lesson.titleAr}
                      it={lesson.titleIt}
                      as="h4"
                      primaryClassName="text-sm font-semibold text-surface-800 group-hover:text-primary-600 transition-colors"
                      secondaryClassName="text-xs text-surface-400 mt-0.5 truncate"
                    />
                  </div>
                  {isCompleted && (
                    <span className="text-[10px] bg-success-50 text-success-600 px-2 py-0.5 rounded-full shrink-0 font-medium">{t('common.completed')}</span>
                  )}
                  <Icon name={isRTL ? 'chevron_left' : 'chevron_right'} size={18} className="text-surface-300 group-hover:text-primary-400 shrink-0" />
                </button>
              );
            })}
            <div className="pt-3">
              <Button fullWidth variant="outline"
                onClick={() => onNavigate('quiz', { sectionId: selectedSection })}
                icon={<Icon name="quiz" size={18} />}>
                {t('lessons.quiz_section')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 mb-1">{t('lessons.title')}</h1>
        <p className="text-surface-500 text-sm">{t('lessons.subtitle')}</p>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-surface-100">
          <Icon name="school" size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 mb-2">{t('sections.title')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map(section => {
            const sectionLessons = lessons.filter(l => l.sectionId === section.id);
            const completedCount = sectionLessons.filter(l => completed.includes(l.id)).length;
            const totalCount = sectionLessons.length;
            const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <button key={section.id}
                className={cn('w-full bg-white rounded-xl p-4 border border-surface-100 hover:border-primary-200 hover:shadow-md transition-all flex items-center gap-4 group', isRTL ? 'flex-row-reverse text-right' : 'text-left')}
                onClick={() => setSelectedSection(section.id)}>
                <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: section.color + '12' }}>
                  {section.image ? (
                    <img src={section.image} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Icon name={section.icon || 'school'} size={36} style={{ color: section.color }} filled />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('flex items-center gap-2 mb-0.5', isRTL ? 'flex-row-reverse' : '')}>
                    <BilingualContent
                      ar={section.nameAr}
                      it={section.nameIt}
                      as="h3"
                      primaryClassName="font-bold text-surface-800 text-sm group-hover:text-primary-600 transition-colors"
                      secondaryClassName="text-xs text-surface-400"
                    />
                    {pct === 100 && <Icon name="check_circle" size={16} className="text-success-500 shrink-0" filled />}
                  </div>
                  <div className={cn('flex items-center gap-3 mt-2', isRTL ? 'flex-row-reverse' : '')}>
                    <div className="flex-1 bg-surface-100 rounded-full h-1.5 max-w-[180px]">
                      <div className={cn('rounded-full h-1.5 transition-all', pct === 100 ? 'bg-success-500' : 'bg-primary-500')} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-surface-400">{completedCount}/{totalCount}</span>
                  </div>
                </div>
                <Icon name={isRTL ? 'chevron_left' : 'chevron_right'} size={20} className="text-surface-300 group-hover:text-primary-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { Question } from '@/db/database';
import { useLanguage } from '@/contexts/LanguageContext';
import { SmartQuestion, TranslationReveal } from '@/components/BilingualContent';

interface QuizPageProps {
  lessonId?: string;
  sectionId?: string;
  onNavigate: (page: string, data?: Record<string, string>) => void;
}

export function QuizPage({ lessonId, sectionId, onNavigate }: QuizPageProps) {
  const { questions, loadQuestions, saveQuizResult, sections } = useAuthStore();
  const { t, isRTL, resolveContent } = useLanguage();
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; userAnswer: boolean; correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const section = sections.find(s => s.id === sectionId);

  useEffect(() => { loadQuestions(lessonId, sectionId); }, [loadQuestions, lessonId, sectionId]);

  useEffect(() => {
    if (questions.length > 0) {
      const filtered = questions.filter(q => {
        if (lessonId) return q.lessonId === lessonId;
        if (sectionId) return q.sectionId === sectionId;
        return true;
      });
      setQuizQuestions([...filtered].sort(() => Math.random() - 0.5));
    }
  }, [questions, lessonId, sectionId]);

  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    if (phase === 'quiz') iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [phase, startTime]);

  const start = useCallback(() => {
    setPhase('quiz'); setStartTime(Date.now()); setCurrentIndex(0);
    setAnswers([]); setSelectedAnswer(null); setShowExplanation(false);
  }, []);

  const handleAnswer = (ans: boolean) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(ans);
    setShowExplanation(true);
    const q = quizQuestions[currentIndex];
    const correct = ans === q.isTrue;
    setAnswers(prev => [...prev, { questionId: q.id, userAnswer: ans, correct }]);
  };

  const next = async () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(i => i + 1); setSelectedAnswer(null); setShowExplanation(false);
    } else {
      const correctCount = answers.filter(a => a.correct).length;
      const score = Math.round((correctCount / quizQuestions.length) * 100);
      await saveQuizResult({
        topicId: sectionId || '', lessonId: lessonId || '', score,
        totalQuestions: quizQuestions.length, correctAnswers: correctCount,
        wrongAnswers: quizQuestions.length - correctCount,
        timeSpent: Math.floor((Date.now() - startTime) / 1000), answers,
      });
      setPhase('result');
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (quizQuestions.length === 0) return (
    <div className="text-center py-20">
      <Icon name="quiz" size={48} className="text-surface-300 mx-auto mb-4" />
      <p className="text-surface-500 mb-4">{isRTL ? 'لا توجد أسئلة متاحة' : 'Nessuna domanda disponibile'}</p>
      <Button onClick={() => onNavigate('lessons')}>{t('common.back')}</Button>
    </div>
  );

  if (phase === 'intro') {
    const sectionTitle = resolveContent(section?.nameAr || 'اختبار', section?.nameIt || 'Quiz');
    return (
      <div className="max-w-lg mx-auto">
        <button onClick={() => onNavigate('lessons')}
          className={cn('flex items-center gap-2 text-surface-500 hover:text-primary-600 mb-6', isRTL ? 'flex-row-reverse' : '')}>
          <Icon name={isRTL ? 'arrow_forward' : 'arrow_back'} size={20} />
          <span className="text-sm">{t('common.back')}</span>
        </button>
        <div className="bg-white rounded-2xl p-8 border border-surface-100 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: (section?.color || '#3b82f6') + '15' }}>
            <Icon name={section?.icon || 'quiz'} size={40} style={{ color: section?.color || '#3b82f6' }} filled />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2" dir={sectionTitle[0].lang === 'ar' ? 'rtl' : 'ltr'}>
            {sectionTitle[0].text}
          </h1>
          {sectionTitle[1] && (
            <p className="text-surface-500 mb-2 text-sm" dir={sectionTitle[1].lang === 'ar' ? 'rtl' : 'ltr'}>
              {sectionTitle[1].text}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 mb-8 mt-6">
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xl font-bold text-surface-900">{quizQuestions.length}</p>
              <p className="text-xs text-surface-500">{isRTL ? 'سؤال صح/خطأ' : 'Domande V/F'}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xl font-bold text-surface-900">70%</p>
              <p className="text-xs text-surface-500">{t('questions.pass_threshold')}</p>
            </div>
          </div>
          <Button size="lg" fullWidth onClick={start} icon={<Icon name="play_arrow" size={22} />}>
            {t('common.start')}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const cc = answers.filter(a => a.correct).length;
    const score = Math.round((cc / quizQuestions.length) * 100);
    const passed = score >= 70;
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-8 border border-surface-100 text-center">
          <div className={cn('w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6', passed ? 'bg-success-50' : 'bg-danger-50')}>
            <Icon name={passed ? 'celebration' : 'sentiment_dissatisfied'} size={48} className={passed ? 'text-success-500' : 'text-danger-500'} filled />
          </div>
          <h1 className="text-3xl font-bold text-surface-900 mb-2">{passed ? '🎉' : '😕'} {passed ? (isRTL ? 'ممتاز!' : 'Ottimo!') : (isRTL ? 'حاول مرة أخرى' : 'Riprova')}</h1>
          <p className="text-surface-500 mb-6">{passed ? (isRTL ? 'تم تعليم الدرس كمكتمل' : 'Lezione completata!') : (isRTL ? 'تحتاج 70% للنجاح' : 'Serve 70% per superare')}</p>
          <div className="relative w-36 h-36 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={passed ? '#22c55e' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-3xl font-bold', passed ? 'text-success-500' : 'text-danger-500')}>{score}%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-50 rounded-xl p-3">
              <p className="text-xl font-bold text-success-500">{cc}</p>
              <p className="text-xs text-surface-500">{t('questions.correct')}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-3">
              <p className="text-xl font-bold text-danger-500">{quizQuestions.length - cc}</p>
              <p className="text-xs text-surface-500">{t('questions.wrong')}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-3">
              <p className="text-xl font-bold text-primary-500">{fmt(elapsed)}</p>
              <p className="text-xs text-surface-500">{t('questions.time')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button fullWidth onClick={start} icon={<Icon name="replay" size={20} />}>{t('questions.retry')}</Button>
            <Button fullWidth variant="outline" onClick={() => onNavigate('lessons')}>{t('questions.back_lessons')}</Button>
          </div>
        </div>
      </div>
    );
  }

  const q = quizQuestions[currentIndex];
  const pct = ((currentIndex + 1) / quizQuestions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className={cn('flex items-center justify-between mb-6', isRTL ? 'flex-row-reverse' : '')}>
        <button onClick={() => onNavigate('lessons')} className="text-surface-400 hover:text-surface-600">
          <Icon name="close" size={24} />
        </button>
        <div className={cn('flex items-center gap-3', isRTL ? 'flex-row-reverse' : '')}>
          <span className="text-sm text-surface-500 flex items-center gap-1">
            <Icon name="timer" size={18} />{fmt(elapsed)}
          </span>
          <span className="text-sm font-semibold text-surface-700">{currentIndex + 1}/{quizQuestions.length}</span>
        </div>
      </div>

      <div className="w-full bg-surface-100 rounded-full h-2 mb-8">
        <div className="bg-primary-500 rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="bg-white rounded-2xl border border-surface-100 p-6 sm:p-8 mb-6">
        <span className={cn('inline-block px-2.5 py-1 rounded-lg text-xs font-semibold mb-4',
          q.difficulty === 'easy' ? 'bg-success-50 text-success-600' :
          q.difficulty === 'medium' ? 'bg-warning-50 text-warning-600' : 'bg-danger-50 text-danger-600')}>
          {t(`questions.${q.difficulty}`)}
        </span>
        {q.image && <img src={q.image} alt="" className="w-full rounded-xl mb-4 max-h-48 object-contain" />}

        {/* SmartQuestion: hides translation before answering in smart mode */}
        <SmartQuestion
          ar={q.questionAr}
          it={q.questionIt}
          as="p"
          answered={showExplanation}
          primaryClassName="text-base font-bold text-surface-900 mb-2 leading-relaxed"
          secondaryClassName="text-base text-surface-600"
          containerClassName="gap-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[true, false].map(val => {
          const isSelected = selectedAnswer === val;
          const isCorrect = val === q.isTrue;
          const show = selectedAnswer !== null;
          return (
            <button key={String(val)}
              className={cn('p-6 rounded-xl border-2 transition-all text-center font-bold text-lg',
                !show && 'hover:border-primary-300 border-surface-200 cursor-pointer',
                show && isCorrect && 'border-success-500 bg-success-50',
                show && isSelected && !isCorrect && 'border-danger-500 bg-danger-50',
                show && !isSelected && !isCorrect && 'border-surface-200 opacity-50',
              )}
              onClick={() => handleAnswer(val)}
              disabled={show}>
              <Icon name={val ? 'check_circle' : 'cancel'} size={32} className={cn('mx-auto mb-2',
                !show ? (val ? 'text-success-400' : 'text-danger-400') :
                isCorrect ? 'text-success-500' : isSelected ? 'text-danger-500' : 'text-surface-300'
              )} filled />
              <span className={cn(!show ? 'text-surface-700' : isCorrect ? 'text-success-600' : isSelected && !isCorrect ? 'text-danger-600' : 'text-surface-400')}>
                {val ? t('questions.true') : t('questions.false')}
              </span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={cn('rounded-xl p-5 mb-6 border', selectedAnswer === q.isTrue ? 'bg-success-50 border-success-200' : 'bg-blue-50 border-blue-200')}>
          <div className={cn('flex items-start gap-3', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name={selectedAnswer === q.isTrue ? 'lightbulb' : 'info'} size={22}
              className={selectedAnswer === q.isTrue ? 'text-success-500 shrink-0' : 'text-blue-500 shrink-0'} filled />
            <div className="flex-1">
              <p className="font-semibold text-sm text-surface-800 mb-2">
                {selectedAnswer === q.isTrue ? `✓ ${t('questions.correct_answer')}` : `✗ ${t('questions.wrong_answer')}`}
              </p>
              {/* Show explanation in both languages based on content mode */}
              {resolveContent(q.explanationAr, q.explanationIt).map(block => (
                <p key={block.lang}
                  className={cn('text-sm', block.secondary ? 'text-surface-500 mt-1' : 'text-surface-600')}
                  dir={block.lang === 'ar' ? 'rtl' : 'ltr'}
                  lang={block.lang}>
                  {block.text}
                </p>
              ))}
              {/* Smart Learning translation reveal */}
              <TranslationReveal ar={q.questionAr} it={q.questionIt} show={showExplanation} />
            </div>
          </div>
        </div>
      )}

      {selectedAnswer !== null && (
        <Button fullWidth size="lg" onClick={next}>
          {currentIndex < quizQuestions.length - 1 ? t('questions.next') : t('questions.finish')}
          <Icon name={isRTL ? 'arrow_forward' : 'arrow_back'} size={20} />
        </Button>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Question } from '@/db/database';

interface Props {
  onNavigate: (page: string) => void;
}

export function ExamSimulatorPage({ onNavigate }: Props) {
  const { questions, loadQuestions, saveQuizResult } = useAuthStore();
  const { t, isRTL } = useLanguage();
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean | null>>({});
  const [phase, setPhase] = useState<'intro' | 'exam' | 'review' | 'result'>('intro');
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showGrid, setShowGrid] = useState(false);

  const EXAM_QUESTIONS = 30;
  const EXAM_TIME = 30 * 60;
  const MAX_ERRORS = 3;

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  useEffect(() => {
    if (questions.length > 0 && examQuestions.length === 0) {
      const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, EXAM_QUESTIONS);
      setExamQuestions(shuffled);
    }
  }, [questions, examQuestions.length]);

  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    if (phase === 'exam') {
      iv = setInterval(() => {
        const e = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(e);
        if (e >= EXAM_TIME) { finishExam(); }
      }, 1000);
    }
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startTime]);

  const start = useCallback(() => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, EXAM_QUESTIONS);
    setExamQuestions(shuffled);
    setPhase('exam'); setStartTime(Date.now()); setCurrentIndex(0);
    setAnswers({}); setElapsed(0); setShowGrid(false);
  }, [questions]);

  const handleAnswer = (val: boolean) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: val }));
  };

  const goToQuestion = (idx: number) => { setCurrentIndex(idx); setShowGrid(false); };
  const nextQuestion = () => { if (currentIndex < examQuestions.length - 1) setCurrentIndex(i => i + 1); };
  const prevQuestion = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };

  const finishExam = async () => {
    const answeredList = examQuestions.map((q, i) => ({
      questionId: q.id,
      userAnswer: answers[i] ?? false,
      correct: answers[i] === q.isTrue,
    }));
    const correctCount = answeredList.filter(a => a.correct).length;
    const score = Math.round((correctCount / examQuestions.length) * 100);
    await saveQuizResult({
      topicId: 'exam-simulator', lessonId: '', score,
      totalQuestions: examQuestions.length, correctAnswers: correctCount,
      wrongAnswers: examQuestions.length - correctCount,
      timeSpent: Math.floor((Date.now() - startTime) / 1000), answers: answeredList,
    });
    setPhase('result');
  };

  const answeredCount = Object.keys(answers).length;
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const remaining = Math.max(0, EXAM_TIME - elapsed);

  if (examQuestions.length === 0 && questions.length === 0) return (
    <div className="text-center py-20">
      <Icon name="assignment" size={48} className="text-surface-300 mx-auto mb-4" />
      <p className="text-surface-500 mb-4">{t('exam.no_questions')}</p>
      <Button onClick={() => onNavigate('dashboard')}>{t('common.back')}</Button>
    </div>
  );

  // INTRO
  if (phase === 'intro') return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => onNavigate('dashboard')} className={cn('flex items-center gap-2 text-surface-500 hover:text-primary-600 mb-6', isRTL ? 'flex-row-reverse' : '')}>
        {/* flip the arrow for RTL */}
        <Icon name="arrow_back" size={20} flip />
        <span className="text-sm">{t('common.back')}</span>
      </button>
      <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Icon name="assignment" size={40} className="text-white" filled />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-1">{t('exam.title')}</h1>
          <p className="text-sm text-surface-500 mb-1">{t('exam.subtitle')}</p>
          <p className="text-xs text-surface-400 mb-6">{t('exam.description')}</p>

          <div className={cn('bg-surface-50 rounded-xl p-5 mb-6 space-y-3', isRTL ? 'text-right' : 'text-left')}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600">{t('exam.questions_count')}</span>
              <span className="font-bold text-surface-900">{Math.min(EXAM_QUESTIONS, questions.length)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600">{t('exam.time_available')}</span>
              <span className="font-bold text-surface-900">{t('exam.thirty_minutes')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600">{t('exam.max_errors')}</span>
              <span className="font-bold text-danger-600">{MAX_ERRORS}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600">{t('exam.question_type')}</span>
              <span className="font-bold text-surface-900">{t('exam.true_false')}</span>
            </div>
          </div>

          <div className={cn('bg-amber-50 rounded-xl p-4 mb-6 flex items-start gap-3 border border-amber-100', isRTL ? 'flex-row-reverse text-right' : 'text-left')}>
            <Icon name="info" size={20} className="text-amber-500 shrink-0 mt-0.5" filled />
            <div className="text-sm text-amber-700">
              <p className="font-semibold mb-1">{t('exam.instructions')}</p>
              <ul className="space-y-1 text-xs">
                <li>• {t('exam.instruction_1')}</li>
                <li>• {t('exam.instruction_2')}</li>
                <li>• {t('exam.instruction_3', { max: MAX_ERRORS })}</li>
                <li>• {t('exam.instruction_4')}</li>
              </ul>
            </div>
          </div>

          <Button size="lg" fullWidth onClick={start} icon={<Icon name="play_arrow" size={22} />}>
            {t('exam.start')}
          </Button>
        </div>
      </div>
    </div>
  );

  // RESULT
  if (phase === 'result') {
    const results = examQuestions.map((q, i) => ({
      question: q, answer: answers[i], correct: answers[i] === q.isTrue,
    }));
    const correctCount = results.filter(r => r.correct).length;
    const errors = results.filter(r => !r.correct).length;
    const unanswered = examQuestions.length - answeredCount;
    const passed = errors <= MAX_ERRORS;
    const score = Math.round((correctCount / examQuestions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <div className="p-8 text-center">
            <div className={cn('w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6', passed ? 'bg-success-50' : 'bg-danger-50')}>
              <Icon name={passed ? 'celebration' : 'sentiment_dissatisfied'} size={48} className={passed ? 'text-success-500' : 'text-danger-500'} filled />
            </div>
            <h1 className="text-3xl font-bold text-surface-900 mb-1">
              {passed ? t('exam.passed') : t('exam.failed')}
            </h1>
            <p className="text-lg text-surface-600 mb-1">
              {passed ? t('exam.idoneo') : t('exam.non_idoneo')}
            </p>
            <p className="text-surface-500 text-sm mb-6">
              {passed
                ? t('exam.errors_within', { count: errors })
                : t('exam.errors_exceeded', { count: errors, max: MAX_ERRORS })}
            </p>

            <div className="relative w-36 h-36 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={passed ? '#22c55e' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-3xl font-bold', passed ? 'text-success-500' : 'text-danger-500')}>{score}%</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-success-50 rounded-xl p-3 border border-success-100">
                <p className="text-xl font-bold text-success-600">{correctCount}</p>
                <p className="text-[10px] text-success-500">{t('exam.correct')}</p>
              </div>
              <div className="bg-danger-50 rounded-xl p-3 border border-danger-100">
                <p className="text-xl font-bold text-danger-600">{errors}</p>
                <p className="text-[10px] text-danger-500">{t('exam.wrong')}</p>
              </div>
              <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                <p className="text-xl font-bold text-surface-600">{unanswered}</p>
                <p className="text-[10px] text-surface-500">{t('exam.unanswered')}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xl font-bold text-blue-600">{fmt(elapsed)}</p>
                <p className="text-[10px] text-blue-500">{t('exam.time')}</p>
              </div>
            </div>

            <div className={cn('rounded-xl p-4 mb-6 flex items-center justify-center gap-3', passed ? 'bg-success-50 border border-success-100' : 'bg-danger-50 border border-danger-100')}>
              <Icon name={passed ? 'check_circle' : 'error'} size={24} className={passed ? 'text-success-500' : 'text-danger-500'} filled />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className={cn('text-sm font-bold', passed ? 'text-success-700' : 'text-danger-700')}>
                  {t('exam.error_count', { count: errors, max: MAX_ERRORS })}
                </p>
                <p className={cn('text-xs', passed ? 'text-success-500' : 'text-danger-500')}>
                  {passed
                    ? t('exam.margin_left', { count: MAX_ERRORS - errors })
                    : t('exam.exceeded_by', { count: errors - MAX_ERRORS })}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button fullWidth variant="secondary" onClick={() => setPhase('review')} icon={<Icon name="visibility" size={20} />}>
                {t('exam.review_answers')}
              </Button>
              <Button fullWidth onClick={start} icon={<Icon name="replay" size={20} />}>{t('exam.restart')}</Button>
              <Button fullWidth variant="outline" onClick={() => onNavigate('dashboard')}>{t('exam.back_home')}</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW
  if (phase === 'review') {
    const totalErrors = Object.entries(answers).filter(([i, a]) => {
      const q = examQuestions[parseInt(i)];
      return q && a !== q.isTrue;
    }).length;

    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setPhase('result')} className={cn('flex items-center gap-2 text-surface-500 hover:text-primary-600 mb-4', isRTL ? 'flex-row-reverse' : '')}>
          <Icon name="arrow_back" size={20} flip />
          <span className="text-sm">{t('exam.back_result')}</span>
        </button>

        <div className={cn('rounded-xl p-3 mb-4 flex items-center justify-between', totalErrors <= MAX_ERRORS ? 'bg-success-50 border border-success-100' : 'bg-danger-50 border border-danger-100')}>
          <span className={cn('text-sm font-bold', totalErrors <= MAX_ERRORS ? 'text-success-700' : 'text-danger-700')}>
            {totalErrors <= MAX_ERRORS ? t('exam.passed') : t('exam.failed')}
          </span>
          <span className={cn('text-sm font-bold', totalErrors <= MAX_ERRORS ? 'text-success-600' : 'text-danger-600')}>
            {t('exam.error_count', { count: totalErrors, max: MAX_ERRORS })}
          </span>
        </div>

        <h2 className="text-xl font-bold text-surface-900 mb-4">{t('exam.review_title')}</h2>
        <div className="space-y-3">
          {examQuestions.map((q, i) => {
            const userAns = answers[i];
            const correct = userAns === q.isTrue;
            const diffKey = q.difficulty === 'easy' ? 'exam.difficulty_easy' : q.difficulty === 'medium' ? 'exam.difficulty_medium' : 'exam.difficulty_hard';
            return (
              <div key={q.id} className={cn('bg-white rounded-xl p-4 border-2', correct ? 'border-success-200' : 'border-danger-200')}>
                <div className={cn('flex items-start gap-3', isRTL ? 'flex-row-reverse' : '')}>
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    correct ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
                  )}>{i + 1}</span>
                  <div className="flex-1">
                    <p className={cn('text-sm font-medium text-surface-800 mb-1', isRTL ? 'text-right' : '')}>{q.questionAr}</p>
                    <p className="text-sm text-surface-500 mb-2" dir="ltr">{q.questionIt}</p>
                    <div className={cn('flex items-center gap-4 text-xs', isRTL ? 'flex-row-reverse' : '')}>
                      <span className={cn('px-2 py-0.5 rounded-full', userAns === undefined ? 'bg-surface-100 text-surface-500' : correct ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>
                        {t('exam.your_answer')} {userAns === undefined ? t('exam.not_answered') : userAns ? t('quiz.true') : t('quiz.false')}
                      </span>
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {t('exam.correct_answer')} {q.isTrue ? t('quiz.true') : t('quiz.false')}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px]',
                        q.difficulty === 'easy' ? 'bg-success-50 text-success-600' : q.difficulty === 'medium' ? 'bg-warning-50 text-warning-600' : 'bg-danger-50 text-danger-600'
                      )}>{t(diffKey)}</span>
                    </div>
                    {q.explanationAr && (
                      <p className="text-xs text-surface-500 mt-2 bg-surface-50 rounded-lg p-2">{q.explanationAr}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // EXAM
  const q = examQuestions[currentIndex];
  if (!q) return null;
  const userAnswer = answers[currentIndex];
  const diffKey = q.difficulty === 'easy' ? 'exam.difficulty_easy' : q.difficulty === 'medium' ? 'exam.difficulty_medium' : 'exam.difficulty_hard';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-surface-100 p-3 mb-4">
        <div className={cn('flex items-center justify-between mb-2', isRTL ? 'flex-row-reverse' : '')}>
          <span className="text-sm font-bold text-surface-700">{t('exam.title')}</span>
          <button onClick={() => onNavigate('dashboard')} className="text-surface-400 hover:text-danger-500 p-1">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className={cn('flex items-center justify-between', isRTL ? 'flex-row-reverse' : '')}>
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold',
            remaining < 300 ? 'bg-danger-50 text-danger-600 animate-pulse' : remaining < 600 ? 'bg-warning-50 text-warning-600' : 'bg-surface-50 text-surface-700'
          )}>
            <Icon name="timer" size={16} />
            {fmt(remaining)}
          </div>
          <div className="text-xs font-semibold text-surface-500 bg-surface-50 px-2.5 py-1.5 rounded-lg">
            {answeredCount}/{examQuestions.length} {t('exam.answered')}
          </div>
          <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500" onClick={() => setShowGrid(!showGrid)}>
            <Icon name="grid_view" size={20} />
          </button>
        </div>
      </div>

      {showGrid && (
        <div className="bg-white rounded-xl border border-surface-100 p-4 mb-4">
          <p className="text-xs font-semibold text-surface-600 mb-3">{t('exam.question_nav')}</p>
          <div className="grid grid-cols-10 gap-1.5">
            {examQuestions.map((_, i) => {
              const isAnswered = answers[i] !== undefined;
              const isCurrent = i === currentIndex;
              return (
                <button key={i}
                  className={cn('w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center',
                    isCurrent ? 'bg-primary-500 text-white ring-2 ring-primary-300' :
                    isAnswered ? 'bg-primary-50 text-primary-600 border border-primary-200' :
                    'bg-surface-50 text-surface-500 hover:bg-surface-100'
                  )}
                  onClick={() => goToQuestion(i)}
                >{i + 1}</button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full bg-surface-100 rounded-full h-1.5 mb-4">
        <div className="bg-primary-500 rounded-full h-1.5 transition-all duration-300" style={{ width: `${((currentIndex + 1) / examQuestions.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden mb-4">
        <div className={cn('bg-surface-50 px-5 py-3 flex items-center justify-between border-b border-surface-100', isRTL ? 'flex-row-reverse' : '')}>
          <span className="text-sm font-bold text-surface-700">
            {t('exam.question_of', { current: currentIndex + 1, total: examQuestions.length })}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
            q.difficulty === 'easy' ? 'bg-success-50 text-success-600' : q.difficulty === 'medium' ? 'bg-warning-50 text-warning-600' : 'bg-danger-50 text-danger-600'
          )}>
            {t(diffKey)}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          {q.image && <img src={q.image} alt="" className="w-full rounded-xl mb-4 max-h-48 object-contain bg-surface-50" />}
          <h2 className={cn('text-base font-bold text-surface-900 mb-2 leading-relaxed', isRTL ? 'text-right' : '')}>{q.questionAr}</h2>
          <p className="text-base text-surface-600 leading-relaxed" dir="ltr">{q.questionIt}</p>
        </div>
        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <button
            className={cn('p-4 rounded-xl border-2 transition-all text-center font-semibold',
              userAnswer === true ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' :
              'border-surface-200 text-surface-700 hover:border-green-300 hover:bg-green-50/50'
            )}
            onClick={() => handleAnswer(true)}
          >
            <Icon name="check_circle" size={24} className={cn('mx-auto mb-1', userAnswer === true ? 'text-green-500' : 'text-surface-300')} filled={userAnswer === true} />
            <span className="text-sm">{t('quiz.true')}</span>
            <span className="block text-xs mt-0.5 text-surface-400">VERO</span>
          </button>
          <button
            className={cn('p-4 rounded-xl border-2 transition-all text-center font-semibold',
              userAnswer === false ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' :
              'border-surface-200 text-surface-700 hover:border-red-300 hover:bg-red-50/50'
            )}
            onClick={() => handleAnswer(false)}
          >
            <Icon name="cancel" size={24} className={cn('mx-auto mb-1', userAnswer === false ? 'text-red-500' : 'text-surface-300')} filled={userAnswer === false} />
            <span className="text-sm">{t('quiz.false')}</span>
            <span className="block text-xs mt-0.5 text-surface-400">FALSO</span>
          </button>
        </div>
      </div>

      <div className={cn('flex items-center gap-3', isRTL ? 'flex-row-reverse' : '')}>
        <button className={cn('p-3 rounded-xl border border-surface-200 transition-all',
          currentIndex > 0 ? 'hover:bg-surface-50 text-surface-700' : 'opacity-30 cursor-not-allowed'
        )} onClick={prevQuestion} disabled={currentIndex === 0}>
          {/* flip chevron direction for RTL */}
          <Icon name="chevron_left" size={22} flip />
        </button>
        <div className="flex-1 text-center">
          {answeredCount === examQuestions.length ? (
            <Button fullWidth size="lg" onClick={finishExam} className="!bg-green-600 hover:!bg-green-700">
              <Icon name="send" size={18} className="ml-2" /> {t('exam.submit')}
            </Button>
          ) : (
            <Button fullWidth variant="outline" size="lg" onClick={finishExam}>
              {t('exam.submit_with_count', { answered: answeredCount, total: examQuestions.length })}
            </Button>
          )}
        </div>
        <button className={cn('p-3 rounded-xl border border-surface-200 transition-all',
          currentIndex < examQuestions.length - 1 ? 'hover:bg-surface-50 text-surface-700' : 'opacity-30 cursor-not-allowed'
        )} onClick={nextQuestion} disabled={currentIndex >= examQuestions.length - 1}>
          <Icon name="chevron_right" size={22} flip />
        </button>
      </div>
    </div>
  );
}

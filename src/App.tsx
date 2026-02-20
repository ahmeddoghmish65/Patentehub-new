import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LanguageProvider, useLanguage, type UILanguage, type ContentMode } from '@/contexts/LanguageContext';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { Dashboard } from '@/pages/Dashboard';
import { LessonsPage } from '@/pages/LessonsPage';
import { LessonDetailPage } from '@/pages/LessonDetailPage';
import { QuizPage } from '@/pages/QuizPage';
import { SignsPage } from '@/pages/SignsPage';
import { DictionaryPage } from '@/pages/DictionaryPage';
import { TrainingPage } from '@/pages/TrainingPage';
import { CommunityPage } from '@/pages/CommunityPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AdminPage } from '@/pages/AdminPage';
import { MistakesPage } from '@/pages/MistakesPage';
import { ExamSimulatorPage } from '@/pages/ExamSimulatorPage';
import { QuestionsBrowsePage } from '@/pages/QuestionsBrowsePage';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

type Page = 'landing' | 'login' | 'register' | 'reset-password' | 'dashboard'
  | 'lessons' | 'lesson-detail' | 'quiz' | 'signs' | 'dictionary' | 'training'
  | 'community' | 'profile' | 'admin' | 'mistakes' | 'exam-simulator' | 'questions-browse';

function AppInner() {
  const { user, isLoading, checkAuth } = useAuthStore();
  const { t, isRTL } = useLanguage();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [pageData, setPageData] = useState<Record<string, string>>({});

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && user && ['landing', 'login', 'register'].includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [user, isLoading, currentPage]);

  const navigate = useCallback((page: string, data?: Record<string, string>) => {
    setCurrentPage(page as Page);
    if (data) setPageData(prev => ({ ...prev, ...data }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-200 mb-4 animate-pulse">
            <Icon name="directions_car" size={32} className="text-white" filled />
          </div>
          <h1 className="text-xl font-bold text-surface-900 mb-2">Patente Hub</h1>
          <div className="flex items-center justify-center gap-2 text-surface-400">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">{t('common.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || ['landing', 'login', 'register', 'reset-password'].includes(currentPage)) {
    if (currentPage === 'login' || currentPage === 'register' || currentPage === 'reset-password') {
      return <AuthPage mode={currentPage as 'login' | 'register' | 'reset-password'} onNavigate={navigate} />;
    }
    return <LandingPage onNavigate={navigate} />;
  }

  const isAdminUser = user.role === 'admin' || user.role === 'manager';

  const bottomNavItems = [
    { id: 'dashboard', icon: 'home', label: t('nav.home') },
    { id: 'lessons', icon: 'school', label: t('nav.lessons') },
    { id: 'training', icon: 'fitness_center', label: t('nav.training') },
    { id: 'community', icon: 'forum', label: t('nav.community') },
    { id: 'profile', icon: 'person', label: t('nav.profile') },
  ];

  const sideNavItems = [
    { id: 'dashboard', icon: 'home', label: t('nav.home') },
    { id: 'lessons', icon: 'school', label: t('nav.lessons') },
    { id: 'signs', icon: 'traffic', label: t('nav.signs') },
    { id: 'dictionary', icon: 'menu_book', label: t('nav.dictionary') },
    { id: 'training', icon: 'fitness_center', label: t('nav.training') },
    { id: 'community', icon: 'forum', label: t('nav.community') },
    { id: 'profile', icon: 'person', label: t('nav.profile') },
    ...(isAdminUser ? [{ id: 'admin', icon: 'admin_panel_settings', label: t('nav.admin') }] : []),
  ];

  const needsProfileComplete = user && !user.profileComplete && user.progress.totalQuizzes >= 1;
  const isContentPage = ['lessons','lesson-detail','quiz','signs','dictionary','training','exam-simulator','questions-browse'].includes(currentPage);

  const renderPage = () => {
    if (needsProfileComplete && isContentPage) {
      return (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="bg-white rounded-2xl p-8 border border-warning-200 shadow-lg">
            <div className="w-20 h-20 mx-auto bg-warning-50 rounded-2xl flex items-center justify-center mb-6">
              <Icon name="person_add" size={36} className="text-warning-500" filled />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-3">أكمل ملفك الشخصي</h2>
            <p className="text-surface-500 mb-6">يجب إكمال الملف الشخصي للوصول إلى المحتوى التعليمي</p>
            <button onClick={() => navigate('profile')} className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold">
              إكمال الملف الشخصي
            </button>
          </div>
        </div>
      );
    }

    const wrapPage = (component: React.ReactNode) => (
      <div className="max-w-2xl mx-auto px-4 py-6">{component}</div>
    );

    switch (currentPage) {
      case 'dashboard': return wrapPage(<Dashboard onNavigate={navigate} />);
      case 'lessons': return wrapPage(<LessonsPage onNavigate={navigate} />);
      case 'lesson-detail': return wrapPage(<LessonDetailPage onNavigate={navigate} lessonId={pageData.lessonId} />);
      case 'quiz': return wrapPage(<QuizPage onNavigate={navigate} lessonId={pageData.lessonId} sectionId={pageData.sectionId} />);
      case 'signs': return wrapPage(<SignsPage onNavigate={navigate} />);
      case 'dictionary': return wrapPage(<DictionaryPage />);
      case 'training': return wrapPage(<TrainingPage onNavigate={navigate} />);
      case 'community': return wrapPage(<CommunityPage onNavigate={navigate} />);
      case 'profile': return wrapPage(<ProfilePage onNavigate={navigate} />);
      case 'admin': return isAdminUser ? wrapPage(<AdminPage onNavigate={navigate} />) : wrapPage(<Dashboard onNavigate={navigate} />);
      case 'mistakes': return wrapPage(<MistakesPage />);
      case 'exam-simulator': return wrapPage(<ExamSimulatorPage onNavigate={navigate} />);
      case 'questions-browse': return wrapPage(<QuestionsBrowsePage onNavigate={navigate} />);
      default: return wrapPage(<Dashboard onNavigate={navigate} />);
    }
  };

  return (
    <div className={cn('min-h-screen bg-surface-50', isRTL ? 'font-arabic' : '')}>
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex fixed top-0 bottom-0 w-64 bg-white border-surface-200 flex-col py-6 px-3 z-30',
        isRTL ? 'right-0 border-l' : 'left-0 border-r'
      )}>
        <div className={cn('flex items-center gap-3 px-3 mb-8', isRTL ? 'flex-row-reverse' : '')}>
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200 shrink-0">
            <Icon name="directions_car" size={20} className="text-white" filled />
          </div>
          <span className="text-lg font-bold text-surface-900">Patente Hub</span>
        </div>
        <nav className="flex-1 space-y-1">
          {sideNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isRTL ? 'flex-row-reverse text-right' : 'text-left',
                currentPage === item.id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              )}
            >
              <Icon name={item.icon} size={20} className={currentPage === item.id ? 'text-primary-600' : 'text-surface-400'} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className={cn('min-h-screen pb-20 lg:pb-0', isRTL ? 'lg:mr-64' : 'lg:ml-64')}>
        {renderPage()}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 flex items-center justify-around py-2 px-1 z-30">
        {bottomNavItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-0',
              currentPage === item.id ? 'text-primary-600' : 'text-surface-400'
            )}
          >
            <Icon name={item.icon} size={22} filled={currentPage === item.id} />
            <span className="text-[10px] font-medium truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  const { user, updateSettings } = useAuthStore();

  const userLangSettings = user ? {
    uiLanguage: (user.settings as any)?.uiLanguage ?? null,
    contentMode: (user.settings as any)?.contentMode ?? null,
    smartLearning: (user.settings as any)?.smartLearning ?? null,
  } : null;

  const handleSettingsChange = useCallback(async (settings: {
    uiLanguage: UILanguage;
    contentMode: ContentMode;
    smartLearning: boolean;
  }) => {
    if (user) {
      await updateSettings({
        uiLanguage: settings.uiLanguage,
        contentMode: settings.contentMode,
        smartLearning: settings.smartLearning,
      } as any);
    }
  }, [user, updateSettings]);

  return (
    <LanguageProvider userSettings={userLangSettings} onSettingsChange={handleSettingsChange}>
      <AppInner />
    </LanguageProvider>
  );
}

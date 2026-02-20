import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/utils/cn';

interface AuthPageProps {
  mode: 'login' | 'register' | 'reset-password';
  onNavigate: (page: string) => void;
}

function showEmailNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { login, register, resetPassword, isLoading, error, clearError } = useAuthStore();
  const { t, isRTL } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'newpass' | 'done'>('email');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(''); clearError();
    if (!email || !password) { setLocalError(t('auth.fill_all')); return; }
    const success = await login(email, password);
    if (success) onNavigate('dashboard');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(''); clearError();
    if (!firstName.trim()) { setLocalError(t('auth.enter_first_name')); return; }
    if (!lastName.trim()) { setLocalError(t('auth.enter_last_name')); return; }
    if (!email) { setLocalError(t('auth.enter_email')); return; }
    if (!password) { setLocalError(t('auth.enter_password')); return; }
    if (password.length < 6) { setLocalError(t('auth.min_password')); return; }
    if (password !== confirmPassword) { setLocalError(t('auth.passwords_mismatch')); return; }
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const success = await register(email, password, fullName);
    if (success) {
      showEmailNotification('Patente Hub 🎉', t('auth.register_prompt'));
      onNavigate('dashboard');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(''); clearError();
    if (resetStep === 'email') {
      if (!email) { setLocalError(t('auth.enter_email')); return; }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      showEmailNotification('Patente Hub', `${t('auth.reset_email_sent')}: ${code}`);
      setResetStep('code');
    } else if (resetStep === 'code') {
      if (resetCode !== generatedCode) { setLocalError(t('auth.enter_code')); return; }
      setResetStep('newpass');
    } else if (resetStep === 'newpass') {
      if (!newPassword || newPassword.length < 6) { setLocalError(t('auth.min_password')); return; }
      if (newPassword !== confirmNewPassword) { setLocalError(t('auth.passwords_mismatch')); return; }
      const success = await resetPassword(email, newPassword);
      if (success) setResetStep('done');
    }
  };

  const displayError = localError || error;

  // RESET PASSWORD
  if (mode === 'reset-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-200 mb-4">
              <Icon name="lock_reset" size={32} className="text-white" filled />
            </div>
            <h1 className="text-2xl font-bold text-surface-900">{t('auth.reset_password')}</h1>
          </div>

          {resetStep === 'done' ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-success-50 rounded-full flex items-center justify-center">
                <Icon name="check_circle" size={36} className="text-success-500" filled />
              </div>
              <p className="text-surface-700 font-medium">{t('auth.reset_success')}</p>
              <Button fullWidth onClick={() => onNavigate('login')}>{t('auth.reset_back_login')}</Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetStep === 'email' && (
                <Input label={t('auth.email')} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" dir="ltr" />
              )}
              {resetStep === 'code' && (
                <>
                  <p className="text-sm text-surface-500 text-center">{t('auth.reset_email_sent')}</p>
                  <Input label={t('auth.enter_code')} value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="000000" dir="ltr" />
                </>
              )}
              {resetStep === 'newpass' && (
                <>
                  <Input label={t('auth.new_password')} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} dir="ltr" />
                  <Input label={t('auth.confirm_password')} type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} dir="ltr" />
                </>
              )}
              {displayError && (
                <div className="bg-danger-50 text-danger-600 rounded-xl p-3 text-sm text-center">{displayError}</div>
              )}
              <Button type="submit" fullWidth loading={isLoading}>
                {resetStep === 'email' ? t('common.send') : resetStep === 'code' ? t('common.next') : t('auth.reset_password')}
              </Button>
              <button type="button" onClick={() => onNavigate('login')} className="w-full text-center text-sm text-surface-500 hover:text-primary-600 py-2">
                {t('auth.reset_back_login')}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-200 mb-4">
            <Icon name="directions_car" size={32} className="text-white" filled />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Patente Hub</h1>
          <p className="text-surface-500 text-sm mt-1">
            {isLogin ? t('auth.login_prompt') : t('auth.register_prompt')}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-100 rounded-2xl p-1 mb-6">
          <button
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
              isLogin ? 'bg-white text-primary-600 shadow-sm' : 'text-surface-500')}
            onClick={() => onNavigate('login')}
          >{t('auth.login')}</button>
          <button
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
              !isLogin ? 'bg-white text-primary-600 shadow-sm' : 'text-surface-500')}
            onClick={() => onNavigate('register')}
          >{t('auth.register')}</button>
        </div>

        {displayError && (
          <div className="bg-danger-50 text-danger-600 rounded-xl p-3 text-sm text-center mb-4">{displayError}</div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input label={t('auth.email')} type="email" value={email} onChange={e => { setEmail(e.target.value); setLocalError(''); }}
              placeholder="you@example.com" dir="ltr" autoComplete="email" />
            <div className="relative">
              <Input label={t('auth.password')} type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setLocalError(''); }}
                dir="ltr" autoComplete="current-password" />
              <button type="button"
                className={cn('absolute bottom-3 text-surface-400 hover:text-surface-600', isRTL ? 'left-3' : 'right-3')}
                onClick={() => setShowPassword(s => !s)}>
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
              </button>
            </div>
            <div className={cn('text-end', isRTL ? 'text-start' : '')}>
              <button type="button" className="text-sm text-primary-600 hover:underline" onClick={() => onNavigate('reset-password')}>
                {t('auth.forgot')}
              </button>
            </div>
            <Button type="submit" fullWidth size="lg" loading={isLoading}>{t('auth.login')}</Button>
            <p className="text-center text-sm text-surface-500">
              {t('auth.no_account')}{' '}
              <button type="button" className="text-primary-600 font-semibold hover:underline" onClick={() => onNavigate('register')}>
                {t('auth.register')}
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('auth.first_name')} value={firstName} onChange={e => { setFirstName(e.target.value); setLocalError(''); }} />
              <Input label={t('auth.last_name')} value={lastName} onChange={e => { setLastName(e.target.value); setLocalError(''); }} />
            </div>
            <Input label={t('auth.email')} type="email" value={email} onChange={e => { setEmail(e.target.value); setLocalError(''); }}
              placeholder="you@example.com" dir="ltr" autoComplete="email" />
            <div className="relative">
              <Input label={t('auth.password')} type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setLocalError(''); }}
                dir="ltr" autoComplete="new-password" />
              <button type="button"
                className={cn('absolute bottom-3 text-surface-400 hover:text-surface-600', isRTL ? 'left-3' : 'right-3')}
                onClick={() => setShowPassword(s => !s)}>
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
              </button>
            </div>
            <Input label={t('auth.confirm_password')} type="password" value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setLocalError(''); }}
              dir="ltr" autoComplete="new-password" />
            <Button type="submit" fullWidth size="lg" loading={isLoading}>{t('auth.register')}</Button>
            <p className="text-center text-sm text-surface-500">
              {t('auth.have_account')}{' '}
              <button type="button" className="text-primary-600 font-semibold hover:underline" onClick={() => onNavigate('login')}>
                {t('auth.login')}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

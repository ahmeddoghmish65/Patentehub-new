import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';
import { verifyPassword, hashPassword, getDB } from '@/db/database';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

const ITALIAN_PROVINCES = [
  'Agrigento','Alessandria','Ancona','Aosta','Arezzo','Ascoli Piceno','Asti','Avellino','Bari','Barletta-Andria-Trani',
  'Belluno','Benevento','Bergamo','Biella','Bologna','Bolzano','Brescia','Brindisi','Cagliari','Caltanissetta',
  'Campobasso','Caserta','Catania','Catanzaro','Chieti','Como','Cosenza','Cremona','Crotone','Cuneo',
  'Enna','Fermo','Ferrara','Firenze','Foggia','Forlì-Cesena','Frosinone','Genova','Gorizia','Grosseto',
  'Imperia','Isernia','La Spezia','L\'Aquila','Latina','Lecce','Lecco','Livorno','Lodi','Lucca',
  'Macerata','Mantova','Massa-Carrara','Matera','Messina','Milano','Modena','Monza e Brianza','Napoli','Novara',
  'Nuoro','Oristano','Padova','Palermo','Parma','Pavia','Perugia','Pesaro e Urbino','Pescara','Piacenza',
  'Pisa','Pistoia','Pordenone','Potenza','Prato','Ragusa','Ravenna','Reggio Calabria','Reggio Emilia','Rieti',
  'Rimini','Roma','Rovigo','Salerno','Sassari','Savona','Siena','Siracusa','Sondrio','Sud Sardegna',
  'Taranto','Teramo','Terni','Torino','Trapani','Trento','Treviso','Trieste','Udine','Varese',
  'Venezia','Verbano-Cusio-Ossola','Vercelli','Verona','Vibo Valentia','Vicenza','Viterbo'
];

const COUNTRY_CODES = [
  { code: '+39', country: '🇮🇹 إيطاليا' }, { code: '+966', country: '🇸🇦 السعودية' },
  { code: '+20', country: '🇪🇬 مصر' }, { code: '+962', country: '🇯🇴 الأردن' },
  { code: '+961', country: '🇱🇧 لبنان' }, { code: '+964', country: '🇮🇶 العراق' },
  { code: '+963', country: '🇸🇾 سوريا' }, { code: '+970', country: '🇵🇸 فلسطين' },
  { code: '+212', country: '🇲🇦 المغرب' }, { code: '+213', country: '🇩🇿 الجزائر' },
  { code: '+216', country: '🇹🇳 تونس' }, { code: '+218', country: '🇱🇾 ليبيا' },
  { code: '+971', country: '🇦🇪 الإمارات' }, { code: '+974', country: '🇶🇦 قطر' },
  { code: '+968', country: '🇴🇲 عمان' }, { code: '+973', country: '🇧🇭 البحرين' },
  { code: '+965', country: '🇰🇼 الكويت' }, { code: '+967', country: '🇾🇪 اليمن' },
  { code: '+249', country: '🇸🇩 السودان' }, { code: '+90', country: '🇹🇷 تركيا' },
  { code: '+49', country: '🇩🇪 ألمانيا' }, { code: '+33', country: '🇫🇷 فرنسا' },
  { code: '+44', country: '🇬🇧 بريطانيا' }, { code: '+34', country: '🇪🇸 إسبانيا' },
  { code: '+1', country: '🇺🇸 أمريكا' },
];

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, logout, updateSettings, updateProfile, mistakes, loadMistakes } = useAuthStore();
  const { t, isRTL } = useLanguage();

  const [showEditPage, setShowEditPage] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', username: '', bio: '',
    email: '', phone: '', phoneCode: '+39',
    gender: '', birthDate: '', province: '', italianLevel: '',
    privacyHideStats: false,
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    birthDate: '', country: 'Italia', province: '', gender: '',
    phoneCode: '+39', phone: '', italianLevel: '',
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMistakes(); }, [loadMistakes]);

  useEffect(() => {
    if (!user) return;
    const computeCounts = async () => {
      try {
        const sf = localStorage.getItem(`following_${user.id}`);
        if (sf) { const arr = JSON.parse(sf); setFollowingCount(Array.isArray(arr) ? arr.length : 0); }
        else setFollowingCount(0);
      } catch { setFollowingCount(0); }
      let followers = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('following_') && !key.includes(user.id)) {
          try {
            const arr = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(arr) && arr.includes(user.id)) followers++;
          } catch { /* */ }
        }
      }
      setFollowersCount(followers);
    };
    computeCounts();
    window.addEventListener('focus', computeCounts);
    return () => window.removeEventListener('focus', computeCounts);
  }, [user]);

  if (!user) return null;

  const { progress } = user;
  const totalAnswers = progress.correctAnswers + progress.wrongAnswers;
  const accuracy = totalAnswers > 0 ? Math.round((progress.correctAnswers / totalAnswers) * 100) : 0;
  const isAdmin = user.role === 'admin' || user.role === 'manager';
  const storedBio = user.bio || localStorage.getItem(`bio_${user.id}`) || '';

  const handleLogout = async () => { await logout(); onNavigate('landing'); };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert(t('profile.image_too_large')); return; }
    const reader = new FileReader();
    reader.onload = () => { updateProfile({ avatar: reader.result as string }); };
    reader.readAsDataURL(file);
  };
  const handleDeleteAvatar = () => { updateProfile({ avatar: '' }); };

  const openEditPage = () => {
    const nameParts = user.name.split(' ');
    setEditForm({
      firstName: user.firstName || nameParts[0] || '',
      lastName: user.lastName || nameParts.slice(1).join(' ') || '',
      username: user.username || '',
      bio: storedBio,
      email: user.email,
      phone: user.phone || '',
      phoneCode: user.phoneCode || '+39',
      gender: user.gender || '',
      birthDate: user.birthDate || '',
      province: user.province || '',
      italianLevel: user.italianLevel || '',
      privacyHideStats: user.privacyHideStats || false,
    });
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setPasswordMsg(''); setSaveMsg('');
    setShowEditPage(true);
  };

  const handleSaveEdit = async () => {
    setSaveMsg('');
    const db = await getDB();
    const u = await db.get('users', user.id);
    if (!u) return;
    u.firstName = editForm.firstName;
    u.lastName = editForm.lastName;
    u.name = `${editForm.firstName} ${editForm.lastName}`.trim();
    u.username = editForm.username;
    u.bio = editForm.bio;
    u.phone = editForm.phone;
    u.phoneCode = editForm.phoneCode;
    u.gender = editForm.gender;
    u.birthDate = editForm.birthDate;
    u.province = editForm.province;
    u.italianLevel = editForm.italianLevel;
    u.privacyHideStats = editForm.privacyHideStats;
    if (editForm.email !== user.email) u.email = editForm.email;
    localStorage.setItem(`bio_${user.id}`, editForm.bio);
    await db.put('users', u);
    setSaveMsg(t('profile.save_success'));
    setTimeout(() => { setSaveMsg(''); setShowEditPage(false); window.location.reload(); }, 1500);
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    if (!currentPassword) { setPasswordMsg(t('auth.enter_password')); return; }
    if (!newPassword || newPassword.length < 6) { setPasswordMsg(t('auth.min_password')); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg(t('auth.passwords_mismatch')); return; }
    const db = await getDB();
    const fullUser = await db.get('users', user.id);
    if (!fullUser) { setPasswordMsg(t('common.error')); return; }
    const isValid = await verifyPassword(currentPassword, fullUser.password);
    if (!isValid) { setPasswordMsg(t('auth.enter_password')); return; }
    fullUser.password = await hashPassword(newPassword);
    await db.put('users', fullUser);
    setPasswordMsg('✓ ' + t('profile.save_success'));
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  const onEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert(t('profile.image_too_large')); return; }
    const reader = new FileReader();
    reader.onload = () => { updateProfile({ avatar: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    const { birthDate, province, gender, phoneCode, phone, italianLevel } = profileForm;
    if (!birthDate || !province || !gender || !phone || !italianLevel) {
      alert(t('profile.fill_required')); return;
    }
    const db = await getDB();
    const u = await db.get('users', user.id);
    if (u) {
      u.birthDate = birthDate; u.country = 'Italia'; u.province = province;
      u.gender = gender; u.phoneCode = phoneCode; u.phone = phone;
      u.italianLevel = italianLevel; u.profileComplete = true;
      await db.put('users', u);
    }
    setShowCompleteProfile(false);
    window.location.reload();
  };

  const allBadges = [
    { id: 'newcomer', nameKey: 'profile.badge_newcomer', icon: 'waving_hand', color: 'bg-blue-500' },
    { id: 'quiz_master', nameKey: 'profile.badge_quiz_master', icon: 'quiz', color: 'bg-purple-500' },
    { id: 'perfect_score', nameKey: 'profile.badge_perfect_score', icon: 'star', color: 'bg-yellow-500' },
    { id: 'week_streak', nameKey: 'profile.badge_week_streak', icon: 'local_fire_department', color: 'bg-orange-500' },
    { id: 'level_5', nameKey: 'profile.badge_level_5', icon: 'military_tech', color: 'bg-green-500' },
  ];

  // ==================== EDIT PAGE ====================
  if (showEditPage) {
    return (
      <div className="max-w-lg mx-auto space-y-5 pb-4">
        <div className={cn('flex items-center justify-between', isRTL ? 'flex-row-reverse' : '')}>
          <button onClick={() => setShowEditPage(false)} className={cn('flex items-center gap-2 text-surface-500 hover:text-primary-600', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name="arrow_back" size={22} flip />
            <span className="text-sm font-medium">{t('profile.back')}</span>
          </button>
          <h2 className="text-lg font-bold text-surface-900">{t('profile.edit_title')}</h2>
          <div className="w-16" />
        </div>

        <div className="text-center">
          <input type="file" ref={editFileRef} className="hidden" accept="image/*" onChange={onEditFileChange} />
          <div className="relative inline-block">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">{user.name.charAt(0)}</span>
              </div>
            )}
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary-600"
              onClick={() => editFileRef.current?.click()}>
              <Icon name="camera_alt" size={16} />
            </button>
            {user.avatar && (
              <button className="absolute -top-2 -left-2 w-7 h-7 bg-danger-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-danger-600 border-2 border-white"
                onClick={handleDeleteAvatar}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          <p className="text-xs text-surface-400 mt-3">{t('profile.change_photo')}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-surface-100">
          <h3 className={cn('text-sm font-bold text-surface-800 mb-4 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name="person" size={18} className="text-primary-500" /> {t('profile.personal_info')}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.first_name')}</label>
                <input className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.last_name')}</label>
                <input className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.username_label')}</label>
              <input className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm" dir="ltr" value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.bio_label')}</label>
              <textarea className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm resize-none" rows={2}
                value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} maxLength={150}
                placeholder={t('profile.bio_placeholder')} />
              <span className="text-[10px] text-surface-400">{editForm.bio.length}/150</span>
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.birth_date')}</label>
              <input type="date" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm" value={editForm.birthDate} onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.gender')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: 'male', labelKey: 'profile.male' }, { value: 'female', labelKey: 'profile.female' }].map(g => (
                  <button key={g.value} className={cn('py-2.5 rounded-xl border-2 text-sm font-medium', editForm.gender === g.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600')}
                    onClick={() => setEditForm(f => ({ ...f, gender: g.value }))}>{t(g.labelKey)}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-surface-100">
          <h3 className={cn('text-sm font-bold text-surface-800 mb-4 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name="contact_mail" size={18} className="text-primary-500" /> {t('profile.contact_info')}
          </h3>
          <div className="space-y-3">
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.email_label')}</label>
              <input type="email" dir="ltr" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm text-left" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.phone_label')}</label>
              <div className="flex gap-2">
                <select className="w-28 border border-surface-200 rounded-xl px-2 py-2.5 text-sm shrink-0" value={editForm.phoneCode} onChange={e => setEditForm(f => ({ ...f, phoneCode: e.target.value }))}>
                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.country.split(' ')[0]} {c.code}</option>)}
                </select>
                <input type="tel" dir="ltr" className="flex-1 border border-surface-200 rounded-xl px-3 py-2.5 text-sm text-left" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="1234567890" />
              </div>
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.province_label')}</label>
              <select className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm" value={editForm.province} onChange={e => setEditForm(f => ({ ...f, province: e.target.value }))}>
                <option value="">{t('profile.select_province')}</option>
                {ITALIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.italian_level')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'weak', labelKey: 'profile.level_weak' },
                  { value: 'good', labelKey: 'profile.level_good' },
                  { value: 'very_good', labelKey: 'profile.level_very_good' },
                  { value: 'native', labelKey: 'profile.level_native' },
                ].map(l => (
                  <button key={l.value} className={cn('py-2 rounded-xl border-2 text-xs font-medium', editForm.italianLevel === l.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600')}
                    onClick={() => setEditForm(f => ({ ...f, italianLevel: l.value }))}>{t(l.labelKey)}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-surface-100">
          <h3 className={cn('text-sm font-bold text-surface-800 mb-4 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name="lock" size={18} className="text-primary-500" /> {t('profile.privacy')}
          </h3>
          <label className={cn('flex items-center justify-between cursor-pointer', isRTL ? 'flex-row-reverse' : '')}>
            <div>
              <p className="text-sm text-surface-700">{t('profile.hide_stats')}</p>
              <p className="text-xs text-surface-400">{t('profile.hide_stats_desc')}</p>
            </div>
            <button
              className={cn('w-12 h-6 rounded-full transition-colors relative', editForm.privacyHideStats ? 'bg-primary-500' : 'bg-surface-200')}
              onClick={() => setEditForm(f => ({ ...f, privacyHideStats: !f.privacyHideStats }))}
            >
              <div className={cn('w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all', editForm.privacyHideStats ? 'left-0.5' : 'left-6')} />
            </button>
          </label>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-surface-100">
          <h3 className={cn('text-sm font-bold text-surface-800 mb-4 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name="security" size={18} className="text-primary-500" /> {t('profile.change_password')}
          </h3>
          <div className="space-y-3">
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.current_password')}</label>
              <input type="password" dir="ltr" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm text-left" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.new_password')}</label>
              <input type="password" dir="ltr" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm text-left" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('profile.password_min')} />
            </div>
            <div>
              <label className={cn('text-xs text-surface-500 mb-1 block', isRTL ? 'text-right' : '')}>{t('profile.confirm_new_password')}</label>
              <input type="password" dir="ltr" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm text-left" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-danger-500">{t('profile.password_mismatch')}</p>}
            {passwordMsg && <p className={cn('text-xs', passwordMsg.includes('✓') ? 'text-success-600' : 'text-danger-500')}>{passwordMsg}</p>}
            <Button size="sm" onClick={handleChangePassword} disabled={!currentPassword || !newPassword}>{t('profile.change_password')}</Button>
          </div>
        </div>

        {saveMsg && (
          <div className={cn('rounded-xl p-3 text-center text-sm font-medium', saveMsg.includes('✓') ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>
            {saveMsg}
          </div>
        )}
        <Button fullWidth size="lg" onClick={handleSaveEdit}>
          <Icon name="save" size={20} className="ml-2" /> {t('profile.save_all')}
        </Button>
      </div>
    );
  }

  // ==================== MAIN PROFILE PAGE ====================
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-2xl p-6 border border-surface-100">
        <div className={cn('flex items-start gap-4 mb-5', isRTL ? 'flex-row-reverse' : '')}>
          <div className="relative group">
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={onFileChange} />
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg cursor-pointer" onClick={() => fileRef.current?.click()} />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg cursor-pointer" onClick={() => fileRef.current?.click()}>
                <span className="text-2xl font-bold text-white">{user.name.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Icon name="camera_alt" size={22} className="text-white" />
            </div>
            {user.avatar && (
              <button className="absolute -top-1 -left-1 w-6 h-6 bg-danger-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-danger-600"
                onClick={handleDeleteAvatar} title={t('profile.delete_avatar')}>
                <Icon name="close" size={14} className="text-white" />
              </button>
            )}
          </div>

          <div className={cn('flex-1 min-w-0', isRTL ? 'text-right' : '')}>
            <div className={cn('flex items-center gap-2 mb-0.5', isRTL ? 'flex-row-reverse' : '')}>
              <h1 className="text-xl font-bold text-surface-900">{user.name}</h1>
              {user.verified && (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#3b82f6" />
                  <path d="M8 12.5L10.5 15L16 9.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-sm text-surface-500 mb-1">@{user.username || 'user'} · {user.email}</p>
            {storedBio && <p className="text-sm text-surface-600 mt-1">{storedBio}</p>}
            <div className={cn('flex items-center gap-2 mt-2 flex-wrap', isRTL ? 'flex-row-reverse' : '')}>
              <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium">{t('profile.level')} {progress.level}</span>
              <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">{progress.xp} XP</span>
              {!user.profileComplete && (
                <button className="text-xs bg-warning-50 text-warning-600 px-2 py-0.5 rounded-full font-medium animate-pulse" onClick={() => setShowCompleteProfile(true)}>
                  {t('profile.complete_profile_warning')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          {[
            { labelKey: 'profile.followers', value: String(followersCount), icon: 'people', color: 'text-primary-500' },
            { labelKey: 'profile.following', value: String(followingCount), icon: 'person_add', color: 'text-indigo-500' },
            { labelKey: 'profile.readiness', value: `${progress.examReadiness}%`, icon: 'verified', color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-surface-50 rounded-xl p-2.5 text-center">
              <Icon name={stat.icon} size={18} className={cn(stat.color, 'mb-0.5')} filled />
              <p className="text-base font-bold text-surface-900">{stat.value}</p>
              <p className="text-[10px] text-surface-500">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { labelKey: 'profile.quizzes', value: String(progress.totalQuizzes), icon: 'quiz', color: 'text-blue-500' },
            { labelKey: 'profile.accuracy', value: `${accuracy}%`, icon: 'check_circle', color: 'text-green-500' },
            { labelKey: 'profile.streak', value: `${progress.currentStreak}`, icon: 'local_fire_department', color: 'text-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-surface-50 rounded-xl p-2.5 text-center">
              <Icon name={stat.icon} size={18} className={cn(stat.color, 'mb-0.5')} filled />
              <p className="text-base font-bold text-surface-900">{stat.value}</p>
              <p className="text-[10px] text-surface-500">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        className={cn('w-full bg-white rounded-xl p-4 border border-surface-100 flex items-center gap-3 hover:border-primary-200 hover:shadow-md transition-all group', isRTL ? 'flex-row-reverse' : '')}
        onClick={openEditPage}
      >
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
          <Icon name="manage_accounts" size={22} className="text-primary-500" />
        </div>
        <div className={cn('flex-1', isRTL ? 'text-right' : 'text-left')}>
          <h3 className="font-bold text-surface-900">{t('profile.edit_account')}</h3>
          <p className="text-xs text-surface-400">{t('profile.edit_account_sub')}</p>
        </div>
        <Icon name="chevron_left" size={22} className="text-surface-300 group-hover:text-primary-500 transition-colors" flip />
      </button>

      {isAdmin && (
        <button className={cn('w-full bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 flex items-center gap-3 text-white shadow-lg shadow-primary-200 hover:shadow-xl transition-all', isRTL ? 'flex-row-reverse' : '')} onClick={() => onNavigate('admin')}>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Icon name="admin_panel_settings" size={24} filled /></div>
          <div className={cn('flex-1', isRTL ? 'text-right' : 'text-left')}>
            <h3 className="font-bold">{t('profile.admin_panel')}</h3>
            <p className="text-xs text-primary-200">{t('profile.admin_panel_sub')}</p>
          </div>
          <Icon name="chevron_left" size={22} flip />
        </button>
      )}

      <LanguageSettings />

      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <div className={cn('flex items-center justify-between mb-3', isRTL ? 'flex-row-reverse' : '')}>
          <h2 className={cn('font-bold text-surface-900 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name="verified" size={20} className="text-primary-500" filled /> {t('profile.exam_readiness')}
          </h2>
          <span className={cn('text-xl font-bold', progress.examReadiness >= 70 ? 'text-success-500' : progress.examReadiness >= 40 ? 'text-warning-500' : 'text-danger-500')}>{progress.examReadiness}%</span>
        </div>
        <div className="w-full bg-surface-100 rounded-full h-3 mb-2">
          <div className={cn('rounded-full h-3 transition-all duration-700', progress.examReadiness >= 70 ? 'bg-success-500' : progress.examReadiness >= 40 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${progress.examReadiness}%` }} />
        </div>
        <p className="text-xs text-surface-500">
          {progress.examReadiness >= 70 ? t('profile.ready') : progress.examReadiness >= 40 ? t('profile.good_progress') : t('profile.start_studying')}
        </p>
      </div>

      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className={cn('font-bold text-surface-900 mb-4 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
          <Icon name="trending_up" size={20} className="text-primary-500" /> {t('profile.progress_title')}
        </h2>
        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="text-center"><p className="text-sm font-bold text-success-600">{progress.correctAnswers}</p><p className="text-xs text-surface-400">{t('profile.correct_answers')}</p></div>
          <div className="text-center"><p className="text-sm font-bold text-danger-600">{progress.wrongAnswers}</p><p className="text-xs text-surface-400">{t('profile.wrong_answers')}</p></div>
          <div className="text-center"><p className="text-sm font-bold text-primary-600">{totalAnswers}</p><p className="text-xs text-surface-400">{t('profile.total_answers')}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className={cn('font-bold text-surface-900 mb-4 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
          <Icon name="emoji_events" size={20} className="text-orange-500" /> {t('profile.achievements')} ({progress.badges.length}/{allBadges.length})
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {allBadges.map(badge => {
            const isEarned = progress.badges.includes(badge.id);
            return (
              <div key={badge.id} className={cn('rounded-xl p-2 text-center', isEarned ? 'opacity-100' : 'opacity-30')}>
                <div className={cn('w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1', isEarned ? badge.color : 'bg-surface-200')}>
                  <Icon name={badge.icon} size={20} className={isEarned ? 'text-white' : 'text-surface-400'} filled />
                </div>
                <p className="text-[10px] font-semibold text-surface-700 leading-tight">{t(badge.nameKey)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {mistakes.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className={cn('p-4 border-b border-surface-100 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
            <Icon name="error_outline" size={20} className="text-danger-500" />
            <h2 className="font-bold text-surface-900">{t('profile.my_mistakes')} ({mistakes.length})</h2>
          </div>
          <div className="divide-y divide-surface-50 max-h-60 overflow-y-auto">
            {mistakes.slice(0, 5).map(m => (
              <div key={m.id} className={cn('p-3 flex items-start gap-3', isRTL ? 'flex-row-reverse' : '')}>
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', m.count >= 3 ? 'bg-danger-50' : 'bg-warning-50')}>
                  <span className="text-xs font-bold" style={{ color: m.count >= 3 ? '#ef4444' : '#f59e0b' }}>{m.count}×</span>
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm text-surface-800', isRTL ? 'text-right' : '')}>{m.questionAr}</p>
                  <div className={cn('flex items-center gap-3 mt-1 text-xs', isRTL ? 'flex-row-reverse' : '')}>
                    <span className="text-danger-500">{t('mistakes.your_answer')} {m.userAnswer ? t('quiz.true') : t('quiz.false')}</span>
                    <span className="text-success-500">{t('mistakes.correct_answer')} {m.correctAnswer ? t('quiz.true') : t('quiz.false')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-5 border border-surface-100">
        <h2 className={cn('font-bold text-surface-900 mb-3 flex items-center gap-2', isRTL ? 'flex-row-reverse' : '')}>
          <Icon name="info" size={20} className="text-surface-400" /> {t('profile.account_info')}
        </h2>
        <div className="space-y-2 text-sm">
          <div className={cn('flex justify-between py-1', isRTL ? 'flex-row-reverse' : '')}>
            <span className="text-surface-500">{t('profile.registration_date')}</span>
            <span className="text-surface-700">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <div className={cn('flex justify-between py-1', isRTL ? 'flex-row-reverse' : '')}>
            <span className="text-surface-500">{t('profile.last_login')}</span>
            <span className="text-surface-700">{new Date(user.lastLogin).toLocaleDateString()}</span>
          </div>
          <div className={cn('flex justify-between py-1', isRTL ? 'flex-row-reverse' : '')}>
            <span className="text-surface-500">{t('profile.account_type')}</span>
            <span className="text-primary-600 font-medium">
              {user.role === 'admin' ? t('profile.role_admin') : user.role === 'manager' ? t('profile.role_manager') : t('profile.role_user')}
            </span>
          </div>
        </div>
        {!user.profileComplete && (
          <button className="mt-3 w-full bg-warning-50 text-warning-700 rounded-lg py-2.5 text-sm font-medium border border-warning-200 hover:bg-warning-100" onClick={() => setShowCompleteProfile(true)}>
            {t('profile.complete_profile_warning')}
          </button>
        )}
      </div>

      <Button variant="danger" fullWidth onClick={handleLogout} icon={<Icon name="logout" size={20} />}>{t('auth.logout')}</Button>

      {showCompleteProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-primary-50 rounded-2xl flex items-center justify-center mb-3">
                <Icon name="person_add" size={32} className="text-primary-500" filled />
              </div>
              <h3 className="text-lg font-bold text-surface-900">{t('profile.complete_profile_title')}</h3>
              <p className="text-sm text-surface-500 mt-1">{t('profile.complete_profile_sub')}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className={cn('block text-sm font-medium text-surface-700 mb-1', isRTL ? 'text-right' : '')}>{t('profile.birth_date')} *</label>
                <input type="date" className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={profileForm.birthDate} onChange={e => setProfileForm(p => ({ ...p, birthDate: e.target.value }))} />
              </div>
              <div>
                <label className={cn('block text-sm font-medium text-surface-700 mb-1', isRTL ? 'text-right' : '')}>{t('profile.country_label')} *</label>
                <select className="w-full border border-surface-200 rounded-xl p-3 text-sm bg-surface-50" disabled>
                  <option>🇮🇹 Italia</option>
                </select>
              </div>
              <div>
                <label className={cn('block text-sm font-medium text-surface-700 mb-1', isRTL ? 'text-right' : '')}>{t('profile.province_label')} *</label>
                <select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={profileForm.province} onChange={e => setProfileForm(p => ({ ...p, province: e.target.value }))}>
                  <option value="">{t('profile.select_province')}</option>
                  {ITALIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={cn('block text-sm font-medium text-surface-700 mb-1', isRTL ? 'text-right' : '')}>{t('profile.gender')} *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: 'male', labelKey: 'profile.male' }, { value: 'female', labelKey: 'profile.female' }].map(g => (
                    <button key={g.value} className={cn('p-3 rounded-xl border-2 text-sm font-medium', profileForm.gender === g.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600')} onClick={() => setProfileForm(p => ({ ...p, gender: g.value }))}>{t(g.labelKey)}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={cn('block text-sm font-medium text-surface-700 mb-1', isRTL ? 'text-right' : '')}>{t('profile.phone_label')} *</label>
                <div className="flex gap-2">
                  <select className="w-28 border border-surface-200 rounded-xl p-3 text-sm shrink-0" value={profileForm.phoneCode} onChange={e => setProfileForm(p => ({ ...p, phoneCode: e.target.value }))}>
                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.country.split(' ')[0]} {c.code}</option>)}
                  </select>
                  <input type="tel" dir="ltr" className="flex-1 border border-surface-200 rounded-xl p-3 text-sm text-left" placeholder="1234567890" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={cn('block text-sm font-medium text-surface-700 mb-1', isRTL ? 'text-right' : '')}>{t('profile.italian_level')} *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'weak', labelKey: 'profile.level_weak' },
                    { value: 'good', labelKey: 'profile.level_good' },
                    { value: 'very_good', labelKey: 'profile.level_very_good' },
                    { value: 'native', labelKey: 'profile.level_native' },
                  ].map(l => (
                    <button key={l.value} className={cn('p-2.5 rounded-xl border-2 text-xs font-medium', profileForm.italianLevel === l.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600')} onClick={() => setProfileForm(p => ({ ...p, italianLevel: l.value }))}>{t(l.labelKey)}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button fullWidth variant="ghost" onClick={() => setShowCompleteProfile(false)}>{t('common.later')}</Button>
              <Button fullWidth onClick={handleSaveProfile}>{t('common.save')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/contexts/LanguageContext';
import { BilingualContent } from '@/components/BilingualContent';

interface Props { onNavigate: (page: string, data?: Record<string, string>) => void; }

export function SignsPage({ onNavigate }: Props) {
  const { signs, loadSigns } = useAuthStore();
  const { t, isRTL, resolveContent } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  void onNavigate;

  useEffect(() => { loadSigns(); }, [loadSigns]);

  const categories = [...new Set(signs.map(s => s.category))];
  const filtered = signs.filter(s => {
    if (filter !== 'all' && s.category !== filter) return false;
    if (search && !s.nameAr.includes(search) && !s.nameIt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catLabels: Record<string, { label: string; labelIt: string; color: string; icon: string }> = {
    pericolo: { label: 'إشارات الخطر', labelIt: 'Segnali di pericolo', color: '#ef4444', icon: 'warning' },
    divieto: { label: 'إشارات المنع', labelIt: 'Segnali di divieto', color: '#dc2626', icon: 'block' },
    obbligo: { label: 'إشارات الإلزام', labelIt: "Segnali d'obbligo", color: '#2563eb', icon: 'arrow_circle_up' },
    indicazione: { label: 'إشارات الإرشاد', labelIt: 'Segnali di indicazione', color: '#16a34a', icon: 'info' },
    precedenza: { label: 'أولوية المرور', labelIt: 'Precedenza', color: '#f59e0b', icon: 'swap_vert' },
  };

  const selectedSignData = signs.find(s => s.id === selectedSign);

  const getCatLabel = (cat: string) => {
    const info = catLabels[cat];
    if (!info) return cat;
    return resolveContent(info.label, info.labelIt)[0].text;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 mb-1">{t('signs.title')}</h1>
        <p className="text-surface-500 text-sm">{t('signs.subtitle')} — {signs.length}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-surface-100 mb-6 space-y-3">
        <div className="relative">
          <Icon name="search" size={20} className={cn('absolute top-1/2 -translate-y-1/2 text-surface-400', isRTL ? 'left-3' : 'right-3')} />
          <input
            className={cn('w-full py-2.5 rounded-xl border border-surface-200 text-sm focus:border-primary-500 transition-colors', isRTL ? 'pl-10 pr-4' : 'pr-10 pl-4')}
            placeholder={t('signs.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            className={cn('shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              filter === 'all' ? 'bg-primary-500 text-white shadow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}
            onClick={() => setFilter('all')}>
            {t('signs.all')} ({signs.length})
          </button>
          {categories.map(c => {
            const info = catLabels[c] || { label: c, labelIt: c, color: '#64748b', icon: 'label' };
            const count = signs.filter(s => s.category === c).length;
            return (
              <button key={c}
                className={cn('shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
                  filter === c ? 'text-white shadow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200')}
                style={filter === c ? { backgroundColor: info.color } : {}}
                onClick={() => setFilter(c)}>
                <Icon name={info.icon} size={14} />
                {getCatLabel(c)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-surface-100">
          <Icon name="traffic" size={48} className="text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 mb-2">{t('signs.no_results')}</p>
          <p className="text-xs text-surface-400">{t('signs.no_signs')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(sign => {
            const catInfo = catLabels[sign.category] || { label: sign.category, labelIt: sign.category, color: '#64748b', icon: 'label' };
            return (
              <button key={sign.id}
                className="bg-white rounded-xl border border-surface-100 hover:border-primary-200 hover:shadow-lg transition-all text-center group overflow-hidden"
                onClick={() => setSelectedSign(sign.id)}>
                <div className="w-full aspect-square bg-surface-50 flex items-center justify-center p-4 relative">
                  {sign.image ? (
                    <img src={sign.image} alt={sign.nameAr} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: catInfo.color + '12' }}>
                      <Icon name="traffic" size={40} style={{ color: catInfo.color }} />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: catInfo.color }}>
                    {getCatLabel(sign.category)}
                  </span>
                </div>
                <div className="p-3 border-t border-surface-50">
                  <BilingualContent
                    ar={sign.nameAr}
                    it={sign.nameIt}
                    as="h3"
                    primaryClassName="font-bold text-surface-900 text-sm mb-0.5 group-hover:text-primary-600 transition-colors line-clamp-1"
                    secondaryClassName="text-sm text-primary-500 line-clamp-1"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sign Detail Modal */}
      {selectedSignData && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedSign(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-full aspect-square bg-surface-50 flex items-center justify-center p-8 relative">
              {selectedSignData.image ? (
                <img src={selectedSignData.image} alt={selectedSignData.nameAr} className="w-full h-full object-contain" />
              ) : (
                <div className="w-40 h-40 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: (catLabels[selectedSignData.category]?.color || '#64748b') + '12' }}>
                  <Icon name="traffic" size={80} style={{ color: catLabels[selectedSignData.category]?.color || '#64748b' }} />
                </div>
              )}
              <button className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
                onClick={() => setSelectedSign(null)}>
                <Icon name="close" size={22} className="text-surface-600" />
              </button>
              <span className="absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: catLabels[selectedSignData.category]?.color || '#64748b' }}>
                {getCatLabel(selectedSignData.category)}
              </span>
            </div>
            <div className="p-6">
              <BilingualContent
                ar={selectedSignData.nameAr}
                it={selectedSignData.nameIt}
                as="h2"
                primaryClassName="text-xl font-bold text-surface-900 mb-1"
                secondaryClassName="text-xl text-primary-500 font-medium mb-4"
              />
              <div className="bg-surface-50 rounded-xl p-4 space-y-3 mt-4">
                {resolveContent(selectedSignData.descriptionAr, selectedSignData.descriptionIt).map(block => (
                  <div key={block.lang}>
                    <p className="text-xs font-semibold text-surface-500 mb-1">
                      {block.lang === 'ar' ? `🇸🇦 ${t('signs.description_ar')}` : `🇮🇹 ${t('signs.description_it')}`}
                    </p>
                    <p className="text-sm text-surface-700 leading-relaxed"
                      dir={block.lang === 'ar' ? 'rtl' : 'ltr'}
                      lang={block.lang}>
                      {block.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

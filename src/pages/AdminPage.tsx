import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { useLanguage } from "@/contexts/LanguageContext";
import type { Comment } from '@/db/database';

type Tab = 'overview' | 'sections' | 'lessons' | 'questions' | 'signs' | 'dictionary' | 'users' | 'posts' | 'comments' | 'reports' | 'logs' | 'analytics';

export function AdminPage() {
  const store = useAuthStore();
  const { isRTL } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const [modal, setModal] = useState<{ type: string; data?: Record<string, unknown> } | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [confirmDel, setConfirmDel] = useState<{ type: string; id: string } | null>(null);
  const [allComments, setAllComments] = useState<(Comment & { postContent?: string })[]>([]);
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, Set<string>>>({
    sections: new Set(), lessons: new Set(), questions: new Set(), signs: new Set(),
    dictSections: new Set(), dictEntries: new Set(),
  });
  const [confirmBulk, setConfirmBulk] = useState<{ type: string; action: 'delete' | 'archive' } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const logsInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = () => {
    store.loadAdminStats(); store.loadSections(); store.loadLessons(); store.loadQuestions();
    store.loadSigns(); store.loadDictSections(); store.loadDictEntries();
    store.loadAdminUsers(); store.loadPosts(); store.loadAdminReports(); store.loadAdminLogs();
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (tab === 'logs') {
      store.loadAdminLogs();
      logsInterval.current = setInterval(() => store.loadAdminLogs(), 5000);
    } else {
      if (logsInterval.current) clearInterval(logsInterval.current);
    }
    return () => { if (logsInterval.current) clearInterval(logsInterval.current); };
  }, [tab]);

  useEffect(() => {
    if (tab === 'comments') loadAllComments();
  }, [tab, store.posts]);

  const loadAllComments = async () => {
    const comments: (Comment & { postContent?: string })[] = [];
    for (const post of store.posts) {
      const postComments = await store.getComments(post.id);
      for (const c of postComments) comments.push({ ...c, postContent: post.content.substring(0, 60) });
    }
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAllComments(comments);
  };

  const handleExport = async (storeName: string) => {
    const data = await store.exportData(storeName);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${storeName}.json`; a.click();
  };

  const handleImport = (storeName: string) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const text = await file.text(); const data = JSON.parse(text);
      const count = await store.importData(storeName, data); alert(`تم استيراد ${count} سجل`);
      store.loadSections(); store.loadLessons(); store.loadQuestions(); store.loadSigns(); store.loadDictSections(); store.loadDictEntries();
    };
    input.click();
  };

  const handleImageUpload = (field: string) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setForm(prev => ({ ...prev, [field]: reader.result as string }));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveItem = async () => {
    if (!modal) return;
    const { type, data } = modal; const isEdit = !!data?.id; let ok = false;
    switch (type) {
      case 'section': ok = isEdit ? await store.updateSection(data.id as string, form as never) : await store.createSection(form as never); break;
      case 'lesson': ok = isEdit ? await store.updateLesson(data.id as string, form as never) : await store.createLesson(form as never); break;
      case 'question': ok = isEdit ? await store.updateQuestion(data.id as string, form as never) : await store.createQuestion(form as never); break;
      case 'sign': ok = isEdit ? await store.updateSign(data.id as string, form as never) : await store.createSign(form as never); break;
      case 'dictSection': ok = isEdit ? await store.updateDictSection(data.id as string, form as never) : await store.createDictSection(form as never); break;
      case 'dictEntry': ok = isEdit ? await store.updateDictEntry(data.id as string, form as never) : await store.createDictEntry(form as never); break;
    }
    if (ok) setModal(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    switch (type) {
      case 'section': await store.deleteSection(id); break; case 'lesson': await store.deleteLesson(id); break;
      case 'question': await store.deleteQuestion(id); break; case 'sign': await store.deleteSign(id); break;
      case 'dictSection': await store.deleteDictSection(id); break; case 'dictEntry': await store.deleteDictEntry(id); break;
      case 'user': await store.deleteUser(id); break; case 'post': await store.adminDeletePost(id); break;
      case 'comment': await store.adminDeleteComment(id); await loadAllComments(); break;
    }
    setConfirmDel(null);
  };

  const handleBulkAction = async () => {
    if (!confirmBulk) return;
    const { type, action } = confirmBulk;
    const ids = type === 'users' ? Array.from(selectedUsers) : Array.from(selectedIds[type] || []);
    if (action === 'delete') {
      for (const id of ids) {
        if (type === 'sections') await store.deleteSection(id);
        else if (type === 'lessons') await store.deleteLesson(id);
        else if (type === 'questions') await store.deleteQuestion(id);
        else if (type === 'signs') await store.deleteSign(id);
        else if (type === 'dictEntries') await store.deleteDictEntry(id);
        else if (type === 'users') await store.deleteUser(id);
      }
    } else {
      const db = await import('@/db/database').then(m => m.getDB());
      const storeMap: Record<string, string> = { sections: 'sections', lessons: 'lessons', questions: 'questions', signs: 'signs', dictEntries: 'dictionaryEntries' };
      const sn = storeMap[type];
      if (sn) for (const id of ids) { const item = await db.get(sn as never, id as never); if (item) { (item as Record<string, unknown>).archived = true; await db.put(sn as never, item as never); } }
    }
    if (type === 'users') setSelectedUsers(new Set());
    else setSelectedIds(prev => ({ ...prev, [type]: new Set() }));
    setConfirmBulk(null); loadData();
  };

  const toggleSelect = (listKey: string, id: string) => {
    setSelectedIds(prev => { const s = new Set(prev[listKey]); if (s.has(id)) s.delete(id); else s.add(id); return { ...prev, [listKey]: s }; });
  };
  const toggleSelectAll = (listKey: string, ids: string[]) => {
    setSelectedIds(prev => { const s = prev[listKey]; const all = ids.every(id => s.has(id)); return { ...prev, [listKey]: all ? new Set() : new Set(ids) }; });
  };

  const exportUsers = () => {
    const toExport = selectedUsers.size > 0 ? store.adminUsers.filter(u => selectedUsers.has(u.id)) : store.adminUsers;
    const rows = [
      ['الاسم','البريد','الهاتف','الدولة/المحافظة','الجنس','تاريخ الميلاد','مستوى الإيطالية','الدور','الحالة','تاريخ التسجيل'],
      ...toExport.map(u => [
        u.name, u.email, u.phone ? `${u.phoneCode||''} ${u.phone}` : '',
        u.province ? `${u.province}, Italia` : '',
        u.gender === 'male' ? 'ذكر' : u.gender === 'female' ? 'أنثى' : '',
        u.birthDate||'', u.italianLevel||'',
        u.role === 'admin' ? 'مسؤول' : u.role === 'manager' ? 'مدير' : 'مستخدم',
        u.isBanned ? 'محظور' : 'نشط', new Date(u.createdAt).toLocaleString('ar'),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
  };

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview', icon: 'dashboard', label: 'نظرة عامة' }, { id: 'sections', icon: 'folder', label: 'الأقسام' },
    { id: 'lessons', icon: 'school', label: 'الدروس' }, { id: 'questions', icon: 'quiz', label: 'الأسئلة' },
    { id: 'signs', icon: 'traffic', label: 'الإشارات' }, { id: 'dictionary', icon: 'menu_book', label: 'القاموس' },
    { id: 'users', icon: 'group', label: 'المستخدمين' }, { id: 'posts', icon: 'forum', label: 'المنشورات' },
    { id: 'comments', icon: 'chat_bubble', label: 'التعليقات' }, { id: 'reports', icon: 'flag', label: 'البلاغات' },
    { id: 'logs', icon: 'history', label: 'السجلات' }, { id: 'analytics', icon: 'analytics', label: 'الزيارات' },
  ];

  const renderInput = (label: string, field: string, type = 'text') => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-surface-700 mb-1">{label}</label>
      {type === 'textarea' ? (<textarea className="w-full border border-surface-200 rounded-xl p-3 text-sm resize-none" rows={3} value={(form[field] as string)||''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />)
      : type === 'boolean' ? (<select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={String(form[field]||false)} onChange={e => setForm(p => ({ ...p, [field]: e.target.value==='true' }))}><option value="true">صحيح</option><option value="false">خطأ</option></select>)
      : type === 'select-difficulty' ? (<select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string)||'easy'} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option></select>)
      : type === 'select-section' ? (<select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string)||''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}><option value="">اختر قسم</option>{store.sections.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}</select>)
      : type === 'select-lesson' ? (<select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string)||''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}><option value="">اختر درس</option>{store.lessons.map(l => <option key={l.id} value={l.id}>{l.titleAr}</option>)}</select>)
      : type === 'select-dict-section' ? (<select className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string)||''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}><option value="">اختر قسم</option>{store.dictSections.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}</select>)
      : type === 'number' ? (<input type="number" className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as number)||0} onChange={e => setForm(p => ({ ...p, [field]: parseInt(e.target.value)||0 }))} />)
      : type === 'image' ? (<div><button className="px-4 py-2 bg-surface-100 rounded-lg text-sm hover:bg-surface-200 flex items-center gap-1" onClick={() => handleImageUpload(field)}><Icon name="upload" size={16} /> رفع صورة</button>{form[field] ? <img src={form[field] as string} alt="" className="mt-2 w-20 h-20 object-cover rounded-lg" /> : null}</div>)
      : (<input type={type} className="w-full border border-surface-200 rounded-xl p-3 text-sm" value={(form[field] as string)||''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />)}
    </div>
  );

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-surface-900 mb-1">لوحة التحكم</h1><p className="text-sm text-surface-400">إدارة كاملة للتطبيق</p></div>
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
        {tabs.map(t => (
          <button key={t.id} className={cn('shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all', tab===t.id ? 'bg-primary-500 text-white' : 'bg-white text-surface-600 border border-surface-200 hover:border-primary-200')} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} />{t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && store.adminStats && (() => {
        const pr = store.adminReports.filter(r => r.status==='pending').length;
        const bu = store.adminUsers.filter(u => u.isBanned).length;
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="relative">
                <h2 className="text-lg font-bold mb-4">مرحباً بك في لوحة التحكم</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[{v:store.adminStats.totalUsers,l:'مستخدم'},{v:store.adminStats.activeToday,l:'نشط اليوم'},{v:store.adminStats.totalPosts,l:'منشور'},{v:pr,l:'بلاغ معلق',warn:pr>0}].map((s,i)=>(
                    <div key={i} className={cn('backdrop-blur-sm rounded-xl p-3 text-center border',s.warn?'bg-red-500/30 border-red-400/30':'bg-white/10 border-white/10')}><p className="text-2xl font-bold">{s.v}</p><p className="text-[10px] text-primary-200">{s.l}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {l:'الأقسام',v:store.adminStats.totalSections,i:'folder',c:'text-purple-500',b:'bg-purple-50',t:'sections' as Tab},
                {l:'الدروس',v:store.adminStats.totalLessons,i:'school',c:'text-green-500',b:'bg-green-50',t:'lessons' as Tab},
                {l:'الأسئلة',v:store.adminStats.totalQuestions,i:'quiz',c:'text-orange-500',b:'bg-orange-50',t:'questions' as Tab},
                {l:'الإشارات',v:store.adminStats.totalSigns,i:'traffic',c:'text-red-500',b:'bg-red-50',t:'signs' as Tab},
                {l:'القاموس',v:store.dictEntries.length,i:'translate',c:'text-indigo-500',b:'bg-indigo-50',t:'dictionary' as Tab},
                {l:'البلاغات',v:store.adminStats.totalReports,i:'flag',c:'text-pink-500',b:'bg-pink-50',t:'reports' as Tab},
                {l:'محظورين',v:bu,i:'block',c:'text-red-500',b:'bg-red-50',t:'users' as Tab},
                {l:'منشورات',v:store.posts.length,i:'forum',c:'text-cyan-500',b:'bg-cyan-50',t:'posts' as Tab},
              ].map((s,idx)=>(
                <button key={idx} className="bg-white rounded-xl p-4 border border-surface-100 hover:border-primary-200 hover:shadow-md transition-all text-right" onClick={()=>setTab(s.t)}>
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3',s.b)}><Icon name={s.i} size={22} className={s.c} filled /></div>
                  <p className="text-2xl font-bold text-surface-900">{s.v}</p><p className="text-xs text-surface-500">{s.l}</p>
                </button>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-surface-100 p-5">
              <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2"><Icon name="bolt" size={20} className="text-amber-500" filled /> إجراءات سريعة</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{l:'إضافة قسم',i:'create_new_folder',t:'sections' as Tab},{l:'إضافة درس',i:'post_add',t:'lessons' as Tab},{l:'إضافة سؤال',i:'add_circle',t:'questions' as Tab},{l:'إضافة إشارة',i:'add_photo_alternate',t:'signs' as Tab}].map((a,i)=>(
                  <button key={i} className="bg-surface-50 hover:bg-primary-50 rounded-xl p-3 text-center transition-colors group" onClick={()=>setTab(a.t)}>
                    <Icon name={a.i} size={24} className="text-surface-400 group-hover:text-primary-500 mx-auto mb-1" /><p className="text-xs font-medium text-surface-600 group-hover:text-primary-600">{a.l}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECTIONS */}
      {tab==='sections' && <CrudTable title="الأقسام" listKey="sections" items={store.sections} search={search} setSearch={setSearch} selected={selectedIds.sections} onToggleSelect={id=>toggleSelect('sections',id)} onToggleAll={ids=>toggleSelectAll('sections',ids)} onBulkDelete={()=>setConfirmBulk({type:'sections',action:'delete'})} onBulkArchive={()=>setConfirmBulk({type:'sections',action:'archive'})} columns={[{key:'nameAr',label:'الاسم'},{key:'nameIt',label:'بالإيطالية'},{key:'order',label:'الترتيب'}]} onAdd={()=>{setForm({nameAr:'',nameIt:'',descriptionAr:'',descriptionIt:'',icon:'school',color:'#3b82f6',image:'',order:store.sections.length+1});setModal({type:'section'});}} onEdit={item=>{setForm(item);setModal({type:'section',data:item as Record<string,unknown>});}} onDelete={id=>setConfirmDel({type:'section',id})} onExport={()=>handleExport('sections')} onImport={()=>handleImport('sections')} filterFn={item=>!search||item.nameAr.includes(search)||item.nameIt?.toLowerCase().includes(search.toLowerCase())} />}

      {/* LESSONS */}
      {tab==='lessons' && <CrudTable title="الدروس" listKey="lessons" items={store.lessons} search={search} setSearch={setSearch} selected={selectedIds.lessons} onToggleSelect={id=>toggleSelect('lessons',id)} onToggleAll={ids=>toggleSelectAll('lessons',ids)} onBulkDelete={()=>setConfirmBulk({type:'lessons',action:'delete'})} onBulkArchive={()=>setConfirmBulk({type:'lessons',action:'archive'})} columns={[{key:'titleAr',label:'العنوان'},{key:'sectionId',label:'القسم',render:v=>store.sections.find(s=>s.id===v)?.nameAr||String(v)},{key:'order',label:'الترتيب'}]} onAdd={()=>{setForm({sectionId:'',titleAr:'',titleIt:'',contentAr:'',contentIt:'',image:'',order:store.lessons.length+1});setModal({type:'lesson'});}} onEdit={item=>{setForm(item);setModal({type:'lesson',data:item as Record<string,unknown>});}} onDelete={id=>setConfirmDel({type:'lesson',id})} onExport={()=>handleExport('lessons')} onImport={()=>handleImport('lessons')} filterFn={item=>!search||item.titleAr?.includes(search)||item.titleIt?.toLowerCase().includes(search.toLowerCase())} />}

      {/* QUESTIONS */}
      {tab==='questions' && <CrudTable title="الأسئلة" listKey="questions" items={store.questions} search={search} setSearch={setSearch} selected={selectedIds.questions} onToggleSelect={id=>toggleSelect('questions',id)} onToggleAll={ids=>toggleSelectAll('questions',ids)} onBulkDelete={()=>setConfirmBulk({type:'questions',action:'delete'})} onBulkArchive={()=>setConfirmBulk({type:'questions',action:'archive'})} columns={[{key:'questionAr',label:'السؤال',render:(v:unknown)=>String(v||'').substring(0,50)+'...'},{key:'isTrue',label:'الإجابة',render:v=>v?'✓ صحيح':'✗ خطأ'},{key:'difficulty',label:'الصعوبة'}]} onAdd={()=>{setForm({lessonId:'',sectionId:'',questionAr:'',questionIt:'',isTrue:true,explanationAr:'',explanationIt:'',difficulty:'easy',image:'',order:store.questions.length+1});setModal({type:'question'});}} onEdit={item=>{setForm(item);setModal({type:'question',data:item as Record<string,unknown>});}} onDelete={id=>setConfirmDel({type:'question',id})} onExport={()=>handleExport('questions')} onImport={()=>handleImport('questions')} filterFn={item=>!search||item.questionAr?.includes(search)||item.questionIt?.toLowerCase().includes(search.toLowerCase())} />}

      {/* SIGNS */}
      {tab==='signs' && <CrudTable title="الإشارات" listKey="signs" items={store.signs} search={search} setSearch={setSearch} selected={selectedIds.signs} onToggleSelect={id=>toggleSelect('signs',id)} onToggleAll={ids=>toggleSelectAll('signs',ids)} onBulkDelete={()=>setConfirmBulk({type:'signs',action:'delete'})} onBulkArchive={()=>setConfirmBulk({type:'signs',action:'archive'})} columns={[{key:'nameAr',label:'الاسم'},{key:'nameIt',label:'بالإيطالية'},{key:'category',label:'التصنيف'}]} onAdd={()=>{setForm({nameAr:'',nameIt:'',descriptionAr:'',descriptionIt:'',category:'pericolo',image:'',order:store.signs.length+1});setModal({type:'sign'});}} onEdit={item=>{setForm(item);setModal({type:'sign',data:item as Record<string,unknown>});}} onDelete={id=>setConfirmDel({type:'sign',id})} onExport={()=>handleExport('signs')} onImport={()=>handleImport('signs')} filterFn={item=>!search||item.nameAr?.includes(search)} />}

      {/* DICTIONARY */}
      {tab==='dictionary' && <div className="space-y-6">
        <CrudTable title="أقسام القاموس" listKey="dictSections" items={store.dictSections} search={search} setSearch={setSearch} selected={selectedIds.dictSections} onToggleSelect={id=>toggleSelect('dictSections',id)} onToggleAll={ids=>toggleSelectAll('dictSections',ids)} onBulkDelete={()=>setConfirmBulk({type:'dictSections',action:'delete'})} columns={[{key:'nameAr',label:'الاسم'},{key:'nameIt',label:'بالإيطالية'}]} onAdd={()=>{setForm({nameAr:'',nameIt:'',icon:'menu_book',order:store.dictSections.length+1});setModal({type:'dictSection'});}} onEdit={item=>{setForm(item);setModal({type:'dictSection',data:item as Record<string,unknown>});}} onDelete={id=>setConfirmDel({type:'dictSection',id})} onExport={()=>handleExport('dictionarySections')} onImport={()=>handleImport('dictionarySections')} filterFn={item=>!search||item.nameAr?.includes(search)} />
        <CrudTable title="مصطلحات القاموس" listKey="dictEntries" items={store.dictEntries} search={search} setSearch={setSearch} selected={selectedIds.dictEntries} onToggleSelect={id=>toggleSelect('dictEntries',id)} onToggleAll={ids=>toggleSelectAll('dictEntries',ids)} onBulkDelete={()=>setConfirmBulk({type:'dictEntries',action:'delete'})} onBulkArchive={()=>setConfirmBulk({type:'dictEntries',action:'archive'})} columns={[{key:'termAr',label:'المصطلح'},{key:'termIt',label:'بالإيطالية'},{key:'sectionId',label:'القسم',render:v=>store.dictSections.find(s=>s.id===v)?.nameAr||''}]} onAdd={()=>{setForm({sectionId:'',termIt:'',termAr:'',definitionIt:'',definitionAr:'',order:store.dictEntries.length+1});setModal({type:'dictEntry'});}} onEdit={item=>{setForm(item);setModal({type:'dictEntry',data:item as Record<string,unknown>});}} onDelete={id=>setConfirmDel({type:'dictEntry',id})} onExport={()=>handleExport('dictionaryEntries')} onImport={()=>handleImport('dictionaryEntries')} filterFn={item=>!search||item.termAr?.includes(search)||item.termIt?.toLowerCase().includes(search.toLowerCase())} />
      </div>}

      {/* USERS */}
      {tab==='users' && (() => {
        const selectedUser = store.adminUsers.find(u=>u.id===viewUser);
        if (selectedUser) {
          const totalAns = selectedUser.progress.correctAnswers+selectedUser.progress.wrongAnswers;
          const acc = totalAns>0?Math.round((selectedUser.progress.correctAnswers/totalAns)*100):0;
          return (
            <div className="space-y-4">
              <button onClick={()=>setViewUser(null)} className="flex items-center gap-2 text-surface-500 hover:text-primary-600"><Icon name="arrow_forward" size={20}/><span className="text-sm">العودة</span></button>
              <div className="bg-white rounded-xl border border-surface-100 p-6">
                <div className="flex items-center gap-4 mb-6">
                  {selectedUser.avatar?<img src={selectedUser.avatar} className="w-16 h-16 rounded-xl object-cover" alt=""/>:<div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center"><span className="text-xl font-bold text-primary-700">{selectedUser.name.charAt(0)}</span></div>}
                  <div>
                    <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                    <p className="text-sm text-surface-500">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full',selectedUser.isBanned?'bg-danger-50 text-danger-600':'bg-success-50 text-success-600')}>{selectedUser.isBanned?'محظور':'نشط'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-500">{selectedUser.role}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-surface-50 rounded-xl p-3 text-center"><p className="text-lg font-bold">{selectedUser.progress.level}</p><p className="text-[10px] text-surface-400">المستوى</p></div>
                  <div className="bg-surface-50 rounded-xl p-3 text-center"><p className="text-lg font-bold">{selectedUser.progress.xp}</p><p className="text-[10px] text-surface-400">XP</p></div>
                  <div className="bg-surface-50 rounded-xl p-3 text-center"><p className="text-lg font-bold">{acc}%</p><p className="text-[10px] text-surface-400">الدقة</p></div>
                  <div className="bg-surface-50 rounded-xl p-3 text-center"><p className="text-lg font-bold">{selectedUser.progress.examReadiness}%</p><p className="text-[10px] text-surface-400">الجاهزية</p></div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-bold mb-3">المعلومات الشخصية</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[['الاسم',selectedUser.name],['البريد',selectedUser.email],['الهاتف',selectedUser.phone?`${selectedUser.phoneCode||''} ${selectedUser.phone}`:'—'],['الجنس',selectedUser.gender==='male'?'ذكر':selectedUser.gender==='female'?'أنثى':'—'],['تاريخ الميلاد',selectedUser.birthDate||'—'],['المحافظة',selectedUser.province||'—'],['مستوى الإيطالية',selectedUser.italianLevel||'—'],['تاريخ التسجيل',new Date(selectedUser.createdAt).toLocaleDateString('ar')]].map(([k,v],i)=>(
                      <div key={i} className="bg-surface-50 rounded-lg p-2.5"><p className="text-[10px] text-surface-400">{k}</p><p className="font-medium truncate">{v}</p></div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t">
                  <Button size="sm" variant={selectedUser.isBanned?'primary':'danger'} onClick={()=>store.banUser(selectedUser.id,!selectedUser.isBanned)} icon={<Icon name={selectedUser.isBanned?'lock_open':'block'} size={16}/>}>{selectedUser.isBanned?'إلغاء الحظر':'حظر'}</Button>
                  {selectedUser.email!=='admin@patente.com' && <Button size="sm" variant="danger" onClick={()=>{setConfirmDel({type:'user',id:selectedUser.id});setViewUser(null);}} icon={<Icon name="delete" size={16}/>}>حذف</Button>}
                </div>
              </div>
            </div>
          );
        }

        const filteredUsers = store.adminUsers.filter(u=>!search||u.name.includes(search)||u.email.includes(search));
        const allSel = filteredUsers.length>0 && filteredUsers.every(u=>selectedUsers.has(u.id));
        return (
          <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold">المستخدمين ({store.adminUsers.length})</h2>
                {selectedUsers.size>0 && <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">{selectedUsers.size} محدد</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm w-40" placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
                {selectedUsers.size>0 && <Button size="sm" variant="danger" icon={<Icon name="delete" size={14}/>} onClick={()=>setConfirmBulk({type:'users',action:'delete'})}>حذف ({selectedUsers.size})</Button>}
                <Button size="sm" variant="secondary" icon={<Icon name="download" size={14}/>} onClick={exportUsers}>تصدير {selectedUsers.size>0?`(${selectedUsers.size})`:'CSV'}</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50"><tr>
                  <th className="p-3 w-10"><input type="checkbox" className="rounded" checked={allSel} onChange={()=>{if(allSel)setSelectedUsers(new Set());else setSelectedUsers(new Set(filteredUsers.map(u=>u.id)));}} /></th>
                  <th className="text-right p-3 font-semibold text-surface-600">المستخدم</th>
                  <th className="text-right p-3 font-semibold text-surface-600">البريد</th>
                  <th className="text-right p-3 font-semibold text-surface-600">الدور</th>
                  <th className="text-right p-3 font-semibold text-surface-600">الحالة</th>
                  <th className="text-right p-3 font-semibold text-surface-600 w-24">إجراءات</th>
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u=>(
                    <tr key={u.id} className={cn('border-t border-surface-50 hover:bg-surface-50 cursor-pointer',selectedUsers.has(u.id)&&'bg-primary-50')} onClick={()=>setViewUser(u.id)}>
                      <td className="p-3" onClick={e=>e.stopPropagation()}><input type="checkbox" className="rounded" checked={selectedUsers.has(u.id)} onChange={()=>{const s=new Set(selectedUsers);if(s.has(u.id))s.delete(u.id);else s.add(u.id);setSelectedUsers(s);}}/></td>
                      <td className="p-3"><div className="flex items-center gap-2">{u.avatar?<img src={u.avatar} className="w-7 h-7 rounded-full object-cover" alt=""/>:<div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-xs font-bold text-primary-700">{u.name.charAt(0)}</span></div>}<span className="font-medium">{u.name}</span></div></td>
                      <td className="p-3 text-surface-500">{u.email}</td>
                      <td className="p-3"><span className={cn('text-xs px-2 py-0.5 rounded-full',u.role==='admin'?'bg-purple-50 text-purple-600':'bg-surface-100 text-surface-500')}>{u.role==='admin'?'مدير':'مستخدم'}</span></td>
                      <td className="p-3"><span className={cn('text-xs px-2 py-0.5 rounded-full',u.isBanned?'bg-danger-50 text-danger-600':'bg-success-50 text-success-600')}>{u.isBanned?'محظور':'نشط'}</span></td>
                      <td className="p-3" onClick={e=>e.stopPropagation()}><div className="flex gap-1">
                        <button className="p-1 rounded hover:bg-surface-100" onClick={()=>setViewUser(u.id)}><Icon name="visibility" size={16} className="text-primary-500"/></button>
                        <button className="p-1 rounded hover:bg-surface-100" onClick={()=>store.banUser(u.id,!u.isBanned)}><Icon name={u.isBanned?'lock_open':'block'} size={16} className={u.isBanned?'text-success-500':'text-warning-500'}/></button>
                        {u.email!=='admin@patente.com' && <button className="p-1 rounded hover:bg-surface-100" onClick={()=>setConfirmDel({type:'user',id:u.id})}><Icon name="delete" size={16} className="text-danger-500"/></button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* POSTS */}
      {tab==='posts' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-bold">المنشورات ({store.posts.length})</h2></div>
          {store.posts.length===0?<div className="p-8 text-center text-surface-400">لا توجد منشورات</div>:(
            <div className="divide-y divide-surface-50">
              {store.posts.map(p=>(
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{p.userName}</p>
                    <p className="text-xs text-surface-500 line-clamp-2 mt-0.5">{p.content}</p>
                    <p className="text-xs text-surface-400 mt-1">{new Date(p.createdAt).toLocaleDateString('ar')} — {p.likesCount} ❤ {p.commentsCount} 💬</p>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-danger-50 text-danger-500 shrink-0" onClick={()=>setConfirmDel({type:'post',id:p.id})}><Icon name="delete" size={18}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMENTS */}
      {tab==='comments' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold">التعليقات ({allComments.length})</h2>
            <input className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm w-48" placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {allComments.length===0?<div className="p-8 text-center text-surface-400">لا توجد تعليقات</div>:(
            <div className="divide-y divide-surface-50 max-h-[600px] overflow-y-auto">
              {allComments.filter(c=>!search||c.content.includes(search)||c.userName.includes(search)).map(c=>(
                <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0"><span className="text-xs font-bold text-primary-700">{c.userName.charAt(0)}</span></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5"><span className="text-sm font-semibold">{c.userName}</span><span className="text-xs text-surface-400">{new Date(c.createdAt).toLocaleDateString('ar')}</span></div>
                      <p className="text-sm text-surface-700">{c.content}</p>
                      {c.postContent && <p className="text-xs text-surface-400 mt-1">على: {c.postContent}...</p>}
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-danger-50 text-danger-400 shrink-0" onClick={()=>setConfirmDel({type:'comment',id:c.id})}><Icon name="delete" size={16}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REPORTS */}
      {tab==='reports' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-bold">البلاغات ({store.adminReports.length})</h2></div>
          <div className="divide-y divide-surface-50">
            {store.adminReports.length===0?<div className="p-8 text-center text-surface-400">لا توجد بلاغات</div>:store.adminReports.map(r=>(
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full',r.status==='pending'?'bg-warning-50 text-warning-600':r.status==='reviewed'?'bg-success-50 text-success-600':'bg-surface-100 text-surface-500')}>{r.status==='pending'?'قيد المراجعة':r.status==='reviewed'?'تمت المراجعة':'مرفوض'}</span>
                  <span className="text-xs text-surface-400">{new Date(r.createdAt).toLocaleDateString('ar')}</span>
                </div>
                <p className="text-sm mb-2">{r.reason}</p>
                {r.status==='pending' && <div className="flex gap-2 mt-3"><Button size="sm" onClick={()=>store.updateReport(r.id,'reviewed')}><Icon name="check" size={16}/> مراجعة</Button><Button size="sm" variant="ghost" onClick={()=>store.updateReport(r.id,'dismissed')}>رفض</Button></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOGS - live refresh */}
      {tab==='logs' && (
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">السجلات ({store.adminLogs.length})</h2>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-success-500 rounded-full animate-pulse"/><span className="text-[10px] text-success-600 font-medium">تحديث تلقائي</span></div>
            </div>
            <div className="flex gap-2">
              <input className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm w-40" placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <button className="p-2 rounded-lg hover:bg-surface-100 text-surface-400" onClick={()=>store.loadAdminLogs()} title="تحديث"><Icon name="refresh" size={18}/></button>
            </div>
          </div>
          <div className="divide-y divide-surface-50 max-h-[600px] overflow-y-auto">
            {store.adminLogs.length===0?<div className="p-8 text-center text-surface-400">لا توجد سجلات</div>:store.adminLogs.filter(l=>!search||l.action.includes(search)||l.details.includes(search)).map(l=>{
              const admin=store.adminUsers.find(u=>u.id===l.adminId);
              const ac=l.action.includes('حذف')?'text-danger-500 bg-danger-50':l.action.includes('إضافة')?'text-success-500 bg-success-50':l.action.includes('تعديل')?'text-blue-500 bg-blue-50':l.action.includes('حظر')?'text-orange-500 bg-orange-50':'text-surface-500 bg-surface-100';
              return (
                <div key={l.id} className="p-3 flex items-start gap-3 hover:bg-surface-50">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',ac.split(' ')[1])}><Icon name={l.action.includes('حذف')?'delete':l.action.includes('إضافة')?'add':l.action.includes('تعديل')?'edit':l.action.includes('حظر')?'block':'history'} size={16} className={ac.split(' ')[0]}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-semibold text-primary-600">{admin?.name||'مسؤول'}</span><span className="text-[10px] text-surface-400">•</span><span className="text-[10px] text-surface-400">{new Date(l.createdAt).toLocaleString('ar')}</span></div>
                    <p className="text-sm">{l.action}</p><p className="text-xs text-surface-500 mt-0.5">{l.details}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANALYTICS - SVG bars chart */}
      {tab==='analytics' && (() => {
        const totalUsers=store.adminUsers.length;
        const activeToday=store.adminStats?.activeToday||0;
        const totalQuizzes=store.adminUsers.reduce((s,u)=>s+u.progress.totalQuizzes,0);
        const now=new Date();
        const weekDays=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
        const weekData=weekDays.map((day,i)=>{
          const d=new Date(now);d.setDate(d.getDate()-((now.getDay()-i+7)%7));
          const dayUsers=store.adminUsers.filter(u=>new Date(u.lastLogin).toDateString()===d.toDateString());
          return{day,dayShort:day.substring(0,3),visits:dayUsers.length,quizzes:dayUsers.reduce((s,u)=>s+u.progress.totalQuizzes,0)};
        });
        const maxVisits=Math.max(...weekData.map(w=>w.visits),1);
        const chartH=120; const barW=36; const gap=12;
        const barColors=['#3b82f6','#34d399','#f59e0b','#a78bfa','#f87171','#22d3ee','#fb7185'];
        const deviceData=[{l:'موبايل',v:62,c:'#3b82f6'},{l:'كمبيوتر',v:28,c:'#8b5cf6'},{l:'تابلت',v:10,c:'#06b6d4'}];
        const browserData=[{l:'Chrome',v:64,c:'#f59e0b'},{l:'Safari',v:21,c:'#ef4444'},{l:'Firefox',v:10,c:'#f97316'},{l:'أخرى',v:5,c:'#6b7280'}];
        const countryData=Object.entries(store.adminUsers.reduce((a,u)=>{const c=u.province?'Italia 🇮🇹':'غير محدد';a[c]=(a[c]||0)+1;return a;},{} as Record<string,number>));
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[{l:'زيارات اليوم',v:activeToday,i:'visibility',c:'text-blue-500',b:'bg-blue-50'},{l:'المستخدمين',v:totalUsers,i:'group',c:'text-purple-500',b:'bg-purple-50'},{l:'الاختبارات',v:totalQuizzes,i:'quiz',c:'text-green-500',b:'bg-green-50'},{l:'متوسط الجاهزية',v:`${Math.round(store.adminUsers.reduce((s,u)=>s+u.progress.examReadiness,0)/Math.max(1,totalUsers))}%`,i:'verified',c:'text-orange-500',b:'bg-orange-50'}].map((s,i)=>(
                <div key={i} className="bg-white rounded-xl p-4 border border-surface-100"><div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3',s.b)}><Icon name={s.i} size={22} className={s.c} filled/></div><p className="text-2xl font-bold">{s.v}</p><p className="text-xs text-surface-500 mt-1">{s.l}</p></div>
              ))}
            </div>

            {/* SVG Bar Chart */}
            <div className="bg-white rounded-xl border border-surface-100 p-5">
              <h3 className="font-bold text-surface-900 mb-5 flex items-center gap-2"><Icon name="bar_chart" size={20} className="text-primary-500" filled/> الزيارات الأسبوعية</h3>
              <div className="overflow-x-auto">
                <svg width={weekData.length*(barW+gap)+gap+40} height={chartH+55} className="mx-auto">
                  {/* Grid */}
                  {[0,.25,.5,.75,1].map((pct,i)=>{
                    const y=pct*chartH;
                    return <g key={i}><line x1={40} y1={y} x2={weekData.length*(barW+gap)+gap+40} y2={y} stroke="#f1f5f9" strokeWidth={1}/><text x={36} y={y+4} fontSize={9} fill="#94a3b8" textAnchor="end">{Math.round(maxVisits*(1-pct))}</text></g>;
                  })}
                  {weekData.map((d,i)=>{
                    const barH2=maxVisits>0?(d.visits/maxVisits)*chartH:3;
                    const x=40+gap+i*(barW+gap); const y=chartH-barH2;
                    const isToday=i===now.getDay(); const color=isToday?barColors[0]:barColors[i]||'#94a3b8';
                    return (
                      <g key={i}>
                        <rect x={x+2} y={y+3} width={barW} height={barH2} rx={5} fill="#00000015"/>
                        <rect x={x} y={y} width={barW} height={barH2} rx={5} fill={color} opacity={isToday?1:0.72}/>
                        <rect x={x} y={y} width={barW} height={Math.min(barH2*.35,10)} rx={5} fill="rgba(255,255,255,0.25)"/>
                        {d.visits>0 && <text x={x+barW/2} y={y-5} fontSize={10} fontWeight="bold" fill={color} textAnchor="middle">{d.visits}</text>}
                        <text x={x+barW/2} y={chartH+18} fontSize={10} fontWeight={isToday?'bold':'normal'} fill={isToday?'#3b82f6':'#94a3b8'} textAnchor="middle">{d.dayShort}</text>
                        {isToday && <circle cx={x+barW/2} cy={chartH+30} r={3} fill="#3b82f6"/>}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="flex justify-center gap-4 mt-2 text-xs text-surface-400">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary-500"/><span>اليوم</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-surface-300"/><span>أيام أخرى</span></div>
              </div>
            </div>

            {/* Breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[{title:'الأجهزة',icon:'devices',data:deviceData},{title:'المتصفحات',icon:'language',data:browserData},{title:'الدول',icon:'public',data:countryData.map(([l,v])=>({l,v:Math.round((v/Math.max(1,totalUsers))*100),c:'#3b82f6'}))}].map((card,ci)=>(
                <div key={ci} className="bg-white rounded-xl border border-surface-100 p-5">
                  <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2"><Icon name={card.icon} size={18} className="text-primary-500"/>{card.title}</h3>
                  <div className="space-y-3">
                    {card.data.map((d,di)=>(
                      <div key={di}>
                        <div className="flex justify-between text-xs mb-1"><span className="font-medium text-surface-700">{d.l}</span><span style={{color:d.c}} className="font-semibold">{d.v}%</span></div>
                        <div className="w-full bg-surface-100 rounded-full h-2"><div className="rounded-full h-2 transition-all" style={{width:`${d.v}%`,backgroundColor:d.c}}/></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-surface-100 p-5">
              <h3 className="font-bold text-surface-900 mb-4 flex items-center gap-2"><Icon name="table_chart" size={18} className="text-primary-500"/> تفاصيل الأسبوع</h3>
              <table className="w-full text-sm">
                <thead className="bg-surface-50 text-xs text-surface-500"><tr>
                  <th className="text-right p-3 font-semibold">اليوم</th>
                  <th className="text-right p-3 font-semibold">الزيارات</th>
                  <th className="text-right p-3 font-semibold">الاختبارات</th>
                  <th className="text-right p-3 font-semibold">التغيير</th>
                </tr></thead>
                <tbody>
                  {weekData.map((d,i)=>{
                    const prev=i>0?weekData[i-1].visits:null;
                    const ch=prev!==null?d.visits-prev:null;
                    const isToday=i===now.getDay();
                    return (
                      <tr key={i} className={cn('border-t border-surface-50',isToday&&'bg-primary-50')}>
                        <td className="p-3"><span className={cn('font-medium',isToday?'text-primary-600':'text-surface-700')}>{d.day}{isToday&&<span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 rounded-full mr-1">اليوم</span>}</span></td>
                        <td className="p-3 font-semibold">{d.visits}</td>
                        <td className="p-3 text-surface-500">{d.quizzes}</td>
                        <td className="p-3">{ch!==null?<span className={cn('text-xs font-semibold',ch>0?'text-success-600':ch<0?'text-danger-600':'text-surface-400')}>{ch>0?'↑':ch<0?'↓':'—'} {Math.abs(ch)}</span>:'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={()=>setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{modal.data?.id?'تعديل':'إضافة'}</h3>
            {modal.type==='section' && <>{renderInput('الاسم بالعربية','nameAr')}{renderInput('الاسم بالإيطالية','nameIt')}{renderInput('الوصف بالعربية','descriptionAr','textarea')}{renderInput('الوصف بالإيطالية','descriptionIt','textarea')}{renderInput('الأيقونة','icon')}{renderInput('اللون','color','color')}{renderInput('صورة','image','image')}{renderInput('الترتيب','order','number')}</>}
            {modal.type==='lesson' && <>{renderInput('القسم','sectionId','select-section')}{renderInput('العنوان بالعربية','titleAr')}{renderInput('العنوان بالإيطالية','titleIt')}{renderInput('المحتوى بالعربية','contentAr','textarea')}{renderInput('المحتوى بالإيطالية','contentIt','textarea')}{renderInput('صورة','image','image')}{renderInput('الترتيب','order','number')}</>}
            {modal.type==='question' && <>{renderInput('القسم','sectionId','select-section')}{renderInput('الدرس','lessonId','select-lesson')}{renderInput('السؤال بالعربية','questionAr','textarea')}{renderInput('السؤال بالإيطالية','questionIt','textarea')}{renderInput('الإجابة','isTrue','boolean')}{renderInput('الشرح بالعربية','explanationAr','textarea')}{renderInput('الشرح بالإيطالية','explanationIt','textarea')}{renderInput('الصعوبة','difficulty','select-difficulty')}{renderInput('صورة','image','image')}{renderInput('الترتيب','order','number')}</>}
            {modal.type==='sign' && <>{renderInput('الاسم بالعربية','nameAr')}{renderInput('الاسم بالإيطالية','nameIt')}{renderInput('الوصف بالعربية','descriptionAr','textarea')}{renderInput('الوصف بالإيطالية','descriptionIt','textarea')}{renderInput('التصنيف','category')}{renderInput('صورة','image','image')}{renderInput('الترتيب','order','number')}</>}
            {modal.type==='dictSection' && <>{renderInput('الاسم بالعربية','nameAr')}{renderInput('الاسم بالإيطالية','nameIt')}{renderInput('الأيقونة','icon')}{renderInput('الترتيب','order','number')}</>}
            {modal.type==='dictEntry' && <>{renderInput('القسم','sectionId','select-dict-section')}{renderInput('المصطلح بالإيطالية','termIt')}{renderInput('المصطلح بالعربية','termAr')}{renderInput('التعريف بالإيطالية','definitionIt','textarea')}{renderInput('التعريف بالعربية','definitionAr','textarea')}{renderInput('الترتيب','order','number')}</>}
            <div className="flex gap-3 mt-6"><Button fullWidth variant="ghost" onClick={()=>setModal(null)}>إلغاء</Button><Button fullWidth onClick={saveItem}>حفظ</Button></div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setConfirmDel(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e=>e.stopPropagation()}>
            <Icon name="warning" size={40} className="text-danger-500 mx-auto mb-4"/>
            <h3 className="text-lg font-bold text-center mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-surface-500 text-center mb-6">هل أنت متأكد؟ لا يمكن التراجع.</p>
            <div className="flex gap-3"><Button fullWidth variant="ghost" onClick={()=>setConfirmDel(null)}>إلغاء</Button><Button fullWidth variant="danger" onClick={handleDelete}>حذف</Button></div>
          </div>
        </div>
      )}

      {/* BULK CONFIRM */}
      {confirmBulk && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setConfirmBulk(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e=>e.stopPropagation()}>
            <Icon name={confirmBulk.action==='delete'?'delete_sweep':'archive'} size={40} className={confirmBulk.action==='delete'?'text-danger-500':'text-warning-500'} />
            <h3 className="text-lg font-bold text-center mt-4 mb-2">{confirmBulk.action==='delete'?'حذف المحدد':'أرشفة المحدد'}</h3>
            <p className="text-sm text-surface-500 text-center mb-6">{confirmBulk.type==='users'?`${selectedUsers.size} مستخدم`:`${Array.from(selectedIds[confirmBulk.type]||[]).length} عنصر`}</p>
            <div className="flex gap-3"><Button fullWidth variant="ghost" onClick={()=>setConfirmBulk(null)}>إلغاء</Button><Button fullWidth variant={confirmBulk.action==='delete'?'danger':'secondary'} onClick={handleBulkAction}>{confirmBulk.action==='delete'?'حذف':'أرشفة'}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function CrudTable({ title, listKey, items, search, setSearch, selected, onToggleSelect, onToggleAll, onBulkDelete, onBulkArchive, columns, onAdd, onEdit, onDelete, onExport, onImport, filterFn }: {
  title: string; listKey: string;
  items: unknown[]; search: string; setSearch: (s: string) => void;
  selected: Set<string>; onToggleSelect: (id: string) => void; onToggleAll: (ids: string[]) => void;
  onBulkDelete: () => void; onBulkArchive?: () => void;
  columns: { key: string; label: string; render?: (v: unknown) => unknown }[];
  onAdd: () => void; onEdit: (item: unknown) => void; onDelete: (id: string) => void;
  onExport: () => void; onImport: () => void; filterFn: (item: unknown) => boolean;
}) {
  const filtered = items.filter(filterFn) as Record<string, unknown>[];
  const filteredIds = filtered.map(i => String(i.id));
  const allSel = filteredIds.length>0 && filteredIds.every(id=>selected.has(id));
  return (
    <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">{title} ({items.length})</h2>
          {selected.size>0 && <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">{selected.size} محدد</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm w-40" placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {selected.size>0 && <>
            <Button size="sm" variant="danger" icon={<Icon name="delete" size={14}/>} onClick={onBulkDelete}>حذف ({selected.size})</Button>
            {onBulkArchive && <Button size="sm" variant="secondary" icon={<Icon name="archive" size={14}/>} onClick={onBulkArchive}>أرشفة ({selected.size})</Button>}
          </>}
          <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400" onClick={onExport} title="تصدير"><Icon name="download" size={18}/></button>
          <button className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400" onClick={onImport} title="استيراد"><Icon name="upload" size={18}/></button>
          <Button size="sm" onClick={onAdd} icon={<Icon name="add" size={16}/>}>إضافة</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-50"><tr>
            <th className="p-3 w-10"><input type="checkbox" className="rounded" checked={allSel} onChange={()=>onToggleAll(filteredIds)}/></th>
            {columns.map(c=><th key={c.key} className="text-right p-3 font-semibold text-surface-600">{c.label}</th>)}
            <th className="text-right p-3 font-semibold text-surface-600 w-20">إجراءات</th>
          </tr></thead>
          <tbody>
            {filtered.map(item=>{
              const itemId=String(item.id); const isSel=selected.has(itemId);
              return (
                <tr key={itemId} className={cn('border-t border-surface-50 hover:bg-surface-50',isSel&&'bg-primary-50')}>
                  <td className="p-3"><input type="checkbox" className="rounded" checked={isSel} onChange={()=>onToggleSelect(itemId)}/></td>
                  {columns.map(c=><td key={c.key} className="p-3 max-w-xs truncate">{String(c.render?c.render(item[c.key]):(item[c.key]??''))}</td>)}
                  <td className="p-3"><div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-surface-100" onClick={()=>onEdit(item)}><Icon name="edit" size={16} className="text-primary-500"/></button>
                    <button className="p-1 rounded hover:bg-surface-100" onClick={()=>onDelete(item.id as string)}><Icon name="delete" size={16} className="text-danger-500"/></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0 && <div className="p-8 text-center text-surface-400">لا توجد بيانات</div>}
      </div>
    </div>
  );
}

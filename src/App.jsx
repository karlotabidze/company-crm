import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownToLine, Bell, BriefcaseBusiness, Building2, CalendarDays,
  Check, ChevronDown, CircleHelp, Contact, FileBarChart, Filter, Grid2X2,
  LayoutDashboard, ListTodo, LogOut, Menu, MoreHorizontal, Plus, Search,
  Settings, Target, Users, Wallet, X, Kanban, List, Mail, Phone, Trash2,
  RefreshCw, LockKeyhole, UserRound, Eye, EyeOff
} from 'lucide-react'
import {
  deleteRow, getSession, insertRow, isSupabaseConfigured, loadCrm,
  signIn, signOut, signUp, updateRow
} from './lib/supabase'

const STAGES = [
  { value: 'lead', label: 'ახალი' },
  { value: 'qualification', label: 'კვალიფიკაცია' },
  { value: 'proposal', label: 'შეთავაზება' },
  { value: 'negotiation', label: 'მოლაპარაკება' },
  { value: 'won', label: 'მოგებული' },
  { value: 'lost', label: 'წაგებული' },
]
const STAGE_LABEL = Object.fromEntries(STAGES.map(stage => [stage.value, stage.label]))
const money = value => new Intl.NumberFormat('ka-GE', { style: 'currency', currency: 'GEL', maximumFractionDigits: 0 }).format(Number(value || 0))
const dateLabel = value => value ? new Date(value).toLocaleDateString('ka-GE') : '—'
const blankDeal = { title: '', company: '', contact: '', value: '', stage: 'lead', expected_close_date: '', description: '' }

export default function App() {
  const [session, setSession] = useState(getSession)
  const [page, setPage] = useState('მიმოხილვა')
  const [data, setData] = useState({ crm_profiles: [], crm_companies: [], crm_contacts: [], crm_deals: [], crm_tasks: [], crm_activities: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('list')
  const [modal, setModal] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dealForm, setDealForm] = useState(blankDeal)
  const [companyForm, setCompanyForm] = useState({ name: '', industry: '', website: '', phone: '', email: '', address: '', notes: '' })
  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', company_id: '', position: '', email: '', phone: '', notes: '' })
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_at: '', priority: 'normal' })
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [dragId, setDragId] = useState(null)

  const notify = message => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }
  const refresh = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError('')
    try { setData(await loadCrm()) }
    catch (err) { setError(err.message); }
    finally { setLoading(false) }
  }, [session])
  useEffect(() => { refresh() }, [refresh])

  const user = session?.user
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'მომხმარებელი'
  const isAdmin = data.crm_profiles.find(profile => profile.id === user?.id)?.role === 'admin'
  const nav = [
    { group: 'სამუშაო სივრცე', items: [['მიმოხილვა', LayoutDashboard], ['გარიგებები', Wallet], ['ლიდები', Target], ['კონტაქტები', Contact], ['კომპანიები', Building2]] },
    { group: 'მართვა', items: [['დავალებები', ListTodo], ['აქტივობები', Activity], ['ანალიტიკა', FileBarChart]] },
  ]
  const filteredDeals = useMemo(() => data.crm_deals.filter(deal => {
    const company = data.crm_companies.find(item => item.id === deal.company_id)?.name || ''
    const contact = data.crm_contacts.find(item => item.id === deal.contact_id)
    const contactName = contact ? [contact.first_name, contact.last_name].join(' ') : ''
    return [deal.title, company, contactName, STAGE_LABEL[deal.stage] || deal.stage].join(' ').toLowerCase().includes(query.toLowerCase())
  }), [data, query])
  const activeDeals = data.crm_deals.filter(deal => !['won', 'lost'].includes(deal.stage))
  const pipelineValue = activeDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
  const wonValue = data.crm_deals.filter(deal => deal.stage === 'won').reduce((sum, deal) => sum + Number(deal.value || 0), 0)

  const handleAuth = async event => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      if (authMode === 'login') {
        const result = await signIn(authForm.email.trim(), authForm.password)
        setSession(result)
        notify('სისტემაში წარმატებით შეხვედით')
      } else {
        const result = await signUp(authForm.name.trim(), authForm.email.trim(), authForm.password)
        if (result.access_token) {
          setSession(result)
          notify('ანგარიში შეიქმნა')
        } else {
          notify('რეგისტრაცია მიღებულია. დაადასტურეთ ელფოსტა და შემდეგ შედით სისტემაში.')
          setAuthMode('login')
        }
      }
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const logout = async () => {
    await signOut()
    setSession(null)
    setData({ crm_profiles: [], crm_companies: [], crm_contacts: [], crm_deals: [], crm_tasks: [], crm_activities: [] })
  }
  const addCompany = async values => {
    const row = await insertRow('crm_companies', { ...values, created_by: user.id })
    setData(current => ({ ...current, crm_companies: [row, ...current.crm_companies] }))
    return row
  }
  const addDeal = async event => {
    event.preventDefault()
    if (!dealForm.title.trim() || !dealForm.company.trim()) return
    setSaving(true); setError('')
    try {
      let company = data.crm_companies.find(item => item.name.trim().toLowerCase() === dealForm.company.trim().toLowerCase())
      if (!company) company = await addCompany({ name: dealForm.company.trim() })
      let contactId = null
      if (dealForm.contact.trim()) {
        const contact = await insertRow('crm_contacts', {
          first_name: dealForm.contact.trim(), company_id: company.id, created_by: user.id,
        })
        setData(current => ({ ...current, crm_contacts: [contact, ...current.crm_contacts] }))
        contactId = contact.id
      }
      const row = await insertRow('crm_deals', {
        title: dealForm.title.trim(), company_id: company.id, contact_id: contactId,
        value: Number(dealForm.value || 0), stage: dealForm.stage,
        expected_close_date: dealForm.expected_close_date || null,
        description: dealForm.description, owner_id: user.id, created_by: user.id,
      })
      setData(current => ({ ...current, crm_deals: [row, ...current.crm_deals] }))
      setDealForm(blankDeal); setModal(''); notify('გარიგება დაემატა')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  const saveCompany = async event => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const row = await addCompany(companyForm)
      setCompanyForm({ name: '', industry: '', website: '', phone: '', email: '', address: '', notes: '' })
      setModal(''); notify('კომპანია დაემატა')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  const saveContact = async event => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const row = await insertRow('crm_contacts', { ...contactForm, company_id: contactForm.company_id || null, created_by: user.id })
      setData(current => ({ ...current, crm_contacts: [row, ...current.crm_contacts] }))
      setContactForm({ first_name: '', last_name: '', company_id: '', position: '', email: '', phone: '', notes: '' })
      setModal(''); notify('კონტაქტი დაემატა')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  const saveTask = async event => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const row = await insertRow('crm_tasks', { ...taskForm, due_at: taskForm.due_at || null, assigned_to: user.id, created_by: user.id })
      setData(current => ({ ...current, crm_tasks: [row, ...current.crm_tasks] }))
      setTaskForm({ title: '', description: '', due_at: '', priority: 'normal' })
      setModal(''); notify('დავალება დაემატა')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }
  const changeStage = async (deal, stage) => {
    try {
      const updated = await updateRow('crm_deals', deal.id, { stage })
      setData(current => ({ ...current, crm_deals: current.crm_deals.map(item => item.id === deal.id ? updated : item) }))
    } catch (err) { setError(err.message) }
  }
  const toggleTask = async task => {
    const status = task.status === 'done' ? 'todo' : 'done'
    try {
      const updated = await updateRow('crm_tasks', task.id, { status })
      setData(current => ({ ...current, crm_tasks: current.crm_tasks.map(item => item.id === task.id ? updated : item) }))
    } catch (err) { setError(err.message) }
  }
  const removeRow = async (table, id, key) => {
    if (!window.confirm('ნამდვილად გსურთ ჩანაწერის წაშლა?')) return
    try {
      await deleteRow(table, id)
      setData(current => ({ ...current, [key]: current[key].filter(item => item.id !== id) }))
      notify('ჩანაწერი წაიშალა')
    } catch (err) { setError(err.message) }
  }
  const exportDeals = () => {
    const rows = [['გარიგება','კომპანია','კონტაქტი','თანხა','ვალუტა','ეტაპი','დახურვის თარიღი']]
    filteredDeals.forEach(deal => {
      const company = data.crm_companies.find(item => item.id === deal.company_id)
      const contact = data.crm_contacts.find(item => item.id === deal.contact_id)
      rows.push([deal.title, company?.name || '', contact ? [contact.first_name,contact.last_name].join(' ') : '', deal.value, deal.currency, STAGE_LABEL[deal.stage] || deal.stage, deal.expected_close_date || ''])
    })
    const csv = '\uFEFF' + rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"','""') + '"').join(';')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = 'company-crm-deals.csv'; link.click(); URL.revokeObjectURL(url)
  }
  const setActivePage = value => { setPage(value); setSidebarOpen(false); setError('') }

  if (!isSupabaseConfigured) return <SetupScreen />
  if (!session) return <AuthScreen mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onSubmit={handleAuth} saving={saving} error={error} showPassword={showPassword} setShowPassword={setShowPassword} />

  return <div className="crm-app">
    <aside className={`crm-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="crm-brand"><div className="crm-brand-icon">c</div><div><b>company<span>CRM</span></b><small>სამუშაო სივრცე</small></div><button className="crm-mobile-close" onClick={() => setSidebarOpen(false)}><X size={18}/></button></div>
      <div className="crm-workspace"><div className="crm-workspace-icon">C</div><div><b>Company Workspace</b><small>CRM პლატფორმა</small></div><ChevronDown size={15}/></div>
      <div className="crm-nav">{nav.map(section => <div className="crm-nav-group" key={section.group}><small>{section.group}</small>{section.items.map(([label, Icon]) => <button key={label} className={page === label ? 'active' : ''} onClick={() => setActivePage(label)}><Icon size={18}/>{label}{label === 'დავალებები' && <i>{data.crm_tasks.filter(task => task.status !== 'done').length}</i>}</button>)}</div>)}</div>
      <div className="crm-sidebar-foot"><button onClick={() => notify('პარამეტრები მალე დაემატება')}><Settings size={17}/>პარამეტრები</button><div className="crm-user"><div className="crm-user-avatar">{userName.slice(0,1).toUpperCase()}</div><div><b>{userName}</b><small>{isAdmin ? 'ადმინისტრატორი' : 'მომხმარებელი'}</small></div><button title="გასვლა" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    {sidebarOpen && <button className="crm-scrim" onClick={() => setSidebarOpen(false)} aria-label="მენიუს დახურვა"/>}
    <main className="crm-main">
      <header className="crm-topbar"><div className="crm-top-left"><button className="crm-mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button><span>სამუშაო სივრცე</span><b>/ {page}</b></div><div className="crm-top-actions"><label className="crm-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ძიება CRM-ში..."/></label><button onClick={refresh} title="განახლება"><RefreshCw size={17}/></button><div className="crm-top-avatar">{userName.slice(0,1).toUpperCase()}</div></div></header>
      <section className="crm-content">
        <div className="crm-heading"><div><small>{new Date().toLocaleDateString('ka-GE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</small><h1>{page === 'მიმოხილვა' ? `გამარჯობა, ${userName} 👋` : page}</h1><p>{page === 'მიმოხილვა' ? 'თქვენი კომპანიის გაყიდვები და აქტივობები ერთ სივრცეში.' : 'მართეთ თქვენი კლიენტები და გაყიდვების პროცესი.'}</p></div><div className="crm-heading-actions">{page === 'გარიგებები' && <button className="crm-secondary" onClick={exportDeals}><ArrowDownToLine size={16}/> ექსპორტი</button>}{page !== 'მიმოხილვა' && <button className="crm-primary" onClick={() => setModal(page === 'კომპანიები' ? 'company' : page === 'კონტაქტები' ? 'contact' : page === 'დავალებები' ? 'task' : 'deal')}><Plus size={17}/> დამატება</button>}</div></div>
        {error && <div className="crm-error"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
        {loading && <div className="crm-loading"><RefreshCw size={16}/> მონაცემები იტვირთება...</div>}
        {page === 'მიმოხილვა' && <Dashboard data={data} pipelineValue={pipelineValue} wonValue={wonValue} setPage={setActivePage} toggleTask={toggleTask}/>}
        {(page === 'გარიგებები' || page === 'ლიდები') && <DealsSection deals={filteredDeals} companies={data.crm_companies} contacts={data.crm_contacts} view={view} setView={setView} onStage={changeStage} onExport={exportDeals} onAdd={() => setModal('deal')}/>}
        {page === 'კომპანიები' && <CompaniesSection companies={data.crm_companies.filter(item => [item.name,item.industry,item.email].join(' ').toLowerCase().includes(query.toLowerCase()))} onDelete={id => removeRow('crm_companies',id,'crm_companies')}/>}
        {page === 'კონტაქტები' && <ContactsSection contacts={data.crm_contacts.filter(item => [item.first_name,item.last_name,item.email,item.phone].join(' ').toLowerCase().includes(query.toLowerCase()))} companies={data.crm_companies} onDelete={id => removeRow('crm_contacts',id,'crm_contacts')}/>}
        {page === 'დავალებები' && <TasksSection tasks={data.crm_tasks} onToggle={toggleTask} onDelete={id => removeRow('crm_tasks',id,'crm_tasks')}/>}
        {page === 'აქტივობები' && <ActivitiesSection activities={data.crm_activities}/>}
        {page === 'ანალიტიკა' && <Dashboard data={data} pipelineValue={pipelineValue} wonValue={wonValue} setPage={setActivePage} toggleTask={toggleTask}/>}
      </section>
    </main>
    {modal && <Modal title={modal === 'deal' ? 'ახალი გარიგება' : modal === 'company' ? 'ახალი კომპანია' : modal === 'contact' ? 'ახალი კონტაქტი' : 'ახალი დავალება'} onClose={() => setModal('')}>
      {modal === 'deal' && <form onSubmit={addDeal}><Field label="გარიგების დასახელება" required><input required value={dealForm.title} onChange={e => setDealForm({...dealForm,title:e.target.value})} placeholder="მაგ. წლიური მომსახურება"/></Field><Field label="კომპანიის დასახელება" required><input required list="crm-companies" value={dealForm.company} onChange={e => setDealForm({...dealForm,company:e.target.value})} placeholder="კომპანიის სახელი"/><datalist id="crm-companies">{data.crm_companies.map(company => <option key={company.id} value={company.name}/>)}</datalist></Field><Field label="საკონტაქტო პირი"><input value={dealForm.contact} onChange={e => setDealForm({...dealForm,contact:e.target.value})} placeholder="სახელი და გვარი"/></Field><div className="crm-form-grid"><Field label="თანხა (₾)"><input type="number" min="0" step="0.01" value={dealForm.value} onChange={e => setDealForm({...dealForm,value:e.target.value})} placeholder="0"/></Field><Field label="ეტაპი"><select value={dealForm.stage} onChange={e => setDealForm({...dealForm,stage:e.target.value})}>{STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></Field></div><Field label="დახურვის სავარაუდო თარიღი"><input type="date" value={dealForm.expected_close_date} onChange={e => setDealForm({...dealForm,expected_close_date:e.target.value})}/></Field><Field label="აღწერა"><textarea rows="3" value={dealForm.description} onChange={e => setDealForm({...dealForm,description:e.target.value})}/></Field><ModalActions onCancel={() => setModal('')} saving={saving}/></form>}
      {modal === 'company' && <form onSubmit={saveCompany}><Field label="კომპანიის დასახელება" required><input required value={companyForm.name} onChange={e => setCompanyForm({...companyForm,name:e.target.value})}/></Field><Field label="საქმიანობის სფერო"><input value={companyForm.industry} onChange={e => setCompanyForm({...companyForm,industry:e.target.value})}/></Field><div className="crm-form-grid"><Field label="ტელეფონი"><input value={companyForm.phone} onChange={e => setCompanyForm({...companyForm,phone:e.target.value})}/></Field><Field label="ელფოსტა"><input type="email" value={companyForm.email} onChange={e => setCompanyForm({...companyForm,email:e.target.value})}/></Field></div><Field label="ვებგვერდი"><input value={companyForm.website} onChange={e => setCompanyForm({...companyForm,website:e.target.value})}/></Field><Field label="მისამართი"><input value={companyForm.address} onChange={e => setCompanyForm({...companyForm,address:e.target.value})}/></Field><ModalActions onCancel={() => setModal('')} saving={saving}/></form>}
      {modal === 'contact' && <form onSubmit={saveContact}><div className="crm-form-grid"><Field label="სახელი" required><input required value={contactForm.first_name} onChange={e => setContactForm({...contactForm,first_name:e.target.value})}/></Field><Field label="გვარი"><input value={contactForm.last_name} onChange={e => setContactForm({...contactForm,last_name:e.target.value})}/></Field></div><Field label="კომპანია"><select value={contactForm.company_id} onChange={e => setContactForm({...contactForm,company_id:e.target.value})}><option value="">აირჩიეთ კომპანია</option>{data.crm_companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field><Field label="პოზიცია"><input value={contactForm.position} onChange={e => setContactForm({...contactForm,position:e.target.value})}/></Field><div className="crm-form-grid"><Field label="ელფოსტა"><input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm,email:e.target.value})}/></Field><Field label="ტელეფონი"><input value={contactForm.phone} onChange={e => setContactForm({...contactForm,phone:e.target.value})}/></Field></div><ModalActions onCancel={() => setModal('')} saving={saving}/></form>}
      {modal === 'task' && <form onSubmit={saveTask}><Field label="დავალების დასახელება" required><input required value={taskForm.title} onChange={e => setTaskForm({...taskForm,title:e.target.value})}/></Field><Field label="აღწერა"><textarea rows="3" value={taskForm.description} onChange={e => setTaskForm({...taskForm,description:e.target.value})}/></Field><div className="crm-form-grid"><Field label="შესრულების ვადა"><input type="datetime-local" value={taskForm.due_at} onChange={e => setTaskForm({...taskForm,due_at:e.target.value})}/></Field><Field label="პრიორიტეტი"><select value={taskForm.priority} onChange={e => setTaskForm({...taskForm,priority:e.target.value})}><option value="low">დაბალი</option><option value="normal">ჩვეულებრივი</option><option value="high">მაღალი</option><option value="urgent">სასწრაფო</option></select></Field></div><ModalActions onCancel={() => setModal('')} saving={saving}/></form>}
    </Modal>}
    {toast && <div className="crm-toast"><Check size={17}/>{toast}</div>}
  </div>
}

function SetupScreen() {
  return <div className="crm-auth-shell"><div className="crm-auth-card"><div className="crm-brand centered"><div className="crm-brand-icon">c</div><div><b>company<span>CRM</span></b><small>Supabase კავშირი</small></div></div><h1>საჭიროა გარემოს კონფიგურაცია</h1><p>Render-ის Environment-ში დაამატეთ შემდეგი ცვლადები და ხელახლა გაუშვით Deploy.</p><pre>VITE_SUPABASE_URL=https://fukgyktvdevbiocmvihf.supabase.co<br/>VITE_SUPABASE_ANON_KEY=თქვენი_publishable_key</pre><p className="crm-auth-help">გასაღები უნდა იყოს Supabase-ის publishable key. არასოდეს გამოიყენოთ service_role გასაღები ბრაუზერში.</p></div></div>
}

function AuthScreen({ mode,setMode,form,setForm,onSubmit,saving,error,showPassword,setShowPassword }) {
  return <div className="crm-auth-shell"><form className="crm-auth-card" onSubmit={onSubmit}><div className="crm-brand centered"><div className="crm-brand-icon">c</div><div><b>company<span>CRM</span></b><small>სამუშაო სივრცე</small></div></div><h1>{mode === 'login' ? 'კეთილი იყოს თქვენი დაბრუნება' : 'შექმენით ანგარიში'}</h1><p>{mode === 'login' ? 'შედით თქვენს CRM სამუშაო სივრცეში.' : 'დარეგისტრირდით და დაიწყეთ კლიენტების მართვა.'}</p>{mode === 'signup' && <Field label="სრული სახელი" required><input required autoComplete="name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="თქვენი სახელი"/></Field>}<Field label="ელფოსტა" required><input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="name@company.com"/></Field><Field label="პაროლი" required><div className="crm-password"><input required minLength="8" type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="მინიმუმ 8 სიმბოლო"/><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></Field>{error && <div className="crm-error">{error}</div>}<button className="crm-primary crm-auth-submit" disabled={saving}>{saving?'მუშავდება...':mode==='login'?'შესვლა':'რეგისტრაცია'}</button><div className="crm-auth-switch">{mode==='login'?'არ გაქვთ ანგარიში?':'უკვე გაქვთ ანგარიში?'} <button type="button" onClick={() => setMode(mode==='login'?'signup':'login')}>{mode==='login'?'რეგისტრაცია':'შესვლა'}</button></div></form></div>
}

function Field({label,required,children}) { return <label className="crm-field"><span>{label}{required?' *':''}</span>{children}</label> }
function Modal({title,onClose,children}) { return <div className="crm-modal-backdrop" onMouseDown={event => {if(event.target===event.currentTarget)onClose()}}><div className="crm-modal"><div className="crm-modal-head"><div><h2>{title}</h2><p>შეავსეთ ჩანაწერის ინფორმაცია</p></div><button onClick={onClose}><X size={19}/></button></div>{children}</div></div> }
function ModalActions({onCancel,saving}) { return <div className="crm-modal-actions"><button type="button" className="crm-secondary" onClick={onCancel}>გაუქმება</button><button className="crm-primary" disabled={saving}>{saving?'ინახება...':'შენახვა'}</button></div> }

function Dashboard({data,pipelineValue,wonValue,setPage,toggleTask}) {
  const openTasks = data.crm_tasks.filter(task => task.status !== 'done')
  const cards = [
    ['აქტიური გარიგებები', data.crm_deals.filter(deal => !['won','lost'].includes(deal.stage)).length, BriefcaseBusiness, 'violet'],
    ['პოტენციური შემოსავალი', money(pipelineValue), Wallet, 'blue'],
    ['მოგებული გარიგებები', money(wonValue), Activity, 'green'],
    ['კომპანიები', data.crm_companies.length, Building2, 'orange'],
  ]
  return <><div className="crm-stats">{cards.map(([label,value,Icon,color])=><div className="crm-stat" key={label}><div><span>{label}</span><i className={color}><Icon size={18}/></i></div><b>{value}</b><small>მიმდინარე მონაცემები</small></div>)}</div><div className="crm-dash-grid"><section className="crm-panel"><PanelHead title="გაყიდვების მილსადენი" subtitle="გარიგებების რაოდენობა ეტაპების მიხედვით" action="ყველას ნახვა" onAction={() => setPage('გარიგებები')}/><div className="crm-pipeline">{STAGES.map(stage=>{const count=data.crm_deals.filter(deal=>deal.stage===stage.value).length;return <div key={stage.value}><span>{stage.label}</span><div><i style={{width:`${Math.max(2,count/Math.max(1,data.crm_deals.length)*100)}%`}}/></div><b>{count}</b></div>})}</div></section><section className="crm-panel"><PanelHead title="ჩემი დავალებები" subtitle="ღია დავალებები" action="ყველა" onAction={() => setPage('დავალებები')}/>{openTasks.slice(0,5).map(task=><div className="crm-task-row" key={task.id}><button className="crm-check" onClick={() => toggleTask(task)}><Check size={13}/></button><div><b>{task.title}</b><small>{task.due_at?dateLabel(task.due_at):'ვადა მითითებული არ არის'}</small></div></div>)}{!openTasks.length&&<Empty text="ღია დავალებები ჯერ არ არის"/>}</section></div><section className="crm-panel"><PanelHead title="ბოლო გარიგებები" subtitle="ბოლოს დამატებული ჩანაწერები" action="ყველას ნახვა" onAction={() => setPage('გარიგებები')}/><DealTable deals={data.crm_deals.slice(0,5)} companies={data.crm_companies} contacts={data.crm_contacts}/></section></>
}
function PanelHead({title,subtitle,action,onAction}) { return <div className="crm-panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action&&<button onClick={onAction}>{action} →</button>}</div> }
function DealsSection({deals,companies,contacts,view,setView,onStage,onAdd,onExport}) {
  return <section className="crm-panel"><div className="crm-panel-head"><div><h2>გარიგებები</h2><p>სულ {deals.length} ჩანაწერი · სია ან კანბანის დაფა</p></div><div className="crm-view-tools"><button onClick={onExport}><ArrowDownToLine size={15}/> ექსპორტი</button><button className={view==='list'?'selected':''} onClick={()=>setView('list')}><List size={16}/> სია</button><button className={view==='board'?'selected':''} onClick={()=>setView('board')}><Kanban size={16}/> კანბანი</button><button className="crm-primary" onClick={onAdd}><Plus size={15}/> ახალი</button></div></div>{view==='list'?<DealTable deals={deals} companies={companies} contacts={contacts} onStage={onStage}/>:<div className="crm-kanban">{STAGES.map(stage=><div className="crm-kanban-col" key={stage.value} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const id=event.dataTransfer.getData('text/plain');const deal=deals.find(item=>item.id===id);if(deal)onStage(deal,stage.value)}}><div className="crm-kanban-head"><b>{stage.label}</b><span>{deals.filter(deal=>deal.stage===stage.value).length}</span></div>{deals.filter(deal=>deal.stage===stage.value).map(deal=><div className="crm-deal-card" key={deal.id} draggable onDragStart={event=>event.dataTransfer.setData('text/plain',deal.id)}><b>{deal.title}</b><small>{companies.find(company=>company.id===deal.company_id)?.name||'კომპანია მითითებული არ არის'}</small><strong>{money(deal.value)}</strong><select value={deal.stage} onChange={event=>onStage(deal,event.target.value)}>{STAGES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></div>)}</div>)}</div>}</section>
}
function DealTable({deals,companies,contacts,onStage}) {
  if (!deals.length) return <Empty text="გარიგებები ჯერ არ არის. დაამატეთ პირველი გარიგება."/>
  return <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>გარიგება</th><th>კომპანია / კონტაქტი</th><th>თანხა</th><th>ეტაპი</th><th>დახურვა</th></tr></thead><tbody>{deals.map(deal=>{const company=companies.find(item=>item.id===deal.company_id);const contact=contacts.find(item=>item.id===deal.contact_id);return <tr key={deal.id}><td><b>{deal.title}</b><small>#{deal.id.slice(0,8)}</small></td><td><b>{company?.name||'—'}</b><small>{contact?[contact.first_name,contact.last_name].join(' '):'კონტაქტი არ არის'}</small></td><td><strong>{money(deal.value)}</strong></td><td>{onStage?<select className="crm-stage-select" value={deal.stage} onChange={event=>onStage(deal,event.target.value)}>{STAGES.map(stage=><option key={stage.value} value={stage.value}>{stage.label}</option>)}</select>:<span className="crm-stage-pill">{STAGE_LABEL[deal.stage]||deal.stage}</span>}</td><td>{dateLabel(deal.expected_close_date)}</td></tr>})}</tbody></table></div>
}
function CompaniesSection({companies,onDelete}) { return <div className="crm-panel"><PanelHead title="კომპანიები" subtitle={`სულ ${companies.length} კომპანია`}/>{companies.length?<div className="crm-entity-list">{companies.map(company=><div className="crm-entity" key={company.id}><div className="crm-entity-icon"><Building2 size={18}/></div><div><b>{company.name}</b><small>{company.industry||'სფერო მითითებული არ არის'} · {company.email||company.phone||'საკონტაქტო ინფორმაცია არ არის'}</small></div><button onClick={()=>onDelete(company.id)} title="წაშლა"><Trash2 size={16}/></button></div>)}</div>:<Empty text="კომპანიები ჯერ არ არის. დაამატეთ პირველი კომპანია."/>}</div> }
function ContactsSection({contacts,companies,onDelete}) { return <div className="crm-panel"><PanelHead title="კონტაქტები" subtitle={`სულ ${contacts.length} კონტაქტი`}/>{contacts.length?<div className="crm-entity-list">{contacts.map(contact=><div className="crm-entity" key={contact.id}><div className="crm-entity-icon"><UserRound size={18}/></div><div><b>{[contact.first_name,contact.last_name].filter(Boolean).join(' ')}</b><small>{companies.find(company=>company.id===contact.company_id)?.name||'კომპანია არ არის'} · {contact.email||contact.phone||contact.position||'—'}</small></div><button onClick={()=>onDelete(contact.id)} title="წაშლა"><Trash2 size={16}/></button></div>)}</div>:<Empty text="კონტაქტები ჯერ არ არის. დაამატეთ პირველი კონტაქტი."/>}</div> }
function TasksSection({tasks,onToggle,onDelete}) { return <div className="crm-panel"><PanelHead title="დავალებები" subtitle={`ღია: ${tasks.filter(task=>task.status!=='done').length} · სულ: ${tasks.length}`}/>{tasks.length?<div className="crm-entity-list">{tasks.map(task=><div className="crm-entity" key={task.id}><button className={`crm-check ${task.status==='done'?'done':''}`} onClick={()=>onToggle(task)}><Check size={13}/></button><div><b className={task.status==='done'?'crm-strike':''}>{task.title}</b><small>{task.description||'აღწერა არ არის'} · {task.due_at?dateLabel(task.due_at):'ვადა მითითებული არ არის'}</small></div><button onClick={()=>onDelete(task.id)} title="წაშლა"><Trash2 size={16}/></button></div>)}</div>:<Empty text="დავალებები ჯერ არ არის. დაამატეთ პირველი დავალება."/>}</div> }
function ActivitiesSection({activities}) { return <div className="crm-panel"><PanelHead title="აქტივობების ისტორია" subtitle="CRM-ში დაფიქსირებული აქტივობები"/>{activities.length?<div className="crm-entity-list">{activities.map(activity=><div className="crm-entity" key={activity.id}><div className="crm-entity-icon"><Activity size={18}/></div><div><b>{activity.subject||activity.activity_type}</b><small>{activity.description} · {dateLabel(activity.occurred_at)}</small></div></div>)}</div>:<Empty text="აქტივობები ჯერ არ არის."/>}</div> }
function Empty({text}) { return <div className="crm-empty"><Grid2X2 size={27}/><p>{text}</p></div> }

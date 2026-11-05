import { useMemo, useState } from 'react'
import {
  Activity, ArrowDown, ArrowUp, Bell, Building2, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Contact,
  FileBarChart, Filter, Grid2X2, LayoutDashboard, ListTodo, LogOut,
  Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings, SlidersHorizontal,
  Sparkles, Target, Users, Wallet, X, BriefcaseBusiness
} from 'lucide-react'

const initialDeals = [
  { id: 1, title: 'კორპორატიული მომსახურება', company: 'ალფა ჯგუფი', person: 'ნინო ბერიძე', amount: 24500, stage: 'ახალი', owner: 'გიორგი მ.' },
  { id: 2, title: 'CRM სისტემის დანერგვა', company: 'თიბისი კონსალტინგი', person: 'ლევან მაისურაძე', amount: 18200, stage: 'კვალიფიკაცია', owner: 'ანა კ.' },
  { id: 3, title: 'წლიური კონტრაქტი', company: 'ორიენტ ლოჯისტიკი', person: 'მარიამ გელაშვილი', amount: 42000, stage: 'შეთავაზება', owner: 'გიორგი მ.' },
  { id: 4, title: 'სერვისის განახლება', company: 'მედიქალ ჰაბი', person: 'დავით კაპანაძე', amount: 8600, stage: 'მოლაპარაკება', owner: 'სალომე დ.' },
  { id: 5, title: 'პარტნიორობის შეთავაზება', company: 'ნოვა ჰოლდინგი', person: 'თამარ ლომიძე', amount: 31500, stage: 'მოგებული', owner: 'ანა კ.' },
  { id: 6, title: 'საკონსულტაციო პაკეტი', company: 'ბიზნეს ლაბი', person: 'ირაკლი ქავთარაძე', amount: 12700, stage: 'ახალი', owner: 'სალომე დ.' },
  { id: 7, title: 'სერვისის გაფართოება', company: 'გრინ ენერჯი', person: 'ეკა ჯაფარიძე', amount: 26800, stage: 'კვალიფიკაცია', owner: 'გიორგი მ.' },
]
const initialTasks = [
  { id: 1, title: 'შეთავაზების გაგზავნა', detail: 'ალფა ჯგუფი · კორპორატიული მომსახურება', due: 'დღეს, 14:30', done: false },
  { id: 2, title: 'დემო შეხვედრის დაგეგმვა', detail: 'თიბისი კონსალტინგი', due: 'დღეს, 16:00', done: false },
  { id: 3, title: 'ხელშეკრულების გადამოწმება', detail: 'ორიენტ ლოჯისტიკი', due: 'ხვალ, 11:00', done: false },
  { id: 4, title: 'კლიენტთან უკუკავშირი', detail: 'მედიქალ ჰაბი', due: 'გუშინ', done: true },
]
const nav = [
  { group: 'სამუშაო სივრცე', items: [
    ['მიმოხილვა', LayoutDashboard], ['CRM', Grid2X2], ['ლიდები', Target], ['გარიგებები', Wallet], ['კონტაქტები', Contact], ['კომპანიები', Building2]
  ]},
  { group: 'მართვა', items: [['დავალებები', ListTodo], ['კალენდარი', CalendarDays], ['ანალიტიკა', FileBarChart]] },
]
const money = n => new Intl.NumberFormat('ka-GE', { style: 'currency', currency: 'GEL', maximumFractionDigits: 0 }).format(n)

export default function App() {
  const [page, setPage] = useState('მიმოხილვა')
  const [deals, setDeals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('company-crm-deals')) || initialDeals } catch { return initialDeals }
  })
  const [tasks, setTasks] = useState(initialTasks)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [toast, setToast] = useState('')
  const filteredDeals = useMemo(() => deals.filter(d => [d.title,d.company,d.person,d.owner,d.stage].join(' ').toLowerCase().includes(query.toLowerCase())), [deals, query])
  const total = deals.filter(d => d.stage !== 'მოგებული').reduce((s,d) => s+d.amount, 0)
  const won = deals.filter(d => d.stage === 'მოგებული').reduce((s,d) => s+d.amount, 0)
  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const addDeal = e => {
    e.preventDefault()
    if (!newTitle.trim() || !newCompany.trim()) return
    const next = [{ id: Date.now(), title: newTitle.trim(), company: newCompany.trim(), person: 'ახალი კონტაქტი', amount: Number(newAmount)||0, stage: 'ახალი', owner: 'მე' }, ...deals]
    setDeals(next); localStorage.setItem('company-crm-deals', JSON.stringify(next))
    setNewTitle(''); setNewCompany(''); setNewAmount(''); setShowModal(false); notify('გარიგება დაემატა')
  }
  const updateStage = (id, stage) => {
    const next = deals.map(d => d.id === id ? {...d, stage} : d)
    setDeals(next); localStorage.setItem('company-crm-deals', JSON.stringify(next))
  }
  const toggleTask = id => setTasks(ts => ts.map(t => t.id === id ? {...t, done: !t.done} : t))
  const activeNav = item => { setPage(item); setSidebarOpen(false) }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">c</div><div><b>company<span>CRM</span></b><small>სამუშაო სივრცე</small></div><button className="icon-btn mobile-close" onClick={()=>setSidebarOpen(false)}><X size={18}/></button></div>
      <button className="workspace"><div className="workspace-avatar">C</div><div><b>Company Workspace</b><small>უფასო სამუშაო სივრცე</small></div><ChevronDown size={15}/></button>
      <div className="nav-scroll">{nav.map(section => <div className="nav-section" key={section.group}><div className="nav-label">{section.group}</div>{section.items.map(([label,Icon]) => <button key={label} className={`nav-item ${page===label?'active':''}`} onClick={()=>activeNav(label)}><Icon size={18}/><span>{label}</span>{label==='დავალებები' && <i className="nav-count">{tasks.filter(t=>!t.done).length}</i>}</button>)}</div>)}</div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={()=>notify('პარამეტრები მალე დაემატება')}><Settings size={18}/>პარამეტრები</button><button className="nav-item" onClick={()=>notify('დახმარების ცენტრი მალე დაემატება')}><CircleHelp size={18}/>დახმარება</button><div className="profile"><div className="profile-avatar">კმ</div><div><b>კარლო მ.</b><small>ადმინისტრატორი</small></div><MoreHorizontal size={18}/></div></div>
    </aside>
    {sidebarOpen && <button className="scrim" onClick={()=>setSidebarOpen(false)} aria-label="მენიუს დახურვა"/>}
    <main className="main">
      <header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setSidebarOpen(true)}><Menu size={20}/></button><div className="breadcrumbs">სამუშაო სივრცე <ChevronRight size={14}/> <b>{page}</b></div></div><div className="top-actions"><div className="global-search"><Search size={17}/><input placeholder="ძიება CRM-ში..." value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-btn notification" onClick={()=>notify('ახალი შეტყობინებები არ არის')}><Bell size={19}/><i/></button><div className="top-avatar">კმ</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">ოთხშაბათი, 5 ნოემბერი 2026</div><h1>{page==='მიმოხილვა'?'დილა მშვიდობისა, კარლო 👋':page}</h1><p>{page==='მიმოხილვა'?'აი, რა ხდება თქვენს სამუშაო სივრცეში დღეს.':'მართეთ ინფორმაცია ერთიან სამუშაო სივრცეში.'}</p></div><button className="primary-btn" onClick={()=>setShowModal(true)}><Plus size={17}/> ახალი გარიგება</button></div>
        {page==='მიმოხილვა' ? <Dashboard deals={deals} total={total} won={won} tasks={tasks} toggleTask={toggleTask} setPage={setPage} /> :
          page==='გარიგებები' || page==='CRM' || page==='ლიდები' ? <DealsPage deals={filteredDeals} updateStage={updateStage} openAdd={()=>setShowModal(true)} page={page}/> :
          page==='დავალებები' ? <TasksPage tasks={tasks} toggleTask={toggleTask}/> :
          <GenericPage page={page} query={query} notify={notify}/>}
      </div>
    </main>
    {showModal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowModal(false)}}><form className="modal" onSubmit={addDeal}><div className="modal-head"><div><h2>ახალი გარიგება</h2><p>შეავსეთ ძირითადი ინფორმაცია</p></div><button type="button" className="icon-btn" onClick={()=>setShowModal(false)}><X size={19}/></button></div><label>გარიგების დასახელება<input autoFocus required value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="მაგ. წლიური მომსახურება"/></label><label>კომპანია<input required value={newCompany} onChange={e=>setNewCompany(e.target.value)} placeholder="კომპანიის სახელი"/></label><label>თანხა (₾)<input type="number" min="0" value={newAmount} onChange={e=>setNewAmount(e.target.value)} placeholder="0"/></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowModal(false)}>გაუქმება</button><button className="primary-btn" type="submit"><Plus size={16}/> დამატება</button></div></form></div>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function Dashboard({deals,total,won,tasks,toggleTask,setPage}) {
  const stats = [
    {label:'აქტიური გარიგებები',value:deals.filter(d=>!['მოგებული','წაგებული'].includes(d.stage)).length,change:'+12.8%',up:true,icon:BriefcaseBusiness,color:'violet'},
    {label:'პოტენციური შემოსავალი',value:money(total),change:'+8.2%',up:true,icon:Wallet,color:'blue'},
    {label:'მოგებული გარიგებები',value:money(won),change:'+18.4%',up:true,icon:Activity,color:'green'},
    {label:'ღია დავალებები',value:tasks.filter(t=>!t.done).length,change:'2 დღეს',up:false,icon:ListTodo,color:'orange'},
  ]
  return <>
    <div className="stats-grid">{stats.map(({label,value,change,up,icon:Icon,color})=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div className={`stat-icon ${color}`}><Icon size={18}/></div></div><div className="stat-value">{value}</div><div className="stat-foot"><span className={up?'positive':'neutral'}>{up?<ArrowUp size={13}/>:<Clock3 size={13}/>} {change}</span><span>წინა თვესთან შედარებით</span></div></div>)}</div>
    <div className="dashboard-grid"><section className="panel pipeline-panel"><div className="panel-head"><div><h2>გაყიდვების მილსადენი</h2><p>გარიგებების განაწილება ეტაპების მიხედვით</p></div><button className="text-btn" onClick={()=>setPage('გარიგებები')}>ყველას ნახვა <ChevronRight size={15}/></button></div><div className="pipeline-total"><strong>{money(deals.reduce((s,d)=>s+d.amount,0))}</strong><span>ჯამური ღირებულება</span></div><div className="pipeline-bars">{['ახალი','კვალიფიკაცია','შეთავაზება','მოლაპარაკება','მოგებული'].map((stage,i)=>{const count=deals.filter(d=>d.stage===stage).length;const max=Math.max(1,...['ახალი','კვალიფიკაცია','შეთავაზება','მოლაპარაკება','მოგებული'].map(s=>deals.filter(d=>d.stage===s).length));return <div className="pipeline-row" key={stage}><span>{stage}</span><div className="bar-track"><div className={`bar-fill bar-${i}`} style={{width:`${count/max*100}%`}}/></div><b>{count}</b></div>})}</div></section>
    <section className="panel tasks-panel"><div className="panel-head"><div><h2>ჩემი დავალებები</h2><p>დღის პრიორიტეტები</p></div><button className="text-btn" onClick={()=>setPage('დავალებები')}>ყველა <ChevronRight size={15}/></button></div><div className="task-list">{tasks.slice(0,4).map(t=><div className={`task-row ${t.done?'task-done':''}`} key={t.id}><button className="task-check" onClick={()=>toggleTask(t.id)}>{t.done&&<Check size={13}/>}</button><div className="task-copy"><b>{t.title}</b><span>{t.detail}</span></div><time>{t.due}</time></div>)}</div></section></div>
    <section className="panel recent-panel"><div className="panel-head"><div><h2>ბოლო გარიგებები</h2><p>ბოლო დროს განახლებული ჩანაწერები</p></div><button className="text-btn" onClick={()=>setPage('გარიგებები')}>ყველას ნახვა <ChevronRight size={15}/></button></div><DealsTable deals={deals.slice(0,5)}/></section>
    <div className="bottom-note"><Sparkles size={16}/><span><b>რჩევა:</b> განაახლეთ გარიგებების ეტაპები, რათა გაყიდვების პროგრესი ყოველთვის ზუსტად აისახოს.</span></div>
  </>
}

function DealsPage({deals,updateStage,openAdd,page}) {
  const stages=['ახალი','კვალიფიკაცია','შეთავაზება','მოლაპარაკება','მოგებული']
  return <section className="panel deals-page"><div className="panel-head"><div><h2>{page==='ლიდები'?'ლიდები':'გარიგებების სია'}</h2><p>სულ {deals.length} ჩანაწერი · განაახლეთ ეტაპი პირდაპირ ცხრილიდან</p></div><div className="table-tools"><button className="secondary-btn compact" onClick={()=>{}}><Filter size={15}/> ფილტრი</button><button className="primary-btn compact" onClick={openAdd}><Plus size={16}/> დამატება</button></div></div><DealsTable deals={deals} editable updateStage={updateStage}/></section>
}
function DealsTable({deals,editable=false,updateStage=()=>{}}) {
  return <div className="table-wrap"><table><thead><tr><th>გარიგება</th><th>კომპანია / კონტაქტი</th><th>თანხა</th><th>ეტაპი</th><th>პასუხისმგებელი</th><th/></tr></thead><tbody>{deals.map(d=><tr key={d.id}><td><b className="deal-name">{d.title}</b><small>#{String(d.id).slice(-5)}</small></td><td><b>{d.company}</b><small>{d.person}</small></td><td className="amount-cell">{money(d.amount)}</td><td>{editable?<select className="stage-select" value={d.stage} onChange={e=>updateStage(d.id,e.target.value)}>{['ახალი','კვალიფიკაცია','შეთავაზება','მოლაპარაკება','მოგებული','წაგებული'].map(s=><option key={s}>{s}</option>)}</select>:<span className={`stage-pill stage-${d.stage==='მოგებული'?'won':d.stage==='მოლაპარაკება'?'talk':d.stage==='შეთავაზება'?'offer':'new'}`}>{d.stage}</span>}</td><td><span className="owner"><i>{d.owner.slice(0,1)}</i>{d.owner}</span></td><td><button className="icon-btn tiny"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table>{deals.length===0&&<div className="empty-state">ჩანაწერები ვერ მოიძებნა</div>}</div>
}
function TasksPage({tasks,toggleTask}) {
  return <section className="panel tasks-full"><div className="panel-head"><div><h2>დავალებები</h2><p>აკონტროლეთ მიმდინარე და დასრულებული სამუშაოები</p></div><span className="task-counter">{tasks.filter(t=>!t.done).length} ღია</span></div>{tasks.map(t=><div className="task-full-row" key={t.id}><button className={`task-check ${t.done?'checked':''}`} onClick={()=>toggleTask(t.id)}>{t.done&&<Check size={13}/>}</button><div><b className={t.done?'muted-line':''}>{t.title}</b><p>{t.detail}</p></div><time>{t.due}</time></div>)}</section>
}
function GenericPage({page,query,notify}) {
  const isPeople=page==='კონტაქტები', isCompanies=page==='კომპანიები'
  const rows=isPeople?['ნინო ბერიძე','ლევან მაისურაძე','მარიამ გელაშვილი','დავით კაპანაძე']:['ალფა ჯგუფი','თიბისი კონსალტინგი','ორიენტ ლოჯისტიკი','მედიქალ ჰაბი']
  const data=rows.filter(x=>x.toLowerCase().includes(query.toLowerCase()))
  return <section className="panel generic-panel"><div className="panel-head"><div><h2>{page}</h2><p>თქვენი სამუშაო სივრცის {page.toLowerCase()}.</p></div><button className="secondary-btn compact" onClick={()=>notify('ახალი ჩანაწერის ფორმა მალე დაემატება')}><Plus size={16}/> დამატება</button></div>{page==='ანალიტიკა'?<div className="analytics-empty"><FileBarChart size={38}/><h3>ანალიტიკის სივრცე</h3><p>აქ გამოჩნდება გაყიდვების, კონვერსიისა და გუნდის შედეგების ანგარიშები.</p></div>:page==='კალენდარი'?<div className="analytics-empty"><CalendarDays size={38}/><h3>კალენდარი</h3><p>შეხვედრები და დაგეგმილი აქტივობები ერთ სივრცეში.</p></div>:<div className="simple-list">{data.map((name,i)=><div className="simple-row" key={name}><div className="simple-avatar">{name.slice(0,1)}</div><div><b>{name}</b><small>{isCompanies?'კომპანია · აქტიური კლიენტი':isPeople?'კონტაქტი · CRM':'ჩანაწერი'}</small></div><button className="icon-btn" onClick={()=>notify('ჩანაწერის დეტალები მალე დაემატება')}><ChevronRight size={17}/></button></div>)}</div>}</section>
}
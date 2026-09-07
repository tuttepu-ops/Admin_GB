'use client';
import {useEffect,useMemo,useState} from 'react';
import {BarChart3,Bell,Check,ChevronRight,Clipboard,Database,Download,LogOut,Menu,MessageCircle,Package,Printer,RefreshCw,Search,ShieldCheck,ShoppingBag,Tags,Trash2,Users,UserRoundCheck,X} from 'lucide-react';
import {supabaseBrowser} from '../../lib/supabase-browser';
import {getAdminPushToken} from '../../lib/firebase-browser';

type Profile={id:string;full_name:string|null;phone:string|null;created_at:string;updated_at:string};
type Address={id:string;user_id:string;label:string|null;full_name:string;mobile:string;address_line1:string;address_line2:string|null;landmark:string|null;pincode:string;city:string;state:string;is_default:boolean;created_at:string};
type Order={id:string;order_number:string;user_id:string;status:string;payment_status:string;subtotal:number;shipping_amount:number;total_amount:number;currency:string;delivery_name:string;delivery_mobile:string;delivery_email:string;delivery_address_line1:string;delivery_address_line2:string|null;delivery_landmark:string|null;delivery_pincode:string;delivery_city:string;delivery_state:string;paid_at:string|null;created_at:string;updated_at:string;discount_amount:number;coupon_code:string|null;referral_code:string|null;referral_commission_rate:number;referral_commission_amount:number;referral_commission_status:string;referral_commission_paid_at:string|null};
type Item={id:string;order_id:string;product_id:string;product_name:string;product_handle:string|null;product_image:string|null;sku:string|null;unit_price:number;quantity:number;line_total:number;created_at:string};
type Payment={id:string;order_id:string;provider:string;provider_order_id:string;provider_payment_id:string|null;amount:number;currency:string;status:string;paid_at:string|null;created_at:string;updated_at:string};
type Coupon={id:string;code:string;discount_percent:number;minimum_order:number;maximum_discount:number|null;active:boolean;starts_at:string|null;ends_at:string|null;created_at:string};
type Influencer={id:string;name:string;referral_code:string;commission_percent:number;active:boolean;email:string|null;phone:string|null;instagram_handle:string|null;notes:string|null;created_at:string};
type PushDevice={id:string;admin_user_id:string;fcm_token:string;device_name:string|null;platform:string|null;browser:string|null;active:boolean;last_seen_at:string;created_at:string};
type Log={id:string;notification_type:string;title:string;body:string|null;status:string;error_message:string|null;created_at:string};
type History={id:string;order_id:string;old_status:string|null;new_status:string;changed_by:string|null;note:string|null;created_at:string};
type Data={profiles:Profile[];addresses:Address[];orders:Order[];orderItems:Item[];payments:Payment[];coupons:Coupon[];influencers:Influencer[];pushDevices:PushDevice[];notificationLogs:Log[];statusHistory:History[]};
const empty:Data={profiles:[],addresses:[],orders:[],orderItems:[],payments:[],coupons:[],influencers:[],pushDevices:[],notificationLogs:[],statusHistory:[]};
const money=(n:number)=>`₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const STORE_URL=(process.env.NEXT_PUBLIC_SITE_URL||'https://das-test-beta.vercel.app').replace(/\/$/,'');
function localDateValue(d=new Date()){const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function Status({children}:{children:string}){return <span className={`status status-${children}`}>{children.replaceAll('_',' ')}</span>}
function csvDownload(rows:Record<string,unknown>[],name:string){if(!rows.length)return;const keys=Object.keys(rows[0]);const esc=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;const csv=[keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function addressText(o:Order){return `${o.delivery_name}\n${o.delivery_mobile}\n${o.delivery_address_line1}${o.delivery_address_line2?`\n${o.delivery_address_line2}`:''}${o.delivery_landmark?`\nLandmark: ${o.delivery_landmark}`:''}\n${o.delivery_city}, ${o.delivery_state} - ${o.delivery_pincode}`}
function whatsapp(o:Order){const text=`Hello ${o.delivery_name},\n\nYour Godavari Basket order ${o.order_number} has been received.\n\nDelivery Address:\n${addressText(o)}\n\nOrder Total: ${money(o.total_amount)}\nPayment: ${o.payment_status.toUpperCase()}\n\nThank you for choosing Godavari Basket.`;window.open(`https://wa.me/${o.delivery_mobile.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer')}
function printAddress(o:Order){const w=window.open('','_blank','width=700,height=800');if(!w)return;w.document.write(`<html><head><title>${o.order_number}</title><style>body{font-family:Arial;padding:30px}h1{font-family:Georgia}.box{border:1px solid #ddd;border-radius:14px;padding:20px}</style></head><body><h1>Godavari Basket</h1><p>DELIVERY ADDRESS · ${o.order_number}</p><div class="box"><h2>${o.delivery_name}</h2><p>${addressText(o).replaceAll('\n','<br/>')}</p></div><p><b>Payment:</b> ${o.payment_status}</p><p><b>Total:</b> ${money(o.total_amount)}</p><script>window.onload=()=>window.print()</script></body></html>`);w.document.close()}

export default function Admin(){
 const [sessionToken,setSessionToken]=useState(''); const [logged,setLogged]=useState(false); const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
 const [data,setData]=useState<Data>(empty); const [admin,setAdmin]=useState({name:'',email:'',role:''}); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [toast,setToast]=useState('');
 const [tab,setTab]=useState('dashboard'); const [query,setQuery]=useState(''); const [status,setStatus]=useState('all'); const [payment,setPayment]=useState('all'); const [fromDate,setFromDate]=useState(''); const [toDate,setToDate]=useState(''); const [sort,setSort]=useState('newest'); const [selected,setSelected]=useState<Order|null>(null); const [mobileMenu,setMobileMenu]=useState(false);
 const nav=[['dashboard','Dashboard',BarChart3],['orders','Orders',ShoppingBag],['customers','Customers',Users],['payments','Payments',Clipboard],['coupons','Coupons',Tags],['influencers','Influencers',UserRoundCheck],['notifications','Notifications',Bell],['admin','Admin',ShieldCheck],['data','Data Management',Database]] as const;
 const authHeaders=()=>({'Authorization':`Bearer ${sessionToken}`,'Content-Type':'application/json'});
 const load=async(t=sessionToken)=>{if(!t)return;setLoading(true);setError('');try{const r=await fetch('/api/admin/bootstrap',{headers:{Authorization:`Bearer ${t}`},cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Unable to load admin data');setData(j.data);setAdmin(j.admin);setSessionToken(t);setLogged(true)}catch(e){setError((e as Error).message);setLogged(false)}finally{setLoading(false)}};
 useEffect(()=>{supabaseBrowser().auth.getSession().then(({data:{session}})=>{if(session?.access_token)load(session.access_token)});const {data:{subscription}}=supabaseBrowser().auth.onAuthStateChange((_e,s)=>{if(s?.access_token){setSessionToken(s.access_token);setLogged(true)}else{setLogged(false);setSessionToken('')}});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),2500);return()=>clearTimeout(id)},[toast]);
 const login=async()=>{setLoading(true);setError('');const {data:s,error:e}=await supabaseBrowser().auth.signInWithPassword({email:email.trim(),password});setLoading(false);if(e||!s.session){setError(e?.message||'Login failed');return}await load(s.session.access_token)};
 const logout=async()=>{await supabaseBrowser().auth.signOut();setLogged(false);setData(empty)};
 const customerMap=useMemo(()=>new Map(data.profiles.map(p=>[p.id,p])),[data.profiles]);
 const filteredOrders=useMemo(()=>{const q=query.toLowerCase().trim();const rows=data.orders.filter(o=>{const p=customerMap.get(o.user_id);const matches=!q||[o.order_number,o.delivery_name,o.delivery_mobile,o.delivery_email,p?.full_name,p?.phone,o.coupon_code,o.referral_code].some(v=>String(v||'').toLowerCase().includes(q));const dt=new Date(o.created_at);const after=!fromDate||dt>=new Date(`${fromDate}T00:00:00`);const before=!toDate||dt<=new Date(`${toDate}T23:59:59`);return matches&&after&&before&&(status==='all'||o.status===status)&&(payment==='all'||o.payment_status===payment)});return rows.sort((a,b)=>sort==='oldest'?+new Date(a.created_at)-+new Date(b.created_at):sort==='amount_high'?Number(b.total_amount)-Number(a.total_amount):sort==='amount_low'?Number(a.total_amount)-Number(b.total_amount):String(a.delivery_name).localeCompare(String(b.delivery_name))*(sort==='name_za'?-1:1)||(+new Date(b.created_at)-+new Date(a.created_at)) )},[data.orders,customerMap,query,fromDate,toDate,status,payment,sort]);
 const stats=useMemo(()=>{const today=new Date().toDateString();const paid=data.orders.filter(o=>o.payment_status==='paid');return{today:data.orders.filter(o=>new Date(o.created_at).toDateString()===today).length,pending:data.orders.filter(o=>['pending','confirmed','processing'].includes(o.status)).length,customers:data.profiles.length,revenue:paid.reduce((a,o)=>a+Number(o.total_amount),0),discounts:paid.reduce((a,o)=>a+Number(o.discount_amount||0),0),commission:paid.reduce((a,o)=>a+Number(o.referral_commission_amount||0),0)}},[data]);
 const showToday=()=>{const today=localDateValue();setFromDate(today);setToDate(today)};
 const clearOrderFilters=()=>{setQuery('');setStatus('all');setPayment('all');setFromDate('');setToDate('');setSort('newest')};
 const updateStatus=async(o:Order,s:string)=>{const r=await fetch(`/api/admin/orders/${o.id}/status`,{method:'PATCH',headers:authHeaders(),body:JSON.stringify({status:s})});const j=await r.json();if(!r.ok){setError(j.error||'Update failed');return}setToast(`${o.order_number} marked ${s}`);await load()};
 const saveCoupon=async(c:Partial<Coupon>,method:'POST'|'PATCH'='POST')=>{const r=await fetch('/api/admin/coupons',{method,headers:authHeaders(),body:JSON.stringify(c)});const j=await r.json();if(!r.ok){setError(j.error||'Coupon update failed');return}setToast('Coupon saved');await load()};
 const saveInfluencer=async(i:Partial<Influencer>,method:'POST'|'PATCH'='POST')=>{const r=await fetch('/api/admin/influencers',{method,headers:authHeaders(),body:JSON.stringify(i)});const j=await r.json();if(!r.ok){setError(j.error||'Influencer update failed');return}setToast('Influencer saved');await load()};
 const registerPush=async()=>{try{const token=await getAdminPushToken();const r=await fetch('/api/admin/push/register',{method:'POST',headers:authHeaders(),body:JSON.stringify({token,device_name:navigator.platform,platform:'web',browser:navigator.userAgent.slice(0,160)})});const j=await r.json();if(!r.ok)throw new Error(j.error);setToast('Push notifications enabled');await load()}catch(e){setError((e as Error).message)}};
 const testPush=async()=>{const r=await fetch('/api/admin/push/test',{method:'POST',headers:authHeaders()});const j=await r.json();if(!r.ok){setError(j.error||'Push test failed');return}setToast(`Test sent to ${j.sent} device(s)`);await load()};
 const clearTable=async(table:string)=>{if(!confirm(`Permanently delete all ${table}?`))return;const r=await fetch('/api/admin/data-management',{method:'POST',headers:authHeaders(),body:JSON.stringify({table,confirm:'DELETE'})});const j=await r.json();if(!r.ok){setError(j.error||'Clear failed');return}setToast(`${table} cleared`);await load()};
 if(!logged)return <main className="login"><div className="login-card"><div className="brand-mark">GB</div><p className="eyebrow">PRIVATE OPERATIONS</p><h1>Godavari Basket</h1><p className="muted">Admin control centre</p><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Admin email"/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Password"/><button className="primary full" onClick={login}>{loading?'Signing in…':'Sign in'}</button>{error&&<p className="error">{error}</p>}<p className="tiny">Only accounts present in <b>admin_users</b> can enter this dashboard.</p></div></main>;
 const title=nav.find(x=>x[0]===tab)?.[1]||'Dashboard';
 return <main className="app"><header className="topbar"><div className="top-inner"><button className="mobile-btn" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="brand"><div className="brand-mark small">GB</div><div><b>Godavari Basket</b><span>Admin control centre</span></div></div><div className="top-actions"><button onClick={()=>load()}><RefreshCw size={18}/></button><button onClick={logout}><LogOut size={18}/></button></div></div></header><div className="layout"><aside className={mobileMenu?'sidebar open':'sidebar'}><div className="side-role"><ShieldCheck size={18}/><div><b>{admin.name||'Admin'}</b><span>{admin.role||'Admin'}</span></div></div>{nav.map(([id,label,Icon])=><button key={id} className={tab===id?'nav active':'nav'} onClick={()=>{setTab(id);setMobileMenu(false)}}><Icon size={18}/>{label}</button>)}</aside><section className="content"><div className="content-head"><div><p className="eyebrow">GODAVARI BASKET</p><h1>{title}</h1></div><div className="head-meta">{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>{error&&<div className="alert">{error}<button onClick={()=>setError('')}><X size={16}/></button></div>}
 {tab==='dashboard'&&<><div className="stats"><Card label="Today's orders" value={stats.today}/><Card label="Open orders" value={stats.pending}/><Card label="Customers" value={stats.customers}/><Card label="Paid revenue" value={money(stats.revenue)}/><Card label="Discounts" value={money(stats.discounts)}/><Card label="Influencer commission" value={money(stats.commission)}/></div><div className="grid-two"><div className="panel"><div className="panel-head"><div><p className="eyebrow">RECENT</p><h2>Latest orders</h2></div><button className="link" onClick={()=>setTab('orders')}>View all <ChevronRight size={16}/></button></div>{data.orders.slice(0,7).map(o=><button className="order-row" key={o.id} onClick={()=>setSelected(o)}><div><b>{o.order_number}</b><span>{o.delivery_name} · {new Date(o.created_at).toLocaleString('en-IN')}</span></div><div><Status>{o.payment_status}</Status><b>{money(o.total_amount)}</b></div><ChevronRight size={16}/></button>)}</div><div className="panel soft"><p className="eyebrow">OPERATIONS</p><h2>At a glance</h2><p className="muted">Coupons: {data.coupons.filter(c=>c.active).length} active</p><p className="muted">Influencers: {data.influencers.filter(i=>i.active).length} active</p><p className="muted">Push devices: {data.pushDevices.filter(d=>d.active).length} active</p></div></div></>}
 {tab==='orders'&&<><div className="filters"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Order, customer name, mobile, coupon, referral…"/></div><button className="secondary" onClick={showToday}>Today</button><input className="date-input" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/><input className="date-input" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All status</option>{['pending','confirmed','processing','shipped','delivered','cancelled'].map(x=><option key={x}>{x}</option>)}</select><select value={payment} onChange={e=>setPayment(e.target.value)}><option value="all">All payments</option><option value="paid">paid</option><option value="pending">pending</option><option value="failed">failed</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="amount_high">Amount high → low</option><option value="amount_low">Amount low → high</option><option value="name_az">Name A → Z</option><option value="name_za">Name Z → A</option></select><button className="secondary" onClick={clearOrderFilters}>Clear</button><button className="secondary" onClick={()=>csvDownload(filteredOrders as any,'godavari-orders.csv')}><Download size={16}/>CSV</button></div><div className="panel-list">{filteredOrders.map(o=><OrderCard key={o.id} o={o} onOpen={()=>setSelected(o)} onStatus={s=>updateStatus(o,s)}/>)}</div></>}
 {tab==='customers'&&<div className="panel"><div className="filters"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer name or phone"/></div></div><div className="customer-grid">{data.profiles.filter(p=>!query||`${p.full_name||''} ${p.phone||''}`.toLowerCase().includes(query.toLowerCase())).map(p=><div className="customer-card" key={p.id}><div className="avatar">{(p.full_name||'C')[0]}</div><div><b>{p.full_name||'Customer'}</b><span>{p.phone||'No phone'}</span><small>{data.orders.filter(o=>o.user_id===p.id).length} orders · {money(data.orders.filter(o=>o.user_id===p.id&&o.payment_status==='paid').reduce((a,o)=>a+Number(o.total_amount),0))}</small></div></div>)}</div></div>}
 {tab==='payments'&&<div className="panel table-wrap"><table><thead><tr><th>Order</th><th>Provider</th><th>Amount</th><th>Status</th><th>Paid at</th></tr></thead><tbody>{data.payments.map(p=><tr key={p.id}><td>{data.orders.find(o=>o.id===p.order_id)?.order_number||p.order_id}</td><td>{p.provider}<small>{p.provider_payment_id||''}</small></td><td>{money(p.amount)}</td><td><Status>{p.status}</Status></td><td>{p.paid_at?new Date(p.paid_at).toLocaleString('en-IN'):'—'}</td></tr>)}</tbody></table></div>}
 {tab==='coupons'&&<Coupons coupons={data.coupons} save={saveCoupon}/>} 
 {tab==='influencers'&&<Influencers rows={data.influencers} orders={data.orders} save={saveInfluencer}/>} 
 {tab==='notifications'&&<div className="grid-two"><div className="panel"><p className="eyebrow">PUSH</p><h2>Admin devices</h2><p className="muted">Enable notifications on each phone/browser that should receive new-order alerts.</p><div className="order-actions"><button onClick={registerPush}><Bell size={15}/>Enable on this device</button><button onClick={testPush}>Send test</button></div>{data.pushDevices.map(d=><div className="history" key={d.id}><span><b>{d.device_name||'Admin device'}</b><small>{d.platform||'web'} · last seen {new Date(d.last_seen_at).toLocaleString('en-IN')}</small></span><Status>{d.active?'active':'cancelled'}</Status></div>)}</div><div className="panel"><p className="eyebrow">HISTORY</p><h2>Notification log</h2>{data.notificationLogs.slice(0,25).map(n=><div className="history" key={n.id}><span><b>{n.title}</b><small>{n.body||''} · {new Date(n.created_at).toLocaleString('en-IN')}</small></span><Status>{n.status}</Status></div>)}</div></div>}
 {tab==='admin'&&<div className="admin-grid"><div className="admin-card"><div className="brand-mark shield"><ShieldCheck/></div><div><p className="eyebrow">AUTHENTICATED ADMIN</p><h2>{admin.name}</h2><p>{admin.email}</p></div><Status>active</Status><div className="role-row"><span>Role<b>{admin.role}</b></span><span>Access<b>Full operations</b></span></div></div></div>}
 {tab==='data'&&<div className="data-page"><div className="danger"><div className="danger-icon"><Trash2/></div><div><p className="eyebrow">DANGER ZONE</p><h2>Data management</h2><p>Destructive actions are blocked unless <b>ALLOW_DATA_CLEAR=true</b> is set intentionally.</p></div></div><div className="clear-grid">{['notification_logs','order_status_history','order_items','order_payments','orders','addresses'].map(t=><div className="clear-card" key={t}><Database/><div><h3>{t}</h3><p>Permanent deletion from Supabase.</p></div><button className="danger-btn" onClick={()=>clearTable(t)}>Clear</button></div>)}</div></div>}
 </section></div>{selected&&<OrderModal o={selected} items={data.orderItems.filter(i=>i.order_id===selected.id)} payment={data.payments.find(p=>p.order_id===selected.id)} history={data.statusHistory.filter(h=>h.order_id===selected.id)} close={()=>setSelected(null)} onStatus={s=>updateStatus(selected,s)}/>} {toast&&<div className="toast"><Check size={16}/>{toast}</div>}</main>;
}
function Card({label,value}:{label:string;value:string|number}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function OrderCard({o,onOpen,onStatus}:{o:Order;onOpen:()=>void;onStatus:(s:string)=>void}) {
  const statuses=['pending','confirmed','processing','shipped','delivered','cancelled'];
  return (
    <div className="order-card">
      <div className="order-top">
        <div>
          <div className="order-title">
            <b>{o.order_number}</b>
            <Status>{o.status}</Status>
            <Status>{o.payment_status}</Status>
          </div>
          <p>{o.delivery_name} · {o.delivery_mobile} · {new Date(o.created_at).toLocaleString('en-IN')}</p>
        </div>
        <b className="total">{money(o.total_amount)}</b>
      </div>

      <div className="order-body">
        <div>
          <h3>DELIVERY</h3>
          <p>{o.delivery_address_line1}, {o.delivery_city}, {o.delivery_state} - {o.delivery_pincode}</p>
        </div>
        <div>
          <h3>ATTRIBUTION</h3>
          <p>
            Coupon: {o.coupon_code || '—'}<br/>
            Influencer: {o.referral_code || '—'}<br/>
            Commission: {money(o.referral_commission_amount || 0)}
          </p>
        </div>
      </div>

      <div className="order-actions">
        <button onClick={onOpen}>View order</button>
        <button onClick={()=>whatsapp(o)}><MessageCircle size={15}/>WhatsApp</button>
        <button onClick={()=>printAddress(o)}><Printer size={15}/>Print</button>
        <select value={o.status} onChange={e=>onStatus(e.target.value)}>
          {statuses.map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </div>
  );
}

function OrderModal({o,items,payment,history,close,onStatus}:{o:Order;items:Item[];payment?:Payment;history:History[];close:()=>void;onStatus:(s:string)=>void}) {
  const statuses=['pending','confirmed','processing','shipped','delivered','cancelled'];
  return (
    <div className="overlay" onMouseDown={close}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">ORDER DETAILS</p>
            <h2>{o.order_number}</h2>
          </div>
          <button onClick={close} aria-label="Close order details"><X/></button>
        </div>

        <div className="modal-grid">
          <div className="modal-section">
            <h3>CUSTOMER</h3>
            <p>{o.delivery_name}<br/>{o.delivery_mobile}<br/>{o.delivery_email}</p>
          </div>
          <div className="modal-section">
            <h3>TOTAL</h3>
            <p>
              Subtotal {money(o.subtotal)}<br/>
              Discount {money(o.discount_amount || 0)}<br/>
              Shipping {money(o.shipping_amount)}<br/>
              <b>Total {money(o.total_amount)}</b>
            </p>
          </div>
        </div>

        <div className="modal-section">
          <h3>DELIVERY ADDRESS</h3>
          <p>{addressText(o).replaceAll('\n',' · ')}</p>
          <div className="mini-actions">
            <button onClick={()=>navigator.clipboard.writeText(addressText(o))}>Copy address</button>
            <button onClick={()=>whatsapp(o)}>WhatsApp</button>
            <button onClick={()=>printAddress(o)}>Print</button>
          </div>
        </div>

        <div className="modal-section items">
          <h3>ITEMS</h3>
          {items.map(i=>(
            <div key={i.id}>
              <span>
                <b>{i.product_name}</b>
                <small>{i.sku || ''} · Qty {i.quantity}</small>
              </span>
              <b>{money(i.line_total)}</b>
            </div>
          ))}
        </div>

        <div className="modal-section">
          <h3>PAYMENT / ATTRIBUTION</h3>
          <p>
            {payment?.provider || '—'} · {payment?.status || o.payment_status}<br/>
            Coupon: {o.coupon_code || '—'} · Influencer: {o.referral_code || '—'} · Commission: {money(o.referral_commission_amount || 0)}
          </p>
        </div>

        <div className="modal-section">
          <h3>STATUS</h3>
          <div className="status-actions">
            {statuses.map(s=>(
              <button key={s} className={o.status===s?'selected':''} onClick={()=>onStatus(s)}>{s}</button>
            ))}
          </div>
          {history.map(h=>(
            <div className="history" key={h.id}>
              <span>
                <b>{h.old_status || '—'} → {h.new_status}</b>
                <small>{new Date(h.created_at).toLocaleString('en-IN')}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Coupons({coupons,save}:{coupons:Coupon[];save:(c:Partial<Coupon>,m?:'POST'|'PATCH')=>void}) {
  const [code,setCode]=useState('');
  return (
    <div>
      <div className="panel">
        <p className="eyebrow">CREATE</p>
        <h2>Coupon</h2>
        <div className="filters">
          <input className="text-input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Coupon code"/>
          <button className="primary compact" onClick={()=>{if(code.trim()){save({code,discount_percent:5,minimum_order:1000,active:true});setCode('')}}}>Create 5% coupon</button>
        </div>
      </div>
      <div className="panel-list">
        {coupons.map(c=>(
          <div className="order-card" key={c.id}>
            <div className="order-top">
              <div><b>{c.code}</b><p>{c.discount_percent}% off · Minimum {money(c.minimum_order)}</p></div>
              <Status>{c.active?'active':'cancelled'}</Status>
            </div>
            <div className="order-actions">
              <button onClick={()=>save({...c,active:!c.active},'PATCH')}>{c.active?'Disable':'Enable'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Influencers({rows,orders,save}:{rows:Influencer[];orders:Order[];save:(i:Partial<Influencer>,m?:'POST'|'PATCH')=>void}) {
  const [name,setName]=useState('');
  const [code,setCode]=useState('');
  return (
    <div>
      <div className="panel">
        <p className="eyebrow">CREATE</p>
        <h2>Influencer</h2>
        <div className="filters">
          <input className="text-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/>
          <input className="text-input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Referral code"/>
          <button className="primary compact" onClick={()=>{if(name&&code){save({name,referral_code:code,commission_percent:5,active:true});setName('');setCode('')}}}>Add influencer</button>
        </div>
      </div>

      <div className="panel-list">
        {rows.map(i=>{
          const matched=orders.filter(o=>o.referral_code===i.referral_code&&o.payment_status==='paid');
          const sales=matched.reduce((a,o)=>a+Number(o.total_amount),0);
          const commission=matched.reduce((a,o)=>a+Number(o.referral_commission_amount||0),0);
          const link=`${STORE_URL}/?ref=${encodeURIComponent(i.referral_code)}`;
          return (
            <div className="order-card" key={i.id}>
              <div className="order-top">
                <div><b>{i.name}</b><p>{i.referral_code} · {i.commission_percent}% commission</p></div>
                <Status>{i.active?'active':'cancelled'}</Status>
              </div>
              <div className="order-body">
                <div><h3>PERFORMANCE</h3><p>{matched.length} paid orders · {money(sales)} sales · {money(commission)} commission</p></div>
                <div><h3>SHARE LINK</h3><p>{link}</p></div>
              </div>
              <div className="order-actions">
                <button onClick={()=>save({...i,active:!i.active},'PATCH')}>{i.active?'Disable':'Enable'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

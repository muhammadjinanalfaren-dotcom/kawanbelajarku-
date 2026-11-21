import {SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {icon, themes, subjectStyle} from './icons.js';

export const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}
});
export const main = document.querySelector('#main');
export const page = document.body.dataset.page;
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => (
  {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]
));
export const enc = value => encodeURIComponent(String(value));
export const same = (a,b) => String(a) === String(b);
export const byId = (rows,id) => rows.find(row => same(row.id,id));
export const materialUrl = id => './pelajaran.html#/materi/' + enc(id);
export const quizUrl = id => './latihan.html#/kuis/' + enc(id);
export const learnUrl = route => './belajar.html#/' + route;
export const dashboard = './kawanbelajarku-dashboard.html';
export const setView = html => {
  main.innerHTML = html;
  main.setAttribute('aria-busy','false');
};
export const empty = message => '<p class="empty">' + esc(message) + '</p>';
export const heading = (title,description='',back='') =>
  '<header class="heading">' + (back ? '<a class="back" href="' + back + '">← Kembali</a>' : '') +
  '<h1>' + esc(title) + '</h1>' + (description ? '<p>' + esc(description) + '</p>' : '') + '</header>';
export const section = (title,body,link='',label='Lihat semua') =>
  '<section class="section"><div class="section-head"><h2>' + esc(title) + '</h2>' +
  (link ? '<a class="textlink" href="' + link + '">' + esc(label) + ' →</a>' : '') + '</div>' + body + '</section>';
export const button = (label,href,kind='') => '<a class="btn ' + kind + '" href="' + esc(href) + '">' + esc(label) + '</a>';
export function date(value, full=false) {
  if (!value) return '';
  const item = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T12:00:00' : value);
  return Number.isNaN(item.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', {
    day:'numeric',month:'short',year:full?'numeric':undefined
  }).format(item);
}
export function getRoute(fallback) {
  let current = location.hash;
  if (!current.startsWith('#/')) current = '#/';
  return current.slice(2).split('/').map((part,index) => {
    if (!part && index===0) return fallback;
    try { return decodeURIComponent(part); } catch { return ''; }
  });
}
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export function tone(name) {
  const t = Object.hasOwn(themes,name) ? themes[name] : themes.sky;
  return '--tile:'+t.bg+';--deep:'+t.deep;
}
export function iconBox(name,size=29) {
  return '<span class="iconbox">'+icon(name,size)+'</span>';
}
export function subjectIcon(subject,styles={}) {
  const stored = styles?.[String(subject?.id)];
  const auto = subjectStyle(subject);
  return '<span class="row" style="'+tone(stored?.theme || auto.theme)+'">'+iconBox(stored?.icon || auto.icon)+'</span>';
}
let noticeTimer;
export function toast(message,error=false) {
  const el = document.querySelector('#notice');
  el.textContent = message;
  el.toggleAttribute('data-error',error);
  el.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { el.hidden=true; },5500);
}
export function readableError(error) {
  const message = String(error?.message || error || '');
  if (/fetch|network|load failed|timeout/i.test(message)) return 'Koneksi gagal. Periksa internet lalu coba kembali.';
  if (/query returned no rows|invalid input syntax for type uuid/i.test(message)) return 'Data tidak ditemukan atau akses belum diberikan. Periksa kode dan akunmu.';
  if (/anonymous sign-ins are disabled/i.test(message)) return 'Akses tamu belum diaktifkan. Masuk dengan akun sekolah.';
  if (/invalid login credentials/i.test(message)) return 'Email atau kata sandi salah.';
  if (/email not confirmed/i.test(message)) return 'Buka tautan konfirmasi di email sebelum masuk.';
  if (/PGRST202|PGRST205|schema cache|does not exist|^42P01/i.test(message)) return 'Koneksi tersedia, tetapi struktur database perlu diperiksa. Hubungi admin.';
  return message || 'Terjadi kesalahan. Coba lagi.';
}
export function loadError(error) {
  setView(heading('Halaman belum bisa dimuat')+'<div class="panel notice-error"><p>'+esc(readableError(error))+
    '</p><div class="actions"><button id="retry" class="btn">Coba lagi</button>'+button('Masuk','./index.html','ghost')+'</div></div>');
  document.querySelector('#retry').onclick=()=>location.reload();
}
export async function checked(promise) {
  const result = await promise;
  if (result.error) throw result.error;
  return result.data;
}
export async function allRows(builder,limit=500) {
  const rows=[];
  for (let offset=0;;offset+=limit) {
    const chunk=await checked(builder().range(offset,offset+limit-1));
    rows.push(...chunk);
    if (chunk.length<limit) return rows;
  }
}
export async function busy(button,fn) {
  if (!button || button.disabled) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Memproses…';
  try { await fn(); }
  catch (error) { toast(readableError(error),true); }
  finally { button.disabled=false; button.textContent=original; }
}
export function requireClient() {
  if (!db) throw new Error('Supabase gagal dimuat. Periksa koneksi internet lalu coba lagi.');
}
export async function identity() {
  requireClient();
  const session=(await checked(db.auth.getSession())).session;
  if (!session) return null;
  const {user}=await checked(db.auth.getUser());
  if (!user) return null;
  const profile=await checked(db.from('profiles').select('full_name,role').eq('id',user.id).maybeSingle());
  if(profile && !user.is_anonymous && !['admin','teacher','guru'].includes(profile.role)){
    const effective=await checked(db.rpc('kb_live_role'));
    if(effective==='teacher')profile.role='teacher';
  }
  return {user,profile,admin:profile?.role==='admin',
    name:profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kawan Belajar'};
}
export async function guard(adminOnly=false) {
  const account=await identity();
  if (!account) { location.replace('./index.html'); return null; }
  if (account.user.is_anonymous) { location.replace('./live.html'); return null; }
  if (adminOnly && !account.admin) { location.replace(dashboard); return null; }
  db.auth.onAuthStateChange((event)=>{ if(event==='SIGNED_OUT') location.replace('./index.html'); });
  return account;
}
export async function signOut() {
  await checked(db.auth.signOut({scope:'local'}));
  location.replace('./index.html');
}
export const menus = [
  ['Perpustakaan Ilmu','books','sky','./pelajaran.html'],['Pusat Latihan','clip','violet','./latihan.html'],
  ['Agenda Belajar','cal','mint',learnUrl('agenda')],['Statistik Belajar','chart','teal',learnUrl('statistik')],
  ['Pilihan Minggu Ini','video','peach',learnUrl('pilihan')],['Materi Tersimpan','bookmark','amber','./pelajaran.html#/tersimpan'],
  ['Galeri Pencapaian','crown','rose',learnUrl('pencapaian')],['Ruang Eksplorasi','flask','violet',learnUrl('eksplorasi')],
  ['Langganan','gift','mint',learnUrl('langganan')],['Menu Lain','target','slate',learnUrl('menu')]
];
export function brand(name='KawanBelajarku',href='./index.html') {
  return '<a class="brand" href="'+href+'"><img src="./assets/brand.svg" width="35" height="35" alt=""><span>'+esc(name)+'</span></a>';
}
export function shell(account,ui={},adminMode=false) {
  const name=ui?.name || 'KawanBelajarku';
  if (/^#[0-9a-f]{6}$/i.test(ui?.color || '')) {
    const c=ui.color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    if (.2126*c[0]+.7152*c[1]+.0722*c[2]<=.183) document.documentElement.style.setProperty('--brand',ui.color);
  }
  const links=[
    ['Beranda','book',dashboard,'dashboard'],['Pelajaran','books','./pelajaran.html','library'],
    ['Pencapaian','crown',learnUrl('pencapaian'),'pencapaian'],['Menu Lain','target',learnUrl('menu'),'menu']
  ];
  const nav = mobile => links.map(([title,mark,link,key])=>{
    const active=key===page || (page==='learn' && key===getRoute('menu')[0]);
    return '<a href="'+link+'"'+(active?' aria-current="page"':'')+'>'+(mobile?icon(mark,23):'')+esc(title)+'</a>';
  }).join('');
  document.querySelector('#shell').innerHTML='<header class="topbar"><div class="top wrap">'+brand(name,dashboard)+
    (adminMode ? '<nav class="adminnav" aria-label="Admin"><a href="./kelola.html">Kelola Data</a><a href="./guru.html">Guru</a><a href="./kelas.html">Kelas & pengguna</a><a href="./editor.html">Editor</a><a href="'+dashboard+'">Tampilan Siswa</a></nav>' :
      '<nav class="desktopnav" aria-label="Navigasi utama">'+nav(false)+'</nav><a class="topsearch textlink" href="'+learnUrl('cari')+'">Cari</a>')+
    '<a class="bell" aria-label="Notifikasi" href="'+learnUrl('pengumuman')+'"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4zM10 20q2 2 4 0"/></svg></a><details class="account-menu"><summary class="account" aria-label="Menu akun"><span class="avatar">'+
    '<img src="./assets/faces/student-'+profileFace(account)+'.webp" alt="">'+'</span><span class="account-label">'+esc(account.name)+'</span></summary><div><a href="'+learnUrl('profil')+'">Pengaturan profil</a><button id="account-logout">Keluar</button></div></details></div></header>'+
    (adminMode?'':'<nav class="bottom" aria-label="Navigasi utama">'+nav(true)+'</nav>');
  const logout=document.querySelector('#account-logout');logout.onclick=()=>busy(logout,signOut);
}

export const profileFace = account => [0,1,2,3].includes(account.user.user_metadata?.kb_face) ? account.user.user_metadata.kb_face : 0;

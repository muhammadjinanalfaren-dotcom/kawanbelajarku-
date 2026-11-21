import {db,main,page,setView,brand,esc,checked,identity,dashboard,requireClient,readableError,loadError} from './common.js';

const resetUrl = new URL('../reset-password.html',import.meta.url).href;
const indexUrl = new URL('../index.html',import.meta.url).href;
const params = new URLSearchParams(location.search);
const callback = new URLSearchParams(location.hash.slice(1));
const modes = {
  login:['Selamat datang kembali','Masuk untuk melanjutkan aktivitas belajarmu.'],
  signup:['Buat akun siswa','Mulai belajar bersama KawanBelajarku.'],
  recovery:['Pulihkan kata sandi','Kami akan mengirim tautan pemulihan ke email akunmu.'],
  update:['Atur kata sandi baru','Gunakan minimal delapan karakter.']
};
let mode = page==='reset' ? 'recovery' : params.get('mode')==='daftar' ? 'signup' : 'login';
const eye = '<svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>';
const password = (name,title,current=false) => '<label class="field" for="'+name+'">'+title+'</label>'+
  '<div class="field password-field"><input id="'+name+'" name="'+name+'" type="password" autocomplete="'+(current?'current-password':'new-password')+'" '+(current?'':'minlength="8"')+' required>'+
  '<button type="button" class="eye" data-password="'+name+'" aria-label="Tampilkan kata sandi" aria-pressed="false">'+eye+'</button></div>';
const field = (name,label,type,autocomplete,max='') => '<label class="field">'+label+
  '<input name="'+name+'" type="'+type+'" autocomplete="'+autocomplete+'" '+max+' required></label>';
function go(account) {
  location.replace(account?.admin?'./kelola.html':['guru','teacher'].includes(account?.profile?.role)?'./guru.html':dashboard);
}
function message(value='',error=false) {
  const el=document.querySelector('#auth-feedback');
  el.textContent=value;
  el.hidden=!value;
  el.classList.toggle('notice-error',error);
}
function draw(initial='') {
  const [title,subtitle]=modes[mode];
  const label={login:'Masuk',signup:'Daftar',recovery:'Kirim tautan',update:'Simpan kata sandi'}[mode];
  setView('<div class="authbox"><aside class="authart"><div><h2>Temukan hal baru setiap hari</h2>'+
    '<p>Materi, latihan, dan agenda belajarmu dalam satu ruang.</p></div></aside><div class="authpanel">'+brand()+
    '<h1>'+title+'</h1><p class="muted">'+subtitle+'</p><form id="auth-form" class="form">'+
    (mode==='signup'?field('full_name','Nama lengkap','text','name','maxlength="80"'):'')+
    (mode!=='update'?field('email','Email','email','email'):'')+
    (mode!=='recovery'?password('password',mode==='update'?'Kata sandi baru':'Kata sandi',mode==='login'):'')+
    (mode==='update'?password('confirmation','Ulangi kata sandi baru'):'')+
    '<button class="btn" type="submit">'+label+'</button><p class="empty" id="auth-feedback" role="status" hidden></p></form><div class="authlinks">'+
    (mode==='login'?'<a class="textlink" href="./index.html?mode=daftar">Buat akun siswa</a><a class="textlink" href="./live.html">Gabung kuis live</a><a class="textlink" href="./reset-password.html">Lupa kata sandi?</a>':
      '<a class="textlink" href="./index.html">Kembali ke login</a>')+'</div></div></div>');
  if (initial) message(initial,true);
  main.querySelectorAll('[data-password]').forEach(button=>button.onclick=()=>{
    const input=document.getElementById(button.dataset.password);
    const visible=input.type==='password';
    input.type=visible?'text':'password';
    button.setAttribute('aria-pressed',String(visible));
    button.setAttribute('aria-label',visible?'Sembunyikan kata sandi':'Tampilkan kata sandi');
  });
  document.querySelector('#auth-form').onsubmit=async event=>{
    event.preventDefault();
    const input=Object.fromEntries(new FormData(event.currentTarget));
    const control=event.submitter;
    if (control.disabled) return;
    control.disabled=true;
    control.textContent='Memproses…';
    message();
    try {
      if (mode==='login') {
        await checked(db.auth.signInWithPassword({email:input.email.trim(),password:input.password}));
        go(await identity());
      } else if (mode==='signup') {
        const name=input.full_name.trim();
        if (!name) throw new Error('Isi nama lengkap terlebih dahulu.');
        const result=await checked(db.auth.signUp({email:input.email.trim(),password:input.password,
          options:{data:{full_name:name},emailRedirectTo:indexUrl}}));
        if (result.session) go(await identity());
        else message('Periksa email untuk membuka tautan konfirmasi, lalu kembali untuk masuk.');
      } else if (mode==='recovery') {
        await checked(db.auth.resetPasswordForEmail(input.email.trim(),{redirectTo:resetUrl}));
        message('Jika alamat terdaftar, tautan pemulihan akan dikirim ke email tersebut.');
      } else {
        if (input.confirmation!==input.password) throw new Error('Ulangan kata sandi belum cocok.');
        await checked(db.auth.updateUser({password:input.password}));
        await checked(db.auth.signOut({scope:'local'}));
        sessionStorage.removeItem('kb:recovery');
        mode='login';
        history.replaceState(null,'',indexUrl);
        draw();
        message('Kata sandi sudah diperbarui. Masuk kembali dengan kata sandi baru.');
      }
    } catch (error) { message(readableError(error),true); }
    finally { control.disabled=false; control.textContent=label; }
  };
}
async function start() {
  requireClient();
  const callbackError=params.get('error_description') || callback.get('error_description');
  if (page==='reset') {
    let sawRecovery=false;
    db.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY' && session) {
        sawRecovery=true;
        sessionStorage.setItem('kb:recovery',JSON.stringify({user:session.user.id,until:Date.now()+30*60*1000}));
        if (mode!=='update') { mode='update'; draw(); }
      }
    });
    const session=(await checked(db.auth.getSession())).session;
    let pending;
    try { pending=JSON.parse(sessionStorage.getItem('kb:recovery')); } catch {}
    const recovery=sawRecovery || pending && pending.user===session?.user?.id && pending.until>Date.now();
    mode=recovery && session && !callbackError?'update':'recovery';
    draw(callbackError?'Tautan pemulihan tidak valid atau kedaluwarsa. Minta tautan baru.':'');
    return;
  }
  if (callbackError) { draw('Tautan konfirmasi tidak valid atau kedaluwarsa.'); return; }
  const account=await identity();
  if (account && !account.user.is_anonymous) go(account);
  else draw();
}
start().catch(loadError);

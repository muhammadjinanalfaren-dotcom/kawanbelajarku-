import {subjectView,banners} from './subject.js';
import {
  profileFace,db,page,main,setView,esc,enc,byId,same,checked,guard,shell,button,empty,heading,section,toast,loadError,
  busy,getRoute,dashboard,learnUrl,materialUrl,quizUrl,iconBox,tone,subjectIcon,date,menus,signOut,safeUrl
} from './common.js';
import {
  data,refresh,newest,subjectName,materials,quizzes,complete,saved,finished,latest,recommendations,materialCards,
  quizCards,features,announcements,historyTable,getAttachments,attachmentList
} from './student-data.js';

let account, currentAsset=[], routeNumber=0, opened='', filters={query:'',subject:'',category:''}, attempt=null;
const tablesForPage={
  dashboard:['kb_banners','subjects','materials','quizzes','progress','kb_material_activity','quiz_results','announcements','popular'],
  library:['quizzes','kb_chapters','subjects','materials','progress','kb_material_activity','features'],
  quiz:['subjects','quizzes','quiz_results'],
  learn:['kb_chapters','subjects','materials','quizzes','progress','kb_material_activity','quiz_results','announcements','features','kb_agenda']
};
const uid = () => account.user.id;
const statRows=()=> {
  const n=finished().length;
  const total=materials().length;
  const pct=total?Math.round(n/total*100):0;
  return {n,total,pct,quizzes:data.results.length};
};
function metrics() {
  const stat=statRows();
  const average=stat.quizzes?Math.round(data.results.reduce((sum,row)=>sum+Number(row.score),0)/stat.quizzes):'—';
  return '<div class="metrics">'+[[stat.n+' / '+stat.total,'Materi selesai'],[stat.quizzes,'Percobaan kuis'],
    [average,'Rata-rata skor'],[stat.pct+'%','Progres materi']].map(([value,label])=>'<div class="metric"><b>'+
    esc(value)+'</b><small>'+esc(label)+'</small></div>').join('')+'</div>';
}
function home() {
  const st=statRows();
  const last=byId(materials(),latest()?.material_id);
  const days=new Set(data.results.map(r=>r.completed_at?.slice(0,10)).filter(Boolean)).size;
  const xp=st.n*20+days*10,gold=st.n*2+days;
  const badge=data.results.some(r=>Number(r.score)===100)?'Skor sempurna':st.n>=5?'Pembaca tekun':st.quizzes?'Kuis pertama':'';
  const role=account.admin?'Admin':['teacher','guru'].includes(account.profile?.role)?'Guru':'Siswa';
  const today=new Date().toISOString().slice(0,10);
  const mission=data.results.some(row=>row.completed_at?.slice(0,10)===today);
  const picks=data.materials.filter(m=>m.kb_recommended);
  const tiles=[5,1,2,3,4,8].map(i=>menus[i]);
  return `<div class="profile-band"><div class="profile-id"><img src="./assets/faces/student-${profileFace(account)}.webp" alt=""><div><small>Akun ${role}</small><h1>${esc(account.name)}</h1><span>Level ${1+Math.floor(xp/100)} · ${xp} XP · ${gold} Gold</span></div></div><a class="profile-progress" href="${learnUrl('statistik')}"><small>Progres belajar</small><strong>${st.pct}%</strong><progress max="100" value="${st.pct}"></progress></a></div>
  <form class="search-home" action="./belajar.html"><input name="q" type="search" required aria-label="Cari konten" placeholder="Cari materi, pelajaran, atau latihan…"><button class="btn">Cari</button></form>
  <div class="home-layout"><div><div class="launch-grid">${tiles.map(([label,icon,theme,href])=>`<a class="tile" href="${href}" style="${tone(theme)}"><img class="tile-art" src="./assets/tile-${icon}.webp" alt=""><span>${label}</span></a>`).join('')}</div><a class="more-link" href="${learnUrl('menu')}">Menu Lain →</a>
  ${section('Rekomendasi untukmu',banners(data.kb_banners)+'<section class="hero"><div class="hero-copy"><span class="eyebrow">Ruang eksplorasi</span><h2>Mengenal tata surya lebih dekat</h2>'+button('Mulai jelajahi',learnUrl('orbit'),'light')+'</div></section>')}
  ${section('Pilihan guru',materialCards(picks,'Guru belum memilih materi untuk minggu ini.'),learnUrl('pilihan'))}</div>
  <aside>${section('Kuis live','<div class="panel live-call"><h3>Gabung ruang kuis</h3><p>Siapkan kode dari guru untuk masuk bersama teman sekelas.</p>'+button('Masukkan kode','./live.html')+'</div>')}
  ${section('Misi harian','<a class="panel row" href="./latihan.html"><img width="46" src="./assets/tile-target.webp" alt=""><div><h3>Selesaikan satu kuis mandiri</h3><small>'+(mission?'Selesai hari ini':'0 dari 1 kuis')+' · 10 XP dan 1 Gold</small></div></a>')}
  ${section('Lanjutkan belajar',last?materialCards([last]):empty('Materi terakhir yang kamu buka akan muncul di sini.'),'./pelajaran.html')}
  ${section('Pencapaian',badge?button(badge,learnUrl('pencapaian'),'ghost'):empty('Lencana pertamamu terbuka setelah kamu menyelesaikan satu kuis mandiri.'))}
  ${section('Pengumuman',announcements(newest(data.announcements).slice(0,2)),learnUrl('pengumuman'))}</aside></div>`;
}
function filtered(list,search,valuesFor) {
  const terms=search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return list.filter(item=>{
    const haystack=valuesFor(item).filter(v=>v!=null).join(' ').toLowerCase();
    return terms.every(term=>haystack.includes(term));
  });
}
function category(item) {
  if (item.kb_category) return item.kb_category;
  const text=[item.title,item.description].join(' ');
  if (/\b(?:semester|smt|sem)\s*[.:-]?\s*1\b|\bganjil\b/i.test(text)) return 'Semester 1';
  if (/\b(?:semester|smt|sem)\s*[.:-]?\s*2\b|\bgenap\b/i.test(text)) return 'Semester 2';
  return '';
}
function options(values,active) {
  return values.map(([value,label])=>'<option value="'+esc(value)+'"'+(same(value,active)?' selected':'')+'>'+esc(label)+'</option>').join('');
}
function library(route,id) {
  const isSaved=route==='tersimpan';
  const lastSubject=byId(materials(),latest()?.material_id)?.subject_id;
  const subject=route==='mapel'?byId(data.subjects,id):route==='home'?(byId(data.subjects,lastSubject)||data.subjects[0]):null;
  if (route==='mapel' && !subject) { setView(heading('Mata pelajaran tidak ditemukan','','./pelajaran.html')); return; }
  if(subject){subjectView(subject,account,profileFace(account));return;}
  const base=materials().filter(item=>(!isSaved || saved(item.id)) && (!subject || same(subject.id,item.subject_id)));
  const categories=[...new Set(base.map(category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
  const subjects=[['','Semua mata pelajaran'],...data.subjects.map(s=>[s.id,s.name])];
  const list=()=>materialCards(filtered(base.filter(item=>
    (subject || !filters.subject || same(filters.subject,item.subject_id)) &&
    (!filters.category || category(item)===filters.category)),filters.query,item=>[item.title,item.description,subjectName(item.subject_id),category(item)]),
    isSaved?'Belum ada materi tersimpan yang cocok.':'Belum ada materi yang cocok.');
  setView(heading(isSaved?'Materi Tersimpan':subject?.name || 'Perpustakaan Ilmu',
    isSaved?'Bookmark tersinkron dengan akunmu.':subject?.description || 'Temukan materi berdasarkan mata pelajaran atau kategori.',
    isSaved || subject?'./pelajaran.html':'')+
    (!subject?'<div class="tabs"><a class="pill" href="./pelajaran.html#/semua"'+(!isSaved?' aria-current="page"':'')+
      '>Semua materi</a><a class="pill" href="./pelajaran.html#/tersimpan"'+(isSaved?' aria-current="page"':'')+'>Tersimpan</a></div>':'')+
    '<div class="form inline panel filterbar"><label class="field">Cari materi<input id="material-search" type="search" value="'+esc(filters.query)+
    '" placeholder="Judul atau topik"></label>'+
    (!subject?'<label class="field">Mata pelajaran<select id="subject-filter">'+options(subjects,filters.subject)+'</select></label>':'')+
    '<label class="field">Kategori<select id="category-filter">'+options([['','Semua kategori'],...categories.map(c=>[c,c])],filters.category)+
    '</select></label></div><div id="material-list">'+list()+'</div>'+
    (!subject && !isSaved?section('Mata pelajaran',data.subjects.length?'<div class="grid">'+data.subjects.map(s=>'<a class="card row" href="./pelajaran.html#/mapel/'+
      enc(s.id)+'">'+subjectIcon(s,data.config.style)+'<span><h3>'+esc(s.name)+'</h3><small>'+base.filter(m=>same(m.subject_id,s.id)).length+
      ' materi</small></span></a>').join('')+'</div>':empty('Belum ada mata pelajaran.')):''));
  for (const [selector,key,event] of [['#material-search','query','input'],['#subject-filter','subject','change'],['#category-filter','category','change']]) {
    const el=main.querySelector(selector);
    el?.addEventListener(event,()=>{
      filters[key]=el.value;
      main.querySelector('#material-list').innerHTML=list();
    });
  }
}
async function materialAction(id,action,value=true) {
  await checked(db.rpc('kb_material_action',{p_material:String(id),p_action:action,p_value:value}));
}
async function article(kind,id,serial) {
  const isMaterial=kind==='materi';
  const visible=byId(isMaterial?materials():data.features,id);
  const back=isMaterial?'./pelajaran.html':learnUrl('eksplorasi');
  if (!visible) { setView(heading('Konten tidak ditemukan','Konten mungkin sudah diarsipkan.',back)); return; }
  const [item,attachments]=await Promise.all([
    checked(db.from(isMaterial?'materials':'features').select('*').eq('id',id).eq('kb_archived',false).maybeSingle()),
    getAttachments(isMaterial?'material':'feature',id)
  ]);
  if (serial!==routeNumber) return;
  if (!item) { setView(heading('Konten tidak ditemukan','',back)); return; }
  currentAsset=attachments;
  setView(heading(item.title,item.description || (isMaterial?subjectName(item.subject_id):''),back)+
    '<article class="panel article"><div class="prose">'+esc(item.content || 'Isi konten belum tersedia.')+'</div>'+
    (isMaterial?'<div class="actions" id="material-actions"></div>':'')+attachmentList(attachments)+'</article>');
  if (isMaterial) {
    drawMaterialActions(id);
    if (opened!==id) {
      try { await materialAction(id,'open'); if(serial===routeNumber) opened=id; }
      catch { if(serial===routeNumber) toast('Riwayat buka materi belum tersimpan. Muat ulang untuk mencoba lagi.',true); }
    }
  }
}
function drawMaterialActions(id) {
  const box=main.querySelector('#material-actions');
  if (!box) return;
  box.innerHTML='<button class="btn" data-material-action="complete" aria-pressed="'+complete(id)+'">'+
    (complete(id)?'Batalkan tanda selesai':'Tandai selesai')+'</button><button class="btn secondary" data-material-action="bookmark" aria-pressed="'+
    saved(id)+'">'+(saved(id)?'Hapus dari tersimpan':'Simpan materi')+'</button>';
  box.querySelectorAll('button').forEach(control=>control.onclick=()=>busy(control,async()=>{
    const action=control.dataset.materialAction;
    const active=action==='complete'?complete(id):saved(id);
    await materialAction(id,action,!active);
    await refresh([action==='complete'?'progress':'kb_material_activity'],uid());
    if (same(getRoute('home')[1],id)) drawMaterialActions(id);
    toast('Perubahan tersimpan.');
  }));
}
async function openAttachment(control) {
  const item=byId(currentAsset,control.dataset.asset);
  if (!item?.path || item.kb_bucket!=='kb-learning') return;
  const {signedUrl}=await checked(db.storage.from('kb-learning').createSignedUrl(item.path,120,item.kind==='video'?{}:{download:true}));
  const url=safeUrl(signedUrl);
  if (!url) throw new Error('Tautan lampiran tidak tersedia.');
  if (item.kind==='video') {
    const player=document.createElement('video');
    player.src=url; player.controls=true; player.className='media'; player.preload='metadata';
    player.setAttribute('aria-label',item.title || 'Video lampiran');
    control.replaceWith(player);
    return;
  }
  const link=document.createElement('a');
  link.href=url;
  link.rel='noopener noreferrer';
  link.download='';
  link.click();
}
const draftKey = id=>'kb:quiz:'+uid()+':'+id;
function readDraft(id,questions) {
  let raw={};
  try { raw=JSON.parse(sessionStorage.getItem(draftKey(id)) || '{}') || {}; } catch {}
  const output={};
  for (const {id,options} of questions) {
    if (Number.isInteger(raw[id]) && raw[id]>=0 && raw[id]<options.length) output[id]=raw[id];
  }
  return output;
}
function drawQuiz() {
  const {quiz,questions,index,answers}=attempt;
  const q=questions[index];
  const left=questions.length-Object.keys(answers).length;
  setView(heading(quiz.title,subjectName(quiz.subject_id),'./latihan.html')+
    '<article class="panel article"><p class="quiet" id="answer-count">'+(questions.length-left)+' / '+questions.length+
    ' terjawab · '+left+' belum dijawab</p><div class="question-nav actions" aria-label="Nomor soal">'+questions.map((item,i)=>
      '<button type="button" data-number="'+i+'"'+(i===index?' aria-current="step"':'')+(Object.hasOwn(answers,item.id)?' data-answered':'')+
      ' aria-label="Soal '+(i+1)+(Object.hasOwn(answers,item.id)?', terjawab':', belum dijawab')+'">'+(i+1)+'</button>').join('')+
    '</div><fieldset class="choice-list"><legend>'+(index+1)+'. '+esc(q.text)+'</legend>'+q.options.map((option,i)=>
      '<label class="choice"><input name="answer" type="radio" value="'+i+'"'+(answers[q.id]===i?' checked':'')+'> '+esc(option)+'</label>').join('')+
    '</fieldset><div class="actions">'+(index?'<button class="btn ghost" data-number="'+(index-1)+'">Sebelumnya</button>':'')+
    (index<questions.length-1?'<button class="btn secondary" data-number="'+(index+1)+'">Berikutnya</button>':'')+
    '<button class="btn" id="submit-quiz">Kirim jawaban</button></div></article>');
  main.querySelectorAll('[data-number]').forEach(control=>control.onclick=()=>{
    if (attempt.sending) return;
    attempt.index=Number(control.dataset.number);
    drawQuiz();
    main.querySelector('[aria-current="step"]').focus();
  });
  main.querySelectorAll('[name=answer]').forEach(input=>input.onchange=()=>{
    answers[q.id]=Number(input.value);
    try { sessionStorage.setItem(draftKey(attempt.id),JSON.stringify(answers)); } catch {}
    const pending=questions.length-Object.keys(answers).length;
    main.querySelector('#answer-count').textContent=(questions.length-pending)+' / '+questions.length+' terjawab · '+pending+' belum dijawab';
    const number=main.querySelector('[aria-current="step"]');
    number.setAttribute('data-answered','');
    number.setAttribute('aria-label','Soal '+(index+1)+', terjawab');
  });
  const send=main.querySelector('#submit-quiz');
  send.onclick=()=>busy(send,async()=>{
    const pending=questions.length-Object.keys(answers).length;
    if (!window.confirm(pending?'Ada '+pending+' soal belum terjawab. Kirim jawaban sekarang?':'Kirim semua jawaban?')) return;
    const active=attempt;
    const serial=routeNumber;
    active.sending=true;
    main.querySelectorAll('[data-number],[name=answer]').forEach(el=>el.disabled=true);
    try {
      const result=await checked(db.rpc('kb_submit_quiz',{p_attempt:active.id,p_answers:answers}));
      try { sessionStorage.removeItem(draftKey(active.id)); } catch {}
      try { await refresh(['quiz_results'],uid()); }
      catch { toast('Skor sudah tersimpan. Muat ulang untuk memperbarui riwayat.',true); }
      if (serial===routeNumber) setView(heading('Hasil kuis',quiz.title,'./latihan.html')+
        '<div class="panel"><p class="progress-number">'+esc(result.score)+' <small>/ 100</small></p>'+
        '<p>'+esc(result.correct)+' dari '+esc(result.total)+' soal benar</p><div class="actions">'+
        button('Lihat riwayat','./latihan.html#/riwayat','secondary')+'<button class="btn" id="retake">Kerjakan lagi</button></div></div>');
      if (serial===routeNumber) main.querySelector('#retake').onclick=()=>render();
    } finally {
      active.sending=false;
      if (serial===routeNumber) main.querySelectorAll('[data-number],[name=answer]').forEach(el=>el.disabled=false);
    }
  });
}
async function takeQuiz(id,serial) {
  const quiz=byId(quizzes(),id);
  if (!quiz) { setView(heading('Kuis tidak ditemukan','','./latihan.html')); return; }
  setView(heading(quiz.title,'','./latihan.html')+'<p class="loading" role="status">Memuat soal…</p>');
  try {
    const result=await checked(db.rpc('kb_begin_quiz',{p_quiz:String(id)}));
    if (serial!==routeNumber) return;
    attempt={id:result.id,quiz,questions:result.questions,index:0,answers:readDraft(result.id,result.questions),sending:false};
    drawQuiz();
  } catch (error) {
    if(serial===routeNumber) setView(heading(quiz.title,'','./latihan.html')+empty(error.message || 'Soal belum bisa dimuat.')+
      '<div class="actions"><button id="reload-quiz" class="btn">Coba lagi</button></div>');
    main.querySelector('#reload-quiz')?.addEventListener('click',render);
  }
}
function quizList(route) {
  const history=route==='riwayat';
  return heading(history?'Riwayat kuis':'Pusat Latihan',history?'Skor dan tanggal setiap pengiriman.':'Pilih kuis untuk menguji pemahamanmu.')+
    '<div class="tabs"><a class="pill" href="./latihan.html"'+(!history?' aria-current="page"':'')+'>Daftar kuis</a>'+
    '<a class="pill" href="./latihan.html#/riwayat"'+(history?' aria-current="page"':'')+'>Riwayat</a></div>'+
    (history?historyTable():quizCards(quizzes()));
}
function agenda() {
  const rows=[...data.agenda].sort((a,b)=>String(a.due_on || '9999').localeCompare(String(b.due_on || '9999')));
  return heading('Agenda Belajar','Atur jadwal belajar dan tugas pribadimu.',dashboard)+
    '<form class="form inline panel filterbar" id="agenda-form"><label class="field">Kegiatan<input name="title" maxlength="180" required></label>'+
    '<label class="field">Tanggal <input name="due_on" type="date"></label><button class="btn" type="submit">Tambah agenda</button></form>'+
    (rows.length?'<div class="stack">'+rows.map(item=>'<article class="card row"><div class="grow"><h3>'+esc(item.title)+
      '</h3><small>'+esc(date(item.due_on,true) || 'Tanpa tanggal')+'</small></div><button class="btn secondary" data-agenda="toggle" data-id="'+
      esc(item.id)+'" aria-pressed="'+item.completed+'">'+(item.completed?'Selesai':'Tandai selesai')+'</button>'+
      '<button class="btn danger" data-agenda="delete" data-id="'+esc(item.id)+'" aria-label="Hapus '+esc(item.title)+'">Hapus</button></article>').join('')+
      '</div>':empty('Belum ada agenda. Tambahkan kegiatan lewat formulir di atas.'));
}
function statPage() {
  const recent=newest(data.activity,'opened_at').filter(row=>row.opened_at).slice(0,10);
  return heading('Statistik Belajar','Ikuti progres dan aktivitas dari akunmu.',dashboard)+metrics()+
    section('Materi yang baru dibuka',recent.length?'<div class="stack">'+recent.map(row=>{
      const item=byId(materials(),row.material_id);
      return '<article class="card row"><div class="grow"><h3>'+(item?'<a href="'+materialUrl(item.id)+'">'+esc(item.title)+'</a>':'Materi diarsipkan')+
        '</h3><small>'+date(row.opened_at,true)+'</small></div></article>';
    }).join('')+'</div>':empty('Belum ada aktivitas membaca.'))+section('Riwayat kuis',historyTable(), './latihan.html#/riwayat');
}
function badgePage() {
  const badges=[
    ['Kuis pertama','Kirim satu kuis.',data.results.length>=1],
    ['Skor sempurna','Raih skor 100 dalam satu kuis.',data.results.some(row=>Number(row.score)===100)],
    ['Pembaca tekun','Selesaikan lima materi.',finished().length>=5],
    ['Belajar rutin','Kerjakan kuis pada tiga hari berbeda.',new Set(data.results.map(row=>date(row.completed_at,true)).filter(Boolean)).size>=3]
  ];
  return heading('Galeri Pencapaian','Lencana mengikuti aktivitas yang tercatat di akun.',dashboard)+'<div class="grid">'+
    badges.map(([title,description,got])=>'<article class="card row" style="'+tone(got?'amber':'slate')+'">'+iconBox(got?'crown':'star')+
    '<div class="grow"><h3>'+title+'</h3><p>'+description+'</p><small class="tag '+(got?'success':'locked')+'">'+(got?'Didapat':'Terkunci')+
    '</small></div></article>').join('')+'</div>';
}
const planets=[
  ['Merkurius','Paling dekat dengan Matahari. Satu tahun di Merkurius sekitar 88 hari Bumi.'],
  ['Venus','Atmosfer tebalnya memerangkap panas. Venus adalah planet terpanas di tata surya.'],
  ['Bumi','Memiliki air cair yang melimpah di permukaan dan satu satelit alami, Bulan.'],
  ['Mars','Permukaannya tampak kemerahan karena mineral besi yang teroksidasi.'],
  ['Jupiter','Planet terbesar di tata surya. Bintik Merah Besar merupakan badai raksasa.'],
  ['Saturnus','Cincinnya tersusun dari banyak bongkahan es dan batu dengan ukuran beragam.'],
  ['Uranus','Sumbu rotasinya sangat miring sehingga tampak menggelinding saat mengorbit Matahari.'],
  ['Neptunus','Planet terjauh dari Matahari. Atmosfernya memiliki angin yang sangat kencang.']
];
function orbit() {
  return heading('Jelajahi tata surya','Pilih planet untuk membaca fakta singkatnya.',learnUrl('eksplorasi'))+
    '<div class="orbit-lab"><figure><img src="./assets/orbit.webp" width="1440" height="960" alt="Ilustrasi planet bercincin dan roket">'+
    '<figcaption>Ilustrasi artistik tata surya.</figcaption></figure></div>'+
    '<section class="section panel"><div class="tabs" id="planet-tabs" aria-label="Planet">'+planets.map(([name],i)=>
      '<button class="pill" type="button" data-planet="'+i+'"'+(i===0?' aria-current="true"':'')+'>'+name+'</button>').join('')+
    '</div><div id="planet-fact" class="stack" aria-live="polite"><h2>'+planets[0][0]+'</h2><p>'+planets[0][1]+'</p></div></section>';
}
function learning(route) {
  const pages={
    agenda,statistik:statPage,pencapaian:badgePage,orbit,
    pilihan:()=>heading('Pilihan Minggu Ini','Materi pilihan admin atau materi terbaru dari perpustakaan.',dashboard)+materialCards(recommendations()),
    pengumuman:()=>heading('Notifikasi','Kabar dari kelas dan aktivitas belajarmu.',dashboard)+section('Tugas dan tenggat',data.notices?.length?data.notices.map(t=>button(t.title+' · '+date(t.due,true),'./kelas.html?id='+enc(t.class_id),'ghost')).join(''):empty('Tidak ada tugas yang menunggu.'))+section('Pengumuman',announcements(newest(data.announcements)))+section('Hasil kuis mandiri',historyTable(newest(data.results,'completed_at').slice(0,3)))+section('Sesi live selesai',data.liveHistory?.filter(r=>r.status==='finished').map(r=>button(r.title,'./live.html?room='+enc(r.code),'ghost')).join('')||empty('Belum ada hasil live.'))+section('Pencapaian',button('Lihat lencana akun',learnUrl('pencapaian'),'secondary')),
    eksplorasi:()=>heading('Ruang Eksplorasi','Belajar lewat konten interaktif dan koleksi tambahan.',dashboard)+
      '<a class="hero" href="'+learnUrl('orbit')+'"><div class="hero-copy"><h2>Jelajahi tata surya</h2><p>Pilih planet dan baca fakta singkatnya.</p>'+
      '<span class="btn light">Mulai eksplorasi</span></div></a>'+section('Koleksi eksplorasi',features(data.features)),
    langganan:()=>{
      const plan=data.config.subscription;
      return heading('Langganan','Informasi paket dan akses belajar.',dashboard)+
        (plan?.title?'<section class="panel article"><h2>'+esc(plan.title)+'</h2><p class="prose">'+esc(plan.description || '')+'</p>'+
          (safeUrl(plan.url)?'<div class="actions">'+button('Lihat detail paket',safeUrl(plan.url),'secondary')+'</div>':'')+'</section>':
          empty('Belum ada paket langganan yang diumumkan.'));
    },
    cari:()=>heading('Cari konten','Telusuri materi, kuis, mata pelajaran, dan fitur.',dashboard)+
      '<label class="field panel filterbar">Kata kunci<input type="search" id="global-query" placeholder="Cari judul atau topik"></label><div id="search-results">'+
      empty('Ketik kata kunci untuk memulai.')+'</div>',
    profil:()=>heading('Profil akun','','./belajar.html#/menu')+'<form class="panel form article" id="profile-form">'+
      '<label class="field">Avatar siswa<select name="face">'+['Biru','Jingga','Ungu','Hijau'].map((label,i)=>'<option value="'+i+'" '+(profileFace(account)===i?'selected':'')+'>'+label+'</option>').join('')+'</select></label><div class="face-list">'+[0,1,2,3].map(i=>'<img width="48" src="./assets/faces/student-'+i+'.webp" alt="Avatar '+(i+1)+'">').join('')+'</div><label class="field">Nama tampilan<input name="full_name" value="'+esc(account.name)+'" maxlength="80" required></label>'+
      '<p class="quiet">'+esc(account.user.email)+' · '+(account.admin?'Admin':'Siswa')+'</p><div class="actions"><button class="btn">Simpan nama</button>'+
      button('Pulihkan kata sandi','./reset-password.html','ghost')+'</div></form>',
    bantuan:()=>heading('Bantuan','','./belajar.html#/menu')+
      '<div class="panel stack"><details><summary>Bagaimana menyimpan progres materi?</summary><p>Buka materi, lalu pilih Tandai selesai. Progres terhubung dengan akun.</p></details>'+
      '<details><summary>Tautan reset kata sandi kedaluwarsa</summary><p>Kembali ke halaman pemulihan dan kirim tautan baru ke email akunmu.</p></details>'+
      '<details><summary>Soal kuis gagal dimuat</summary><p>Coba muat ulang. Jika ada pesan bahwa soal perlu diperbaiki, sampaikan judul kuis ke admin sekolah.</p></details></div>',
    menu:()=>heading('Menu Lain','Kelola akun dan buka fitur tambahan.',dashboard)+'<div class="grid">'+[
      ['Kelas dan tugas','cal','./kelas.html'],['Kuis Live','clip','./live.html'],...(['teacher','guru','admin'].includes(account.profile?.role)?[['Ruang Guru','laptop','./guru.html']]:[]),['Cari konten','target',learnUrl('cari')],['Profil akun','chat',learnUrl('profil')],['Bantuan','book',learnUrl('bantuan')],
      ['Pengumuman','clip',learnUrl('pengumuman')],...(account.admin?[['Panel admin','laptop','./kelola.html']]:[])
    ].map(([name,mark,href])=>'<a class="card row" href="'+href+'">'+iconBox(mark)+'<h3>'+name+'</h3></a>').join('')+
      '</div>'+section('Fitur tambahan',features(data.features))+'<div class="actions">'+
      (hasLegacyData()?'<button class="btn secondary" id="import-legacy">Impor data perangkat lama</button>':'')+
      '<button class="btn danger" id="logout">Keluar</button></div>'
  };
  return (Object.hasOwn(pages,route)?pages[route]:pages.menu)();
}

function legacyData() {
  const read=key=>{
    try { return JSON.parse(localStorage.getItem('kb:'+key+':'+uid()) || '[]'); } catch { return []; }
  };
  const savedRows=read('saved'), agendaRows=read('agenda');
  let last='';
  try { last=localStorage.getItem('kb:last:'+uid()) || ''; } catch {}
  return {savedRows:Array.isArray(savedRows)?savedRows:[],agendaRows:Array.isArray(agendaRows)?agendaRows:[],last};
}
function hasLegacyData() {
  const {savedRows,agendaRows,last}=legacyData();
  return Boolean(savedRows.length || agendaRows.length || last);
}
async function importLegacy() {
  const {savedRows,agendaRows,last}=legacyData();
  if (!window.confirm('Salin bookmark, riwayat terakhir, dan agenda dari perangkat ini ke akunmu?')) return;
  const valid=materials();
  const ids=[...new Set(savedRows.filter(row=>row?.id!=null).map(row=>String(row.id)))];
  for (const id of ids) {
    if (byId(valid,id) && !saved(id)) await materialAction(id,'bookmark');
  }
  if (last && byId(valid,last) && !latest()) await materialAction(last,'open');
  const oldAgenda=agendaRows.filter(row=>row?.id!=null && typeof row.t==='string' && row.t.trim()).map(row=>({
    student_id:uid(),title:row.t.trim().slice(0,180),
    due_on:/^\d{4}-\d{2}-\d{2}$/.test(row.d || '')?row.d:null,
    completed:Boolean(row.done),legacy_ref:'old:'+String(row.id)
  }));
  if (oldAgenda.length) await checked(db.from('kb_agenda').upsert(oldAgenda,{
    onConflict:'student_id,legacy_ref',ignoreDuplicates:true
  }));
  await refresh(['kb_material_activity','kb_agenda'],uid());
  toast('Data lama yang masih tersedia sudah disalin ke akun.');
}

function wireLearn() {
  const legacyButton=main.querySelector('#import-legacy');
  if (legacyButton) legacyButton.onclick=()=>busy(legacyButton,importLegacy);
  const agendaForm=main.querySelector('#agenda-form');
  if (agendaForm) agendaForm.onsubmit=event=>{
    event.preventDefault();
    const input=Object.fromEntries(new FormData(agendaForm));
    busy(event.submitter,async()=>{
      if (!input.title.trim()) throw new Error('Isi nama kegiatan.');
      await checked(db.from('kb_agenda').insert({title:input.title.trim(),due_on:input.due_on || null}));
      await refresh(['kb_agenda'],uid());
      if (getRoute('menu')[0]==='agenda') await render();
      toast('Agenda ditambahkan.');
    });
  };
  main.querySelectorAll('[data-agenda]').forEach(control=>control.onclick=()=>busy(control,async()=>{
    const row=byId(data.agenda,control.dataset.id);
    if (!row) return;
    if (control.dataset.agenda==='delete') {
      if (!window.confirm('Hapus agenda ini?')) return;
      await checked(db.from('kb_agenda').delete().eq('id',row.id).eq('student_id',uid()));
    } else await checked(db.from('kb_agenda').update({completed:!row.completed}).eq('id',row.id).eq('student_id',uid()));
    await refresh(['kb_agenda'],uid());
    if (getRoute('menu')[0]==='agenda') await render();
  }));
  const query=main.querySelector('#global-query');
  if (query) query.oninput=()=>{
    const q=query.value.trim();
    const target=main.querySelector('#search-results');
    if (!q) { target.innerHTML=empty('Ketik kata kunci untuk memulai.'); return; }
    const subjects=filtered(data.subjects,q,s=>[s.name,s.description]);
    const chapters=filtered(data.kb_chapters,q,c=>[c.title,c.description,c.summary]);
    target.innerHTML=section('Materi',materialCards(filtered(materials(),q,m=>[m.title,m.description,m.kb_category,subjectName(m.subject_id)]),
      'Tidak ada materi yang cocok.'))+section('Kuis',quizCards(filtered(quizzes(),q,k=>[k.title,k.description,subjectName(k.subject_id)])))+
      section('Mata pelajaran',subjects.length?'<div class="grid">'+subjects.map(s=>'<a class="card" href="./pelajaran.html#/mapel/'+enc(s.id)+
        '"><h3>'+esc(s.name)+'</h3></a>').join('')+'</div>':empty('Tidak ada mata pelajaran yang cocok.'))+
      section('Bab',chapters.length?chapters.map(c=>button(c.title,'./pelajaran.html#/mapel/'+enc(c.subject_id),'ghost')).join(''):empty('Tidak ada bab yang cocok.'))+
      section('Fitur tambahan',features(filtered(data.features,q,f=>[f.title,f.description])));
  };
  main.querySelectorAll('[data-planet]').forEach(control=>control.onclick=()=>{
    const [name,fact]=planets[Number(control.dataset.planet)];
    main.querySelector('[data-planet][aria-current]')?.removeAttribute('aria-current');
    control.setAttribute('aria-current','true');
    main.querySelector('#planet-fact').innerHTML='<h2>'+name+'</h2><p>'+fact+'</p>';
  });
  const form=main.querySelector('#profile-form');
  if (form) form.onsubmit=event=>{
    event.preventDefault();
    const name=new FormData(form).get('full_name').trim();
    busy(event.submitter,async()=>{
      if (!name) throw new Error('Isi nama tampilan.');
      if (account.profile) await checked(db.rpc('kb_set_name',{p_name:name}));
      else await checked(db.auth.updateUser({data:{full_name:name}}));
      const face=Number(new FormData(form).get('face'));
      account.user=(await checked(db.auth.updateUser({data:{kb_face:face}}))).user;
      account.name=name;
      shell(account,data.config.ui);
      toast('Nama tampilan disimpan.');
    });
  };
  const logout=main.querySelector('#logout');
  if (logout) logout.onclick=()=>busy(logout,signOut);
}
main.addEventListener('click',event=>{
  const control=event.target.closest('[data-asset]');
  if (control) busy(control,()=>openAttachment(control));
});
async function render() {
  const serial=++routeNumber;
  shell(account,data.config.ui);
  const term=new URLSearchParams(location.search).get('q');
  const [route,id]=getRoute(page==='learn'?(term?'cari':'menu'):'home');
  try {
    if (page==='dashboard') {
      if (route==='latihan' || route==='kuis' || route==='riwayat') { location.replace(id?quizUrl(id):'./latihan.html'+(route==='riwayat'?'#/riwayat':'')); return; }
      if (['agenda','statistik','pilihan','pencapaian','menu','pengumuman'].includes(route)) { location.replace(learnUrl(route)); return; }
      setView(home());
    } else if (page==='library') {
      if (['materi','fitur'].includes(route) && id) {
        setView('<p class="loading" role="status">Memuat konten…</p>');
        await article(route,id,serial);
      } else {
        opened='';
        filters={query:'',subject:'',category:''};
        library(route,id);
      }
    } else if (page==='quiz') {
      if (route==='kuis' && id) await takeQuiz(id,serial);
      else setView(quizList(route));
    } else {
      if(route==='pengumuman'){[data.notices,data.liveHistory]=await Promise.all([checked(db.rpc('kb_live_class',{action:'notices'})),checked(db.rpc('kb_live_history'))]);if(serial!==routeNumber)return;}
      setView(learning(route));
      wireLearn();
      if(term && route==='cari'){const input=main.querySelector('#global-query');input.value=term;input.oninput();}
    }
  } catch(error) { if(serial===routeNumber) loadError(error); }
}
async function start() {
  account=await guard();
  if (!account) return;
  shell(account);
  await refresh([...tablesForPage[page],'site_config'],uid());
  await render();
  addEventListener('hashchange',()=>{
    if (location.hash==='#main') return;
    render();
    scrollTo(0,0);
  });
}
start().catch(loadError);

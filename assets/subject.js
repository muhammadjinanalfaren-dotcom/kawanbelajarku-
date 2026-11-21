import {esc,enc,section,empty,materialUrl,button,subjectIcon,safeUrl,learnUrl} from './common.js';
import {data,materials,quizzes,complete,quizCards,materialCards} from './student-data.js';
export function subjectView(s,account,face){
 const base=materials().filter(m=>String(m.subject_id)===String(s.id)),qs=quizzes().filter(q=>String(q.subject_id)===String(s.id));
 const chapters=data.kb_chapters.filter(c=>String(c.subject_id)===String(s.id)).sort((a,b)=>a.semester-b.semester||a.position-b.position);
 let tab='Materi',sem='',query='';
 const chaptersFor=()=>chapters.filter(c=>!sem||String(c.semester)===sem);
 const related=(item,list)=>list.filter(x=>String(x.kb_chapter)===String(item.id));
 const matches=(text)=>String(text||'').toLocaleLowerCase().includes(query.toLocaleLowerCase());
 const next=base.find(m=>!complete(m.id))||base[0], art=safeUrl(s.kb_image);
 const semesters=[...new Set([...chapters.map(c=>c.semester),...base.map(m=>/^Semester ([12])$/.exec(m.kb_category)?.[1])].filter(Boolean).map(String))].sort();
 const pct=base.length?Math.round(base.filter(m=>complete(m.id)).length*100/base.length):0;
 const target=document.querySelector('#main');
 target.innerHTML='<div class="lesson-profile"><img width="42" src="'+esc(face)+'" alt=""><div><b>'+esc(account.name)+'</b><small class="lesson-pct">Progres pelajaran · '+pct+'%</small></div><a class="textlink" href="./pelajaran.html#/semua">Semua pelajaran</a></div><label class="field search-home"><input id="chapter-search" type="search" placeholder="Cari bab atau materi" aria-label="Cari bab atau materi"></label>'+
 '<section class="lesson-hero">'+(art?'<img alt="" src="'+esc(art)+'">':/matematika/i.test(s.name)?'<img src="./assets/matematika.webp" alt="">':subjectIcon(s,data.config.style))+'<div><small>'+esc(s.kb_grade||'Mata pelajaran')+'</small><h1>'+esc(s.name)+'</h1><p>'+esc(s.description||'')+'</p>'+(next?button('Lanjut belajar',materialUrl(next.id)):'')+'</div></section>'+
 '<div class="tabs section" id="subject-tabs">'+['Materi','Latihan','Ringkasan','Info'].map(x=>'<button class="pill" data-tab="'+x+'">'+x+'</button>').join('')+'</div><label class="field" '+(semesters.length?'':'hidden')+'>Semester<select id="semester"><option value="">Semua semester</option>'+semesters.map(n=>'<option>'+esc(n)+'</option>').join('')+'</select></label><div id="chapters"></div>';
 target.setAttribute('aria-busy','false');
 function draw(){
 target.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(tab===b.dataset.tab)));
 const list=chaptersFor(),out=target.querySelector('#chapters');
 if(tab==='Info'){out.innerHTML=section('Tentang pelajaran','<div class="panel"><p>'+esc(s.description||'Deskripsi belum diisi.')+'</p><p>'+chapters.length+' bab · '+base.length+' materi · '+qs.length+' latihan</p></div>');return;}
 if(tab==='Latihan'){out.innerHTML=section('Latihan',quizCards(qs.filter(q=>(!sem||list.some(c=>c.id===q.kb_chapter))&&matches(q.title))));return;}
 if(tab==='Ringkasan'){const summaries=list.filter(c=>c.summary&&matches(c.title+' '+c.summary));out.innerHTML=section('Ringkasan bab',summaries.length?summaries.map(c=>'<article class="card"><h3>'+esc(c.title)+'</h3><p class="prose">'+esc(c.summary)+'</p></article>').join(''):empty('Belum ada ringkasan yang cocok.'));return;}
 const rows=list.map(c=>{
 const all=related(c,base),filtered=matches(c.title)?all:all.filter(m=>matches(m.title));if(query&&!matches(c.title)&&!filtered.length)return '';
 const done=all.filter(m=>complete(m.id)).length,pct=all.length?Math.round(100*done/all.length):0;
 return '<details class="panel chapter" '+(query?'open':'')+'><summary>'+subjectIcon(s,data.config.style)+'<span><small>Semester '+c.semester+' · Bab '+c.position+'</small><strong>'+esc(c.title)+'</strong><progress max="100" value="'+pct+'"></progress><small>'+pct+'%</small></span><b>'+(!all.length?'Kosong':pct===100?'Selesai':done?'Lanjut':'Mulai')+'</b></summary><p>'+esc(c.description)+'</p>'+materialCards(filtered)+'</details>';
 }).join('');
 const uncategorized=base.filter(m=>!m.kb_chapter&&matches(m.title)&&(!sem||m.kb_category==='Semester '+sem));
 out.innerHTML=section('Daftar bab',rows||empty('Belum ada bab yang cocok.'))+(uncategorized.length?section('Materi tanpa bab',materialCards(uncategorized)):'');
 }
 target.querySelector('#chapter-search').oninput=e=>{query=e.target.value;draw();};target.querySelector('#semester').onchange=e=>{sem=e.target.value;draw();};
 target.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;draw();});draw();
}
export function bannerHref(value){
 if(typeof value!=='string'||!/^\.\/(pelajaran|latihan|belajar|live)\.html(?:#\/[a-zA-Z0-9_%/-]*)?$/.test(value))return '';
 return value;
}
export function banners(rows){return rows.slice().sort((a,b)=>a.position-b.position).map(r=>{
 const href=bannerHref(r.destination),image=safeUrl(r.image);
 return '<article class="lesson-hero">'+(image?'<img src="'+esc(image)+'" alt="">':'')+'<div><small>'+esc(r.category)+'</small><h2>'+esc(r.title)+'</h2><p>'+esc(r.description)+'</p>'+(href?button('Buka rekomendasi',href):'')+'</div></article>';
 }).join('');}

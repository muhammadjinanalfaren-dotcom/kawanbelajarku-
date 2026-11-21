import {bannerHref} from './subject.js';
import {
  db,main,page,guard,shell,heading,setView,checked,allRows,esc,enc,byId,same,button,toast,busy,empty,
  getRoute,loadError,safeUrl,date,signOut
} from './common.js';
import {iconNames,themes} from './icons.js';
import {announcementText,newest} from './student-data.js';

const state={subjects:[],materials:[],quizzes:[],features:[],announcements:[],attachments:[],questions:[],site_config:[]};
const names={kb_chapters:'Bab',kb_banners:'Banner',subjects:'Mata pelajaran',materials:'Materi',quizzes:'Kuis',questions:'Soal kuis',announcements:'Pengumuman',
  features:'Fitur tambahan',attachments:'Lampiran',recommend:'Rekomendasi',settings:'Tampilan',subscription:'Langganan',
  results:'Hasil siswa',usage:'Statistik'};
const base=page==='editor'?'./editor.html':'./kelola.html';
const tabs=page==='editor'?['features','attachments','recommend','kb_banners','settings','subscription']:
  ['usage','subjects','kb_chapters','materials','quizzes','questions','announcements','results'];
const bucket='kb-learning';
const allowedMime=['application/pdf','image/png','image/jpeg','image/webp','video/mp4','video/webm','audio/mpeg','text/plain'];
let account, screenNumber=0;
const href=(key,id='')=>base+'#/'+key+(id?'/'+enc(id):'');
const cfg=key=>state.site_config.find(row=>row.key===key)?.value || {};
const rows=(table,columns='*',order='id',condition=q=>q)=>allRows(()=>condition(db.from(table).select(columns).order(order)));
const active=table=>state[table].filter(row=>!row.kb_archived);
const label=(value,text)=>[String(value),text];

function input(name,text,value='',attrs='') {
  return '<label class="field">'+esc(text)+'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';
}
function textarea(name,text,value='',attrs='') {
  return '<label class="field">'+esc(text)+'<textarea name="'+name+'" '+attrs+'>'+esc(value)+'</textarea></label>';
}
function select(name,text,items,value='') {
  return '<label class="field">'+esc(text)+'<select name="'+name+'" required><option value="">Pilih '+esc(text.toLowerCase())+'</option>'+
    items.map(([id,title])=>'<option value="'+esc(id)+'"'+(same(id,value)?' selected':'')+'>'+esc(title)+'</option>').join('')+'</select></label>';
}
const pickSubjects=id=>select('subject_id','Mata pelajaran',state.subjects.map(s=>label(s.id,s.name+(s.kb_archived?' (arsip)':''))),id);
const titleField=(item={})=>input('title','Judul',item.title,'required maxlength="180"');
const descField=(item={})=>textarea('description','Deskripsi',item.description,'maxlength="2000"');
const archiveTables=['subjects','materials','quizzes','announcements','features'];
const chapterSelect=item=>select('kb_chapter','Bab (opsional)',(state.kb_chapters||[]).map(c=>label(c.id,c.title+' · Semester '+c.semester)),item.kb_chapter).replace(' required','');
const resource = {
  kb_chapters:{
    fields:(i={})=>pickSubjects(i.subject_id)+titleField(i)+input('semester','Semester',i.semester||1,'type="number" min="1" max="2" required')+input('position','Urutan bab',i.position||1,'type="number" min="1" required')+descField(i)+textarea('summary','Ringkasan',i.summary),
    payload:d=>({...d,semester:Number(d.semester),position:Number(d.position)})
  },
  kb_banners:{
    fields:(i={})=>titleField(i)+descField(i)+input('category','Kategori',i.category)+input('image','URL ilustrasi HTTPS',i.image,'type="url"')+input('position','Urutan',i.position||1,'type="number" required')+input('destination','Halaman tujuan',i.destination||'./pelajaran.html','required'),
    payload:d=>({...d,position:Number(d.position)})
  },
  subjects:{
    fields:(item={})=>input('name','Nama mata pelajaran',item.name,'required maxlength="160"')+descField(item)+input('kb_grade','Kelas',item.kb_grade)+input('kb_image','URL ilustrasi',item.kb_image,'type="url"'),
    payload:d=>({name:d.name.trim(),description:d.description.trim() || null,kb_grade:d.kb_grade,kb_image:d.kb_image})
  },
  materials:{
    fields:(item={})=>pickSubjects(item.subject_id)+chapterSelect(item)+titleField(item)+input('kb_category','Kategori',item.kb_category,'maxlength="80"')+
      descField(item)+textarea('content','Isi materi',item.content,'required'),
    payload:d=>({subject_id:d.subject_id,kb_chapter:d.kb_chapter||null,title:d.title.trim(),description:d.description.trim() || null,
      content:d.content.trim(),kb_category:d.kb_category.trim() || null})
  },
  quizzes:{
    fields:(item={})=>pickSubjects(item.subject_id)+chapterSelect(item)+titleField(item)+descField(item),
    payload:d=>({subject_id:d.subject_id,kb_chapter:d.kb_chapter||null,title:d.title.trim(),description:d.description.trim() || null})
  },
  announcements:{
    fields:(item={})=>titleField(item)+textarea('kb_message','Isi pengumuman',announcementText(item),'required'),
    payload:d=>({title:d.title.trim(),kb_message:d.kb_message.trim()})
  },
  features:{
    fields:(item={})=>titleField(item)+descField(item)+textarea('content','Isi konten',item.content)+
      select('icon','Ikon',iconNames.map(item=>label(item,item)),item.icon || 'star')+
      select('theme','Warna',Object.keys(themes).map(item=>label(item,item)),item.theme || 'sky'),
    payload:d=>({title:d.title.trim(),description:d.description.trim() || null,content:d.content.trim() || null,icon:d.icon,theme:d.theme})
  }
};
function formHtml(id,fields,editing=false,extra='') {
  return '<form class="panel form admin-form" id="'+id+'">'+fields+'<div class="actions"><button class="btn" type="submit">'+
    (editing?'Simpan perubahan':'Simpan')+'</button>'+extra+'</div></form>';
}
function itemList(table,items,idKey='id') {
  if (!items.length) return empty('Belum ada data.');
  const archive=archiveTables.includes(table);
  return '<div class="panel">'+items.map(item=>{
    const name=item.name || item.title || item.question_text || 'Lampiran';
    const extra=table==='quizzes'?button('Kelola soal',href('questions',item.id),'secondary'):'';
    return '<div class="admin-row"><div><h3>'+esc(name)+'</h3><p>'+esc(item.description || '')+'</p>'+
      (item.kb_archived?'<small class="tag locked">Diarsipkan</small>':'')+'</div><div class="actions">'+
      '<button class="btn ghost" data-edit="'+esc(item[idKey])+'">Edit</button>'+extra+
      '<button class="btn '+(item.kb_archived?'secondary':'danger')+'" data-remove="'+esc(item[idKey])+'">'+
      (archive?(item.kb_archived?'Pulihkan':'Arsipkan'):'Hapus')+'</button></div></div>';
  }).join('')+'</div>';
}
async function saveRecord(table,values,id,idKey='id') {
  const query=id?db.from(table).update(values).eq(idKey,id):db.from(table).insert(values);
  return checked(query.select(idKey).single());
}
function editableList(table,items,editor,refresh,idKey='id') {
  main.querySelectorAll('[data-edit]').forEach(control=>control.onclick=()=>{
    const item=items.find(row=>same(row[idKey],control.dataset.edit));
    if (item) editor(item);
  });
  main.querySelectorAll('[data-remove]').forEach(control=>control.onclick=()=>busy(control,async()=>{
    const row=items.find(item=>same(item[idKey],control.dataset.remove));
    if (!row) return;
    const archive=archiveTables.includes(table);
    const label=archive?(row.kb_archived?'Pulihkan':'Arsipkan'):'Hapus';
    if (!window.confirm(label+' “'+(row.title || row.name || row.question_text || 'lampiran')+'”?'+
      (archive && !row.kb_archived?' Konten hilang dari daftar siswa. Riwayat belajar tetap tersimpan.':''))) return;
    if (archive) await saveRecord(table,{kb_archived:!row.kb_archived},row[idKey],idKey);
    else await checked(db.from(table).delete().eq(idKey,row[idKey]).select(idKey).single());
    await refresh();
    toast('Perubahan disimpan.');
  }));
}
function renderFrame(key,body,detail='') {
  const nav=tabs.map(tab=>'<a class="pill" href="'+href(tab)+'"'+(tab===key?' aria-current="page"':'')+'>'+names[tab]+'</a>').join('');
  setView(heading(page==='editor'?'Editor Admin':'Panel Admin')+'<nav class="tabs" aria-label="Bagian admin">'+nav+'</nav>'+
    '<section class="stack"><header class="heading"><h2>'+names[key]+'</h2>'+(detail?'<p>'+esc(detail)+'</p>':'')+'</header>'+body+'</section>');
}
async function standard(key,serial) {
  const [items,subjects,chapters]=await Promise.all([rows(key),['materials','quizzes','kb_chapters'].includes(key)?rows('subjects'):Promise.resolve(state.subjects),['materials','quizzes'].includes(key)?rows('kb_chapters'):Promise.resolve([])]);
  state.kb_chapters=chapters;
  if (serial!==screenNumber) return;
  state[key]=items;
  state.subjects=key==='subjects'?items:subjects;
  renderFrame(key,'<div id="edit-form"></div>'+itemList(key,items),'Kelola konten yang tampil pada halaman siswa.');
  const edit=(item={})=>{
    const box=main.querySelector('#edit-form');
    const config=resource[key];
    box.innerHTML=formHtml('resource-form',config.fields(item),!!item.id,item.id?'<button type="button" class="btn ghost" id="cancel-edit">Batal</button>':'');
    box.querySelector('#cancel-edit')?.addEventListener('click',()=>edit());
    if (item.id) {
      box.scrollIntoView({block:'start'});
      box.querySelector('input,textarea,select')?.focus({preventScroll:true});
    }
    box.querySelector('form').onsubmit=event=>{
      event.preventDefault();
      const values=config.payload(Object.fromEntries(new FormData(event.currentTarget)));
      busy(event.submitter,async()=>{
        if(key==='kb_banners' && !bannerHref(values.destination))throw Error('Gunakan tujuan internal, misalnya ./pelajaran.html atau ./belajar.html#/orbit.');
        if(values.kb_chapter && !state.kb_chapters.some(c=>same(c.id,values.kb_chapter)&&same(c.subject_id,values.subject_id)))throw Error('Pilih bab dari mata pelajaran yang sama.');
        if (!(values.title || values.name) || ['content','kb_message'].some(k=>values[k]==='')) throw new Error('Lengkapi kolom yang wajib diisi.');
        if (key==='announcements') {
          await checked(db.rpc('kb_admin_save_announcement',{
            p_id:item.id==null?null:String(item.id),p_title:values.title,p_message:values.kb_message
          }));
        } else await saveRecord(key,values,item.id);
        if (serial===screenNumber) await render();
        toast('Data disimpan.');
      });
    };
  };
  edit();
  editableList(key,items,edit,()=>serial===screenNumber?render():undefined);
}
function parseOptions(value) {
  if (Array.isArray(value)) return value.map(v=>String(v ?? ''));
  if (value && typeof value==='object') {
    return Object.keys(value).sort((a,b)=>a.length-b.length || (a>b?1:a<b?-1:0)).map(key=>String(value[key] ?? ''));
  }
  if (typeof value==='string') {
    try { return parseOptions(JSON.parse(value)); }
    catch { return value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean); }
  }
  return [];
}
function answerIndex(opts,value) {
  const key=String(value ?? '').trim();
  if (!key) return -1;
  const text=opts.findIndex(option=>option.trim().toLowerCase()===key.toLowerCase());
  if (text>=0) return text;
  const index=/^[a-z]$/i.test(key)?key.toUpperCase().charCodeAt(0)-65:/^\d+$/.test(key)?Number(key):-1;
  return index>=0 && index<opts.length?index:-1;
}
async function questions(quizId,serial) {
  const list=await rows('quizzes');
  if (serial!==screenNumber) return;
  state.quizzes=list;
  const selected=byId(list,quizId);
  const items=selected?await rows('questions','kb_id,quiz_id,question_text,options,correct_answer,kb_correct_index','kb_id',q=>q.eq('quiz_id',selected.id)):[];
  if (serial!==screenNumber) return;
  state.questions=items;
  renderFrame('questions','<label class="field panel">Pilih kuis<select id="question-quiz"><option value="">Pilih kuis</option>'+
    list.map(q=>'<option value="'+esc(q.id)+'"'+(same(q.id,quizId)?' selected':'')+'>'+esc(q.title+(q.kb_archived?' (arsip)':''))+'</option>').join('')+
    '</select></label>'+(selected?'<div id="edit-form"></div>'+itemList('questions',items,'kb_id'):empty('Pilih kuis untuk melihat atau menambah soal.')));
  main.querySelector('#question-quiz').onchange=event=>{ location.href=href('questions',event.target.value); };
  if (!selected) return;
  const edit=(item={})=>{
    const box=main.querySelector('#edit-form');
    const opts=parseOptions(item.options);
    const key=item.kb_correct_index ?? answerIndex(opts,item.correct_answer);
    box.innerHTML=formHtml('question-form',textarea('question_text','Teks soal',item.question_text,'required')+
      textarea('choices','Pilihan jawaban, satu per baris',opts.join('\n'),'required')+
      input('correct','Nomor pilihan yang benar',key<0?'':key+1,'type="number" min="1" step="1" required'),
      !!item.kb_id,item.kb_id?'<button type="button" class="btn ghost" id="cancel-edit">Batal</button>':'');
    box.querySelector('#cancel-edit')?.addEventListener('click',()=>edit());
    if(item.kb_id) box.scrollIntoView({block:'start'});
    box.querySelector('form').onsubmit=event=>{
      event.preventDefault();
      const form=Object.fromEntries(new FormData(event.currentTarget));
      busy(event.submitter,async()=>{
        const question=form.question_text.trim();
        const options=form.choices.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
        const index=Number(form.correct)-1;
        if (!question || options.length<2 || options.length>26 || !options[index]) throw new Error('Isi teks soal, 2–26 pilihan dan nomor jawaban yang benar.');
        if (new Set(options.map(v=>v.toLowerCase())).size!==options.length) throw new Error('Setiap pilihan harus berbeda.');
        if (items.some(q=>!same(q.kb_id,item.kb_id) && q.question_text.trim().toLowerCase()===question.toLowerCase())) throw new Error('Teks soal sudah digunakan di kuis ini.');
        await checked(db.rpc('kb_admin_save_question',{
          p_id:item.kb_id || null,p_quiz:String(selected.id),p_text:question,p_options:options,p_answer:options[index],p_index:index
        }));
        if (serial===screenNumber) await render();
        toast('Soal disimpan.');
      });
    };
  };
  edit();
  editableList('questions',items,edit,()=>serial===screenNumber?render():undefined,'kb_id');
}
async function attachments(serial) {
  const [items,materials,features]=await Promise.all([rows('attachments'),rows('materials'),rows('features')]);
  if (serial!==screenNumber) return;
  Object.assign(state,{attachments:items,materials,features});
  renderFrame('attachments','<div id="edit-form"></div>'+itemList('attachments',items),'Tambahkan tautan atau unggah file untuk materi dan fitur.');
  const owners=[...materials.map(m=>label('material:'+m.id,'Materi · '+m.title+(m.kb_archived?' (arsip)':''))),
    ...features.map(f=>label('feature:'+f.id,'Fitur · '+f.title+(f.kb_archived?' (arsip)':'')))];
  const edit=(item={})=>{
    const box=main.querySelector('#edit-form');
    box.innerHTML=formHtml('attachment-form',select('owner','Konten',owners,item.owner_type+':'+item.owner_id)+
      titleField(item)+select('kind','Jenis',[label('link','Tautan'),label('video','Video'),label('file','File')],item.kind || 'link')+
      input('url','URL (untuk tautan atau file eksternal)',item.path?'':item.url,'type="url"')+
      (!item.id?'<label class="field">File (maks. 50 MB)<input type="file" name="file" accept="'+allowedMime.join(',')+'"></label>':''),
      !!item.id,item.id?'<button type="button" class="btn ghost" id="cancel-edit">Batal</button>':'');
    box.querySelector('#cancel-edit')?.addEventListener('click',()=>edit());
    if (item.id) box.scrollIntoView({block:'start'});
    box.querySelector('form').onsubmit=event=>{
      event.preventDefault();
      const values=Object.fromEntries(new FormData(event.currentTarget));
      busy(event.submitter,async()=>{
        const [owner_type,owner_id]=values.owner.split(':');
        const file=values.file?.size?values.file:null;
        const title=values.title.trim();
        if (!title) throw new Error('Isi judul lampiran.');
        let url=safeUrl(values.url);
        let path=item.path || null;
        let kb_bucket=item.kb_bucket || null;
        if (item.path) url=item.url;
        if (file) {
          if (file.size>52428800 || !allowedMime.includes(file.type)) throw new Error('Ukuran atau jenis file tidak didukung.');
          if (values.kind==='link' || (values.kind==='video' && !file.type.startsWith('video/'))) throw new Error('Pilih jenis file atau video yang sesuai.');
          path=owner_type+'/'+crypto.randomUUID()+'/'+file.name.replace(/[^\w.-]/g,'_').slice(-100);
          kb_bucket=bucket;
          await checked(db.storage.from(bucket).upload(path,file,{contentType:file.type}));
          url='';
        } else if (!item.path && !url) throw new Error('Masukkan URL yang valid atau pilih file.');
        try {
          await saveRecord('attachments',{owner_type,owner_id,title,kind:values.kind,url,path,kb_bucket},item.id);
        } catch(error) {
          if (file && error.code && !/^5/.test(error.code) && !/fetch|network|timeout/i.test(error.message || '')) {
            try { await checked(db.storage.from(bucket).remove([path])); } catch {}
          }
          throw error;
        }
        if (serial===screenNumber) await render();
        toast('Lampiran disimpan.');
      });
    };
  };
  edit();
  editableList('attachments',items,edit,()=>serial===screenNumber?render():undefined);
}
async function recommendations(serial) {
  const items=await rows('materials');
  if (serial!==screenNumber) return;
  state.materials=items;
  renderFrame('recommend',active('materials').length?'<div class="panel">'+newest(active('materials')).map(item=>
    '<div class="admin-row"><h3>'+esc(item.title)+'</h3><button class="btn '+(item.kb_recommended?'ghost':'secondary')+
    '" data-recommend="'+esc(item.id)+'" aria-pressed="'+item.kb_recommended+'">'+(item.kb_recommended?'Hapus dari pilihan':'Jadikan pilihan')+
    '</button></div>').join('')+'</div>':empty('Tambahkan materi di Panel Admin terlebih dahulu.'));
  main.querySelectorAll('[data-recommend]').forEach(control=>control.onclick=()=>busy(control,async()=>{
    const item=byId(items,control.dataset.recommend);
    await saveRecord('materials',{kb_recommended:!item.kb_recommended},item.id);
    if (serial===screenNumber) await render();
    toast('Rekomendasi diperbarui.');
  }));
}
async function saveConfig(key,value) {
  await checked(db.from('site_config').upsert({key,value,updated_at:new Date().toISOString()},{onConflict:'key'}));
}
function bindConfig(id,key,build,serial) {
  const form=main.querySelector('#'+id);
  if (!form) return;
  form.onsubmit=event=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form));
    busy(event.submitter,async()=>{
      await saveConfig(key,build(values));
      if (serial===screenNumber) await render();
      toast('Pengaturan disimpan.');
    });
  };
}
async function settings(key,serial) {
  const [configs,subjects]=await Promise.all([rows('site_config','key,value','key'),key==='settings'?rows('subjects'):Promise.resolve([])]);
  if (serial!==screenNumber) return;
  state.site_config=configs;
  shell(account,cfg('ui'),true);
  if (key==='subscription') {
    const plan=cfg('subscription');
    renderFrame(key,formHtml('subscription-form',input('title','Nama paket',plan.title,'maxlength="180"')+
      descField(plan)+input('url','Tautan informasi',plan.url,'type="url"'),true),
      'Kosongkan nama paket untuk menyembunyikan detail paket dari halaman siswa.');
    bindConfig('subscription-form','subscription',d=>{
      if (d.url && !safeUrl(d.url)) throw new Error('Masukkan tautan http atau https.');
      return {title:d.title.trim(),description:d.description.trim(),url:safeUrl(d.url)};
    },serial);
    return;
  }
  const ui=cfg('ui');
  const styles=cfg('style');
  const available=subjects.filter(s=>!s.kb_archived);
  renderFrame(key,formHtml('ui-form',input('name','Nama situs',ui.name || 'KawanBelajarku','required maxlength="50"')+
    input('welcome','Pesan dashboard',ui.welcome,'maxlength="160"')+
    input('color','Warna tombol (hex gelap)',ui.color || '#185ad7','pattern="#[0-9A-Fa-f]{6}" required'),true)+
    (available.length?'<h3>Ikon dan warna mata pelajaran</h3>'+formHtml('style-form',select('subject','Mata pelajaran',available.map(s=>label(s.id,s.name)))+
      select('icon','Ikon',iconNames.map(k=>label(k,k)),'book')+
      select('theme','Warna',Object.keys(themes).map(k=>label(k,k)),'sky'),true):''));
  bindConfig('ui-form','ui',d=>{
    const channels=d.color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    if (!d.name.trim() || .2126*channels[0]+.7152*channels[1]+.0722*channels[2]>.183) {
      throw new Error('Isi nama situs dan pilih warna yang cukup gelap agar teks putih terbaca.');
    }
    return {...ui,name:d.name.trim(),welcome:d.welcome.trim(),color:d.color};
  },serial);
  bindConfig('style-form','style',d=>({...styles,[d.subject]:{icon:d.icon,theme:d.theme}}),serial);
  const selector=main.querySelector('#style-form [name=subject]');
  if (selector) selector.onchange=()=>{
    const form=selector.form;
    form.elements.icon.value=styles[selector.value]?.icon || 'book';
    form.elements.theme.value=styles[selector.value]?.theme || 'sky';
  };
}
async function results(quizId,serial) {
  const quizList=await rows('quizzes','id,title,kb_archived');
  if (serial!==screenNumber) return;
  state.quizzes=quizList;
  const chosen=byId(quizList,quizId);
  const [scores,profiles]=chosen?await Promise.all([
    rows('quiz_results','id,quiz_id,student_id,score,completed_at','id',q=>q.eq('quiz_id',quizId)),
    rows('profiles','id,full_name')
  ]):[[],[]];
  if (serial!==screenNumber) return;
  renderFrame('results','<label class="field panel">Kuis<select id="result-quiz"><option value="">Pilih kuis</option>'+
    quizList.map(q=>'<option value="'+esc(q.id)+'"'+(same(q.id,quizId)?' selected':'')+'>'+esc(q.title)+'</option>').join('')+
    '</select></label>'+(scores.length?'<div class="panel table-wrap"><table><thead><tr><th scope="col">Siswa</th><th scope="col">Skor</th>'+
      '<th scope="col">Tanggal</th></tr></thead><tbody>'+newest(scores,'completed_at').map(r=>'<tr><td>'+
        esc(byId(profiles,r.student_id)?.full_name || 'Akun '+String(r.student_id).slice(0,8))+'</td><td>'+esc(r.score)+'</td><td>'+
        date(r.completed_at,true)+'</td></tr>').join('')+'</tbody></table></div>':empty(chosen?'Belum ada hasil.':'Pilih kuis untuk melihat hasil siswa.')));
  main.querySelector('#result-quiz').onchange=event=>{ location.href=href('results',event.target.value); };
}
async function usage(serial) {
  const result=await checked(db.rpc('kb_usage'));
  if (serial!==screenNumber) return;
  renderFrame('usage','<div class="metrics">'+[[result.students,'Profil siswa'],[result.completions,'Penyelesaian materi'],
    [result.attempts,'Percobaan kuis']].map(([value,name])=>'<div class="metric"><b>'+esc(value)+'</b><small>'+name+'</small></div>').join('')+
    '</div><div class="panel"><div class="actions">'+button('Ke Editor Admin','./editor.html','secondary')+
    '<button class="btn danger" id="admin-logout">Keluar</button></div></div>','Ringkasan penggunaan yang tercatat di Supabase.');
  const logout=main.querySelector('#admin-logout');
  logout.onclick=()=>busy(logout,signOut);
}
async function render() {
  const serial=++screenNumber;
  const [target,id]=getRoute(tabs[0]);
  const key=tabs.includes(target)?target:tabs[0];
  renderFrame(key,'<p class="loading" role="status">Memuat data…</p>');
  try {
    if (Object.hasOwn(resource,key)) await standard(key,serial);
    else if (key==='questions') await questions(id,serial);
    else if (key==='attachments') await attachments(serial);
    else if (key==='recommend') await recommendations(serial);
    else if (key==='settings' || key==='subscription') await settings(key,serial);
    else if (key==='results') await results(id,serial);
    else await usage(serial);
  } catch(error) {
    if (serial===screenNumber) loadError(error);
  }
}
async function start() {
  account=await guard(true);
  if (!account) return;
  state.site_config=await rows('site_config','key,value','key');
  shell(account,cfg('ui'),true);
  await render();
  addEventListener('hashchange',()=>{ if(location.hash!=='#main') { render(); scrollTo(0,0); } });
}
start().catch(loadError);

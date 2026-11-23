import {db,checked,guard,shell,setView,main,heading,esc,empty,busy,loadError,button} from './common.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
const bucket='kb-class-content',types=['application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/webm','text/plain'];
let classes,cid,state,token=0,previewUrls=[];
const rpc=(action,payload={})=>checked(db.rpc('kb_class_content',{action,payload:{...payload,class_id:cid}}));
const $=s=>main.querySelector(s);
const filename=p=>p.split('/').pop().slice(37);
function release(){previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];}
async function render(){
 release();const version=++token;cid=location.hash.slice(2)||classes[0]?.id;
 setView(heading('Konten kelas','Tugas dan lampiran dari guru.','./belajar.html#/menu')+
 (classes.length?'<label class="field">Kelas<select id="class">'+classes.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===cid?'selected':'')+'>'+esc(c.title)+'</option>').join('')+'</select></label><div id="posts" class="skeleton"></div>':empty('Kamu belum memiliki kelas.')+button('Buka kelas','./kelas.html')));
 if(!cid)return;$('#class').onchange=e=>location.hash='/'+e.target.value;
 const result=await rpc('list');if(version!==token)return;state=result;
 const links=state.posts.filter(p=>p.visible&&p.published);
 const box=$('#posts');box.className='stack';box.innerHTML=(state.manage?'<div><button class="btn" id="new">Buat tugas</button></div>':'')+
 (links.length?'<nav class="chips" aria-label="Menu konten kelas">'+links.map(p=>'<button class="pill" data-scroll="'+esc(p.id)+'">'+esc(p.menu_label||p.title)+'</button>').join('')+'</nav>':'')+
 (state.posts.length?state.posts.map(p=>'<article class="panel" id="p-'+esc(p.id)+'"><small>'+(p.published?'Terbit':'Draf')+(p.due?' · Tenggat '+esc(new Date(p.due).toLocaleString('id-ID')):'')+'</small><h2>'+esc(p.title)+'</h2><p class="prose">'+esc(p.instructions)+'</p><div class="stack">'+p.files.map(path=>'<button class="pill" data-file="'+esc(path)+'">'+esc(filename(path))+'</button>').join('')+'</div>'+(state.manage?'<button class="btn secondary" data-edit="'+esc(p.id)+'">Edit tugas dan menu</button>':'')+'</article>').join(''):empty('Belum ada tugas yang bisa ditampilkan.'));
 if($('#new'))$('#new').onclick=()=>editor({});
 box.onclick=e=>{const el=e.target;if(el.dataset.scroll)document.getElementById('p-'+el.dataset.scroll).scrollIntoView();if(el.dataset.edit)editor(state.posts.find(p=>p.id===el.dataset.edit));if(el.dataset.file)busy(el,async()=>{const {signedUrl}=await checked(db.storage.from(bucket).createSignedUrl(el.dataset.file,120));const a=document.createElement('a');a.href=signedUrl;a.textContent='Buka '+filename(el.dataset.file);a.target='_blank';a.rel='noopener';el.after(a);el.remove();});};
}
async function upload(path,file,progress){
 const session=(await checked(db.auth.getSession())).session;if(!session)throw Error('Masuk kembali.');
 await new Promise((resolve,reject)=>{const req=new XMLHttpRequest();req.open('POST',SUPABASE_URL+'/storage/v1/object/'+bucket+'/'+path);req.setRequestHeader('Authorization','Bearer '+session.access_token);req.setRequestHeader('apikey',SUPABASE_PUBLISHABLE_KEY);req.setRequestHeader('Content-Type',file.type);
 req.upload.onprogress=e=>{if(e.lengthComputable)progress.value=100*e.loaded/e.total;};req.onload=()=>req.status>=200&&req.status<300?resolve():reject(Error('Unggah gagal ('+req.status+'). Pilih Coba lagi.'));req.onerror=req.ontimeout=()=>reject(Error('Koneksi terputus. Pilih Coba lagi.'));req.timeout=180000;req.send(file);});
}
function editor(p){
 const id=p.id||crypto.randomUUID(),classId=cid,files=[...(p.files||[])],pending=[];
 release();setView(heading('Editor tugas','Konten dan menu untuk kelas terpilih.')+'<form class="study-box form"><label class="field">Judul<input name="title" required maxlength="150"></label><label class="field">Instruksi<textarea name="instructions" required maxlength="12000"></textarea></label><label class="field">Tenggat opsional<input type="datetime-local" name="due"></label><label class="field">Label menu<input name="menu_label" maxlength="60"></label><label class="field">Urutan menu<input type="number" name="position" required></label><label><input type="checkbox" name="visible"> Tampilkan di menu kelas</label><label class="field">Lampiran (maks. 50 MiB per file)<input name="uploads" multiple type="file" accept="'+types.join(',')+'"></label><div id="previews"></div><progress max="100" value="0"></progress><p role="status" id="status"></p><div class="chips"><button class="btn secondary" value="draft">Simpan draf</button><button class="btn" value="publish">Terbitkan</button><button type="button" class="pill" id="cancel">Kembali</button></div></form>');
 const f=$('form'),el=f.elements;for(const k of ['title','instructions','menu_label','position'])el[k].value=p[k]??(k==='position'?0:'');el.visible.checked=p.visible??true;
 if(p.due){const d=new Date(p.due);el.due.value=new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 $('#cancel').onclick=()=>render().catch(loadError);
 function previews(){
 release();const wrap=$('#previews');wrap.replaceChildren();
 files.forEach(path=>{const row=document.createElement('p');row.textContent=filename(path);wrap.append(row);});
 pending.forEach(file=>{const row=document.createElement('p');row.textContent=file.name;wrap.append(row);
 if(/^(image|video)\//.test(file.type)){const media=document.createElement(file.type.startsWith('image')?'img':'video');media.src=URL.createObjectURL(file);previewUrls.push(media.src);media.style.maxWidth='100%';media.style.maxHeight='180px';media.controls=true;wrap.append(media);}});
 }
 previews();el.uploads.onchange=()=>{const selected=Array.from(el.uploads.files);el.uploads.value='';
 if(selected.some(file=>!types.includes(file.type)||!file.size||file.size>52428800)||selected.length+files.length+pending.length>12){$('#status').textContent='Pilih PDF, teks, gambar JPG/PNG/WebP atau video MP4/WebM. Maksimal 12 file, 50 MiB per file.';return;}pending.push(...selected);previews();};
 f.onsubmit=async e=>{e.preventDefault();if(f.dataset.saving)return;f.dataset.saving='1';const b=e.submitter,published=b.value==='publish';const values=Object.fromEntries(new FormData(f));const controls=[...f.elements];controls.forEach(c=>c.disabled=true);
 try{while(pending.length){const file=pending[0],path=classId+'/'+id+'/'+crypto.randomUUID()+'_'+file.name.replace(/[^A-Za-z0-9._-]/g,'_').slice(-100);$('#status').textContent='Mengunggah '+file.name;await upload(path,file,$('progress'));files.push(path);pending.shift();}
 await rpc('save',{id,title:values.title,instructions:values.instructions,due:values.due?new Date(values.due).toISOString():null,menu_label:values.menu_label,position:Number(values.position),visible:!!values.visible,published,files});await render();
 }catch(err){if(f.isConnected){$('#status').textContent=err.message;b.textContent='Coba lagi · '+(published?'terbitkan':'simpan draf');previews();}}
 finally{delete f.dataset.saving;controls.forEach(c=>c.disabled=false);}};
}
async function start(){const a=await guard();if(!a)return;shell(a);classes=await checked(db.rpc('kb_live_class',{action:'list'}));addEventListener('hashchange',()=>render().catch(loadError));await render();}
start().catch(loadError);

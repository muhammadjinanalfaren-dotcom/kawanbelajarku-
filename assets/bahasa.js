import {db,checked,guard,shell,esc,heading,setView,main,loadError,busy,button} from './common.js';
import {showStreak} from './streak.js';
const courses={
 id:{name:'Bahasa Indonesia',mark:'Aa',locale:'id-ID',unit:'Kata sehari-hari',left:['Awal hari','Setelah petang'],right:['pagi','malam'],words:['saya','membaca','buku'],listen:'selamat pagi',hint:'Sapaan ketika hari baru dimulai',choice:'Apa yang diucapkan setelah menerima bantuan?',choices:['sampai jumpa','terima kasih','permisi'],correct:'terima kasih'},
 en:{name:'Bahasa Inggris',mark:'Hello',locale:'en-US',unit:'Salam dan perkenalan',left:['book','water'],right:['buku','air'],words:['I','like','apples'],listen:'good morning',hint:'Sapaan di pagi hari',choice:'Bagaimana mengucapkan terima kasih?',choices:['see you','thank you','excuse me'],correct:'thank you'},
 ja:{name:'Bahasa Jepang',mark:'あ',locale:'ja-JP',unit:'Salam dan benda di sekitar',left:['水 · mizu','本 · hon'],right:['air','buku'],words:['これ','は','本','です'],listen:'おはよう',hint:'Sapaan pagi yang akrab. Jawab dengan hiragana.',choice:'Pilih ungkapan terima kasih.',choices:['おやすみ','ありがとう','さようなら'],correct:'ありがとう'}
};
const normalize=v=>v.normalize('NFKC').toLowerCase().replace(/[.,!?。、「」！？]/gu,'').trim().replace(/\s+/g,' ');
const mix=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
let progress={},course,key,answers,index,attempt,user;
const $=s=>main.querySelector(s);
const btn=(t,attr)=>'<button type="button" class="pill" '+attr+'>'+esc(t)+'</button>';
const draftKey=()=> 'kb:bahasa:'+user+':'+key;
function readDraft(){
 try{const d=JSON.parse(sessionStorage.getItem(draftKey()));
 return d && /^[0-9a-f-]{36}$/.test(d.id) && Array.isArray(d.answers) && d.answers.length<4 && d.answers.every(v=>typeof v==='string')?d:null;}catch{return null;}
}
function remember(){try{sessionStorage.setItem(draftKey(),JSON.stringify({id:attempt,answers}));}catch{}}
function catalog(){
 setView(heading('Bahasa','Pilih bahasa yang ingin kamu pelajari.','./kawanbelajarku-dashboard.html')+'<div class="lingua">'+Object.entries(courses).map(([id,c])=>'<a class="course" href="#/'+id+'"><i>'+c.mark+'</i><strong>'+c.name+'</strong><span>'+(progress[id]?'1 unit selesai':'1 unit tersedia')+' →</span></a>').join('')+'</div>');
}
function route(){
 window.speechSynthesis?.cancel();
 key=location.hash.slice(2);course=courses[key];if(!course){catalog();return;}
 const p=progress[key],draft=readDraft();
 setView(heading(course.name,'Unit 1 · '+course.unit,'./bahasa.html')+'<article class="study-box"><h2>Pelajaran 1 · '+course.unit+'</h2><p>Pasangkan, susun, dengarkan, lalu pilih jawaban.</p><p>'+(p?'Selesai · Hasil terbaik '+p.best+' / 4':'Belum selesai')+'</p><button class="btn">'+(draft?'Lanjut pelajaran':p?'Latih lagi':'Mulai pelajaran')+'</button></article>');
 $('article button').onclick=()=>{answers=draft?.answers||[];index=answers.length;attempt=draft?.id||crypto.randomUUID();remember();question();};
}
function question(){
 const c=course;let value=()=>'',solution;
 setView(heading(c.name,'Unit 1 · '+c.unit,'./bahasa.html')+'<article class="study-box"><small>Soal '+(index+1)+' dari 4</small><progress max="4" value="'+index+'"></progress><h2>'+['Pasangkan kata','Susun kalimat','Dengar lalu ketik','Pilih jawaban'][index]+'</h2><div id="exercise" class="stack"></div><p class="unit-feedback" role="status"></p><button id="check-answer" class="btn">Periksa</button></article>');
 const box=$('#exercise'),check=$('#check-answer');
 if(index===0){
 box.innerHTML=c.left.map((w,i)=>'<label class="field">'+esc(w)+'<select data-i="'+i+'"><option value="">Pilih pasangan</option>'+mix(c.right).map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label>').join('');
 value=()=>{const a=[...box.querySelectorAll('select')].map(el=>el.value);return a.every(Boolean)?a.join('|'):'';};solution=c.right.join('|');
 }else if(index===1){
 const chosen=[],joiner=key==='ja'?'':' ';solution=c.words.join(joiner);
 box.innerHTML='<p>'+({id:'Siapa yang sedang membaca buku?',en:'Terjemahkan “Saya suka apel”.',ja:'Susun kalimat “Ini adalah buku”.'}[key])+'</p><div class="word-tray"></div><div class="chips"></div>';
 const shuffled=mix(c.words),redraw=()=>{box.querySelector('.word-tray').innerHTML=chosen.map((w,i)=>btn(w,'data-remove="'+i+'"')).join('');box.querySelector('.chips').innerHTML=shuffled.filter(w=>!chosen.includes(w)).map(w=>btn(w,'data-word')).join('');};
 redraw();box.onclick=e=>{if(e.target.hasAttribute('data-word'))chosen.push(e.target.textContent);else if(e.target.hasAttribute('data-remove'))chosen.splice(Number(e.target.dataset.remove),1);else return;redraw();};value=()=>chosen.length===c.words.length?chosen.join(joiner):'';
 }else if(index===2){
 solution=c.listen;box.innerHTML='<div class="speech"><img src="./assets/kawan-bicara.svg" alt="Kawan, teman latihan"><button class="btn secondary" id="play">Putar suara</button></div><button class="pill" id="alternative">Gunakan petunjuk teks</button><p id="clue"></p><label class="field">Jawaban '+(key==='ja'?'(hiragana)':'')+'<input maxlength="100" autocomplete="off"></label>';
 const alternate=()=>{$('#clue').textContent=c.hint;};$('#alternative').onclick=alternate;
 $('#play').onclick=()=>{const api=window.speechSynthesis,voice=api?.getVoices().find(v=>v.lang.toLowerCase().split(/[-_]/)[0]===c.locale.split('-')[0]);if(!voice){alternate();return;}api.cancel();const u=new SpeechSynthesisUtterance(c.listen);u.voice=voice;u.lang=c.locale;u.rate=.83;const speaker=box.querySelector('.speech');u.onstart=()=>speaker.classList.add('speaking');u.onend=()=>speaker.classList.remove('speaking');u.onerror=()=>{speaker.classList.remove('speaking');if(box.isConnected)alternate();};api.speak(u);};value=()=>box.querySelector('input').value;
 }else{
 solution=c.correct;box.innerHTML='<p>'+esc(c.choice)+'</p>'+mix(c.choices).map(x=>'<label class="choice"><input type="radio" name="pick" value="'+esc(x)+'">'+esc(x)+'</label>').join('');value=()=>box.querySelector(':checked')?.value||'';
 }
 check.onclick=()=>{let v=normalize(value());if(!v){$('.unit-feedback').textContent='Lengkapi jawabanmu dulu.';return;}
 if(key==='ja')v=v.replace(/\s/g,'');const correct=v===normalize(solution);answers.push(v);window.speechSynthesis?.cancel();
 box.inert=true;$('.unit-feedback').textContent=correct?'Benar!':('Jawaban yang tepat · '+solution.replace('|',' dan '));check.textContent=index===3?'Simpan hasil':'Lanjut';check.onclick=()=>busy(check,async()=>{if(index<3){index++;remember();question();return;}
 progress=await checked(db.rpc('kb_language',{course_id:key,attempt,answers}));try{sessionStorage.removeItem(draftKey());}catch{}
 const keys=[c.right.join('|'),normalize(c.words.join(key==='ja'?'':' ')),c.listen,c.correct];const score=answers.filter((v,i)=>v===keys[i]).length;
 setView(heading('Pelajaran selesai',c.name)+'<article class="study-box"><h2>'+score+' / 4 benar</h2><p>Progres unit tersimpan di akunmu.</p>'+button('Kembali ke bahasa','./bahasa.html')+'</article>');await showStreak();
 });};
}
async function start(){const a=await guard();if(!a)return;user=a.user.id;shell(a);progress=await checked(db.rpc('kb_language',{}));window.speechSynthesis?.getVoices();addEventListener('hashchange',route);route();}
start().catch(loadError);

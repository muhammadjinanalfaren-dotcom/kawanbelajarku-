import {checked,db,esc} from './common.js';
export const animals=['Monyet','Kucing','Rubah','Panda','Beruang','Kelinci','Burung hantu','Rusa','Singa','Harimau','Anjing','Penguin','Koala','Hamster','Gajah','Rakun'];
export const face=i=>'<img src="./assets/faces/animal-'+(animals[i]?Number(i):0)+'.webp" alt="'+esc(animals[i])+'">';
export const rpc=async(name,args={})=>{
 const result=await checked(db.rpc('kb_live_'+name,args));
 if(result?.error) throw Error(result.error);
 return result;
};
export const statuses={waiting:'Di lobi',active:'Berlangsung',paused:'Dijeda',finished:'Selesai',cancelled:'Dibatalkan'};
export const types={single:'Pilihan ganda',multi:'Beberapa jawaban',boolean:'Benar atau salah',short:'Isian singkat',match:'Menjodohkan',order:'Mengurutkan'};
export const fmt=a=>Array.isArray(a)?a.join(' · '):String(a??'Tidak dijawab');
export const field=(label,html)=>'<label class="field">'+esc(label)+html+'</label>';
export const opt=(value,label,selected=false)=>'<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';
export const teacherNav='<nav class="controls"><a class="pill" href="./guru.html">Bank soal & kuis live</a><a class="pill" href="./kelas.html">Kelas dan tugas</a><a class="pill" href="./belajar.html#/profil">Profil</a></nav>';
export const livebar=(label,href)=>{document.querySelector('#shell').innerHTML='<header class="livebar"><a href="./kawanbelajarku-dashboard.html">KawanBelajarku</a><a href="'+href+'">'+esc(label)+'</a></header>';};
export function answerFields(q){
 if(q.type==='short')return field('Jawabanmu','<input required name="ans" maxlength="500" autocomplete="off">');
 if(q.type==='match'||q.type==='order')return '<div class="stack">'+q.options.map((_,i)=>field(q.type==='match'?q.prompts[i]:'Posisi '+(i+1),'<select name="ans" required>'+opt('','Pilih jawaban')+q.options.map(x=>opt(x,x)).join('')+'</select>')).join('')+'</div>';
 return '<div class="quiz-options">'+q.options.map(x=>'<label class="answer-card"><input type="'+(q.type==='multi'?'checkbox':'radio')+'" name="ans" value="'+esc(x)+'" '+(q.type==='multi'?'':'required')+'>'+esc(x)+'</label>').join('')+'</div>';
}
export function collect(q,form){
 const values=new FormData(form).getAll('ans');
 if(!values.length || values.some(x=>!x.trim()))throw Error('Isi jawaban terlebih dahulu.');
 if(['match','order'].includes(q.type)&&new Set(values).size!==values.length)throw Error('Gunakan tiap pilihan satu kali.');
 return ['multi','match','order'].includes(q.type)?values:values[0];
}

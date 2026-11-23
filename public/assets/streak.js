import {db,checked} from './common.js';
export async function showStreak(){
 const s=await checked(db.rpc('kb_study_status',{claim:true}));
 if(!s.notice)return;
 const dialog=document.createElement('dialog');
 dialog.className='fire-dialog';
 dialog.innerHTML='<span class="flame">🔥</span><h2>'+Number(s.chain)+' hari belajar</h2><p>Aktivitas hari ini sudah tercatat.</p><button class="btn">Lanjut</button>';
 document.body.append(dialog);dialog.showModal();
 dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
}

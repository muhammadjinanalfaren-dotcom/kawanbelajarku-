import {db,checked,guard,shell,setView,heading,dashboard,esc,loadError} from './common.js';
async function start(){
 const a=await guard();if(!a)return;shell(a);
 const s=await checked(db.rpc('kb_study_status',{}));
 setView(heading('Streak belajar','Kalender aktivitas · Asia/Jakarta',dashboard)+'<section class="study-box"><h2>🔥 '+s.chain+' hari belajar</h2><p>'+s.remaining+' dari 3 perlindungan tersisa bulan ini.</p><div class="calendar">'+s.days.map(d=>'<div class="day" data-state="'+esc(d.status)+'"><strong>'+Number(d.day.slice(-2))+'</strong><small>'+esc(d.status)+'</small></div>').join('')+'</div></section>');
}
start().catch(loadError);

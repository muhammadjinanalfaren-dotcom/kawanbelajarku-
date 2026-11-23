import {db,checked,allRows,safeUrl,esc,enc,byId,same,date,materialUrl,quizUrl,iconBox,tone,subjectIcon,empty} from './common.js';

export const data = {subjects:[],materials:[],quizzes:[],progress:[],activity:[],results:[],features:[],announcements:[],agenda:[],popular:[],config:{}};
const orders = {
  kb_chapters:'id',kb_banners:'id',subjects:'id',materials:'id',quizzes:'id',progress:'material_id',kb_material_activity:'material_id',
  quiz_results:'id',features:'id',announcements:'id',kb_agenda:'id',site_config:'key'
};
const catalog = {
  subjects:'id,name,description,created_at,kb_grade,kb_image',
  materials:'id,subject_id,title,description,created_at,kb_category,kb_recommended,kb_chapter',
  quizzes:'id,subject_id,title,description,created_at,kb_chapter',
  features:'id,title,description,icon,theme,created_at'
};
export const newest = (rows,key='created_at') => [...rows].sort((a,b)=>String(b[key] || '').localeCompare(String(a[key] || '')));
export async function readTable(table,uid) {
  const q=()=> {
    let query=db.from(table).select(catalog[table] || '*').order(orders[table]);
    if (catalog[table] || table==='announcements') query=query.eq('kb_archived',false);
    if (['quiz_results','progress','kb_material_activity','kb_agenda'].includes(table)) query=query.eq('student_id',uid);
    return query;
  };
  return allRows(q);
}
export async function refresh(tables,uid) {
  const aliases={kb_material_activity:'activity',quiz_results:'results',kb_agenda:'agenda'};
  await Promise.all(tables.map(async table=>{
    if (table==='popular') {
      data.popular=await checked(db.rpc('kb_popular_subjects'));
      return;
    }
    const rows=await readTable(table,uid);
    if (table==='site_config') data.config=Object.fromEntries(rows.map(row=>[row.key,row.value]));
    else data[aliases[table] || table]=rows;
  }));
}
export const subjectName = id => byId(data.subjects,id)?.name || 'Mata pelajaran';
export const materials = () => newest(data.materials.filter(m=>byId(data.subjects,m.subject_id)));
export const quizzes = () => newest(data.quizzes.filter(q=>byId(data.subjects,q.subject_id)));
export const complete = id => data.progress.some(row=>same(row.material_id,id) && row.completed);
export const saved = id => data.activity.some(row=>same(row.material_id,id) && row.bookmarked_at);
export const finished = () => materials().filter(item=>complete(item.id));
export const latest = () => newest(data.activity,'opened_at').find(row=>row.opened_at && byId(materials(),row.material_id));
export const recommendations = () => {
  const all=materials();
  const priority=all.filter(row=>row.kb_recommended);
  return priority.length ? priority : all.slice(0,6);
};
export function materialCards(rows,message='Belum ada materi.') {
  if (!rows.length) return empty(message);
  return '<div class="grid">'+rows.map(item=>'<a class="card row" href="'+materialUrl(item.id)+'">'+
    subjectIcon(byId(data.subjects,item.subject_id),data.config.style)+
    '<span class="grow"><small>'+esc(subjectName(item.subject_id))+'</small><h3>'+esc(item.title)+'</h3>'+
    (item.description?'<p class="muted">'+esc(item.description)+'</p>':'')+
    (complete(item.id)?'<span class="tag success">Selesai</span>':'')+'</span></a>').join('')+'</div>';
}
export function quizCards(rows) {
  return rows.length ? '<div class="grid">'+rows.map(item=>{
    const last=newest(data.results,'completed_at').find(row=>same(row.quiz_id,item.id));
    return '<a class="card" href="'+quizUrl(item.id)+'"><small>'+esc(subjectName(item.subject_id))+'</small><h3>'+
      esc(item.title)+'</h3><p class="muted">'+esc(item.description || '')+'</p><div class="actions"><span class="tag">'+
      (last?'Skor terakhir '+esc(last.score):'Kerjakan kuis')+'</span></div></a>';
  }).join('')+'</div>' : empty('Belum ada kuis yang tersedia.');
}
export function features(rows) {
  return rows.length ? '<div class="grid">'+rows.map(item=>'<a class="card row" style="'+tone(item.theme)+
    '" href="./pelajaran.html#/fitur/'+enc(item.id)+'">'+iconBox(item.icon)+'<span class="grow"><h3>'+esc(item.title)+
    '</h3><p class="muted">'+esc(item.description || '')+'</p></span></a>').join('')+'</div>' : empty('Belum ada konten tambahan dari admin.');
}
export const announcementText = a => a.kb_message ?? a.content ?? a.message ?? a.body ?? a.description ?? '';
export function announcements(rows) {
  return rows.length ? '<div class="stack">'+rows.map(item=>'<article class="card"><small>'+date(item.created_at,true)+
    '</small><h3>'+esc(item.title)+'</h3><p class="muted prose">'+esc(announcementText(item))+'</p></article>').join('')+
    '</div>' : empty('Belum ada pengumuman.');
}
export function historyTable(rows=newest(data.results,'completed_at')) {
  return rows.length?'<div class="panel table-wrap"><table><thead><tr><th scope="col">Kuis</th><th scope="col">Skor</th>'+
    '<th scope="col">Tanggal</th></tr></thead><tbody>'+rows.map(item=>'<tr><td>'+esc(byId(data.quizzes,item.quiz_id)?.title ||
    'Kuis diarsipkan')+'</td><td>'+esc(item.score)+'</td><td>'+date(item.completed_at,true)+'</td></tr>').join('')+
    '</tbody></table></div>':empty('Belum ada riwayat kuis.');
}
function youtubeId(input) {
  if (!input) return '';
  const url=new URL(input);
  const valid=['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(url.hostname);
  let id='';
  if (url.hostname==='youtu.be') id=url.pathname.split('/')[1];
  if (valid) id=url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  return /^[\w-]{11}$/.test(id || '') ? id : '';
}
function attachment(item) {
  const title=esc(item.title || 'Lampiran');
  const url=safeUrl(item.url);
  const youtube=item.kind==='video'?youtubeId(url):'';
  if (youtube && !item.kb_bucket) return '<div><iframe class="lesson-frame" loading="lazy" title="'+title+
    '" src="https://www.youtube-nocookie.com/embed/'+youtube+'" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe><small>'+title+'</small></div>';
  if (item.kb_bucket==='kb-learning' && item.path) return '<button type="button" class="btn ghost" data-asset="'+
    esc(item.id)+'">'+title+' ↗</button>';
  if (!url) return '';
  if (item.kind==='video' && /\.(mp4|webm)$/i.test(new URL(url).pathname)) return '<div><video controls preload="none" class="media" aria-label="'+
    title+'" src="'+esc(url)+'"></video><small>'+title+'</small></div>';
  return '<a class="btn ghost" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+title+' ↗</a>';
}
export async function getAttachments(type,id) {
  return allRows(()=>db.from('attachments').select('*').eq('owner_type',type).eq('owner_id',String(id)).order('created_at').order('id'));
}
export function attachmentList(rows) {
  const body=rows.map(attachment).join('');
  return body ? '<section class="section stack"><h2>Lampiran dan video</h2>'+body+'</section>' : '';
}

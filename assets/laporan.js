import {guard,esc,setView,heading,busy,loadError} from './common.js';
import {rpc,livebar} from './live-shared.js';
import {sheets,workbook} from './report-data.js';
function table(rows){return '<div class="panel table-wrap"><table><thead><tr>'+rows[0].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
async function start(){if(!await guard())return;
 const code=new URLSearchParams(location.search).get('room');
 const report=await rpc('report',{room_code:code}),data=sheets(report);
 livebar('Ruang guru','./guru.html');
 setView('<article class="report">'+heading(report.title,'Laporan sesi '+report.code)+'<div class="controls no-print"><button id="pdf" class="btn">Unduh PDF</button><button class="btn secondary" id="excel">Unduh Excel</button></div>'+
 Object.entries(data).map(([name,rows])=>'<h2>'+esc(name)+'</h2>'+table(rows)+(name==='Analisis Soal'?'<div class="stack">'+rows.slice(1).map(r=>'<div>Soal '+r[0]+' · <meter max="100" value="'+r[5]+'"></meter> '+r[5]+'% benar</div>').join('')+'</div>':'')).join('')+'</article>');
 const pdf=document.querySelector('#pdf');pdf.onclick=()=>busy(pdf,async()=>{const {reportPdf}=await import('./report-pdf.js');download(await reportPdf(report,data),code+'.pdf');});
 const b=document.querySelector('#excel');b.onclick=()=>busy(b,async()=>{download(await workbook(data),code+'.xlsx');});
}
start().catch(loadError);

function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='KawanBelajarku-'+name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}

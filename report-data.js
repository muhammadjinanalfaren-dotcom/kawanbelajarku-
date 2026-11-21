export function sheets(r){
 const total=r.items.length,n=r.members.length;
 const byKey=new Map(r.answers.map(a=>[a.uid+':'+a.pos,a]));
 const details=[['Peserta','Nomor','Pertanyaan','Jawaban','Kunci','Status','Poin','Detik']];
 const players=[['Nama','Skor','Benar','Salah','Tidak dijawab','Persen benar']];
 const stats=r.items.map(()=>({right:0,wrong:0,dist:new Map()}));
 const show=x=>Array.isArray(x)?x.join(' | '):String(x??'');
 for(const m of r.members){
 let score=0,right=0,wrong=0;
 r.items.forEach((q,i)=>{
 const a=byKey.get(m.uid+':'+i),answered=a?.answer!=null,s=stats[i],answer=show(a?.answer);
 if(answered){if(a.correct){right++;s.right++;}else{wrong++;s.wrong++;}s.dist.set(answer,(s.dist.get(answer)||0)+1);}
 score+=a?.points||0;
 details.push([m.name,i+1,q.text,answer,show(q.key),answered?(a.correct?'Benar':'Salah'):'Tidak dijawab',a?.points||0,Number(a?.seconds||0)]);
 });
 players.push([m.name,score,right,wrong,total-right-wrong,Math.round(100*right/total)]);
 }
 const scores=players.slice(1).map(x=>x[1]);
 const questions=[['Nomor','Soal','Benar','Salah','Tidak dijawab','Persen benar','Distribusi jawaban'],...stats.map((s,i)=>[i+1,r.items[i].text,s.right,s.wrong,n-s.right-s.wrong,n?Math.round(100*s.right/n):0,[...s.dist].map(([k,v])=>k+' ('+v+')').join(' · ')])];
 const ordered=questions.slice(1).sort((a,b)=>a[5]-b[5]);
 const summary=[['Indikator','Hasil'],['Kuis',r.title],['Kode',r.code],['Tanggal',r.date],['Peserta',n],['Jumlah soal',total],['Skor rata-rata',n?scores.reduce((a,b)=>a+b,0)/n:0],['Skor tertinggi',n?Math.max(...scores):0],['Skor terendah',n?Math.min(...scores):0],['Akurasi kelas (%)',n?Math.round(100*stats.reduce((a,b)=>a+b.right,0)/(total*n)):0],['Soal tersulit',n?ordered[0][1]:'—'],['Soal termudah',n?ordered.at(-1)[1]:'—']];
 for(const [min,max] of [[0,24],[25,49],[50,74],[75,100]])summary.push(['Peserta dengan akurasi '+min+'–'+max+'%',players.slice(1).filter(row=>row[5]>=min&&row[5]<=max).length]);
 return {'Ringkasan Sesi':summary,'Hasil Peserta':players,'Analisis Soal':questions,'Detail Jawaban':details};
}
const xml=x=>String(x).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export async function workbook(tables){
 const z=new window.JSZip(),names=Object.keys(tables);
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rs='http://schemas.openxmlformats.org/officeDocument/2006/relationships',ps='http://schemas.openxmlformats.org/package/2006/relationships';
 const rel=(i,type,target)=>'<Relationship Id="rId'+i+'" Type="'+rs+'/'+type+'" Target="'+target+'"/>';
 z.file('_rels/.rels','<Relationships xmlns="'+ps+'">'+rel(1,'officeDocument','xl/workbook.xml')+'</Relationships>');
 z.file('xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="'+rs+'"><sheets>'+names.map((n,i)=>'<sheet name="'+xml(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>');
 z.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="'+ps+'">'+names.map((_,i)=>rel(i+1,'worksheet','worksheets/sheet'+(i+1)+'.xml')).join('')+'</Relationships>');
 const ct='application/vnd.openxmlformats-officedocument.spreadsheetml.';
 z.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="'+ct+'sheet.main+xml"/>'+names.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="'+ct+'worksheet+xml"/>').join('')+'</Types>');
 names.forEach((n,i)=>z.file('xl/worksheets/sheet'+(i+1)+'.xml','<worksheet xmlns="'+ns+'"><sheetData>'+tables[n].map((row,j)=>'<row r="'+(j+1)+'">'+row.map((x,k)=>{
 const ref=String.fromCharCode(65+k)+(j+1);
 return typeof x==='number'?'<c r="'+ref+'"><v>'+x+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(x)+'</t></is></c>';
 }).join('')+'</row>').join('')+'</sheetData></worksheet>'));
 return z.generateAsync({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

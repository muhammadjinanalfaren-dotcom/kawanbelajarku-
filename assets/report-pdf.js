import {PDFDocument, StandardFonts, rgb} from './vendor/pdf-lib.esm.min.js';
export async function reportPdf(report,data){
 const pdf=await PDFDocument.create(),normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 pdf.setTitle(report.title);pdf.setAuthor('KawanBelajarku');
 const blue=rgb(.07,.28,.62),ink=rgb(.08,.15,.27),muted=rgb(.28,.34,.42);
 let page,y;
 function newPage(){page=pdf.addPage([595,842]);y=765;page.drawRectangle({x:0,y:795,width:595,height:47,color:blue});
 page.drawText('KawanBelajarku  /  Laporan kelas',{x:36,y:814,font:bold,size:12,color:rgb(1,1,1)});
 page.drawText(report.code+'  /  '+pdf.getPageCount(),{x:36,y:24,font:normal,size:9,color:muted});}
 function ensure(h){if(y-h<42)newPage();}
 // Raster fallback is limited to lines outside the built-in font character set.
 async function line(text,size=10,strong=false,color=ink){
 const font=strong?bold:normal,chars=[...String(text??'')];let buf='',w=0;
 async function flush(){ensure(size+7);
 try{page.drawText(buf,{x:36,y,font,size,color});}
 catch{const c=document.createElement('canvas');c.width=1500;c.height=Math.ceil(size*4.6);const ctx=c.getContext('2d');ctx.scale(3,3);ctx.font=(strong?'bold ':'')+size+'px sans-serif';ctx.fillStyle='#182943';ctx.fillText(buf,0,size);
 const im=await pdf.embedPng(c.toDataURL());page.drawImage(im,{x:36,y:y-size*.5,width:500,height:c.height/3});}y-=size+6;buf='';w=0;}
 for(const ch of chars){let dw;try{dw=font.widthOfTextAtSize(ch,size);}catch{dw=size;}if(w+dw>516||ch==='\n')await flush();if(ch!=='\n'){buf+=ch;w+=dw;}}
 if(buf)await flush();
 }
 newPage();await line(report.title,21,true,blue);await line(new Date(report.date).toLocaleString('id-ID'),10,false,muted);
 for(const [label,value] of data['Ringkasan Sesi'].slice(4))await line(label+'   '+value);
 y-=9;await line('Hasil peserta',15,true,blue);
 for(const row of data['Hasil Peserta'].slice(1)){ensure(44);await line(row[0]+'   /   '+row[1]+' poin',11,true);await line(row[2]+' benar  ·  '+row[3]+' salah  ·  '+row[4]+' kosong  ·  '+row[5]+'%',10,false,muted);}
 y-=9;await line('Analisis per soal',15,true,blue);
 for(const row of data['Analisis Soal'].slice(1)){ensure(78);await line(row[0]+'. '+row[1],11,true);await line(row[2]+' benar  ·  '+row[3]+' salah  ·  '+row[4]+' kosong  ·  '+row[5]+'% benar');ensure(15);page.drawRectangle({x:36,y,width:220,height:6,color:rgb(.9,.93,.98)});if(row[5])page.drawRectangle({x:36,y,width:2.2*row[5],height:6,color:blue});y-=16;if(row[6])await line('Jawaban: '+row[6],9,false,muted);}
 return new Blob([await pdf.save()],{type:'application/pdf'});
}

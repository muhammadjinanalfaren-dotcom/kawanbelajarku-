// Distances and radii are visual units. Periods are rounded sidereal days.
const bodies=[
 ['Matahari',0,1.08,0,'#ffba42','Bintang di pusat tata surya.',1392700,'Fusi hidrogen memasok energi yang sampai ke Bumi.'],
 ['Merkurius',1.8,.20,88,'#aaa39d','Planet berbatu terdekat dengan Matahari.',4879,'Satu hari suryanya lebih panjang dari satu tahun Merkurius.'],
 ['Venus',2.65,.31,224.7,'#efbe7e','Planet berbatu dengan atmosfer karbon dioksida tebal.',12104,'Venus berputar berlawanan arah dengan Bumi.'],
 ['Bumi',3.65,.36,365.26,'#49a5df','Planet berbatu dengan samudra air cair.',12756,'Samudra menutupi sekitar 71% permukaannya.'],
 ['Bulan',.67,.13,27.32,'#c3c7cb','Satelit alami Bumi.',3475,'Rotasinya sinkron sehingga sisi yang sama menghadap Bumi.'],
 ['Mars',4.95,.27,687,'#dc7950','Planet berbatu dengan dua satelit kecil.',6792,'Oksida besi memberi tanah Mars warna kemerahan.'],
 ['Jupiter',6.5,.70,4332.6,'#d9ae82','Raksasa gas terbesar di tata surya.',142984,'Bintik Merah Besar merupakan badai raksasa.'],
 ['Saturnus',8.45,.58,10759,'#edcc8a','Raksasa gas dengan sistem cincin lebar.',120536,'Cincinnya terutama terdiri dari partikel es.'],
 ['Uranus',10.2,.47,30687,'#8bd5df','Raksasa es di luar orbit Saturnus.',51118,'Sumbu rotasinya miring sekitar 98 derajat.'],
 ['Neptunus',12,.46,60190,'#6088ff','Raksasa es terjauh dari Matahari.',49528,'Satu tahun Neptunus berlangsung sekitar 165 tahun Bumi.']
];
const $=id=>document.getElementById(id),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const tau=2*Math.PI,nf=new Intl.NumberFormat('id-ID'),option=$('target');
let focus=-1,yaw=.34,pitch=.6,zoom=1,pan=[0,0],time=0,running=true,last=0,hits=[];
bodies.forEach((b,i)=>option.add(new Option(b[0],String(i))));
function select(i){
 focus=i;option.value=String(i);pan=[0,0];zoom=i<0?1:Math.min(9,2.8/bodies[i][2]);
 const b=bodies[i];$('fact').innerHTML=b?'<h2>'+b[0]+'</h2><p>'+b[5]+'</p><dl><dt>Diameter ≈</dt><dd>'+nf.format(b[6])+' km</dd><dt>Periode orbit</dt><dd>'+(i?nf.format(b[3])+' hari':'≈ 230 juta tahun (galaksi)')+'</dd></dl><p>'+b[7]+'</p>':'<h2>Sistem Matahari</h2><p>Pilih planet, Matahari, atau Bulan untuk mengamatinya dari dekat.</p>';
}
option.onchange=()=>select(Number(option.value));select(-1);
$('full').hidden=!document.fullscreenEnabled;$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('full').hidden=true;}};
$('pause').onclick=()=>{running=!running;$('pause').textContent=running?'Jeda':'Putar';};$('reset').onclick=()=>{yaw=.34;pitch=.6;select(-1);};
$('time').oninput=e=>{time=Number(e.target.value);};
function position(i,t){
 if(i===0)return [0,0,0];
 const b=bodies[i],ang=i*2.19+tau*t/b[3],base=i===4?position(3,t):[0,0,0];
 return [base[0]+b[1]*Math.cos(ang),base[1]+.04*b[1]*Math.sin(ang+i),base[2]+b[1]*Math.sin(ang)];
}
// A shared latitude/longitude mesh is rotated and lit in world space before projection.
const mesh=[],bands=14,segments=24;
function vertex(lat,lon){const a=lat*Math.PI/bands-Math.PI/2,l=lon*tau/segments;return [Math.cos(a)*Math.cos(l),Math.sin(a),Math.cos(a)*Math.sin(l)];}
for(let a=0;a<bands;a++)for(let l=0;l<segments;l++)mesh.push({lat:a,lon:l,points:[vertex(a,l),vertex(a+1,l),vertex(a+1,l+1),vertex(a,l+1)],normal:vertex(a+.5,l+.5)});
const stars=Array.from({length:120},(_,i)=>[(Math.sin(i*113+3)*4000)%1,(Math.cos(i*197+2)*9000)%1,.5+(i%3)*.32]);
function frame(stamp){
 if(running && last)time=(time+Math.min(.12,(stamp-last)/1000)*Number($('speed').value))%3650;last=stamp;
 $('time').value=time;$('days').textContent=Math.floor(time)+' hari';
 const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#c3d9fc';for(const [x,y,r] of stars)ctx.fillRect(Math.abs(x)*w,Math.abs(y)*h,r,r);
 const center=focus<0?[0,0,0]:position(focus,time),scale=Math.min(w,h)*zoom/26;
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const rotate=([x,y,z])=>[x*cy-z*sy,y*cp-(x*sy+z*cy)*sp,y*sp+(x*sy+z*cy)*cp];
 function project(v){const [x,y,z]=rotate(v.map((v,i)=>v-center[i]));const k=scale*50/(50-z);return [w/2+pan[0]+x*k,h/2+pan[1]-y*k,z];}
 if($('lines').checked){ctx.strokeStyle='#7496cb59';ctx.lineWidth=.8;
 bodies.forEach((b,i)=>{if(!i)return;ctx.beginPath();const base=i===4?position(3,time):[0,0,0];for(let j=0;j<=96;j++){const a=j*tau/96;const [x,y]=project([base[0]+b[1]*Math.cos(a),base[1]+b[1]*.04*Math.sin(a+i),base[2]+b[1]*Math.sin(a)]);if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();});}
 hits=[];const objects=bodies.map((b,i)=>({b,i,v:position(i,time)})).sort((a,b)=>project(a.v)[2]-project(b.v)[2]);
 for(const {b,i,v} of objects){
 const [cx,yy,depth]=project(v),r=b[2]*scale*50/(50-depth);
 if(cx+r*2<0||cx-r*2>w||yy+r*2<0||yy-r*2>h)continue;
 hits.push({i,x:cx,y:yy,r:Math.max(9,r)});
 const color=b[4].slice(1),rgb=[0,2,4].map(k=>parseInt(color.slice(k,k+2),16));
 if(i===0){const glow=ctx.createRadialGradient(cx,yy,r*.8,cx,yy,r*1.65);glow.addColorStop(0,'#ffb32a99');glow.addColorStop(1,'#ff942000');ctx.fillStyle=glow;ctx.fillRect(cx-r*2,yy-r*2,4*r,4*r);}
 for(const f of mesh){
 if(rotate(f.normal)[2]<-.06)continue;
 let shade=.63+.36*(f.normal[0]*-.45+f.normal[1]*.78+f.normal[2]*.4);let base=rgb;
 if(i===6||i===7)shade+=Math.sin(f.lat*2)*.10;
 if(i===3&&Math.sin(f.lon*.7+Math.sin(f.lat*.8)*1.9)+Math.cos(f.lat*.7)>.65)base=[86,174,118];
 if(i===0)shade=.96+.035*Math.sin(f.lat+f.lon*3);
 ctx.fillStyle='rgb('+base.map(c=>Math.min(255,Math.round(c*shade))).join(',')+')';
 ctx.beginPath();f.points.forEach((p,k)=>{const [x,y]=project(p.map((n,j)=>v[j]+n*b[2]));if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.45;ctx.stroke();
 }
 if(i===7){ctx.beginPath();for(let j=0;j<=120;j++){const a=tau*j/120,[x,y,z]=project([v[0]+Math.cos(a)*b[2]*1.65,v[1]+Math.sin(a)*.17,v[2]+Math.sin(a)*b[2]*1.65]);if(z<depth&&Math.hypot(x-cx,y-yy)<r)ctx.moveTo(x,y);else if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.lineWidth=Math.max(1,r*.15);ctx.strokeStyle='#d5bb88';ctx.stroke();}
 }
 requestAnimationFrame(frame);
}
const pointers=new Map();let origin,dragged=false;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1){origin=[e.clientX,e.clientY];dragged=false;}else dragged=true;};
canvas.onpointermove=e=>{const old=pointers.get(e.pointerId);if(!old)return;const cur=[e.clientX,e.clientY],dx=cur[0]-old[0],dy=cur[1]-old[1];if(Math.hypot(cur[0]-origin[0],cur[1]-origin[1])>4)dragged=true;
 if(pointers.size===2){const other=[...pointers].find(([id])=>id!==e.pointerId)[1];const distance=p=>Math.hypot(p[0]-other[0],p[1]-other[1]);zoom=clamp(zoom*distance(cur)/Math.max(1,distance(old)),.4,32);pan[0]+=dx/2;pan[1]+=dy/2;}
 else if(e.buttons===2||e.shiftKey){pan[0]+=dx;pan[1]+=dy;}else{yaw+=dx*.009;pitch=clamp(pitch+dy*.009,-1.52,1.52);}pointers.set(e.pointerId,cur);
};
canvas.onpointerup=e=>{pointers.delete(e.pointerId);if(dragged)return;const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const hit=hits.slice().reverse().find(p=>Math.hypot(p.x-x,p.y-y)<=p.r);if(hit)select(hit.i);};
canvas.onpointercancel=e=>pointers.delete(e.pointerId);canvas.oncontextmenu=e=>e.preventDefault();
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.0015),.4,32);},{passive:false});
if(ctx)requestAnimationFrame(frame);else $('guide').textContent='Gunakan daftar fokus untuk membaca profil setiap objek.';

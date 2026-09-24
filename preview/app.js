const cases={remove:[
{prompt:"Please take out the cough to the lower right?",target:"cough",targetAzimuth:-99,interferer:"cough",interfererAzimuth:16},
{prompt:"Can you cut the cat behind?",target:"cat",targetAzimuth:-165,interferer:"cat",interfererAzimuth:-90},
{prompt:"Can you strip the laughter behind on the left?",target:"laughter",targetAzimuth:141,interferer:"laughter",interfererAzimuth:-136},
{prompt:"Erase the organ behind on the left.",target:"organ",targetAzimuth:110,interferer:"organ",interfererAzimuth:17},
{prompt:"Remove the female speech on the right.",target:"female speech",targetAzimuth:-95,interferer:"male singer",interfererAzimuth:12}],
move:[
{prompt:"Drift the cricket starting at 1 o'clock and ending at the 9 o'clock position gradually.",target:"cricket",start:-16,end:102,interferer:"male singer",interfererAzimuth:-113},
{prompt:"Slide the female singer starting at the 3 o'clock position and ending at 9 o'clock starting at 4s.",target:"female singer",start:-91,end:88,interferer:"clean electric guitar",interfererAzimuth:-163},
{prompt:"Travel the purr starting at the 9 o'clock position and ending at the 12 o'clock position.",target:"purr",start:98,end:2,interferer:"piano",interfererAzimuth:-45},
{prompt:"Move the race car from 10 o'clock to 3 o'clock from 2 to 5 seconds.",target:"race car",start:46,end:-90,interferer:"crow",interfererAzimuth:122},
{prompt:"Sweep the crow starting at the 9 o'clock position and ending at the 12 o'clock position from the 2 to 7 second mark.",target:"crow",start:95,end:-3,interferer:"piano",interfererAzimuth:-143}],
replace:[
{prompt:"Replace the female speech and woman speaking with female singer at left, at moderate distance.",target:"female singer",targetAzimuth:98,interferer:"harp",interfererAzimuth:25},
{prompt:"Replace the singing with female singer at back-left, nearby.",target:"female singer",targetAzimuth:163,interferer:"baritone saxophone",interfererAzimuth:26},
{prompt:"Replace the speech with saxophone at back-left, nearby.",target:"saxophone",targetAzimuth:162,interferer:"electric bass",interfererAzimuth:-42},
{prompt:"Replace the wind chime with a clock.",target:"clock",targetAzimuth:143,interferer:"synthesizer",interfererAzimuth:59},
{prompt:"Replace the crow with frog at front-right, at moderate distance.",target:"frog",targetAzimuth:-42,interferer:"wind chime",interfererAzimuth:49}]};

const themes={remove:{task:"#e44d55",accent:"#c52f3a"},move:{task:"#3488d7",accent:"#1767ad"},replace:{task:"#32ad73",accent:"#168356"}};
const interferer="#ed8a2c";let activeTask="remove";
function point(angle,radius=83){const r=angle*Math.PI/180;return{x:130-radius*Math.sin(r),y:130-radius*Math.cos(r)}}
function dot(p,color,letter,hollow=false){return `<circle cx="${p.x}" cy="${p.y}" r="9.5" fill="${hollow?'#f4f8fb':color}" stroke="${color}" stroke-width="${hollow?2.5:0}" ${hollow?'stroke-dasharray="3 3"':''}/><text x="${p.x}" y="${p.y+3.3}" text-anchor="middle" class="dot-letter" fill="${hollow?color:'#fff'}">${letter}</text>`}
function arc(start,end,radius=83){const a=point(start,radius),b=point(end,radius),large=Math.abs(end-start)>180?1:0,sweep=end>start?0:1;return `M${a.x} ${a.y}A${radius} ${radius} 0 ${large} ${sweep} ${b.x} ${b.y}`}
function sceneSvg(item,index){const t=themes[activeTask],arrow=`arrow-${activeTask}-${index}`;let marks="";if(activeTask==="move"){marks=`<defs><marker id="${arrow}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${t.task}"/></marker></defs><path d="${arc(item.start,item.end)}" fill="none" stroke="${t.task}" stroke-width="4" stroke-linecap="round" marker-end="url(#${arrow})"/>${dot(point(item.start),t.task,"S")}${dot(point(item.end),t.task,"E",true)}${dot(point(item.interfererAzimuth),interferer,"I")}`}else{marks=`${dot(point(item.targetAzimuth),t.task,"T",activeTask==="remove")}${dot(point(item.interfererAzimuth),interferer,"I")}`}return `<svg viewBox="0 0 260 260" role="img" aria-label="Top-down spatial scene"><circle cx="130" cy="130" r="84" fill="none" stroke="#b7c6d1"/><circle cx="130" cy="130" r="56" fill="none" stroke="#d0dbe2" stroke-dasharray="3 6"/><circle cx="130" cy="130" r="29" fill="none" stroke="#d9e2e7" stroke-dasharray="3 7"/><path d="M130 45V215M45 130H215" stroke="#c8d5dd"/><text x="130" y="33" text-anchor="middle">FRONT</text><text x="130" y="235" text-anchor="middle">BACK</text><text x="30" y="134" text-anchor="middle">LEFT</text><text x="230" y="134" text-anchor="middle">RIGHT</text><circle cx="130" cy="130" r="9" fill="#14202d"/><path d="M130 116l-5 10h10z" fill="#14202d"/>${marks}</svg>`}
function fakePlayer(label){return `<button class="fake-player" aria-label="Visual audio placeholder for ${label}"><i class="play-icon">▶</i><i class="wave" aria-hidden="true"></i><b>00:00</b></button>`}
function methodCard(label){const ours=label==="NativeFOA";return `<div class="method-card ${ours?'method-card--ours':''}"><div class="method-name"><span>${label}</span>${ours?'<small>OURS</small>':''}</div>${fakePlayer(label)}</div>`}
function keyMarkup(item){const t=themes[activeTask];if(activeTask==="move")return `<div class="key-row" style="--dot:${t.task}"><b>S→E</b><span>Target: ${item.target} <em>(move)</em></span></div><div class="key-row" style="--dot:${interferer}"><b>I</b><span>Interferer: ${item.interferer} <em>(retain)</em></span></div>`;return `<div class="key-row" style="--dot:${t.task}"><b>T</b><span>Target: ${item.target} <em>(${activeTask})</em></span></div><div class="key-row" style="--dot:${interferer}"><b>I</b><span>Interferer: ${item.interferer} <em>(retain)</em></span></div>`}
function caseCard(item,index){const methods=activeTask==="remove"?["Reference","NativeFOA","SwanWeave","MARS-Sep","OmniSep"]:["NativeFOA","SwanWeave","MARS-Sep","OmniSep"];return `<article class="case-card"><div class="case-copy"><h3>${item.prompt}</h3><div class="input-player"><div class="micro-label">Input</div>${fakePlayer('input')}</div></div><div class="scene-panel"><div class="scene-wrap">${sceneSvg(item,index)}</div><div class="scene-key">${keyMarkup(item)}</div></div><div class="methods-panel"><div class="method-grid" style="--methods:${methods.length}">${methods.map(methodCard).join('')}</div></div></article>`}
function render(){const t=themes[activeTask];document.documentElement.style.setProperty('--task',t.task);document.documentElement.style.setProperty('--accent',t.accent);document.querySelector('#case-list').innerHTML=cases[activeTask].map(caseCard).join('')}

function initSoundfieldLegacy(){
  const canvas=document.querySelector('#soundfield-canvas'),ctx=canvas.getContext('2d');let w=0,h=0,dpr=1,pointerX=0,pointerY=0;
  const colors=['#2d8fcb','#e47a25','#35b977','#e74b55','#7b65cf','#29bfd0'];
  const particles=Array.from({length:180},(_,i)=>{const u=(i+.5)/180,v=((i*73)%180+.5)/180,theta=Math.acos(1-2*u),phi=Math.PI*2*v,r=.72+((i*37)%29)/100;return{x:r*Math.sin(theta)*Math.cos(phi),y:r*Math.cos(theta),z:r*Math.sin(theta)*Math.sin(phi),c:colors[i%colors.length],s:1+(i%4)*.45}});
  const sources=[{lat:.25,lon:.2,c:'#e74b55'},{lat:-.36,lon:1.8,c:'#2d8fcb'},{lat:.52,lon:3.5,c:'#35b977'},{lat:-.12,lon:5.1,c:'#e47a25'}];
  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  function rotate(p,yaw,pitch){const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy;return{x,y:p.y*cx-z*sx,z:p.y*sx+z*cx}}
  function project(p,cx,cy,R){const f=1/(1+p.z*.28);return{x:cx+p.x*R*f,y:cy-p.y*R*f,z:p.z,f}}
  function path(points,cx,cy,R,yaw,pitch,color,width=1,alpha=.25){ctx.beginPath();points.forEach((p,i)=>{const q=project(rotate(p,yaw,pitch),cx,cy,R);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke();ctx.globalAlpha=1}
  function sphereGrid(cx,cy,R,yaw,pitch){
    for(let lat=-60;lat<=60;lat+=20){const a=lat*Math.PI/180,pts=[];for(let i=0;i<=80;i++){const l=i/80*Math.PI*2;pts.push({x:Math.cos(a)*Math.cos(l),y:Math.sin(a),z:Math.cos(a)*Math.sin(l)})}path(pts,cx,cy,R,yaw,pitch,'#cdeaf1',1,.31)}
    for(let lon=0;lon<360;lon+=20){const l=lon*Math.PI/180,pts=[];for(let i=0;i<=60;i++){const a=-Math.PI/2+i/60*Math.PI;pts.push({x:Math.cos(a)*Math.cos(l),y:Math.sin(a),z:Math.cos(a)*Math.sin(l)})}path(pts,cx,cy,R,yaw,pitch,'#b9e0e8',1,.25)}
    const axes=[{v:{x:1.25,y:0,z:0},n:'X',c:'#35b977'},{v:{x:0,y:1.25,z:0},n:'Z',c:'#e47a25'},{v:{x:0,y:0,z:1.25},n:'Y',c:'#2d8fcb'}];
    axes.forEach(a=>{const o=project(rotate({x:0,y:0,z:0},yaw,pitch),cx,cy,R),q=project(rotate(a.v,yaw,pitch),cx,cy,R);ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=a.c;ctx.globalAlpha=.72;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=a.c;ctx.font='700 12px ui-monospace, monospace';ctx.fillText(a.n,q.x+6,q.y-4)});
  }
  function glow(x,y,r,color,alpha=1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.28,color);g.addColorStop(1,'rgba(255,255,255,0)');ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
  function draw(time){
    ctx.clearRect(0,0,w,h);const cx=w*.5,cy=h*.48,R=Math.min(w,h)*.47,yaw=time*.00011+pointerX*.22,pitch=-.18+Math.sin(time*.00023)*.055+pointerY*.12;
    const ambient=ctx.createRadialGradient(cx,cy,0,cx,cy,R*1.3);ambient.addColorStop(0,'rgba(213,246,250,.42)');ambient.addColorStop(.48,'rgba(45,143,203,.13)');ambient.addColorStop(1,'rgba(4,16,29,0)');ctx.fillStyle=ambient;ctx.fillRect(0,0,w,h);
    sphereGrid(cx,cy,R,yaw,pitch);
    const wPulse=R*(.15+Math.sin(time*.0012)*.018);glow(cx,cy,wPulse,'rgba(235,246,250,.55)',.6);ctx.fillStyle='rgba(255,255,255,.78)';ctx.font='700 12px ui-monospace, monospace';ctx.fillText('W',cx+8,cy-8);
    particles.map(p=>{const q=project(rotate(p,yaw,pitch),cx,cy,R);return{...q,c:p.c,s:p.s}}).sort((a,b)=>b.z-a.z).forEach(p=>{ctx.globalAlpha=.22+(1-p.z)*.22;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s*p.f,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1});
    sources.forEach((s,i)=>{const lon=s.lon+time*(.00008+i*.000012),p={x:Math.cos(s.lat)*Math.cos(lon),y:Math.sin(s.lat),z:Math.cos(s.lat)*Math.sin(lon)},q=project(rotate(p,yaw,pitch),cx,cy,R);glow(q.x,q.y,22*q.f,s.c,.95);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(q.x,q.y,4.2*q.f,0,Math.PI*2);ctx.fill();for(let k=1;k<=2;k++){const phase=(time*.00012+i*.21+k*.31)%1;ctx.strokeStyle=s.c;ctx.globalAlpha=(1-phase)*.38;ctx.lineWidth=1;ctx.beginPath();ctx.arc(q.x,q.y,(9+phase*30)*q.f,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}});
    const trail=[];for(let i=0;i<=70;i++){const u=i/70,lon=.2+u*2.35,lat=.42*Math.sin(u*Math.PI)-.1;trail.push({x:Math.cos(lat)*Math.cos(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.sin(lon)})}path(trail,cx,cy,R*1.02,yaw,pitch,'#ffd05a',3,.78);
    ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='650 11px ui-monospace, monospace';ctx.fillText('W ± Y / Z / X',Math.max(22,cx-R*.92),Math.min(h-30,cy+R*.9));
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(draw)
  }
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5});
  addEventListener('resize',resize);resize();requestAnimationFrame(draw)
}

function initSoundfield(){
  const canvas=document.querySelector('#soundfield-canvas'),ctx=canvas.getContext('2d');let w=0,h=0,dpr=1,mx=0,my=0;
  const palette={blue:'#327fc1',orange:'#e67e22',green:'#2f9e66',red:'#c94246',violet:'#7d67b4',ink:'#53666d'};
  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  function rot(p,yaw,pitch){const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy;return{x,y:p.y*cx-z*sx,z:p.y*sx+z*cx}}
  function proj(p,cx,cy,R){const f=1/(1+p.z*.24);return{x:cx+p.x*R*f,y:cy-p.y*R*f,z:p.z,f}}
  function line(points,cx,cy,R,yaw,pitch,color,alpha=.28,width=1){ctx.beginPath();points.forEach((p,i)=>{const q=proj(rot(p,yaw,pitch),cx,cy,R);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.stroke();ctx.globalAlpha=1}
  function glow(x,y,r,color,alpha=.8){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.26,color);g.addColorStop(1,'rgba(255,255,255,0)');ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
  function source(p,cx,cy,R,yaw,pitch,color,time,fade=1){const q=proj(rot(p,yaw,pitch),cx,cy,R);glow(q.x,q.y,20*q.f,color,.7*fade);ctx.fillStyle=color;ctx.globalAlpha=fade;ctx.beginPath();ctx.arc(q.x,q.y,5*q.f,0,Math.PI*2);ctx.fill();for(let i=1;i<=2;i++){const phase=(time*.00016+i*.37)%1;ctx.strokeStyle=color;ctx.globalAlpha=(1-phase)*.42*fade;ctx.beginPath();ctx.arc(q.x,q.y,(8+phase*25)*q.f,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;return q}
  function trajectory(points,cx,cy,R,yaw,pitch,color){line(points,cx,cy,R,yaw,pitch,color,.82,2.5);const mid=Math.floor(points.length*.52),a=proj(rot(points[mid-1],yaw,pitch),cx,cy,R),b=proj(rot(points[mid+1],yaw,pitch),cx,cy,R),angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);ctx.fillStyle=color;ctx.globalAlpha=.88;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-9,-4);ctx.lineTo(-9,4);ctx.closePath();ctx.fill();ctx.restore();ctx.globalAlpha=1}
  function sphere(cx,cy,R,yaw,pitch,label,mode,time){
    for(let lat=-60;lat<=60;lat+=30){const a=lat*Math.PI/180,pts=[];for(let i=0;i<=48;i++){const l=i/48*Math.PI*2;pts.push({x:Math.cos(a)*Math.cos(l),y:Math.sin(a),z:Math.cos(a)*Math.sin(l)})}line(pts,cx,cy,R,yaw,pitch,palette.ink,.4)}
    for(let lon=0;lon<360;lon+=30){const l=lon*Math.PI/180,pts=[];for(let i=0;i<=40;i++){const a=-Math.PI/2+i/40*Math.PI;pts.push({x:Math.cos(a)*Math.cos(l),y:Math.sin(a),z:Math.cos(a)*Math.sin(l)})}line(pts,cx,cy,R,yaw,pitch,palette.ink,.32)}
    const axis=[{p:{x:1.15,y:0,z:0},c:palette.green,n:'X'},{p:{x:0,y:1.15,z:0},c:palette.orange,n:'Z'},{p:{x:0,y:0,z:1.15},c:palette.blue,n:'Y'}];axis.forEach(a=>{const o=proj(rot({x:0,y:0,z:0},yaw,pitch),cx,cy,R),q=proj(rot(a.p,yaw,pitch),cx,cy,R);ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=a.c;ctx.globalAlpha=.62;ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=a.c;ctx.font='700 10px ui-monospace,monospace';ctx.fillText(a.n,q.x+4,q.y-3)});
    if(label){ctx.fillStyle='#354a52';ctx.font='800 11px ui-monospace,monospace';ctx.letterSpacing='1px';ctx.fillText(label,cx-R*.72,cy-R-13)}
    if(mode==='original'){[[.2,.15,palette.red],[-.35,1.8,palette.blue],[.42,3.45,palette.green],[-.12,5.2,palette.orange]].forEach((s,i)=>source({x:Math.cos(s[0])*Math.cos(s[1]+time*.00005),y:Math.sin(s[0]),z:Math.cos(s[0])*Math.sin(s[1]+time*.00005)},cx,cy,R,yaw,pitch,s[2],time))}
    if(mode==='moveA'){const start={x:-.82,y:-.38,z:.22},end={x:.82,y:.34,z:.12},trail=[];for(let i=0;i<=40;i++){const u=i/40;trail.push({x:start.x+(end.x-start.x)*u,y:start.y+(end.y-start.y)*u,z:start.z+(end.z-start.z)*u})}trajectory(trail,cx,cy,R,yaw,pitch,palette.blue);const u=(time*.000075)%1;source({x:start.x+(end.x-start.x)*u,y:start.y+(end.y-start.y)*u,z:start.z+(end.z-start.z)*u},cx,cy,R,yaw,pitch,palette.blue,time);source({x:-.48,y:.62,z:.48},cx,cy,R,yaw,pitch,palette.orange,time);source({x:.22,y:-.66,z:-.56},cx,cy,R,yaw,pitch,palette.green,time)}
    if(mode==='moveB'){const start={x:.72,y:-.58,z:-.18},end={x:-.68,y:.58,z:.2},trail=[];for(let i=0;i<=40;i++){const u=i/40;trail.push({x:start.x+(end.x-start.x)*u,y:start.y+(end.y-start.y)*u,z:start.z+(end.z-start.z)*u})}trajectory(trail,cx,cy,R,yaw,pitch,palette.red);const u=(time*.00006)%1;source({x:start.x+(end.x-start.x)*u,y:start.y+(end.y-start.y)*u,z:start.z+(end.z-start.z)*u},cx,cy,R,yaw,pitch,palette.red,time);source({x:.66,y:.42,z:.48},cx,cy,R,yaw,pitch,palette.violet,time);source({x:.38,y:-.48,z:-.7},cx,cy,R,yaw,pitch,palette.orange,time)}
    if(mode==='remove'){const a=.28+Math.sin(time*.0014)*.24;source({x:.7,y:.22,z:.68},cx,cy,R,yaw,pitch,palette.red,time,a);source({x:-.5,y:-.2,z:.83},cx,cy,R,yaw,pitch,palette.orange,time,1)}
    if(mode==='replace'){const p={x:.7,y:.22,z:.68},mix=(Math.sin(time*.0011)+1)/2;source(p,cx,cy,R,yaw,pitch,palette.orange,time,1-mix*.72);source(p,cx,cy,R,yaw,pitch,palette.green,time,.28+mix*.72);source({x:-.5,y:-.2,z:.83},cx,cy,R,yaw,pitch,palette.blue,time,1)}
  }
  function lobes(cx,cy,R,time){const pulse=1+Math.sin(time*.001)*.05;[['W+Y',0,-1,palette.blue],['W-Y',0,1,'#7ec7df'],['W+Z',1,0,palette.orange],['W-Z',-1,0,'#efb27f']].forEach((l,i)=>{const x=cx+l[1]*R*.7,y=cy+l[2]*R*.52,rx=R*(.4+(i%2)*.08)*pulse,ry=R*.2*pulse;ctx.globalAlpha=.18;ctx.fillStyle=l[3];ctx.beginPath();ctx.ellipse(x,y,rx,ry,(i-1.5)*.42,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.62;ctx.strokeStyle=l[3];ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#4f5e62';ctx.font='700 9px ui-monospace,monospace';ctx.fillText(l[0],x-12,y+3)})}
  function flowRibbon(time){const y=h*.09;ctx.strokeStyle='rgba(72,87,89,.22)';ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(w*.22,y);ctx.bezierCurveTo(w*.35,y+45,w*.64,y-35,w*.79,y+5);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<10;i++){const u=(i/10+time*.000035)%1,x=w*(.22+.57*u),yy=y+Math.sin(u*Math.PI*2)*18;ctx.fillStyle=[palette.violet,palette.blue,palette.green][i%3];ctx.globalAlpha=.62;ctx.beginPath();ctx.arc(x,yy,3+(i%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.fillStyle='#59676a';ctx.font='700 9px ui-monospace,monospace';ctx.fillText('INPUT FOA → CONDITIONAL FLOW → EDITED FOA',w*.36,y-18)}
  function draw(time){ctx.clearRect(0,0,w,h);const yaw=time*.000075+mx*.16,pitch=-.13+my*.08,R=Math.min(w,h)*.18;sphere(w*.14,h*.3,R,yaw,pitch,'','moveA',time);sphere(w*.86,h*.7,R,-yaw*.78,pitch*.72,'','moveB',time);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(draw)}
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5});addEventListener('resize',resize);resize();requestAnimationFrame(draw)
}

const vaeSamples=[
  {number:'01',id:'530swnPWJrQ_17'},
  {number:'02',id:'530swnPWJrQ_5'},
  {number:'04',id:'RbFEpkuFCjI_18'},
  {number:'07',id:'nagycDdW04w_10.0'},
  {number:'09',id:'u-Hpf2_wzB8_390'},
];
let vaeListReady=false;
function sizeVaeFrame(frame){
  try{
    const doc=frame.contentDocument;
    const resize=()=>{frame.style.height=`${Math.max(520,Math.ceil(doc.documentElement.scrollHeight))}px`};
    frame.vaeResizeObserver?.disconnect();
    frame.vaeResizeObserver=new ResizeObserver(resize);
    frame.vaeResizeObserver.observe(doc.body);
    resize();
  }catch(error){console.warn('VAE demo frame sizing is unavailable.',error)}
}
function mountVaeFrame(frame){
  if(frame.dataset.mounted==='true')return;
  frame.dataset.mounted='true';
  frame.addEventListener('load',()=>sizeVaeFrame(frame),{once:true});
  frame.src=frame.dataset.src;
}
function unmountVaeFrame(frame){
  if(frame.dataset.mounted!=='true')return;
  frame.dataset.mounted='false';
  frame.vaeResizeObserver?.disconnect();
  frame.vaeResizeObserver=null;
  frame.src='about:blank';
}
function initVaeList(){
  if(vaeListReady)return;
  vaeListReady=true;
  const list=document.querySelector('#vae-list');
  vaeSamples.forEach(sample=>{
    const item=document.createElement('article');
    item.className='vae-case';
    item.innerHTML=`<div class="vae-case-number">${sample.number}</div><iframe class="vae-frame" data-src="vae-demo/index.html#sample=${encodeURIComponent(sample.id)}" title="FOA VAE reconstruction example ${sample.number}" loading="lazy" allow="autoplay; fullscreen"></iframe>`;
    list.append(item);
  });
  const frames=[...list.querySelectorAll('.vae-frame')];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    const frame=entry.target;
    entry.isIntersecting?mountVaeFrame(frame):unmountVaeFrame(frame);
  }),{rootMargin:'500px 0px'});
  frames.forEach(frame=>observer.observe(frame));
}
function showPage(page,{scroll=false}={}){
  const next=['vae','editor','bench'].includes(page)?page:'editor';
  document.querySelectorAll('[data-page-panel]').forEach(panel=>{panel.hidden=panel.dataset.pagePanel!==next});
  document.querySelectorAll('.module-button').forEach(button=>button.classList.toggle('is-active',button.dataset.page===next));
  if(next==='vae')initVaeList();
  history.replaceState(null,'',`#${next}`);
  if(scroll)document.querySelector('.module-switcher')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function initPageSwitcher(){
  document.querySelectorAll('.module-button').forEach(button=>button.addEventListener('click',()=>showPage(button.dataset.page,{scroll:true})));
  addEventListener('hashchange',()=>showPage(location.hash.slice(1),{scroll:true}));
  showPage(location.hash.slice(1));
}

document.querySelectorAll('.task-button').forEach(button=>button.addEventListener('click',()=>{activeTask=button.dataset.task;document.querySelectorAll('.task-button').forEach(node=>{const on=node===button;node.classList.toggle('is-active',on);node.setAttribute('aria-selected',String(on))});render()}));
document.addEventListener('click',event=>{const button=event.target.closest('.fake-player');if(!button)return;document.querySelectorAll('.fake-player').forEach(node=>{if(node!==button){node.classList.remove('is-playing');const icon=node.querySelector('.play-icon');if(icon)icon.textContent='▶'}});button.classList.toggle('is-playing');button.querySelector('.play-icon').textContent=button.classList.contains('is-playing')?'Ⅱ':'▶'});
render();initSoundfield();initPageSwitcher();

const c=document.querySelector('#game'),g=c.getContext('2d'),$=q=>document.querySelector(q);
let W,H,run=false,paused=false,last=0,score=0,shards=0,speed=300,stage=1,player,roofs=[],stars=[],particles=[],keys={},birdTimer=0,birds=[],shield=0,magnet=0;
const read=(k,f)=>{try{return localStorage.getItem(k)||f}catch{return f}},save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
let best=+read('sBest',0),coins=+read('sCoins',0),skin=read('sSkin','Classic'),owned;
try{owned=JSON.parse(read('sOwned','["Classic"]'))}catch{owned=['Classic']}
if(!Array.isArray(owned))owned=['Classic']; owned=[...new Set(['Classic',skin,...owned])];document.body.dataset.skin=skin;
function size(){const before=H;W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,2);c.width=W*d;c.height=H*d;g.setTransform(d,0,0,d,0,0);if(before){roofs.forEach(r=>r.y*=H/before);if(player)player.y*=H/before}stars=Array.from({length:65},()=>({x:Math.random()*W,y:Math.random()*H*.6,r:Math.random()*1.5+.4}))}addEventListener('resize',size);size();
let mode3d=false;
function installModePicker(){const menu=$('#menu');if(!menu||$('#modePicker'))return;const wrap=document.createElement('div');wrap.id='modePicker';wrap.className='modePicker';wrap.innerHTML='<span>RUN STYLE</span><button id="mode2d">2D NEON</button><button id="mode3d">3D RUNNER</button>';menu.insertBefore(wrap,menu.querySelector('button'));const style=document.createElement('style');style.textContent='#modePicker{display:flex;align-items:center;gap:7px;margin:0 0 16px}#modePicker span{font:9px monospace;color:#91a4be;letter-spacing:1px;margin-right:auto}#modePicker button{margin:0;padding:8px 10px;font:10px monospace;background:#ffffff0a}#modePicker button.active{background:#a0edd9;color:#132f36;border-color:#a0edd9}';document.head.append(style);const set=m=>{mode3d=m==='3d';save('sMode',m);$('#mode2d').classList.toggle('active',!mode3d);$('#mode3d').classList.toggle('active',mode3d)};$('#mode2d').onclick=()=>set('2d');$('#mode3d').onclick=()=>set('3d');set(mode3d?'3d':'2d')}
// 2D neon is the supported runner mode.
const skinCatalog={
  Classic:{colors:['#7762dc','#b5a4ff','#69ffe0'],price:0},
  Sunset:{colors:['#c84464','#ff936d','#ffe19a'],price:20},
  Mint:{colors:['#168b86','#6de5c5','#d6fff1'],price:20},
  Glacier:{colors:['#347fc1','#b1e4ff','#f4ffff'],price:25},
  Ember:{colors:['#b63821','#ff9352','#ffe15a'],price:25},
  Sakura:{colors:['#c45694','#ffb5df','#fff0fa'],price:25},
  Volt:{colors:['#567725','#c9ff53','#f4ffad'],price:30},
  Midnight:{colors:['#252c48','#657595','#a7b7ff'],price:30},
  Gold:{colors:['#b47c23','#ffe09a','#fff4d6'],price:40},
  Phoenix:{colors:['#d64020','#ffb342','#fff3a0'],price:250,power:'phoenix',description:'Flaming wings · Triple jump · One revival per run'},
  Titan:{colors:['#466277','#b4d8e7','#79fff1'],price:500,power:'titan',description:'Mech armor · Blocks 3 hits · Restores 1 armor every 12 seconds'},
  Void:{colors:['#6234bd','#d4a1ff','#81f4ff'],price:800,power:'void',description:'Cosmic halo · 4 jumps · Coin magnet · Double coin rewards'}
};

const outfitNames={Classic:'Street runner · Scarf & backpack',Sunset:'Desert scout · Wide-brim hat & poncho',Mint:'Forest guardian · Antlers & leaf mantle',Glacier:'Ice explorer · Crystal helmet & shoulder guards',Ember:'Fire rider · Horned helmet & exhaust pack',Sakura:'Blossom warrior · Hair blossom & back sword',Volt:'Tech racer · Antenna headset & power pack',Midnight:'Shadow ninja · Hood, mask & twin blades',Gold:'Royal champion · Crown & flowing cape'};
let runPower='',armor=0,armorClock=0,revives=0,effectClock=0;
function powerStatus(){return runPower==='phoenix'?'PHOENIX · 3 JUMPS · '+revives+' REVIVE':runPower==='titan'?'TITAN · '+armor+'/3 ARMOR · '+Math.ceil(12-armorClock)+'s RECHARGE':runPower==='void'?'VOID · 4 JUMPS · MAGNET · 2× COINS':''}
function revive(){
  if(!revives)return false;revives--;const safe=roofs.find(r=>r.x<=player.x&&r.x+r.w>=player.x)||{x:player.x-80,w:260,y:H*.65};
  if(!roofs.includes(safe)){roofs.push(safe);roofs.sort((a,b)=>a.x-b.x)}
  safe.spike=false;player.y=safe.y-38;player.vy=-350;player.jumps=0;player.on=false;player.invincible=3;
  burst(player.x,player.y,'#ffb342',45);return true;
}

// 3D mode gets a second perspective pass over the runner lane.

function stats(){$('#best').textContent=best;$('#wallet').textContent=coins;$('#score').textContent=Math.floor(score).toString().padStart(4,'0');$('#energy').textContent='✦ '+shards;$('#pace').textContent='SPEED '+(speed/300).toFixed(2)+'×';$('#district').textContent=['MIDNIGHT DISTRICT','EMBER HEIGHTS','AURORA QUARTER'][stage-1];$('#shield').textContent=(shield>0?'◈ SHIELD ACTIVE · ':'')+(magnet>0?'🧲 MAGNET '+Math.ceil(magnet)+'s · ':'')+(powerStatus()||'◈ Find power-ups');$('#progress').style.width=(score%250/2.5)+'%'}
function reset(){score=0;shards=0;speed=300;stage=1;shield=0;magnet=0;runPower=(skinCatalog[skin]||{}).power||'';armor=runPower==='titan'?3:0;armorClock=0;revives=runPower==='phoenix'?1:0;effectClock=0;birds=[];particles=[];birdTimer=0;keys={};roofs=[{x:-100,w:Math.max(W*.7,420),y:H*.72}];player={x:Math.min(W*.22,220),y:H*.72-38,vy:0,on:true,jumps:0,trail:[],grace:.1};while(roofs.at(-1).x<W+400)addRoof();run=true;paused=false;$('#menu').hidden=true;$('#end').hidden=true;$('#pausePanel').hidden=true;$('#shop').hidden=true;$('#hud').hidden=false;$('#touch').hidden=false;last=performance.now();stats()}
function jump(){if(!run||paused)return;if(player.on||player.grace>0)player.jumps=0;if(player.jumps<(runPower==='void'?4:runPower==='phoenix'?3:2)){player.vy=-650;player.on=false;player.grace=0;player.jumps++;burst(player.x,player.y+38,'#74f3dc',8)}}
function pause(value=!paused){if(!run)return;paused=value;keys={};$('#pausePanel').hidden=!paused;last=performance.now()}
function finish(reason){if(!run)return;run=false;paused=false;best=Math.max(best,Math.floor(score));save('sBest',best);$('#hud').hidden=true;$('#touch').hidden=true;$('#pausePanel').hidden=true;$('#final').textContent=Math.floor(score);$('#result').textContent=reason+' · '+shards+' coins collected';$('#end').hidden=false;stats()}
function burst(x,y,color,n=15){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*210,vy:(Math.random()-.7)*220,life:.6,color})}
function damage(reason){
  if(!run||player.invincible>0)return;
  if(shield>0){shield=0;player.invincible=1.3;burst(player.x,player.y,'#8af5ff',25)}
  else if(armor>0){armor--;player.invincible=1.3;burst(player.x,player.y,'#79fff1',25)}
  else if(!revive())finish(reason);
}

function addRoof(){const prev=roofs.at(-1),gap=85+Math.random()*65,w=180+Math.random()*180;const y=Math.max(H*.45,Math.min(H*.79,prev.y+(Math.random()-.5)*125));roofs.push({x:prev.x+prev.w+gap,w,y,shard:Math.random()<.85,spike:Math.random()<.28,power:Math.random()<.12,magnet:Math.random()<.18})}
function spikeHit(r){return r.spike&&player.x+12>r.x+r.w*.65-12&&player.x-12<r.x+r.w*.65+12&&player.y+38>r.y-24&&player.y<r.y}
function update(dt){
if(runPower==='titan'){armorClock+=dt;if(armorClock>=12){armorClock=0;armor=Math.min(3,armor+1)}}
effectClock+=dt;if(runPower&&effectClock>.065){effectClock=0;burst(player.x-16,player.y+25,skinCatalog[skin].colors[2],2)}
speed=Math.min(450,speed+dt);score+=dt*10;stage=1+Math.floor(score/250)%3;player.invincible=Math.max(0,(player.invincible||0)-dt);shield=Math.max(0,shield-dt);magnet=Math.max(0,magnet-dt);const foot=player.y+38;player.grace=player.on?.1:Math.max(0,player.grace-dt);player.vy+=1550*dt;player.y+=player.vy*dt;player.on=false;
for(const r of roofs){r.x-=speed*dt;if(player.x+12>r.x&&player.x-12<r.x+r.w&&player.vy>=0&&foot<=r.y+1&&player.y+38>=r.y){player.y=r.y-38;player.vy=0;player.on=true;player.jumps=0}
const cx=r.x+r.w*.4;if(r.shard&&Math.abs(player.x-cx)<(runPower==='void'||magnet>0?220:27)&&Math.abs(player.y+18-(r.y-26))<(runPower==='void'||magnet>0?180:36)){r.shard=false;const reward=runPower==='void'?2:1;shards+=reward;coins+=reward;save('sCoins',coins);burst(cx,r.y-26,'#ffe59a');if(magnet>0||runPower==='void')for(let i=0;i<5;i++)particles.push({x:cx,y:r.y-26,vx:(player.x-cx)/.3,vy:(player.y+18-(r.y-26))/.3,life:.3,color:'#ffb7e8'})}
if(r.magnet&&Math.abs(player.x-(r.x+r.w*.82))<28&&Math.abs(player.y+18-(r.y-29))<38){r.magnet=false;magnet=10;burst(player.x,player.y,'#ff8ed5',20)}
if(r.power&&Math.abs(player.x-(r.x+r.w*.2))<27&&Math.abs(player.y+18-(r.y-29))<36){r.power=false;shield=12;burst(player.x,player.y,'#8af5ff')}
if(spikeHit(r))damage('Watch those spikes')}
while(roofs.length>1&&roofs[0].x+roofs[0].w<0)roofs.shift();while(roofs.at(-1).x<W+400)addRoof();
birdTimer+=dt;if(birdTimer>6){birdTimer=0;const target=roofs.find(r=>r.x+r.w>W);if(target&&!target.spike)birds.push({x:W+65,y:target.y-35})}
for(const b of birds){b.x-=(speed+70)*dt;const duck=keys.ArrowDown&&player.on;const top=player.y+(duck?16:-5);if(Math.abs(b.x-player.x)<28&&b.y+8>top&&b.y-8<player.y+38){damage('Duck under the birds');b.x=-100}}
birds=birds.filter(b=>b.x>-80);if(player.y>H+60&&!revive())finish('The city got you');stats()}
function drawCity(t){
  const themes=[
    {sky:['#060b20','#272353','#b55478'],glow:'#d087ff',accent:'#67dcd7',far:'#292643',mid:'#1b2239',near:'#111b30',sign:'夜 / NIGHT'},
    {sky:['#160d22','#743750','#ee956a'],glow:'#ffcb84',accent:'#ffba85',far:'#61384c',mid:'#382b40',near:'#221e33',sign:'EMBER / 02'},
    {sky:['#051c2d','#174553','#63a79e'],glow:'#9dffe2',accent:'#8cf5d3',far:'#23454d',mid:'#18343e',near:'#102733',sign:'AURORA / 03'}
  ];
  const a=themes[stage-1],time=t*.001,drift=score*2;
  g.save();const sky=g.createLinearGradient(0,0,0,H);a.sky.forEach((v,i)=>sky.addColorStop(i/2,v));g.fillStyle=sky;g.fillRect(0,0,W,H);
  // Broad atmospheric light keeps the city silhouettes readable.
  const mx=W*.77,my=H*.21,r=Math.min(W*.085,68);
  const halo=g.createRadialGradient(mx,my,r*.2,mx,my,r*3.5);halo.addColorStop(0,a.glow+'55');halo.addColorStop(1,a.glow+'00');g.fillStyle=halo;g.fillRect(mx-r*4,my-r*4,r*8,r*8);
  for(const s of stars){g.globalAlpha=.25+.25*Math.sin(time*.7+s.x);g.fillStyle='#e1f4ff';g.fillRect(s.x,s.y*.72,s.r,s.r)}g.globalAlpha=1;
  g.fillStyle=stage===2?'#ffd497':'#d8e5f0';g.beginPath();g.arc(mx,my,r,0,Math.PI*2);g.fill();
  if(stage===1){g.fillStyle='#9aafc333';for(let i=0;i<5;i++){g.beginPath();g.arc(mx+Math.sin(i*7)*r*.6,my+Math.cos(i*3)*r*.6,r*(.08+i*.015),0,7);g.fill()}g.strokeStyle='#ba9dff66';g.lineWidth=2;g.beginPath();g.ellipse(mx,my,r*1.65,r*.25,-.35,0,7);g.stroke()}
  if(stage===2){g.fillStyle=a.sky[1];for(let i=0;i<6;i++)g.fillRect(mx-r,my+r*.1+i*r*.15,r*2,2+i)}
  if(stage===3){for(let ribbon=0;ribbon<3;ribbon++){const aurora=g.createLinearGradient(0,H*.05,0,H*.42);aurora.addColorStop(0,'#8bffdf00');aurora.addColorStop(.5,'#8bffdf18');aurora.addColorStop(1,'#8bffdf00');g.fillStyle=aurora;g.beginPath();for(let x=0;x<=W+25;x+=25){const y=H*.16+Math.sin(x*.005+time*.18+ribbon)*H*.07+ribbon*22;if(x===0)g.moveTo(x,y);else g.lineTo(x,y)}for(let x=W+25;x>=0;x-=25)g.lineTo(x,H*.3+Math.sin(x*.005+time*.18+ribbon)*H*.07+ribbon*22);g.closePath();g.fill()}}
  // Slow clouds form long, soft bands behind the architecture.
  g.fillStyle=a.glow+'09';for(let i=0;i<5;i++){const x=((i*271+time*5)%(W+420))-210;g.beginPath();g.ellipse(x,H*(.14+i*.06),150+i*17,9+i*2,-.04,0,7);g.fill()}
  // Distant mountain ridges and a monumental communications tower.
  g.fillStyle=a.far;g.beginPath();g.moveTo(0,H*.7);for(let x=0;x<W+80;x+=80)g.lineTo(x,H*.57+Math.sin(x*.013)*H*.045);g.lineTo(W,H);g.lineTo(0,H);g.fill();
  const tower=((W*.61-drift*.08)%(W+400)+W+400)%(W+400)-100,base=H*.72,top=H*.22;
  g.fillStyle=a.mid;g.beginPath();g.moveTo(tower-31,base);g.lineTo(tower-9,top+70);g.lineTo(tower-2,top);g.lineTo(tower+2,top);g.lineTo(tower+9,top+70);g.lineTo(tower+31,base);g.fill();
  g.fillRect(tower-32,top+76,64,12);g.fillRect(tower-21,top+63,42,14);g.fillStyle=a.accent+'77';g.fillRect(tower-27,top+80,54,2);g.fillRect(tower-1,top+5,2,36);
  // Stable building identities scroll at different speeds for depth.
  for(let layer=0;layer<3;layer++){
    const step=[104,138,175][layer],offset=drift*[.12,.3,.55][layer],start=Math.floor(offset/step),shift=offset%step;
    for(let i=-1;i<=Math.ceil(W/step)+1;i++){
      const id=start+i+400,seed=Math.abs(Math.sin(id*12.9898+layer*7)),x=i*step-shift,w=step-15,h=H*(.15+seed*.24),y=H*(.75+layer*.09)-h;
      g.fillStyle=[a.far,a.mid,a.near][layer];g.fillRect(x,y,w,H-y);
      if(id%3===0)g.fillRect(x+w*.2,y-18,w*.6,19);if(id%4===0)g.fillRect(x+w*.6,y-39,3,39);
      g.fillStyle=a.accent+(layer===2?'25':'12');g.fillRect(x+2,y+3,2,h);g.fillRect(x+2,y+3,w-4,1);
      const floors=Math.min(16,Math.ceil(h/23));for(let row=0;row<floors;row++)for(let col=0;col<Math.floor(w/18)-1;col++){if((row*7+col*3+id)%5<2)continue;g.fillStyle=(row+col+id)%4===0?'#ffd79955':a.accent+'29';g.fillRect(x+12+col*18,y+15+row*23,5,9)}
      if(layer===1&&id%3===0){g.strokeStyle=a.accent+'55';g.lineWidth=2;g.strokeRect(x+w*.25,y+22,w*.5,29);g.fillStyle=a.accent+'99';g.font='8px monospace';g.textAlign='center';g.fillText(id%2?'NOVA':a.sign,x+w*.5,y+40)}
      if(layer===2&&id%3===1){g.fillStyle='#162d3e';g.fillRect(x+14,y+20,22,66);g.fillStyle=a.accent+'aa';g.font='10px monospace';g.textAlign='center';['S','K','Y'].forEach((letter,j)=>g.fillText(letter,x+25,y+37+j*17))}
      if(layer===2){g.fillStyle='#0c182b';g.fillRect(x+12,y-10,24,10);g.fillRect(x+w-25,y-6,15,6);g.fillStyle='#f7a9c577';g.fillRect(x+w*.6,y-40,3,3)}
    }
  }
  // An elevated transit line and tiny distant shuttles stay behind the playfield.
  const railY=H*.66;g.strokeStyle=a.accent+'20';g.lineWidth=2;g.beginPath();g.moveTo(0,railY);g.lineTo(W,railY);g.stroke();
  const trainX=((time*36)%(W+220))-200;g.fillStyle=a.mid;g.fillRect(trainX,railY-14,140,12);g.fillStyle=a.accent+'66';for(let i=0;i<10;i++)g.fillRect(trainX+7+i*13,railY-11,8,4);
  for(let i=0;i<3;i++){const x=((time*(13+i*6)+i*379)%(W+100))-50,y=H*(.15+i*.075);g.fillStyle=a.accent+'33';g.fillRect(x-28,y+2,28,1);g.fillStyle='#b5cdda99';g.fillRect(x,y,12,3);g.fillStyle=a.accent;g.fillRect(x+11,y+1,2,1)}
  const fog=g.createLinearGradient(0,H*.58,0,H);fog.addColorStop(0,a.sky[2]+'00');fog.addColorStop(1,a.sky[2]+'24');g.fillStyle=fog;g.fillRect(0,H*.58,W,H*.42);
  g.restore();
}

function render(t,dt){drawCity(t);for(const r of roofs){g.fillStyle='#101a30';g.fillRect(r.x,r.y,r.w,H-r.y);g.fillStyle='#74f3dc';g.fillRect(r.x,r.y,r.w,4);g.fillStyle='#32415c';g.fillRect(r.x,r.y+6,r.w,7);for(let x=r.x+15;x<r.x+r.w-12;x+=30){g.fillStyle='#ffd89855';g.fillRect(x,r.y+30,9,15)}if(r.spike)drawSpike(r,t);if(r.shard){g.fillStyle='#ffe59a';g.beginPath();g.ellipse(r.x+r.w*.4,r.y-26+Math.sin(t*.004)*3,7,10,0,0,7);g.fill()}if(r.magnet)drawMagnet(r.x+r.w*.82,r.y-29+Math.sin(t*.004)*3);if(r.power){g.strokeStyle='#8af5ff';g.lineWidth=3;g.beginPath();g.arc(r.x+r.w*.2,r.y-29,11,0,7);g.stroke()}}
for(const b of birds){g.strokeStyle='#182338';g.lineWidth=6;g.beginPath();g.moveTo(b.x-20,b.y+Math.sin(t*.015)*12);g.lineTo(b.x,b.y);g.lineTo(b.x+20,b.y+Math.sin(t*.015)*12);g.stroke();g.fillStyle='#ffd478';g.fillRect(b.x-5,b.y,5,4)}
if(player){if(magnet>0||runPower==='void'){g.save();g.strokeStyle='#ff8ed566';g.lineWidth=2;g.beginPath();g.ellipse(player.x,player.y+20,43+Math.sin(t*.006)*5,32,0,0,7);g.stroke();g.restore()}if(shield>0||player.invincible>0){g.strokeStyle='#8af5ff';g.lineWidth=2;g.beginPath();g.arc(player.x,player.y+17,34,0,7);g.stroke()}drawRunner(t)}
for(const q of particles){if(!paused){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt}g.globalAlpha=Math.max(0,q.life/.6);g.fillStyle=q.color;g.fillRect(q.x,q.y,4,4)}g.globalAlpha=1;particles=particles.filter(q=>q.life>0)}
function frame(t){if(!$('#shop').hidden)animatePreviews(t);const dt=Math.min(.035,(t-last)/1000||.016);last=t;if(run&&!paused)update(dt);render(paused?0:t,dt);requestAnimationFrame(frame)}
$('#play').onclick=reset;$('#again').onclick=reset;$('#pause').onclick=()=>pause();$('#resume').onclick=()=>pause(false);$('#home').onclick=()=>{$('#end').hidden=true;$('#menu').hidden=false};
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown'].includes(e.code)&&run)e.preventDefault();if(e.repeat)return;keys[e.code]=true;if(['Space','ArrowUp','KeyW'].includes(e.code))jump();if(['Escape','KeyP'].includes(e.code))pause()});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true)});c.addEventListener('pointerdown',jump);$('#jump').onpointerdown=e=>{e.preventDefault();jump()};$('#duck').onpointerdown=e=>{e.preventDefault();keys.ArrowDown=true;e.target.setPointerCapture(e.pointerId)};for(const event of ['pointerup','pointercancel','lostpointercapture'])$('#duck').addEventListener(event,()=>keys.ArrowDown=false);
function draw3DMode(t,dt){const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#050a20');sky.addColorStop(.55,'#263b67');sky.addColorStop(1,'#e36f68');g.fillStyle=sky;g.fillRect(0,0,W,H);const horizon=H*.43,cx=W*.5;g.fillStyle='#101a2d';g.beginPath();g.moveTo(cx-18,horizon);g.lineTo(cx+18,horizon);g.lineTo(W*.96,H);g.lineTo(W*.04,H);g.closePath();g.fill();g.strokeStyle='#6ff1d4';g.lineWidth=3;g.beginPath();g.moveTo(cx-18,horizon);g.lineTo(W*.04,H);g.moveTo(cx+18,horizon);g.lineTo(W*.96,H);g.stroke();for(let i=0;i<12;i++){const z=(i/12+(t*.0002)%1),y=horizon+z*z*(H-horizon),w=3+z*30;g.fillStyle=i%2?'#ffd36e':'#76f4db';g.fillRect(cx-w/2,y,w,3)}for(let side of [-1,1])for(let i=0;i<8;i++){const z=(i/8+(score*.0005)%1),y=horizon+z*z*(H-horizon),x=cx+side*(45+z*W*.42),s=7+z*34;g.fillStyle=i%2?'#263a61':'#4c315d';g.fillRect(x,y-s,s,s);g.fillStyle='#ffd79766';g.fillRect(x+4,y-s+6,4,6)}for(const r of roofs){const depth=24;g.fillStyle='#1a3450';g.beginPath();g.moveTo(r.x,r.y);g.lineTo(r.x+r.w,r.y);g.lineTo(r.x+r.w-depth,r.y+depth);g.lineTo(r.x+depth,r.y+depth);g.closePath();g.fill();g.fillStyle='#0c1728';g.fillRect(r.x+depth,r.y+depth,r.w-depth*2,H-r.y);g.fillStyle='#71f1d4';g.fillRect(r.x,r.y,r.w,4);if(r.spike)drawSpike(r,t);if(r.shard){g.fillStyle='#ffe59a';g.beginPath();g.arc(r.x+r.w*.4,r.y-27,9,0,7);g.fill()}if(r.magnet)drawMagnet(r.x+r.w*.82,r.y-29)}for(const b of birds){const s=.7;g.save();g.translate(b.x,b.y);g.scale(s,s);g.strokeStyle='#182338';g.lineWidth=6;g.beginPath();g.moveTo(-20,-8);g.lineTo(0,0);g.lineTo(20,-8);g.stroke();g.restore()}if(player){g.save();g.fillStyle='#0008';g.ellipse(player.x,player.y+40,24,6,0,0,7);g.fill();g.restore();drawRunner(t)}for(const q of particles){g.globalAlpha=Math.max(0,q.life/.6);g.fillStyle=q.color;g.fillRect(q.x,q.y,4,4)}g.globalAlpha=1}
draw3DMode=(t,dt)=>{const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#75d9ff');sky.addColorStop(.5,'#b9f4e6');sky.addColorStop(1,'#f5ba7b');g.fillStyle=sky;g.fillRect(0,0,W,H);const horizon=H*.36,cx=W*.5;g.fillStyle='#759b54';g.fillRect(0,horizon,W,H-horizon);g.fillStyle='#25374c';g.beginPath();g.moveTo(cx-30,horizon);g.lineTo(cx+30,horizon);g.lineTo(W*.94,H);g.lineTo(W*.06,H);g.closePath();g.fill();g.strokeStyle='#f9f0bd';g.lineWidth=5;g.beginPath();g.moveTo(cx-30,horizon);g.lineTo(W*.06,H);g.moveTo(cx+30,horizon);g.lineTo(W*.94,H);g.stroke();for(let lane=-1;lane<=1;lane++){g.beginPath();g.moveTo(cx+lane*9,horizon);g.lineTo(cx+lane*W*.28,H);g.strokeStyle='#ffffff99';g.lineWidth=3;g.setLineDash([18,22]);g.stroke();g.setLineDash([])}for(let side of [-1,1])for(let i=0;i<8;i++){const z=(i/8+(score*.00055)%1),y=horizon+z*z*(H-horizon),x=cx+side*(55+z*W*.43),s=10+z*38;g.fillStyle=i%2?'#52754f':'#6d5670';g.fillRect(x,y-s,s,s);g.fillStyle='#fff0b077';g.fillRect(x+4,y-s+7,4,7)}for(const r of roofs){const z=Math.max(.08,Math.min(1,(r.x+W)/(W*2.2)));const y=horizon+z*z*(H-horizon),lane=((Math.round(r.x/140)%3)-1),x=cx+lane*z*W*.25,w=34+z*110,h=12+z*35;g.fillStyle='#1b3045';g.fillRect(x-w/2,y-h,w,h);g.fillStyle='#75f2d7';g.fillRect(x-w/2,y-h,w,4);if(r.spike){g.fillStyle='#ed5167';g.beginPath();g.moveTo(x-14,y-h);g.lineTo(x,y-h-30*z);g.lineTo(x+14,y-h);g.closePath();g.fill()}if(r.shard){g.fillStyle='#ffe38b';g.beginPath();g.arc(x,y-h-18*z,7+z*3,0,7);g.fill()}}for(const b of birds){const z=.45;g.save();g.translate(cx+(b.x-W*.5)*.18,horizon+z*(H-horizon)*.45);g.scale(.7,.7);g.strokeStyle='#243348';g.lineWidth=8;g.beginPath();g.moveTo(-25,0);g.lineTo(0,-8);g.lineTo(25,0);g.stroke();g.restore()}const avatar={x:cx,y:H*.72,vy:0,on:true};g.save();g.fillStyle='#0005';g.beginPath();g.ellipse(cx,H*.72+42,34,9,0,0,7);g.fill();g.restore();drawRunner(t,g,avatar,skin);for(const q of particles){g.globalAlpha=Math.max(0,q.life/.6);g.fillStyle=q.color;g.fillRect(q.x,q.y,4,4)}g.globalAlpha=1};
draw3DMode=(t,dt)=>{g.clearRect(0,0,W,H);g.fillStyle='#8edbff';g.fillRect(0,0,W,H*.48);g.fillStyle='#87b85e';g.fillRect(0,H*.48,W,H*.52);const horizon=H*.42,cx=W*.5;g.fillStyle='#24364d';g.beginPath();g.moveTo(cx-24,horizon);g.lineTo(cx+24,horizon);g.lineTo(W*.9,H);g.lineTo(W*.1,H);g.closePath();g.fill();g.strokeStyle='#fff2be';g.lineWidth=4;g.beginPath();g.moveTo(cx-24,horizon);g.lineTo(W*.1,H);g.moveTo(cx+24,horizon);g.lineTo(W*.9,H);g.stroke();for(let lane=-1;lane<=1;lane++){g.beginPath();g.moveTo(cx+lane*9,horizon);g.lineTo(cx+lane*W*.28,H);g.setLineDash([16,20]);g.strokeStyle='#ffffffaa';g.stroke();g.setLineDash([])}const ahead=roofs.filter(r=>r.x>player.x-80).sort((a,b)=>a.x-b.x).slice(0,5);ahead.forEach((r,i)=>{const z=.18+i*.17,y=horizon+z*z*(H-horizon),lane=((i%3)-1),x=cx+lane*z*W*.27,w=50+z*100;g.fillStyle='#1d3348';g.fillRect(x-w/2,y-14-z*18,w,14+z*18);g.fillStyle='#7af2d8';g.fillRect(x-w/2,y-14-z*18,w,4);if(r.spike){g.fillStyle='#ed5268';g.beginPath();g.moveTo(x-13,y-14-z*18);g.lineTo(x,y-38-z*24);g.lineTo(x+13,y-14-z*18);g.closePath();g.fill()}if(r.shard){g.fillStyle='#ffe28e';g.beginPath();g.arc(x,y-31-z*18,7+z*3,0,7);g.fill()}});for(let i=0;i<4;i++){const z=((i/4)+(score*.0005)%1),x=cx+(i%2?-1:1)*(55+z*W*.36),y=horizon+z*z*(H-horizon);g.fillStyle='#5c8155';g.fillRect(x,y-22-z*30,18+z*30,22+z*30)}const avatar={x:cx,y:H*.7,vy:0,on:true};g.fillStyle='#0005';g.beginPath();g.ellipse(cx,H*.7+42,28,7,0,0,7);g.fill();drawRunner(t,g,avatar,skin)};
const _flatRender=render;render=(t,dt)=>_flatRender(t,dt);
function buySkin(n){
  const item=skinCatalog[n];if(!item||run)return;
  if(!owned.includes(n)){
    if(coins<item.price){$('#shopMessage').textContent='Collect '+(item.price-coins)+' more coins to unlock '+n+'.';return}
    coins-=item.price;owned.push(n);
  }
  skin=n;document.body.dataset.skin=n;
  save('sSkin',skin);save('sCoins',coins);save('sOwned',JSON.stringify(owned));
  $('#shopMessage').textContent=n+' equipped. Ready to run!';stats();shop();
}
function animatePreviews(t){for(const b of $('#skins').querySelectorAll('button')){const ctx=b.querySelector('canvas').getContext('2d');ctx.clearRect(0,0,240,180);ctx.save();ctx.scale(2.5,2.5);ctx.imageSmoothingEnabled=false;drawRunner(t,ctx,{x:48,y:24,on:false},b.dataset.skin);ctx.restore()}}
const boxPrice=35;
function openMysteryBox(){
  if(run)return;
  if(coins<boxPrice){$('#shopMessage').textContent='Mystery box costs 35 coins. Collect '+(boxPrice-coins)+' more.';return}
  const pool=Object.keys(skinCatalog);
  coins-=boxPrice;const common=pool.filter(n=>!skinCatalog[n].power&&skinCatalog[n].price<=30),rare=pool.filter(n=>!skinCatalog[n].power&&skinCatalog[n].price>30),legendary=pool.filter(n=>skinCatalog[n].power);
  const roll=Math.random();let group=roll<.72?common:roll<.95?rare:legendary;group=group.length?group:(common.length?common:rare.length?rare:legendary);const reward=group[Math.floor(Math.random()*group.length)];const duplicate=owned.includes(reward);if(!duplicate)owned.push(reward);else coins+=15;save('sOwned',JSON.stringify(owned));save('sCoins',coins);$('#shopMessage').textContent=duplicate?reward+' duplicate — 15 coins refunded.':'Mystery box unlocked '+reward+'! Odds: common 72% · rare 23% · legendary 5%.';shop();const pop=document.createElement('div');pop.id='rewardReveal';pop.style.cssText='position:fixed;inset:0;z-index:20;display:grid;place-items:center;background:#071226bb;backdrop-filter:blur(8px)';pop.innerHTML='<div style="width:min(360px,calc(100% - 40px));padding:28px;text-align:center;border:1px solid #ffe29a;border-radius:20px;background:#17233ff5;box-shadow:0 20px 80px #0008"><p style="color:#ffe29a">MYSTERY BOX OPENED</p><h2 style="margin:8px 0;color:#fff">'+reward+'</h2><div style="font:12px monospace;color:#a8bdd4">'+(skinCatalog[reward].power?'LEGENDARY POWER UNLOCKED':skinCatalog[reward].price>30?'RARE OUTFIT':'NEW OUTFIT')+'</div><div id="rewardPreview" style="margin:12px auto;width:180px;height:135px"></div><button id="rewardClose" class="primary">Awesome!</button></div>';document.body.append(pop);const pc=document.querySelector('#rewardPreview');pc.style.background="linear-gradient(135deg,"+skinCatalog[reward].colors.join(",")+")";pc.style.borderRadius="18px";const cv=document.createElement('canvas');cv.width=180;cv.height=135;cv.style.cssText='position:relative;inset:auto;display:block;width:180px;height:135px;margin:auto;z-index:1';pc.append(cv);const pg=cv.getContext('2d');pg.save();pg.scale(2,2);drawRunner(0,pg,{x:45,y:25,on:false},reward);pg.restore();const rc=skinCatalog[reward].colors;pg.fillStyle=rc[0];pg.fillRect(70,50,40,38);pg.fillStyle=rc[1];pg.fillRect(74,30,32,24);pg.fillStyle='#e9ae80';pg.fillRect(78,22,24,18);pg.fillStyle='#182238';pg.fillRect(76,18,28,7);pg.fillStyle=rc[2];pg.fillRect(78,55,8,4);pg.fillRect(94,55,8,4);document.querySelector('#rewardClose').onclick=()=>pop.remove();
}
function shop(){

  $('#shop').hidden=false;$('#shopCoins').textContent='✦ '+coins+' coins';if(!$('#mysteryBox')){const b=document.createElement('button');b.id='mysteryBox';b.className='mysteryBox';b.innerHTML='🎁 Mystery box · 35 coins <small>72% common · 23% rare · 5% legendary</small>';b.onclick=openMysteryBox;$('#shopCoins').after(b)}
  $('#skins').innerHTML=Object.entries(skinCatalog).map(([n,item])=>{
    const selected=skin===n,unlocked=owned.includes(n);
    return '<button class="skinCard '+(item.power?'legendary':'')+'" data-skin="'+n+'" aria-pressed="'+selected+'" aria-label="'+n+', '+(selected?'equipped':unlocked?'equip':item.price+' coins')+'"><b>'+n+'</b><span class="rarity">'+(item.power?'LEGENDARY':'OUTFIT')+'</span><canvas width="240" height="180" role="img" aria-label="'+n+' runner preview"></canvas><span class="skinSwatches" aria-hidden="true">'+item.colors.map(color=>'<i style="background:'+color+'"></i>').join('')+'</span><small>'+(selected?'✓ Equipped':unlocked?'Equip skin':'Unlock · '+item.price+' coins')+'</small><span class="skinDescription">'+(item.description||outfitNames[n])+'</span></button>';
  }).join('');
  for(const b of $('#skins').querySelectorAll('button')){
    b.onclick=()=>buySkin(b.dataset.skin);
    const preview=b.querySelector('canvas'),ctx=preview.getContext('2d');
    ctx.clearRect(0,0,240,180);ctx.save();ctx.scale(2.5,2.5);ctx.imageSmoothingEnabled=false;
    drawRunner(0,ctx,{x:48,y:24,on:false},b.dataset.skin);ctx.restore();
  }
}

$('#shopOpen').onclick=shop;$('#shopClose').onclick=()=>$('#shop').hidden=true;
function draw3DRunway(t){const horizon=H*.44,center=W*.5;g.fillStyle='#101b32';g.beginPath();g.moveTo(center-20,horizon);g.lineTo(center+20,horizon);g.lineTo(W*.94,H);g.lineTo(W*.06,H);g.closePath();g.fill();g.strokeStyle='#73f3d8aa';g.lineWidth=3;g.beginPath();g.moveTo(center-20,horizon);g.lineTo(W*.06,H);g.moveTo(center+20,horizon);g.lineTo(W*.94,H);g.stroke();for(let i=0;i<9;i++){const z=(i/9+(t*.00018)%1),y=horizon+Math.pow(z,1.8)*(H-horizon),w=4+z*26;g.fillStyle=i%2?'#ffc96b':'#74f3dc';g.fillRect(center-w/2,y,w,3)}for(let side of [-1,1])for(let i=0;i<7;i++){const z=(i/7+(score*.0007)%1),y=horizon+Math.pow(z,1.8)*(H-horizon),x=center+side*(42+z*W*.42),s=8+z*30;g.fillStyle=i%2?'#293d63':'#472f61';g.fillRect(x,y-s,s,s);g.fillStyle='#ffd99a88';g.fillRect(x+3,y-s+5,3,5)}}
const baseDrawCity=drawCity;drawCity=(t)=>{baseDrawCity(t);if(mode3d)draw3DRunway(t)};
roofs=[{x:-100,w:W*.55,y:H*.76},{x:W*.62,w:W*.5,y:H*.68}];stats();requestAnimationFrame(frame);

function drawRunner(t,g=c.getContext('2d'),playerState=player,skinName=document.body.dataset.skin){
  const player=playerState;
  const colors=(skinCatalog[skinName]||skinCatalog.Classic).colors;
  const stride=player.on?Math.sin(t*.022):.65;
  const bob=player.on?Math.abs(Math.sin(t*.022))*1.2:0;
  const duck=keys.ArrowDown&&player.on;
  g.save();g.translate(player.x,player.y+bob+(duck?13:0));if(duck)g.scale(1,.66);
  function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h)}
  function limb(points,color,width){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke()}
  function poly(points,color){g.fillStyle=color;g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.closePath();g.fill()}
  if(skinName==='Phoenix'){
    const flap=Math.sin(t*.008)*7;
    for(const side of [-1,1]){g.save();g.scale(side,1);poly([-5,16,-37,-10+flap,-29,16,-40,12,-24,31,-5,25],'#d84022');poly([-8,16,-32,-4+flap,-20,24,-9,23],'#ffac38');g.restore()}
  }
  if(skinName==='Void'){
    g.save();g.translate(0,14);g.rotate(t*.001);g.strokeStyle='#bd91ff';g.lineWidth=2;g.beginPath();g.ellipse(0,0,29,24,0,0,7);g.stroke();for(let i=0;i<4;i++){g.rotate(Math.PI/2);rect(26,-2,4,4,'#85f6ff')}g.restore();
  }
  if(['Gold','Midnight','Sunset'].includes(skinName))poly([-9,12,-27,36+Math.sin(t*.009)*3,-5,31,7,15],colors[0]);
  if(['Sakura','Midnight'].includes(skinName)){limb([-17,32,7,-10],'#cad7eb',3);limb([3,-4,10,-16],'#69466f',4);limb([-1,-6,9,0],colors[2],3)}
  if(skinName==='Ember'||skinName==='Volt'){rect(-21,14,9,20,'#303a4d');rect(-20,17,7,4,colors[2]);poly([-20,34,-25,42+Math.sin(t*.02)*4,-12,34],colors[1])}
  // Scarf tails flutter behind the runner.

  const flutter=Math.sin(t*.016)*3;
  g.fillStyle=colors[2];g.beginPath();g.moveTo(-6,14);g.lineTo(-22,12+flutter);g.lineTo(-32,18-flutter);g.lineTo(-20,18+flutter);g.lineTo(-5,18);g.fill();
  // Backpack, rear arm, and articulated legs.
  rect(-14,16,7,14,'#11182f');rect(-13,17,5,10,colors[0]);rect(-13,20,3,2,colors[2]);
  limb([-5,19,-10-stride*3,25,-8-stride*6,28],'#30294e',5);
  const rear=-stride*7,front=stride*7;
  limb([-4,27,-5+rear*.5,32,-5+rear,36],'#202840',6);
  rect(-8+rear,35,10,3,'#111829');rect(-7+rear,37,11,1,colors[2]);
  limb([3,27,4+front*.5,32,3+front,36],'#354463',6);
  rect(front,35,11,3,'#e3eaf5');rect(front+2,35,4,1,colors[0]);rect(front,37,12,1,'#142139');
  // Jacket outline, shaded panels, zipper, pockets, and belt.
  rect(-9,14,19,15,'#151a30');rect(-7,15,15,12,colors[0]);rect(-7,15,4,11,colors[1]);rect(5,17,3,10,'#44355f');
  rect(0,16,1,11,'#e8e9fa');rect(1,19,2,2,colors[2]);rect(-5,23,4,2,'#342d59');rect(3,23,3,2,'#342d59');rect(-7,27,15,2,'#182039');rect(0,27,3,2,'#e1b56d');
  // Neck, ears, face shading, nose, and hair silhouette.
  rect(-2,10,7,6,'#cc8f6b');rect(-7,-4,17,15,'#192238');rect(-6,-2,16,14,'#e9ae80');rect(-6,0,4,10,'#c48764');rect(-7,4,3,5,'#f4bd90');rect(8,4,4,4,'#f4c69a');
  rect(-7,-5,17,5,'#242238');rect(-8,-2,5,6,'#242238');rect(-3,-6,6,2,'#39334d');rect(5,-4,6,3,'#39334d');rect(-5,-4,6,1,'#65506a');
  // Headband and goggles with lens reflections.
  rect(-7,0,18,3,colors[0]);rect(-1,1,12,6,'#142038');rect(0,2,9,3,'#8eeafa');rect(1,2,3,1,'#f4ffff');rect(7,2,1,2,'#fff');rect(4,2,1,3,'#3c8aab');
  rect(5,10,4,1,'#85594e');rect(-4,7,2,2,'#b37861');
  // Front sleeve, cuff, glove, and shoulder insignia.
  limb([5,18,9+stride*3,23,7+stride*6,26],colors[0],5);
  rect(5,17,3,3,colors[2]);rect(5+stride*6,24,5,4,'#18243b');rect(7+stride*6,24,2,1,'#8795af');
  if(skinName==='Sunset'){rect(-13,-8,29,5,'#c99861');rect(-7,-16,16,9,'#e5bc7b');poly([-10,14,0,21,11,14,15,27,-14,27],colors[1])}
  if(skinName==='Mint'){limb([-6,-3,-13,-13,-11,-21],'#d6d3a0',3);limb([8,-3,15,-14,12,-22],'#d6d3a0',3);poly([-12,14,-17,24,-4,20,0,14],colors[1])}
  if(skinName==='Glacier'){poly([-10,0,-12,-12,-4,-7,1,-20,7,-8,14,-13,12,1],colors[1]);poly([-14,14,-20,23,-7,22],colors[2]);poly([9,13,18,21,8,23],colors[1])}
  if(skinName==='Ember'){rect(-9,-6,21,8,'#563638');poly([-9,-3,-17,-17,-5,-8],colors[2]);poly([7,-6,16,-17,12,1],colors[2])}
  if(skinName==='Sakura'){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;g.fillStyle='#ffb5df';g.beginPath();g.arc(-7+Math.cos(a)*5,-7+Math.sin(a)*5,3,0,7);g.fill()}rect(-8,-8,3,3,'#fff0b4')}
  if(skinName==='Volt'){rect(-10,-3,5,13,'#c9ff53');limb([-9,-2,-15,-15],colors[2],2);rect(-17,-18,5,5,colors[2]);poly([0,16,-4,23,1,23,-1,29,7,20,2,20],colors[2])}
  if(skinName==='Midnight'){poly([-10,8,-12,-8,0,-16,13,-6,13,8,7,0,-3,0],colors[0]);rect(-5,6,17,7,'#22283b');rect(1,3,10,2,'#bfb1ff')}
  if(skinName==='Gold'){poly([-9,-5,-11,-17,-4,-12,1,-22,6,-12,13,-17,11,-5],'#ffe09a');rect(-7,-7,16,3,'#c99532');rect(0,-11,3,4,'#a688ff')}
  if(skinName==='Phoenix'){poly([-8,-5,-11,-17,-2,-12,5,-23,10,-6],'#ffb342');rect(0,2,11,3,'#fff3a0')}
  if(skinName==='Titan'){
    rect(-13,-9,28,20,'#466277');rect(-7,-5,21,8,'#102d39');rect(-4,-3,16,3,'#79fff1');
    rect(-16,12,13,13,'#b4d8e7');rect(8,12,13,13,'#b4d8e7');rect(-10,14,23,17,'#466277');rect(-4,18,12,7,'#79fff1');rect(-12,31,12,9,'#b4d8e7');rect(5,31,12,9,'#b4d8e7');
    for(let i=0;i<3;i++){g.fillStyle=i<(run&&skinName===skin?armor:3)?'#79fff1':'#354452';g.fillRect(-10+i*8,-16,5,3)}
  }
  if(skinName==='Void'){poly([-11,0,-7,-12,1,-19,13,-8,14,12,5,8,-7,12],'#241339');rect(-4,1,6,3,'#81f4ff');rect(7,1,6,3,'#81f4ff');poly([-5,17,4,13,11,20,4,28],'#bd91ff')}
  g.restore();
}
function drawSpike(r,t){
  const sx=r.x+r.w*.65,base=r.y;
  g.save();
  g.fillStyle='#212840';g.fillRect(sx-18,base-3,36,3);
  for(let i=-16;i<16;i+=8){g.fillStyle='#ffd478';g.fillRect(sx+i,base-3,4,2)}
  g.fillStyle='#ff6578';g.beginPath();g.moveTo(sx-13,base);g.lineTo(sx,base-25);g.lineTo(sx+13,base);g.closePath();g.fill();
  g.fillStyle='#ffc2b7';g.beginPath();g.moveTo(sx-13,base);g.lineTo(sx,base-25);g.lineTo(sx-3,base-2);g.closePath();g.fill();
  g.strokeStyle='#fff1dc';g.lineWidth=1;g.beginPath();g.moveTo(sx-12,base-1);g.lineTo(sx,base-25);g.lineTo(sx+12,base-1);g.stroke();
  g.fillStyle='#fff0ca';g.globalAlpha=.65+.35*Math.sin(t*.007);g.fillRect(sx-1,base-16,2,6);g.fillRect(sx-1,base-7,2,2);g.restore();
}

function drawMagnet(x,y){g.save();g.translate(x,y);g.strokeStyle='#ff75be';g.lineWidth=6;g.beginPath();g.moveTo(-7,-8);g.lineTo(-7,2);g.arc(0,2,7,Math.PI,0,true);g.lineTo(7,-8);g.stroke();g.fillStyle='#e7f7ff';g.fillRect(-10,-10,6,5);g.fillRect(4,-10,6,5);g.restore()}

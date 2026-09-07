const c=document.querySelector('#game'),g=c.getContext('2d'),$=q=>document.querySelector(q);
let W,H,run=false,paused=false,last=0,score=0,shards=0,speed=300,stage=1,player,roofs=[],stars=[],particles=[],keys={},birdTimer=0,birds=[],shield=0;
const read=(k,f)=>{try{return localStorage.getItem(k)||f}catch{return f}},save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
let best=+read('sBest',0),coins=+read('sCoins',0),skin=read('sSkin','Classic'),owned;
try{owned=JSON.parse(read('sOwned','["Classic"]'))}catch{owned=['Classic']}
if(!Array.isArray(owned))owned=['Classic']; owned=[...new Set(['Classic',skin,...owned])];document.body.dataset.skin=skin;
function size(){const before=H;W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,2);c.width=W*d;c.height=H*d;g.setTransform(d,0,0,d,0,0);if(before){roofs.forEach(r=>r.y*=H/before);if(player)player.y*=H/before}stars=Array.from({length:65},()=>({x:Math.random()*W,y:Math.random()*H*.6,r:Math.random()*1.5+.4}))}addEventListener('resize',size);size();
function stats(){$('#best').textContent=best;$('#wallet').textContent=coins;$('#score').textContent=Math.floor(score).toString().padStart(4,'0');$('#energy').textContent='✦ '+shards;$('#district').textContent=['MIDNIGHT DISTRICT','EMBER HEIGHTS','AURORA QUARTER'][stage-1];$('#shield').textContent=shield>0?'◈ SHIELD ACTIVE':'◈ Find a shield';$('#progress').style.width=(score%250/2.5)+'%'}
function reset(){score=0;shards=0;speed=300;stage=1;shield=0;birds=[];particles=[];birdTimer=0;keys={};roofs=[{x:-100,w:Math.max(W*.7,420),y:H*.72}];player={x:Math.min(W*.22,220),y:H*.72-38,vy:0,on:true,jumps:0,trail:[],grace:.1};while(roofs.at(-1).x<W+400)addRoof();run=true;paused=false;$('#menu').hidden=true;$('#end').hidden=true;$('#pausePanel').hidden=true;$('#shop').hidden=true;$('#hud').hidden=false;$('#touch').hidden=false;last=performance.now();stats()}
function jump(){if(!run||paused)return;if(player.on||player.grace>0)player.jumps=0;if(player.jumps<2){player.vy=-650;player.on=false;player.grace=0;player.jumps++;burst(player.x,player.y+38,'#74f3dc',8)}}
function pause(value=!paused){if(!run)return;paused=value;keys={};$('#pausePanel').hidden=!paused;last=performance.now()}
function finish(reason){if(!run)return;run=false;paused=false;best=Math.max(best,Math.floor(score));save('sBest',best);$('#hud').hidden=true;$('#touch').hidden=true;$('#pausePanel').hidden=true;$('#final').textContent=Math.floor(score);$('#result').textContent=reason+' · '+shards+' coins collected';$('#end').hidden=false;stats()}
function burst(x,y,color,n=15){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*210,vy:(Math.random()-.7)*220,life:.6,color})}
function damage(reason){if(shield>0){shield=0;player.invincible=1.3;burst(player.x,player.y,'#8af5ff',25)}else if(!(player.invincible>0))finish(reason)}
function addRoof(){const prev=roofs.at(-1),gap=85+Math.random()*65,w=180+Math.random()*180;const y=Math.max(H*.45,Math.min(H*.79,prev.y+(Math.random()-.5)*125));roofs.push({x:prev.x+prev.w+gap,w,y,shard:Math.random()<.85,spike:Math.random()<.28,power:Math.random()<.12})}
function spikeHit(r){return r.spike&&player.x+12>r.x+r.w*.65-12&&player.x-12<r.x+r.w*.65+12&&player.y+38>r.y-24&&player.y<r.y}
function update(dt){speed=Math.min(450,speed+dt*1.6);score+=dt*10;stage=1+Math.floor(score/250)%3;player.invincible=Math.max(0,(player.invincible||0)-dt);shield=Math.max(0,shield-dt);const foot=player.y+38;player.grace=player.on?.1:Math.max(0,player.grace-dt);player.vy+=1550*dt;player.y+=player.vy*dt;player.on=false;
for(const r of roofs){r.x-=speed*dt;if(player.x+12>r.x&&player.x-12<r.x+r.w&&player.vy>=0&&foot<=r.y+1&&player.y+38>=r.y){player.y=r.y-38;player.vy=0;player.on=true;player.jumps=0}
const cx=r.x+r.w*.4;if(r.shard&&Math.abs(player.x-cx)<27&&Math.abs(player.y+18-(r.y-26))<36){r.shard=false;shards++;coins++;save('sCoins',coins);burst(cx,r.y-26,'#ffe59a')}
if(r.power&&Math.abs(player.x-(r.x+r.w*.2))<27&&Math.abs(player.y+18-(r.y-29))<36){r.power=false;shield=12;burst(player.x,player.y,'#8af5ff')}
if(spikeHit(r))damage('Watch those spikes')}
while(roofs.length>1&&roofs[0].x+roofs[0].w<0)roofs.shift();while(roofs.at(-1).x<W+400)addRoof();
birdTimer+=dt;if(birdTimer>6){birdTimer=0;const target=roofs.find(r=>r.x+r.w>W);if(target&&!target.spike)birds.push({x:W+65,y:target.y-35})}
for(const b of birds){b.x-=(speed+70)*dt;const duck=keys.ArrowDown&&player.on;const top=player.y+(duck?16:-5);if(Math.abs(b.x-player.x)<28&&b.y+8>top&&b.y-8<player.y+38){damage('Duck under the birds');b.x=-100}}
birds=birds.filter(b=>b.x>-80);if(player.y>H+60)finish('The city got you');stats()}
function drawCity(t){const palettes=[['#0a102d','#44416e','#e89d8e'],['#24152e','#924b5e','#f8b46e'],['#081e31','#246071','#90c7b1']];const a=palettes[stage-1],sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,a[0]);sky.addColorStop(.65,a[1]);sky.addColorStop(1,a[2]);g.fillStyle=sky;g.fillRect(0,0,W,H);g.fillStyle='#fff5d9';g.beginPath();g.arc(W*.78,H*.24,42,0,7);g.fill();for(const s of stars){g.globalAlpha=.4+.3*Math.sin(t*.001+s.x);g.fillRect(s.x,s.y,s.r,s.r)}g.globalAlpha=1;
for(let layer=0;layer<3;layer++){const step=95+layer*27;for(let i=-1;i<W/step+2;i++){const x=i*step-(score*(.3+layer*.35))%step,h=65+((i+12)*73+layer*31)%180;g.fillStyle=['#353653','#262c49','#19233d'][layer];g.fillRect(x,H*(.68+layer*.1)-h,step-12,H);g.fillStyle=layer===2?'#edb98755':'#b4ccdd22';for(let yy=H*(.68+layer*.1)-h+15;yy<H;yy+=24)for(let xx=x+12;xx<x+step-18;xx+=22)g.fillRect(xx,yy,5,8)}}}
function render(t,dt){drawCity(t);for(const r of roofs){g.fillStyle='#101a30';g.fillRect(r.x,r.y,r.w,H-r.y);g.fillStyle='#74f3dc';g.fillRect(r.x,r.y,r.w,4);g.fillStyle='#32415c';g.fillRect(r.x,r.y+6,r.w,7);for(let x=r.x+15;x<r.x+r.w-12;x+=30){g.fillStyle='#ffd89855';g.fillRect(x,r.y+30,9,15)}if(r.spike)drawSpike(r,t);if(r.shard){g.fillStyle='#ffe59a';g.beginPath();g.ellipse(r.x+r.w*.4,r.y-26+Math.sin(t*.004)*3,7,10,0,0,7);g.fill()}if(r.power){g.strokeStyle='#8af5ff';g.lineWidth=3;g.beginPath();g.arc(r.x+r.w*.2,r.y-29,11,0,7);g.stroke()}}
for(const b of birds){g.strokeStyle='#182338';g.lineWidth=6;g.beginPath();g.moveTo(b.x-20,b.y+Math.sin(t*.015)*12);g.lineTo(b.x,b.y);g.lineTo(b.x+20,b.y+Math.sin(t*.015)*12);g.stroke();g.fillStyle='#ffd478';g.fillRect(b.x-5,b.y,5,4)}
if(player){if(shield>0||player.invincible>0){g.strokeStyle='#8af5ff';g.lineWidth=2;g.beginPath();g.arc(player.x,player.y+17,34,0,7);g.stroke()}drawRunner(t)}
for(const q of particles){if(!paused){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt}g.globalAlpha=Math.max(0,q.life/.6);g.fillStyle=q.color;g.fillRect(q.x,q.y,4,4)}g.globalAlpha=1;particles=particles.filter(q=>q.life>0)}
function frame(t){const dt=Math.min(.035,(t-last)/1000||.016);last=t;if(run&&!paused)update(dt);render(paused?0:t,dt);requestAnimationFrame(frame)}
$('#play').onclick=reset;$('#again').onclick=reset;$('#pause').onclick=()=>pause();$('#resume').onclick=()=>pause(false);$('#home').onclick=()=>{$('#end').hidden=true;$('#menu').hidden=false};
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown'].includes(e.code)&&run)e.preventDefault();if(e.repeat)return;keys[e.code]=true;if(['Space','ArrowUp','KeyW'].includes(e.code))jump();if(['Escape','KeyP'].includes(e.code))pause()});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true)});c.addEventListener('pointerdown',jump);$('#jump').onpointerdown=e=>{e.preventDefault();jump()};$('#duck').onpointerdown=e=>{e.preventDefault();keys.ArrowDown=true;e.target.setPointerCapture(e.pointerId)};for(const event of ['pointerup','pointercancel','lostpointercapture'])$('#duck').addEventListener(event,()=>keys.ArrowDown=false);
function shop(){ $('#shop').hidden=false;$('#skins').innerHTML=['Classic','Sunset','Mint'].map(n=>'<button data-skin="'+n+'">'+n+' <small>'+(skin===n?'Equipped':owned.includes(n)?'Equip':'20 coins')+'</small></button>').join('');for(const b of $('#skins').querySelectorAll('button'))b.onclick=()=>{const n=b.dataset.skin;if(!owned.includes(n)){if(coins<20){$('#shopMessage').textContent='Collect '+(20-coins)+' more coins to unlock this skin.';return}coins-=20;owned.push(n)}skin=n;document.body.dataset.skin=n;save('sSkin',skin);save('sCoins',coins);save('sOwned',JSON.stringify(owned));$('#shopMessage').textContent=n+' equipped';stats();shop()}}
$('#shopOpen').onclick=shop;$('#shopClose').onclick=()=>$('#shop').hidden=true;
roofs=[{x:-100,w:W*.55,y:H*.76},{x:W*.62,w:W*.5,y:H*.68}];stats();requestAnimationFrame(frame);

function drawRunner(t){
  const palettes={Classic:['#7762dc','#b5a4ff','#69ffe0'],Sunset:['#c84464','#ff936d','#ffe19a'],Mint:['#168b86','#6de5c5','#d6fff1']};
  const colors=palettes[document.body.dataset.skin||localStorage.sSkin]||palettes.Classic;
  const stride=player.on?Math.sin(t*.022):.65;
  const bob=player.on?Math.abs(Math.sin(t*.022))*1.2:0;
  const duck=keys.ArrowDown&&player.on;
  g.save();g.translate(player.x,player.y+bob+(duck?13:0));if(duck)g.scale(1,.66);
  function rect(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h)}
  function limb(points,color,width){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.stroke()}
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

function assignTrap(r){
  if(score<500||Math.random()>.45)return;
  const types=score>=1000?['electric','vent','crumble','laser']:['electric','vent','crumble'];
  r.trap=types[Math.floor(Math.random()*types.length)];
  r.spike=false;r.trapClock=0;r.crumbleTime=null;
}
function trapPhase(r){
  // All timed traps start with a warning when they enter the screen.
  const phase=(r.trapClock||0)%2.8;
  return phase<1?'warning':phase<1.8?'active':'safe';
}
function advanceTrap(r,dt){
  if(!r.trap)return;
  if(r.x<W)r.trapClock+=dt;
  if(r.crumbleTime!==null&&r.crumbleTime!==undefined){
    r.crumbleTime+=dt;
    if(r.crumbleTime>=.7&&!r.collapsed){
      r.collapsed=true;r.shard=false;r.power=false;r.magnet=false;
      burst(r.x+r.w/2,r.y,'#e3b888',20);
    }
  }
  if(r.collapsed)r.y+=420*dt;
}
function touchTrap(r){
  if(r.trap==='crumble'&&r.crumbleTime===null&&player.x+12>r.x&&player.x-12<r.x+r.w)r.crumbleTime=0;
}
function trapBounds(r){
  const center=r.x+r.w*.6;
  if(r.trap==='electric')return {x:center-34,y:r.y-5,w:68,h:6};
  if(r.trap==='vent')return {x:center-15+Math.sin((r.trapClock||0)*2)*22,y:r.y-62,w:30,h:62};
  return {x:center-5,y:r.y-100,w:10,h:100};
}
function checkTrap(r){
  if(!r.trap||r.trap==='crumble'||r.collapsed||trapPhase(r)!=='active')return;
  const b=trapBounds(r),top=player.y+(keys.ArrowDown&&player.on?16:0);
  if(player.x+12>b.x&&player.x-12<b.x+b.w&&player.y+38>b.y&&top<b.y+b.h)
    damage({electric:'Jump over the electric floor',vent:'Watch the steam vents',laser:'Time your jump past the laser gate'}[r.trap]);
}
function drawTrap(r){
  if(!r.trap||r.collapsed)return;
  g.save();
  const phase=trapPhase(r),active=phase==='active',warning=phase==='warning';
  const color=active?'#ff6578':warning?'#ffe09a':'#70869f';
  if(r.trap==='crumble'){
    g.strokeStyle=r.crumbleTime===null?'#d6aa7b':'#ff936d';g.lineWidth=2;
    for(let x=r.x+20;x<r.x+r.w;x+=45){g.beginPath();g.moveTo(x,r.y);g.lineTo(x+9,r.y+9);g.lineTo(x+3,r.y+16);g.stroke()}
    if(r.crumbleTime!==null){g.fillStyle='#ff936d';g.fillRect(r.x,r.y,r.w*Math.max(0,1-r.crumbleTime/.7),4)}
  }else{
    const b=trapBounds(r);
    g.fillStyle='#23334d';g.fillRect(b.x-4,r.y-4,b.w+8,8);
    g.fillStyle=color;g.fillRect(b.x,r.y-4,b.w,3);
    if(r.trap==='electric'){
      g.strokeStyle=color;g.lineWidth=active?3:1;g.beginPath();
      for(let i=0;i<=8;i++){const x=b.x+i*b.w/8,y=r.y-(i%2?(active?10:4):2);if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke();
    }else if(r.trap==='vent'){
      g.fillStyle='#91a4be';for(let i=0;i<3;i++)g.fillRect(b.x+4+i*8,r.y-7,3,6);
      if(active||warning){g.fillStyle=active?'#e5f5ffaa':'#ffe09a55';for(let i=0;i<4;i++){g.beginPath();g.ellipse(b.x+b.w/2+Math.sin(r.trapClock*12+i)*3,r.y-12-i*(active?13:3),9+i*2,7,0,0,Math.PI*2);g.fill()}}
    }else{
      g.fillStyle='#8195b2';g.fillRect(b.x-7,b.y-5,24,7);
      g.strokeStyle=color;g.lineWidth=active?5:1;g.setLineDash(active?[]:[4,7]);
      g.beginPath();g.moveTo(b.x+5,b.y);g.lineTo(b.x+5,r.y);g.stroke();g.setLineDash([]);
    }
  }
  g.font='9px monospace';g.textAlign='center';g.fillStyle=r.trap==='crumble'?'#ffc694':color;
  const label=r.trap==='crumble'?'CRUMBLING':r.trap==='vent'?'STEAM':r.trap==='electric'?'ELECTRIC':'LASER';
  g.fillText(label+(r.trap==='crumble'?'':active?' · ON':warning?' · !':' · OFF'),r.x+r.w*.6,r.y-(r.trap==='laser'?112:r.trap==='vent'?74:22));
  g.restore();
}

const cvs=document.getElementById("game"),ctx=cvs.getContext("2d");
let W=innerWidth,H=innerHeight,D=devicePixelRatio||1,playing=false,paused=false,last=0,t=0,keys={};
const TILE=32, MAP_W=220, MAP_H=70, WORLD_W=MAP_W*TILE, WORLD_H=MAP_H*TILE;
const tiles=Array.from({length:MAP_H},()=>Array(MAP_W).fill(0));
const surface=[];
const cam={x:0,y:0};
const particles=[];
const drops=[];
const enemies=[];
const checkpoints=[{x:20*TILE,y:0},{x:112*TILE,y:0},{x:177*TILE,y:0}];
const players={
  L:{x:12*TILE,y:34*TILE,vx:0,vy:0,w:22,h:30,hp:100,max:100,color:"#55b9ff",accent:"#b7ebff",ground:false,atk:0,cool:0,dir:1},
  M:{x:15*TILE,y:34*TILE,vx:0,vy:0,w:22,h:30,hp:100,max:100,color:"#ff6d9b",accent:"#ffd2df",ground:false,atk:0,cool:0,dir:1}
};
let gems=0,coins=0,quest=0,worldSeed=42,boss=null,night=0,loaded=false;
const quests=["Raggiungete il Bosco di Smeraldo","Trovate 3 Gemme Lunari","Aprite il Tempio Antico","Sconfiggete il Guardiano","Riaccendete il Cuore di Lunaria"];
const keysMap={a:0,d:0,w:0,ArrowLeft:0,ArrowRight:0,ArrowUp:0,j:0,k:0};

function resize(){D=devicePixelRatio||1;W=innerWidth;H=innerHeight;cvs.width=W*D;cvs.height=H*D;ctx.setTransform(D,0,0,D,0,0)}resize();addEventListener("resize",resize);
addEventListener("keydown",e=>{keysMap[e.key]=1;if(["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key))e.preventDefault();if(e.key.toLowerCase()==="p")togglePause();});
addEventListener("keyup",e=>keysMap[e.key]=0);
function toast(s){const el=document.getElementById("toast");el.textContent=s;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),1600)}
function solid(tx,ty){return tx<0||tx>=MAP_W||ty>=MAP_H||tiles[ty]?.[tx]===1}
function rectHit(x,y,w,h){const l=Math.floor(x/TILE),r=Math.floor((x+w)/TILE),top=Math.floor(y/TILE),bot=Math.floor((y+h)/TILE);for(let yy=top;yy<=bot;yy++)for(let xx=l;xx<=r;xx++)if(solid(xx,yy))return true;return false}
function makeWorld(){
  // grass surface with gentle hills
  let h=34;
  for(let x=0;x<MAP_W;x++){
    h += ((x*31)%7-3)*.05;
    if(x%17===0)h += (x%34===0?1:-1);
    h=Math.max(27,Math.min(38,Math.round(h)));
    surface[x]=h;
    for(let y=h;y<MAP_H;y++)tiles[y][x]=1;
  }
  // underground pockets and platforms to create a "Terraria-like" exploratory silhouette
  for(let x=12;x<MAP_W-12;x+=10+((x*7)%8)){
    if(x%3!==0){
      const top=surface[x]+4+(x%5);
      const len=4+(x%5);
      for(let y=top;y<Math.min(top+len,MAP_H-2);y++) for(let xx=x;xx<Math.min(x+6,MAP_W);xx++) tiles[y][xx]=0;
    }
  }
  // cave shafts
  [[48,39,12,11],[89,41,9,14],[129,38,13,13],[160,42,16,12],[198,40,12,15]].forEach(c=>{
    const [sx,sy,w,h]=c;for(let y=sy;y<Math.min(sy+h,MAP_H-2);y++)for(let x=sx;x<sx+w;x++)tiles[y][x]=0;
  });
  // floating islands/platforms
  [[35,25,9],[66,20,12],[103,24,10],[145,21,15],[183,25,10]].forEach(a=>{
    const [x,y,w]=a;for(let xx=x;xx<x+w;xx++)for(let yy=y;yy<y+2;yy++)tiles[yy][xx]=1;
  });
  // clear spawn area
  for(let y=28;y<38;y++)for(let x=5;x<24;x++)tiles[y][x]=0;
  spawnContent();
}
function spawnContent(){
  const gemXs=[57,109,153];
  gemXs.forEach((x,i)=>drops.push({x:x*TILE,y:(surface[x]-2)*TILE,type:"gem",got:false}));
  [38,81,128,175,205].forEach(x=>drops.push({x:x*TILE,y:(surface[x]-2)*TILE,type:"coin",got:false}));
  for(let i=0;i<28;i++){
    const x=27+i*7+(i%3);const y=(surface[Math.min(MAP_W-1,x)]-1)*TILE;
    enemies.push({x,y,w:25,h:24,vx:(i%2?20:-20),vy:0,hp:45,max:45,type:i%3?"slime":"bat",cool:Math.random(),dead:false,dir:i%2?1:-1});
  }
}
function drawPixelRect(x,y,w,h,color,ox=0){ctx.fillStyle=color;ctx.fillRect(Math.floor(x-ox),Math.floor(y),Math.ceil(w),Math.ceil(h))}
function cameraFor(){
  const cx=(players.L.x+players.M.x)/2, cy=Math.min(players.L.y,players.M.y);
  cam.x=Math.max(0,Math.min(WORLD_W-W,cx-W/2));cam.y=Math.max(0,Math.min(WORLD_H-H,cy-H*.58));
}
function playerUpdate(p,keyL,keyR,keyJ,dt){
  const left=keysMap[keyL],right=keysMap[keyR],jump=keysMap[keyJ];
  const accel=0.9, max=4.2;
  if(left){p.vx=Math.max(p.vx-max,-max);p.dir=-1} else if(right){p.vx=Math.min(p.vx+max,max);p.dir=1} else p.vx*=.78;
  if(jump&&p.ground){p.vy=-10.5;p.ground=false}
  p.vy+=.55;
  let nx=p.x+p.vx*5.0, ny=p.y+p.vy*2.6;
  if(!rectHit(nx,p.y,p.w,p.h))p.x=nx; else p.vx=0;
  if(!rectHit(p.x,ny,p.w,p.h)){p.y=ny;p.ground=false}else{if(p.vy>0)p.ground=true;p.vy=0}
  p.x=Math.max(52,Math.min(WORLD_W-p.w-52,p.x));
}
function attack(p){
  if(p.atk>0||p.cool>0)return;p.atk=.18;p.cool=.36;
  for(const e of enemies){if(e.dead)continue;const reach=55,dx=e.x-p.x;if(Math.abs(dx)<reach&&Math.abs(e.y-p.y)<48&&(dx*p.dir)>=0){e.hp-=30;spawnHit(e.x,e.y,"#fff0a0");if(e.hp<=0){e.dead=true;coins+=3;spawnDrop(e.x,e.y);}}}
  if(boss&&Math.abs(boss.x-p.x)<80&&Math.abs(boss.y-p.y)<70&&p.dir*((boss.x-p.x))>=0){boss.hp-=24;spawnHit(boss.x,boss.y,"#ffb7dc")}
}
function spawnHit(x,y,color){for(let i=0;i<8;i++)particles.push({x,y,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:.4,c:color})}
function spawnDrop(x,y){if(Math.random()<.2)drops.push({x,y,type:"coin",got:false})}
function updateDrops(){
  for(const d of drops){if(d.got)continue;const near=[players.L,players.M].some(p=>Math.abs(p.x-d.x)<24&&Math.abs(p.y-d.y)<35);if(near){d.got=true;if(d.type==="gem"){gems++;quest=Math.min(2,Math.max(quest,gems>=3?2:1));toast("💎 Gemma Lunare raccolta!")}else coins+=1}}
}
function enemyUpdate(dt){
  for(const e of enemies){if(e.dead)continue;
    const target=Math.abs(players.L.x-e.x)<Math.abs(players.M.x-e.x)?players.L:players.M;
    const dx=target.x-e.x;
    if(Math.abs(dx)<280)e.vx+=(dx>0?.08:-.08);else e.vx*=.96;
    e.vx=Math.max(-1.4,Math.min(1.4,e.vx));
    e.vy+=.5;
    let nx=e.x+e.vx*3,ny=e.y+e.vy*2.5;
    if(!rectHit(nx,e.y,e.w,e.h))e.x=nx;else e.vx*=-.6;
    if(!rectHit(e.x,ny,e.w,e.h))e.y=ny;else e.vy=0;
    e.cool-=dt;
    const p=[players.L,players.M].find(p=>Math.abs(p.x-e.x)<28&&Math.abs(p.y-e.y)<36);
    if(p&&e.cool<=0){p.hp=Math.max(0,p.hp-8);e.cool=.9;toast("💥 Colpiti!")}
  }
}
function checkQuest(){
  if(quest===0 && Math.max(players.L.x,players.M.x)>40*TILE){quest=1;toast("🌲 Il Bosco di Smeraldo è davanti a voi!")}
  if(quest===1&&gems>=3){quest=2;toast("🗝️ Le tre gemme reagiscono al Tempio Antico!")}
  if(quest===2&&Math.max(players.L.x,players.M.x)>165*TILE){quest=3;boss={x:184*TILE,y:(surface[184]-5)*TILE-80,w:70,h:70,hp:720,max:720,dir:-1,vx:0,vy:0,cool:0,dead:false};toast("🌙 Un Guardiano è comparso!")}
  if(quest===3&&boss&&boss.dead){quest=4;toast("❤️ Il Cuore della Luna vi sta aspettando!")}
  if(quest===4&&Math.max(players.L.x,players.M.x)>207*TILE){win()}
}
function bossUpdate(dt){
  if(!boss||boss.dead)return;
  boss.cool-=dt;const target=Math.abs(players.L.x-boss.x)<Math.abs(players.M.x-boss.x)?players.L:players.M;
  const dx=target.x-boss.x;
  boss.vx+=(dx>0?.04:-.04);boss.vx=Math.max(-1.6,Math.min(1.6,boss.vx));boss.vy+=.45;
  let nx=boss.x+boss.vx*2.6,ny=boss.y+boss.vy*2.4;
  if(!rectHit(nx,boss.y,boss.w,boss.h))boss.x=nx;else boss.vx*=-.7;
  if(!rectHit(boss.x,ny,boss.w,boss.h))boss.y=ny;else boss.vy=0;
  if(boss.cool<=0){[players.L,players.M].forEach(p=>{if(Math.abs(p.x-boss.x)<75&&Math.abs(p.y-boss.y)<65)p.hp=Math.max(0,p.hp-14)});boss.cool=1}
}
function particlesUpdate(dt){for(const p of particles){p.x+=p.vx*30*dt;p.y+=p.vy*30*dt;p.vy+=.15;p.life-=dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1)}
function save(){
 localStorage.setItem("lunariaPixel",JSON.stringify({L:players.L,M:players.M,gems,coins,quest,seed:worldSeed,boss:boss?{...boss}:null,drops:drops.map(d=>({x:d.x,y:d.y,type:d.type,got:d.got}))}));
 toast("💾 Partita salvata");
}
function load(){
 const s=localStorage.getItem("lunariaPixel");if(!s)return false;try{const o=JSON.parse(s);Object.assign(players.L,o.L);Object.assign(players.M,o.M);gems=o.gems||0;coins=o.coins||0;quest=o.quest||0; if(Array.isArray(o.drops)){drops.length=0;o.drops.forEach(d=>drops.push(d));} boss=o.boss||null;updateHUD();return true}catch(e){return false}
}
function updateHUD(){
 document.getElementById("hpL").textContent="♥".repeat(Math.max(0,Math.ceil(players.L.hp/20)))+"♡".repeat(5-Math.max(0,Math.ceil(players.L.hp/20)));
 document.getElementById("hpM").textContent="♥".repeat(Math.max(0,Math.ceil(players.M.hp/20)))+"♡".repeat(5-Math.max(0,Math.ceil(players.M.hp/20)));
 document.getElementById("hpBarL").style.width=Math.max(0,players.L.hp)+"%";
 document.getElementById("hpBarM").style.width=Math.max(0,players.M.hp)+"%";
 document.getElementById("quest").textContent=quests[Math.min(quest,quests.length-1)];
 document.getElementById("gems").textContent=gems;
 document.getElementById("coins").textContent=coins;
}
function win(){playing=false;document.getElementById("winBox").classList.remove("hidden");save()}
function start(){document.getElementById("menu").classList.add("hidden");document.getElementById("hud").classList.remove("hidden");document.getElementById("touch").classList.remove("hidden");playing=true;paused=false;updateHUD()}
function togglePause(){if(!playing)return;paused=!paused;document.getElementById("pauseBox").classList.toggle("hidden",!paused)}
function drawBackground(){
  ctx.fillStyle="#73c7ef";ctx.fillRect(0,0,W,H);
  // parallax hills
  for(let layer=0;layer<3;layer++){const px=cam.x*(.15+layer*.12),base=H*.52+layer*70;ctx.fillStyle=["#8fcf8b","#62ae78","#47835f"][layer];ctx.beginPath();ctx.moveTo(0,H);for(let x=-40;x<W+80;x+=80){let y=base-Math.sin((x+px)/170)*28-Math.sin((x+px)/53)*8;ctx.lineTo(x,y)}ctx.lineTo(W,H);ctx.fill()}
}
function drawWorld(){
  const sx=Math.floor(cam.x/TILE)-2,ex=Math.ceil((cam.x+W)/TILE)+2,sy=Math.floor(cam.y/TILE)-2,ey=Math.ceil((cam.y+H)/TILE)+2;
  for(let y=sy;y<=ey;y++)for(let x=sx;x<=ex;x++){if(y<0||x<0||x>=MAP_W||y>=MAP_H)continue;let v=tiles[y][x];if(v!==1)continue;let px=x*TILE,py=y*TILE;
    let top=y===0||!tiles[y-1][x];ctx.fillStyle=top?"#6b4b38":"#77563f";ctx.fillRect(px,py,TILE,TILE);
    if(top){ctx.fillStyle="#53b34d";ctx.fillRect(px,py,TILE,7);ctx.fillStyle="#7bd85b";for(let i=0;i<4;i++)ctx.fillRect(px+4+i*8,py+2,3,3)}
    ctx.fillStyle="#0002";ctx.fillRect(px+TILE-3,py,3,TILE);
  }
  // ore sparkle in underground
  for(let i=0;i<90;i++){let tx=(i*37)%MAP_W,ty=42+(i*17)%22;if(tiles[ty][tx]){ctx.fillStyle=i%2?"#6e75d8":"#57d4bb";ctx.fillRect(tx*TILE+9,ty*TILE+9,4,4)}}
}
function drawObjects(){
  for(const d of drops)if(!d.got){ctx.save();ctx.translate(d.x,d.y+Math.sin(t*2+d.x)*4);ctx.font=d.type==="gem"?"24px system-ui":"18px system-ui";ctx.textAlign="center";ctx.fillText(d.type==="gem"?"💎":"🪙",0,0);ctx.restore()}
  for(const e of enemies)if(!e.dead)drawEnemy(e);
  for(const p of particles)drawParticle(p);
  if(boss&&!boss.dead)drawBoss();
  drawPlayer(players.L,false);drawPlayer(players.M,true);
}
function drawPlayer(p,pink){
  const x=p.x,y=p.y;ctx.save();ctx.translate(x,y);
  ctx.fillStyle="#0004";ctx.fillRect(-13,24,26,6);
  // pixel body
  ctx.fillStyle=p.color;ctx.fillRect(-10,-2,20,26);ctx.fillStyle=p.accent;ctx.fillRect(-10,-20,20,18);ctx.fillStyle="#1b223b";ctx.fillRect(-7,-14,4,4);ctx.fillRect(3,-14,4,4);
  ctx.fillStyle="#fff";ctx.fillRect(-9,-20,18,3);ctx.fillStyle=pink?"#e94779":"#2383c7";ctx.fillRect(-12,22,8,5);ctx.fillRect(4,22,8,5);
  if(p.atk>0){ctx.fillStyle="#fff6b0";ctx.fillRect(p.dir>0?15:-24,-4,18,5)}
  ctx.restore();
}
function drawEnemy(e){
  const x=e.x,y=e.y;ctx.save();ctx.translate(x,y);
  if(e.type==="slime"){ctx.fillStyle="#69d27e";ctx.fillRect(-13,-4,26,24);ctx.fillStyle="#fff";ctx.fillRect(-8,2,4,4);ctx.fillRect(4,2,4,4)}
  else{ctx.fillStyle="#9b79ff";ctx.beginPath();ctx.moveTo(-18,10);ctx.lineTo(-8,-16);ctx.lineTo(0,-4);ctx.lineTo(8,-16);ctx.lineTo(18,10);ctx.closePath();ctx.fill();ctx.fillStyle="#fff";ctx.fillRect(-8,0,4,4);ctx.fillRect(4,0,4,4)}
  ctx.fillStyle="#11182e";ctx.fillRect(-16,-28,32,4);ctx.fillStyle="#ff6f88";ctx.fillRect(-16,-28,32*Math.max(0,e.hp/e.max),4);ctx.restore()
}
function drawBoss(){ctx.save();ctx.translate(boss.x,boss.y);ctx.fillStyle="#7761d8";ctx.fillRect(-36,-28,72,65);ctx.fillStyle="#cfc4ff";ctx.fillRect(-26,-46,52,17);ctx.fillStyle="#1b2040";ctx.fillRect(-20,-40,8,7);ctx.fillRect(12,-40,8,7);ctx.strokeStyle="#ffe6a0";ctx.lineWidth=5;ctx.strokeRect(-49,-56,98,84);ctx.fillStyle="#11182e";ctx.fillRect(-70,-70,140,7);ctx.fillStyle="#ff6d91";ctx.fillRect(-70,-70,140*(boss.hp/boss.max),7);ctx.font="900 11px system-ui";ctx.fillStyle="#fff";ctx.textAlign="center";ctx.fillText("GUARDIANO DEL BOSCO",0,-83);ctx.restore()}
function drawParticle(p){ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,4,4)}
function saveLandscape(){ctx.save()}
function draw(){
  drawBackground();ctx.save();ctx.translate(-cam.x,-cam.y);drawWorld();drawObjects();ctx.restore();
  let q=(Math.sin(t*.18)+1)/2*.28;ctx.fillStyle=`rgba(24,26,67,${q})`;ctx.fillRect(0,0,W,H);
  // moon / sun
  ctx.fillStyle=q>.15?"#f3f1c8":"#fff3a5";ctx.beginPath();ctx.arc(W*.82,H*.17,18,0,7);ctx.fill();
}
function tick(ms){const dt=Math.min(.033,(ms-last)/1000||0);last=ms;t+=dt;if(playing&&!paused){playerUpdate(players.L,"a","d","w",dt);playerUpdate(players.M,"ArrowLeft","ArrowRight","ArrowUp",dt);if(keysMap.j)attack(players.L);if(keysMap.k)attack(players.M);enemyUpdate(dt);bossUpdate(dt);updateDrops();particlesUpdate(dt);checkQuest();cameraFor();updateHUD();}draw();requestAnimationFrame(tick)}
function cameraFor(){const cx=(players.L.x+players.M.x)/2,cy=(players.L.y+players.M.y)/2;cam.x=Math.max(0,Math.min(WORLD_W-W,cx-W/2));cam.y=Math.max(0,Math.min(WORLD_H-H,cy-H*.56))}
function makeTouch(){
 document.querySelectorAll("[data-k]").forEach(b=>{let k=b.dataset.k;b.addEventListener("touchstart",e=>{e.preventDefault();keysMap[k]=1},{passive:false});b.addEventListener("touchend",e=>{e.preventDefault();keysMap[k]=0},{passive:false});b.addEventListener("touchcancel",e=>{keysMap[k]=0});});
 document.querySelectorAll("[data-a]").forEach(b=>b.addEventListener("touchstart",e=>{e.preventDefault();const a=b.dataset.a;if(a==="attackL")attack(players.L);if(a==="attackM")attack(players.M);if(a==="jump"){keysMap.w=1;setTimeout(()=>keysMap.w=0,120)}},{passive:false}));
}
document.getElementById("play").onclick=()=>{localStorage.removeItem("lunariaPixel");makeWorld();start()};
document.getElementById("pause").onclick=togglePause;
document.getElementById("resume").onclick=togglePause;
document.getElementById("save").onclick=save;
document.getElementById("home").onclick=()=>location.reload();
document.getElementById("again").onclick=()=>location.reload();
makeWorld();makeTouch();updateHUD();requestAnimationFrame(tick);

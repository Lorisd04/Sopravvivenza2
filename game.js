const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,dpr=1,last=0,running=false,paused=false,keys={},mouse={x:0,y:0,down:false};
const world={w:3600,h:2500};
const zones=[
 {name:"Aurora",x:80,y:80,w:900,h:720,color:"#31574e",accent:"#73d6b1"},
 {name:"Foresta di Smeraldo",x:900,y:80,w:1100,h:820,color:"#23493e",accent:"#65c88c"},
 {name:"Costa delle Stelle",x:2000,y:80,w:1520,h:720,color:"#26465a",accent:"#70c9e8"},
 {name:"Deserto Rosso",x:80,y:800,w:1000,h:1580,color:"#604c3d",accent:"#efb66d"},
 {name:"Rovine Lunari",x:1080,y:900,w:1160,h:1490,color:"#3b3d56",accent:"#a79bf2"},
 {name:"Valle dei Cuori",x:2240,y:800,w:1280,h:1580,color:"#4a3c52",accent:"#ee8db3"}
];
const walls=[
{x:0,y:0,w:3600,h:50},{x:0,y:2450,w:3600,h:50},{x:0,y:0,w:50,h:2500},{x:3550,y:0,w:50,h:2500},
{x:450,y:210,w:80,h:330},{x:450,y:210,w:420,h:80},{x:790,y:210,w:80,h:390},
{x:180,y:570,w:80,h:250},{x:180,y:740,w:540,h:80},{x:650,y:610,w:70,h:210},
{x:1040,y:170,w:70,h:430},{x:1040,y:530,w:420,h:70},{x:1390,y:220,w:70,h:380},
{x:1590,y:130,w:80,h:360},{x:1590,y:420,w:390,h:70},{x:1870,y:160,w:70,h:330},
{x:2200,y:120,w:80,h:280},{x:2200,y:330,w:500,h:70},{x:2620,y:180,w:80,h:220},
{x:2940,y:110,w:80,h:370},{x:2940,y:410,w:430,h:70},{x:3310,y:210,w:70,h:270},
{x:280,y:1030,w:80,h:480},{x:280,y:1430,w:460,h:80},{x:660,y:1200,w:80,h:310},
{x:760,y:930,w:80,h:300},{x:760,y:930,w:300,h:80},
{x:1190,y:1040,w:80,h:500},{x:1190,y:1470,w:500,h:70},{x:1610,y:1180,w:80,h:360},
{x:1740,y:940,w:70,h:350},{x:1740,y:940,w:420,h:70},{x:2090,y:1080,w:70,h:350},
{x:2450,y:930,w:80,h:420},{x:2450,y:1280,w:420,h:70},{x:2800,y:1030,w:70,h:320},
{x:3020,y:1450,w:80,h:430},{x:3020,y:1810,w:420,h:70},{x:3370,y:1580,w:70,h:300},
{x:2380,y:1830,w:70,h:350},{x:2380,y:2110,w:500,h:70},{x:2800,y:1940,w:70,h:240}
];
const props=[];
function addProp(x,y,type,size=1){props.push({x,y,type,size})}
for(let i=0;i<85;i++){let x=90+((i*347)%3380),y=90+((i*193)%2260);if(!nearWall(x,y,45))addProp(x,y,i%5===0?"rock":"tree",.7+(i%4)*.12)}
for(let i=0;i<22;i++){let x=110+((i*613)%3300),y=120+((i*271)%2200);addProp(x,y,"flower",.8)}
const npcs=[
{x:360,y:390,name:"Nonna Ada",color:"#ffd27d",icon:"✦",text:["Benvenuti ad Aurora, Loris e Marisa.","La Luna Nera ha rubato il Cuore di Lunaria.","Tre Guardiani proteggono i frammenti. Se li sconfiggete, il Cuore si risveglierà."],quest:"Parla con il Guardiano della Foresta."},
{x:1210,y:410,name:"Guardiano Elio",color:"#78e0c2",icon:"◆",text:["La foresta ricorda ogni passo.","Solo chi raccoglie tre Gemme Verdi può attraversare il sigillo.","Portatemi le gemme e aprirò il sentiero."],quest:"Raccogli 3 Gemme Verdi."},
{x:1750,y:1510,name:"Maga Selene",color:"#c6a2ff",icon:"☾",text:["La magia della Luna può proteggervi.","Trova la Chiave Lunare nelle rovine.","Poi il Guardiano potrà essere affrontato."],quest:"Trova la Chiave Lunare."},
{x:3020,y:1750,name:"Capitano Rio",color:"#78c8ff",icon:"⚓",text:["Il mare nasconde tesori... e pericoli.","Ho visto una porta antica nella Valle dei Cuori.","Quando sarete pronti, apritela."],quest:"Raggiungi la Porta del Cuore."}
];
const enemies=[];
function addEnemy(x,y,type="slime"){enemies.push({x,y,type,r:type==="wisp"?19:22,hp:type==="wisp"?55:75,max:type==="wisp"?55:75,spd:type==="wisp"?80:58,hit:0,dead:false,phase:Math.random()*6})}
[[730,350,"slime"],[870,520,"slime"],[1130,760,"wisp"],[1480,700,"slime"],[1840,600,"wisp"],[2320,480,"slime"],[2740,520,"wisp"],[3210,540,"slime"],[540,1180,"slime"],[890,1480,"wisp"],[1390,1330,"slime"],[2000,1850,"wisp"],[2500,1600,"slime"],[3100,1100,"wisp"],[3310,2150,"slime"],[2730,2180,"slime"]].forEach(e=>addEnemy(...e));
const items=[
{x:670,y:310,id:"gem1",type:"gem",label:"Gemme Verde",icon:"💚",taken:false},{x:1340,y:740,id:"gem2",type:"gem",label:"Gemme Verde",icon:"💚",taken:false},
{x:1630,y:1180,id:"gem3",type:"gem",label:"Gemme Verde",icon:"💚",taken:false},{x:1940,y:1780,id:"key",type:"key",label:"Chiave Lunare",icon:"🗝️",taken:false},
{x:2550,y:580,id:"coin1",type:"coin",label:"Moneta d'Oro",icon:"✦",taken:false},{x:3150,y:1320,id:"coin2",type:"coin",label:"Moneta d'Oro",icon:"✦",taken:false},
{x:3340,y:2050,id:"potion1",type:"potion",label:"Pozione",icon:"🧪",taken:false}
];
const player={x:300,y:380,r:22,speed:240,hp:100,maxHp:100,stamina:100,coins:0,xp:0,level:1,attack:0,invuln:0,dash:0,dirX:1,dirY:0};
const partner={x:350,y:440,r:20,speed:225,hp:100,maxHp:100,phase:0};
let inventory=[],questStage=0,interactCooldown=0,gameTime=0,kills=0;
const questList=["Esplora il Villaggio di Aurora","Parla con il Guardiano della Foresta","Raccogli 3 Gemme Verdi","Trova la Chiave Lunare","Raggiungi la Porta del Cuore","Sconfiggi il Guardiano della Luna","Risveglia il Cuore di Lunaria"];
let boss={x:3200,y:2000,r:55,hp:850,maxHp:850,active:false,dead:false,attack:0};

function resize(){dpr=devicePixelRatio||1;W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener("resize",resize);resize();
function nearWall(x,y,r){return walls.some(w=>x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function collides(x,y,r){return x-r<50||x+r>3550||y-r<50||y+r>2450||walls.some(w=>x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h)}
function moveEntity(e,dx,dy,dt){let nx=e.x+dx*e.speed*dt,ny=e.y+dy*e.speed*dt;if(!collides(nx,e.y,e.r))e.x=nx;if(!collides(e.x,ny,e.r))e.y=ny}
function addItem(item){inventory.push(item.id);if(item.type==="coin")player.coins+=25;else toast(`${item.icon} ${item.label} raccolto!`);if(item.type==="gem"){let n=inventory.filter(i=>i.startsWith("gem")).length;if(n>=3)questStage=3}if(item.type==="key")questStage=4;updateHUD()}
function has(id){return inventory.includes(id)}
function keysDown(){return {x:(keys.d?1:0)-(keys.a?1:0),y:(keys.s?1:0)-(keys.w?1:0)}}
function attack(){if(!running||paused||player.attack>0)return;player.attack=.28;player.invuln=.16;let dx=player.dirX,dy=player.dirY;for(const e of enemies){if(!e.dead&&dist(player,e)<78){let ax=e.x-player.x,ay=e.y-player.y,l=Math.hypot(ax,ay);if((ax/l)*dx+(ay/l)*dy>.05||dist(player,e)<42){e.hp-=38;if(e.hp<=0){e.dead=true;kills++;player.xp+=35;player.coins+=8;toast("Nemico sconfitto! +35 XP");levelCheck()}}}}if(boss.active&&!boss.dead&&dist(player,boss)<110){boss.hp-=32;if(boss.hp<=0){boss.dead=true;questStage=6;toast("🌙 Il Guardiano della Luna è caduto!");}}}
function dash(){if(player.stamina<30||player.dash>0)return;player.stamina-=30;player.dash=.25;player.invuln=.32;let dx=player.dirX,dy=player.dirY;player.x=clamp(player.x+dx*115,70,3530);player.y=clamp(player.y+dy*115,70,2430);if(collides(player.x,player.y,player.r)){player.x-=dx*70;player.y-=dy*70}}
function levelCheck(){let need=100+player.level*80;if(player.xp>=need){player.xp-=need;player.level++;player.maxHp+=12;player.hp=player.maxHp;toast(`✨ Livello ${player.level}! Vita massima aumentata.`)}}
function update(dt){
gameTime+=dt;interactCooldown=Math.max(0,interactCooldown-dt);player.attack=Math.max(0,player.attack-dt);player.invuln=Math.max(0,player.invuln-dt);player.dash=Math.max(0,player.dash-dt);player.stamina=clamp(player.stamina+25*dt,0,100);
let m=keysDown();if(m.x||m.y){let l=Math.hypot(m.x,m.y);m.x/=l;m.y/=l;player.dirX=m.x;player.dirY=m.y;moveEntity(player,m.x,m.y,dt)}
// partner follows Loris smoothly
let pd=dist(partner,player);if(pd>95){let dx=(player.x-partner.x)/pd,dy=(player.y-partner.y)/pd;moveEntity(partner,dx,dy,dt)}
for(const e of enemies){if(e.dead)continue;e.hit=Math.max(0,e.hit-dt);let d=dist(e,player);if(d<340){let dx=(player.x-e.x)/d,dy=(player.y-e.y)/d;if(d>58)moveEntity(e,dx,dy,dt);if(d<52&&e.hit<=0&&player.invuln<=0){player.hp-=e.type==="wisp"?10:7;e.hit=.9;toast("💥 Hai subito un colpo!");if(player.hp<=0)respawn()}}}
if(boss.active&&!boss.dead){boss.attack=Math.max(0,boss.attack-dt);let d=dist(boss,player);if(d>100){let dx=(player.x-boss.x)/d,dy=(player.y-boss.y)/d;moveEntity(boss,dx,dy,dt)}if(d<110&&boss.attack<=0&&player.invuln<=0){player.hp-=18;boss.attack=1.2;toast("🌙 Il Guardiano ti ha colpito!");if(player.hp<=0)respawn()}}
for(const it of items)if(!it.taken&&dist(player,it)<42){it.taken=true;addItem(it)}
if(questStage===0&&dist(player,{x:360,y:390})<100)questStage=1;
if(questStage===1&&has("gem1"))questStage=2;
if(questStage===4&&dist(player,{x:3070,y:1880})<100){questStage=5;boss.active=true;toast("🌙 Il Guardiano della Luna si è risvegliato!");}
if(questStage===5&&boss.dead)questStage=6;
if(questStage===6&&dist(player,{x:3370,y:2200})<130){questStage=7;win()}
updateHUD();
}
function respawn(){player.hp=player.maxHp;player.x=300;player.y=380;toast("💫 Siete tornati ad Aurora.");}
function interact(){
if(interactCooldown>0)return;interactCooldown=.4;
let near=npcs.find(n=>dist(player,n)<75);
if(near){openDialogue(near);return}
if(questStage===6&&dist(player,{x:3370,y:2200})<140){questStage=7;win();return}
toast("Non c'è nulla con cui interagire qui.");
}
function openDialogue(n){
paused=true;document.getElementById("dialogue").classList.remove("hidden");document.getElementById("dialogueWho").textContent=n.icon+"  "+n.name.toUpperCase();document.getElementById("dialogueName").textContent=n.name;let i=0;const text=document.getElementById("dialogueText"),next=document.getElementById("nextDialogue"),choices=document.getElementById("choices");choices.innerHTML="";next.textContent="CONTINUA";
function show(){text.textContent=n.text[i]||"";next.textContent=i<n.text.length-1?"CONTINUA":"CHIUDI"}show();next.onclick=()=>{if(i<n.text.length-1){i++;show()}else{document.getElementById("dialogue").classList.add("hidden");paused=false;if(n.quest)toast("📜 "+n.quest)}}}
function updateHUD(){document.getElementById("hp1").textContent=Math.ceil(player.hp);document.getElementById("hp2").textContent=Math.ceil(partner.hp);document.getElementById("hpBar1").style.width=clamp(player.hp/player.maxHp*100,0,100)+"%";document.getElementById("staminaBar").style.width=player.stamina+"%";document.getElementById("coins").textContent=player.coins;document.getElementById("questText").textContent=questList[Math.min(questStage,questList.length-1)]}
let toastTimer;function toast(t){let e=document.getElementById("toast");e.textContent=t;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),1800)}
function save(){localStorage.setItem("lunariaSave",JSON.stringify({player:{x:player.x,y:player.y,hp:player.hp,maxHp:player.maxHp,coins:player.coins,xp:player.xp,level:player.level},inventory,questStage,kills,items:items.map(i=>({id:i.id,taken:i.taken})),enemies:enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,dead:e.dead})),boss:{hp:boss.hp,dead:boss.dead,active:boss.active}}));toast("💾 Avventura salvata!")}
function load(){let s=localStorage.getItem("lunariaSave");if(!s)return false;try{let o=JSON.parse(s);Object.assign(player,o.player);inventory=o.inventory||[];questStage=o.questStage||0;kills=o.kills||0;(o.items||[]).forEach(v=>{let i=items.find(q=>q.id===v.id);if(i)i.taken=v.taken});(o.enemies||[]).forEach((v,i)=>Object.assign(enemies[i],v));Object.assign(boss,o.boss||{});return true}catch{return false}}
function start(){document.getElementById("titleScreen").classList.add("hidden");document.getElementById("hud").classList.remove("hidden");document.getElementById("touchUI").classList.remove("hidden");running=true;paused=false;updateHUD()}
function win(){running=false;document.getElementById("victory").classList.remove("hidden");document.getElementById("endStats").innerHTML=`<div><b>${kills}</b><span>NEMICI</span></div><div><b>${player.level}</b><span>LIVELLO</span></div><div><b>${player.coins}</b><span>MONETE</span></div>`;save()}
document.getElementById("newGame").onclick=()=>{localStorage.removeItem("lunariaSave");start();toast("✨ Nuova avventura iniziata!");};
document.getElementById("continueGame").onclick=()=>{if(load())start();else{toast("Nessun salvataggio trovato: creo una nuova avventura.");setTimeout(start,250)}};
document.getElementById("pauseBtn").onclick=()=>{paused=true;document.getElementById("pauseScreen").classList.remove("hidden")};
document.getElementById("resumeBtn").onclick=()=>{paused=false;document.getElementById("pauseScreen").classList.add("hidden")};
document.getElementById("saveBtn").onclick=save;
document.getElementById("homeBtn").onclick=()=>location.reload();
document.getElementById("endReplay").onclick=()=>location.reload();
document.getElementById("closeInventory").onclick=()=>document.getElementById("inventory").classList.add("hidden");
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key===" "){e.preventDefault();attack()}if(e.key.toLowerCase()==="e")interact();if(e.key.toLowerCase()==="q")dash();if(e.key.toLowerCase()==="i")document.getElementById("inventory").classList.remove("hidden")});
addEventListener("keyup",e=>keys[e.key]=false);
document.querySelectorAll("[data-action]").forEach(b=>{let a=b.dataset.action;b.addEventListener("touchstart",e=>{e.preventDefault();if(a==="attack")attack();if(a==="dash")dash();if(a==="interact")interact()},{passive:false});b.addEventListener("click",()=>{if(a==="attack")attack();if(a==="dash")dash();if(a==="interact")interact()})});
let stick=document.getElementById("moveStick"),stickActive=false;function stickMove(e){if(!stickActive)return;let r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,px=(e.touches?e.touches[0].clientX:e.clientX)-cx,py=(e.touches?e.touches[0].clientY:e.clientY)-cy,l=Math.hypot(px,py),max=48;if(l>max){px*=max/l;py*=max/l}document.querySelector("#moveStick span").style.transform=`translate(${px}px,${py}px)`;keys.w=py<-12;keys.s=py>12;keys.a=px<-12;keys.d=px>12}
stick.addEventListener("touchstart",e=>{stickActive=true;stickMove(e)},{passive:false});stick.addEventListener("touchmove",e=>{e.preventDefault();stickMove(e)},{passive:false});["touchend","touchcancel"].forEach(ev=>stick.addEventListener(ev,()=>{stickActive=false;["w","a","s","d"].forEach(k=>keys[k]=false);document.querySelector("#moveStick span").style.transform=""}));
function draw(){
ctx.clearRect(0,0,W,H);
let camX=clamp(player.x-W/2,0,world.w-W),camY=clamp(player.y-H/2,0,world.h-H);
ctx.save();ctx.translate(-camX,-camY);
for(const z of zones){ctx.fillStyle=z.color;ctx.fillRect(z.x,z.y,z.w,z.h)}
// water edges / paths
ctx.fillStyle="#887a66";ctx.fillRect(50,400,3500,125);ctx.fillRect(1450,50,120,2400);ctx.fillStyle="#9a8b73";ctx.fillRect(50,438,3500,48);ctx.fillRect(1485,50,50,2400);
// decorative zone labels
ctx.font="900 18px system-ui";ctx.textAlign="center";ctx.globalAlpha=.3;for(const z of zones){ctx.fillStyle=z.accent;ctx.fillText(z.name,z.x+z.w/2,z.y+z.h/2)}ctx.globalAlpha=1;
// props
for(const p of props)drawProp(p);
for(const w of walls){ctx.fillStyle="#18232b";ctx.fillRect(w.x,w.y,w.w,w.h);ctx.fillStyle="#31444b";ctx.fillRect(w.x+5,w.y+5,w.w-10,w.h-10)}
// village buildings
building(140,170,230,170,"AURORA");building(590,180,210,150,"TAVERNA");building(250,900,220,150,"FORGE");
// special shrine
shrine(3070,1880);
for(const n of npcs)drawNpc(n);
for(const it of items)if(!it.taken)drawItem(it);
for(const e of enemies)if(!e.dead)drawEnemy(e);
if(boss.active&&!boss.dead)drawBoss();
drawPlayer(partner,"MARISA",true);drawPlayer(player,"LORIS",false);
ctx.restore();
// night overlay
let night=(Math.sin(gameTime*.035)+1)/2*.28;ctx.fillStyle=`rgba(9,13,36,${night})`;ctx.fillRect(0,0,W,H);
drawMinimap();
}
function drawProp(p){ctx.save();ctx.translate(p.x,p.y);if(p.type==="tree"){ctx.fillStyle="#4b3026";ctx.fillRect(-7,4,14,35*p.size);ctx.fillStyle="#1c503d";ctx.beginPath();ctx.arc(0,-8,34*p.size,0,7);ctx.fill();ctx.fillStyle="#2c6d4b";ctx.beginPath();ctx.arc(-22,0,23*p.size,0,7);ctx.arc(22,2,22*p.size,0,7);ctx.fill()}else if(p.type==="rock"){ctx.fillStyle="#59616c";ctx.beginPath();ctx.ellipse(0,10,26*p.size,17*p.size,0,0,7);ctx.fill()}else{ctx.fillStyle="#ff9ab8";ctx.beginPath();ctx.arc(-5,0,4,0,7);ctx.arc(5,0,4,0,7);ctx.fill()}ctx.restore()}
function building(x,y,w,h,label){ctx.fillStyle="#2c2738";ctx.fillRect(x,y,w,h);ctx.fillStyle="#b25c6d";ctx.beginPath();ctx.moveTo(x-20,y);ctx.lineTo(x+w/2,y-70);ctx.lineTo(x+w+20,y);ctx.fill();ctx.fillStyle="#111827";ctx.fillRect(x+w*.42,y+h*.55,40,h*.45);ctx.fillStyle="#fff8";ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText(label,x+w/2,y+h+25)}
function shrine(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle="#8d7be2";ctx.shadowColor="#b59cff";ctx.shadowBlur=30;ctx.beginPath();ctx.arc(0,0,52,0,7);ctx.strokeStyle="#c4b4ff";ctx.lineWidth=8;ctx.stroke();ctx.fillStyle="#d8ceff";ctx.beginPath();ctx.arc(0,0,11,0,7);ctx.fill();ctx.restore()}
function drawNpc(n){ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle=n.color;ctx.beginPath();ctx.arc(0,0,19,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText(n.name,0,-30);ctx.fillText("◆",0,-42);ctx.restore()}
function drawItem(i){ctx.save();ctx.translate(i.x,i.y+Math.sin(gameTime*2+i.x)*4);ctx.shadowColor="#fff";ctx.shadowBlur=15;ctx.font="26px system-ui";ctx.textAlign="center";ctx.fillText(i.icon,i.x*0-i.x+i.x*0,0);ctx.restore();ctx.fillStyle="#fff9";ctx.font="700 9px system-ui";ctx.textAlign="center";ctx.fillText(i.label,i.x,i.y+30)}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.type==="wisp"?"#8e7cff":"#65d48d";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,e.r,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-7,-3,3,0,7);ctx.arc(7,-3,3,0,7);ctx.fill();ctx.fillStyle="#111";ctx.fillRect(-10,-e.r-8,20,3);ctx.fillStyle="#ff6d88";ctx.fillRect(-10,-e.r-8,20*(e.hp/e.max),3);ctx.restore()}
function drawBoss(){ctx.save();ctx.translate(boss.x,boss.y);ctx.fillStyle="#7055b8";ctx.shadowColor="#9f7cff";ctx.shadowBlur=35;ctx.beginPath();ctx.arc(0,0,boss.r,0,7);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#d9ccff";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,boss.r+12,0,7);ctx.stroke();ctx.fillStyle="#fff";ctx.font="900 12px system-ui";ctx.textAlign="center";ctx.fillText("GUARDIANO DELLA LUNA",0,-75);ctx.fillStyle="#171126";ctx.fillRect(-60,-66,120,6);ctx.fillStyle="#ff6f91";ctx.fillRect(-60,-66,120*(boss.hp/boss.maxHp),6);ctx.restore()}
function drawPlayer(p,label,partnerFlag){ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=partnerFlag?"#ff72a5":"#64c8ff";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,p.r,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-7,-4,3,0,7);ctx.arc(7,-4,3,0,7);ctx.fill();ctx.font="900 11px system-ui";ctx.textAlign="center";ctx.fillText(label,0,-31);ctx.restore()}
function drawMinimap(){let mw=150,mh=104,ox=W-mw-14,oy=H-mh-14;ctx.fillStyle="#070b18d9";ctx.fillRect(ox,oy,mw,mh);ctx.strokeStyle="#fff2";ctx.strokeRect(ox,oy,mw,mh);for(const z of zones){ctx.fillStyle=z.color;ctx.fillRect(ox+z.x/world.w*mw,oy+z.y/world.h*mh,z.w/world.w*mw,z.h/world.h*mh)}ctx.fillStyle="#64c8ff";ctx.beginPath();ctx.arc(ox+player.x/world.w*mw,oy+player.y/world.h*mh,3,0,7);ctx.fill();ctx.fillStyle="#ff72a5";ctx.beginPath();ctx.arc(ox+partner.x/world.w*mw,oy+partner.y/world.h*mh,3,0,7);ctx.fill();for(const i of items)if(!i.taken){ctx.fillStyle="#ffe38a";ctx.fillRect(ox+i.x/world.w*mw-1,oy+i.y/world.h*mh-1,3,3)}}
function loop(t){let dt=Math.min(.035,(t-last)/1000||0);last=t;if(running&&!paused)update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
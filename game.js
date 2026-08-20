import * as THREE from "three";

const canvas=document.getElementById("game");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.78;
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<900?1.5:1.75));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x9bbfc5,45,190);
scene.background=new THREE.Color(0x8fc7df);
const skyCanvas=document.createElement("canvas"); skyCanvas.width=32; skyCanvas.height=256;
const skyCtx=skyCanvas.getContext("2d");
const skyGrad=skyCtx.createLinearGradient(0,0,0,256);
skyGrad.addColorStop(0,"#4f79bf"); skyGrad.addColorStop(.5,"#8fc7df"); skyGrad.addColorStop(1,"#d9efdc");
skyCtx.fillStyle=skyGrad; skyCtx.fillRect(0,0,32,256);
const skyTex=new THREE.CanvasTexture(skyCanvas);
const skyMat=new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,depthWrite:false});
const skyMesh=new THREE.Mesh(new THREE.SphereGeometry(240,32,16),skyMat); scene.add(skyMesh);


const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,500);
camera.position.set(0,2.2,8);

const clock=new THREE.Clock();
const world={size:170};
const keys={};
let running=false,paused=false,gameTime=0,lastSave=0;
let yaw=0,pitch=0,velY=0,grounded=false;
let crystals=0,coins=0,quest=0,hp=100;
let enemies=[],crystalObjects=[],coinObjects=[];
let marisa={mesh:null,x:2,z:6,phase:0};
let boss=null;
const colliders=[];
const playerRadius=.48;

function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener("resize",resize);resize();

function mat(color,rough=.9){return new THREE.MeshStandardMaterial({color,roughness:rough,flatShading:true})}
const mats={
 grass:mat(0x4f8f3b,.98),grass2:mat(0x6fb84f,.98),dirt:mat(0x795334,1),
 trunk:mat(0x69452e,1),trunkDark:mat(0x4a3022,1),rock:mat(0x777b82,1),
 stone:mat(0x626872,1),stoneDark:mat(0x454a52,1),wood:mat(0x9a633d,.98),
 woodDark:mat(0x6b412b,1),roof:mat(0x8d3d43,.98),roofDark:mat(0x612a31,1),
 window:mat(0x58b9e8,.35),water:mat(0x238fba,.22),leaf:mat(0x3e8d3f,.98),
 leaf2:mat(0x62aa45,.98),crystal:mat(0x6ce7ff,.18),enemy:mat(0x7b64cf,.72),
 enemy2:mat(0x4eb875,.72),gold:mat(0xf0b83d,.5),moon:mat(0xffe39a,.3),
 portal:mat(0x9b5de5,.28),sand:mat(0xc7a56a,1)
};
function box(name,x,y,z,w,h,d,m,collide=true){
 const g=new THREE.BoxGeometry(w,h,d),o=new THREE.Mesh(g,m);
 o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);
 if(collide)colliders.push({x,z,w,d});return o;
}
function addTree(x,z,s=1){
 box("trunk",x,1.8*s,z,.55*s,3.6*s,.55*s,mats.trunk,false);
 box("trunkTop",x,3.55*s,z,.75*s,.45*s,.75*s,mats.trunkDark,false);
 [[0,4.1,0,2.2,1.1,2.2],[0,5,0,1.8,1,1.8],[-.75,4.55,0,.9,.9,.9],[.75,4.55,0,.9,.9,.9],[0,4.55,-.75,.9,.9,.9],[0,4.55,.75,.9,.9,.9]].forEach((p,i)=>box("leaf",x+p[0]*s,p[1]*s,z+p[2]*s,p[3]*s,p[4]*s,p[5]*s,i%2?mats.leaf2:mats.leaf,false));
}
function addHouse(x,z){
 box("house",x,2.1,z,7,4.2,6,mats.wood,true);
 box("beam",x-3.35,2.1,z,.22,4.2,6.1,mats.woodDark,false);
 box("beam",x+3.35,2.1,z,.22,4.2,6.1,mats.woodDark,false);
 box("beam",x,3.95,z,7.05,.22,6.1,mats.woodDark,false);
 box("roof1",x,4.55,z,7.8,.7,6.7,mats.roof,true);
 box("roof2",x,5.15,z,6.3,.65,5.4,mats.roofDark,false);
 box("roof3",x,5.72,z,4.7,.6,4,mats.roof,false);
 box("door",x,1,z-3.08,1.25,2,.18,mats.woodDark,false);
 box("window",x-2,2,z-3.12,1.15,1,.08,mats.window,false);
 box("window",x+2,2,z-3.12,1.15,1,.08,mats.window,false);
 box("chimney",x+2,5.2,z+1.2,.8,2.1,.8,mats.stoneDark,false);
}
function addRock(x,z,s=1){
 box("rock",x,.55*s,z,1.5*s,1.1*s,1.2*s,mats.rock,false);
 box("rockTop",x-.18*s,1.15*s,z-.08*s,.9*s,.35*s,.8*s,mats.stone,false);
}
function addMountain(x,z,h=12){
  const levels=Math.floor(h/1.8);
  for(let y=0;y<levels;y++){
    const radius=Math.max(1,Math.floor((levels-y)*.65));
    for(let ix=-radius;ix<=radius;ix++) for(let iz=-radius;iz<=radius;iz++){
      if(Math.abs(ix)+Math.abs(iz)>radius+1) continue;
      const top=y*1.8+.9;
      box("mountain",x+ix*1.8,top,z+iz*1.8,1.9,1.8,1.9,y<levels-3?mats.stoneDark:mats.stone,false);
    }
  }
}
function addCloud(x,y,z,s=1){
  const m=mat(0xf3f7ff,.98);
  [[0,0,0,4],[3,0,0,3],[-3,0,0,3],[1.5,.9,0,3],[-1.5,.9,0,2.6]].forEach(p=>box("cloud",x+p[0]*s,y+p[1]*s,z+p[2]*s,p[3]*s,.8*s,2.2*s,m,false));
}
function addFlowers(x,z){
  const colors=[0xff5f86,0xffd65c,0x7bd7ff,0xb87cff];
  for(let i=0;i<4;i++){const a=i*1.57;const px=x+Math.cos(a)*.7,pz=z+Math.sin(a)*.7;box("flowerStem",px,.22,pz,.07,.45,.07,mats.leaf,false);box("flower",px,.48,pz,.18,.18,.18,mat(colors[i],.7),false)}
}



function createWorld(){
  const ground=box("ground",0,-.5,0,world.size*2,1,world.size*2,mats.grass,false);
  // paths
  box("path",0,.01,0,12,.08,world.size*2,mats.sand,false);
  box("path2",0,.015,0,world.size*2,.08,11,mats.sand,false);
  // water lake
  const water=box("lake",-33,.03,-30,31,.06,25,mats.water,false);water.material.transparent=true;water.material.opacity=.9;water.material.side=THREE.DoubleSide;
  // walls around distant play boundary
  const b=world.size-4;[[-b,0,2,world.size*2],[b,0,2,world.size*2],[0,-b,world.size*2,2],[0,b,world.size*2,2]].forEach(v=>box("boundary",v[0],1,v[1],v[2],4,v[3],mats.stone,true));
  // village
  addHouse(-7,-9);addHouse(8,-8);addHouse(0,9);
  [[-11,-5],[12,-5],[-4,5],[4,5]].forEach(p=>{box("lampPole",p[0],1,p[1],.12,2,.12,mats.woodDark,false);box("lamp",p[0],2.15,p[1],.38,.38,.38,mats.gold,false);});
  for(let i=0;i<28;i++){const x=-70+((i*37)%140),z=-75+((i*53)%150);if(Math.abs(x)<13||Math.abs(z)<13||Math.hypot(x+33,z+30)<18)continue;addTree(x,z,.75+(i%4)*.12)}
  for(let i=0;i<70;i++){const x=-78+((i*47)%156),z=-78+((i*71)%156);if(Math.abs(x)<15||Math.abs(z)<15)continue;box("grassPatch",x,.04,z,.55,.08,.55,i%2?mats.grass2:mats.grass,false)}
  for(let i=0;i<22;i++){const x=-75+((i*61)%150),z=-72+((i*29)%145);addRock(x,z,.6+(i%3)*.25)}
  addMountain(-62,-62,14);addMountain(66,-64,12);addMountain(-68,62,11);addMountain(68,68,15);
  addCloud(-35,24,-10,1.4);addCloud(25,30,18,1.1);addCloud(65,27,-35,.9);
  [[-15,-18],[15,-20],[-20,12],[18,10],[5,28],[-48,8],[44,-20]].forEach(p=>addFlowers(p[0],p[1]));
  // ruins
  for(let i=0;i<7;i++){const x=40+i*5,z=44+(i%3)*3;box("ruin",x,2.5,z,2,5,2,mats.stone,true)}
  // temple gate
  box("templeL",52,3,50,2,6,2,mats.stone,true);box("templeR",59,3,50,2,6,2,mats.stone,true);box("templeTop",55.5,6,50,9,2,2,mats.stone,true);
  // crystal pedestals
  [[22,-27],[47,18],[72,39]].forEach((p,i)=>addCrystal(p[0],p[1],i));
  addNPC(-2,0,"ADA","La Luna Nera ha spezzato il Cuore di Lunaria. Tre cristalli apriranno il Tempio.");
  addNPC(12,14,"ELIO","Quando avrete i tre Cristalli Lunari, il cancello delle rovine si aprirà.");
  marisa.mesh=createCharacter(0xff78a7,true);scene.add(marisa.mesh);marisa.mesh.position.set(marisa.x,0,marisa.z);
  addLight();
}
function addLight(){
  const hemi=new THREE.HemisphereLight(0xb9d8f4,0x263b24,0.9);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe5b6,1.35);sun.position.set(-30,50,25);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<900?1024:1536,innerWidth<900?1024:1536);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;scene.add(sun);
  const moon=new THREE.DirectionalLight(0x718bd0,0.12);moon.position.set(40,25,-40);scene.add(moon);
}
function createCharacter(color,pink=false){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.7,1.25,.45),mat(color));body.position.y=.8;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.72,.72,.55),mat(0xffd4bf));head.position.y=1.75;head.castShadow=true;g.add(head);
  const hair=new THREE.Mesh(new THREE.BoxGeometry(.78,.38,.6),mat(pink?0x5c3150:0x263c64));hair.position.set(0,2.08,0);hair.castShadow=true;g.add(hair);
  return g;
}
function addNPC(x,z,name,text){
  const g=createCharacter(0xffc15b);g.position.set(x,0,z);g.scale.set(.95,.95,.95);g.userData={name,text};scene.add(g);
}
function addCrystal(x,z,i){
  const g=new THREE.Group();const c=new THREE.Mesh(new THREE.OctahedronGeometry(.75),mats.crystal);c.position.y=1.25;c.castShadow=true;g.add(c);
  const glow=new THREE.PointLight(0x83ecff,1.4,8);glow.position.y=1.3;g.add(glow);g.position.set(x,0,z);g.userData={index:i,taken:false};scene.add(g);crystalObjects.push(g);
}
function addEnemy(x,z,type="slime"){
  const g=new THREE.Mesh(new THREE.SphereGeometry(.8,10,8),type==="bat"?mats.enemy:mats.enemy2);g.scale.y=.7;g.position.set(x,.75,z);g.castShadow=true;scene.add(g);
  enemies.push({mesh:g,x,z,type,hp:70,max:70,cool:0,dead:false});
}
function spawnEnemies(){[[18,-15,"slime"],[28,-1,"bat"],[35,23,"slime"],[46,12,"bat"],[58,30,"slime"],[65,44,"bat"],[-22,23,"slime"],[-37,18,"bat"]].forEach(e=>addEnemy(...e))}
function makePortal(){const g=new THREE.Mesh(new THREE.TorusGeometry(3.3,.35,16,48),mats.portal);g.position.set(71,3,49);g.rotation.x=Math.PI/2;g.visible=false;scene.add(g);g.userData.open=false;return g}
const portal=makePortal();

function playerPos(){return new THREE.Vector3(camera.position.x,0,camera.position.z)}
function blocked(x,z){
  if(Math.abs(x)>world.size-5||Math.abs(z)>world.size-5)return true;
  for(const c of colliders){if(x>c.x-c.w/2-playerRadius&&x<c.x+c.w/2+playerRadius&&z>c.z-c.d/2-playerRadius&&z<c.z+c.d/2+playerRadius)return true}
  return false;
}
function move(dt){
  const speed=(keys.shift?9:5.6),dx=(keys.d?1:0)-(keys.a?1:0),dz=(keys.s?1:0)-(keys.w?1:0);
  if(dx||dz){const len=Math.hypot(dx,dz);const fx=Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=Math.sin(yaw);const vx=(fx*dz+rx*dx)/len*speed*dt,vz=(fz*dz+rz*dx)/len*speed*dt;const nx=camera.position.x+vx,nz=camera.position.z+vz;if(!blocked(nx,camera.position.z))camera.position.x=nx;if(!blocked(camera.position.x,nz))camera.position.z=nz}
  camera.position.y+=velY*dt;velY-=19*dt;if(camera.position.y<2.1){camera.position.y=2.1;velY=0;grounded=true}else grounded=false;
}
function jump(){if(grounded){velY=7.3;grounded=false}}
function attack(){
  const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  const origin=camera.position.clone();origin.y=1.2;
  for(const e of enemies){if(e.dead)continue;const v=new THREE.Vector3(e.x-origin.x,0,e.z-origin.z),d=v.length();if(d<4.2&&forward.dot(v.normalize())>.15){e.hp-=38;hitFx(e.mesh.position);if(e.hp<=0){e.dead=true;e.mesh.visible=false;coins+=3;toast("Nemico sconfitto! +3 monete")}}}
  if(boss&&!boss.dead){const v=new THREE.Vector3(boss.x-origin.x,0,boss.z-origin.z),d=v.length();if(d<5&&forward.dot(v.normalize())>.1){boss.hp-=35;hitFx(boss.mesh.position);if(boss.hp<=0){boss.dead=true;boss.mesh.visible=false;quest=4;toast("🌙 Il Guardiano è caduto!")}}}
}
function hitFx(pos){for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.06),mat(0xffffb0));m.position.copy(pos);m.position.y+=1;scene.add(m);let life=.4;const vx=(Math.random()-.5)*4,vy=Math.random()*3+1,vz=(Math.random()-.5)*4;const iv=setInterval(()=>{life-=.04;m.position.x+=vx*.04;m.position.y+=vy*.04;m.position.z+=vz*.04;if(life<=0){clearInterval(iv);scene.remove(m)}},40)}}
function updateMarisa(dt){const px=camera.position.x,pz=camera.position.z;const d=Math.hypot(px-marisa.x,pz-marisa.z);if(d>4){marisa.x+=(px-marisa.x)*dt*1.2;marisa.z+=(pz-marisa.z)*dt*1.2;marisa.mesh.position.set(marisa.x,0,marisa.z)}marisa.mesh.lookAt(px,1, pz);marisa.phase+=dt}
function enemyUpdate(dt){
  for(const e of enemies){if(e.dead)continue;e.cool-=dt;const d=Math.hypot(e.x-camera.position.x,e.z-camera.position.z);if(d<22){const dx=(camera.position.x-e.x)/Math.max(d,.01),dz=(camera.position.z-e.z)/Math.max(d,.01);e.x+=dx*dt*2.1;e.z+=dz*dt*2.1;e.mesh.position.set(e.x,.75,e.z);if(d<2.1&&e.cool<=0){hp=Math.max(0,hp-10);e.cool=1.0;toast("💥 Hai subito un colpo!")}}}
}
function bossUpdate(dt){
  if(!boss||boss.dead)return;
  const d=Math.hypot(boss.x-camera.position.x,boss.z-camera.position.z);
  if(d>4.5){boss.x+=(camera.position.x-boss.x)*dt*.75;boss.z+=(camera.position.z-boss.z)*dt*.75;boss.mesh.position.set(boss.x,2,boss.z);}
  boss.cool-=dt;
  if(d<3.8&&boss.cool<=0){hp=Math.max(0,hp-18);boss.cool=1;toast("🌙 Il Guardiano ti colpisce!");}
  if(hp<=0){hp=100;camera.position.set(0,2.1,8);toast("❤️ Sei caduto! Torni al villaggio.");}
}
function questUpdate(){
  if(quest===0&&Math.hypot(camera.position.x,camera.position.z)>18){quest=1;toast("🌲 Trovate i tre Cristalli Lunari")}
  const got=crystalObjects.filter(c=>c.userData.taken).length;if(quest===1&&got===3){quest=2;toast("🔓 Il Tempio Antico si è aperto!");portal.visible=true;boss=spawnBoss()}
  if(quest===2&&boss&&boss.dead)quest=3;
  if(quest===3&&boss&&boss.dead&&Math.hypot(camera.position.x-71,camera.position.z-49)<6){quest=4;win()}
}
function spawnBoss(){
  const g=createBossMesh();scene.add(g);const o={mesh:g,x:60,z:48,hp:900,max:900,cool:0,dead:false};g.position.set(o.x,2,o.z);return o;
}
function createBossMesh(){
  const g=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(1.9,16,12),mat(0x7463db));body.scale.y=1.15;body.castShadow=true;g.add(body);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(2.1,.9,5),mat(0xffda79));crown.position.y=2.1;crown.rotation.y=.5;crown.castShadow=true;g.add(crown);
  const eye=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.18),mat(0xff7095));eye.position.set(0,.4,-1.75);g.add(eye);return g;
}
function interact(){
  for(const o of scene.children){if(!o.userData?.name)continue;const d=Math.hypot(o.position.x-camera.position.x,o.position.z-camera.position.z);if(d<3.2){showHint(`${o.userData.name}: ${o.userData.text}`);return}}
  showHint("Non c'è nulla qui con cui interagire.");
}
let hintTimer;function showHint(s){const h=document.getElementById("hint");h.textContent=s;h.classList.add("show");clearTimeout(hintTimer);hintTimer=setTimeout(()=>h.classList.remove("show"),2800)}
let toastTimer;function toast(s){const e=document.getElementById("toast");e.textContent=s;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),1600)}
function updateCrystals(){
  crystalObjects.forEach(c=>{if(!c.userData.taken){c.rotation.y+=.02;const d=Math.hypot(c.position.x-camera.position.x,c.position.z-camera.position.z);if(d<1.8){c.userData.taken=true;c.visible=false;crystals++;toast("💎 Cristallo Lunare raccolto!")}}});
}
function updateHUD(){
  const full=Math.max(0,Math.ceil(hp/20));document.getElementById("hp").textContent="❤".repeat(full)+"♡".repeat(5-full);document.getElementById("hpBar").style.width=Math.max(0,hp)+"%";document.getElementById("crystals").textContent=crystals;document.getElementById("coins").textContent=coins;document.getElementById("quest").textContent=["Raggiungi il Bosco","Trova 3 Cristalli Lunari","Apri il Tempio Antico","Sconfiggi il Guardiano","Raggiungi il Cuore di Lunaria"][Math.min(quest,4)];
}
function save(){localStorage.setItem("lunaria3d",JSON.stringify({x:camera.position.x,z:camera.position.z,yaw,pitch,hp,crystals,coins,quest,gots:crystalObjects.map(c=>c.userData.taken),boss:boss?{x:boss.x,z:boss.z,hp:boss.hp,dead:boss.dead}:null}));toast("💾 Salvataggio completato")}
function load(){
  const s=localStorage.getItem("lunaria3d");if(!s)return false;try{const o=JSON.parse(s);camera.position.set(o.x,2.1,o.z);yaw=o.yaw||0;pitch=o.pitch||0;hp=o.hp??100;crystals=o.crystals||0;coins=o.coins||0;quest=o.quest||0;(o.gots||[]).forEach((v,i)=>{if(v){crystalObjects[i].userData.taken=true;crystalObjects[i].visible=false}});if(o.boss&&!boss){boss=spawnBoss()}if(o.boss&&boss){boss.x=o.boss.x;boss.z=o.boss.z;boss.hp=o.boss.hp;boss.dead=o.boss.dead;boss.mesh.position.set(boss.x,2,boss.z);boss.mesh.visible=!boss.dead}updateHUD();return true}catch{return false}
}
function win(){running=false;document.getElementById("winBox").classList.remove("hidden");save()}
function start(){document.getElementById("menu").classList.add("hidden");document.getElementById("hud").classList.remove("hidden");document.getElementById("crosshair").classList.remove("hidden");document.getElementById("touch").classList.remove("hidden");running=true;paused=false;updateHUD();renderer.domElement.requestPointerLock?.()}
function pause(){paused=true;document.getElementById("pauseBox").classList.remove("hidden")}
function resume(){paused=false;document.getElementById("pauseBox").classList.add("hidden")}
function newGame(){
  localStorage.removeItem("lunaria3d");
  camera.position.set(0,2.2,8);
  yaw=0; pitch=0; velY=0; grounded=false;
  crystals=0; coins=0; quest=0; hp=100; boss=null;
  crystalObjects.forEach(c=>{c.userData.taken=false;c.visible=true;});
  enemies.forEach(e=>{e.dead=false;e.hp=e.max;e.mesh.visible=true;});
  portal.visible=false;
  updateHUD();
  start();
}
function continueGame(){
  if(!load()){ toast("Nessun salvataggio: inizio una nuova avventura"); }
  start();
}
const playBtn=document.getElementById("play");
const continueBtn=document.getElementById("continue");
playBtn.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();newGame();});
continueBtn.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();continueGame();});
playBtn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();});
continueBtn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();});
document.getElementById("pause").onclick=pause;document.getElementById("resume").onclick=resume;document.getElementById("save").onclick=save;document.getElementById("menuBtn").onclick=()=>location.reload();document.getElementById("again").onclick=()=>location.reload();

document.addEventListener("click",e=>{if(!running||paused)return;if(innerWidth>800&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});
document.addEventListener("mousemove",e=>{if(!running||paused||innerWidth<800)return;if(document.pointerLockElement===canvas){yaw-=e.movementX*.0026;pitch-=e.movementY*.0022;pitch=Math.max(-1.2,Math.min(1.2,pitch))}});
function touchLookStart(e){if(innerWidth>800)return;touchLook=true;lastTouch=e.touches[0]}function touchLookMove(e){if(!touchLook||paused)return;const p=e.touches[0];yaw-=(p.clientX-lastTouch.clientX)*.006;pitch-=(p.clientY-lastTouch.clientY)*.005;pitch=Math.max(-1.2,Math.min(1.2,pitch));lastTouch=p}function touchLookEnd(){touchLook=false}
let touchLook=false,lastTouch=null;canvas.addEventListener("touchstart",touchLookStart,{passive:false});canvas.addEventListener("touchmove",e=>{e.preventDefault();touchLookMove(e)},{passive:false});canvas.addEventListener("touchend",touchLookEnd);
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.code==="Space"){e.preventDefault();jump()}if(e.key.toLowerCase()==="j")attack();if(e.key.toLowerCase()==="e")interact()});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

const joystick=document.getElementById("joystick");let joyActive=false,joyId=null,jx=0,jy=0;
function joy(e){const r=joystick.getBoundingClientRect(),p=e.touches?Array.from(e.touches).find(x=>x.identifier===joyId):e,cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=p.clientX-cx,dy=p.clientY-cy,l=Math.hypot(dx,dy);const m=45;if(l>m){dx*=m/l;dy*=m/l}jx=dx/m;jy=dy/m;keys.a=jx<-.18;keys.d=jx>.18;keys.w=jy<-.18;keys.s=jy>.18;joystick.querySelector("div").style.transform=`translate(${dx}px,${dy}px)`}
joystick.addEventListener("touchstart",e=>{e.preventDefault();joyActive=true;joyId=e.changedTouches[0].identifier;joy(e)},{passive:false});joystick.addEventListener("touchmove",e=>{e.preventDefault();if(joyActive)joy(e)},{passive:false});["touchend","touchcancel"].forEach(ev=>joystick.addEventListener(ev,()=>{joyActive=false;keys.a=keys.d=keys.w=keys.s=false;joystick.querySelector("div").style.transform=""}));
document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("touchstart",e=>{e.preventDefault();const a=b.dataset.action;if(a==="attack")attack();if(a==="jump")jump();if(a==="interact")interact()},{passive:false}));

createWorld();spawnEnemies();updateHUD();if(sessionStorage.getItem("lunariaAutoStart")==="1"){sessionStorage.removeItem("lunariaAutoStart");start()}

function animate(){
 const dt=Math.min(.04,clock.getDelta());gameTime+=dt;
 if(running&&!paused){
   move(dt);updateMarisa(dt);enemyUpdate(dt);bossUpdate(dt);updateCrystals();questUpdate();updateHUD();
   // day/night
   const k=(Math.sin(gameTime*.055)+1)/2;scene.background.lerpColors?.(new THREE.Color(0x10204a),new THREE.Color(0x8fc7df),k);
 }
 camera.rotation.order="YXZ";camera.rotation.y=yaw;camera.rotation.x=pitch;
 renderer.render(scene,camera);requestAnimationFrame(animate)
}
animate();

const startButtons=[document.getElementById("play"),document.getElementById("continue")];


startButtons[0].onclick=newGame;
startButtons[1].onclick=continueGame;
startButtons.forEach(b=>b.addEventListener("pointerdown",e=>{e.preventDefault();(b===startButtons[0]?newGame:continueGame)()},{passive:false}));

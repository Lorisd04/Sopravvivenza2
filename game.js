import * as THREE from "three";

const canvas=document.getElementById("game");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.95;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91ccef);
scene.fog=new THREE.Fog(0x91ccef,32,170);

const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,0.1,400);
camera.position.set(0,2.15,10);
camera.rotation.order="YXZ";

const clock=new THREE.Clock();
const keys={};
const colliders=[];
const enemies=[];
const crystals=[];
const particles=[];
const world={size:170};
let yaw=0,pitch=0,velY=0,grounded=true;
let running=false,paused=false;
let hp=100,crystalCount=0,coins=0,quest=0;
let boss=null;
let marisa=null;
let touchLook=false,lastTouch=null;
let joystickId=null;

const objectives=[
  "Raggiungi il villaggio di Aurora",
  "Trova i 3 Cristalli Lunari",
  "Apri il Tempio Antico",
  "Sconfiggi il Guardiano",
  "Raggiungi il Cuore di Lunaria"
];

function resize(){
  renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize",resize);
resize();

function material(color,roughness=.9){
  return new THREE.MeshStandardMaterial({color,roughness,flatShading:true});
}
const mats={
  grass:material(0x6fa64f),
  grassTop:material(0x8fcf62),
  dirt:material(0x79553b),
  stone:material(0x68707c),
  stoneDark:material(0x474d58),
  wood:material(0x986345),
  woodDark:material(0x633e2b),
  roof:material(0x8c4656),
  roofDark:material(0x5f2f38),
  glass:material(0x65c8ef,.25),
  leaf:material(0x3b8143),
  leafLight:material(0x64a95a),
  water:material(0x2f96c5,.2),
  sand:material(0xc5a26c),
  crystal:material(0x6de8ff,.12),
  enemy:material(0x8367dc,.6),
  enemy2:material(0x5dc983,.6),
  gold:material(0xf0c04c,.4),
  portal:material(0xb47af4,.15),
  skin:material(0xf1c6a9),
  blue:material(0x59bfff),
  pink:material(0xff6b9c)
};

function box(name,x,y,z,w,h,d,mat,collide=false){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.name=name;
  mesh.position.set(x,y,z);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  scene.add(mesh);
  if(collide)colliders.push({x,z,w,d});
  return mesh;
}

function addTree(x,z,s=1){
  box("trunk",x,1.8*s,z,.55*s,3.6*s,.55*s,mats.woodDark);
  const blocks=[
    [0,4.1,0,2.6,1.2,2.6],
    [0,5.0,0,2.2,1.0,2.2],
    [-.9,4.6,0,1,1,1],
    [.9,4.6,0,1,1,1]
  ];
  blocks.forEach((b,i)=>box("leaf",x+b[0]*s,b[1]*s,z+b[2]*s,b[3]*s,b[4]*s,b[5]*s,i%2?mats.leafLight:mats.leaf));
}

function addHouse(x,z){
  box("house",x,2.1,z,7.4,4.2,6.2,mats.wood,true);
  box("beam",x-3.55,2.1,z,.22,4.2,6.25,mats.woodDark);
  box("beam",x+3.55,2.1,z,.22,4.2,6.25,mats.woodDark);
  box("beam",x,3.95,z,7.45,.22,6.25,mats.woodDark);
  box("roof",x,4.6,z,8.1,.7,6.8,mats.roof);
  box("roof2",x,5.2,z,6.8,.65,5.6,mats.roofDark);
  box("door",x,1,z-3.2,1.2,2,.18,mats.woodDark);
  box("window",x-2.15,2,z-3.24,1.2,1,.08,mats.glass);
  box("window",x+2.15,2,z-3.24,1.2,1,.08,mats.glass);
  box("chimney",x+2.2,5.35,z+1.25,.8,2.2,.8,mats.stoneDark);
}

function addRock(x,z,s=1){
  box("rock",x,.55*s,z,1.4*s,1.1*s,1.2*s,mats.stone);
  box("rockTop",x-.2*s,1.2*s,z-.1*s,.8*s,.28*s,.8*s,mats.stoneDark);
}

function addFlowers(x,z){
  for(let i=0;i<5;i++){
    const dx=(Math.random()-.5)*2.2,dz=(Math.random()-.5)*2.2;
    box("flower",x+dx,.18,z+dz,.1,.28,.1,i%2?mats.gold:mats.crystal);
  }
}

function addCloud(x,y,z,s=1){
  const g=new THREE.Group();
  [[0,0,0,3.5],[3,0,0,2.5],[-3,0,0,2.5],[1,1,0,2.2]].forEach(a=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(a[3]*s,12,8),new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.8}));
    m.position.set(a[0],a[1],a[2]);g.add(m);
  });
  g.position.set(x,y,z);scene.add(g);
}

function addMountain(x,z,h=14){
  for(let y=0;y<h/2;y++){
    const r=Math.max(1,Math.floor((h/2-y)*.8));
    for(let ix=-r;ix<=r;ix++)for(let iz=-r;iz<=r;iz++){
      if(Math.abs(ix)+Math.abs(iz)>r+1)continue;
      const m=y<h/2-3?mats.stoneDark:mats.stone;
      box("mountain",x+ix*1.9,y*1.8+.9,z+iz*1.9,1.9,1.8,1.9,m);
    }
  }
}

function addLight(){
  const hemi=new THREE.HemisphereLight(0xd7ebff,0x2f3a25,1.0);
  scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff1c6,1.6);
  sun.position.set(-40,60,30);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-90;
  sun.shadow.camera.right=90;
  sun.shadow.camera.top=90;
  sun.shadow.camera.bottom=-90;
  scene.add(sun);
  const fill=new THREE.DirectionalLight(0x88aaff,.3);
  fill.position.set(30,25,-20);
  scene.add(fill);
}

function createCharacter(color,scale=1){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.8,4,8),material(color,.95));
  body.position.y=.95;
  g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.42,12,8),mats.skin);
  head.position.y=1.75;
  g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.46,12,8),material(color===0xff6b9c?0x5c3458:0x2c3f65));
  hair.scale.y=.6;
  hair.position.set(0,2.08,0);
  g.add(hair);
  g.scale.setScalar(scale);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  return g;
}

function createWorld(){
  box("ground",0,-.5,0,world.size*2,1,world.size*2,mats.grass);
  box("pathX",0,.02,0,world.size*2,.06,10,mats.sand);
  box("pathZ",0,.03,0,10,.06,world.size*2,mats.sand);

  const lake=box("lake",-35,.03,-30,32,.06,26,mats.water);
  lake.material.transparent=true;
  lake.material.opacity=.9;

  for(let i=0;i<36;i++){
    const x=-76+((i*41)%152),z=-76+((i*67)%152);
    if(Math.abs(x)<17||Math.abs(z)<17||Math.hypot(x+35,z+30)<18)continue;
    addTree(x,z,.8+(i%3)*.13);
  }
  for(let i=0;i<20;i++){
    const x=-75+((i*63)%150),z=-73+((i*31)%145);
    addRock(x,z,.65+(i%3)*.2);
  }
  for(let i=0;i<18;i++){
    const x=-72+((i*47)%144),z=-70+((i*53)%140);
    addFlowers(x,z);
  }

  addHouse(-7,-9);
  addHouse(8,-8);
  addHouse(0,9);

  addMountain(-65,-64,13);
  addMountain(68,-64,11);
  addMountain(-68,62,12);
  addMountain(67,66,14);

  for(let i=0;i<6;i++)box("ruin",40+i*4,2.4,44+(i%2)*4,2.2,4.8,2.2,mats.stone);
  box("gateL",52,3,51,2,6,2,mats.stoneDark);
  box("gateR",59,3,51,2,6,2,mats.stoneDark);
  box("gateTop",55.5,6,51,9,2,2,mats.stoneDark);

  addCloud(-30,28,-12,1.3);
  addCloud(25,30,18,1.0);
  addCloud(62,27,-33,.8);

  addNPC(-2,0,"Ada","La Luna Nera ha spezzato il Cuore di Lunaria. Trova i tre Cristalli.");
  addNPC(12,14,"Elio","Quando avrete i tre Cristalli Lunari, il Tempio si aprirà.");

  marisa=createCharacter(0xff6b9c,.92);
  marisa.position.set(2,0,6);
  marisa.userData={npc:true,name:"Marisa",text:"Non ti lascio solo. Andiamo insieme."};
  scene.add(marisa);

  addLight();
}

function addNPC(x,z,name,text){
  const g=createCharacter(0xffd269,.9);
  g.position.set(x,0,z);
  g.userData={npc:true,name,text};
  scene.add(g);
}

function addCrystal(x,z){
  const g=new THREE.Group();
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.7),mats.crystal);
  gem.position.y=1.25;
  gem.castShadow=true;
  g.add(gem);
  const glow=new THREE.PointLight(0x6de8ff,1.2,7);
  glow.position.y=1.2;
  g.add(glow);
  g.position.set(x,0,z);
  g.userData={taken:false};
  scene.add(g);
  crystals.push(g);
}

function addEnemy(x,z,type="slime"){
  const g=new THREE.Mesh(new THREE.SphereGeometry(.82,12,8),type==="bat"?mats.enemy:mats.enemy2);
  g.scale.y=.7;
  g.position.set(x,.78,z);
  g.castShadow=true;
  scene.add(g);
  enemies.push({mesh:g,x,z,hp:70,max:70,cool:0,dead:false,type});
}

function spawnEnemies(){
  [[18,-15,"slime"],[28,-2,"bat"],[35,23,"slime"],[46,12,"bat"],[58,29,"slime"],[65,44,"bat"],[-22,23,"slime"],[-37,18,"bat"]].forEach(e=>addEnemy(...e));
}

function createBoss(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.SphereGeometry(2.0,18,12),mats.enemy);
  body.scale.y=1.15;
  body.castShadow=true;
  g.add(body);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(2.1,1,6),mats.gold);
  crown.position.y=2.25;
  crown.castShadow=true;
  g.add(crown);
  g.position.set(60,2,48);
  scene.add(g);
  return {mesh:g,x:60,z:48,hp:900,max:900,cool:0,dead:false};
}

function blocked(x,z){
  if(Math.abs(x)>world.size-5||Math.abs(z)>world.size-5)return true;
  for(const c of colliders){
    if(x>c.x-c.w/2-.5&&x<c.x+c.w/2+.5&&z>c.z-c.d/2-.5&&z<c.z+c.d/2+.5)return true;
  }
  return false;
}

function movePlayer(dt){
  const speed=keys.shift?9:5.8;
  let dx=(keys.d?1:0)-(keys.a?1:0);
  let dz=(keys.s?1:0)-(keys.w?1:0);
  if(dx||dz){
    const len=Math.hypot(dx,dz);
    dx/=len;dz/=len;
    const fx=Math.sin(yaw),fz=-Math.cos(yaw);
    const rx=Math.cos(yaw),rz=Math.sin(yaw);
    const vx=(fx*dz+rx*dx)*speed*dt;
    const vz=(fz*dz+rz*dx)*speed*dt;
    const nx=camera.position.x+vx,nz=camera.position.z+vz;
    if(!blocked(nx,camera.position.z))camera.position.x=nx;
    if(!blocked(camera.position.x,nz))camera.position.z=nz;
  }

  camera.position.y+=velY*dt;
  velY-=19*dt;
  if(camera.position.y<2.15){
    camera.position.y=2.15;
    velY=0;
    grounded=true;
  }else grounded=false;
}

function jump(){
  if(grounded){velY=7.2;grounded=false}
}

function attack(){
  const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
  const origin=camera.position.clone();
  for(const e of enemies){
    if(e.dead)continue;
    const v=new THREE.Vector3(e.x-origin.x,0,e.z-origin.z);
    const d=v.length();
    if(d<4.2&&forward.dot(v.normalize())>.1){
      e.hp-=38;
      burst(e.mesh.position,0xffe28a);
      if(e.hp<=0){
        e.dead=true;
        e.mesh.visible=false;
        coins+=3;
        toast("+3 monete");
      }
    }
  }
  if(boss&&!boss.dead){
    const v=new THREE.Vector3(boss.x-origin.x,0,boss.z-origin.z);
    const d=v.length();
    if(d<5&&forward.dot(v.normalize())>.05){
      boss.hp-=35;
      burst(boss.mesh.position,0xffa9d0);
      if(boss.hp<=0){
        boss.dead=true;
        boss.mesh.visible=false;
        quest=3;
        toast("🌙 Guardiano sconfitto");
      }
    }
  }
}

function burst(pos,color){
  for(let i=0;i<10;i++){
    const s=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.08),material(color));
    s.position.copy(pos);
    s.position.y+=1;
    scene.add(s);
    const vx=(Math.random()-.5)*4,vy=Math.random()*3+1,vz=(Math.random()-.5)*4;
    let life=.45;
    const timer=setInterval(()=>{
      life-=.05;
      s.position.x+=vx*.05;
      s.position.y+=vy*.05;
      s.position.z+=vz*.05;
      if(life<=0){clearInterval(timer);scene.remove(s)}
    },50);
  }
}

function updateEnemies(dt){
  for(const e of enemies){
    if(e.dead)continue;
    e.cool-=dt;
    const dx=camera.position.x-e.x,dz=camera.position.z-e.z;
    const d=Math.hypot(dx,dz);
    if(d<24){
      e.x+=(dx/Math.max(d,.01))*dt*2.1;
      e.z+=(dz/Math.max(d,.01))*dt*2.1;
      e.mesh.position.set(e.x,.78,e.z);
      if(d<2.2&&e.cool<=0){
        hp=Math.max(0,hp-9);
        e.cool=.9;
        toast("💥 Hai subito un colpo");
      }
    }
  }
}

function updateBoss(dt){
  if(!boss||boss.dead)return;
  boss.cool-=dt;
  const dx=camera.position.x-boss.x,dz=camera.position.z-boss.z;
  const d=Math.hypot(dx,dz);
  if(d>4.6){
    boss.x+=(dx/Math.max(d,.01))*dt*1.0;
    boss.z+=(dz/Math.max(d,.01))*dt*1.0;
    boss.mesh.position.set(boss.x,2,boss.z);
  }
  if(d<4&&boss.cool<=0){
    hp=Math.max(0,hp-15);
    boss.cool=1.1;
    toast("🌙 Il Guardiano ti ha colpito");
  }
}

function updateMarisa(dt){
  if(!marisa)return;
  const dx=camera.position.x-marisa.position.x;
  const dz=camera.position.z-marisa.position.z;
  const d=Math.hypot(dx,dz);
  if(d>4){
    marisa.position.x+=dx*dt*1.2;
    marisa.position.z+=dz*dt*1.2;
  }
  marisa.lookAt(camera.position.x,1.2,camera.position.z);
}

function updateCrystals(){
  for(const c of crystals){
    if(c.userData.taken)continue;
    c.rotation.y+=.02;
    const d=Math.hypot(c.position.x-camera.position.x,c.position.z-camera.position.z);
    if(d<1.8){
      c.userData.taken=true;
      c.visible=false;
      crystalCount++;
      toast("💎 Cristallo Lunare raccolto");
    }
  }
}

function updateQuest(){
  if(quest===0&&Math.hypot(camera.position.x,camera.position.z)>18){
    quest=1;
    toast("Trova i 3 Cristalli Lunari");
  }
  if(quest===1&&crystalCount>=3){
    quest=2;
    boss=createBoss();
    toast("🔓 Il Tempio si è aperto");
  }
  if(quest===2&&boss&&boss.dead){
    quest=3;
    toast("Raggiungi il Cuore di Lunaria");
  }
  if(quest===3&&Math.hypot(camera.position.x-70,camera.position.z-50)<6){
    running=false;
    document.getElementById("ending").classList.remove("hidden");
    saveGame();
  }
}

function updateHUD(){
  const n=Math.max(0,Math.ceil(hp/20));
  document.getElementById("hearts").textContent="♥".repeat(n)+"♡".repeat(5-n);
  document.getElementById("hpBar").style.width=Math.max(0,hp)+"%";
  document.getElementById("crystals").textContent=crystalCount;
  document.getElementById("coins").textContent=coins;
  document.getElementById("objective").textContent=objectives[Math.min(quest,objectives.length-1)];
}

function saveGame(){
  localStorage.setItem("lunaria_master",JSON.stringify({
    x:camera.position.x,z:camera.position.z,yaw,pitch,hp,crystalCount,coins,quest,
    crystals:crystals.map(c=>c.userData.taken),
    boss:boss?{hp:boss.hp,dead:boss.dead,x:boss.x,z:boss.z}:null
  }));
  toast("💾 Partita salvata");
}

function loadGame(){
  const raw=localStorage.getItem("lunaria_master");
  if(!raw)return false;
  try{
    const s=JSON.parse(raw);
    camera.position.set(s.x,2.15,s.z);
    yaw=s.yaw||0;
    pitch=s.pitch||0;
    hp=s.hp??100;
    crystalCount=s.crystalCount||0;
    coins=s.coins||0;
    quest=s.quest||0;
    (s.crystals||[]).forEach((taken,i)=>{
      if(taken&&crystals[i]){
        crystals[i].userData.taken=true;
        crystals[i].visible=false;
      }
    });
    if(s.boss&&!boss)boss=createBoss();
    if(s.boss&&boss){
      boss.hp=s.boss.hp;
      boss.dead=s.boss.dead;
      boss.x=s.boss.x;
      boss.z=s.boss.z;
      boss.mesh.position.set(boss.x,2,boss.z);
      boss.mesh.visible=!boss.dead;
    }
    return true;
  }catch(e){
    return false;
  }
}

function startGame(){
  running=true;
  paused=false;
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  document.getElementById("crosshair").classList.remove("hidden");
  document.getElementById("touch").classList.remove("hidden");
  updateHUD();
  if(innerWidth>800)canvas.requestPointerLock?.();
}

function newGame(){
  localStorage.removeItem("lunaria_master");
  camera.position.set(0,2.15,10);
  yaw=0;
  pitch=0;
  velY=0;
  hp=100;
  crystalCount=0;
  coins=0;
  quest=0;
  boss=null;
  crystals.forEach(c=>{c.userData.taken=false;c.visible=true});
  enemies.forEach(e=>{e.dead=false;e.hp=e.max;e.mesh.visible=true});
  marisa.position.set(2,0,6);
  startGame();
}

function continueGame(){
  loadGame();
  startGame();
}

function togglePause(){
  if(!running)return;
  paused=!paused;
  document.getElementById("pause").classList.toggle("hidden",!paused);
}

function interact(){
  let best=null,bestD=999;
  scene.children.forEach(o=>{
    if(!o.userData?.npc)return;
    const d=Math.hypot(o.position.x-camera.position.x,o.position.z-camera.position.z);
    if(d<bestD&&d<4){best=o;bestD=d;}
  });
  if(best)showHint(`${best.userData.name}: ${best.userData.text}`);
  else showHint("Non c'è nulla con cui interagire qui.");
}

let hintTimer;
function showHint(text){
  const el=document.getElementById("hint");
  el.textContent=text;
  el.classList.add("show");
  clearTimeout(hintTimer);
  hintTimer=setTimeout(()=>el.classList.remove("show"),2800);
}

let toastTimer;
function toast(text){
  const el=document.getElementById("toast");
  el.textContent=text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"),1500);
}

function setupInput(){
  addEventListener("keydown",e=>{
    keys[e.key.toLowerCase()]=true;
    if(e.code==="Space"){e.preventDefault();jump()}
    if(e.key.toLowerCase()==="j")attack();
    if(e.key.toLowerCase()==="e")interact();
    if(e.key.toLowerCase()==="p")togglePause();
  });
  addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

  document.getElementById("newGame").addEventListener("click",newGame);
  document.getElementById("continueGame").addEventListener("click",continueGame);
  document.getElementById("newGame").addEventListener("pointerdown",e=>{e.preventDefault();newGame()},{passive:false});
  document.getElementById("continueGame").addEventListener("pointerdown",e=>{e.preventDefault();continueGame()},{passive:false});

  document.getElementById("pauseBtn").addEventListener("click",()=>{paused=true;document.getElementById("pause").classList.remove("hidden")});
  document.getElementById("resumeBtn").addEventListener("click",()=>{paused=false;document.getElementById("pause").classList.add("hidden")});
  document.getElementById("saveBtn").addEventListener("click",saveGame);
  document.getElementById("menuBtn").addEventListener("click",()=>location.reload());
  document.getElementById("endingBtn").addEventListener("click",()=>location.reload());

  addEventListener("mousemove",e=>{
    if(!running||paused||innerWidth<801)return;
    if(document.pointerLockElement===canvas){
      yaw-=e.movementX*.0025;
      pitch-=e.movementY*.0021;
      pitch=Math.max(-1.15,Math.min(1.15,pitch));
    }
  });

  addEventListener("click",()=>{
    if(running&&!paused&&innerWidth>800&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.();
  });

  canvas.addEventListener("touchstart",e=>{
    if(innerWidth>800)return;
    if(e.touches.length!==1)return;
    touchLook=true;
    lastTouch=e.touches[0];
  },{passive:false});

  canvas.addEventListener("touchmove",e=>{
    if(!touchLook||paused)return;
    e.preventDefault();
    const p=e.touches[0];
    yaw-=(p.clientX-lastTouch.clientX)*.006;
    pitch-=(p.clientY-lastTouch.clientY)*.005;
    pitch=Math.max(-1.15,Math.min(1.15,pitch));
    lastTouch=p;
  },{passive:false});

  canvas.addEventListener("touchend",()=>{touchLook=false});

  document.querySelectorAll("[data-touch]").forEach(btn=>{
    btn.addEventListener("pointerdown",e=>{
      e.preventDefault();
      const a=btn.dataset.touch;
      if(a==="attack")attack();
      if(a==="jump")jump();
      if(a==="interact")interact();
    },{passive:false});
  });

  const joy=document.getElementById("joystick");
  joy.addEventListener("pointerdown",e=>{e.preventDefault();joystickId=e.pointerId;joy.setPointerCapture(e.pointerId);updateJoy(e)},{passive:false});
  joy.addEventListener("pointermove",e=>{if(e.pointerId===joystickId)updateJoy(e)},{passive:false});
  joy.addEventListener("pointerup",releaseJoy);
  joy.addEventListener("pointercancel",releaseJoy);

  function updateJoy(e){
    const r=joy.getBoundingClientRect();
    let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
    const max=45,l=Math.hypot(dx,dy);
    if(l>max){dx*=max/l;dy*=max/l;}
    keys.a=dx<-12;keys.d=dx>12;keys.w=dy<-12;keys.s=dy>12;
    joy.querySelector("div").style.transform=`translate(${dx}px,${dy}px)`;
  }
  function releaseJoy(){joystickId=null;keys.a=keys.d=keys.w=keys.s=false;joy.querySelector("div").style.transform="";}
}

function renderWorld(){
  const night=(Math.sin(performance.now()*.000025)+1)/2;
  scene.background.copy(new THREE.Color().lerpColors(new THREE.Color(0x8fcdf0),new THREE.Color(0x142149),night));
  scene.fog.color.copy(scene.background);
  camera.rotation.x=pitch;
  camera.rotation.y=yaw;
  camera.rotation.z=0;
}

function frame(){
  const dt=Math.min(.04,clock.getDelta());
  if(running&&!paused){
    movePlayer(dt);
    updateMarisa(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateCrystals();
    updateQuest();
    updateHUD();
  }
  renderWorld();
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}

createWorld();
spawnEnemies();
[[22,-27],[47,18],[72,39]].forEach(p=>addCrystal(p[0],p[1]));
setupInput();
updateHUD();
frame();

/**
 * 🎮 3D World Explorer - Main Game Script
 * Fully crash-proof implementation with Three.js
 */

// ==========================================
// 🛡️ 1. POLYFILL & SAFETY FIXES
// Prevents "THREE.CapsuleGeometry is not a constructor" error
// ==========================================
if (typeof THREE !== 'undefined' && !THREE.CapsuleGeometry) {
    THREE.CapsuleGeometry = class extends THREE.CylinderGeometry {
        constructor(radius = 0.5, length = 1, capSegments = 8, radialSegments = 16) {
            super(radius, radius, length + radius * 2, radialSegments);
        }
    };
}

// Helper per creare capsule in modo sicuro su qualsiasi versione
function createCapsuleGeometry(radius = 0.5, length = 1, capSegments = 8, radialSegments = 16) {
    if (typeof THREE.CapsuleGeometry === 'function') {
        try {
            return new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
        } catch (e) {
            console.warn("Fallback CapsuleGeometry:", e);
        }
    }
    return new THREE.CylinderGeometry(radius, radius, length + radius * 2, radialSegments);
}

// ==========================================
// 🎵 2. AUDIO SYNTHESIZER (No 404 Audio Files)
// ==========================================
class SoundSynth {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    }
    playCoinSound() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1); // E6
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }
    playJumpSound() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }
    playTalkSound() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400 + Math.random() * 200, now);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }
}
const audio = new SoundSynth();

// ==========================================
// 🌐 3. GLOBALS & STATE
// ==========================================
let scene, camera, renderer, clock;
let player, playerBody, playerMesh;
let npcs = [];
let collectibles = [];
let lanterns = [];
let dirLight, hemiLight;

// Game State
let score = 0;
const totalCoins = 10;
let isNight = false;
let activeNPC = null;

// Controls State
const keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false, Space: false, KeyE: false };
const playerState = {
    position: new THREE.Vector3(0, 1, 0),
    velocity: new THREE.Vector3(),
    rotation: 0,
    isGrounded: true,
    moveSpeed: 8,
    jumpForce: 7,
    gravity: -20
};

// Camera Control State
let cameraAngleX = 0;
let cameraAngleY = 0.3;
let cameraDistance = 10;
let isMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };

// ==========================================
// 🚀 4. INITIALIZATION
// ==========================================
function init() {
    const container = document.getElementById('game-container');
    clock = new THREE.Clock();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lights
    setupLighting();

    // Create World & Characters
    createWorld();
    player = createCharacter(0x3498db, true);
    player.position.set(0, 0, 0);
    scene.add(player);

    // Setup Listeners
    setupEventListeners();

    // Start Animation Loop
    animate();
}

// ==========================================
// 💡 5. LIGHTING SETUP
// ==========================================
function setupLighting() {
    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfffaed, 1.0);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    const d = 40;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);
}

// ==========================================
// 👤 6. CHARACTER CREATION (Safe Capsule)
// ==========================================
function createCharacter(colorHex = 0x3498db, isPlayer = false) {
    const characterGroup = new THREE.Group();

    // Body (Capsule geometry)
    const bodyGeo = createCapsuleGeometry(0.4, 0.8, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: colorHex, 
        roughness: 0.4,
        metalness: 0.1
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.9;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    characterGroup.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac }); // Skin tone
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.6;
    headMesh.castShadow = true;
    characterGroup.add(headMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.12, 1.65, 0.28);
    characterGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.12, 1.65, 0.28);
    characterGroup.add(rightEye);

    // Hat / Decorator for Player vs NPC
    if (isPlayer) {
        const hatGeo = new THREE.ConeGeometry(0.3, 0.4, 16);
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.set(0, 2.0, 0);
        hat.castShadow = true;
        characterGroup.add(hat);
    }

    return characterGroup;
}

// ==========================================
// 🌍 7. WORLD GENERATION
// ==========================================
function createWorld() {
    // Terrain Ground
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x4caf50, 
        roughness: 0.8,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid Floor Overlay
    const grid = new THREE.GridHelper(120, 40, 0x2e7d32, 0x388e3c);
    grid.position.y = 0.01;
    scene.add(grid);

    // Central Fountain / Pond
    const pondGeo = new THREE.CylinderGeometry(5, 5, 0.3, 32);
    const pondMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, roughness: 0.1, transparent: true, opacity: 0.85 });
    const pond = new THREE.Mesh(pondGeo, pondMat);
    pond.position.set(0, 0.1, 0);
    pond.receiveShadow = true;
    scene.add(pond);

    // Add Trees
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 40;
        addTree(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }

    // Add Rocks
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 45;
        addRock(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }

    // Add Lanterns
    const lanternPositions = [
        { x: -8, z: -8 }, { x: 8, z: -8 },
        { x: -8, z: 8 },  { x: 8, z: 8 }
    ];
    lanternPositions.forEach(pos => addLantern(pos.x, pos.z));

    // Add Collectible Coins
    for (let i = 0; i < totalCoins; i++) {
        const angle = (i / totalCoins) * Math.PI * 2;
        const dist = 8 + (i % 3) * 6;
        addCoin(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }

    // Add NPCs (Calls addNPC -> createCharacter)
    addNPC("Elena (Guida)", 0x9b59b6, -5, -5, "Benvenuto nell'esploratore 3D! Usa WASD per muoverti e raccogli tutte le monete d'oro!");
    addNPC("Marco (Guardia)", 0xe67e22, 10, 5, "La notte è fantastica qui! Prova il pulsante in alto a destra per cambiare l'ora del giorno.");
    addNPC("Sofia (Viandante)", 0x1abc9c, -12, 8, "Hai notato la fontana al centro? È un ottimo posto per rilassarsi.");
}

function addTree(x, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Foliage (Cone layers)
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
        const foliageGeo = new THREE.ConeGeometry(1.8 - i * 0.4, 1.8, 8);
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 2 + i * 1.1;
        foliage.castShadow = true;
        treeGroup.add(foliage);
    }

    scene.add(treeGroup);
}

function addRock(x, z) {
    const rockGeo = new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.5, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.8 });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.4, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
}

function addLantern(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.12, 3.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x263238 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.75;
    pole.castShadow = true;
    group.add(pole);

    // Lamp Head
    const lampGeo = new THREE.BoxGeometry(0.5, 0.6, 0.5);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff59d, emissive: 0xffb74d, emissiveIntensity: 0.2 });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.y = 3.5;
    group.add(lamp);

    // Point Light
    const light = new THREE.PointLight(0xffb74d, 0, 12); // Direct light when night
    light.position.y = 3.5;
    group.add(light);

    lanterns.push({ lampMat, light });
    scene.add(group);
}

function addNPC(name, colorHex, x, z, dialogText) {
    const npcMesh = createCharacter(colorHex, false);
    npcMesh.position.set(x, 0, z);
    scene.add(npcMesh);

    npcs.push({
        name: name,
        mesh: npcMesh,
        dialog: dialogText,
        initialY: 0
    });
}

function addCoin(x, z) {
    const coinGroup = new THREE.Group();
    coinGroup.position.set(x, 1.2, z);

    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const coinMat = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, 
        metalness: 0.8, 
        roughness: 0.2,
        emissive: 0xffaa00,
        emissiveIntensity: 0.3
    });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    coinGroup.add(coin);

    scene.add(coinGroup);
    collectibles.push(coinGroup);
}

// ==========================================
// ⌨️ 8. EVENT LISTENERS & CONTROLS
// ==========================================
function setupEventListeners() {
    // Key Down / Up
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
        if (e.code === 'KeyE') handleInteraction();
    });

    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    });

    // Mouse Controls (Camera Orbit)
    window.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'CANVAS') {
            isMouseDown = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mouseup', () => isMouseDown = false);

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        cameraAngleX -= deltaX * 0.005;
        cameraAngleY += deltaY * 0.005;

        // Clamp Y angle to avoid flipping
        cameraAngleY = Math.max(0.1, Math.min(Math.PI / 2.2, cameraAngleY));

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Zoom Wheel
    window.addEventListener('wheel', (e) => {
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(4, Math.min(25, cameraDistance));
    });

    // Resize Handler
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// 🏃 9. GAME UPDATES & PHYSICS
// ==========================================
function updatePlayer(delta) {
    if (!player) return;

    // Movement Vectors relative to Camera angle
    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keys.KeyW) moveVector.z -= 1;
    if (keys.KeyS) moveVector.z += 1;
    if (keys.KeyA) moveVector.x -= 1;
    if (keys.KeyD) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
        moveVector.normalize();

        // Rotate movement relative to camera orientation
        const forward = new THREE.Vector3(
            -Math.sin(cameraAngleX),
            0,
            -Math.cos(cameraAngleX)
        ).normalize();

        const right = new THREE.Vector3(
            Math.cos(cameraAngleX),
            0,
            -Math.sin(cameraAngleX)
        ).normalize();

        const finalMove = new THREE.Vector3()
            .addScaledVector(forward, -moveVector.z)
            .addScaledVector(right, moveVector.x)
            .normalize();

        // Move Player
        playerState.position.x += finalMove.x * playerState.moveSpeed * delta;
        playerState.position.z += finalMove.z * playerState.moveSpeed * delta;

        // Rotate Player model towards movement direction
        const targetAngle = Math.atan2(finalMove.x, finalMove.z);
        player.rotation.y = targetAngle;

        // Walking Animation (bobbing)
        player.children[0].position.y = 0.9 + Math.abs(Math.sin(clock.getElapsedTime() * 10)) * 0.1;
    } else {
        player.children[0].position.y = 0.9;
    }

    // Jump Logic
    if (keys.Space && playerState.isGrounded) {
        playerState.velocity.y = playerState.jumpForce;
        playerState.isGrounded = false;
        audio.playJumpSound();
    }

    // Apply Gravity
    playerState.velocity.y += playerState.gravity * delta;
    playerState.position.y += playerState.velocity.y * delta;

    // Ground Collision
    if (playerState.position.y <= 0) {
        playerState.position.y = 0;
        playerState.velocity.y = 0;
        playerState.isGrounded = true;
    }

    player.position.copy(playerState.position);

    // Update Position HUD
    const posElem = document.getElementById('pos-display');
    if (posElem) {
        posElem.textContent = `X: ${Math.round(player.position.x)}, Z: ${Math.round(player.position.z)}`;
    }
}

function updateCamera() {
    if (!player) return;

    // Calculate camera target position around player
    const target = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));

    const cx = target.x + cameraDistance * Math.sin(cameraAngleX) * Math.cos(cameraAngleY);
    const cy = target.y + cameraDistance * Math.sin(cameraAngleY);
    const cz = target.z + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);

    camera.position.set(cx, cy, cz);
    camera.lookAt(target);
}

function updateCollectibles() {
    const pPos = player.position;
    const elapsedTime = clock.getElapsedTime();

    for (let i = collectibles.length - 1; i >= 0; i--) {
        const coin = collectibles[i];
        
        // Spin animation
        coin.rotation.y = elapsedTime * 3;
        coin.position.y = 1.2 + Math.sin(elapsedTime * 4 + i) * 0.15;

        // Collision check
        const dist = pPos.distanceTo(coin.position);
        if (dist < 1.2) {
            scene.remove(coin);
            collectibles.splice(i, 1);
            score++;
            
            // HUD Update
            document.getElementById('score').textContent = `${score} / ${totalCoins}`;
            audio.playCoinSound();
        }
    }
}

function checkNPCInteractions() {
    if (!player) return;
    activeNPC = null;
    const promptElem = document.getElementById('interaction-prompt');

    npcs.forEach(npc => {
        // Idle animation for NPCs
        npc.mesh.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.2;

        const dist = player.position.distanceTo(npc.mesh.position);
        if (dist < 2.5) {
            activeNPC = npc;
        }
    });

    if (activeNPC) {
        promptElem.classList.remove('hidden');
    } else {
        promptElem.classList.add('hidden');
    }
}

function handleInteraction() {
    if (activeNPC) {
        const dialogBox = document.getElementById('dialog-box');
        document.getElementById('dialog-speaker').textContent = activeNPC.name;
        document.getElementById('dialog-text').textContent = activeNPC.dialog;
        dialogBox.classList.remove('hidden');
        audio.playTalkSound();
    }
}

function closeDialog() {
    document.getElementById('dialog-box').classList.add('hidden');
}

function toggleDayNight() {
    isNight = !isNight;
    const btn = document.getElementById('day-night-btn');

    if (isNight) {
        btn.textContent = "☀️ Passa a Giorno";
        scene.background.setHex(0x0a0a1a);
        scene.fog.color.setHex(0x0a0a1a);
        hemiLight.intensity = 0.15;
        dirLight.intensity = 0.1;

        lanterns.forEach(l => {
            l.lampMat.emissiveIntensity = 1.0;
            l.light.intensity = 2.0;
        });
    } else {
        btn.textContent = "🌙 Passa a Notte";
        scene.background.setHex(0x87ceeb);
        scene.fog.color.setHex(0x87ceeb);
        hemiLight.intensity = 0.6;
        dirLight.intensity = 1.0;

        lanterns.forEach(l => {
            l.lampMat.emissiveIntensity = 0.2;
            l.light.intensity = 0;
        });
    }
}

// ==========================================
// 🔄 10. ANIMATION LOOP
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1); // Cap delta to prevent teleports

    updatePlayer(delta);
    updateCamera();
    updateCollectibles();
    checkNPCInteractions();

    renderer.render(scene, camera);
}

// Start Game when window loads
window.addEventListener('load', init);

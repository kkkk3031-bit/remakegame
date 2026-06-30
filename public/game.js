import * as THREE from 'three';

// ─── SCENE SETUP ───────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.fog = new THREE.Fog(0x0a0a1a, 60, 300);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 80, 280);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  detectTouch();
});

// ─── LIGHTING ──────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x111133, 0.8);
scene.add(ambient);

const moonLight = new THREE.DirectionalLight(0x4466aa, 0.6);
moonLight.position.set(100, 200, 100);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 500;
moonLight.shadow.camera.left = -200;
moonLight.shadow.camera.right = 200;
moonLight.shadow.camera.top = 200;
moonLight.shadow.camera.bottom = -200;
scene.add(moonLight);

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
const BLOCK_SIZE   = 60;
const ROAD_WIDTH   = 14;
const CELL_TOTAL   = BLOCK_SIZE + ROAD_WIDTH;
const GRID_SIZE    = 8;
const CITY_OFFSET  = (GRID_SIZE * CELL_TOTAL) / 2;

// ─── CITY GENERATION ───────────────────────────────────────────────────────
const roadMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const sidewalk = new THREE.MeshLambertMaterial({ color: 0x333344 });
const lineMat  = new THREE.MeshLambertMaterial({ color: 0xffcc00 });

function createCity() {
  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_SIZE * CELL_TOTAL + ROAD_WIDTH, GRID_SIZE * CELL_TOTAL + ROAD_WIDTH),
    roadMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const buildingColors = [0x223344, 0x332233, 0x112233, 0x221133, 0x334422, 0x443322];
  const windowColors   = [0xffee88, 0x88aaff, 0xff8844, 0x44ffaa];

  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      const bx = gx * CELL_TOTAL - CITY_OFFSET + ROAD_WIDTH / 2;
      const bz = gz * CELL_TOTAL - CITY_OFFSET + ROAD_WIDTH / 2;

      // Sidewalk border
      const swMesh = new THREE.Mesh(
        new THREE.BoxGeometry(BLOCK_SIZE + 2, 0.3, BLOCK_SIZE + 2),
        sidewalk
      );
      swMesh.position.set(bx, 0.15, bz);
      scene.add(swMesh);

      // Buildings inside block
      const numBuildings = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < numBuildings; b++) {
        const bw = 8 + Math.random() * 16;
        const bd = 8 + Math.random() * 16;
        const bh = 10 + Math.random() * 60;
        const ox = (Math.random() - 0.5) * (BLOCK_SIZE - bw - 4);
        const oz = (Math.random() - 0.5) * (BLOCK_SIZE - bd - 4);

        const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(bw, bh, bd),
          new THREE.MeshLambertMaterial({ color })
        );
        building.position.set(bx + ox, bh / 2 + 0.3, bz + oz);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);

        // Windows (emissive quads on building face)
        const wc = windowColors[Math.floor(Math.random() * windowColors.length)];
        const winMat = new THREE.MeshBasicMaterial({ color: wc });
        const floors = Math.floor(bh / 4);
        for (let f = 1; f < floors; f++) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.6, 1.2), winMat);
          win.position.set(bx + ox, bh / 2 + 0.3 - bh / 2 + f * 4, bz + oz + bd / 2 + 0.01);
          scene.add(win);
        }
      }
    }
  }

  // Road center lines
  const lineGeo = new THREE.BoxGeometry(1, 0.05, GRID_SIZE * CELL_TOTAL);
  for (let i = 0; i <= GRID_SIZE; i++) {
    const x = i * CELL_TOTAL - CITY_OFFSET;
    const lx = new THREE.Mesh(lineGeo, lineMat);
    lx.position.set(x, 0.05, 0);
    scene.add(lx);

    const lz = new THREE.Mesh(lineGeo.clone(), lineMat);
    lz.rotation.y = Math.PI / 2;
    lz.position.set(0, 0.05, x);
    scene.add(lz);
  }

  // Street lights
  addStreetLights();
}

function addStreetLights() {
  const poleGeo  = new THREE.CylinderGeometry(0.15, 0.15, 8, 6);
  const poleMat  = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const lightGeo = new THREE.SphereGeometry(0.4, 8, 6);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = i * CELL_TOTAL - CITY_OFFSET + ROAD_WIDTH / 2;
      const z = j * CELL_TOTAL - CITY_OFFSET + ROAD_WIDTH / 2;
      const corners = [
        [x - BLOCK_SIZE / 2 - 1, z - BLOCK_SIZE / 2 - 1],
        [x + BLOCK_SIZE / 2 + 1, z + BLOCK_SIZE / 2 + 1],
      ];
      corners.forEach(([px, pz]) => {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(px, 4, pz);
        scene.add(pole);
        const bulb = new THREE.Mesh(lightGeo, lightMat);
        bulb.position.set(px, 8.3, pz);
        scene.add(bulb);
        const pt = new THREE.PointLight(0xffee88, 1.5, 25);
        pt.position.set(px, 8, pz);
        scene.add(pt);
      });
    }
  }
}

// ─── CAR ───────────────────────────────────────────────────────────────────
function createCarMesh(bodyColor) {
  const group = new THREE.Group();

  const bodyMat   = new THREE.MeshLambertMaterial({ color: bodyColor });
  const glassMat  = new THREE.MeshLambertMaterial({ color: 0x224466, transparent: true, opacity: 0.7 });
  const tireMat   = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const rimMat    = new THREE.MeshLambertMaterial({ color: 0xcccccc });
  const lightFMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
  const lightRMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.4), bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), bodyMat);
  cabin.position.set(0, 1.0, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  // Windshield
  const wind = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), glassMat);
  wind.rotation.x = -0.35;
  wind.position.set(0, 1.02, 0.99);
  group.add(wind);

  // Rear window
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), glassMat);
  rear.rotation.x = 0.35;
  rear.position.set(0, 1.02, -1.2);
  group.add(rear);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14);
  const rimGeo   = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
  const positions = [
    [ 1.2, 0.38,  1.5],
    [-1.2, 0.38,  1.5],
    [ 1.2, 0.38, -1.5],
    [-1.2, 0.38, -1.5],
  ];
  const wheels = [];
  positions.forEach(([x, y, z]) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    wg.add(tire);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);
    wg.position.set(x, y, z);
    wg.castShadow = true;
    group.add(wg);
    wheels.push(wg);
  });

  // Headlights
  [-0.7, 0.7].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.05), lightFMat);
    hl.position.set(x, 0.55, 2.2);
    group.add(hl);
    const pl = new THREE.SpotLight(0xffffcc, 3, 30, 0.4, 0.5);
    pl.position.set(x, 0.8, 2.2);
    pl.target.position.set(x * 0.3, -1, 8);
    group.add(pl);
    group.add(pl.target);
  });

  // Tail lights
  [-0.7, 0.7].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.05), lightRMat);
    tl.position.set(x, 0.55, -2.2);
    group.add(tl);
  });

  return { group, wheels };
}

// ─── PLAYER CAR STATE ──────────────────────────────────────────────────────
const playerState = {
  pos:      new THREE.Vector3(0, 0, 10),
  vel:      new THREE.Vector3(),
  angle:    0,
  speed:    0,
  nitro:    100,
  nitroActive: false,
  lapTime:  0,
  gear:     'N',
};

let playerMesh, playerWheels;

function initPlayer() {
  const { group, wheels } = createCarMesh(0xff4400);
  playerMesh  = group;
  playerWheels = wheels;
  scene.add(playerMesh);
  playerMesh.position.copy(playerState.pos);
}

// ─── AI CARS ───────────────────────────────────────────────────────────────
const AI_COLORS = [0x0055ff, 0x00bb44, 0xcc00cc];
const aiCars = [];

function initAI() {
  const starts = [
    new THREE.Vector3(-6,  0, 10),
    new THREE.Vector3( 6,  0, 10),
    new THREE.Vector3( 0,  0, 20),
  ];
  starts.forEach((pos, i) => {
    const { group, wheels } = createCarMesh(AI_COLORS[i]);
    scene.add(group);
    group.position.copy(pos);
    aiCars.push({
      mesh: group, wheels,
      pos: pos.clone(),
      vel: new THREE.Vector3(),
      angle: 0,
      speed: 0,
      targetAngle: 0,
      waypointIdx: 0,
      baseSpeed: 18 + Math.random() * 8,
    });
  });
}

// AI waypoints — drive around the city grid perimeter then inner loops
const aiWaypoints = [];
function buildWaypoints() {
  const r = (GRID_SIZE / 2) * CELL_TOTAL - ROAD_WIDTH;
  const step = CELL_TOTAL;
  // Outer loop
  for (let i = -GRID_SIZE / 2; i < GRID_SIZE / 2; i++) aiWaypoints.push(new THREE.Vector3(i * step, 0,  r));
  for (let i = -GRID_SIZE / 2; i < GRID_SIZE / 2; i++) aiWaypoints.push(new THREE.Vector3( r, 0, -i * step));
  for (let i =  GRID_SIZE / 2; i > -GRID_SIZE / 2; i--) aiWaypoints.push(new THREE.Vector3(i * step, 0, -r));
  for (let i =  GRID_SIZE / 2; i > -GRID_SIZE / 2; i--) aiWaypoints.push(new THREE.Vector3(-r, 0, i * step));
}

function updateAI(dt) {
  aiCars.forEach(ai => {
    const wp = aiWaypoints[ai.waypointIdx % aiWaypoints.length];
    const dx = wp.x - ai.pos.x;
    const dz = wp.z - ai.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 8) {
      ai.waypointIdx = (ai.waypointIdx + 1) % aiWaypoints.length;
    }

    ai.targetAngle = Math.atan2(dx, dz);
    let da = ai.targetAngle - ai.angle;
    while (da >  Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    ai.angle += da * Math.min(dt * 3, 0.15);

    ai.speed += (ai.baseSpeed - ai.speed) * dt * 2;
    ai.vel.x = Math.sin(ai.angle) * ai.speed * dt;
    ai.vel.z = Math.cos(ai.angle) * ai.speed * dt;
    ai.pos.add(ai.vel);

    // Clamp to city
    const bound = CITY_OFFSET - ROAD_WIDTH;
    ai.pos.x = Math.max(-bound, Math.min(bound, ai.pos.x));
    ai.pos.z = Math.max(-bound, Math.min(bound, ai.pos.z));

    ai.mesh.position.set(ai.pos.x, 0, ai.pos.z);
    ai.mesh.rotation.y = ai.angle;

    // Spin wheels
    ai.wheels.forEach(w => { w.rotation.x += ai.speed * dt * 0.8; });
  });
}

// ─── INPUT ─────────────────────────────────────────────────────────────────
const keys = {
  up: false, down: false, left: false, right: false, nitro: false
};

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') keys.up    = true;
  if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') keys.down  = true;
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === 'n' || e.key === 'N') keys.nitro = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') keys.up    = false;
  if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') keys.down  = false;
  if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'n' || e.key === 'N') keys.nitro = false;
});

// Touch buttons
function setupTouchButtons() {
  const map = {
    'btn-gas':   'up',
    'btn-brake': 'down',
    'btn-left':  'left',
    'btn-right': 'right',
    'btn-nitro': 'nitro',
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true;  el.classList.add('pressed'); },    { passive: false });
    el.addEventListener('touchend',   e => { e.preventDefault(); keys[key] = false; el.classList.remove('pressed'); }, { passive: false });
    el.addEventListener('touchcancel',e => { e.preventDefault(); keys[key] = false; el.classList.remove('pressed'); }, { passive: false });
  });
}

function detectTouch() {
  const tc = document.getElementById('touch-controls');
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    tc.style.display = 'block';
  }
}

// ─── CAR PHYSICS ───────────────────────────────────────────────────────────
const MAX_SPEED    = 35;
const NITRO_MULT   = 1.65;
const ACCEL        = 22;
const BRAKE_FORCE  = 38;
const STEER_SPEED  = 2.2;
const FRICTION     = 0.92;
const LATERAL_GRIP = 0.88;

const camOffset = new THREE.Vector3(0, 5, -12);
const camTarget = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function updatePlayer(dt) {
  const state = playerState;
  const maxSpd = keys.nitro && state.nitro > 0 ? MAX_SPEED * NITRO_MULT : MAX_SPEED;

  // Nitro drain/regen
  if (keys.nitro && state.nitro > 0) {
    state.nitro = Math.max(0, state.nitro - dt * 40);
    state.nitroActive = true;
  } else {
    state.nitroActive = false;
    state.nitro = Math.min(100, state.nitro + dt * 12);
  }

  // Acceleration
  if (keys.up)   state.speed += ACCEL * dt;
  if (keys.down) state.speed -= BRAKE_FORCE * dt;

  // Clamp & friction
  state.speed *= FRICTION;
  state.speed  = Math.max(-MAX_SPEED * 0.5, Math.min(maxSpd, state.speed));

  // Steering (more responsive at speed)
  const steerFactor = Math.min(Math.abs(state.speed) / 5, 1);
  if (keys.left  && state.speed > 0.5) state.angle += STEER_SPEED * steerFactor * dt;
  if (keys.right && state.speed > 0.5) state.angle -= STEER_SPEED * steerFactor * dt;
  if (keys.left  && state.speed < -0.5) state.angle -= STEER_SPEED * steerFactor * dt;
  if (keys.right && state.speed < -0.5) state.angle += STEER_SPEED * steerFactor * dt;

  // Move
  const fw = new THREE.Vector3(Math.sin(state.angle), 0, Math.cos(state.angle));
  state.vel.copy(fw).multiplyScalar(state.speed * dt);
  state.pos.add(state.vel);

  // City boundary
  const bound = CITY_OFFSET - ROAD_WIDTH * 0.5;
  state.pos.x = Math.max(-bound, Math.min(bound, state.pos.x));
  state.pos.z = Math.max(-bound, Math.min(bound, state.pos.z));

  // Apply to mesh
  playerMesh.position.set(state.pos.x, 0, state.pos.z);
  playerMesh.rotation.y = state.angle;

  // Wheel spin
  playerWheels.forEach((w, i) => {
    w.rotation.x += state.speed * dt * 0.8;
  });

  // Lap timer
  state.lapTime += dt;

  // Gear
  const spd = Math.abs(state.speed);
  if (spd < 0.5) state.gear = 'N';
  else if (state.speed < 0) state.gear = 'R';
  else if (spd < 10) state.gear = '1';
  else if (spd < 18) state.gear = '2';
  else if (spd < 26) state.gear = '3';
  else state.gear = '4';
}

function updateCamera() {
  const state = playerState;
  _quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.angle);
  const offset = camOffset.clone().applyQuaternion(_quat);
  const targetPos = playerMesh.position.clone().add(offset);

  camera.position.lerp(targetPos, 0.12);
  camTarget.copy(playerMesh.position).add(new THREE.Vector3(0, 1.5, 0));
  camera.lookAt(camTarget);
}

// ─── HUD ───────────────────────────────────────────────────────────────────
const elSpeed    = document.getElementById('speed-value');
const elGear     = document.getElementById('gear-display');
const elNitro    = document.getElementById('nitro-bar');
const elLapTime  = document.getElementById('lap-time');
const elPosition = document.getElementById('position');

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${ms}`;
}

function getPosition() {
  const px = playerState.pos.x, pz = playerState.pos.z;
  let ahead = 0;
  aiCars.forEach(ai => {
    const ax = ai.pos.x, az = ai.pos.z;
    if (Math.sqrt(ax * ax + az * az) < Math.sqrt(px * px + pz * pz)) ahead++;
  });
  return ahead + 1;
}

// ─── MINIMAP ───────────────────────────────────────────────────────────────
const mapCanvas = document.getElementById('map-canvas');
const mapCtx    = mapCanvas.getContext('2d');
const MAP_W     = 120;
const WORLD_R   = CITY_OFFSET;

function drawMinimap() {
  mapCtx.clearRect(0, 0, MAP_W, MAP_W);
  mapCtx.fillStyle = '#111122';
  mapCtx.fillRect(0, 0, MAP_W, MAP_W);

  // Grid roads
  mapCtx.strokeStyle = '#333344';
  mapCtx.lineWidth = 2;
  for (let i = 0; i <= GRID_SIZE; i++) {
    const p = ((i * CELL_TOTAL - CITY_OFFSET) / (WORLD_R * 2) + 0.5) * MAP_W;
    mapCtx.beginPath(); mapCtx.moveTo(p, 0); mapCtx.lineTo(p, MAP_W); mapCtx.stroke();
    mapCtx.beginPath(); mapCtx.moveTo(0, p); mapCtx.lineTo(MAP_W, p); mapCtx.stroke();
  }

  function worldToMap(x, z) {
    return [
      (x / (WORLD_R * 2) + 0.5) * MAP_W,
      (z / (WORLD_R * 2) + 0.5) * MAP_W,
    ];
  }

  // AI dots
  aiCars.forEach(ai => {
    const [mx, mz] = worldToMap(ai.pos.x, ai.pos.z);
    mapCtx.fillStyle = '#4488ff';
    mapCtx.beginPath(); mapCtx.arc(mx, mz, 3, 0, Math.PI * 2); mapCtx.fill();
  });

  // Player dot
  const [px, pz] = worldToMap(playerState.pos.x, playerState.pos.z);
  mapCtx.fillStyle = '#ff4400';
  mapCtx.beginPath(); mapCtx.arc(px, pz, 4.5, 0, Math.PI * 2); mapCtx.fill();
}

// ─── PARTICLE NITRO EFFECT ─────────────────────────────────────────────────
const particles = [];
const partGeo  = new THREE.SphereGeometry(0.12, 4, 4);
const partMat  = new THREE.MeshBasicMaterial({ color: 0x00aaff });
const partPool = [];
for (let i = 0; i < 30; i++) {
  const m = new THREE.Mesh(partGeo, partMat.clone());
  m.visible = false;
  scene.add(m);
  partPool.push({ mesh: m, life: 0, vel: new THREE.Vector3() });
}

function spawnNitroParticles() {
  const free = partPool.filter(p => !p.mesh.visible).slice(0, 3);
  free.forEach(p => {
    p.mesh.visible = true;
    p.life = 0.4;
    p.mesh.position.copy(playerMesh.position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.5, 0.4, -2.2
    ));
    p.vel.set((Math.random()-0.5)*3, Math.random()*2, -Math.random()*8);
  });
}

function updateParticles(dt) {
  partPool.forEach(p => {
    if (!p.mesh.visible) return;
    p.life -= dt;
    if (p.life <= 0) { p.mesh.visible = false; return; }
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.material.opacity = p.life / 0.4;
    p.mesh.material.transparent = true;
  });
}

// ─── COUNTDOWN & START ─────────────────────────────────────────────────────
let gameRunning = false;
let gameStarted = false;

function startCountdown() {
  const el = document.getElementById('countdown');
  const hud = document.getElementById('hud');
  hud.style.display = 'block';
  el.style.display = 'block';
  let n = 3;
  el.textContent = n;

  const iv = setInterval(() => {
    n--;
    if (n > 0) {
      el.textContent = n;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = 'countpop 0.5s ease-out';
    } else {
      el.textContent = 'GO!';
      el.style.color = '#00ff88';
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = 'countpop 0.5s ease-out';
      clearInterval(iv);
      setTimeout(() => {
        el.style.display = 'none';
        gameRunning = true;
      }, 600);
    }
  }, 1000);
}

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  gameStarted = true;
  detectTouch();
  startCountdown();
});

// ─── INIT ──────────────────────────────────────────────────────────────────
createCity();
buildWaypoints();
initPlayer();
initAI();
setupTouchButtons();

camera.position.set(0, 15, -20);
camera.lookAt(0, 0, 0);

// ─── GAME LOOP ─────────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.05);
  lastTime  = now;

  if (gameRunning) {
    updatePlayer(dt);
    updateAI(dt);
    updateCamera();
    updateParticles(dt);

    if (playerState.nitroActive && playerState.nitro > 0) spawnNitroParticles();

    // HUD
    const mph = Math.abs(playerState.speed) * 2.5;
    elSpeed.textContent   = Math.round(mph);
    elGear.textContent    = `GEAR ${playerState.gear}`;
    elNitro.style.width   = playerState.nitro + '%';
    elLapTime.textContent = formatTime(playerState.lapTime);
    elPosition.textContent = `${getPosition()} / 4`;

    drawMinimap();
  }

  renderer.render(scene, camera);
}

animate();

// SECTOR ZERO - Top-Down Shooter

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

canvas.width  = 800;
canvas.height = 600;

// ─── Input ────────────────────────────────────────────────────────────────────
const keys  = {};
const mouse = { x: 400, y: 300, down: false, clicked: false };

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Escape') onEscape();
  e.preventDefault();
});
window.addEventListener('keyup',   e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width  / r.width;
  const sy = canvas.height / r.height;
  mouse.x = (e.clientX - r.left) * sx;
  mouse.y = (e.clientY - r.top)  * sy;
});
canvas.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true;  initAudio(); } });
canvas.addEventListener('mouseup',   e => { if (e.button === 0)   mouse.down = false; });
canvas.addEventListener('click',     e => { mouse.clicked = true; initAudio(); });

// ─── Audio ────────────────────────────────────────────────────────────────────
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playTone(type, freq, endFreq, duration, gain) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g   = audioCtx.createGain();
  osc.connect(g); g.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), audioCtx.currentTime + duration);
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.start(); osc.stop(audioCtx.currentTime + duration + 0.02);
}
function playNoise(duration, filterFreq, gain) {
  if (!audioCtx) return;
  const bufSize = audioCtx.sampleRate * duration;
  const buf     = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data    = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src    = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const g      = audioCtx.createGain();
  src.buffer = buf;
  filter.type = 'bandpass'; filter.frequency.value = filterFreq; filter.Q.value = 2;
  src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
  g.gain.setValueAtTime(gain, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  src.start(); src.stop(audioCtx.currentTime + duration + 0.02);
}
function sndShoot()        { playTone('square',   440, 220, 0.08, 0.25); }
function sndEnemyDeath()   { playNoise(0.3, 800, 0.4); playTone('sine', 80, 40, 0.2, 0.3); }
function sndPlayerHit()    { playTone('sawtooth', 200, 80, 0.15, 0.4); }
function sndEnemyShoot()   { playTone('triangle', 800, 400, 0.06, 0.15); }
function sndLevelComplete() {
  if (!audioCtx) return;
  const notes = [261.63, 329.63, 392.00, 523.25];
  notes.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    osc.type = 'sine'; osc.frequency.value = f;
    const t = audioCtx.currentTime + i * 0.18;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t); osc.stop(t + 0.4);
  });
}
function sndBossIntro() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  const g   = audioCtx.createGain();
  lfo.frequency.value = 4; lfoGain.gain.value = 0.3;
  lfo.connect(lfoGain); lfoGain.connect(g.gain);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.type = 'sawtooth'; osc.frequency.value = 60;
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 1);
  g.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 2.5);
  osc.start(); lfo.start();
  osc.stop(audioCtx.currentTime + 2.6); lfo.stop(audioCtx.currentTime + 2.6);
}

// ─── Levels ───────────────────────────────────────────────────────────────────
const LEVELS = [
  { id:1, name:'SECTOR 1', bgColor:'#0d0d1a', gridColor:'#1a1a3a', bossLevel:false,
    waves:[
      { enemies:[{type:'grunt',count:5}],  spawnInterval:2000 },
      { enemies:[{type:'grunt',count:8}],  spawnInterval:1600 },
    ]},
  { id:2, name:'SECTOR 2', bgColor:'#0d1a0d', gridColor:'#1a3a1a', bossLevel:false,
    waves:[
      { enemies:[{type:'grunt',count:6},{type:'rusher',count:3}], spawnInterval:1800 },
      { enemies:[{type:'rusher',count:8}], spawnInterval:1400 },
      { enemies:[{type:'grunt',count:5},{type:'tank',count:1}],   spawnInterval:2200 },
    ]},
  { id:3, name:'SECTOR 3', bgColor:'#1a0d1a', gridColor:'#2a1a2a', bossLevel:false,
    waves:[
      { enemies:[{type:'shooter',count:4}], spawnInterval:2500 },
      { enemies:[{type:'grunt',count:6},{type:'shooter',count:3}], spawnInterval:1800 },
      { enemies:[{type:'tank',count:2},{type:'rusher',count:6}],   spawnInterval:2000 },
    ]},
  { id:4, name:'SECTOR 4', bgColor:'#1a1000', gridColor:'#2a2000', bossLevel:false,
    waves:[
      { enemies:[{type:'rusher',count:10}], spawnInterval:1200 },
      { enemies:[{type:'shooter',count:5},{type:'tank',count:2}], spawnInterval:2000 },
      { enemies:[{type:'grunt',count:8},{type:'rusher',count:5},{type:'shooter',count:3}], spawnInterval:1500 },
      { enemies:[{type:'tank',count:4}], spawnInterval:2500 },
    ]},
  { id:5, name:'SECTOR 5', bgColor:'#1a0000', gridColor:'#2a0000', bossLevel:false,
    waves:[
      { enemies:[{type:'rusher',count:12},{type:'shooter',count:6}], spawnInterval:1200 },
      { enemies:[{type:'tank',count:5},{type:'shooter',count:5}],    spawnInterval:1800 },
      { enemies:[{type:'grunt',count:15}], spawnInterval:1000 },
    ]},
  { id:6, name:'NEMESIS CORE', bgColor:'#100010', gridColor:'#200020', bossLevel:true, waves:[] },
];

// ─── State ────────────────────────────────────────────────────────────────────
let STATE = 'MENU';
let score = 0;
let highScore = +localStorage.getItem('topdownHS') || 0;
let currentLevelIdx = 0;
let screenFlash = 0; // 0-1, fades

function setState(s) {
  STATE = s;
  if (s === 'PLAYING') {
    if (LEVELS[currentLevelIdx].bossLevel) spawnBoss();
    else startWave();
  }
  if (s === 'BOSS_INTRO') {
    sndBossIntro();
    setTimeout(() => setState('PLAYING'), 2500);
  }
  if (s === 'LEVEL_COMPLETE') {
    sndLevelComplete();
    levelCompleteTimer = 3000;
    score += 500 * LEVELS[currentLevelIdx].id;
  }
  if (s === 'GAME_OVER' || s === 'VICTORY') {
    if (score > highScore) { highScore = score; localStorage.setItem('topdownHS', highScore); }
  }
}

function onEscape() {
  if (STATE === 'PLAYING') setState('PAUSED');
  else if (STATE === 'PAUSED') setState('PLAYING');
}

// ─── Scanline overlay (pre-rendered) ─────────────────────────────────────────
const scanCanvas = document.createElement('canvas');
scanCanvas.width = canvas.width; scanCanvas.height = canvas.height;
const sctx = scanCanvas.getContext('2d');
sctx.fillStyle = 'rgba(0,0,0,0.10)';
for (let y = 0; y < canvas.height; y += 2) sctx.fillRect(0, y, canvas.width, 1);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist2(a, b) { return (a.x-b.x)**2 + (a.y-b.y)**2; }
function overlap(a, b) { return dist2(a,b) < (a.radius+b.radius)**2; }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }

function polygon(ctx, x, y, r, sides, angle) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (i / sides) * Math.PI * 2;
    i === 0 ? ctx.moveTo(x + Math.cos(a)*r, y + Math.sin(a)*r)
            : ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
  }
  ctx.closePath();
}

function spawnEdgePos(margin) {
  const edge = Math.floor(Math.random() * 4);
  switch(edge) {
    case 0: return { x: rnd(0, canvas.width),  y: -margin };
    case 1: return { x: canvas.width + margin,  y: rnd(0, canvas.height) };
    case 2: return { x: rnd(0, canvas.width),  y: canvas.height + margin };
    default:return { x: -margin,               y: rnd(0, canvas.height) };
  }
}

// ─── Entities ─────────────────────────────────────────────────────────────────
class Player {
  constructor() {
    this.x = canvas.width / 2; this.y = canvas.height / 2;
    this.vx = 0; this.vy = 0;
    this.radius = 14;
    this.speed  = 180;
    this.angle  = 0;
    this.hp     = 5; this.maxHp = 5;
    this.dead   = false;
    this.shootCooldown  = 0;
    this.invincibleTimer = 0;
    this.walkTimer = 0; this.walkFrame = 0;
    this.muzzleFlash = 0;
  }
  update(dt) {
    const ms = dt / 1000;
    let dx = 0, dy = 0;
    if (keys['ArrowLeft']  || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
    if (keys['ArrowUp']    || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown']  || keys['KeyS']) dy += 1;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const moving = dx !== 0 || dy !== 0;
    this.x = clamp(this.x + (dx/len)*this.speed*ms, this.radius, canvas.width  - this.radius);
    this.y = clamp(this.y + (dy/len)*this.speed*ms, this.radius, canvas.height - this.radius);

    this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    this.shootCooldown   = Math.max(0, this.shootCooldown   - dt);
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.muzzleFlash     = Math.max(0, this.muzzleFlash     - dt);

    if (moving) {
      this.walkTimer += dt;
      if (this.walkTimer > 120) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 4; }
    } else {
      this.walkFrame = 0; this.walkTimer = 0;
    }

    if ((mouse.down || mouse.clicked) && this.shootCooldown <= 0) this.shoot();
  }
  shoot() {
    const gx = this.x + Math.cos(this.angle) * 22;
    const gy = this.y + Math.sin(this.angle) * 22;
    bullets.push(new Bullet(gx, gy, this.angle, true));
    this.shootCooldown = 160;
    this.muzzleFlash   = 60;
    sndShoot();
  }
  hit(dmg) {
    if (this.invincibleTimer > 0) return;
    this.hp -= dmg;
    this.invincibleTimer = 900;
    sndPlayerHit();
    screenFlash = 0.4;
    if (this.hp <= 0) { this.dead = true; setState('GAME_OVER'); }
  }
  draw() {
    const px = Math.round(this.x), py = Math.round(this.y);
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 80) % 2 === 0) return;

    const legOff = [0, -3, 0, 3][this.walkFrame];

    // Body
    ctx.save();
    ctx.translate(px, py);

    // Legs
    ctx.fillStyle = '#4488aa';
    ctx.fillRect(-6, 4 + legOff, 5, 8);
    ctx.fillRect(1,  4 - legOff, 5, 8);

    // Torso
    ctx.fillStyle = '#0f9b8e';
    ctx.shadowColor = '#0f9b8e'; ctx.shadowBlur = 10;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.shadowBlur = 0;

    // Visor
    ctx.fillStyle = '#a8d8ea';
    ctx.fillRect(-4, -4, 8, 5);

    // Gun arm
    ctx.rotate(this.angle);
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(8, -3, 18, 6);
    ctx.fillStyle = '#888888';
    ctx.fillRect(20, -2, 6, 4);

    // Muzzle flash
    if (this.muzzleFlash > 0) {
      ctx.strokeStyle = '#ffee00';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 8;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(26 + Math.cos(a)*2, Math.sin(a)*2);
        ctx.lineTo(26 + Math.cos(a)*8, Math.sin(a)*8);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

class Bullet {
  constructor(x, y, angle, fromPlayer) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * (fromPlayer ? 480 : 220);
    this.vy = Math.sin(angle) * (fromPlayer ? 480 : 220);
    this.radius     = fromPlayer ? 4 : 5;
    this.fromPlayer = fromPlayer;
    this.damage     = 1;
    this.dead       = false;
    this.color      = fromPlayer ? '#a8d8ea' : '#ffff00';
  }
  update(dt) {
    const ms = dt / 1000;
    this.x += this.vx * ms; this.y += this.vy * ms;
    if (this.x < -10 || this.x > canvas.width+10 || this.y < -10 || this.y > canvas.height+10) this.dead = true;
  }
  draw() {
    ctx.shadowColor = this.color; ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(Math.round(this.x), Math.round(this.y), this.radius, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    const a = Math.random() * Math.PI * 2;
    const s = rnd(60, 200);
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
    this.life = 1; this.decay = rnd(1.5, 3.5);
    this.size  = rnd(2, 5);
    this.color = color;
    this.dead  = false;
  }
  update(dt) {
    const ms = dt / 1000;
    this.x += this.vx * ms; this.y += this.vy * ms;
    this.vx *= 0.95; this.vy *= 0.95;
    this.life -= this.decay * ms;
    if (this.life <= 0) this.dead = true;
  }
  draw() {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle   = this.color;
    const s = this.size * this.life;
    ctx.fillRect(Math.round(this.x - s/2), Math.round(this.y - s/2), Math.round(s), Math.round(s));
    ctx.globalAlpha = 1;
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

// ─── Enemy Base ───────────────────────────────────────────────────────────────
class Enemy {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.dead   = false;
    this.hp     = 1; this.maxHp = 1;
    this.speed  = 80;
    this.radius = 12;
    this.color  = '#ff4d6d';
    this.scoreValue = 100;
    this.damage = 1;
    this.angle  = 0;
  }
  aimAt(target) {
    const dx = target.x - this.x, dy = target.y - this.y;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const jitter = rnd(-0.26, 0.26);
    this.vx = (dx/len) * this.speed * Math.cos(jitter) - (dy/len) * this.speed * Math.sin(jitter);
    this.vy = (dx/len) * this.speed * Math.sin(jitter) + (dy/len) * this.speed * Math.cos(jitter);
  }
  moveToward(target, dt) {
    const ms = dt / 1000;
    this.x += this.vx * ms; this.y += this.vy * ms;
    this.angle += 0.03 * dt / 16;
  }
  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) this.die();
  }
  die() {
    this.dead = true;
    score += this.scoreValue;
    spawnParticles(this.x, this.y, this.color, 14);
    sndEnemyDeath();
  }
  drawHpBar() {
    if (this.hp >= this.maxHp) return;
    const w = this.radius * 2;
    ctx.fillStyle = '#333';
    ctx.fillRect(Math.round(this.x - this.radius), Math.round(this.y - this.radius - 8), w, 4);
    ctx.fillStyle = '#0f9';
    ctx.fillRect(Math.round(this.x - this.radius), Math.round(this.y - this.radius - 8), Math.round(w * this.hp / this.maxHp), 4);
  }
}

class Grunt extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.hp = this.maxHp = 2; this.speed = 80; this.radius = 12;
    this.color = '#ff4d6d'; this.scoreValue = 100;
    this.aimAt(player);
  }
  update(dt) { this.moveToward(player, dt); }
  draw() {
    const px = Math.round(this.x), py = Math.round(this.y), r = this.radius;
    ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    polygon(ctx, px, py, r, 4, this.angle);
    ctx.fill();
    ctx.strokeStyle = '#ff9999'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    this.drawHpBar();
  }
}

class Rusher extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.hp = this.maxHp = 1; this.speed = 155; this.radius = 10;
    this.color = '#ff9f1c'; this.scoreValue = 150; this.damage = 1;
    this.aimAt(player);
    this.pulse = 0;
  }
  update(dt) {
    this.moveToward(player, dt);
    this.pulse += dt * 0.012;
  }
  draw() {
    const px = Math.round(this.x), py = Math.round(this.y);
    const r = this.radius + Math.sin(this.pulse) * 2;
    ctx.shadowColor = this.color; ctx.shadowBlur = 14;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
    // arrow indicator
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const a = Math.atan2(this.vy, this.vx);
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(a)*r*0.3, py + Math.sin(a)*r*0.3);
    ctx.lineTo(px + Math.cos(a)*r*0.9, py + Math.sin(a)*r*0.9);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

class Tank extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.hp = this.maxHp = 8; this.speed = 45; this.radius = 18;
    this.color = '#4cc9f0'; this.scoreValue = 300; this.damage = 2;
    this.turretAngle = 0;
    this.aimAt(player);
  }
  update(dt) {
    this.moveToward(player, dt);
    this.turretAngle += 0.025 * dt / 16;
  }
  draw() {
    const px = Math.round(this.x), py = Math.round(this.y), r = this.radius;
    ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    polygon(ctx, px, py, r, 6, this.angle);
    ctx.fill();
    ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 3; ctx.stroke();
    // turret
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(this.turretAngle)*r*0.9, py + Math.sin(this.turretAngle)*r*0.9);
    ctx.stroke();
    ctx.shadowBlur = 0;
    this.drawHpBar();
  }
}

class Shooter extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.hp = this.maxHp = 3; this.speed = 50; this.radius = 12;
    this.color = '#c77dff'; this.scoreValue = 250; this.damage = 1;
    this.shootTimer = 0; this.shootInterval = 2200;
    this.eyeBlink = 0;
    this.aimAt(player);
  }
  update(dt) {
    this.moveToward(player, dt);
    this.shootTimer += dt;
    this.eyeBlink    = Math.max(0, this.eyeBlink - dt);
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      bullets.push(new Bullet(this.x, this.y, a, false));
      sndEnemyShoot();
      this.eyeBlink = 200;
    }
  }
  draw() {
    const px = Math.round(this.x), py = Math.round(this.y), r = this.radius;
    ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.fillRect(px - r, py - r, r*2, r*2);
    ctx.strokeStyle = '#e0aaff'; ctx.lineWidth = 2; ctx.strokeRect(px-r, py-r, r*2, r*2);
    // eye
    ctx.fillStyle = this.eyeBlink > 0 ? '#ff0000' : '#ffffff';
    ctx.shadowColor = this.eyeBlink > 0 ? '#ff0000' : '#ffffff';
    ctx.beginPath(); ctx.arc(px, py - 1, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    this.drawHpBar();
  }
}

// ─── Boss ─────────────────────────────────────────────────────────────────────
class Boss extends Enemy {
  constructor() {
    const cx = canvas.width/2, cy = canvas.height/2;
    super(cx, cy - 150);
    this.hp = this.maxHp = 120; this.speed = 30; this.radius = 40;
    this.color = '#f72585'; this.scoreValue = 5000; this.damage = 2;
    this.orbitAngle = 0;
    this.shootTimer = 0;
    this.phase = 1;
    this.escortTimer = 8000;
    this.satellites = [0, 1.57, 3.14, 4.71].map(a => ({ angle: a, dist: 65, r: 10 }));
    this.phase2Hazards = [];
  }
  update(dt) {
    const ms = dt / 1000;
    this.orbitAngle += (this.phase === 1 ? 0.4 : 0.8) * ms;
    const cx = canvas.width/2, cy = canvas.height/2;
    this.x = cx + Math.cos(this.orbitAngle) * 160;
    this.y = cy + Math.sin(this.orbitAngle) * 100;

    this.shootTimer += dt;
    const interval = this.phase === 1 ? 1500 : 800;
    if (this.shootTimer >= interval) {
      this.shootTimer = 0;
      const base = Math.atan2(player.y - this.y, player.x - this.x);
      const spread = this.phase === 1 ? 3 : 5;
      for (let i = 0; i < spread; i++) {
        const a = base + (i - (spread-1)/2) * 0.35;
        bullets.push(new Bullet(this.x, this.y, a, false));
      }
      sndEnemyShoot();
    }

    if (this.phase === 1) {
      this.escortTimer -= dt;
      if (this.escortTimer <= 0) {
        this.escortTimer = 8000;
        const p = spawnEdgePos(30);
        enemies.push(new Grunt(p.x, p.y));
        enemies.push(new Grunt(p.x + rnd(-40,40), p.y + rnd(-40,40)));
      }
      this.satellites.forEach(s => { s.angle += 1.2 * ms; });

      if (this.hp <= 60) {
        this.phase = 2;
        this.color = '#ff0040';
        screenFlash = 0.8;
        this.phase2Hazards = this.satellites.map(s => ({
          x: this.x + Math.cos(s.angle)*s.dist,
          y: this.y + Math.sin(s.angle)*s.dist,
          angle: s.angle, speed: 1.8,
        }));
      }
    } else {
      this.phase2Hazards.forEach(h => {
        h.angle += h.speed * ms;
        h.x = canvas.width/2  + Math.cos(h.angle) * 200;
        h.y = canvas.height/2 + Math.sin(h.angle) * 140;
        if (overlap({ x: h.x, y: h.y, radius: 10 }, player)) player.hit(1);
      });
    }
  }
  die() {
    this.dead = true;
    score += this.scoreValue;
    for (let i = 0; i < 40; i++) particles.push(new Particle(this.x + rnd(-30,30), this.y + rnd(-30,30), this.color));
    sndEnemyDeath();
    setState('VICTORY');
  }
  draw() {
    const px = Math.round(this.x), py = Math.round(this.y), r = this.radius;
    ctx.shadowColor = this.color; ctx.shadowBlur = 20;
    ctx.fillStyle = this.color;
    polygon(ctx, px, py, r, 8, this.orbitAngle);
    ctx.fill();
    ctx.strokeStyle = '#ffaad4'; ctx.lineWidth = 3; ctx.stroke();

    // inner core
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(px, py, r*0.35, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    if (this.phase === 1) {
      this.satellites.forEach(s => {
        const sx = Math.round(this.x + Math.cos(s.angle)*s.dist);
        const sy = Math.round(this.y + Math.sin(s.angle)*s.dist);
        ctx.shadowColor = '#ff90c8'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff90c8';
        ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    } else {
      this.phase2Hazards.forEach(h => {
        ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff0';
        ctx.beginPath(); ctx.arc(Math.round(h.x), Math.round(h.y), 10, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    this.drawHpBar();
  }
  drawHpBar() {
    const w = 200;
    const bx = canvas.width/2 - w/2, by = canvas.height - 40;
    ctx.fillStyle = '#300'; ctx.fillRect(bx, by, w, 14);
    ctx.fillStyle = this.phase === 1 ? '#f72585' : '#ff0040';
    ctx.fillRect(bx, by, Math.round(w * this.hp/this.maxHp), 14);
    ctx.strokeStyle = '#ff90c8'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, w, 14);
    ctx.fillStyle = '#fff'; ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEMESIS CORE', canvas.width/2, by - 6);
  }
}

// ─── Wave / Spawn System ──────────────────────────────────────────────────────
let enemies   = [];
let bullets   = [];
let particles = [];
let player    = new Player();

let currentWaveIdx = 0;
let spawnQueue     = [];
let spawnTimer     = 0;
let waveActive     = false;
let levelCompleteTimer = 0;

function buildQueue(waveDef) {
  const q = [];
  waveDef.enemies.forEach(e => {
    for (let i = 0; i < e.count; i++) q.push(e.type);
  });
  // shuffle
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  return q;
}

function spawnEnemy(type) {
  const p = spawnEdgePos(30);
  switch(type) {
    case 'grunt':   enemies.push(new Grunt(p.x, p.y));   break;
    case 'rusher':  enemies.push(new Rusher(p.x, p.y));  break;
    case 'tank':    enemies.push(new Tank(p.x, p.y));    break;
    case 'shooter': enemies.push(new Shooter(p.x, p.y)); break;
  }
}

function spawnBoss() { enemies.push(new Boss()); }

function startWave() {
  const level = LEVELS[currentLevelIdx];
  if (currentWaveIdx >= level.waves.length) {
    setState('LEVEL_COMPLETE');
    return;
  }
  const waveDef = level.waves[currentWaveIdx];
  spawnQueue = buildQueue(waveDef);
  spawnTimer = 0;
  waveActive = true;
}

function updateWaveRunner(dt) {
  if (!waveActive) return;
  const level   = LEVELS[currentLevelIdx];
  if (level.bossLevel) return;
  const waveDef = level.waves[currentWaveIdx];

  spawnTimer += dt;
  if (spawnQueue.length > 0 && spawnTimer >= waveDef.spawnInterval) {
    spawnTimer = 0;
    spawnEnemy(spawnQueue.pop());
  }

  if (spawnQueue.length === 0 && enemies.filter(e => !e.dead).length === 0) {
    waveActive = false;
    currentWaveIdx++;
    setTimeout(() => {
      if (STATE === 'PLAYING') startWave();
    }, 1200);
  }
}

// ─── Collision ────────────────────────────────────────────────────────────────
function doCollisions() {
  // player bullets vs enemies
  for (const b of bullets) {
    if (!b.fromPlayer || b.dead) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      if (overlap(b, e)) {
        b.dead = true;
        e.takeDamage(b.damage);
        spawnParticles(b.x, b.y, e.color, 4);
        break;
      }
    }
  }
  // enemy bullets vs player
  for (const b of bullets) {
    if (b.fromPlayer || b.dead) continue;
    if (overlap(b, player)) {
      b.dead = true;
      player.hit(b.damage);
    }
  }
  // enemies vs player
  for (const e of enemies) {
    if (e.dead) continue;
    if (overlap(e, player)) player.hit(e.damage);
  }
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawBackground() {
  const level = LEVELS[currentLevelIdx];
  ctx.fillStyle = STATE === 'MENU' ? '#0d0d1a' : level.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gc = STATE === 'MENU' ? '#1a1a3a' : level.gridColor;
  ctx.strokeStyle = gc; ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
}

function drawHUD() {
  // Health bar
  const barW = 120, barH = 12;
  ctx.fillStyle = '#300'; ctx.fillRect(16, 16, barW, barH);
  ctx.fillStyle = '#e94560';
  ctx.fillRect(16, 16, Math.round(barW * player.hp / player.maxHp), barH);
  ctx.strokeStyle = '#ff8899'; ctx.lineWidth = 2; ctx.strokeRect(16, 16, barW, barH);

  ctx.fillStyle = '#a8d8ea';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HP', 16, 44);

  // Score
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + score, canvas.width - 16, 28);
  ctx.fillStyle = '#666';
  ctx.fillText('BEST  ' + highScore, canvas.width - 16, 44);

  // Level
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a8d8ea';
  ctx.fillText(LEVELS[currentLevelIdx].name, canvas.width/2, 28);

  // Wave
  if (!LEVELS[currentLevelIdx].bossLevel) {
    const wTotal = LEVELS[currentLevelIdx].waves.length;
    ctx.fillStyle = '#555';
    ctx.fillText('WAVE ' + Math.min(currentWaveIdx+1, wTotal) + '/' + wTotal, canvas.width/2, 44);
  }
}

function drawCenteredText(text, y, size, color, shadow) {
  ctx.font = size + 'px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 20; }
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width/2, y);
  ctx.shadowBlur = 0;
}

function drawButton(text, cx, cy, w, h) {
  ctx.strokeStyle = '#0f9b8e'; ctx.lineWidth = 2;
  ctx.fillStyle   = 'rgba(15,155,142,0.15)';
  ctx.fillRect(cx - w/2, cy - h/2, w, h);
  ctx.strokeRect(cx - w/2, cy - h/2, w, h);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f9b8e';
  ctx.fillText(text, cx, cy + 4);
}

// ─── Screens ──────────────────────────────────────────────────────────────────
function renderMenu() {
  drawBackground();
  // Title
  drawCenteredText('SECTOR ZERO', 160, 28, '#e94560', '#e94560');
  drawCenteredText('TOP-DOWN SHOOTER', 200, 10, '#a8d8ea', null);

  drawButton('[ PRESS ENTER OR CLICK TO START ]', canvas.width/2, 300, 440, 44);

  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#555';
  ctx.fillText('WASD / ARROWS TO MOVE', canvas.width/2, 380);
  ctx.fillText('MOUSE TO AIM  |  CLICK TO SHOOT', canvas.width/2, 404);
  ctx.fillText('ESC TO PAUSE', canvas.width/2, 428);

  if (highScore > 0) {
    ctx.fillStyle = '#a8d8ea';
    ctx.fillText('BEST SCORE: ' + highScore, canvas.width/2, 480);
  }

  ctx.drawImage(scanCanvas, 0, 0);
}

function renderPaused() {
  // dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCenteredText('PAUSED', 220, 22, '#a8d8ea', '#a8d8ea');
  drawButton('[ RESUME  (ESC) ]',    canvas.width/2, 300, 280, 40);
  drawButton('[ MAIN MENU ]',        canvas.width/2, 360, 280, 40);
  ctx.drawImage(scanCanvas, 0, 0);
}

function renderLevelComplete() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCenteredText('SECTOR CLEAR!', 200, 18, '#0f9b8e', '#0f9b8e');
  drawCenteredText('SCORE  ' + score, 260, 12, '#a8d8ea', null);
  drawCenteredText('NEXT SECTOR INCOMING...', 320, 8, '#555', null);
  ctx.drawImage(scanCanvas, 0, 0);
}

function renderBossIntro() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCenteredText('WARNING', 220, 28, '#ff0040', '#ff0040');
  drawCenteredText('BOSS DETECTED', 280, 14, '#f72585', '#f72585');
  drawCenteredText('NEMESIS CORE', 320, 10, '#fff', null);
  ctx.drawImage(scanCanvas, 0, 0);
}

function renderGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCenteredText('GAME OVER', 200, 24, '#e94560', '#e94560');
  drawCenteredText('SCORE  ' + score, 270, 12, '#a8d8ea', null);
  if (score >= highScore && score > 0) drawCenteredText('NEW BEST!', 310, 10, '#ffff00', '#ffff00');
  drawButton('[ PRESS ENTER TO RETRY ]', canvas.width/2, 380, 360, 40);
  ctx.drawImage(scanCanvas, 0, 0);
}

function renderVictory() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCenteredText('VICTORY!', 180, 28, '#0f9b8e', '#0f9b8e');
  drawCenteredText('YOU DEFEATED THE', 240, 10, '#a8d8ea', null);
  drawCenteredText('NEMESIS CORE', 268, 10, '#f72585', '#f72585');
  drawCenteredText('FINAL SCORE  ' + score, 330, 12, '#ffff00', '#ffff00');
  if (score >= highScore) drawCenteredText('NEW RECORD!', 370, 8, '#0f9', '#0f9');
  drawButton('[ PRESS ENTER TO MENU ]', canvas.width/2, 440, 360, 40);
  ctx.drawImage(scanCanvas, 0, 0);
}

// ─── Main Loop ────────────────────────────────────────────────────────────────
let lastTime = 0;

function update(dt) {
  if (STATE === 'PLAYING') {
    player.update(dt);
    enemies.forEach(e => e.update(dt));
    bullets.forEach(b => b.update(dt));
    particles.forEach(p => p.update(dt));
    doCollisions();
    updateWaveRunner(dt);

    enemies   = enemies.filter(e => !e.dead);
    bullets   = bullets.filter(b => !b.dead);
    particles = particles.filter(p => !p.dead);
    screenFlash = Math.max(0, screenFlash - dt * 0.003);
    mouse.clicked = false;
  }
  if (STATE === 'LEVEL_COMPLETE') {
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    levelCompleteTimer -= dt;
    if (levelCompleteTimer <= 0) {
      currentLevelIdx++;
      currentWaveIdx = 0;
      if (currentLevelIdx >= LEVELS.length) { setState('VICTORY'); return; }
      if (LEVELS[currentLevelIdx].bossLevel) setState('BOSS_INTRO');
      else setState('PLAYING');
    }
  }
  if (STATE === 'MENU' || STATE === 'GAME_OVER' || STATE === 'VICTORY' || STATE === 'PAUSED') {
    if (keys['Enter'] || (mouse.clicked && STATE === 'MENU')) {
      if (STATE === 'MENU' || STATE === 'GAME_OVER' || STATE === 'VICTORY') startGame();
      mouse.clicked = false;
    }
  }
}

function startGame() {
  score          = 0;
  currentLevelIdx = 0;
  currentWaveIdx  = 0;
  enemies  = []; bullets = []; particles = [];
  player   = new Player();
  waveActive = false;
  setState('PLAYING');
}

function render() {
  ctx.imageSmoothingEnabled = false;
  drawBackground();

  if (STATE === 'MENU') { renderMenu(); return; }

  particles.forEach(p => p.draw());
  enemies.forEach(e => e.draw());
  bullets.forEach(b => b.draw());

  if (STATE !== 'GAME_OVER' && STATE !== 'VICTORY') player.draw();

  // screen flash
  if (screenFlash > 0) {
    ctx.fillStyle = `rgba(255,50,50,${screenFlash * 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawHUD();
  ctx.drawImage(scanCanvas, 0, 0);

  if (STATE === 'PAUSED')         renderPaused();
  if (STATE === 'LEVEL_COMPLETE') renderLevelComplete();
  if (STATE === 'BOSS_INTRO')     renderBossIntro();
  if (STATE === 'GAME_OVER')      renderGameOver();
  if (STATE === 'VICTORY')        renderVictory();
}

// click on pause menu buttons
canvas.addEventListener('click', e => {
  if (STATE !== 'PAUSED') return;
  const r  = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width, sy = canvas.height / r.height;
  const cx = (e.clientX - r.left) * sx;
  const cy = (e.clientY - r.top)  * sy;
  const mid = canvas.width / 2;
  if (cx > mid-140 && cx < mid+140 && cy > 280 && cy < 320) setState('PLAYING');
  if (cx > mid-140 && cx < mid+140 && cy > 340 && cy < 380) { STATE = 'MENU'; }
});

function loop(ts) {
  const dt = Math.min(ts - lastTime, 100);
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });

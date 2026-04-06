// ── Banana Tennis Runner ──────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ── State ────────────────────────────────────────────────────────
let gameState = 'start'; // start | playing | over
let score = 0;
let highScore = parseInt(localStorage.getItem('btr_high') || '0');
let speed = 6;
let frameCount = 0;
let groundY = H - 80;
let difficulty = 1;

// ── Banana Player ────────────────────────────────────────────────
const player = {
    x: 120,
    y: groundY,
    w: 44,
    h: 72,
    vy: 0,
    jumping: false,
    sliding: false,
    slideTimer: 0,
    smashing: false,
    smashTimer: 0,
    runFrame: 0,
    runTimer: 0,
};

const GRAVITY = 0.65;
const JUMP_FORCE = -14;
const SLIDE_DURATION = 30;
const SMASH_DURATION = 15;

// ── Background layers ────────────────────────────────────────────
let bgOffset = 0;
let courtOffset = 0;

// Mountains
const mountains = [];
for (let i = 0; i < 5; i++) {
    mountains.push({
        x: i * 250,
        w: 200 + Math.random() * 150,
        h: 80 + Math.random() * 60,
    });
}

// Palm trees (background)
const palms = [];
for (let i = 0; i < 8; i++) {
    palms.push({
        x: i * 140 + Math.random() * 60,
        h: 100 + Math.random() * 40,
    });
}

// Court lines
const courtLines = [];
for (let i = 0; i < 12; i++) {
    courtLines.push(i * 100);
}

// ── Obstacles & Collectibles ─────────────────────────────────────
let obstacles = [];
let collectibles = [];
let particles = [];

function spawnObstacle() {
    const types = ['net', 'ball_machine', 'cone', 'hurdle'];
    const type = types[Math.floor(Math.random() * types.length)];
    const obs = { x: W + 50, type };
    switch (type) {
        case 'net':
            obs.y = groundY - 50;
            obs.w = 20;
            obs.h = 50;
            break;
        case 'ball_machine':
            obs.y = groundY - 45;
            obs.w = 40;
            obs.h = 45;
            break;
        case 'cone':
            obs.y = groundY - 35;
            obs.w = 24;
            obs.h = 35;
            break;
        case 'hurdle':
            obs.y = groundY - 55;
            obs.w = 50;
            obs.h = 10;
            break;
    }
    obstacles.push(obs);
}

function spawnCollectible() {
    const isHigh = Math.random() > 0.5;
    collectibles.push({
        x: W + 50,
        y: isHigh ? groundY - 110 : groundY - 50,
        r: 12,
        type: 'tennis_ball',
        bobOffset: Math.random() * Math.PI * 2,
    });
}

// ── Drawing helpers ──────────────────────────────────────────────

function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, groundY);
    grad.addColorStop(0, '#4da6e8');
    grad.addColorStop(0.6, '#7ec8e3');
    grad.addColorStop(1, '#b5e5f5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, groundY);
}

function drawMountains() {
    ctx.fillStyle = '#8b9dc3';
    mountains.forEach(m => {
        let mx = ((m.x - bgOffset * 0.2) % (250 * 5) + 250 * 5) % (250 * 5) - 100;
        ctx.beginPath();
        ctx.moveTo(mx, groundY - 60);
        ctx.lineTo(mx + m.w / 2, groundY - 60 - m.h);
        ctx.lineTo(mx + m.w, groundY - 60);
        ctx.closePath();
        ctx.fill();
    });
    // Snow caps
    ctx.fillStyle = '#e8e8e8';
    mountains.forEach(m => {
        let mx = ((m.x - bgOffset * 0.2) % (250 * 5) + 250 * 5) % (250 * 5) - 100;
        ctx.beginPath();
        ctx.moveTo(mx + m.w / 2 - 15, groundY - 60 - m.h + 18);
        ctx.lineTo(mx + m.w / 2, groundY - 60 - m.h);
        ctx.lineTo(mx + m.w / 2 + 15, groundY - 60 - m.h + 18);
        ctx.closePath();
        ctx.fill();
    });
}

function drawPalms() {
    palms.forEach(p => {
        let px = ((p.x - bgOffset * 0.4) % (140 * 8 + 60) + 140 * 8 + 200) % (140 * 8 + 200) - 80;
        // Trunk
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(px, groundY - 55);
        ctx.quadraticCurveTo(px + 5, groundY - 55 - p.h * 0.5, px + 3, groundY - 55 - p.h);
        ctx.stroke();
        // Leaves
        const top = groundY - 55 - p.h;
        for (let a = 0; a < 6; a++) {
            const angle = (a / 6) * Math.PI * 2 + frameCount * 0.01;
            ctx.strokeStyle = '#2d8a4e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(px + 3, top);
            const ex = px + 3 + Math.cos(angle) * 35;
            const ey = top + Math.sin(angle) * 20 + 5;
            ctx.quadraticCurveTo(px + 3 + Math.cos(angle) * 20, top - 8, ex, ey);
            ctx.stroke();
        }
    });
}

function drawFence() {
    const fenceY = groundY - 55;
    ctx.strokeStyle = '#3a7a3a';
    ctx.lineWidth = 1.5;
    // Horizontal wires
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, fenceY + i * 14);
        ctx.lineTo(W, fenceY + i * 14);
        ctx.stroke();
    }
    // Posts
    ctx.fillStyle = '#555';
    for (let i = 0; i < 14; i++) {
        let px = ((i * 80 - bgOffset * 0.6) % (80 * 14) + 80 * 14) % (80 * 14);
        ctx.fillRect(px - 2, fenceY - 5, 4, 60);
    }
}

function drawCourt() {
    // Main court surface (green)
    ctx.fillStyle = '#3a8a3a';
    ctx.fillRect(0, groundY, W, H - groundY);

    // Running lane (orange/clay)
    ctx.fillStyle = '#cc6633';
    ctx.fillRect(0, groundY, W, 12);

    // Court lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    courtLines.forEach((lx, i) => {
        let cx = ((lx - courtOffset) % 1200 + 1200) % 1200;
        // Perspective lines on court
        ctx.beginPath();
        ctx.moveTo(cx, groundY + 12);
        ctx.lineTo(cx - 20, H);
        ctx.stroke();
    });

    // Horizontal court line
    ctx.beginPath();
    ctx.moveTo(0, groundY + 40);
    ctx.lineTo(W, groundY + 40);
    ctx.stroke();

    // "CC TENNIS CLUB" text on court
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    let textX = ((450 - courtOffset * 0.5) % 900 + 900) % 900;
    ctx.fillText('CC TENNIS CLUB', textX, groundY + 65);
    ctx.restore();
}

function drawBanana() {
    const p = player;
    let bx = p.x;
    let by = p.y;
    let bh = p.h;
    let bw = p.w;

    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);

    // Slide: squash and translate down
    if (p.sliding) {
        ctx.scale(1.4, 0.5);
        ctx.translate(0, bh * 0.35);
    }

    // Smash animation: tilt forward
    if (p.smashing) {
        ctx.rotate(0.3);
    }

    // Run bob
    let bob = 0;
    if (!p.jumping && !p.sliding) {
        bob = Math.sin(p.runFrame * 0.3) * 3;
    }

    const cx = 0;
    const cy = bob;

    // ── Shadow on ground ──
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, groundY + bh - 2, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Banana body (curved yellow shape) ──
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 32);
    // Right side curve
    ctx.quadraticCurveTo(cx + 18, cy - 28, cx + 16, cy - 5);
    ctx.quadraticCurveTo(cx + 14, cy + 15, cx + 6, cy + 28);
    // Bottom
    ctx.quadraticCurveTo(cx, cy + 33, cx - 6, cy + 28);
    // Left side curve
    ctx.quadraticCurveTo(cx - 14, cy + 15, cx - 16, cy - 5);
    ctx.quadraticCurveTo(cx - 18, cy - 28, cx - 10, cy - 32);
    ctx.closePath();
    ctx.fill();

    // Banana highlight
    ctx.fillStyle = 'rgba(255,255,200,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 10, 5, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Stem ──
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 32);
    ctx.quadraticCurveTo(cx - 2, cy - 44, cx + 3, cy - 42);
    ctx.quadraticCurveTo(cx + 2, cy - 36, cx - 2, cy - 32);
    ctx.closePath();
    ctx.fill();

    // Stem tip
    ctx.fillStyle = '#5a4510';
    ctx.beginPath();
    ctx.arc(cx, cy - 43, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── Headband ──
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 26, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Sunglasses ──
    ctx.fillStyle = '#222';
    // Left lens
    ctx.beginPath();
    ctx.ellipse(cx - 7, cy - 18, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right lens
    ctx.beginPath();
    ctx.ellipse(cx + 7, cy - 18, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bridge
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 18);
    ctx.lineTo(cx + 2, cy - 18);
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 18);
    ctx.lineTo(cx - 16, cy - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 13, cy - 18);
    ctx.lineTo(cx + 16, cy - 20);
    ctx.stroke();

    // ── Smile ──
    ctx.strokeStyle = '#6b5a00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // ── Arms & Racket ──
    // Left arm (on hip when not smashing)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy);
    if (p.smashing) {
        ctx.lineTo(cx - 22, cy - 12);
    } else {
        ctx.lineTo(cx - 18, cy + 8);
        ctx.lineTo(cx - 14, cy + 4);
    }
    ctx.stroke();

    // Right arm + racket
    const racketAngle = p.smashing
        ? -0.8 + (p.smashTimer / SMASH_DURATION) * 2.0
        : Math.sin(p.runFrame * 0.3) * 0.3 - 0.5;
    ctx.save();
    ctx.translate(cx + 14, cy - 2);
    ctx.rotate(racketAngle);

    // Arm
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16, -5);
    ctx.stroke();

    // Racket handle
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, -5);
    ctx.lineTo(26, -10);
    ctx.stroke();

    // Racket head
    ctx.strokeStyle = '#d4a76a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(32, -14, 10, 13, -0.3, 0, Math.PI * 2);
    ctx.stroke();

    // Strings
    ctx.strokeStyle = '#f0e68c';
    ctx.lineWidth = 0.5;
    for (let s = -2; s <= 2; s++) {
        ctx.beginPath();
        ctx.moveTo(32 + s * 3, -26);
        ctx.lineTo(32 + s * 3, -2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(22, -14 + s * 4);
        ctx.lineTo(42, -14 + s * 4);
        ctx.stroke();
    }
    ctx.restore();

    // ── Legs ──
    const legSwing = Math.sin(p.runFrame * 0.3) * 8;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    if (!p.sliding) {
        // Left leg
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 26);
        ctx.lineTo(cx - 5 - legSwing, cy + 36);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy + 26);
        ctx.lineTo(cx + 5 + legSwing, cy + 36);
        ctx.stroke();

        // ── White sneakers ──
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        // Left shoe
        ctx.beginPath();
        ctx.ellipse(cx - 5 - legSwing - 2, cy + 37, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Right shoe
        ctx.beginPath();
        ctx.ellipse(cx + 5 + legSwing - 2, cy + 37, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function drawObstacle(obs) {
    ctx.save();
    switch (obs.type) {
        case 'net':
            // Tennis net post
            ctx.fillStyle = '#888';
            ctx.fillRect(obs.x, obs.y, 4, obs.h);
            ctx.fillRect(obs.x + obs.w - 4, obs.y, 4, obs.h);
            // Net mesh
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y + i * 9);
                ctx.lineTo(obs.x + obs.w, obs.y + i * 9);
                ctx.stroke();
            }
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(obs.x + i * 7, obs.y);
                ctx.lineTo(obs.x + i * 7, obs.y + obs.h);
                ctx.stroke();
            }
            // White top tape
            ctx.fillStyle = '#fff';
            ctx.fillRect(obs.x, obs.y, obs.w, 3);
            break;

        case 'ball_machine':
            // Body
            ctx.fillStyle = '#4a6a8a';
            ctx.fillRect(obs.x + 5, obs.y + 10, 30, 35);
            // Barrel
            ctx.fillStyle = '#3a5a7a';
            ctx.beginPath();
            ctx.ellipse(obs.x + 20, obs.y + 8, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // Opening
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(obs.x + 20, obs.y + 5, 5, 0, Math.PI * 2);
            ctx.fill();
            // Wheels
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(obs.x + 10, obs.y + 45, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(obs.x + 30, obs.y + 45, 5, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'cone':
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.w / 2, obs.y);
            ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
            ctx.lineTo(obs.x, obs.y + obs.h);
            ctx.closePath();
            ctx.fill();
            // White stripes
            ctx.fillStyle = '#fff';
            ctx.fillRect(obs.x + 4, obs.y + 10, obs.w - 8, 4);
            ctx.fillRect(obs.x + 2, obs.y + 20, obs.w - 4, 4);
            break;

        case 'hurdle':
            ctx.fillStyle = '#cc3333';
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            // Posts
            ctx.fillStyle = '#999';
            ctx.fillRect(obs.x + 2, obs.y, 4, groundY - obs.y);
            ctx.fillRect(obs.x + obs.w - 6, obs.y, 4, groundY - obs.y);
            break;
    }
    ctx.restore();
}

function drawTennisBall(c) {
    const bob = Math.sin(frameCount * 0.08 + c.bobOffset) * 5;
    ctx.save();
    ctx.translate(c.x, c.y + bob);

    // Glow
    ctx.fillStyle = 'rgba(200, 255, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, c.r + 5, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    ctx.fillStyle = '#c8e632';
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();

    // Tennis ball seam
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, c.r - 2, -0.8, 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, c.r - 2, Math.PI - 0.8, Math.PI + 0.8);
    ctx.stroke();

    ctx.restore();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// ── Collision ────────────────────────────────────────────────────
function getPlayerHitbox() {
    const p = player;
    if (p.sliding) {
        return { x: p.x + 5, y: p.y + p.h * 0.5, w: p.w + 10, h: p.h * 0.5 };
    }
    return { x: p.x + 5, y: p.y, w: p.w - 10, h: p.h };
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectOverlap(cx, cy, cr, r) {
    const closestX = Math.max(r.x, Math.min(cx, r.x + r.w));
    const closestY = Math.max(r.y, Math.min(cy, r.y + r.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
}

// ── Particle effects ────────────────────────────────────────────
function spawnCollectParticles(x, y) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1,
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.5 ? '#c8e632' : '#ffd700',
        });
    }
}

function spawnSmashParticles() {
    const p = player;
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: p.x + p.w + 10,
            y: p.y + 10,
            vx: 3 + Math.random() * 5,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            size: 2 + Math.random() * 2,
            color: '#ffaa00',
        });
    }
}

// ── Input ────────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'ArrowUp') e.preventDefault();
    if (e.code === 'ArrowDown') e.preventDefault();

    if (gameState === 'start' && (e.code === 'Space' || e.code === 'Enter')) {
        startGame();
    }
    if (gameState === 'over' && e.code === 'Space') {
        startGame();
    }
    if (gameState === 'playing') {
        // Jump
        if ((e.code === 'Space' || e.code === 'ArrowUp') && !player.jumping && !player.sliding) {
            player.vy = JUMP_FORCE;
            player.jumping = true;
        }
        // Smash (space in air)
        if (e.code === 'Space' && player.jumping && !player.smashing) {
            player.smashing = true;
            player.smashTimer = SMASH_DURATION;
            spawnSmashParticles();
        }
        // Slide
        if (e.code === 'ArrowDown' && !player.jumping && !player.sliding) {
            player.sliding = true;
            player.slideTimer = SLIDE_DURATION;
        }
    }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// Touch support
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameState === 'start') { startGame(); return; }
    if (gameState === 'over') { startGame(); return; }
    if (gameState === 'playing') {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const ty = (touch.clientY - rect.top) / rect.height * H;
        if (ty > H * 0.6) {
            // Lower area = slide
            if (!player.jumping && !player.sliding) {
                player.sliding = true;
                player.slideTimer = SLIDE_DURATION;
            }
        } else {
            // Upper area = jump
            if (!player.jumping) {
                player.vy = JUMP_FORCE;
                player.jumping = true;
            } else if (!player.smashing) {
                player.smashing = true;
                player.smashTimer = SMASH_DURATION;
                spawnSmashParticles();
            }
        }
    }
});

// Button handlers
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// ── Game lifecycle ───────────────────────────────────────────────
function startGame() {
    gameState = 'playing';
    score = 0;
    speed = 6;
    difficulty = 1;
    frameCount = 0;
    obstacles = [];
    collectibles = [];
    particles = [];
    player.y = groundY;
    player.vy = 0;
    player.jumping = false;
    player.sliding = false;
    player.smashing = false;
    player.runFrame = 0;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('highScore').textContent = `Best: ${highScore}`;
}

function gameOver() {
    gameState = 'over';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('btr_high', highScore.toString());
    }
    document.getElementById('finalScore').textContent = `Score: ${Math.floor(score)}`;
    document.getElementById('gameOverScreen').style.display = 'flex';
    document.getElementById('highScore').textContent = `Best: ${highScore}`;
}

// ── Update ───────────────────────────────────────────────────────
function update() {
    if (gameState !== 'playing') return;
    frameCount++;
    score += 0.1 * difficulty;
    difficulty = 1 + Math.floor(score / 50) * 0.15;
    speed = 6 + difficulty * 1.2;

    // Scrolling
    bgOffset += speed;
    courtOffset += speed;

    // Player physics
    player.vy += GRAVITY;
    player.y += player.vy;
    if (player.y >= groundY) {
        player.y = groundY;
        player.vy = 0;
        player.jumping = false;
    }

    // Run animation
    if (!player.jumping) {
        player.runTimer++;
        if (player.runTimer > 3) {
            player.runTimer = 0;
            player.runFrame++;
        }
    }

    // Slide
    if (player.sliding) {
        player.slideTimer--;
        if (player.slideTimer <= 0) player.sliding = false;
    }

    // Smash
    if (player.smashing) {
        player.smashTimer--;
        if (player.smashTimer <= 0) player.smashing = false;
    }

    // Spawn obstacles
    if (frameCount % Math.max(50, 100 - Math.floor(difficulty * 8)) === 0) {
        spawnObstacle();
    }

    // Spawn collectibles
    if (frameCount % 80 === 0) {
        spawnCollectible();
    }

    // Update obstacles
    const phb = getPlayerHitbox();
    obstacles = obstacles.filter(obs => {
        obs.x -= speed;
        if (obs.x + obs.w < -50) return false;

        // Smash destroys obstacles
        if (player.smashing) {
            const smashBox = { x: player.x + player.w, y: player.y - 10, w: 40, h: 50 };
            if (rectsOverlap(smashBox, { x: obs.x, y: obs.y, w: obs.w, h: obs.h })) {
                score += 15;
                spawnCollectParticles(obs.x + obs.w / 2, obs.y + obs.h / 2);
                return false;
            }
        }

        // Collision
        if (rectsOverlap(phb, { x: obs.x, y: obs.y, w: obs.w, h: obs.h })) {
            gameOver();
            return true;
        }
        return true;
    });

    // Update collectibles
    collectibles = collectibles.filter(c => {
        c.x -= speed;
        if (c.x < -20) return false;
        const bob = Math.sin(frameCount * 0.08 + c.bobOffset) * 5;
        if (circleRectOverlap(c.x, c.y + bob, c.r, phb)) {
            score += 10;
            spawnCollectParticles(c.x, c.y);
            return false;
        }
        return true;
    });

    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        return p.life > 0;
    });

    // UI
    document.getElementById('score').textContent = `Score: ${Math.floor(score)}`;
}

// ── Render ───────────────────────────────────────────────────────
function render() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawMountains();
    drawFence();
    drawPalms();
    drawCourt();

    // Draw game objects
    obstacles.forEach(drawObstacle);
    collectibles.forEach(drawTennisBall);
    drawBanana();
    drawParticles();

    // Speed lines when fast
    if (difficulty > 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const ly = 100 + Math.random() * (groundY - 120);
            const lx = Math.random() * W;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx - 40 - difficulty * 5, ly);
            ctx.stroke();
        }
    }
}

// ── Game Loop ────────────────────────────────────────────────────
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Init
document.getElementById('highScore').textContent = `Best: ${highScore}`;
gameLoop();

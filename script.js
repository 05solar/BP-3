// --- Sprite sheet -----------------------------------------------------------
// burger-sprites.png is 1774x887, laid out as a 4x2 grid. The bounding boxes
// below were measured from the actual pixels so every piece sits flush.
const SHEET = { w: 1774, h: 887 };
const SCALE = 0.4;  // keeps the whole lane comfortably within one view
const OVERLAP = 0.15; // fraction of its own height a piece sinks into the one below

const BUN = { name: 'bun', sx: 24, sy: 194, sw: 396, sh: 134 };

const INGREDIENTS = [
  { name: 'patty',   sx: 464,  sy: 193, sw: 409, sh: 128 },
  { name: 'bacon',   sx: 902,  sy: 203, sw: 414, sh: 113 },
  { name: 'egg',     sx: 1354, sy: 209, sw: 388, sh: 112 },
  { name: 'lettuce', sx: 24,   sy: 590, sw: 419, sh: 152 },
  { name: 'onion',   sx: 443,  sy: 627, sw: 412, sh: 85  },
  { name: 'tomato',  sx: 919,  sy: 626, sw: 377, sh: 86  },
  { name: 'chicken', sx: 1344, sy: 605, sw: 413, sh: 122 }
];

function pieceWidth(sp)  { return sp.sw * SCALE; }
function pieceHeight(sp) { return sp.sh * SCALE; }

function applySprite(el, sp) {
  el.style.width = `${pieceWidth(sp)}px`;
  el.style.height = `${pieceHeight(sp)}px`;
  el.style.backgroundSize = `${SHEET.w * SCALE}px ${SHEET.h * SCALE}px`;
  el.style.backgroundPosition = `${-sp.sx * SCALE}px ${-sp.sy * SCALE}px`;
}

// --- Elements ---------------------------------------------------------------
const board        = document.querySelector('#board');
const camera       = document.querySelector('#camera');
const stack        = document.querySelector('#stack');
const falling      = document.querySelector('#falling');
const scoreEl      = document.querySelector('#score');
const gameoverEl   = document.querySelector('#gameover');
const finalScoreEl = document.querySelector('#finalScore');
const restartBtn   = document.querySelector('#restart');

// --- Game state -------------------------------------------------------------
const MOVE_BAND_TOP = 28; // y (from board top) where the ingredient slides
const MIN_TOP_GAP   = 150; // keep the tower's top at least this far from the top
const FLOOR         = 42; // lift the bun off the very bottom so it clears the hint

let boardW, boardH;
let contactY;   // world y (from board bottom) of the tower's top surface
let cameraShift; // how far the camera has slid down
let topCenterX;  // center x of the current top piece (landing reference)
let topWidth;    // width of the current top piece
let score;

let active;      // current moving ingredient sprite
let x;           // left of the moving piece (board coords)
let direction;   // 1 or -1
let speed;       // px / s
let state;       // 'waiting' | 'moving' | 'dropping' | 'over'
let lastFrame = 0;

function measure() {
  boardW = board.clientWidth;
  boardH = board.clientHeight;
}

function updateCamera() {
  // Slide the camera down once the tower grows past the visible budget so the
  // top of the stack (and the landing zone) always stays on screen.
  const budget = boardH - MIN_TOP_GAP;
  cameraShift = Math.max(0, contactY - budget);
  camera.style.transform = `translateY(${cameraShift}px)`;
}

// Screen y (from board top) of the tower's current top surface.
function contactScreenY() {
  return boardH - contactY + cameraShift;
}

// Place a sprite on top of the tower. `leftPx` is the board-x of its left edge.
function stackPiece(sp, leftPx, isBase) {
  const el = document.createElement('div');
  el.className = 'piece';
  applySprite(el, sp);
  const h = pieceHeight(sp);
  const worldBottom = isBase ? FLOOR : contactY - h * OVERLAP;
  el.style.left = `${leftPx}px`;
  el.style.bottom = `${worldBottom}px`;
  stack.appendChild(el);

  // The bun's contact surface sits a little below its visual top (rounded top).
  contactY = isBase ? FLOOR + h * 0.6 : worldBottom + h;
  topCenterX = leftPx + pieceWidth(sp) / 2;
  topWidth = pieceWidth(sp);
  return el;
}

function spawnIngredient() {
  active = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
  applySprite(falling, active);
  const w = pieceWidth(active);
  x = Math.random() * Math.max(0, boardW - w);
  direction = Math.random() < 0.5 ? -1 : 1;
  speed = 150 + Math.min(score * 10, 200); // ramps up as the tower grows
  falling.style.left = `${x}px`;
  falling.style.top = `${MOVE_BAND_TOP}px`;
  falling.hidden = false;
  state = 'moving';
}

function loop(now) {
  if (state === 'moving') {
    const elapsed = Math.min(50, now - lastFrame);
    x += direction * speed * elapsed / 1000;
    const edge = Math.max(0, boardW - pieceWidth(active));
    if (x <= 0) { x = 0; direction = 1; }
    else if (x >= edge) { x = edge; direction = -1; }
    falling.style.left = `${x}px`;
  }
  lastFrame = now;
  requestAnimationFrame(loop);
}

function drop() {
  if (state !== 'moving') return;
  state = 'dropping';

  const h = pieceHeight(active);
  const landedX = x; // straight down — x is frozen the moment SPACE is pressed
  const startTop = MOVE_BAND_TOP;
  // Land exactly where the stacked piece will end up (it sinks in by OVERLAP).
  const targetTop = contactScreenY() - h * (1 - OVERLAP);

  // Real gravity + an elastic landing: the piece accelerates from rest, hits the
  // ingredient below, bounces a couple of times with damping, then comes to rest.
  const GRAVITY     = 1500; // px / s^2  (lower = heavier, slower, more physical)
  const RESTITUTION = 0.12; // fraction of speed kept after a bounce (low = no jitter)
  const STOP_SPEED  = 340;  // px / s — below this the piece just settles, no bounce
  let pos = startTop;
  let velocity = 0;    // px / s
  let last = performance.now();

  function fall(t) {
    const dt = Math.min(0.032, (t - last) / 1000); // clamp to survive tab stalls
    last = t;
    velocity += GRAVITY * dt;
    pos += velocity * dt;

    if (pos >= targetTop) {
      // Impact with the piece below.
      if (velocity > STOP_SPEED) {
        pos = targetTop;
        velocity = -velocity * RESTITUTION; // bounce back up, losing energy
      } else {
        falling.style.top = `${targetTop}px`;
        settle(landedX);
        return;
      }
    }
    falling.style.top = `${pos}px`;
    requestAnimationFrame(fall);
  }
  requestAnimationFrame(fall);
}

function settle(landedX) {
  const newCenter = landedX + pieceWidth(active) / 2;
  const offset = Math.abs(newCenter - topCenterX);
  // Must overlap the piece below enough to stay balanced, otherwise it topples.
  const allowed = topWidth * 0.45;

  if (offset > allowed) {
    collapse(landedX);
    return;
  }

  falling.hidden = true;
  const placed = stackPiece(active, landedX, false);
  // A quick squash-and-recover so the ingredient visibly presses onto the one
  // below it, then springs back — the impact reads between the two pieces.
  placed.style.transformOrigin = 'bottom center';
  placed.style.animation = 'land-squash 0.26s ease-out';
  score += 1;
  scoreEl.textContent = score;
  updateCamera();
  state = 'waiting';
  setTimeout(spawnIngredient, 90);
}

function collapse(landedX) {
  state = 'over';

  // Drop the missed piece onto the stack so it topples together with the rest.
  stackPiece(active, landedX, false);
  falling.hidden = true;
  updateCamera();

  // The tower tips toward whichever side its weight overhung.
  const badCenter = landedX + pieceWidth(active) / 2;
  const leanDir = badCenter >= boardW / 2 ? 1 : -1; // +1 falls right, -1 falls left

  // Phase 1 — tip as a single rigid body: the whole stack pivots about the base
  // bun's bottom corner on the lean side, like a tower losing its balance.
  const pivotX = boardW / 2 + leanDir * (pieceWidth(BUN) / 2);
  const pivotY = boardH - FLOOR;
  stack.style.transformOrigin = `${pivotX}px ${pivotY}px`;
  stack.style.transition = 'none';
  Array.from(stack.children).forEach(el => {
    el.style.animation = 'none';
    el.style.transition = 'none'; // we drive transforms per-frame from here on
  });

  let angle = 0;        // tilt magnitude (radians)
  let angVel = 0.4;     // small initial nudge off balance (rad/s)
  let phase = 'tip';
  let bodies = null;    // per-piece state, created the moment the stack breaks
  const TORQUE = 22;    // how hard gravity pulls it over
  const BREAK = 1.2;    // radians (~69°) — past here the pieces come apart
  const G = 2200;
  let last = performance.now();

  // Bake the current rigid rotation into each piece, then release them so they
  // scatter individually. Reproducing the rotated pose first means no visual jump.
  function breakApart(phi) {
    const cosP = Math.cos(phi), sinP = Math.sin(phi);
    const w = leanDir * angVel; // signed angular velocity (rad/s)
    bodies = Array.from(stack.children).map(el => {
      const ocx = el.offsetLeft + el.offsetWidth / 2;
      const ocy = el.offsetTop + el.offsetHeight / 2;
      const rx = ocx - pivotX, ry = ocy - pivotY;
      // Where the rigid rotation had carried this piece's center.
      const dx = (rx * cosP - ry * sinP) - rx;
      const dy = (rx * sinP + ry * cosP) - ry;
      // Carry over the tangential velocity, plus a small random scatter kick.
      return {
        el, dx, dy, rot: phi * 180 / Math.PI,
        vx: (-sinP * rx - cosP * ry) * w + leanDir * 40 + (Math.random() * 2 - 1) * 70,
        vy: (cosP * rx - sinP * ry) * w - Math.random() * 70, // slight upward pop
        vr: w * 180 / Math.PI * 0.6 + (Math.random() * 2 - 1) * 140,
      };
    });
    stack.style.transform = '';
    stack.style.transformOrigin = '';
  }

  function step(t) {
    const dt = Math.min(0.032, (t - last) / 1000);
    last = t;

    if (phase === 'tip') {
      // Inverted-pendulum torque: starts slow, accelerates as it leans further.
      angVel += TORQUE * Math.sin(angle + 0.05) * dt;
      angle += angVel * dt;
      stack.style.transform = `rotate(${leanDir * angle * 180 / Math.PI}deg)`;
      if (angle >= BREAK) { breakApart(leanDir * angle); phase = 'scatter'; }
      requestAnimationFrame(step);
      return;
    }

    // Phase 2 — the loosened pieces tumble and scatter under gravity.
    let moving = false;
    for (const b of bodies) {
      b.vy += G * dt;
      b.dx += b.vx * dt;
      b.dy += b.vy * dt;
      b.rot += b.vr * dt;
      b.el.style.transform = `translate(${b.dx}px, ${b.dy}px) rotate(${b.rot}deg)`;
      if (b.dy < boardH + 320) moving = true;
    }
    if (moving) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  setTimeout(() => {
    finalScoreEl.textContent = `${score}개를 쌓았어요`;
    gameoverEl.hidden = false;
  }, 1300);
}

function reset() {
  measure();
  stack.innerHTML = '';
  // Clear any leftover topple transform from the previous collapse.
  stack.style.transform = '';
  stack.style.transition = '';
  stack.style.transformOrigin = '';
  contactY = 0;
  cameraShift = 0;
  score = 0;
  scoreEl.textContent = '0';
  gameoverEl.hidden = true;
  falling.hidden = true;

  // Bun base, centered at the bottom.
  const bunLeft = (boardW - pieceWidth(BUN)) / 2;
  stackPiece(BUN, bunLeft, true);
  updateCamera();

  state = 'waiting';
  spawnIngredient();
}

// --- Input ------------------------------------------------------------------
board.addEventListener('click', () => { if (state === 'moving') drop(); });

document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    if (state === 'moving') drop();
  } else if (event.code === 'KeyR' && state === 'over') {
    reset();
  }
});

restartBtn.addEventListener('click', event => {
  // Stop the click from bubbling to #board, which would instantly drop the
  // first ingredient the moment the game restarts.
  event.stopPropagation();
  reset();
});
window.addEventListener('resize', () => { measure(); updateCamera(); });

reset();
requestAnimationFrame(loop);

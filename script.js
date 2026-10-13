const parts = [
  { name: '패티', w: 205, h: 62, x: -231, y: -96, layer: 42 },
  { name: '베이컨', w: 205, h: 58, x: -451, y: -100, layer: 37 },
  { name: '계란', w: 205, h: 61, x: -677, y: -101, layer: 39 },
  { name: '양상추', w: 215, h: 77, x: -8, y: -293, layer: 32 },
  { name: '양파', w: 190, h: 55, x: -239, y: -310, layer: 30 },
  { name: '토마토', w: 190, h: 54, x: -460, y: -310, layer: 29 },
  { name: '해시브라운', w: 210, h: 64, x: -670, y: -302, layer: 40 }
];

const game = document.querySelector('#game');
const ingredient = document.querySelector('#ingredient');
const stack = document.querySelector('#stack');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const message = document.querySelector('#message');
const toast = document.querySelector('#toast');
let score = 0, stackHeight = 69, active, dropping = false, runner;
let best = Number(localStorage.getItem('burger-stack-best') || 0);
bestEl.textContent = best;

function paint(el, part) {
  el.style.width = part.w + 'px'; el.style.height = part.h + 'px';
  el.style.backgroundPosition = `${part.x}px ${part.y}px`;
}
function choosePart() { return parts[Math.floor(Math.random() * parts.length)]; }
function runIngredient() {
  active = choosePart(); paint(ingredient, active); dropping = false;
  ingredient.classList.add('moving');
  const maxX = Math.max(0, game.clientWidth - active.w);
  let x = Math.random() * maxX, direction = Math.random() > .5 ? 1 : -1;
  ingredient.style.left = x + 'px'; ingredient.style.top = '20px';
  cancelAnimationFrame(runner);
  let previous = performance.now();
  function move(now) {
    if (dropping) return;
    const speed = 110 + score * 7;
    x += direction * speed * (now - previous) / 1000;
    if (x <= 0 || x >= maxX) { direction *= -1; x = Math.max(0, Math.min(maxX, x)); }
    ingredient.style.left = x + 'px'; previous = now; runner = requestAnimationFrame(move);
  }
  runner = requestAnimationFrame(move);
}
function showToast(text) { toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 650); }
function drop() {
  if (dropping) return;
  dropping = true; cancelAnimationFrame(runner);
  const movingRect = ingredient.getBoundingClientRect(), gameRect = game.getBoundingClientRect();
  const relativeCenter = movingRect.left - gameRect.left + active.w / 2;
  const targetCenter = game.clientWidth / 2;
  const accuracy = Math.max(0, 1 - Math.abs(relativeCenter - targetCenter) / (game.clientWidth / 2));
  const safeHeight = Math.min(stackHeight, 260);
  const landingTop = game.clientHeight - 45 - safeHeight - active.h;
  ingredient.style.left = `${targetCenter - active.w / 2 + (relativeCenter - targetCenter) * .16}px`;
  ingredient.style.top = `${Math.max(30, landingTop)}px`;
  setTimeout(() => {
    const landed = document.createElement('div'); landed.className = 'sprite landed'; paint(landed, active);
    landed.style.left = `${130 - active.w / 2}px`;
    landed.style.bottom = `${stackHeight - 10}px`;
    stack.appendChild(landed);
    stackHeight += active.layer;
    score += accuracy > .82 ? 2 : 1; scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('burger-stack-best', best); }
    const perfect = accuracy > .82;
    showToast(perfect ? 'PERFECT! +2' : 'YUMMY! +1');
    message.textContent = perfect ? '완벽한 중심 착지! 계속 쌓아보세요!' : `${active.name} 안착! 다음 재료를 노려보세요.`;
    if (stackHeight > 295) { message.textContent = '와우, 메가 버거 완성! 새 버거도 도전해 보세요.'; }
    setTimeout(runIngredient, 280);
  }, 560);
}
function reset() { cancelAnimationFrame(runner); score = 0; stackHeight = 69; scoreEl.textContent = score; [...stack.querySelectorAll('.landed')].forEach(el => el.remove()); message.textContent = '움직이는 재료를 눌러 빵 위에 쌓아보세요!'; runIngredient(); }
ingredient.addEventListener('click', drop);
ingredient.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(); } });
document.querySelector('#restart').addEventListener('click', reset);
runIngredient();

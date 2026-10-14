const parts = [
  { w:205, h:62, x:-231, y:-96, layer:42 }, { w:205, h:58, x:-451, y:-100, layer:37 },
  { w:205, h:61, x:-677, y:-101, layer:39 }, { w:215, h:77, x:-8, y:-293, layer:32 },
  { w:190, h:55, x:-239, y:-310, layer:30 }, { w:190, h:54, x:-460, y:-310, layer:29 },
  { w:210, h:64, x:-670, y:-302, layer:40 }
];
const game = document.querySelector('#game');
const ingredient = document.querySelector('#ingredient');
const stack = document.querySelector('#stack');
let stackHeight = 69, camera = 0, active, dropping = false, runner;
function paint(el, part) { el.style.width = `${part.w}px`; el.style.height = `${part.h}px`; el.style.backgroundPosition = `${part.x}px ${part.y}px`; }
function choosePart() { return parts[Math.floor(Math.random() * parts.length)]; }
function updateCamera() {
  const visibleHeight = game.clientHeight;
  camera = Math.max(0, stackHeight - visibleHeight + 150);
  stack.style.transform = `translateX(-50%) translateY(${camera}px)`;
}
function runIngredient() {
  active = choosePart(); paint(ingredient, active); dropping = false;
  const maxX = Math.max(0, game.clientWidth - active.w);
  let x = Math.random() * maxX, direction = Math.random() > .5 ? 1 : -1;
  ingredient.style.left = `${x}px`; ingredient.style.top = '20px';
  cancelAnimationFrame(runner);
  let previous = performance.now();
  function move(now) {
    if (dropping) return;
    x += direction * 135 * (now - previous) / 1000;
    if (x <= 0 || x >= maxX) { direction *= -1; x = Math.max(0, Math.min(maxX, x)); }
    ingredient.style.left = `${x}px`; previous = now; runner = requestAnimationFrame(move);
  }
  runner = requestAnimationFrame(move);
}
function drop() {
  if (dropping) return;
  dropping = true; cancelAnimationFrame(runner);
  const landingTop = game.clientHeight - 35 - (stackHeight - camera) - active.h;
  ingredient.style.left = `${game.clientWidth / 2 - active.w / 2}px`;
  ingredient.style.top = `${Math.max(20, landingTop)}px`;
  setTimeout(() => {
    const landed = document.createElement('div');
    landed.className = 'sprite landed'; paint(landed, active);
    landed.style.left = `${130 - active.w / 2}px`;
    landed.style.bottom = `${stackHeight - 10}px`;
    stack.appendChild(landed);
    stackHeight += active.layer;
    updateCamera();
    setTimeout(runIngredient, 80);
  }, 480);
}
ingredient.addEventListener('click', drop);
document.addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); drop(); }
});
addEventListener('resize', updateCamera);
runIngredient();

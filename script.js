const ingredients = [
  { width:205, height:62, x:-231, y:-96, thickness:40 },
  { width:205, height:58, x:-451, y:-100, thickness:35 },
  { width:205, height:61, x:-677, y:-101, thickness:39 },
  { width:215, height:77, x:-8, y:-293, thickness:30 },
  { width:190, height:55, x:-239, y:-310, thickness:28 },
  { width:190, height:54, x:-460, y:-310, thickness:28 },
  { width:210, height:64, x:-670, y:-302, thickness:38 }
];

const game = document.querySelector('#game');
const burger = document.querySelector('#burger');
const falling = document.querySelector('#falling');
let active;
let stackHeight = 69;
let cameraY = 0;
let state = 'waiting';
let x = 0;
let direction = 1;
let lastFrame = 0;

function setSprite(element, sprite) {
  element.style.width = `${sprite.width}px`;
  element.style.height = `${sprite.height}px`;
  element.style.backgroundPosition = `${sprite.x}px ${sprite.y}px`;
}

function placeBurger() {
  cameraY = Math.max(0, stackHeight - game.clientHeight + 180);
  burger.style.transform = `translateX(-50%) translateY(${cameraY}px)`;
}

function nextIngredient() {
  active = ingredients[Math.floor(Math.random() * ingredients.length)];
  setSprite(falling, active);
  x = Math.random() * Math.max(0, game.clientWidth - active.width);
  direction = Math.random() < .5 ? -1 : 1;
  falling.style.left = `${x}px`;
  falling.style.top = '40px';
  state = 'moving';
}

function moveIngredient(now) {
  if (state === 'moving') {
    const elapsed = Math.min(50, now - lastFrame);
    x += direction * 170 * elapsed / 1000;
    const edge = Math.max(0, game.clientWidth - active.width);
    if (x < 0 || x > edge) {
      x = Math.max(0, Math.min(edge, x));
      direction *= -1;
    }
    falling.style.left = `${x}px`;
  }
  lastFrame = now;
  requestAnimationFrame(moveIngredient);
}

function landIngredient() {
  const landed = document.createElement('div');
  landed.className = 'piece';
  setSprite(landed, active);
  landed.style.left = `${130 - active.width / 2}px`;
  landed.style.bottom = `${stackHeight - 8}px`;
  burger.appendChild(landed);
  stackHeight += active.thickness;
  placeBurger();
  setTimeout(nextIngredient, 100);
}

function dropIngredient() {
  if (state !== 'moving') return;
  state = 'dropping';
  const startTop = Number.parseFloat(falling.style.top) || 40;
  const endTop = game.clientHeight - 36 - (stackHeight - cameraY) - active.height;
  const start = performance.now();
  const duration = 320;
  const centeredLeft = (game.clientWidth - active.width) / 2;
  function fall(now) {
    const progress = Math.min(1, (now - start) / duration);
    falling.style.top = `${startTop + (endTop - startTop) * progress}px`;
    falling.style.left = `${x + (centeredLeft - x) * progress}px`;
    if (progress < 1) requestAnimationFrame(fall);
    else landIngredient();
  }
  requestAnimationFrame(fall);
}

falling.addEventListener('click', dropIngredient);
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  event.preventDefault();
  dropIngredient();
});
window.addEventListener('resize', placeBurger);
nextIngredient();
requestAnimationFrame(moveIngredient);

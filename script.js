const cheerButton = document.querySelector('#cheerButton');
const cheerCount = document.querySelector('#cheerCount');

let count = Number(localStorage.getItem('cheer-count')) || 0;
cheerCount.textContent = count;

cheerButton.addEventListener('click', () => {
  count += 1;
  localStorage.setItem('cheer-count', count);
  cheerCount.textContent = count;
});

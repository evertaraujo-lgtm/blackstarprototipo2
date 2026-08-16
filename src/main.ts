import './style.css';

const button = document.querySelector<HTMLButtonElement>('#launch-button');

if (!button) {
  throw new Error('Botão inicial da interface não foi encontrado.');
}

button.addEventListener('click', () => {
  window.location.assign('/tests.html');
});

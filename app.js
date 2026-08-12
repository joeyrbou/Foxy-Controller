const state = { color: '#ff315a', brightness: 85, power: true, mode: 'steady', connected: false };
let suitSocket;
let currentAudio;
const preview = document.querySelector('#eyePreview');
const powerButton = document.querySelector('#powerButton');
const brightness = document.querySelector('#brightness');
const brightnessValue = document.querySelector('#brightnessValue');
const nowPlaying = document.querySelector('#nowPlaying span:last-child');

function sendToSuit(command) {
  if (suitSocket?.readyState === WebSocket.OPEN) suitSocket.send(JSON.stringify(command));
  // This is the one place to change if your suit uses Bluetooth or a different protocol.
  console.info('Suit command:', command);
}

function renderEyes() {
  document.documentElement.style.setProperty('--accent', state.color);
  preview.className = `eye-preview ${state.power ? state.mode : 'off'}`;
  preview.style.opacity = state.power ? Math.max(.12, state.brightness / 100) : 1;
  powerButton.classList.toggle('is-on', state.power);
  powerButton.setAttribute('aria-pressed', state.power);
  powerButton.innerHTML = `<span aria-hidden="true">⏻</span> ${state.power ? 'On' : 'Off'}`;
  brightnessValue.value = `${state.brightness}%`;
}

document.querySelectorAll('.color-swatch').forEach(button => button.addEventListener('click', () => {
  state.color = button.dataset.color;
  document.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.toggle('active', swatch === button));
  renderEyes(); sendToSuit({ type: 'eyes', ...state });
}));
document.querySelector('#customColor').addEventListener('input', event => {
  state.color = event.target.value;
  document.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.remove('active'));
  renderEyes(); sendToSuit({ type: 'eyes', ...state });
});
brightness.addEventListener('input', event => { state.brightness = +event.target.value; renderEyes(); sendToSuit({ type: 'eyes', ...state }); });
powerButton.addEventListener('click', () => { state.power = !state.power; renderEyes(); sendToSuit({ type: 'eyes', ...state }); });
document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
  state.mode = button.dataset.mode;
  document.querySelectorAll('.mode-button').forEach(mode => mode.classList.toggle('active', mode === button));
  renderEyes(); sendToSuit({ type: 'eyes', ...state });
}));
document.querySelectorAll('.voice-button').forEach(button => button.addEventListener('click', () => {
  const line = button.dataset.line;
  nowPlaying.textContent = `Playing: “${line}”`;
  sendToSuit({ type: 'voice', line });
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
  if (button.dataset.audio) {
    currentAudio = new Audio(button.dataset.audio);
    currentAudio.play().catch(() => { nowPlaying.textContent = 'Could not play that audio file'; });
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));
  }
}));
document.querySelector('#stopButton').addEventListener('click', () => { window.speechSynthesis?.cancel(); currentAudio?.pause(); nowPlaying.textContent = 'Audio stopped'; sendToSuit({ type: 'stopAudio' }); });
document.querySelector('#blackoutButton').addEventListener('click', () => { state.power = false; renderEyes(); sendToSuit({ type: 'eyes', ...state }); });
document.querySelector('#showtimeButton').addEventListener('click', () => { state.power = true; state.color = '#ff315a'; state.brightness = 100; state.mode = 'pulse'; brightness.value = 100; document.querySelectorAll('.mode-button').forEach(button => button.classList.toggle('active', button.dataset.mode === 'pulse')); renderEyes(); sendToSuit({ type: 'scene', name: 'showtime', ...state }); });
document.querySelector('#connectButton').addEventListener('click', event => {
  if (suitSocket?.readyState === WebSocket.OPEN) { suitSocket.close(); return; }
  const address = window.prompt('Enter your suit WebSocket address', localStorage.getItem('foxySuitAddress') || 'ws://192.168.4.1/ws');
  if (!address) return;
  localStorage.setItem('foxySuitAddress', address);
  document.querySelector('#connectionText').textContent = 'Connecting…';
  try {
    suitSocket = new WebSocket(address);
    suitSocket.onopen = () => { state.connected = true; event.currentTarget.classList.add('connected'); document.querySelector('#connectionText').textContent = 'Suit connected'; sendToSuit({ type: 'eyes', ...state }); };
    suitSocket.onclose = () => { state.connected = false; event.currentTarget.classList.remove('connected'); document.querySelector('#connectionText').textContent = 'Demo mode'; };
    suitSocket.onerror = () => { document.querySelector('#connectionText').textContent = 'Connection failed'; };
  } catch { document.querySelector('#connectionText').textContent = 'Connection failed'; }
});
renderEyes();

const state = { connected: false };
let suitSocket;
let currentAudio;
const nowPlaying = document.querySelector('#nowPlaying span:last-child');

function sendToSuit(command) {
  if (suitSocket?.readyState === WebSocket.OPEN) suitSocket.send(JSON.stringify(command));
  // This is the one place to change if your suit uses Bluetooth or a different protocol.
  console.info('Suit command:', command);
}

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
document.querySelector('#connectButton').addEventListener('click', event => {
  if (suitSocket?.readyState === WebSocket.OPEN) { suitSocket.close(); return; }
  const address = window.prompt('Enter your suit WebSocket address', localStorage.getItem('foxySuitAddress') || 'ws://192.168.4.1/ws');
  if (!address) return;
  localStorage.setItem('foxySuitAddress', address);
  document.querySelector('#connectionText').textContent = 'Connecting…';
  try {
    suitSocket = new WebSocket(address);
    suitSocket.onopen = () => { state.connected = true; event.currentTarget.classList.add('connected'); document.querySelector('#connectionText').textContent = 'Suit connected'; };
    suitSocket.onclose = () => { state.connected = false; event.currentTarget.classList.remove('connected'); document.querySelector('#connectionText').textContent = 'Demo mode'; };
    suitSocket.onerror = () => { document.querySelector('#connectionText').textContent = 'Connection failed'; };
  } catch { document.querySelector('#connectionText').textContent = 'Connection failed'; }
});

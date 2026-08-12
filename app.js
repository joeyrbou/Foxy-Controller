const state = { connected: false };
let suitSocket;
let currentAudio;
let soundDatabase;
const commandPage = document.querySelector('#commandPage');
const libraryPage = document.querySelector('#libraryPage');
const soundboard = document.querySelector('.soundboard');
const nowPlaying = document.querySelector('#nowPlaying span:last-child');
const libraryList = document.querySelector('#libraryList');
const uploadStatus = document.querySelector('#uploadStatus');

function sendToSuit(command) {
  if (suitSocket?.readyState === WebSocket.OPEN) suitSocket.send(JSON.stringify(command));
  console.info('Suit command:', command);
}

function playSound(line, source) {
  nowPlaying.textContent = `Playing: “${line}”`;
  sendToSuit({ type: 'voice', line });
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
  currentAudio = new Audio(source);
  currentAudio.play().catch(() => { nowPlaying.textContent = 'Could not play that audio file'; });
}

soundboard.addEventListener('click', async event => {
  const button = event.target.closest('.voice-button');
  if (!button) return;
  if (button.dataset.customId) {
    const sound = await getSound(button.dataset.customId);
    if (sound) playSound(sound.name, URL.createObjectURL(sound.blob));
  } else if (button.dataset.audio) {
    playSound(button.dataset.line, button.dataset.audio);
  }
});

document.querySelector('#stopButton').addEventListener('click', () => {
  window.speechSynthesis?.cancel();
  currentAudio?.pause();
  nowPlaying.textContent = 'Audio stopped';
  sendToSuit({ type: 'stopAudio' });
});

function showPage(page) {
  commandPage.hidden = page !== 'command';
  libraryPage.hidden = page !== 'library';
  if (page === 'library') renderLibrary();
}
document.querySelector('#libraryButton').addEventListener('click', () => showPage('library'));
document.querySelector('#backButton').addEventListener('click', () => showPage('command'));

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement || document.body.classList.contains('force-landscape')) {
      document.body.classList.remove('force-landscape');
      if (!document.fullscreenElement) return;
      await document.exitFullscreen();
      await screen.orientation?.unlock?.();
      return;
    }
    await document.documentElement.requestFullscreen();
    try { await screen.orientation?.lock?.('landscape'); } catch { /* CSS fallback below */ }
    setTimeout(applyLandscapeFallback, 250);
  } catch {
    applyLandscapeFallback();
  }
}
function applyLandscapeFallback() {
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  document.body.classList.toggle('force-landscape', Boolean(document.fullscreenElement && portrait));
}
document.querySelector('#fullscreenButton').addEventListener('click', toggleFullscreen);
document.querySelector('#libraryFullscreenButton').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? 'Exit full screen' : 'Enter full screen';
  document.querySelectorAll('[title="Full screen"]').forEach(button => { button.setAttribute('aria-label', label); button.textContent = document.fullscreenElement ? '×' : '⛶'; });
  if (!document.fullscreenElement) document.body.classList.remove('force-landscape');
});
window.addEventListener('resize', applyLandscapeFallback);

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('foxy-sound-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sounds', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function transaction(mode) { return soundDatabase.transaction('sounds', mode).objectStore('sounds'); }
function getSound(id) { return new Promise(resolve => { const request = transaction('readonly').get(id); request.onsuccess = () => resolve(request.result); }); }
function getSounds() { return new Promise(resolve => { const request = transaction('readonly').getAll(); request.onsuccess = () => resolve(request.result); }); }
function saveSound(sound) { return new Promise((resolve, reject) => { const request = transaction('readwrite').put(sound); request.onsuccess = resolve; request.onerror = () => reject(request.error); }); }
function deleteSound(id) { return new Promise(resolve => { const request = transaction('readwrite').delete(id); request.onsuccess = resolve; }); }

function makeSoundButton(sound) {
  const button = document.createElement('button');
  button.className = 'voice-button custom-sound';
  button.type = 'button';
  button.dataset.customId = sound.id;
  button.innerHTML = '<span class="voice-icon">♫</span>';
  const label = document.createElement('span');
  label.textContent = sound.name;
  button.append(label);
  return button;
}

async function renderLibrary() {
  const sounds = await getSounds();
  soundboard.querySelectorAll('.custom-sound').forEach(button => button.remove());
  sounds.forEach(sound => soundboard.append(makeSoundButton(sound)));
  libraryList.replaceChildren();
  if (!sounds.length) { libraryList.textContent = 'No added sounds yet.'; return; }
  sounds.forEach(sound => {
    const row = document.createElement('div'); row.className = 'library-item';
    const name = document.createElement('span'); name.className = 'library-item-name'; name.textContent = sound.name;
    const remove = document.createElement('button'); remove.className = 'remove-sound'; remove.type = 'button'; remove.textContent = 'Remove';
    remove.addEventListener('click', async () => { await deleteSound(sound.id); await renderLibrary(); });
    row.append(name, remove); libraryList.append(row);
  });
}

document.querySelector('#audioPicker').addEventListener('change', async event => {
  const files = [...event.target.files];
  if (!files.length) return;
  const mp3s = files.filter(file => file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3'));
  for (const file of mp3s) await saveSound({ id: crypto.randomUUID(), name: file.name.replace(/\.mp3$/i, ''), blob: file });
  uploadStatus.textContent = `${mp3s.length} sound${mp3s.length === 1 ? '' : 's'} added to your soundboard.`;
  event.target.value = '';
  await renderLibrary();
});

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

openDatabase().then(database => { soundDatabase = database; renderLibrary(); }).catch(() => { uploadStatus.textContent = 'This browser cannot save added sounds.'; });

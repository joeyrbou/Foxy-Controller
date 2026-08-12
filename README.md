# Foxy Suit Control

A phone-first controller for a cosplay suit. Open `index.html` in a browser to use the visual demo. Four voice buttons play the included recordings; the remaining demo buttons use text-to-speech.

## Connecting a suit

The Connect button expects a WebSocket-capable controller, such as an ESP32 running a WebSocket server. Enter its address (for example, `ws://192.168.4.1/ws`) and this app sends JSON messages such as:

```json
{ "type": "eyes", "color": "#ff315a", "brightness": 85, "power": true, "mode": "pulse" }
```

Voice buttons send `{ "type": "voice", "line": "Ahoy! Welcome aboard." }`. Your controller can map these commands to LED effects and audio files on an SD card or a connected audio module.

For real audio, replace the browser speech in `app.js` with your recorded sound files or play the command on the suit hardware. Use a separate fused battery supply for LEDs and share ground with the ESP32.

# Foxy Suit Control

A landscape phone soundboard for a cosplay suit. Turn your phone sideways, then open `index.html` in a browser. All six buttons play the included recordings.

## Phone controls

- Tap **⛶** for full screen. The controller requests a landscape orientation lock while it is in full screen; support depends on the phone browser.
- Tap **›** at the top to open the **Sound Library**. Choose **Add MP3 sound**, select one or more MP3 files, and buttons are added automatically. Added files are stored in that browser on that phone.

## Connecting a suit

The Connect button expects a WebSocket-capable controller, such as an ESP32 running a WebSocket server. Enter its address (for example, `ws://192.168.4.1/ws`) and this app sends JSON messages such as:

```json
{ "type": "voice", "line": "Boo" }
```

Voice buttons send `{ "type": "voice", "line": "Boo" }`. Your controller can map these commands to audio files on an SD card or a connected audio module.

For suit-mounted audio, play the command on the suit hardware using an SD card or a connected audio module.

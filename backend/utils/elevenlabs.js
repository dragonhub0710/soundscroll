const WebSocket = require("ws");
require("dotenv").config();

const voiceId = process.env.ELEVENLABS_VOICE_ID;
const modelType = process.env.ELEVENLABS_MODEL;
const wss11labs_URL = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelType}`;

const setupElevenlabs = async (ws) => {
  const wss11labs = new WebSocket(wss11labs_URL);

  wss11labs.addEventListener("open", () =>
    wss11labs.send(
      JSON.stringify({
        text: " ", // signals beggining of stream to ElevenLabs
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
        xi_api_key: process.env.ELEVENLABS_API_KEY,
        try_trigger_generation: false,
      })
    )
  );

  wss11labs.addEventListener("message", async (event) => {
    const response = JSON.parse(event.data);
    if (!response.audio) {
      console.log("Received message with no audio");
      return;
    }

    ws.send(JSON.stringify({ type: "audio", data: response.audio }));
    if (response.isFinal) {
      ws.send(JSON.stringify({ type: "finished" }));
    }
  });

  wss11labs.addEventListener("error", (error) => {
    console.error("socket: 11labs connection error", error);
  });

  wss11labs.addEventListener("close", () => {
    console.log("socket: 11labs connection closed");
  });

  return wss11labs;
};

module.exports = {
  setupElevenlabs,
};

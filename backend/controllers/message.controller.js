const { createClient } = require("@deepgram/sdk");
const { ElevenLabsClient } = require("elevenlabs");
const OpenAI = require("openai");
const { loadMusicMetadata } = require("music-metadata");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handleQuestions = async (req, res) => {
  try {
    const { messages } = req.body;
    const file = req.file;
    let transcription = await getTranscription(file.buffer);
    let data = await getResponse(JSON.parse(messages), transcription);

    res.status(200).json({
      isReady: data.isReady,
      response: data.response,
      transcription,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.handleGuide = async (req, res) => {
  try {
    const { messages, time } = req.body;

    let durationList = [];
    let combinedBase64Audio = null;
    let totalDuration = 0;

    let extraPrompt = "Please provide a guide involving ";
    switch (time) {
      case 3:
        extraPrompt += "500 words.";
        break;
      case 5:
        extraPrompt += "750 words.";
        break;
      case 10:
        extraPrompt += "1500 words.";
        break;
    }
    messages.push({
      role: "user",
      content: extraPrompt,
    });

    let data = await getResponse(messages, "");

    if (data.isReady == "done") {
      const client = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY,
      });

      const audioPromises = data.response.map(async (item) => {
        const audioStream = await client.generate({
          voice: "Rachel",
          model_id: "eleven_turbo_v2_5",
          text: item,
        });

        let chunks = [];
        for await (const chunk of audioStream) {
          chunks.push(chunk);
        }

        const audioBuffer = Buffer.concat(chunks);
        const base64Audio = audioBuffer.toString("base64");

        const mm = await loadMusicMetadata();
        const metadata = await mm.parseBuffer(audioBuffer, {
          mimeType: "audio/mpeg",
        });
        totalDuration += metadata.format.duration;
        duration = metadata.format.duration;

        return {
          duration,
          base64Audio,
        };
      });

      const results = await Promise.all(audioPromises);

      // Check if results is populated correctly
      if (results.length > 0) {
        // Concatenate all audio buffers into a single buffer
        const combinedAudioBuffer = Buffer.concat(
          results.map((res) => {
            if (res.base64Audio) {
              return Buffer.from(res.base64Audio, "base64");
            }
            throw new Error("Base64 audio is undefined");
          })
        );
        combinedBase64Audio = combinedAudioBuffer.toString("base64");
      } else {
        throw new Error("No audio data available to combine");
      }

      results.map((item) => {
        durationList.push(item.duration);
      });
    }

    res.status(200).json({
      isReady: data.isReady,
      response: data.response,
      totalDuration,
      base64Audio: combinedBase64Audio,
      durationList,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getResponse = async (msgs, transcription) => {
  try {
    let list = [];
    list.unshift({
      role: "system",
      content: process.env.SYSTEM_PROMPT,
    });

    if (msgs.length > 0) {
      list.push(...msgs);
    }

    if (transcription != "") {
      list.push({
        role: "user",
        content: transcription,
      });
    }
    const completion = await openai.chat.completions.create({
      messages: list,
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.log(err);
  }
};

const getTranscription = async (fileBuffer) => {
  try {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    let transcription = "";

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      fileBuffer,
      {
        model: "nova-2",
        smart_format: true,
      }
    );
    if (error) {
      console.log("error----", error);
    }
    if (result) {
      transcription =
        result.results.channels[0].alternatives[0].transcript + " ";
    }

    return transcription;
  } catch (err) {
    console.log(err);
  }
};

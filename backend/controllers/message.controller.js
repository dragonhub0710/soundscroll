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
    let base64Audio = null;
    let totalText = "";
    let totalDuration = 0;
    let transcription = await getTranscription(file.buffer);

    let data = await getResponse(JSON.parse(messages), transcription);

    if (data.isReady == "done") {
      const client = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY,
      });

      data.response.map(async (item) => {
        totalText += item + "\n";
      });

      const audioStream = await client.generate({
        voice: "Rachel",
        model_id: "eleven_turbo_v2_5",
        text: totalText,
      });

      let chunks = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(chunks);
      base64Audio = audioBuffer.toString("base64");

      const mm = await loadMusicMetadata();
      const metadata = await mm.parseBuffer(audioBuffer, {
        mimeType: "audio/mpeg",
      });
      totalDuration = metadata.format.duration;

      // const audioPromises = data.response.map(async (item) => {
      //   totalText += item + "\n";
      //   const audioStream = await client.generate({
      //     voice: "Rachel",
      //     model_id: "eleven_turbo_v2_5",
      //     text: item,
      //   });

      //   let chunks = [];
      //   for await (const chunk of audioStream) {
      //     chunks.push(chunk);
      //   }

      //   // Concatenate all chunks into a single Uint8Array
      //   const audioBuffer = Buffer.concat(chunks);
      //   base64Audio = audioBuffer.toString("base64");

      //   const mm = await loadMusicMetadata();
      //   const metadata = await mm.parseBuffer(audioBuffer, {
      //     mimeType: "audio/mpeg",
      //   });
      //   totalDuration += Math.ceil(metadata.format.duration * 100) / 100;

      //   return {
      //     duration: Math.ceil(metadata.format.duration * 100) / 100,
      //     text: item,
      //     base64Audio,
      //   };
      // });
      // response = await Promise.all(audioPromises);
    }

    res.status(200).json({
      isReady: data.isReady,
      response: data.response,
      transcription,
      totalText,
      totalDuration,
      base64Audio,
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

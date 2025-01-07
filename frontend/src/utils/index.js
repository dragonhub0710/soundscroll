export const getHeightfromVolume = (value) => {
  const minValue = 0;
  const maxValue = 5;
  const minPixel = 10;
  const maxPixel = 40;

  // Ensure the value is within bounds
  const boundedValue = Math.min(Math.max(value, minValue), maxValue);

  // Linear scaling calculation
  const pixelHeight =
    minPixel +
    ((boundedValue - minValue) * (maxPixel - minPixel)) / (maxValue - minValue);
  return pixelHeight;
};

export const getVolume = (dataArray) => {
  let sum = 0;

  // Calculate the sum of the audio data
  for (let i = 0; i < dataArray.length; i++) {
    sum += Math.abs(dataArray[i] - 128);
  }

  // Calculate the average volume
  const average = sum / dataArray.length;

  return average;
};

export const updateQueue = (prevQueue, newItem) => {
  let updatedQueue = [...prevQueue];

  if (updatedQueue.length >= 30) {
    updatedQueue.shift();
  }

  updatedQueue.push(newItem);

  return updatedQueue;
};

export const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
};

export const decodeAudioData = async (base64Audio) => {
  // Create a new AudioContext
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Convert Base64 to ArrayBuffer
  const audioBf = base64ToArrayBuffer(base64Audio);
  // Decode the audio data into an AudioBuffer
  const copiedBuffer = audioBf.slice(0);
  const audioBuffer = await audioContext.decodeAudioData(copiedBuffer);
  // Get audio duration
  const totalDuration = audioBuffer.duration;

  return {
    audioBuffer,
    totalDuration,
  };
};

import React, { useEffect, useState, useRef } from "react";
import { Avatar, Button, Typography, Slider } from "@material-tailwind/react";
import CountdownTimer from "@/widgets/countdowntimer/countdowntimer";
import axios from "axios";
import { ReactMic } from "react-mic";
import Lottie from "react-lottie";
import H5AudioPlayer from "react-h5-audio-player";
import Loading_Animation from "../widgets/loading.json";
import Header from "@/widgets/header/header";
import { getHeightfromVolume, getVolume, updateQueue } from "@/utils";

export function Home() {
  const speedList = [0.5, 0.8, 1, 1.5];
  const guideTimeList = [3, 5, 10];
  const [isloading, setIsloading] = useState(false);
  const [countTime, setCountTime] = useState(120);
  const [comments, setComments] = useState("");
  const [commentIdx, setCommentIdx] = useState(0);
  const [durationList, setDurationList] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPos, setCurrentPos] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(speedList[1]);
  const [copyTitle, setCopyTitle] = useState("Copy");
  const [showSpeedControlbar, setShowSpeedControlbar] = useState(false);
  const [showSharebar, setSharebar] = useState(false);
  const [audiolink, setAudioLink] = useState("");
  const [queue, setQueue] = useState(new Array(30).fill(10));
  const [showGuideTimes, setShowGuideTimes] = useState(false);
  const [guideTime, setGuideTime] = useState(0);
  const recordingRef = useRef(false);
  const messagesRef = useRef([]);
  const containerRef = useRef(null);
  const audioPlayerRef = useRef(0);

  const defaultOption = {
    loop: true,
    autoplay: true,
    animationData: Loading_Animation,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  useEffect(() => {
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.audio.current.play(); // Play audio if isPlaying is true
    } else if (audioPlayerRef.current) {
      audioPlayerRef.current.audio.current.pause(); // Pause audio if isPlaying is false
    }
  }, [audiolink, isPlaying]);

  useEffect(() => {
    if (countTime == 1) {
      recordingRef.current = false;
    }
  }, [countTime]);

  useEffect(() => {
    const commentElement = document.getElementById(`comment-${commentIdx}`);
    if (commentElement) {
      commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [commentIdx]);

  const handleStartRecording = async () => {
    if (recordingRef.current) {
      recordingRef.current = false;
    } else {
      recordingRef.current = true;
      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          handleStream(stream);
        })
        .catch((error) => {
          console.error("Error accessing microphone:", error);
        });
    }
  };

  const handleStream = (stream) => {
    const audioContext = new AudioContext();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();

    // Connect the media stream source to the analyzer
    mediaStreamSource.connect(analyzer);

    // Configure the analyzer
    analyzer.smoothingTimeConstant = 0.3; // Smooth the audio data
    analyzer.fftSize = 1024; // Specify the size of the FFT

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Start recording
    handleStartRecording();

    function handleStartRecording() {
      function analyzeAudio() {
        if (!recordingRef.current) {
          stopRecording();
          return;
        }

        analyzer.getByteTimeDomainData(dataArray);
        const volume = getVolume(dataArray);
        const height = getHeightfromVolume(volume);
        setQueue((prevQueue) => updateQueue(prevQueue, height));

        // Continue recording
        setTimeout(() => {
          analyzeAudio();
        }, 100); // Repeat the analysis every 100ms
      }

      // Start analyzing audio
      analyzeAudio();

      function stopRecording() {
        recordingRef.current = false;

        // Stop the media stream and disconnect the analyzer
        mediaStreamSource.disconnect();
        analyzer.disconnect();
      }
    }
  };

  const onStop = (recordedBlob) => {
    const file = new File([recordedBlob.blob], "recording.wav", {
      type: "audio/wav",
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("messages", JSON.stringify(messagesRef.current));
    setIsloading(true);
    axios
      .post(`${import.meta.env.VITE_BACKEND_URL}/api/question`, formData)
      .then(async (res) => {
        setComments(res.data.response);

        if (res.data.isReady == "none") {
          messagesRef.current.push({
            role: "user",
            content: res.data.transcription,
          });
          let text = "";
          res.data.response.map((item) => {
            text += item + "\n";
          });
          messagesRef.current.push({
            role: "assistant",
            content: text,
          });
        }
        if (res.data.isReady == "ready") {
          setShowGuideTimes(true);
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setIsloading(false);
      });
  };

  const playAudio = () => {
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent) audioCurrent.play();
  };

  const pauseAudio = () => {
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent) audioCurrent.pause();
  };

  const handlePlayAudio = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
    setIsPlaying(!isPlaying);
  };

  const stylingText = (text) => {
    return text.replace(/\n/g, "<br>");
  };

  const handleChangePos = (e) => {
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent) {
      const newTime = (totalDuration / 100) * e.target.value;
      audioCurrent.currentTime = newTime;
      setCurrentTime(newTime);
      setCurrentPos(e.target.value);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const skipTime = (amount) => {
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent) {
      let newTime = Math.min(
        Math.max(audioCurrent.currentTime + amount, 0),
        audioCurrent.duration
      );
      audioCurrent.currentTime = newTime;
      setCurrentTime(newTime);

      if (newTime == 0 || newTime == audioCurrent.duration) {
        setCurrentPos(newTime);
      } else {
        let skipLength = (amount / totalDuration) * 100;
        let newPos = currentPos + skipLength;
        setCurrentPos(newPos);
      }
    }
  };

  const handleChangeVolume = (e) => {
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent) {
      audioCurrent.volume = e.target.value / 100;
      setVolume(e.target.value);
    }
  };

  const handleSpeedControlbar = () => {
    setShowSpeedControlbar((prev) => !prev);
  };

  const handleSharebar = () => {
    setSharebar((prev) => !prev);
  };

  const handleCopyContent = () => {
    navigator.clipboard
      .writeText(comments.join("\n"))
      .then(() => {
        setCopyTitle("Copied!");
        setTimeout(() => {
          setCopyTitle("Copy link");
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const handleChangeSpeed = (val) => {
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent) {
      audioCurrent.playbackRate = val;
      setSpeed(val);
    }
  };

  const handleListen = (currentTime) => {
    setCurrentTime(currentTime);
    let newPos = (currentTime / totalDuration) * 100;
    setCurrentPos(newPos);
    durationList.map((item, idx) => {
      if (idx == durationList.length - 1 && currentTime >= item) {
        setCommentIdx(idx);
        return;
      }
      if (currentTime >= item && currentTime < durationList[idx + 1]) {
        setCommentIdx(idx);
        return;
      }
    });
  };

  const handleEnded = async () => {
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent) {
      setIsPlaying(false);
      setCurrentTime(audioCurrent.duration);
      setCurrentPos(100);
    }
  };

  const handleSelectComment = (idx) => {
    setCommentIdx(idx);
    const audioCurrent = audioPlayerRef.current.audio.current;
    if (audioCurrent && audiolink) {
      audioCurrent.currentTime = durationList[idx];
      setCurrentTime(durationList[idx]);
      let newPos = (durationList[idx] / totalDuration) * 100;
      setCurrentPos(newPos);
    }
  };

  const handleSetGuideTime = (time) => {
    setGuideTime(time);
  };

  const handleGuideAudio = () => {
    const data = {
      messages: messagesRef.current,
      time: guideTime,
    };

    setIsloading(true);
    axios
      .post(`${import.meta.env.VITE_BACKEND_URL}/api/guide`, data)
      .then(async (res) => {
        if (res.data.base64Audio) {
          setComments(res.data.response);
          setTotalDuration(res.data.totalDuration);

          let newDurationList = [];
          let time = 0;
          res.data.durationList.map((item) => {
            newDurationList.push(time);
            time += item;
          });
          setDurationList(newDurationList);

          const audioBlob = new Blob(
            [
              new Uint8Array(
                atob(res.data.base64Audio)
                  .split("")
                  .map((c) => c.charCodeAt(0))
              ),
            ],
            { type: "audio/mp3" }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioLink(audioUrl);
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setIsloading(false);
      });
  };

  return (
    <>
      <div className="relative flex h-full min-h-[100vh] w-full flex-col bg-[#151515]">
        <Header />
        <div className="relative h-[calc(100vh-4rem-17rem)] w-full">
          {comments && comments.length > 0 ? (
            <div className="h-full w-full">
              <div className="text-gradient-top absolute left-0 right-0 top-[-1px] z-10 h-[6rem] w-full bg-[#151515]"></div>
              <div className="text-gradient-bottom absolute bottom-[-2px] left-0 right-0 z-10 h-[6rem] w-full bg-[#151515]"></div>
              <div
                ref={containerRef}
                className="relative mx-auto h-full w-full max-w-[400px] overflow-auto px-4 py-[6rem]"
              >
                {comments.map((item, idx) => {
                  return (
                    <div
                      id={`comment-${idx}`}
                      key={idx}
                      className="prose"
                      onClick={() => handleSelectComment(idx)}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: item,
                        }}
                        className={`cursor-pointer text-[32px] font-normal leading-[43px] tracking-wide ${
                          idx == commentIdx ? "text-[white]" : "text-[#A85D6E]"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : showGuideTimes ? (
            <div className="relative mx-auto mt-[6rem] flex h-[50vh] w-full max-w-[400px] flex-col overflow-hidden px-4">
              <Typography className="text-[32px] font-normal leading-[43px] tracking-wide text-[white]">
                Choose the length of your guide for this topic
              </Typography>
              <div className="my-10 flex flex-col gap-3">
                {guideTimeList.map((item, idx) => {
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSetGuideTime(item)}
                      className={`flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border-[1px] border-[white] !font-sans text-lg font-medium text-[white] hover:bg-[#A85D6E] ${
                        item == guideTime ? "bg-[#A85D6E]" : "bg-transparent"
                      }`}
                    >
                      {item} minutes
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="relative mx-auto mt-[6rem] flex h-[50vh] w-full max-w-[400px] flex-col overflow-hidden px-4">
              <Typography className="text-[32px] font-normal leading-[43px] tracking-wide text-[#A85D6E]">
                Welcome
              </Typography>
              <Typography className="text-[32px] font-normal leading-[43px] tracking-wide text-[#A85D6E]">
                Share what you need help with and I’ll create a guide with
                advice...
              </Typography>
            </div>
          )}
        </div>

        <H5AudioPlayer
          autoPlay={isPlaying}
          ref={audioPlayerRef}
          src={audiolink}
          listenInterval={1000}
          onListen={() =>
            handleListen(audioPlayerRef.current.audio.current.currentTime || 0)
          }
          onEnded={handleEnded}
          style={{ display: "none" }}
        />

        <div className="fixed bottom-0 left-0 right-0 z-50 ">
          <div className="h-[20rem] px-4 pt-2">
            {audiolink != "" ? (
              <div className="flex flex-col justify-between">
                <div className="flex w-full flex-col justify-between">
                  <Slider
                    defaultValue={0}
                    value={currentPos}
                    onChange={handleChangePos}
                    className="w-full text-[#FA003F]"
                    barClassName="rounded-full bg-[#FA003F]"
                    thumbClassName="[&::-moz-range-thumb]:rounded-full [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:-mt-[4px] [&::-webkit-slider-thumb]:-mt-[4px]"
                    trackClassName="[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent rounded-full !bg-[#FA003F]/10 border border-[#FA003F]/20"
                  />
                  <div className="flex w-full justify-between">
                    <span className="mt-2 !font-sans text-white">
                      {formatTime(currentTime)}
                    </span>
                    <span className="mt-2 !font-sans text-white">
                      {formatTime(totalDuration)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between px-[3rem] pt-8">
                  <Button
                    variant="text"
                    className="p-1"
                    onClick={() => skipTime(-30)}
                  >
                    <Avatar
                      src="/img/rewind.svg"
                      className="h-auto w-[3rem] !rounded-none"
                    />
                  </Button>
                  <Button
                    variant="text"
                    className="p-1"
                    onClick={handlePlayAudio}
                  >
                    <Avatar
                      src={isPlaying ? "/img/pause.svg" : "/img/play.svg"}
                      className="h-[45px] w-auto !rounded-none"
                    />
                  </Button>
                  <Button
                    variant="text"
                    className="p-1"
                    onClick={() => skipTime(30)}
                  >
                    <Avatar
                      src="/img/forward.svg"
                      className="h-auto w-[3rem] !rounded-none"
                    />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-1 pt-10">
                  <Button
                    variant="text"
                    className="flex items-center justify-center p-1"
                  >
                    <Avatar
                      src="/img/mic-on.svg"
                      className="h-auto w-[12px] !rounded-none"
                    />
                  </Button>
                  <Slider
                    value={volume}
                    onChange={handleChangeVolume}
                    className="z-10 text-[#FA003F]"
                    barClassName="rounded-full bg-[#FA003F]"
                    thumbClassName="[&::-moz-range-thumb]:rounded-full [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:-mt-[4px] [&::-webkit-slider-thumb]:-mt-[4px]"
                    trackClassName="[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent rounded-full !bg-[#FA003F]/10 border border-[#FA003F]/20"
                  />
                  <Button
                    variant="text"
                    className="flex items-center justify-center p-1"
                  >
                    <Avatar
                      src="/img/mic-off.svg"
                      className="h-auto w-[26px] !rounded-none"
                    />
                  </Button>
                </div>
                <div className="flex w-full justify-between px-[2rem] pt-8">
                  <a href="/">
                    <Button
                      variant="text"
                      className="flex flex-col items-center justify-center p-1"
                    >
                      <Avatar
                        src="/img/back.svg"
                        className="h-[30px] w-auto !rounded-none"
                      />
                      <Typography className="!font-sans text-lg font-medium normal-case text-white">
                        Back
                      </Typography>
                    </Button>
                  </a>
                  <Button
                    variant="text"
                    onClick={handleSpeedControlbar}
                    className="flex flex-col items-center justify-center p-1"
                  >
                    <Typography className="h-[30px] !font-sans text-3xl font-medium normal-case text-white">
                      {speed.toFixed(1)}x
                    </Typography>
                    <Typography className="!font-sans text-lg font-medium normal-case text-white">
                      Speed
                    </Typography>
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleSharebar}
                    className="flex flex-col items-center justify-center p-1"
                  >
                    <Avatar
                      src="/img/share.svg"
                      className="h-[30px] w-auto !rounded-none"
                    />
                    <Typography className="!font-sans text-lg font-medium normal-case text-white">
                      Share
                    </Typography>
                  </Button>
                  <Button
                    variant="text"
                    className="flex flex-col items-center justify-center p-1"
                  >
                    <Avatar
                      src="/img/save.svg"
                      className="h-[30px] w-auto !rounded-none"
                    />
                    <Typography className="!font-sans text-lg font-medium normal-case text-white">
                      Save
                    </Typography>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-end">
                <div className="flex h-[5rem] w-full items-center justify-center">
                  {recordingRef.current &&
                    queue.length == 30 &&
                    queue.map((item, idx) => {
                      const heightInPixels = `${item}px`;
                      return (
                        <div
                          key={idx}
                          className="voice-animation mx-[3px] w-[4px] rounded-md bg-[#77434F]"
                          style={{ height: heightInPixels }}
                        ></div>
                      );
                    })}
                </div>
                <div className="flex h-[10rem] w-full flex-col items-center justify-center">
                  {showGuideTimes ? (
                    <Button
                      onClick={handleGuideAudio}
                      className={`flex h-[84px] w-[84px] items-center justify-center rounded-full shadow-none hover:shadow-none ${
                        isloading || guideTime == 0
                          ? "bg-[#A85D6E]"
                          : "bg-[#FA003F]"
                      }`}
                    >
                      {isloading ? (
                        <div className="flex h-16 w-16 items-center justify-center">
                          <Lottie
                            options={defaultOption}
                            isClickToPauseDisabled={true}
                          />
                        </div>
                      ) : (
                        <Avatar
                          src="/img/check.svg"
                          className="h-auto w-[42px] rounded-none"
                        />
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartRecording}
                      className={`flex h-[84px] w-[84px] items-center justify-center rounded-full shadow-none hover:shadow-none ${
                        isloading ? "bg-[#A85D6E]" : "bg-[#FA003F]"
                      }`}
                    >
                      {recordingRef.current ? (
                        <CountdownTimer
                          status={recordingRef.current}
                          setCountTime={setCountTime}
                        />
                      ) : isloading ? (
                        <div className="flex h-16 w-16 items-center justify-center">
                          <Lottie
                            options={defaultOption}
                            isClickToPauseDisabled={true}
                          />
                        </div>
                      ) : (
                        <Avatar
                          src="/img/mic.svg"
                          className="h-auto w-[36px] rounded-none"
                        />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showSpeedControlbar && (
          <div className="fixed bottom-0 left-0 right-0 z-50 h-[124px] w-full bg-white px-5 pt-6">
            <div className="flex w-full justify-between">
              <Typography className="!font-sans text-2xl font-bold">
                Playback Speed 2.0
              </Typography>
              <Button
                onClick={handleSpeedControlbar}
                className="flex h-8 w-8 items-center justify-center border-[1px] border-[#D5D5D5] bg-white p-0 shadow-none hover:shadow-none"
              >
                <Avatar src="/img/close.svg" className="h-auto w-4" />
              </Button>
            </div>
            <div className="mt-4 flex h-10 w-full justify-center">
              {speedList.map((item, idx) => {
                let roundedClass = "";
                switch (idx) {
                  case 0:
                    roundedClass = "rounded-r-none";
                    break;
                  case 1:
                  case 2:
                    roundedClass = "rounded-none";
                    break;
                  case 3:
                    roundedClass = "rounded-l-none";
                    break;
                  default:
                    return;
                }
                return (
                  <Button
                    key={item}
                    onClick={() => handleChangeSpeed(item)}
                    disabled={item == speed}
                    className={`flex w-[5rem] items-center justify-center border-[1px] border-[#D5D5D5] bg-white p-0 !font-sans text-lg text-black shadow-none hover:bg-[#D5D5D5] hover:shadow-none ${roundedClass}`}
                  >
                    {item}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {showSharebar && (
          <div className="fixed bottom-0 left-0 right-0 z-50 h-[124px] w-full bg-white px-5 pt-6">
            <div className="flex w-full justify-between">
              <Typography className="!font-sans text-2xl font-bold">
                Share this guide
              </Typography>
              <Button
                onClick={handleSharebar}
                className="flex h-8 w-8 items-center justify-center border-[1px] border-[#D5D5D5] bg-white p-0 shadow-none hover:shadow-none"
              >
                <Avatar src="/img/close.svg" className="h-auto w-4" />
              </Button>
            </div>
            <div className="mt-4 flex h-10 w-full justify-center">
              <Button
                onClick={handleCopyContent}
                className="flex w-full items-center justify-between rounded-lg border-[1px] border-[#D5D5D5] bg-white px-4 py-0 shadow-none hover:bg-[#D5D5D5] hover:shadow-none"
              >
                <Typography className="!font-sans text-lg font-bold normal-case text-black">
                  {copyTitle}
                </Typography>
                <Avatar
                  src="/img/copy.svg"
                  className="h-auto w-6 !rounded-none"
                />
              </Button>
            </div>
          </div>
        )}

        <ReactMic
          record={recordingRef.current}
          className="hidden"
          onStop={onStop}
        />
      </div>
    </>
  );
}

export default Home;

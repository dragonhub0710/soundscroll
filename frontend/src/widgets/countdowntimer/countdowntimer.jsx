import { Typography } from "@material-tailwind/react";
import React, { useState, useEffect } from "react";

const CountdownTimer = (props) => {
  // Initial time set to 2 minutes in seconds
  const initialTime = 120;
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // Exit early when we reach 0
    if (!props.status || timeLeft === 0) return;
    // setTimeLeft(120);
    // Save intervalId to clear the interval when the
    // component re-renders or unmounts
    const intervalId = setInterval(() => {
      setTimeLeft(timeLeft - 1);
      props.setCountTime(timeLeft);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, isStarted]);

  useEffect(() => {
    if (props.status) {
      setTimeLeft(120);
      setIsStarted(true);
    }
  }, [props.status]);

  // Format timeLeft into mm:ss
  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Pad single digit minutes and seconds with a leading zero
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div>
      <Typography className="!font-sans text-2xl font-semibold text-white">
        {formatTimeLeft()}
      </Typography>
    </div>
  );
};

export default CountdownTimer;

import React, { useState, useRef } from "react";
import Transcription from "./components/Transcription";
import CanvasVisualizer from "./components/CanvasVisualizer";
import TimerInput from "./components/TimerInput";
import RecorderControls from "./components/RecorderControls";
import AudioPlayer from "./components/AudioPlayer";


// Main VoiceRecorder Component
export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null); // For the optional timer
  const [timerDuration, setTimerDuration] = useState(""); // User-input duration
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null); // Ref for the countdown timer

  const startRecording = async () => {
    console.log("startRecording");

    audioChunksRef.current = []; // Reset audio chunks

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(audioBlob));
      };
    
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 2048;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);

      if (timerDuration) {
        setRemainingTime(timerDuration);
        timerRef.current = setInterval(() => {
          setRemainingTime((prevTime) => {
            if (prevTime === 1) {
              clearInterval(timerRef.current);
              stopRecording();
              return null;
            }
            return prevTime - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    clearInterval(timerRef.current);
    setRemainingTime(null);
  };

  const togglePauseResume = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
      } else {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>Voice Recorder with Timer</h2>
      <TimerInput timerDuration={timerDuration} setTimerDuration={setTimerDuration} isRecording={isRecording} />
      <RecorderControls
        isRecording={isRecording}
        isPaused={isPaused}
        onStart={startRecording}
        onStop={stopRecording}
        onTogglePauseResume={togglePauseResume}
      />
      {remainingTime !== null && (
        <div style={{ marginTop: "10px", fontSize: "18px" }}>
          Time Remaining: {remainingTime}s
        </div>
      )}
      {/*ref.current is mutable. If the ref object isn't attached to a DOM node, read and write this value outside rendering. */}
      <CanvasVisualizer analyser={analyserRef.current} canvasRef={canvasRef} /> 
      <AudioPlayer audioUrl={audioUrl} />
      <Transcription audioBlob={audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: "audio/webm" }) : null} />
    </div>
  );
}

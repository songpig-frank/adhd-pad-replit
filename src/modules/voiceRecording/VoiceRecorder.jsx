
import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';

export const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [error, setError] = useState('');
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
        console.log('Audio data chunk received');
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        console.log('Recording stopped, audio blob created');
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError('');
      console.log('Recording started');
    } catch (err) {
      console.error('Recording error:', err);
      setError('Error accessing microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      console.log('Recording stopped');
    }
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-container">
        {error && <div className="error-message">{error}</div>}
        <button 
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {audioURL && (
          <div className="audio-player">
            <audio controls src={audioURL} />
          </div>
        )}
      </div>
    </div>
  );
};

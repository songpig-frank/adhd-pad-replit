
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

  const generateJulianId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const time = now.getHours().toString().padStart(2, '0') + 
                 now.getMinutes().toString().padStart(2, '0') +
                 now.getSeconds().toString().padStart(2, '0');
    return `${year}${day.toString().padStart(3, '0')}-${time}-${random}`;
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      console.log('Recording stopped');
      
      // Add Julian ID to the recording data
      const julianId = generateJulianId();
      console.log('Generated Julian ID:', julianId);
      // You can store this ID with the recording data
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

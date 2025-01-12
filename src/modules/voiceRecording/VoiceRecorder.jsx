
import React, { useState, useEffect } from 'react';
import './VoiceRecorder.css';

export const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  
  return (
    <div className="voice-recorder">
      <div className="recorder-container">
        <button 
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={() => setIsRecording(!isRecording)}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
    </div>
  );
};

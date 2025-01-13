import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';
import { db, storage } from '../../firebase';
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [error, setError] = useState('');
  const [saveAudio, setSaveAudio] = useState(localStorage.getItem('saveAudio') === 'true');
  const [audioQuality, setAudioQuality] = useState(localStorage.getItem('audioQuality') || 'low');
  const [transcribedText, setTranscribedText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      setError('Error accessing microphone: ' + err.message);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSubmitTask = async () => {
    try {
      const julianId = generateJulianId();
      const taskData = {
        julianId,
        title: title || 'New Recording',
        description: description || '',
        audioUrl: audioURL,
        completed: false,
        createdAt: new Date().toISOString()
      };

      if (audioURL && saveAudio) {
        const audioBlob = await fetch(audioURL).then(r => r.blob());
        const storageRef = ref(storage, `audio/${julianId}.wav`);
        await uploadBytes(storageRef, audioBlob);
        const storedAudioURL = await getDownloadURL(storageRef);
        taskData.audioUrl = storedAudioURL;
      }

      await addDoc(collection(db, 'tasks'), taskData);
      setTitle('');
      setDescription('');
      setAudioURL('');
      alert('Task saved successfully!');
    } catch (err) {
      setError('Error saving task: ' + err.message);
    }
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-container">
        {error && <div className="error-message">{error}</div>}
        <div className="audio-settings">
          <label className="checkbox-label">
            <input 
              type="checkbox"
              className="settings-checkbox" 
              checked={saveAudio}
              onChange={(e) => {
                setSaveAudio(e.target.checked);
                localStorage.setItem('saveAudio', e.target.checked);
              }}
            />
            Save Audio Recording
          </label>
          {saveAudio && (
            <select 
              className="quality-select"
              value={audioQuality} 
              onChange={(e) => {
                setAudioQuality(e.target.value);
                localStorage.setItem('audioQuality', e.target.value);
              }}
            >
              <option value="low">Low Quality (Smaller Size)</option>
              <option value="high">High Quality</option>
            </select>
          )}
        </div>
        <div className="audio-settings">
          <div className="settings-option">
            <label className="checkbox-label">
              <input 
                type="checkbox"
                className="settings-checkbox" 
                checked={saveAudio}
                onChange={(e) => {
                  setSaveAudio(e.target.checked);
                  localStorage.setItem('saveAudio', e.target.checked);
                }}
              />
              Save Audio Recording
            </label>
            {saveAudio && (
              <select 
                className="quality-select"
                value={audioQuality} 
                onChange={(e) => {
                  setAudioQuality(e.target.value);
                  localStorage.setItem('audioQuality', e.target.value);
                }}
              >
                <option value="low">Low Quality (Smaller Size)</option>
                <option value="high">High Quality</option>
              </select>
            )}
          </div>
        </div>
        <button 
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <div className="audio-player-container">
          {audioURL && (
            <div className="audio-player">
              <audio controls src={audioURL} />
            </div>
          )}
        </div>
        <input 
          type="text" 
          placeholder="Task Title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
        />
        <textarea 
          placeholder="Task Description" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
        />
        <button onClick={handleSubmitTask}>Submit Task</button>
      </div>
    </div>
  );
};
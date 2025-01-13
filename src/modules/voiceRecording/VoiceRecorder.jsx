import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';
import { db, storage } from '../../firebase'; // Assuming firebase setup
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


export const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [error, setError] = useState('');
  const [saveAudio, setSaveAudio] = useState(localStorage.getItem('saveAudio') === 'true');
  const [audioQuality, setAudioQuality] = useState(localStorage.getItem('audioQuality') || 'low');
  const [transcribedText, setTranscribedText] = useState(''); // Added state for transcription
  const [title, setTitle] = useState(''); // Added state for task title
  const [description, setDescription] = useState(''); // Added state for task description
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

  const stopRecording = async () => {
    if (mediaRecorder.current && isRecording) {
      const julianId = generateJulianId();
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      let audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
      if (saveAudio) {
        audioBlob = await compressAudio(audioBlob);
        // Upload to Firebase Storage
        const storageRef = ref(storage, `audio/${julianId}.wav`);
        await uploadBytes(storageRef, audioBlob);
        const audioURL = await getDownloadURL(storageRef);
        setAudioURL(audioURL);
      } else {
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
      }
      console.log('Saving audio with Julian ID:', julianId);
    }
  };

  const compressAudio = async (audioBlob) => {
    // Create low quality audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioQuality === 'low' ? 8000 : 44100; // 8kHz for low quality

    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      1, // mono
      audioBuffer.duration * sampleRate,
      sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    // Render compressed audio
    const renderedBuffer = await offlineContext.startRendering();

    // Convert to WAV
    const wavBlob = await new Promise(resolve => {
      const length = renderedBuffer.length;
      const data = new Float32Array(length);
      renderedBuffer.copyFromChannel(data, 0);

      const wav = new Blob([
        new Int16Array(data.map(n => n * 0x7fff))
      ], { type: 'audio/wav' });
      resolve(wav);
    });

    return wavBlob;
  };

  const handleSubmitTask = async () => {
    try {
      const julianId = generateJulianId();
      const cleanTitle = (title || transcribedText.substring(0, 50) || 'New Task').replace(/[*]/g, '').trim();
      const cleanDescription = (description || transcribedText || '').replace(/[*]/g, '').trim();
      
      const taskData = {
        julianId,
        title: cleanTitle,
        description: cleanDescription,
        text: transcribedText,
        completed: false,
        createdAt: new Date().toLocaleString()
      };

      // If we have audio and save is enabled
      if (audioURL && saveAudio) {
        const audioBlob = await fetch(audioURL).then(r => r.blob());
        const storageRef = ref(storage, `audio/${julianId}.wav`);
        await uploadBytes(storageRef, audioBlob);
        const storedAudioURL = await getDownloadURL(storageRef);
        taskData.audioUrl = storedAudioURL;
      }

      // Add to tasks collection
      await addDoc(collection(db, 'tasks'), taskData);

      setTranscribedText('');
      setAudioURL('');
      setTitle('');
      setDescription('');

      if (isRecording) {
        stopRecording();
      }

      alert("Task created successfully!");
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + error.message);
    }
  };


  return (
    <div className="voice-recorder">
      <div className="recorder-container">
        {error && <div className="error-message">{error}</div>}
        <div className="audio-settings">
          <label>
            <input 
              type="checkbox" 
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
            <div className="audio-timestamp">New Recording</div>
          </div>
        )}
      </div>
        <input type="text" placeholder="Task Title" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea placeholder="Task Description" value={description} onChange={e => setDescription(e.target.value)} />
        <button onClick={handleSubmitTask}>Submit Task</button> {/* Added Submit Task button */}
      </div>
    </div>
  );
};
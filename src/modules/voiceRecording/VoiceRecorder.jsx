import React, { useState, useRef } from 'react';
import './VoiceRecorder.css';
import { db } from './firebase'; // Assuming firebase setup
import { collection, addDoc } from "firebase/firestore";


export const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [error, setError] = useState('');
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
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
      const filename = `${julianId}.wav`;
      const url = URL.createObjectURL(audioBlob);
      console.log('Saving audio with Julian ID:', julianId, 'and filename:', filename);
      setAudioURL(url);

      // Store the julianId for later use
      setTranscribedText(prev => ({
        ...prev,
        julianId: julianId,
        audioURL: url //add audio url to state
      }));
    }
  };

  const handleSubmitTask = async () => {
    // Include julianId in the task data
    const taskData = {
      julianId: transcribedText.julianId,
      title: title.replace(/\*/g, ''),
      description: description.replace(/\*/g, ''),
      text: transcribedText,
      completed: false,
      createdAt: new Date().toLocaleString()
    };

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
        <input type="text" placeholder="Task Title" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea placeholder="Task Description" value={description} onChange={e => setDescription(e.target.value)} />
        <button onClick={handleSubmitTask}>Submit Task</button> {/* Added Submit Task button */}
      </div>
    </div>
  );
};
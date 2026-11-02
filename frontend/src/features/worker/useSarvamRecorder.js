import { useEffect, useRef, useState } from 'react';

// Keep microphone ownership and late async callbacks inside one cancellable session.
export default function useSarvamRecorder({ client, language, enabled, onTranscript, onError }) {
  const session = useRef(null), callbacks = useRef({ onTranscript, onError });
  callbacks.current = { onTranscript, onError };
  const [recording, setRecording] = useState(false), [transcribing, setTranscribing] = useState(false);
  const supported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const cancel = () => {
    const current = session.current;
    session.current = null;
    if (current) {
      clearTimeout(current.timer);
      current.controller.abort();
      if (current.recorder?.state === 'recording') current.recorder.stop();
      current.stream?.getTracks().forEach(track => track.stop());
    }
    setRecording(false); setTranscribing(false);
  };
  useEffect(() => () => cancel(), [client, language, enabled]);
  const toggle = async () => {
    if (!enabled || !supported) return;
    if (session.current) {
      if (session.current.recorder?.state === 'recording') session.current.recorder.stop();
      return;
    }
    const current = { controller: new AbortController(), chunks: [], size: 0 };
    session.current = current;
    try {
      current.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true }, video: false });
      if (session.current !== current) { current.stream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('No supported recording format. Type your report instead.');
      current.recorder = new MediaRecorder(current.stream, { mimeType });
      current.recorder.ondataavailable = event => {
        if (session.current !== current || !event.data.size) return;
        current.size += event.data.size;
        if (current.size > 2 * 1024 * 1024) {
          cancel(); callbacks.current.onError('Recording is too large. Record a shorter report or type it.'); return;
        }
        current.chunks.push(event.data);
      };
      current.recorder.onerror = () => { if (session.current === current) { cancel(); callbacks.current.onError('Recording failed. Type your report instead.'); } };
      current.recorder.onstop = async () => {
        current.stream.getTracks().forEach(track => track.stop());
        clearTimeout(current.timer);
        if (session.current !== current) return;
        setRecording(false); setTranscribing(true);
        try {
          const audio = new Blob(current.chunks, { type: mimeType });
          if (!audio.size) throw new Error('No audio captured. Try again or type your report.');
          const result = await client.transcribe(audio, language, { signal: current.controller.signal });
          if (session.current === current) callbacks.current.onTranscript(result);
        } catch (error) {
          if (session.current === current) callbacks.current.onError(error.message);
        } finally {
          if (session.current === current) { session.current = null; setTranscribing(false); }
        }
      };
      current.recorder.start(250);
      setRecording(true);
      current.timer = setTimeout(() => { if (current.recorder.state === 'recording') current.recorder.stop(); }, 20000);
    } catch (error) {
      current.stream?.getTracks().forEach(track => track.stop());
      if (session.current === current) {
        cancel(); callbacks.current.onError(error.name === 'NotAllowedError' ? 'Microphone permission was denied. Type your report instead.' : error.message);
      }
    }
  };
  return { recording, transcribing, supported, toggle, cancel };
}

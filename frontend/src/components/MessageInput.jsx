import React, { useState, useRef, useEffect } from 'react';
import LocationPicker from './LocationPicker';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the media file'));
    reader.readAsDataURL(blob);
  });
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaError, setMediaError] = useState('');
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingStartedRef = useRef(0);
  const discardRecordingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  useEffect(() => () => {
    discardRecordingRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend({ type: 'text', text: trimmed });
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleLocationConfirm = (location) => {
    setShowLocationPicker(false);
    onSend({ type: 'location', location });
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setMediaError('');
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setMediaError('Choose a JPEG or PNG image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMediaError('The image must be 5 MB or smaller.');
      return;
    }

    try {
      const data = await toDataUrl(file);
      onSend({
        type: 'image',
        previewUrl: data,
        media: { data, mimeType: file.type, fileName: file.name },
      });
    } catch (err) {
      setMediaError(err.message);
    }
  };

  const releaseRecorder = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    setMediaError('');
    setShowLocationPicker(false);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMediaError('Microphone recording is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = [
        'audio/ogg;codecs=opus',
        'audio/webm;codecs=opus',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRecordingRef.current = false;
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => setMediaError('Microphone recording failed.');
      recorder.onstop = async () => {
        const discard = discardRecordingRef.current;
        const duration = Math.max(1, Math.round((Date.now() - recordingStartedRef.current) / 1000));
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm',
        });
        releaseRecorder();
        setIsRecording(false);
        if (discard || !blob.size) return;
        if (blob.size > MAX_AUDIO_BYTES) {
          setMediaError('The voice message must be 16 MB or smaller.');
          return;
        }

        try {
          const data = await toDataUrl(blob);
          const extension = blob.type.startsWith('audio/ogg')
            ? 'ogg'
            : blob.type.startsWith('audio/mp4') ? 'm4a' : 'webm';
          onSend({
            type: 'audio',
            previewUrl: data,
            duration,
            media: {
              data,
              mimeType: blob.type,
              fileName: `voice-${Date.now()}.${extension}`,
            },
          });
        } catch (err) {
          setMediaError(err.message);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      const startedAt = Date.now();
      recordingStartedRef.current = startedAt;
      timerRef.current = setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 250);
    } catch (err) {
      releaseRecorder();
      setIsRecording(false);
      setMediaError(err.name === 'NotAllowedError'
        ? 'Microphone permission was denied.'
        : 'Could not access the microphone.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const cancelRecording = () => {
    discardRecordingRef.current = true;
    stopRecording();
  };

  return (
    <div className="relative">
      {/* Location picker popup */}
      {showLocationPicker && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <LocationPicker
            onConfirm={handleLocationConfirm}
            onCancel={() => setShowLocationPicker(false)}
          />
        </div>
      )}

      {mediaError && (
        <div className="absolute bottom-full left-3 right-3 mb-2 z-40 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
          {mediaError}
        </div>
      )}

      <div className="flex items-end gap-2 bg-wa-input px-3 py-2 border-t border-wa-border">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleImageChange}
          className="hidden"
        />

        {/* Image button */}
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled || isRecording}
          title="Send image"
          aria-label="Send image"
          className="flex-shrink-0 w-9 h-10 rounded-full flex items-center justify-center text-xl text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          📷
        </button>

        {/* Location button */}
        <button
          onClick={() => setShowLocationPicker((v) => !v)}
          disabled={disabled || isRecording}
          title="Share location"
          aria-label="Share location"
          className={`
            flex-shrink-0 w-9 h-10 rounded-full flex items-center justify-center text-xl
            transition-colors disabled:opacity-40
            ${showLocationPicker ? 'bg-wa-teal text-white' : 'text-gray-500 hover:bg-gray-200'}
          `}
        >
          📍
        </button>

        {isRecording && (
          <button
            onClick={cancelRecording}
            title="Cancel recording"
            aria-label="Cancel recording"
            className="flex-shrink-0 w-8 h-10 text-gray-500 hover:text-red-600"
          >
            ✕
          </button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isRecording}
          placeholder={isRecording ? `Recording ${formatDuration(recordingSeconds)}…` : 'Type a message'}
          className="
            flex-1 bg-white rounded-2xl px-4 py-2 text-sm resize-none
            border border-wa-border focus:outline-none focus:border-wa-teal
            overflow-hidden max-h-28 leading-5 disabled:opacity-50
          "
        />

        {/* Send text, or record/send a voice message when the composer is empty */}
        {text.trim() && !isRecording ? (
          <button
            onClick={handleSendText}
            disabled={disabled}
            title="Send message"
            aria-label="Send message"
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-wa-teal text-white hover:bg-wa-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            title={isRecording ? 'Stop and send voice message' : 'Record voice message'}
            aria-label={isRecording ? 'Stop and send voice message' : 'Record voice message'}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl text-white transition-colors disabled:opacity-40 ${isRecording ? 'bg-red-500 animate-pulse hover:bg-red-600' : 'bg-wa-teal hover:bg-wa-dark'}`}
          >
            {isRecording ? '■' : '🎙️'}
          </button>
        )}
      </div>
    </div>
  );
}

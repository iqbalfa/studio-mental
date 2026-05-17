import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Download } from 'lucide-react';

interface AudioPlayerProps {
  url: string;
  index: number;
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "00:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ url, index }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
    };
    
    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnd);

    // Trigger load to ensure metadata is fetched
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [url]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 w-full max-w-xl shadow-sm">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <span className="text-xs font-bold text-slate-500 w-6">#{index + 1}</span>
      
      <div className="flex items-center gap-1">
          <button 
            onClick={togglePlay}
            className="p-2 hover:bg-slate-700 rounded-full text-purple-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button 
            onClick={stop}
            className="p-2 hover:bg-slate-700 rounded-full text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
            title="Stop"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-[10px] text-slate-400 font-mono w-8 text-right">{formatTime(currentTime)}</span>
        <input 
          type="range" 
          min={0} 
          max={duration || 100} 
          value={currentTime} 
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <span className="text-[10px] text-slate-400 font-mono w-8">{formatTime(duration)}</span>
      </div>

      <div className="w-px h-6 bg-slate-700 mx-1"></div>

      <a 
        href={url} 
        download={`tts-copy-${index + 1}.wav`}
        className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50"
        title="Download Audio"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
};

export default AudioPlayer;

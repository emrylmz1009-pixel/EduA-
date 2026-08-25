import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flame, Sun, Sparkles, Volume1, HelpCircle, Activity } from 'lucide-react';

export default function FocusRoom() {
  // Sound loop states
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef(null);

  // Timer states (Pomodoro)
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

  // Breathing Guide state
  const [breathText, setBreathText] = useState('Nefes Al');
  const [breathStage, setBreathStage] = useState('in'); // 'in', 'hold', 'out'

  const tracks = [
    { id: 'lofi', name: 'Lofi Odaklanma Melodisi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', icon: '🎧' },
    { id: 'rain', name: 'Rahatlatıcı Yağmur Sesi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', icon: '🌧️' },
    { id: 'forest', name: 'Doğa & Orman Kuşları', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', icon: '🌳' },
    { id: 'ambient', name: 'Beyaz Gürültü (Cozy)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', icon: '✨' }
  ];

  useEffect(() => {
    // Create new audio element on mount
    audioRef.current = new Audio();
    audioRef.current.loop = true;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Sync volume state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Breathing meditation loop
  useEffect(() => {
    const breathTimer = setInterval(() => {
      setBreathStage(prev => {
        if (prev === 'in') {
          setBreathText('Nefes Tut');
          return 'hold';
        } else if (prev === 'hold') {
          setBreathText('Nefes Ver');
          return 'out';
        } else {
          setBreathText('Nefes Al');
          return 'in';
        }
      });
    }, 4000); // 4-second breathing cycles

    return () => clearInterval(breathTimer);
  }, []);

  // Timer loop
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimerRunning(false);
            // Ring buzzer sound natively
            try {
              const buzzer = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
              buzzer.play();
            } catch (e) {
              console.error(e);
            }
            alert('Odaklanma seansınız bitti! Şimdi 5 dakika mola zamanı! ☕');
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning]);

  const handleSelectTrack = (track) => {
    if (!audioRef.current) return;

    if (activeTrack?.id === track.id) {
      // Toggle play/pause
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => console.error("Audio playback error", e));
        setIsPlaying(true);
      }
    } else {
      // Switch track
      audioRef.current.pause();
      audioRef.current.src = track.url;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.error("Audio playback error", e));
      setActiveTrack(track);
      setIsPlaying(true);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setActiveTrack(null);
    }
  };

  const toggleTimer = () => {
    setTimerRunning(!timerRunning);
  };

  const handleResetTimer = () => {
    clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            MEDİTASYON VE ODAKLANMA
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Odaklanma Odası</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Arka plan ambiyans seslerini açın, nefes alma animasyonuna katılın ve Pomodoro zamanlayıcı ile dikkatinizi dağıtmadan yüksek odakla çalışın.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Panel: Ambience Sounds Player */}
        <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-indigo-600" />
            <span>DERS SESLERİ</span>
          </h4>

          <div className="space-y-2">
            {tracks.map((t) => {
              const isActive = activeTrack?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTrack(t)}
                  className={`w-full p-3.5 rounded-2xl border transition text-left flex items-center justify-between outline-none ${
                    isActive 
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 ring-2 ring-indigo-500/10'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-600 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{t.icon}</span>
                    <span className="text-xs font-bold">{t.name}</span>
                  </div>
                  {isActive && isPlaying && (
                    <div className="flex gap-0.5 items-end h-3">
                      <div className="w-0.5 bg-indigo-600 h-2 animate-bounce" />
                      <div className="w-0.5 bg-indigo-600 h-3 animate-bounce delay-75" />
                      <div className="w-0.5 bg-indigo-600 h-1.5 animate-bounce delay-150" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {activeTrack && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>SES DÜZEYİ</span>
                <button 
                  onClick={handleStopAudio}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Kapat
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Volume1 className="w-4 h-4 text-slate-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <Volume2 className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Pomodoro Timer & Breathing Circle */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Pomodoro Timer */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between items-center text-center min-h-[250px]">
            <div className="w-full border-b border-slate-50 pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">ZAMANLAYICI</span>
            </div>

            <div className="py-4">
              <div className="text-4xl md:text-5xl font-black text-slate-800 font-mono tracking-wider">
                {formatTime(timeLeft)}
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Sessiz Odaklanma Oturumu</span>
            </div>

            <div className="flex gap-2.5 w-full">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-3 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                  timerRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {timerRunning ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{timerRunning ? 'Durdur' : 'Başlat'}</span>
              </button>
              <button
                onClick={handleResetTimer}
                className="py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Breathing Meditation Guide */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between items-center text-center min-h-[250px]">
            <div className="w-full border-b border-slate-50 pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">ZEN NEFES KOÇU</span>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-2">
              {/* Breathing circle animation */}
              <div 
                className={`absolute rounded-full border border-indigo-100/50 bg-indigo-50/20 transition-all duration-[4000ms] ease-in-out ${
                  breathStage === 'in' 
                    ? 'w-24 h-24 scale-110 opacity-70' 
                    : breathStage === 'hold'
                      ? 'w-24 h-24 scale-110 opacity-100 bg-indigo-100/30'
                      : 'w-16 h-16 scale-95 opacity-40'
                }`}
              />
              <span className="font-extrabold text-xs text-indigo-700 z-10 select-none animate-pulse">
                {breathText}
              </span>
            </div>

            <span className="text-[10px] text-slate-400 font-bold block max-w-[150px] leading-snug">
              Zihninizi dinlendirmek için halkayı takip ederek nefes alın.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

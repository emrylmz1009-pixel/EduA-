import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Music, 
  CheckSquare, 
  Square, 
  Trash2, 
  Plus, 
  Maximize2, 
  Minimize2, 
  Calendar, 
  Volume2, 
  Users, 
  Sparkles, 
  Heart,
  UserCheck
} from 'lucide-react';

export default function ProductivityPanel({ onZenToggle, isZenMode }) {
  // Pomodoro states
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);

  // Sound generator
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const [ambientSound, setAmbientSound] = useState('none'); // none, rain (brown noise), zen (sine waves)

  // To-Do list states
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [todoPriority, setTodoPriority] = useState('Orta');
  const [todoTag, setTodoTag] = useState('#genel');

  // Exercise recommendation state
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);

  const exercises = [
    { title: "20-20-20 Kuralı", text: "Göz yorgunluğunu önlemek için 20 saniye boyunca 20 fit (6 metre) uzaktaki bir nesneye odaklanın." },
    { title: "Derin Nefes Egzersizi", text: "4 saniye boyunca burnunuzdan nefes alın, 4 saniye tutun, 4 saniyede ağzınızdan yavaşça verin." },
    { title: "Boyun ve Omuz Esnetme", text: "Başınızı yavaşça sağa ve sola eğerek boynunuzu 10 saniye boyunca esnetin, ardından omuzlarınızı dairesel olarak çevirin." },
    { title: "Duruş Kontrolü", text: "Sırtınızı dikleştirin, omuzlarınızı gevşetin ve ayaklarınızı yere basın. Postürünüzü düzeltin." }
  ];

  // Simulated virtual study buddies (Feature 71)
  const [studyBuddies, setStudyBuddies] = useState([
    { name: "Ahmet", action: "Matematik çalışıyor", duration: "32 dk", status: "study" },
    { name: "Selin", action: "Pomodoro Molasında", duration: "4 dk", status: "break" },
    { name: "Can", action: "Tarih kartlarını tekrar ediyor", duration: "18 dk", status: "study" }
  ]);

  // Load stats & todos
  useEffect(() => {
    const savedTodos = localStorage.getItem('eduai_todos');
    if (savedTodos) setTodos(JSON.parse(savedTodos));

    const savedPomos = localStorage.getItem('eduai_pomodoro_count') || '0';
    setPomodorosCompleted(parseInt(savedPomos));
  }, []);

  // Update study buddies timer simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setStudyBuddies(prev => prev.map(buddy => {
        if (buddy.status === 'study') {
          const currentMins = parseInt(buddy.duration) || 0;
          return { ...buddy, duration: `${currentMins + 1} dk` };
        }
        return buddy;
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Pomodoro ticking effect
  useEffect(() => {
    let interval = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished
            playChime();
            if (!isBreak) {
              // Work finished, enter break
              setIsBreak(true);
              setMinutes(5);
              setPomodorosCompleted(prev => {
                const count = prev + 1;
                localStorage.setItem('eduai_pomodoro_count', count.toString());
                return count;
              });
            } else {
              // Break finished, return to work
              setIsBreak(false);
              setMinutes(25);
            }
            setIsActive(false);
            // Rotate break exercises
            setActiveExerciseIndex(prev => (prev + 1) % exercises.length);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, isBreak]);

  // Audio Context synthesis for chimes
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.7);
    } catch (e) {
      console.error(e);
    }
  };

  // Sound generator synthesis (offline rain / brown noise)
  const toggleAmbientSound = (type) => {
    if (ambientSound === type) {
      stopAmbient();
      setAmbientSound('none');
      return;
    }
    
    stopAmbient();
    setAmbientSound(type);

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;

      const bufferSize = 4 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === 'rain') {
        // Brown noise simulation (rainy effect)
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 4.0; // volume boost
        }
      } else if (type === 'zen') {
        // Soft meditative hum
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.sin(2 * Math.PI * 110 * (i / audioCtx.sampleRate)) * 0.2; // 110Hz soft hum
        }
      }

      const source = audioCtx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = type === 'rain' ? 800 : 250; // low frequency cut

      const gain = audioCtx.createGain();
      gain.gain.value = 0.15;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      source.start();
      noiseSourceRef.current = source;
    } catch (e) {
      console.error(e);
    }
  };

  const stopAmbient = () => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch (e) {}
      noiseSourceRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopAmbient();
  }, []);

  // To-Do managers
  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    const newTodo = {
      id: Date.now(),
      text: newTodoText.trim(),
      priority: todoPriority,
      tag: todoTag,
      completed: false
    };
    const updated = [...todos, newTodo];
    setTodos(updated);
    localStorage.setItem('eduai_todos', JSON.stringify(updated));
    setNewTodoText('');
  };

  const handleToggleTodo = (id) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    localStorage.setItem('eduai_todos', JSON.stringify(updated));
  };

  const handleDeleteTodo = (id) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    localStorage.setItem('eduai_todos', JSON.stringify(updated));
  };

  // Calendar sync ICS exporter
  const handleExportICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EduAI//Smart Study//EN
BEGIN:VEVENT
SUMMARY:EduAI Ders Çalışma Oturumu
DESCRIPTION:EduAI odaklanma paneli üzerinden başarıyla tamamlanan ders çalışma seansı.
DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DURATION:PT25M
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'eduai-calisma-plani.ics';
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Zen Button / Pomodoro header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Verimlilik & Odaklanma Paneli</h2>
          <p className="text-xs text-slate-500 mt-0.5">Çalışma sürenizi planlayın, to-do takibi yapın ve ambient seslerle dikkatinizi toplayın.</p>
        </div>

        <button
          onClick={onZenToggle}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition ${
            isZenMode 
              ? 'bg-slate-900 border-slate-900 text-white' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="Odaklanma Modu (Zen Teması) Tam Ekran"
        >
          {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isZenMode ? 'Zen Modunu Kapat' : 'Zen Modunu Aç'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pomodoro Timer Widget */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              isBreak ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {isBreak ? 'MOLA ZAMANI' : 'ODAKLANMA SEANSI'}
            </span>
          </div>

          {/* Circle countdown placeholder / digital clock */}
          <div className="relative w-44 h-44 rounded-full border-4 border-slate-100 flex flex-col items-center justify-center shadow-inner">
            <span className="text-4xl font-black text-slate-800 font-mono">
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 font-semibold">
              Tamamlanan: {pomodorosCompleted}
            </span>
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-sm ${
                isActive 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isActive ? 'Durdur' : 'Başlat'}</span>
            </button>
            <button
              onClick={() => { setIsActive(false); setMinutes(isBreak ? 5 : 25); setSeconds(0); }}
              className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition"
              title="Sıfırla"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Sound Controls */}
          <div className="w-full pt-4 border-t border-slate-100 text-left space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Odak Müzikleri (Dahili Gürültü)</span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => toggleAmbientSound('rain')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                  ambientSound === 'rain' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Yağmur (Brownian)
              </button>
              <button
                onClick={() => toggleAmbientSound('zen')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                  ambientSound === 'zen' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                Meditasyon
              </button>
            </div>
          </div>
        </div>

        {/* To-Do List Widget */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Çalışma Planım (Yapılacaklar)</h3>
            
            {/* Input area */}
            <div className="space-y-2.5 mb-4">
              <input 
                type="text" 
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder="Yeni çalışma görevi ekle..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
              />
              
              <div className="flex gap-2">
                <select
                  value={todoPriority}
                  onChange={(e) => setTodoPriority(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] text-slate-600 outline-none"
                >
                  <option value="Düşük">Düşük</option>
                  <option value="Orta">Orta</option>
                  <option value="Yüksek">Yüksek</option>
                </select>

                <input 
                  type="text"
                  value={todoTag}
                  onChange={(e) => setTodoTag(e.target.value)}
                  placeholder="#dersetiketi"
                  className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] outline-none"
                />

                <button
                  onClick={handleAddTodo}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Todo items */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {todos.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs gap-3">
                  <button 
                    onClick={() => handleToggleTodo(t.id)}
                    className="text-slate-400 hover:text-indigo-600"
                  >
                    {t.completed ? <UserCheck className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`block font-medium truncate ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {t.text}
                    </span>
                    <div className="flex gap-1.5 text-[9px] mt-0.5 font-bold uppercase">
                      <span className={
                        t.priority === 'Yüksek' ? 'text-rose-600' :
                        t.priority === 'Orta' ? 'text-amber-600' : 'text-slate-400'
                      }>{t.priority}</span>
                      <span className="text-indigo-600">{t.tag}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteTodo(t.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {todos.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Görev listeniz boş.</p>
              )}
            </div>
          </div>

          <button
            onClick={handleExportICS}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition mt-4"
          >
            <Calendar className="w-4 h-4" />
            Takvim Planını İndir (.ICS)
          </button>
        </div>

        {/* Break Recommendations & Simulated buddies */}
        <div className="space-y-6">
          {/* Mola Egzersiz Önerileri */}
          <div className="bg-gradient-to-r from-rose-50 to-rose-100/40 border border-rose-100 rounded-3xl p-5 shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <Heart className="w-4.5 h-4.5 text-rose-600 fill-rose-600" />
              Mola & Sağlık İpuçları
            </h4>
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-800 block">{exercises[activeExerciseIndex].title}</span>
              <p className="text-[11px] text-slate-600 leading-normal">{exercises[activeExerciseIndex].text}</p>
            </div>
          </div>

          {/* Simulated Study buddies */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-indigo-600" />
              Sanal Kütüphane (Aktif Çalışanlar)
            </h4>
            
            <div className="space-y-3">
              {studyBuddies.map((buddy, index) => (
                <div key={index} className="flex items-center gap-3 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    buddy.status === 'study' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <strong className="text-slate-800">{buddy.name}</strong>
                    <span className="text-slate-500 block text-[10px] truncate">{buddy.action}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{buddy.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

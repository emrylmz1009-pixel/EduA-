import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Play, Pause, Square, SkipForward, BookOpen, AlertCircle, RefreshCw, Sparkles, Send, GraduationCap, CornerDownLeft, Loader2, ArrowRight } from 'lucide-react';
import { aiService } from '../services/ai';

export default function AudioDocAssistant({ activeDoc, apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Lecture state
  const [agenda, setAgenda] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [textInput, setTextInput] = useState('');
  
  // TTS (Speech Synthesis) state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Autoscroll chat window
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, loading]);

  useEffect(() => {
    // Initialize Webkit Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'tr-TR';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTextInput(transcript);
      };

      rec.onerror = (e) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      // Clean up TTS voice on exit
      stopSpeaking();
    };
  }, []);

  const startSpeaking = (text) => {
    if (!synthRef.current) return;
    
    // Stop any ongoing speech
    stopSpeaking();

    // Clean text from markdown patterns for natural voice readout
    const cleanText = text
      .replace(/[*#`_\-]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = playbackSpeed;
    
    // Attempt to select a Turkish female/male voice if available
    const voices = synthRef.current.getVoices();
    const trVoice = voices.find(v => v.lang.startsWith('tr'));
    if (trVoice) {
      utterance.voice = trVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const pauseSpeaking = () => {
    if (synthRef.current && synthRef.current.speaking) {
      if (synthRef.current.paused) {
        synthRef.current.resume();
        setIsPlaying(true);
      } else {
        synthRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Tarayıcınız ses tanıma teknolojisini (Speech Recognition) desteklememektedir. Lütfen Google Chrome kullanın.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeaking(); // Pause voice tutor when student starts talking
      recognitionRef.current.start();
    }
  };

  const handleStartLecture = async () => {
    if (!activeDoc || !activeDoc.text) {
      setError('Lütfen öncelikle ders notu özetleme sekmesinden geçerli bir PDF dökümanı seçin.');
      return;
    }
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    setChatHistory([]);
    setAgenda(null);
    setCurrentIdx(0);
    stopSpeaking();

    try {
      // 1. Generate Agenda/Syllabus
      const agendaData = await aiService.generateLectureAgenda(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text
      );
      setAgenda(agendaData);

      // 2. Explain first segment
      if (agendaData.sections && agendaData.sections.length > 0) {
        const firstSection = agendaData.sections[0];
        const explanation = await aiService.explainLectureSegment(
          apiKeyConfig.provider,
          apiKeyConfig.apiKey,
          apiKeyConfig.model,
          activeDoc.text,
          agendaData.agendaTitle,
          firstSection.title,
          firstSection.description,
          []
        );

        const newHistory = [
          { role: 'system_agenda', title: agendaData.agendaTitle, sections: agendaData.sections },
          { role: 'assistant', text: explanation, sectionTitle: firstSection.title }
        ];
        setChatHistory(newHistory);
        startSpeaking(explanation);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ders müfredatı planlanırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextSegment = async () => {
    if (!agenda || currentIdx + 1 >= agenda.sections.length) {
      // End of lecture
      const msg = "Tebrikler! Ders içeriğindeki tüm bölümleri başarıyla tamamladık. Konuyu pekiştirmek için Soru Hazırlama sekmesinden kendinizi test edebilirsiniz! 🎓";
      setChatHistory(prev => [...prev, { role: 'assistant', text: msg, isEnd: true }]);
      startSpeaking(msg);
      return;
    }

    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setLoading(true);
    setError('');
    stopSpeaking();

    const nextSection = agenda.sections[nextIdx];

    try {
      const historySummary = chatHistory.map(h => ({ role: h.role, content: h.text || '' }));
      const explanation = await aiService.explainLectureSegment(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text,
        agenda.agendaTitle,
        nextSection.title,
        nextSection.description,
        historySummary
      );

      setChatHistory(prev => [...prev, { role: 'assistant', text: explanation, sectionTitle: nextSection.title }]);
      startSpeaking(explanation);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Sonraki konu anlatımı yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuestion = async (e) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || loading) return;

    const userQuestion = textInput.trim();
    setTextInput('');
    stopSpeaking();
    
    const activeSection = agenda?.sections?.[currentIdx];
    const sectionTitle = activeSection ? activeSection.title : 'Genel Konu';

    setChatHistory(prev => [...prev, { role: 'user', text: userQuestion }]);
    setLoading(true);
    setError('');

    try {
      const historySummary = chatHistory.map(h => ({ role: h.role, content: h.text || '' }));
      const answer = await aiService.answerLectureQuestion(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text,
        sectionTitle,
        userQuestion,
        historySummary
      );

      setChatHistory(prev => [...prev, { role: 'assistant', text: answer, isAnswer: true }]);
      startSpeaking(answer);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Soru cevaplanırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    // Restart active speech with new rate
    const lastAssistantMessage = [...chatHistory].reverse().find(msg => msg.role === 'assistant');
    if (lastAssistantMessage) {
      startSpeaking(lastAssistantMessage.text);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            İNTERAKTİF SESLİ EĞİTMEN
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Sesli PDF Asistanı</h2>
          <p className="text-xs md:text-sm text-slate-500">
            PDF dökümanlarınızı yapay zeka sesli olarak anlatsın. Anlatım sırasında mikrofonunuza konuşarak soru sorun, öğretmeniniz cevaplasın.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Volume2 className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!activeDoc ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Aktif Döküman Bulunamadı</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Sesli PDF Asistanı'nı kullanabilmek için öncelikle döküman yükleme sekmesinden veya Metin Özetleme ekranından geçerli bir PDF dosyası yüklemelisiniz.
          </p>
        </div>
      ) : !agenda ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <span className="text-xs text-slate-400 font-bold block">YÜKLENEN DÖKÜMAN</span>
            <h4 className="font-bold text-slate-800 text-base">{activeDoc.name}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              ({(activeDoc.size / 1024).toFixed(1)} KB - Toplam {activeDoc.text?.length || 0} karakter)
            </p>
          </div>

          <button
            onClick={handleStartLecture}
            disabled={loading}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mx-auto shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Müfredat Planlanıyor...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Dersi / Anlatımı Başlat</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Agenda Tracker */}
          <div className="md:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2">
              DERS MÜFREDATI
            </h4>
            <div className="space-y-3">
              {agenda.sections?.map((sec, idx) => {
                const isActive = idx === currentIdx;
                const isCompleted = idx < currentIdx;
                return (
                  <div 
                    key={idx}
                    className={`p-3 rounded-2xl border text-left transition flex gap-2.5 items-start ${
                      isActive 
                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 ring-2 ring-indigo-500/10' 
                        : isCompleted
                          ? 'border-emerald-100 bg-emerald-50/10 text-emerald-800'
                          : 'border-slate-100 bg-white text-slate-500'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black mt-0.5 ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    )}
                    <div>
                      <h5 className="font-bold text-xs leading-snug">{sec.title}</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{sec.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Playback Controls & Voice parameters */}
            <div className="border-t border-slate-100 pt-4 space-y-3.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>SES HIZI CONTROLLER</span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{playbackSpeed}x</span>
              </div>
              <div className="flex gap-1.5">
                {[0.8, 1.0, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => changeSpeed(speed)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition ${
                      playbackSpeed === speed
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    {speed === 1.0 ? 'Normal' : `${speed}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Tutor Chat & Voice Interface */}
          <div className="md:col-span-8 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col h-[550px]">
            {/* Tutor voice player strip */}
            <div className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm shadow-indigo-150 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0 ${
                  isPlaying ? 'animate-pulse' : ''
                }`}>
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Yapay Zeka Sesli Anlatım</h4>
                  <p className="text-[10px] text-indigo-200 mt-0.5 leading-none">
                    {isPlaying ? 'Tutor dersi seslendiriyor...' : 'Ses oynatıcı hazır.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={pauseSpeaking}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                  title={isPlaying ? 'Durdur' : 'Devam Et'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
                </button>
                <button
                  onClick={stopSpeaking}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                  title="Sustur"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                </button>
              </div>
            </div>

            {/* Chat Conversation Logs */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
              {chatHistory.map((msg, idx) => {
                if (msg.role === 'system_agenda') return null;
                const isAssistant = msg.role === 'assistant';
                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div className="max-w-[85%] space-y-1">
                      {isAssistant && msg.sectionTitle && (
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block">
                          📖 {msg.sectionTitle}
                        </span>
                      )}
                      {isAssistant && msg.isAnswer && (
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider block">
                          💬 SORU CEVABI
                        </span>
                      )}
                      
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-50 text-slate-800 border border-slate-100/50 rounded-tl-none'
                          : 'bg-indigo-600 text-white rounded-tr-none font-medium'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 bg-slate-50 text-slate-400 text-xs rounded-2xl rounded-tl-none animate-pulse">
                    Öğretmeniniz konuyu hazırlıyor...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Q&A Chat Voice Control Form */}
            <div className="flex-shrink-0 pt-2 border-t border-slate-100 flex flex-col gap-3">
              {/* If section is finished, show button to proceed next section */}
              {chatHistory.length > 0 && !loading && (
                <button
                  onClick={handleNextSegment}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100/75 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2"
                >
                  <span>Sonraki Bölüme Geç (Devam Et)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <form onSubmit={handleSendQuestion} className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition outline-none ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  title={isListening ? 'Mikrofonu Kapat' : 'Konuşarak Soru Sor'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={isListening ? 'Konuşmanız dinleniyor...' : 'Aklınıza takılan bir soruyu buraya yazın veya konuşun...'}
                    disabled={isListening}
                    className="w-full pl-4 pr-10 py-3 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs outline-none bg-white font-medium"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700 outline-none"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

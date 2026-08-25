import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, AlertCircle, Loader2, Sparkles, User, MessageSquare, Trash2, ArrowRight, BookOpen } from 'lucide-react';
import { aiService } from '../services/ai';

export default function AITutorChat({ apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [persona, setPersona] = useState('Genel Yardımcı & Rehberlik');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Merhaba! Ben yapay zeka ders ortağın. Bugün hangi dersi çalışıyoruz veya kafana takılan soru nedir? Sorunu yazabilir veya mikrofonu açıp sesli söyleyebilirsin.' }
  ]);
  const [inputValue, setInputValue] = useState('');

  // Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Speech Synthesis states
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const [activeSpeechIdx, setActiveSpeechIdx] = useState(null);

  const chatEndRef = useRef(null);

  const personas = [
    { id: 'Genel Yardımcı & Rehberlik', name: 'Genel Rehberlik & Koç', icon: '🎯' },
    { id: 'Matematik Öğretmeni', name: 'Matematik Öğretmeni', icon: '📐' },
    { id: 'Fizik, Kimya ve Biyoloji (Fen)', name: 'Fen Bilimleri Öğretmeni', icon: '🧪' },
    { id: 'Türkçe, Edebiyat ve Sosyal Bilgiler', name: 'Edebiyat & Sosyal Öğretmeni', icon: '📚' },
    { id: 'İngilizce / Yabancı Dil Koçu', name: 'İngilizce Dil Koçu', icon: '🇬🇧' }
  ];

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Init Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'tr-TR';

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' ';
        }
        setInputValue(text);
      };
      rec.onerror = (e) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  const startSpeaking = (text, idx) => {
    if (!synthRef.current) return;
    stopSpeaking();

    // Strip markdown formatting symbols before reading
    const cleanText = text
      .replace(/[*#`_\-]/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';

    // Apply voice preferences
    const savedVoice = localStorage.getItem('eduai_selected_voice');
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v => v.name === savedVoice) || voices.find(v => v.lang.startsWith('tr'));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsPlaying(true);
      setActiveSpeechIdx(idx);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setActiveSpeechIdx(null);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveSpeechIdx(null);
    };

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setActiveSpeechIdx(null);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Tarayıcınız ses tanıma teknolojisini desteklememektedir.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeaking();
      setInputValue('');
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setError('');
    
    // Add user message to log
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    if (isListening) {
      recognitionRef.current.stop();
    }

    try {
      const chatHistory = messages.slice(-10).map(m => ({
        sender: m.role,
        text: m.text
      }));

      const reply = await aiService.chatWithTutor(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        persona,
        userMsg,
        chatHistory
      );

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      
      // Auto-read response if preferred
      startSpeaking(reply, messages.length + 1);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Öğretmenden cevap alınamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    stopSpeaking();
    setMessages([
      { role: 'assistant', text: `${persona} olarak buradayım. Konu anlatımı yapabilir, çözemediğin soruları açıklayabilirim. Sorun nedir?` }
    ]);
  };

  const handlePersonaChange = (newPersona) => {
    stopSpeaking();
    setPersona(newPersona);
    setMessages([
      { role: 'assistant', text: `Yeni branşınız: ${newPersona}. Bu alanla ilgili sorularınızı yanıtlamaya hazırım.` }
    ]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      
      {/* View Header with Persona Selector */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800">AI Özel Ders Sohbet Odası</h2>
            <p className="text-[10px] text-slate-400">Yapay zeka öğretmeninizle birebir serbest ders çalışın.</p>
          </div>
        </div>

        {/* Persona selection buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {personas.map(p => (
            <button
              key={p.id}
              onClick={() => handlePersonaChange(p.id)}
              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition flex items-center gap-1.5 whitespace-nowrap outline-none ${
                persona === p.id 
                  ? 'border-indigo-600 bg-indigo-50/30 text-indigo-900'
                  : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-500'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] rounded-2xl flex items-start gap-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CHAT MESSAGES WINDOW */}
      <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-4 md:p-6 shadow-sm overflow-y-auto min-h-0 space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          const isSpeaking = activeSpeechIdx === idx && isPlaying;
          
          return (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar indicator */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUser ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {isUser ? <User className="w-4.5 h-4.5" /> : <Sparkles className="w-4.5 h-4.5" />}
              </div>

              {/* Message box */}
              <div className={`rounded-3xl p-4 text-xs font-semibold leading-relaxed relative group ${
                isUser 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {/* Speech read button for AI responses */}
                {!isUser && (
                  <button
                    onClick={() => isSpeaking ? stopSpeaking() : startSpeaking(m.text, idx)}
                    className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-150 rounded-lg shadow-sm"
                    title={isSpeaking ? 'Sesi Sustur' : 'Cevabı Seslendir'}
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}

                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-3xl rounded-tl-none p-4 text-xs font-bold text-slate-400 italic">
              Öğretmeniniz düşünüyor...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* INPUT FORM PANEL */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <button
            type="button"
            onClick={handleClearChat}
            className="p-3 border border-slate-200 hover:bg-slate-50 hover:text-rose-600 rounded-2xl text-slate-400 transition"
            title="Sohbeti Temizle"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={toggleListen}
            className={`p-3 rounded-2xl border transition-all ${
              isListening
                ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
            title={isListening ? 'Sesi Kapat' : 'Konuşarak Sor'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Sesiniz metne dönüştürülüyor...' : 'Öğretmeninize dersle ilgili bir şey sorun...'}
            disabled={isListening}
            className="flex-1 px-4 border border-slate-200 focus:border-indigo-500 rounded-2xl text-xs outline-none bg-white font-semibold text-slate-700"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-2xl transition shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

    </div>
  );
}

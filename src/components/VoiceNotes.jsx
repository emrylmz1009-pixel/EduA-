import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Loader2, Sparkles, Plus, Trash2, Calendar, BookOpen, Volume2, VolumeX, ClipboardList, Check, Eye } from 'lucide-react';
import { aiService } from '../services/ai';

export default function VoiceNotes({ apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Audio record states
  const [isListening, setIsListening] = useState(false);
  const [rawText, setRawText] = useState('');
  const recognitionRef = useRef(null);

  // Saved Notes state
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);

  // TTS state for playback
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    // Load saved notes
    const stored = localStorage.getItem('eduai_voice_notes');
    if (stored) {
      setNotes(JSON.parse(stored));
    }

    // Init Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'tr-TR';

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setRawText(currentText);
      };
      rec.onerror = (e) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Tarayıcınız ses tanıma teknolojisini desteklememektedir. Lütfen Google Chrome kullanın.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setRawText('');
      recognitionRef.current.start();
    }
  };

  const handleStructureNote = async () => {
    if (!rawText.trim()) {
      setError('Dikte edilmiş bir metin bulunamadı. Lütfen önce konuşarak not alın.');
      return;
    }
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await aiService.structureVoiceNote(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        rawText
      );

      const newNote = {
        id: Date.now(),
        title: result.title || 'Yeni Ders Notu',
        subject: result.subject || 'Genel',
        formattedNote: result.formattedNote || rawText,
        date: new Date().toLocaleDateString('tr-TR')
      };

      const updated = [newNote, ...notes];
      setNotes(updated);
      localStorage.setItem('eduai_voice_notes', JSON.stringify(updated));
      setRawText('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Ders notu yapılandırılırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = (id, e) => {
    e.stopPropagation();
    if (confirm('Bu ders notunu silmek istediğinize emin misiniz?')) {
      const updated = notes.filter(n => n.id !== id);
      setNotes(updated);
      localStorage.setItem('eduai_voice_notes', JSON.stringify(updated));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    }
  };

  const handlePlayNote = (text) => {
    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.cancel();
      setIsPlaying(false);
      return;
    }

    // Clean markdown before speaking
    const cleanText = text
      .replace(/[*#`_\-]/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    
    // Choose preferred voice if saved
    const savedVoice = localStorage.getItem('eduai_selected_voice');
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v => v.name === savedVoice) || voices.find(v => v.lang.startsWith('tr'));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    synthRef.current.speak(utterance);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            YAPAY ZEKA DİKTE DEFTERİ
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Sesli Ders Notları</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Ders çalışırken aklınıza gelenleri konuşarak kaydedin. Yapay zeka sesinizi algılasın, düzenlesin ve şık ders notlarına dönüştürsün.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Mic className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left column: Voice dictation input */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5 text-center">
            <h3 className="font-bold text-slate-800 text-sm">Sesinizi Kaydedin</h3>
            
            <button
              onClick={toggleListen}
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-500/20' 
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
            </button>

            <span className="text-[10px] font-bold text-slate-400 block">
              {isListening ? 'Mikrofonunuz açık, konuşun...' : 'Başlamak için mikrofona tıklayın.'}
            </span>

            {rawText && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-left max-h-[150px] overflow-y-auto leading-relaxed text-slate-600 font-medium">
                {rawText}
              </div>
            )}

            {rawText && !isListening && (
              <button
                onClick={handleStructureNote}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ders Notu Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Yapay Zeka ile Düzenle & Kaydet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right column: Saved notes list & details */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Notes Grid */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-50 pb-2.5 flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Ders Notlarım ({notes.length})</h4>
            </div>

            {notes.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-1.5">
                <span className="text-xl">✍️</span>
                <h4 className="font-bold text-slate-700 text-xs">Henüz Kayıtlı Not Yok</h4>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Ders esnasında ses kaydı alıp yapay zekayla notlaştırarak buraya kaydedebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className="p-3.5 border border-slate-150 hover:border-indigo-200 bg-slate-50/10 rounded-2xl cursor-pointer hover:bg-slate-50/30 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 flex-shrink-0">
                          {note.subject}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">{note.date}</span>
                      </div>
                      <h5 className="font-bold text-slate-800 text-xs mt-1.5 line-clamp-1">{note.title}</h5>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        Görüntüle
                      </span>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="text-slate-400 hover:text-rose-600 transition p-1 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Note Details Display */}
          {selectedNote && (
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4 animate-scaleIn">
              <div className="flex items-start justify-between border-b border-slate-50 pb-3">
                <div>
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">
                    {selectedNote.subject}
                  </span>
                  <h4 className="font-black text-slate-800 text-sm mt-1">{selectedNote.title}</h4>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Oluşturma Tarihi: {selectedNote.date}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePlayNote(selectedNote.formattedNote)}
                    className={`p-2 rounded-xl border transition ${
                      isPlaying 
                        ? 'bg-rose-50 border-rose-100 text-rose-600' 
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'
                    }`}
                    title={isPlaying ? 'Sesi Duraklat' : 'Sesli Oku'}
                  >
                    {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition"
                  >
                    Kapat
                  </button>
                </div>
              </div>

              {/* Note Content */}
              <div className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-700 font-medium bg-slate-50/50 rounded-2xl p-4 max-h-[250px] overflow-y-auto whitespace-pre-line">
                {selectedNote.formattedNote}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

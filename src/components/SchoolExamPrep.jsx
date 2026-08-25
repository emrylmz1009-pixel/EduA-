import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, AlertCircle, Loader2, Award, ClipboardList, Mic, MicOff, CheckCircle2, RefreshCw, HelpCircle, ArrowRight, BookOpen } from 'lucide-react';
import { aiService } from '../services/ai';

export default function SchoolExamPrep({ apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Setup states
  const [examStarted, setExamStarted] = useState(false);
  const [grade, setGrade] = useState('10. Sınıf');
  const [subject, setSubject] = useState('Matematik');
  const [term, setTerm] = useState('1. Dönem 1. Yazılı');
  
  // Exam data states
  const [examTitle, setExamTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState(['', '', '', '', '']);
  const [results, setResults] = useState(null);

  // Speech Recognition state
  const [activeVoiceIdx, setActiveVoiceIdx] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

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
        if (activeVoiceIdx !== null) {
          const updated = [...studentAnswers];
          updated[activeVoiceIdx] = text;
          setStudentAnswers(updated);
        }
      };
      rec.onerror = (e) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
        setActiveVoiceIdx(null);
      };

      recognitionRef.current = rec;
    }
  }, [activeVoiceIdx, studentAnswers]);

  const toggleListen = (idx) => {
    if (!recognitionRef.current) {
      alert('Tarayıcınız ses tanıma teknolojisini desteklememektedir.');
      return;
    }

    if (isListening && activeVoiceIdx === idx) {
      recognitionRef.current.stop();
    } else {
      if (isListening) {
        recognitionRef.current.stop();
      }
      setActiveVoiceIdx(idx);
      const updated = [...studentAnswers];
      updated[idx] = ''; // Reset target text field
      setStudentAnswers(updated);
      recognitionRef.current.start();
    }
  };

  const handleCreateExam = async () => {
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    setExamTitle('');
    setQuestions([]);
    setStudentAnswers(['', '', '', '', '']);
    setResults(null);

    try {
      const result = await aiService.generateSchoolExam(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        grade,
        subject,
        term
      );

      setExamTitle(result.examTitle);
      setQuestions(result.questions || []);
      setExamStarted(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Sınav kağıdı hazırlanırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (idx, val) => {
    const updated = [...studentAnswers];
    updated[idx] = val;
    setStudentAnswers(updated);
  };

  const handleSubmitExam = async () => {
    // Check if any answers typed
    const filledCount = studentAnswers.filter(a => a.trim().length > 0).length;
    if (filledCount === 0) {
      setError('Lütfen sınavı tamamlamadan önce en az bir soruyu cevaplayın.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    }

    setLoading(true);
    setError('');

    try {
      const report = await aiService.gradeSchoolExamAnswers(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        questions,
        studentAnswers
      );

      setResults(report);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Sınav kağıdı okunurken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetExam = () => {
    setExamStarted(false);
    setExamTitle('');
    setQuestions([]);
    setStudentAnswers(['', '', '', '', '']);
    setResults(null);
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            MEB YAZILIYA HAZIRLIK REHBERİ
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Okul Yazılı Sınav Hazırlığı</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Sınıf seviyenizi ve sınav dönemini seçerek MEB kazanımlarına uygun klasik açık uçlu yazılı sınavı olun. Hoca gibi puanlansın ve karne alın.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <ClipboardList className="w-6 h-6" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Yazılı Kağıdınız Hazırlanıyor</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Yapay zeka MEB kazanım tablolarını ve ders müfredatını inceleyerek klasik açık uçlu yazılı soruları hazırlıyor veya cevaplarınızı puanlıyor...
          </p>
        </div>
      )}

      {/* SETUP EXAM */}
      {!examStarted && !loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm">Sınav Parametreleri</h3>
            <p className="text-xs text-slate-400 mt-1">Hangi sınıf, ders ve dönem yazılısına hazırlanmak istiyorsunuz?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sınıf Seviyesi</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white text-slate-700 font-bold"
              >
                {['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf', '9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'].map(gr => (
                  <option key={gr} value={gr}>{gr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ders Branşı</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white text-slate-700 font-bold"
              >
                {['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Din Kültürü'].map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Yazılı Dönemi</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white text-slate-700 font-bold"
              >
                {['1. Dönem 1. Yazılı', '1. Dönem 2. Yazılı', '2. Dönem 1. Yazılı', '2. Dönem 2. Yazılı'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateExam}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Yazılı Sınav Kağıdını Hazırla</span>
          </button>
        </div>
      )}

      {/* EXAM PAPER SHEET */}
      {examStarted && !results && !loading && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-wide">
              📝 {examTitle}
            </h3>
            <button
              onClick={handleResetExam}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
            >
              Sınavdan Çık
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const isListeningActive = isListening && activeVoiceIdx === idx;
              return (
                <div key={idx} className="space-y-2 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <h4 className="font-bold text-slate-800 text-xs">
                    {idx + 1}. Soru: <span className="font-medium text-slate-600">{q}</span>
                  </h4>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleListen(idx)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all ${
                        isListeningActive
                          ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'
                      }`}
                      title="Sesli Cevap Ver (Konuş)"
                    >
                      {isListeningActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <textarea
                      value={studentAnswers[idx]}
                      onChange={(e) => handleTextChange(idx, e.target.value)}
                      placeholder={isListeningActive ? 'Sesiniz dinleniyor...' : 'Cevabınızı buraya yazın veya mikrofonla dikte edin...'}
                      disabled={isListeningActive}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none bg-white font-medium resize-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubmitExam}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sınavı Tamamla ve Öğretmene Gönder</span>
          </button>
        </div>
      )}

      {/* GRADED SCORECARD CARD */}
      {results && !loading && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6 animate-scaleIn">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 text-base">{examTitle} Karnesi</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sınav kağıdınız öğretmeniniz tarafından puanlandı.</p>
            </div>
            
            <button
              onClick={handleResetExam}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yeni Sınav Kağıdı</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left score panel */}
            <div className="md:col-span-4 space-y-4">
              <div className={`border p-6 rounded-3xl text-center space-y-2 flex flex-col items-center justify-center ${getScoreColor(results.totalGrade)}`}>
                <span className="text-[10px] font-black uppercase tracking-wider block">YAZILI NOTU</span>
                <span className="text-4xl font-black">{results.totalGrade}</span>
                <span className="text-[9px] font-bold block">100 Üzerinden</span>
              </div>

              {/* Study advice card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-[10px] font-black text-slate-700 uppercase">Öğretmen Tavsiyesi</h4>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  {results.teacherAdvice}
                </p>
              </div>
            </div>

            {/* Right scorecard breakdown list */}
            <div className="md:col-span-8 space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Soru ve Cevap Detayları</h4>
              
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const gr = results.grades?.[idx] || { score: 0, comment: 'Cevap yok.' };
                  return (
                    <div key={idx} className="p-3 border border-slate-100 rounded-2xl bg-slate-50/20 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-slate-700 text-xs">Soru {idx + 1}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          gr.score >= 17 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {gr.score} / 20 Puan
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 leading-snug">{q}</p>
                      
                      <div className="border-t border-slate-100 pt-2 space-y-1 bg-white/50 p-2 rounded-xl border">
                        <p className="text-[10px] text-slate-500 leading-snug">
                          <span className="font-bold text-slate-400">Cevabınız:</span> "{studentAnswers[idx] || 'Cevap verilmedi.'}"
                        </p>
                        <p className="text-[10px] text-indigo-600 leading-snug font-semibold mt-1 bg-indigo-50/20 p-1.5 rounded-lg border border-indigo-50/30">
                          💡 <span className="font-bold text-indigo-500">Öğretmen Notu:</span> {gr.comment}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Loader2, Sparkles, Volume2, VolumeX, Award, CheckCircle, ChevronRight, HelpCircle, RefreshCw, Star } from 'lucide-react';
import { aiService } from '../services/ai';

export default function OralExam({ activeDoc, apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Setup states
  const [examStarted, setExamStarted] = useState(false);
  const [source, setSource] = useState('pdf'); // 'pdf' or 'matematik', 'fizik', etc.
  const [totalQuestions, setTotalQuestions] = useState(3);
  
  // Session states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showEvaluation, setShowEvaluation] = useState(false);

  // Voice Speech states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  
  // TTS voice state
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  const subjects = [
    { id: 'pdf', name: 'Aktif PDF Ders Notu' },
    { id: 'Matematik', name: 'Matematik' },
    { id: 'Fizik', name: 'Fizik' },
    { id: 'Kimya', name: 'Kimya' },
    { id: 'Biyoloji', name: 'Biyoloji' },
    { id: 'Türkçe', name: 'Türkçe & Edebiyat' },
    { id: 'Tarih', name: 'Tarih' },
    { id: 'Coğrafya', name: 'Coğrafya' }
  ];

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
        setCurrentAnswer(text);
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

  const startSpeaking = (text) => {
    if (!synthRef.current) return;
    stopSpeaking();

    const cleanText = text
      .replace(/[*#`_\-]/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';

    const savedVoice = localStorage.getItem('eduai_selected_voice');
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v => v.name === savedVoice) || voices.find(v => v.lang.startsWith('tr'));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Tarayıcınız ses tanıma teknolojisini desteklememektedir. Lütfen Google Chrome kullanın.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeaking();
      setCurrentAnswer('');
      recognitionRef.current.start();
    }
  };

  const handleStartExam = async () => {
    if (source === 'pdf' && (!activeDoc || !activeDoc.text)) {
      setError('Sözlü sınava başlamak için öncelikle geçerli bir PDF dökümanı seçmelisiniz.');
      return;
    }
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentIdx(0);
    setQuestions([]);
    setStudentAnswers([]);
    setEvaluations([]);
    setShowEvaluation(false);
    setCurrentAnswer('');
    stopSpeaking();

    const selectedSubject = subjects.find(s => s.id === source)?.name || 'Genel';
    const pdfText = source === 'pdf' ? activeDoc.text : '';

    try {
      // Generate the first question
      const result = await aiService.generateOralQuestion(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        selectedSubject,
        pdfText,
        1,
        []
      );

      setQuestions([result.questionText]);
      setExamStarted(true);
      startSpeaking(result.questionText);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Sözlü sınav sorusu oluşturulurken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || loading) return;
    if (isListening) {
      recognitionRef.current.stop();
    }

    setLoading(true);
    setError('');
    stopSpeaking();

    const activeQuestion = questions[currentIdx];
    const pdfText = source === 'pdf' ? activeDoc.text : '';

    try {
      const evaluation = await aiService.evaluateOralAnswer(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeQuestion,
        currentAnswer,
        pdfText
      );

      setStudentAnswers(prev => [...prev, currentAnswer]);
      setEvaluations(prev => [...prev, evaluation]);
      setShowEvaluation(true);
      
      const audioFeedback = `Değerlendirme Puanınız: ${evaluation.score}. ${evaluation.feedbackText}`;
      startSpeaking(audioFeedback);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Cevap değerlendirilirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentIdx + 1 >= totalQuestions) {
      // Sınav bitti
      stopSpeaking();
      setCurrentIdx(totalQuestions); // Shows final score screen
      return;
    }

    setLoading(true);
    setError('');
    setShowEvaluation(false);
    setCurrentAnswer('');
    stopSpeaking();

    const nextIdx = currentIdx + 1;
    const selectedSubject = subjects.find(s => s.id === source)?.name || 'Genel';
    const pdfText = source === 'pdf' ? activeDoc.text : '';
    
    // Prepare history logs
    const history = questions.map((q, idx) => ({
      question: q,
      answer: studentAnswers[idx] || '',
      score: evaluations[idx]?.score || 0
    }));

    try {
      const result = await aiService.generateOralQuestion(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        selectedSubject,
        pdfText,
        nextIdx + 1,
        history
      );

      setQuestions(prev => [...prev, result.questionText]);
      setCurrentIdx(nextIdx);
      startSpeaking(result.questionText);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Sonraki sözlü sınav sorusu oluşturulurken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetExam = () => {
    setExamStarted(false);
    setCurrentIdx(0);
    setQuestions([]);
    setStudentAnswers([]);
    setEvaluations([]);
    setShowEvaluation(false);
    setCurrentAnswer('');
    stopSpeaking();
  };

  // Final scorecard metrics
  const getAverageScore = () => {
    if (evaluations.length === 0) return 0;
    const total = evaluations.reduce((sum, curr) => sum + (curr.score || 0), 0);
    return Math.round(total / evaluations.length);
  };

  const getPerformanceBadge = (score) => {
    if (score >= 85) return { name: 'Üstün Başarı Yıldızı', color: 'bg-emerald-500 text-white border-emerald-300' };
    if (score >= 70) return { name: 'Başarılı Öğrenci', color: 'bg-indigo-500 text-white border-indigo-300' };
    return { name: 'Geliştirilebilir Seviye', color: 'bg-amber-500 text-white border-amber-300' };
  };

  const avgScore = getAverageScore();
  const badge = getPerformanceBadge(avgScore);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            SESLİ DEĞERLENDİRME KOÇU
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Yapay Zeka Sözlü Sınavı</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Yazılı ders çalışmaktan sıkıldınız mı? Yapay zeka ile sesli sözlü sınava girin. Soruları dinleyin, konuşarak cevaplayın, puanınızı ve eksiklerinizi öğrenin.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Award className="w-6 h-6 animate-bounce" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SETUP SCREEN */}
      {!examStarted && !loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm">Sözlü Sınav Ayarları</h3>
            <p className="text-xs text-slate-400 mt-1">Sözlü sınavın konusunu ve soru miktarını belirleyin.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sınav Konusu / Kaynak</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-semibold text-slate-700"
                >
                  {subjects.map(s => {
                    const isDisabled = s.id === 'pdf' && (!activeDoc || !activeDoc.text);
                    return (
                      <option key={s.id} value={s.id} disabled={isDisabled}>
                        {s.name} {isDisabled ? '(Döküman Yüklenmedi)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soru Sayısı</label>
                <select
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-semibold text-slate-700"
                >
                  <option value={3}>3 Soru (Hızlı Test)</option>
                  <option value={5}>5 Soru (Normal Değerlendirme)</option>
                  <option value={10}>10 Soru (Kapsamlı Sözlü Sınav)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartExam}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sözlü Sınavı Başlat (Sesli)</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Sözlü Sınav Koçu Hazırlanıyor</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Yapay zeka konusuyla ilgili açık uçlu sorunuzu planlıyor veya verdiğiniz cevabı analiz ederek puanınızı hesaplıyor...
          </p>
        </div>
      )}

      {/* EXAM IN PROGRESS LOOP */}
      {examStarted && currentIdx < totalQuestions && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Active Question Display */}
          <div className="md:col-span-6 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                SORU {currentIdx + 1} / {totalQuestions}
              </span>
              <button
                onClick={() => startSpeaking(questions[currentIdx])}
                className={`p-1.5 rounded-xl border transition ${
                  isPlaying ? 'bg-indigo-50 border-indigo-150 text-indigo-600' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'
                }`}
                title="Soruyu Tekrar Oku"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 text-center min-h-[120px] flex items-center justify-center">
              <p className="text-sm font-bold text-slate-800 leading-relaxed">
                {questions[currentIdx]}
              </p>
            </div>

            {/* Answer Input Area */}
            {!showEvaluation ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={toggleListen}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse ring-6 ring-rose-500/20'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                    title={isListening ? 'Mikrofonu Kapat' : 'Cevabınızı Sesli Söyleyin'}
                  >
                    {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                  </button>
                </div>
                
                <span className="text-[10px] text-slate-400 font-bold text-center block">
                  {isListening ? 'Cevabınız dinleniyor, konuşun...' : 'Mikrofonu açarak cevap vermeye başlayın.'}
                </span>

                {currentAnswer && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-left text-slate-600 max-h-[100px] overflow-y-auto leading-relaxed">
                    {currentAnswer}
                  </div>
                )}

                {currentAnswer && !isListening && (
                  <button
                    onClick={handleSubmitAnswer}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Cevabı Gönder & Puanla</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="pt-2 text-center">
                <button
                  onClick={handleNextQuestion}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Sonraki Soruya Geç</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right panel: Active evaluation display */}
          <div className="md:col-span-6">
            {showEvaluation && evaluations[currentIdx] ? (
              <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Öğretmen Geri Bildirimi</h4>
                  </div>
                  <button
                    onClick={() => startSpeaking(evaluations[currentIdx].feedbackText)}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition"
                    title="Geri Bildirimi Seslendir"
                  >
                    <Volume2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex-shrink-0 flex flex-col justify-center items-center">
                    <span className="text-[9px] font-extrabold text-indigo-400 uppercase">Sözlü Puanı</span>
                    <span className="text-2xl font-black text-indigo-900">{evaluations[currentIdx].score}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {evaluations[currentIdx].feedbackText}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-xs">Değerlendirme Hazır Değil</h4>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Sol taraftaki soruyu dinleyip sesli cevabınızı gönderdikten sonra öğretmeninizin notu ve değerlendirmesi burada belirecektir.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* FINAL REPORT / SCORECARD SCREEN */}
      {examStarted && currentIdx === totalQuestions && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-scaleIn">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 text-base">Sözlü Sınav Sonuç Raporu</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sözlü sınavınızı başarıyla tamamladınız. Detaylar aşağıdadır.</p>
            </div>
            <button
              onClick={handleResetExam}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yeni Sınav</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Score circle */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-center space-y-3 flex flex-col justify-center items-center">
              <div className="w-24 h-24 rounded-full border-4 border-indigo-600 flex flex-col justify-center items-center bg-white shadow-sm shadow-indigo-50">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Ortalama Puan</span>
                <span className="text-3xl font-black text-indigo-900 leading-none mt-1">{avgScore}</span>
              </div>

              <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${badge.color}`}>
                {badge.name}
              </div>
            </div>

            {/* Questions breakdown */}
            <div className="sm:col-span-2 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Soru Dökümleri</h4>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const score = evaluations[idx]?.score || 0;
                  return (
                    <div key={idx} className="p-3 border border-slate-150 rounded-2xl bg-slate-50/20 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 block">Soru {idx + 1}</span>
                        <p className="text-xs font-bold text-slate-700 leading-snug">{q}</p>
                        <p className="text-[10px] text-slate-500 italic mt-1 leading-snug">Cevabınız: "{studentAnswers[idx]}"</p>
                      </div>

                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                        score >= 85 ? 'bg-emerald-50 text-emerald-700' : score >= 70 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {score} Puan
                      </span>
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

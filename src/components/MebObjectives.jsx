import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, AlertCircle, Loader2, Award, BookOpen, CheckCircle, HelpCircle, Star, Mic, MicOff, Search, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { aiService } from '../services/ai';

export default function MebObjectives({ apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selection states
  const [grade, setGrade] = useState('10. Sınıf');
  const [subject, setSubject] = useState('Fizik');

  // Mastered objectives database (saved in localStorage)
  const [masteredList, setMasteredList] = useState([]);

  // Active testing states
  const [activeObjective, setActiveObjective] = useState(null); // the objective currently selected for test or lecture
  const [actionType, setActionType] = useState(null); // 'test' or 'lecture'
  
  // AI output states
  const [questionText, setQuestionText] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [lectureNote, setLectureNote] = useState('');

  // Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);  const database = {
    '5. Sınıf': {
      'Matematik': [
        { code: 'M.5.1.1.1', text: 'En çok dokuz basamaklı doğal sayıları okur ve yazar.' },
        { code: 'M.5.1.2.1', text: 'En çok beş basamaklı doğal sayılarla toplama ve çıkarma işlemlerini yapar.' },
        { code: 'M.5.2.1.1', text: 'Paydaları eşit veya birinin paydası diğerinin paydasının katı olan kesirlerle toplama ve çıkarma işlemlerini yapar.' }
      ],
      'Fen Bilimleri': [
        { code: 'F.5.1.1.1', text: 'Güneş’in yapısı ve özelliklerini açıklar.' },
        { code: 'F.5.2.1.1', text: 'Canlıları benzerlik ve farklılıklarına göre sınıflandırır.' },
        { code: 'F.5.3.1.1', text: 'Kuvvetin büyüklüğünü dinamometre ile ölçer ve birimini belirtir.' }
      ]
    },
    '6. Sınıf': {
      'Matematik': [
        { code: 'M.6.1.1.1', text: 'Doğal sayıların kendisiyle tekrarlı çarpımını üslü nicelik olarak ifade eder.' },
        { code: 'M.6.1.2.1', text: 'Doğal sayıların çarpanlarını ve katlarını belirler.' },
        { code: 'M.6.2.1.1', text: 'Tam sayıları tanımlar ve sayı doğrusunda gösterir.' }
      ],
      'Fen Bilimleri': [
        { code: 'F.6.1.1.1', text: 'Güneş sistemindeki gezegenleri birbirleriyle karşılaştırır.' },
        { code: 'F.6.2.1.1', text: 'Destek ve hareket sistemine ait yapıları açıklar.' },
        { code: 'F.6.3.1.1', text: 'Bileşke kuvveti tanımlar ve kuvvetlerin doğrultularını gösterir.' }
      ]
    },
    '7. Sınıf': {
      'Matematik': [
        { code: 'M.7.1.1.1', text: 'Tam sayılarla çarpma ve bölme işlemlerini yapar.' },
        { code: 'M.7.2.1.1', text: 'Rasyonel sayıları tanımlar, sayı doğrusunda gösterir ve ondalık gösterimle ilişkilendirir.' },
        { code: 'M.7.3.1.1', text: 'Birinci dereceden bir bilinmeyenli denklemleri çözer.' }
      ],
      'Fen Bilimleri': [
        { code: 'F.7.1.1.1', text: 'Uzay araştırmalarındaki teknolojik gelişmeleri ve uzay kirliliğini tartışır.' },
        { code: 'F.7.2.1.1', text: 'Hücre, doku, organ, sistem ve organizma ilişkisini açıklar.' },
        { code: 'F.7.3.1.1', text: 'Kütle ve ağırlık kavramlarını karşılaştırarak ilişkilerini yorumlar.' }
      ]
    },
    '8. Sınıf': {
      'Matematik': [
        { code: 'M.8.1.1.1', text: 'İki doğal sayının en büyük ortak bölenini (EBOB) ve en küçük ortak katını (EKOK) hesaplar.' },
        { code: 'M.8.1.2.1', text: 'Tam sayıların tam sayı kuvvetlerini hesaplar ve üslü ifadelerle işlem yapar.' },
        { code: 'M.8.3.1.1', text: 'Basit olayların olma olasılığını hesaplar.' }
      ],
      'Fen Bilimleri': [
        { code: 'F.8.1.1.1', text: 'Mevsimlerin oluşumuna yönelik tahminlerde bulunur.' },
        { code: 'F.8.2.1.1', text: 'Nükleotid, gen, DNA ve kromozom kavramlarını açıklayarak ilişkilerini kurar.' },
        { code: 'F.8.3.1.1', text: 'Katı, sıvı ve gaz basıncını etkileyen değişkenleri analiz eder.' }
      ]
    },
    '9. Sınıf': {
      'Fizik': [
        { code: 'F.9.1.1.1', text: 'Fizik biliminin önemini, alt dallarını ve diğer disiplinlerle ilişkisini açıklar.' },
        { code: 'F.9.2.1.1', text: 'Kütle, hacim ve özkütle kavramlarını ilişkilendirerek madde özelliklerini yorumlar.' },
        { code: 'F.9.3.1.1', text: 'Bir boyutta sabit ivmeli hareketin konum, hız ve zaman grafiklerini analiz eder.' }
      ],
      'Matematik': [
        { code: 'M.9.1.1.1', text: 'Önermeyi, önermenin doğruluk değerini, iki önermenin denkliğini tanımlar.' },
        { code: 'M.9.2.1.1', text: 'Kümeler ile ilgili temel kavramları tanımlar ve küme işlemlerini yapar.' },
        { code: 'M.9.3.1.1', text: 'Gerçek sayılar kümesinde aralık kavramını açıklar ve eşitsizlikleri çözer.' }
      ]
    },
    '10. Sınıf': {
      'Fizik': [
        { code: 'F.10.1.1.1', text: 'Elektrik akımı, direnç ve potansiyel farkı kavramlarını ilişkilendirir.' },
        { code: 'F.10.1.2.1', text: 'Katı, sıvı ve gazlarda basınç ve kaldırma kuvveti kavramlarını açıklar.' },
        { code: 'F.10.2.1.1', text: 'Dalgaların temel değişkenleri olan genlik, frekans, dalga boyu kavramlarını tanımlar.' },
        { code: 'F.10.4.1.1', text: 'Işığın yansıması, düzlem ve küresel aynalarda görüntü oluşumunu açıklar.' }
      ],
      'Matematik': [
        { code: 'M.10.1.1.1', text: 'Permütasyon, kombinasyon ve binom açılımını kullanarak sayma hesapları yapar.' },
        { code: 'M.10.2.1.1', text: 'Fonksiyon kavramını açıklar, fonksiyonların grafiklerini ve gösterimlerini yorumlar.' },
        { code: 'M.10.3.1.1', text: 'Polinom kavramını açıklar, polinomlarda derece ve bölme işlemlerini yapar.' },
        { code: 'M.10.4.1.1', text: 'İkinci dereceden bir bilinmeyenli denklemleri çözer ve kökleri analiz eder.' }
      ],
      'Kimya': [
        { code: 'K.10.1.1.1', text: 'Kimyanın temel kanunlarını (kütlenin korunumu, sabit oranlar) açıklar.' },
        { code: 'K.10.2.1.1', text: 'Mol kavramını tanımlar ve mol hesaplamalarını yapar.' }
      ],
      'Biyoloji': [
        { code: 'B.10.1.1.1', text: 'Hücre bölünmesinin gerekliliğini açıklar, mitoz ve mayoz bölünme evrelerini karşılaştırır.' },
        { code: 'B.10.2.1.1', text: 'Kalıtımın genel ilkelerini, Mendel genetiğini ve çaprazlamaları açıklar.' }
      ]
    },
    '11. Sınıf': {
      'Fizik': [
        { code: 'F.11.1.1.1', text: 'İki boyutta vektörlerin özelliklerini açıklar ve vektör toplama işlemlerini yapar.' },
        { code: 'F.11.1.2.1', text: 'Bağıl hareketi açıklar ve nehir problemleri dahil bağıl hız hesapları yapar.' },
        { code: 'F.11.2.1.1', text: 'Newton’ın hareket yasalarını sürtünmeli ve eğik düzlem sistemlerinde uygular.' }
      ],
      'Matematik': [
        { code: 'M.11.1.1.1', text: 'Trigonometrik fonksiyonların grafiklerini ve birim çember özelliklerini analiz eder.' },
        { code: 'M.11.2.1.1', text: 'Analitik düzlemde koordinatlar, doğrunun eğimi ve paralel/dik doğruları yorumlar.' },
        { code: 'M.11.3.1.1', text: 'İkinci dereceden fonksiyonların (parabol) grafiklerini çizer ve tepe noktasını bulur.' }
      ]
    },
    '12. Sınıf': {
      'Fizik': [
        { code: 'F.12.1.1.1', text: 'Düzgün çembersel hareketi açıklar, merkezcil ivme ve kuvveti ilişkilendirir.' },
        { code: 'F.12.1.2.1', text: 'Açısal momentum kavramını açıklar ve açısal momentumun korunumunu yorumlar.' }
      ],
      'Matematik': [
        { code: 'M.12.1.1.1', text: 'Üstel ve logaritmik fonksiyonların özelliklerini ve grafiklerini analiz eder.' },
        { code: 'M.12.2.1.1', text: 'Diziler kavramını açıklar, aritmetik ve geometrik dizilerin toplamlarını hesaplar.' }
      ]
    }
  };

  useEffect(() => {
    // Load mastered objectives from localStorage
    const saved = localStorage.getItem('eduai_mastered_objectives');
    if (saved) {
      setMasteredList(JSON.parse(saved));
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
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' ';
        }
        setStudentAnswer(text);
      };
      rec.onerror = (e) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const getActiveObjectives = () => {
    return database[grade]?.[subject] || [];
  };

  const getProgressPercentage = () => {
    const list = getActiveObjectives();
    if (list.length === 0) return 0;
    const mastered = list.filter(obj => masteredList.includes(obj.code)).length;
    return Math.round((mastered / list.length) * 100);
  };

  const handleStartTest = async (obj) => {
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    setActiveObjective(obj);
    setActionType('test');
    setQuestionText('');
    setStudentAnswer('');
    setTestResult(null);

    try {
      const result = await aiService.generateObjectiveQuestion(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        grade,
        subject,
        obj.code,
        obj.text
      );

      setQuestionText(result.questionText);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Kazanım sorusu oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainObjective = async (obj) => {
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    setActiveObjective(obj);
    setActionType('lecture');
    setLectureNote('');

    try {
      const result = await aiService.explainObjectiveLectures(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        grade,
        subject,
        obj.code,
        obj.text
      );

      setLectureNote(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Konu anlatım notu alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim() || loading) return;
    if (isListening) {
      recognitionRef.current.stop();
    }

    setLoading(true);
    setError('');

    try {
      const result = await aiService.evaluateObjectiveAnswer(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        questionText,
        studentAnswer,
        activeObjective.code
      );

      setTestResult(result);

      if (result.mastered || result.score >= 70) {
        // Mark objective as mastered
        const updated = [...masteredList, activeObjective.code];
        setMasteredList(updated);
        localStorage.setItem('eduai_mastered_objectives', JSON.stringify(updated));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Cevabınız değerlendirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Ses tanıma desteklenmiyor.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setStudentAnswer('');
      recognitionRef.current.start();
    }
  };

  const handleResetAction = () => {
    setActiveObjective(null);
    setActionType(null);
    setQuestionText('');
    setStudentAnswer('');
    setTestResult(null);
    setLectureNote('');
  };

  const activeObjectives = getActiveObjectives();
  const progress = getProgressPercentage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            EBA & MEB KAZANIM YOL HARİTASI
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">MEB Müfredat Kazanım Kütüphanesi</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Resmi MEB müfredat kazanımlarını listeleyin. İstediğiniz kazanıma ait **sınav odaklı notu** okuyun veya yapay zeka ile kendinizi test ederek **kazanım yıldızlarını** toplayın!
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Trophy className="w-6 h-6 text-amber-500 animate-bounce" />
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
          <h3 className="font-bold text-slate-800 text-base">Yapay Zeka Hazırlanıyor</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            MEB müfredatı doğrultusunda sınav ipuçlarını çıkartıyor veya verdiğiniz cevabı resmi kazanım ölçütlerine göre değerlendiriyor...
          </p>
        </div>
      )}

      {/* OBJECTIVES DIRECTORY GRID */}
      {!activeObjective && !loading && (
        <div className="space-y-6">
          {/* Setup controls */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-3 w-full sm:w-auto">
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-bold text-slate-700"
              >
                {['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf', '9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'].map(gr => (
                  <option key={gr} value={gr}>{gr}</option>
                ))}
              </select>

              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white font-bold text-slate-700"
              >
                {['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Fen Bilimleri'].map(sub => {
                  const hasData = database[grade]?.[sub];
                  return (
                    <option key={sub} value={sub} disabled={!hasData}>
                      {sub} {!hasData ? '(Müfredat Yok)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Course Progress status */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">MÜFREDAT TAMAMLAMA</span>
                <span className="text-xs font-black text-indigo-900 block">% {progress}</span>
              </div>
              <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Directory Objectives List */}
          <div className="grid grid-cols-1 gap-4">
            {activeObjectives.map((obj) => {
              const isMastered = masteredList.includes(obj.code);
              return (
                <div 
                  key={obj.code} 
                  className={`bg-white border rounded-3xl p-5 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isMastered ? 'border-emerald-150 bg-emerald-50/5' : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {obj.code}
                      </span>
                      {isMastered && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          <span>KAZANILDI</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">
                      {obj.text}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleExplainObjective(obj)}
                      className="px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Sınav Notu</span>
                    </button>
                    <button
                      onClick={() => handleStartTest(obj)}
                      className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Test Et</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LECTURE EXPLANATION VIEW */}
      {activeObjective && actionType === 'lecture' && !loading && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-scaleIn">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
              📚 SINAV ODAKLI KONU ANLATIMI ({activeObjective.code})
            </span>
            <button
              onClick={handleResetAction}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
            >
              Geri Dön
            </button>
          </div>

          <div className="space-y-4">
            <h1 className="text-sm font-black text-slate-800 leading-snug">
              Kazanım: <span className="font-bold text-slate-600">{activeObjective.text}</span>
            </h1>

            <div className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-700 whitespace-pre-line bg-slate-50/50 rounded-2xl p-5 border border-slate-100 font-medium">
              {lectureNote}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE TEST ENGINE LOOP */}
      {activeObjective && actionType === 'test' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Question / Input Panel */}
          <div className="md:col-span-7 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
                🎯 KAZANIM TESTİ ({activeObjective.code})
              </span>
              <button
                onClick={handleResetAction}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
              >
                Vazgeç
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[9px] font-extrabold text-slate-400 block mb-1">KAZANIM SORUSU</span>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">
                  {questionText}
                </p>
              </div>

              {/* Answer Box */}
              {!testResult ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={toggleListen}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all ${
                        isListening
                          ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'
                      }`}
                      title="Sesli Cevap Ver"
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <textarea
                      value={studentAnswer}
                      onChange={(e) => setStudentAnswer(e.target.value)}
                      placeholder={isListening ? 'Konuşmanız algılanıyor...' : 'Kazanımı açıklayan cevabınızı yazın veya mikrofonla söyleyin...'}
                      disabled={isListening}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none bg-white font-semibold resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!studentAnswer.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Cevabı Gönder & Kazanımı Puanla</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleResetAction}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Kazanım Listesine Geri Dön</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Grading Scorecard */}
          <div className="md:col-span-5">
            {testResult ? (
              <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4 animate-scaleIn">
                <div className="border-b border-slate-50 pb-2">
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wide">ÖĞRETMEN DEĞERLENDİRMESİ</h4>
                </div>

                <div className="flex gap-4 items-center">
                  <div className={`w-16 h-16 rounded-2xl flex-shrink-0 border flex flex-col justify-center items-center ${
                    testResult.score >= 70
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <span className="text-[8px] font-black uppercase">Puan</span>
                    <span className="text-xl font-black">{testResult.score}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                    {testResult.feedbackText}
                  </p>
                </div>

                {testResult.score >= 70 ? (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 text-center space-y-1">
                    <Trophy className="w-6 h-6 text-emerald-600 mx-auto animate-bounce" />
                    <h5 className="text-[10px] font-black text-emerald-800 uppercase">TEBRİKLER! KAZANIM BAŞARIYLA ALINDI</h5>
                    <p className="text-[9px] text-emerald-600 font-medium">Bu dersin ilerleme yüzdesi yükseldi.</p>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 text-center">
                    <h5 className="text-[10px] font-black text-amber-800 uppercase">TEKRAR DENEYİN</h5>
                    <p className="text-[9px] text-amber-600 font-medium">Kazanımı elde etmek için en az 70 puan almanız gerekmektedir.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-xs">Cevap Bekleniyor</h4>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal">
                  Sol taraftaki kazanım sorusunu çözüp yanıtınızı gönderdikten sonra öğretmeninizin değerlendirme puanı burada belirecektir.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

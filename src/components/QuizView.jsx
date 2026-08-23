import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  Award, 
  Clock, 
  Printer, 
  Share2, 
  Send,
  Sparkles
} from 'lucide-react';
import { aiService } from '../services/ai';

export default function QuizView({ 
  activeDoc, 
  apiKeyConfig, 
  onQuizGenerated,
  onQuizCompleted 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Format / Difficulty settings prior to start
  const [examFormat, setExamFormat] = useState('multiple-choice'); // multiple-choice, true-false, blanks, matching, classical
  const [difficulty, setDifficulty] = useState('Orta');
  const [isExamConfigured, setIsExamConfigured] = useState(false);

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [timerActive, setTimerActive] = useState(false);

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // for MCQ / True-False
  const [textAnswer, setTextAnswer] = useState(''); // for blanks / classical
  const [isAnswered, setIsAnswered] = useState(false);
  const [answersLog, setAnswersLog] = useState([]);
  const [quizFinished, setQuizFinished] = useState(false);
  
  // Classical AI grading state
  const [gradingResponse, setGradingResponse] = useState(null); // { score, feedback }
  const [gradingActive, setGradingActive] = useState(false);

  // Matching format states
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState(null);
  const [matchingSelectedRight, setMatchingSelectedRight] = useState(null);
  const [matchingPairs, setMatchingPairs] = useState([]); // { left, right }
  const [matchingLeftOptions, setMatchingLeftOptions] = useState([]);
  const [matchingRightOptions, setMatchingRightOptions] = useState([]);
  
  // AI end review feedback
  const [aiReport, setAiReport] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);

  const quiz = activeDoc?.quiz || [];

  const startTimer = () => {
    setTimeRemaining(600);
    setTimerActive(true);
  };

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeRemaining > 0 && !quizFinished) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && timerActive) {
      setTimerActive(false);
      handleFinishQuiz();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining, quizFinished]);

  const fetchQuiz = async (force = false) => {
    if (!activeDoc || !apiKeyConfig) return;
    if (activeDoc.quiz && !force) {
      setIsExamConfigured(true);
      startTimer();
      return;
    }

    setLoading(true);
    setError('');
    setCurrentIndex(0);
    setSelectedOption(null);
    setTextAnswer('');
    setIsAnswered(false);
    setAnswersLog([]);
    setQuizFinished(false);
    setGradingResponse(null);

    try {
      const result = await aiService.generateQuiz(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text,
        examFormat,
        difficulty
      );
      
      onQuizGenerated(result);
      setIsExamConfigured(true);
      startTimer();

      // Initialize matching options if matching format
      if (examFormat === 'matching' && result.pairs) {
        const lefts = result.pairs.map(p => p.left);
        const rights = result.pairs.map(p => p.right);
        // Shuffle right options
        setMatchingLeftOptions(lefts);
        setMatchingRightOptions([...rights].sort(() => Math.random() - 0.5));
        setMatchingPairs([]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Sınav soruları oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (optionIdx) => {
    if (isAnswered) return;
    setSelectedOption(optionIdx);
  };

  const handleSubmitAnswer = async () => {
    if (isAnswered) return;

    if (examFormat === 'multiple-choice' || examFormat === 'true-false') {
      if (selectedOption === null) return;
      const currentQuestion = quiz[currentIndex];
      const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;

      const logEntry = {
        questionIndex: currentIndex,
        question: currentQuestion.question,
        options: currentQuestion.options,
        correctAnswerIndex: currentQuestion.correctAnswerIndex,
        userAnswerIndex: selectedOption,
        category: currentQuestion.category || 'Genel',
        explanation: currentQuestion.explanation,
        isCorrect
      };

      setAnswersLog(prev => [...prev, logEntry]);
      setIsAnswered(true);
    } else if (examFormat === 'blanks') {
      if (!textAnswer.trim()) return;
      const currentQuestion = quiz[currentIndex];
      // Case insensitive check
      const isCorrect = textAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase();

      const logEntry = {
        questionIndex: currentIndex,
        question: currentQuestion.question,
        correctAnswer: currentQuestion.correctAnswer,
        userAnswerText: textAnswer,
        category: currentQuestion.category || 'Genel',
        explanation: currentQuestion.explanation,
        isCorrect
      };

      setAnswersLog(prev => [...prev, logEntry]);
      setIsAnswered(true);
    } else if (examFormat === 'classical') {
      if (!textAnswer.trim()) return;
      setGradingActive(true);
      const currentQuestion = quiz[currentIndex];

      try {
        const response = await aiService.evaluateClassicalAnswer(
          apiKeyConfig.provider,
          apiKeyConfig.apiKey,
          apiKeyConfig.model,
          currentQuestion.question,
          currentQuestion.idealKeywords,
          currentQuestion.explanation,
          textAnswer
        );

        setGradingResponse(response);
        
        const logEntry = {
          questionIndex: currentIndex,
          question: currentQuestion.question,
          userAnswerText: textAnswer,
          score: response.score,
          feedback: response.feedback,
          category: currentQuestion.category || 'Genel',
          explanation: currentQuestion.explanation,
          isCorrect: response.isCorrect
        };

        setAnswersLog(prev => [...prev, logEntry]);
        setIsAnswered(true);
      } catch (e) {
        alert(e.message || 'Yanıt puanlanırken bir sorun oluştu.');
      } finally {
        setGradingActive(false);
      }
    }
  };

  // Matching pair handler
  const handleMatchSelect = (type, item) => {
    if (type === 'left') {
      // Toggle select
      setMatchingSelectedLeft(matchingSelectedLeft === item ? null : item);
    } else {
      setMatchingSelectedRight(matchingSelectedRight === item ? null : item);
    }
  };

  // Perform matching evaluation when both selected
  useEffect(() => {
    if (matchingSelectedLeft && matchingSelectedRight) {
      const pair = { left: matchingSelectedLeft, right: matchingSelectedRight };
      setMatchingPairs(prev => [...prev, pair]);
      
      // Remove from selectable options
      setMatchingLeftOptions(prev => prev.filter(i => i !== matchingSelectedLeft));
      setMatchingRightOptions(prev => prev.filter(i => i !== matchingSelectedRight));

      setMatchingSelectedLeft(null);
      setMatchingSelectedRight(null);
    }
  }, [matchingSelectedLeft, matchingSelectedRight]);

  const handleNext = () => {
    if (currentIndex < quiz.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setTextAnswer('');
      setIsAnswered(false);
      setGradingResponse(null);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    setTimerActive(false);
    setQuizFinished(true);
    
    // Calculate stats
    let totalCorrect = 0;
    let totalWrong = 0;
    let wrongQuestionsList = [];

    if (examFormat === 'matching') {
      // Evaluate matching pairs
      const initialPairs = quiz.pairs || [];
      matchingPairs.forEach(pair => {
        const matchFound = initialPairs.find(p => p.left === pair.left && p.right === pair.right);
        if (matchFound) {
          totalCorrect += 1;
        } else {
          totalWrong += 1;
          wrongQuestionsList.push({
            question: `Eşleştirme Hatası: "${pair.left}" ile "${pair.right}"`,
            userAnswer: pair.right,
            correctAnswer: initialPairs.find(p => p.left === pair.left)?.right || 'Bulunamadı',
            category: quiz.category || 'Genel'
          });
        }
      });
      
      // Add unmatched items as wrong
      const unmatchedCount = initialPairs.length - matchingPairs.length;
      totalWrong += unmatchedCount;
    } else {
      totalCorrect = answersLog.filter(a => a.isCorrect).length;
      totalWrong = answersLog.length - totalCorrect;
      wrongQuestionsList = answersLog.filter(a => !a.isCorrect).map(a => ({
        question: a.question,
        userAnswer: examFormat === 'classical' || examFormat === 'blanks' ? a.userAnswerText : a.options[a.userAnswerIndex],
        correctAnswer: examFormat === 'blanks' ? a.correctAnswer : examFormat === 'classical' ? 'Ideal Açıklama' : a.options[a.correctAnswerIndex],
        category: a.category
      }));
    }

    if (onQuizCompleted) {
      onQuizCompleted({
        docName: activeDoc.name,
        totalQuestions: examFormat === 'matching' ? (quiz.pairs?.length || 5) : quiz.length,
        correctCount: totalCorrect,
        wrongCount: totalWrong,
        wrongQuestions: wrongQuestionsList,
        categories: examFormat === 'matching' ? [quiz.category || 'Genel'] : quiz.map(q => q.category || 'Genel')
      });
    }

    generateQuizReport(totalCorrect, totalWrong);
  };

  // Call LLM for detailed review feedback (Feature 30)
  const generateQuizReport = async (correct, wrong) => {
    if (!apiKeyConfig) return;
    setLoadingReport(true);
    try {
      const prompt = `Öğrenci "${activeDoc.name}" dersi üzerinde bir test tamamlamıştır.
Soru Tipi: ${examFormat}
Zorluk Seviyesi: ${difficulty}
Doğru Yanıt Sayısı: ${correct}
Hatalı Yanıt Sayısı: ${wrong}
Öğrencinin Hataları: ${JSON.stringify(answersLog.filter(a => !a.isCorrect).map(a => ({ soru: a.question, açıklama: a.explanation })))}

Lütfen bu sonuçlara bakarak öğrenciye rehberlik edecek Türkçe bir performans raporu yaz. Hatalarını düzeltmesi için hangi ünite veya konulara odaklanması gerektiğini net bir şekilde açıklayan 3-4 cümlelik yapıcı tavsiyeler ver.`;
      
      const response = await aiService.chatWithPdf(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        "Ders Değerlendirme Asistanı",
        [],
        prompt
      );

      setAiReport(response);
    } catch (e) {
      console.error(e);
      setAiReport('Değerlendirme raporu oluşturulurken hata meydana geldi. Ancak çalışma başarıyla kaydedildi.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setTextAnswer('');
    setIsAnswered(false);
    setAnswersLog([]);
    setQuizFinished(false);
    setGradingResponse(null);
    setAiReport('');
    setIsExamConfigured(false);
  };

  // Print quiz
  const handlePrintQuiz = () => {
    const printWindow = window.open('', '_blank');
    let questionsHtml = '';
    
    if (examFormat === 'matching') {
      const pairs = quiz.pairs || [];
      questionsHtml += `
        <h3>Aşağıdaki terimleri uygun açıklamalarıyla eşleştiriniz:</h3>
        <div style="display: flex; justify-content: space-between; gap: 40px; margin-top: 30px;">
          <ul style="list-style: decimal; line-height: 2.2;">
            ${pairs.map(p => `<li>${p.left} (....)</li>`).join('')}
          </ul>
          <ul style="list-style: lower-alpha; line-height: 2.2;">
            ${[...pairs].sort(() => Math.random() - 0.5).map(p => `<li>${p.right}</li>`).join('')}
          </ul>
        </div>
      `;
    } else {
      quiz.forEach((q, idx) => {
        questionsHtml += `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <p style="font-weight: bold; font-size: 14px;">Soru ${idx + 1}: ${q.question}</p>
            ${
              examFormat === 'multiple-choice' || examFormat === 'true-false'
                ? `<ul style="list-style: none; padding-left: 10px;">
                    ${q.options.map((opt, oIdx) => `<li style="margin: 6px 0;">[  ] ${String.fromCharCode(65 + oIdx)}) ${opt}</li>`).join('')}
                   </ul>`
                : examFormat === 'blanks'
                ? `<div style="border-bottom: 1px solid #94a3b8; width: 250px; height: 30px; margin-top: 10px;"></div>`
                : `<div style="border: 1px solid #cbd5e1; border-radius: 8px; width: 100%; height: 120px; margin-top: 10px;"></div>`
            }
          </div>
        `;
      }
      );
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>EduAI Deneme Sınavı - ${activeDoc.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 40px; color: #1e293b; }
            h2 { text-align: center; margin-bottom: 5px; }
            h4 { text-align: center; margin-top: 0; color: #64748b; font-weight: normal; }
            .info { display: flex; justify-content: space-between; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>📝 EduAI Ders Deneme Sınavı</h2>
          <h4>Konu: ${activeDoc.name} | Soru Türü: ${examFormat.toUpperCase()}</h4>
          <div class="info">
            <span>Adı Soyadı: ______________________</span>
            <span>Tarih: ____/____/______</span>
            <span>Puan: _________</span>
          </div>
          <div>${questionsHtml}</div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Share score
  const handleShareScore = (correct, wrong, percentage) => {
    const text = `🏆 EduAI Akıllı Öğrenme Platformu ile deneme sınavımı tamamladım!\n📖 Ders: ${activeDoc.name}\n✅ Doğru: ${correct} | ❌ Yanlış: ${wrong}\n📊 Başarı Yüzdesi: %${percentage}\nSiz de kendi ders notlarınızdan anında testler üretebilirsiniz.`;
    navigator.clipboard.writeText(text);
    alert('Sınav başarınız panoya kopyalandı! Sosyal medyada veya arkadaş gruplarında paylaşabilirsiniz.');
  };

  // Pre-quiz config UI
  if (!isExamConfigured) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Sınav Yapılandırması</h3>
          <p className="text-xs text-slate-500 mt-1">Ders notunuzdan hazırlanacak deneme sınavının özelliklerini seçin.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Soru Formatı</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'multiple-choice', name: 'Çoktan Seçmeli (4 Seçenekli)' },
                { id: 'true-false', name: 'Doğru / Yanlış Soruları' },
                { id: 'blanks', name: 'Boşluk Doldurma' },
                { id: 'matching', name: 'Terim Eşleştirme' },
                { id: 'classical', name: 'Klasik / Açık Uçlu Sınav (AI Graded)' }
              ].map(f => (
                <label key={f.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer text-xs transition ${examFormat === f.id ? 'border-indigo-600 bg-indigo-50/20 font-bold text-indigo-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="format" 
                    value={f.id} 
                    checked={examFormat === f.id}
                    onChange={(e) => setExamFormat(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span>{f.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Zorluk Seviyesi</label>
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-center">
              {['Kolay', 'Orta', 'Zor'].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2 px-3 border rounded-xl transition ${difficulty === d ? 'border-indigo-600 bg-indigo-50/20 text-indigo-800 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => fetchQuiz()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-100"
          >
            Sınavı Başlat
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Yapay Zeka Soruları Hazırlıyor...</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Döküman detayları incelenerek konunun özünü test edecek sınav hazırlanıyor. Lütfen bekleyin.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">Sınav Hazırlanamadı</h3>
        <p className="text-sm text-rose-600 mb-6 font-medium">{error}</p>
        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Yapılandırmaya Dön
        </button>
      </div>
    );
  }

  // Quiz end screen
  if (quizFinished) {
    let totalCorrect = 0;
    let totalWrong = 0;

    if (examFormat === 'matching') {
      const initialPairs = quiz.pairs || [];
      matchingPairs.forEach(pair => {
        const isMatched = initialPairs.some(p => p.left === pair.left && p.right === pair.right);
        if (isMatched) totalCorrect += 1;
      });
      totalWrong = initialPairs.length - totalCorrect;
    } else {
      totalCorrect = answersLog.filter(a => a.isCorrect).length;
      totalWrong = quiz.length - totalCorrect;
    }

    const totalQuestions = examFormat === 'matching' ? (quiz.pairs?.length || 5) : quiz.length;
    const scorePercentage = Math.round((totalCorrect / totalQuestions) * 100);
    
    // Net Score calculator: 4 wrong answers penalize 1 correct answer (for multiple choice)
    const netCorrect = examFormat === 'multiple-choice'
      ? Math.max(0, parseFloat((totalCorrect - (totalWrong / 4)).toFixed(2)))
      : totalCorrect;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Sınav Bitti!</h2>
          <p className="text-xs text-slate-500 mt-1">Ders Notu: {activeDoc.name}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8 max-w-xl mx-auto text-center">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-semibold text-slate-400 block mb-1">Soru</span>
              <span className="text-base font-bold text-slate-800">{totalQuestions}</span>
            </div>
            <div className="p-3 bg-emerald-50/20 border border-emerald-100 rounded-2xl">
              <span className="text-[10px] font-semibold text-emerald-600 block mb-1">Doğru</span>
              <span className="text-base font-bold text-emerald-700">{totalCorrect}</span>
            </div>
            <div className="p-3 bg-rose-50/20 border border-rose-100 rounded-2xl">
              <span className="text-[10px] font-semibold text-rose-600 block mb-1">Yanlış</span>
              <span className="text-base font-bold text-rose-700">{totalWrong}</span>
            </div>
            <div className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-2xl">
              <span className="text-[10px] font-semibold text-indigo-600 block mb-1">Net Puan</span>
              <span className="text-base font-bold text-indigo-700">{netCorrect}</span>
            </div>
          </div>

          <div className="text-center">
            <span className="text-xs font-semibold text-slate-500 block mb-1">Başarı Yüzdesi</span>
            <span className={`text-4xl font-black ${scorePercentage >= 70 ? 'text-emerald-600' : scorePercentage >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
              %{scorePercentage}
            </span>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex flex-wrap gap-2.5 justify-center">
            <button
              onClick={handleRestart}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 transition"
            >
              Yapılandırmaya Dön
            </button>
            <button
              onClick={() => handlePrintQuiz()}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Sınav Kağıdını Yazdır
            </button>
            <button
              onClick={() => handleShareScore(totalCorrect, totalWrong, scorePercentage)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              Skoru Paylaş
            </button>
          </div>
        </div>

        {/* AI Performance Report */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-md space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-300" />
            Yapay Zeka Performans Değerlendirmesi
          </h3>
          {loadingReport ? (
            <div className="flex items-center gap-2 text-xs text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              Rapor hazırlanıyor...
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-slate-200">{aiReport}</p>
          )}
        </div>

        {/* Incorrect answers review list */}
        {answersLog.filter(a => !a.isCorrect).length > 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              Gözden Geçirilmesi Gereken Yanlışlar
            </h3>

            <div className="space-y-4 pt-2">
              {answersLog.filter(a => !a.isCorrect).map((log, index) => (
                <div key={index} className="p-4 bg-rose-50/10 border border-rose-100 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block">
                    {log.category}
                  </span>
                  
                  <h4 className="font-bold text-slate-800 text-sm">{log.question}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 border border-slate-200/60 rounded-xl bg-white flex items-center gap-2">
                      <span className="font-semibold text-slate-400">Verdiğiniz Yanıt:</span>
                      <span className="text-rose-600 font-bold">
                        {examFormat === 'classical' || examFormat === 'blanks' ? log.userAnswerText : log.options[log.userAnswerIndex]}
                      </span>
                    </div>
                    <div className="p-2.5 border border-emerald-200 rounded-xl bg-emerald-50/20 flex items-center gap-2">
                      <span className="font-semibold text-slate-400">Doğru Yanıt:</span>
                      <span className="text-emerald-700 font-bold">
                        {examFormat === 'blanks' ? log.correctAnswer : examFormat === 'classical' ? 'İdeal Cevap' : log.options[log.correctAnswerIndex]}
                      </span>
                    </div>
                  </div>

                  {log.feedback && (
                    <div className="p-3 bg-amber-50 border border-amber-100 text-amber-900 rounded-xl text-xs">
                      <strong>AI Puanlama Detayı ({log.score}/10):</strong> {log.feedback}
                    </div>
                  )}

                  <div className="p-3 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700 block mb-1">Açıklama / Çözüm:</span>
                    {log.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quiz active matching view
  if (examFormat === 'matching') {
    const pairsTotal = quiz.pairs?.length || 5;
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress & Timer */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Eşleştirme Sınavı</h2>
            <p className="text-xs text-slate-500 mt-0.5">Kavramları uygun açıklamalarıyla eşleştirin.</p>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">
            <Clock className="w-4 h-4" />
            <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column (Selectable terms) */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Terimler</h4>
              {matchingLeftOptions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMatchSelect('left', item)}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition text-xs font-bold ${
                    matchingSelectedLeft === item 
                      ? 'border-indigo-600 bg-indigo-50/30 text-indigo-900' 
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
              {matchingLeftOptions.length === 0 && matchingPairs.length > 0 && (
                <p className="text-xs text-slate-400 italic text-center py-8">Tüm sol öğeler seçildi.</p>
              )}
            </div>

            {/* Right Column (Selectable definitions) */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanımlar / Açıklamalar</h4>
              {matchingRightOptions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMatchSelect('right', item)}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition text-xs ${
                    matchingSelectedRight === item 
                      ? 'border-indigo-600 bg-indigo-50/30 text-indigo-900' 
                      : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
              {matchingRightOptions.length === 0 && matchingPairs.length > 0 && (
                <p className="text-xs text-slate-400 italic text-center py-8">Tüm sağ öğeler seçildi.</p>
              )}
            </div>
          </div>

          {/* Matched pairs list */}
          {matchingPairs.length > 0 && (
            <div className="border-t border-slate-100 pt-5 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Eşleştirdikleriniz</h4>
              <div className="grid grid-cols-1 gap-2">
                {matchingPairs.map((pair, idx) => (
                  <div key={idx} className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-xl text-xs flex justify-between gap-4">
                    <span className="font-bold text-indigo-900">{pair.left}</span>
                    <span className="text-slate-600 truncate max-w-xs">{pair.right}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleFinishQuiz}
              className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Eşleştirmeyi Bitir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active question MCQ, Blanks, Classical
  const currentQuestion = quiz[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Quiz Progress & Timer */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {currentQuestion.category || 'Ders Sınavı'}
          </span>
          <h2 className="text-base font-bold text-slate-800 mt-2">Deneme Sınavı</h2>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">
          <Clock className="w-4 h-4" />
          <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / quiz.length) * 100}%` }}
        ></div>
      </div>

      {/* Question Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-base md:text-lg font-bold text-slate-800 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options / Input based on format */}
        {(examFormat === 'multiple-choice' || examFormat === 'true-false') && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              let btnClass = "border-slate-200 hover:border-slate-300 text-slate-700 bg-white";
              
              if (selectedOption === idx && !isAnswered) {
                btnClass = "border-indigo-600 bg-indigo-50/30 text-indigo-900";
              }

              if (isAnswered) {
                if (idx === currentQuestion.correctAnswerIndex) {
                  btnClass = "border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold";
                } else if (selectedOption === idx) {
                  btnClass = "border-rose-500 bg-rose-50/40 text-rose-950";
                } else {
                  btnClass = "border-slate-100 opacity-60 text-slate-500 bg-white cursor-not-allowed";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition text-xs flex items-center justify-between ${btnClass}`}
                >
                  <span>{option}</span>
                  {isAnswered && idx === currentQuestion.correctAnswerIndex && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                  {isAnswered && selectedOption === idx && idx !== currentQuestion.correctAnswerIndex && (
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {examFormat === 'blanks' && (
          <div className="space-y-3">
            <input 
              type="text"
              value={textAnswer}
              disabled={isAnswered}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Boşluğu dolduracak kelimeyi yazın..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 disabled:bg-slate-50"
            />
            {isAnswered && (
              <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                textAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase()
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {textAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase() ? (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>Tebrikler, Doğru Cevap!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4.5 h-4.5" />
                    <span>Hatalı Cevap! Doğrusu: "{currentQuestion.correctAnswer}"</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {examFormat === 'classical' && (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={textAnswer}
              disabled={isAnswered || gradingActive}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Cevabınızı detaylı olarak buraya yazın (AI değerlendirecektir)..."
              className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 disabled:bg-slate-50 resize-none"
            />
            {gradingActive && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-indigo-600 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin" />
                Yapay Zeka Yanıtınızı Puanlıyor...
              </div>
            )}
            {isAnswered && gradingResponse && (
              <div className="p-4 rounded-xl border space-y-2 bg-slate-50 border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Değerlendirme Puanı</span>
                  <span className={`text-base font-black ${gradingResponse.score >= 7 ? 'text-emerald-600' : gradingResponse.score >= 4 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {gradingResponse.score} / 10
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed"><strong>AI Geri Bildirimi:</strong> {gradingResponse.feedback}</p>
                <p className="text-slate-500 text-[10px]">Önerilen Anahtar Kelimeler: {currentQuestion.idealKeywords.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Answer explanation */}
        {isAnswered && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 animate-fadeIn text-xs leading-relaxed">
            <span className="font-bold text-slate-700 block">Soru Çözümü & Açıklaması:</span>
            <p className="text-slate-600">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-end pt-2">
          {!isAnswered ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={
                (examFormat === 'multiple-choice' || examFormat === 'true-false')
                  ? selectedOption === null
                  : !textAnswer.trim()
              }
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Yanıtı Gönder
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
            >
              <span>{currentIndex === quiz.length - 1 ? 'Sınavı Bitir' : 'Sonraki Soru'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, HelpCircle, ArrowRight, Award } from 'lucide-react';
import { aiService } from '../services/ai';

export default function QuizView({ 
  activeDoc, 
  apiKeyConfig, 
  onQuizGenerated,
  onQuizCompleted 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // null or index
  const [isAnswered, setIsAnswered] = useState(false);
  const [answersLog, setAnswersLog] = useState([]); // [{ questionIndex, selectedOption, isCorrect }]
  const [quizFinished, setQuizFinished] = useState(false);

  const quiz = activeDoc?.quiz || [];

  const fetchQuiz = async (force = false) => {
    if (!activeDoc || !apiKeyConfig) return;
    if (activeDoc.quiz && !force) return;

    setLoading(true);
    setError('');
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setAnswersLog([]);
    setQuizFinished(false);

    try {
      const result = await aiService.generateQuiz(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text
      );
      
      onQuizGenerated(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Deneme sınavı oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
    // Reset state on document change
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setAnswersLog([]);
    setQuizFinished(false);
  }, [activeDoc?.name]);

  const handleOptionSelect = (optionIdx) => {
    if (isAnswered) return;
    setSelectedOption(optionIdx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswered) return;

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
  };

  const handleNext = () => {
    if (currentIndex < quiz.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Quiz finished
      setQuizFinished(true);
      
      // Calculate results
      const totalCorrect = answersLog.filter(a => a.isCorrect).length;
      const totalWrong = quiz.length - totalCorrect;
      
      if (onQuizCompleted) {
        onQuizCompleted({
          docName: activeDoc.name,
          totalQuestions: quiz.length,
          correctCount: totalCorrect,
          wrongCount: totalWrong,
          wrongQuestions: answersLog.filter(a => !a.isCorrect),
          categories: quiz.map(q => q.category || 'Genel')
        });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setAnswersLog([]);
    setQuizFinished(false);
  };

  if (!apiKeyConfig) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">API Anahtarı Eksik</h3>
        <p className="text-sm text-slate-500 mb-6">
          Soru hazırlayabilmek için öncelikle ayarlar sekmesinden geçerli bir API anahtarı eklemelisiniz.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Deneme Testi Çıkarılıyor...</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Döküman inceleniyor; çoktan seçmeli ve doğru-yanlış sorularından oluşan akıllı deneme sınavı hazırlanıyor.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">Test Oluşturulamadı</h3>
        <p className="text-sm text-rose-600 mb-6 font-medium">{error}</p>
        <button
          onClick={() => fetchQuiz(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Yeniden Dene
        </button>
      </div>
    );
  }

  if (quiz.length === 0) return null;

  // Quiz end screen
  if (quizFinished) {
    const totalCorrect = answersLog.filter(a => a.isCorrect).length;
    const scorePercentage = Math.round((totalCorrect / quiz.length) * 100);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Test Tamamlandı!</h2>
          <p className="text-sm text-slate-500 mt-1">Öğrenme performansınız ve sınav sonuçlarınız aşağıdadır.</p>

          <div className="grid grid-cols-3 gap-4 my-8 max-w-md mx-auto">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 block mb-1">Soru Sayısı</span>
              <span className="text-xl font-bold text-slate-800">{quiz.length}</span>
            </div>
            <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
              <span className="text-xs font-semibold text-emerald-600 block mb-1">Doğru</span>
              <span className="text-xl font-bold text-emerald-700">{totalCorrect}</span>
            </div>
            <div className="p-4 bg-rose-50/30 border border-rose-100 rounded-2xl">
              <span className="text-xs font-semibold text-rose-600 block mb-1">Yanlış</span>
              <span className="text-xl font-bold text-rose-700">{quiz.length - totalCorrect}</span>
            </div>
          </div>

          <div className="text-center">
            <span className="text-sm font-semibold text-slate-500 block mb-1">Başarı Yüzdesi</span>
            <span className={`text-4xl font-black ${scorePercentage >= 70 ? 'text-emerald-600' : scorePercentage >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
              %{scorePercentage}
            </span>
          </div>

          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-600 transition"
            >
              Testi Tekrar Çöz
            </button>
            <button
              onClick={() => fetchQuiz(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Yeni Sorular Üret
            </button>
          </div>
        </div>

        {/* Incorrect answers review list */}
        {answersLog.filter(a => !a.isCorrect).length > 0 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              Gözden Geçirilmesi Gereken Yanlışlar
            </h3>
            <p className="text-xs text-slate-500">
              Bu sorulara yanlış cevap verdiniz. Konuları pekiştirmek için açıklamaları dikkatle okuyun.
            </p>

            <div className="space-y-4 pt-2">
              {answersLog.filter(a => !a.isCorrect).map((log, index) => (
                <div key={index} className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      {log.category}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-slate-800 text-sm">{log.question}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 border border-slate-200/60 rounded-xl bg-white flex items-center gap-2">
                      <span className="font-semibold text-slate-400">Verdiğiniz Yanıt:</span>
                      <span className="text-rose-600 font-bold">{log.options[log.userAnswerIndex]}</span>
                    </div>
                    <div className="p-2 border border-emerald-200 rounded-xl bg-emerald-50/20 flex items-center gap-2">
                      <span className="font-semibold text-slate-400">Doğru Yanıt:</span>
                      <span className="text-emerald-700 font-bold">{log.options[log.correctAnswerIndex]}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700 block mb-1">Açıklama:</span>
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

  const currentQuestion = quiz[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Quiz Progress & Metadata */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {currentQuestion.category || 'Ders Sınavı'}
          </span>
          <h2 className="text-base font-bold text-slate-800 mt-2">Deneme Sınavı</h2>
        </div>
        <div className="text-xs font-semibold text-slate-400">
          Soru {currentIndex + 1} / {quiz.length}
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

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            let btnClass = "border-slate-200 hover:border-slate-355 text-slate-700 bg-white";
            
            if (selectedOption === idx && !isAnswered) {
              btnClass = "border-indigo-600 bg-indigo-50/30 text-indigo-900";
            }

            if (isAnswered) {
              if (idx === currentQuestion.correctAnswerIndex) {
                // Correct answer is always green
                btnClass = "border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold";
              } else if (selectedOption === idx) {
                // If user selected this wrong answer, make it red
                btnClass = "border-rose-500 bg-rose-50/40 text-rose-955";
              } else {
                // Other options are muted
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

        {/* Active answer explanations */}
        {isAnswered && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 animate-fadeIn text-xs leading-relaxed">
            <span className="font-bold text-slate-700 block">Soru Açıklaması:</span>
            <p className="text-slate-600">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-end pt-2">
          {!isAnswered ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm shadow-indigo-100"
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

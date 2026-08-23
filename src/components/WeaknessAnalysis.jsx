import React, { useState, useEffect } from 'react';
import { Brain, AlertCircle, RefreshCw, Sparkles, HelpCircle, Flame, Check, ChevronLeft, ChevronRight, BookOpen, Trash2 } from 'lucide-react';
import { aiService } from '../services/ai';

export default function WeaknessAnalysis({ activeDoc, apiKeyConfig }) {
  const [history, setHistory] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [wrongQuestions, setWrongQuestions] = useState([]);
  
  // Custom review cards state
  const [loadingCards, setLoadingCards] = useState(false);
  const [reviewCards, setReviewCards] = useState([]); // custom flashcards
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [activeDoc?.name]);

  const loadHistory = () => {
    try {
      const storedHistory = JSON.parse(localStorage.getItem('eduai_quiz_history') || '[]');
      setHistory(storedHistory);

      // Aggregate wrong questions and identify weak topics
      const allWrong = [];
      const topicErrorCounts = {}; // { [topic]: count }

      storedHistory.forEach(quiz => {
        if (quiz.wrongQuestions) {
          quiz.wrongQuestions.forEach(q => {
            allWrong.push(q);
            const topic = q.category || 'Genel';
            topicErrorCounts[topic] = (topicErrorCounts[topic] || 0) + 1;
          });
        }
      });

      setWrongQuestions(allWrong);

      // Sort topics by error count desc
      const sortedTopics = Object.entries(topicErrorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      setWeakTopics(sortedTopics);
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  const handleGenerateReviewDeck = async () => {
    if (!activeDoc || !apiKeyConfig || weakTopics.length === 0) return;

    setLoadingCards(true);
    setCardIndex(0);
    setCardFlipped(false);

    try {
      // Gather top 3 weak topics and a subset of wrong questions to feed the prompt
      const topicsList = weakTopics.slice(0, 3).map(t => t.name);
      // Take up to 5 representative wrong questions
      const subsetWrongs = wrongQuestions.slice(0, 5).map(q => ({
        question: q.question,
        userAnswer: q.options[q.userAnswerIndex] || 'Boş',
        correctAnswer: q.options[q.correctAnswerIndex]
      }));

      const cards = await aiService.generateWeaknessReview(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text,
        topicsList,
        subsetWrongs
      );

      setReviewCards(cards);
    } catch (e) {
      alert(e.message || 'Hataları düzelten özel bilgi kartları üretilemedi.');
    } finally {
      setLoadingCards(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Tüm sınav geçmişinizi ve zayıf nokta analiz verilerinizi silmek istediğinize emin misiniz?')) {
      localStorage.removeItem('eduai_quiz_history');
      setHistory([]);
      setWeakTopics([]);
      setWrongQuestions([]);
      setReviewCards([]);
    }
  };

  if (history.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
        <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">Henüz Analiz Yok</h3>
        <p className="text-sm text-slate-500 mb-6">
          Zayıf kaldığınız konuları ve hatalarınızı görebilmek için öncelikle dökümanlar üzerinde quiz/test çözmelisiniz.
        </p>
      </div>
    );
  }

  // Calculate some analytics
  const totalQuizzes = history.length;
  const totalCorrect = history.reduce((sum, item) => sum + item.correctCount, 0);
  const totalWrong = history.reduce((sum, item) => sum + item.wrongCount, 0);
  const totalQuestions = totalCorrect + totalWrong;
  const averageSuccessRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
            Öğrenme Analitiği
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-2">Zaman Kapsülü & Zayıf Nokta Analizi</h2>
          <p className="text-xs text-slate-500 mt-1">Yapay zeka hatalarınızı inceler ve neleri tekrar etmeniz gerektiğini söyler.</p>
        </div>

        <button
          onClick={handleClearHistory}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl transition"
        >
          <Trash2 className="w-4 h-4" />
          Geçmişi Temizle
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Çözülen Sınav Sayısı</span>
          <span className="text-2xl font-black text-slate-800">{totalQuizzes}</span>
          <p className="text-[10px] text-slate-400 mt-1">Farklı dökümanlar üzerinden girilen testler.</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Hatalı Yanıt Sayısı</span>
          <span className="text-2xl font-black text-rose-600">{totalWrong}</span>
          <p className="text-[10px] text-slate-400 mt-1">Gözden geçirilmesi gereken soru sayısı.</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Ortalama Başarı Yüzdesi</span>
          <span className={`text-2xl font-black ${averageSuccessRate >= 70 ? 'text-emerald-600' : averageSuccessRate >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
            %{averageSuccessRate}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">Genel anlama oranınız.</p>
        </div>
      </div>

      {/* Analysis Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Topics Bar Chart List */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Konulara Göre Hata Dağılımı</h3>
          {weakTopics.length > 0 ? (
            <div className="space-y-4">
              {weakTopics.map((topic, index) => {
                // Percentage of errors in this topic relative to total errors
                const maxCount = weakTopics[0]?.count || 1;
                const percentageOfMax = Math.round((topic.count / maxCount) * 100);

                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700">{topic.name}</span>
                      <span className="font-semibold text-rose-600">{topic.count} Hata</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-rose-500 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentageOfMax}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">Analiz edilecek veri yok.</p>
          )}
        </div>

        {/* Action card for targeted learning */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-4">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold mb-1.5">Zayıf Noktaları İyileştirme Kapsülü</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Hata yaptığınız konulardaki eksikleri kapatmak için yapay zeka sadece o konulara odaklanan **hedefe yönelik çalışma kartları** üretsin.
            </p>
          </div>

          {!loadingCards && reviewCards.length === 0 && (
            <button
              onClick={handleGenerateReviewDeck}
              disabled={!activeDoc || weakTopics.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold transition"
            >
              <Sparkles className="w-4 h-4" />
              Özel Çalışma Kartları Üret
            </button>
          )}

          {loadingCards && (
            <div className="flex items-center justify-center gap-2 py-3 bg-slate-800/40 text-indigo-300 rounded-xl text-xs font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Yapay Zeka Analiz Ediyor...
            </div>
          )}

          {reviewCards.length > 0 && (
            <div className="text-xs text-emerald-400 font-semibold text-center">
              ✓ {reviewCards.length} Adet Özel Düzeltici Kart Üretildi!
            </div>
          )}
        </div>
      </div>

      {/* Render custom review cards if generated */}
      {reviewCards.length > 0 && (
        <div className="bg-indigo-50/20 border border-indigo-100 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Düzeltici Çalışma Kartları (Zayıf Noktalar)
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">Sadece yanlış yaptığınız konuları düzeltmeye yönelik kartlar.</p>
            </div>
            <button
              onClick={() => setReviewCards([])}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
            >
              Kartları Kapat
            </button>
          </div>

          {/* Card render */}
          <div 
            onClick={() => setCardFlipped(!cardFlipped)}
            className="w-full h-64 perspective-1000 cursor-pointer"
          >
            <div className={`relative w-full h-full duration-500 transform-style-3d ${cardFlipped ? 'rotate-y-180' : ''}`}>
              {/* Front */}
              <div className="absolute inset-0 bg-white border border-indigo-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm backface-hidden">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full self-start">
                  {reviewCards[cardIndex].category} (Zayıf Nokta)
                </span>
                <p className="text-sm font-bold text-slate-800 text-center py-4">
                  {reviewCards[cardIndex].question}
                </p>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Doğrusunu görmek için tıklayın
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 bg-indigo-950 rounded-2xl p-6 flex flex-col justify-between shadow-md backface-hidden rotate-y-180 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-full self-start">
                  Gelişim Açıklaması
                </span>
                <p className="text-xs text-indigo-100 text-center py-4 leading-relaxed overflow-y-auto max-h-32">
                  {reviewCards[cardIndex].answer}
                </p>
                <span className="text-[10px] text-indigo-300">Geri dönmek için tıklayın</span>
              </div>
            </div>
          </div>

          {/* Nav for review deck */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">
              Kart {cardIndex + 1} / {reviewCards.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setCardFlipped(false); setTimeout(() => setCardIndex(prev => Math.max(0, prev - 1)), 150); }}
                disabled={cardIndex === 0}
                className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCardFlipped(false); setTimeout(() => setCardIndex(prev => Math.min(reviewCards.length - 1, prev + 1)), 150); }}
                disabled={cardIndex === reviewCards.length - 1}
                className="p-2 border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History log list */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Sınav Geçmişi</h3>
        <div className="divide-y divide-slate-100">
          {history.map((item, idx) => (
            <div key={idx} className="py-3 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-slate-700 block">{item.docName}</span>
                <span className="text-slate-400 mt-0.5 block">Tarih: {item.date || 'Belirtilmemiş'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">{item.correctCount} Doğru</span>
                <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded font-bold">{item.wrongCount} Yanlış</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

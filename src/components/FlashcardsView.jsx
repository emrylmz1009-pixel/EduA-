import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, HelpCircle, Check, BookOpen, AlertCircle } from 'lucide-react';
import { aiService } from '../services/ai';

export default function FlashcardsView({ 
  activeDoc, 
  apiKeyConfig, 
  onFlashcardsGenerated,
  onMasteryUpdated 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Track master state locally for the current deck
  const [masteredCards, setMasteredCards] = useState({}); // { [index]: true }

  const cards = activeDoc?.flashcards || [];

  const fetchFlashcards = async (force = false) => {
    if (!activeDoc || !apiKeyConfig) return;
    if (activeDoc.flashcards && !force) return;

    setLoading(true);
    setError('');
    setIsFlipped(false);
    setCurrentIndex(0);
    setMasteredCards({});

    try {
      const result = await aiService.generateFlashcards(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text
      );
      
      onFlashcardsGenerated(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Bilgi kartları oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
    // Reset state on document change
    setIsFlipped(false);
    setCurrentIndex(0);
    setMasteredCards({});
  }, [activeDoc?.name]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 150);
    }
  };

  const toggleMastered = (index) => {
    const isNowMastered = !masteredCards[index];
    const updated = { ...masteredCards, [index]: isNowMastered };
    setMasteredCards(updated);

    // Report mastery update to parent context
    if (onMasteryUpdated) {
      const totalMastered = Object.values(updated).filter(Boolean).length;
      onMasteryUpdated(totalMastered);
    }
  };

  if (!apiKeyConfig) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">API Anahtarı Eksik</h3>
        <p className="text-sm text-slate-500 mb-6">
          Bilgi kartları üretebilmek için öncelikle ayarlar sekmesinden geçerli bir API anahtarı eklemelisiniz.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Bilgi Kartları Üretiliyor...</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Dökümandaki önemli tanımlar, tarihler ve teoriler çıkarılıyor. Hızlı tekrar kartları oluşturuluyor.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">Bilgi Kartları Oluşturulamadı</h3>
        <p className="text-sm text-rose-600 mb-6 font-medium">{error}</p>
        <button
          onClick={() => fetchFlashcards(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Yeniden Dene
        </button>
      </div>
    );
  }

  if (cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const totalMasteredCount = Object.values(masteredCards).filter(Boolean).length;
  const masteryPercentage = Math.round((totalMasteredCount / cards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Otomatik Bilgi Kartları (Flashcards)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Önemli tanımları ve terimleri aktif geri çağırma ile öğrenin.</p>
        </div>
        
        <button
          onClick={() => fetchFlashcards(true)}
          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 transition"
          title="Kartları Yeniden Üret"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Mastery Progress Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-700">
          <span>Ezberleme İlerlemesi</span>
          <span className="text-emerald-600">{totalMasteredCount} / {cards.length} Kart Öğrenildi ({masteryPercentage}%)</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${masteryPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-80 perspective-1000 cursor-pointer"
      >
        <div className={`relative w-full h-full duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front of Card */}
          <div className="absolute inset-0 bg-white border border-slate-150 rounded-3xl p-8 flex flex-col justify-between shadow-sm backface-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {currentCard.category || 'Ders Notu'}
              </span>
              <span className="text-xs font-semibold text-slate-400">Ön Yüz (Soru)</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-lg md:text-xl font-bold text-slate-800 text-center leading-relaxed">
                {currentCard.question}
              </p>
            </div>

            <div className="flex justify-between items-center text-slate-400 text-xs mt-2">
              <span className="flex items-center gap-1.5 font-medium">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                Cevabı görmek için tıklayın
              </span>
              <span className="font-semibold text-slate-500">{currentIndex + 1} / {cards.length}</span>
            </div>
          </div>

          {/* Back of Card */}
          <div className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-md backface-hidden rotate-y-180 text-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full">
                {currentCard.category || 'Ders Notu'}
              </span>
              <span className="text-xs font-semibold text-slate-400">Arka Yüz (Cevap)</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center py-6 overflow-y-auto max-h-48 pr-1">
              <p className="text-sm md:text-base text-slate-100 text-center leading-relaxed whitespace-pre-wrap">
                {currentCard.answer}
              </p>
            </div>

            <div className="flex justify-between items-center text-xs mt-2">
              <span className="text-slate-400">Filtrele veya çevirmek için tıkla</span>
              <span className="font-semibold text-slate-400">{currentIndex + 1} / {cards.length}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Controls & Mark learned */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Navigation */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            disabled={currentIndex === 0}
            className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Önceki Kart"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            disabled={currentIndex === cards.length - 1}
            className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Sonraki Kart"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mastered/Review toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleMastered(currentIndex); }}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition ${
            masteredCards[currentIndex]
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-100'
              : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <Check className={`w-4.5 h-4.5 ${masteredCards[currentIndex] ? 'text-white' : 'text-slate-400'}`} />
          <span>{masteredCards[currentIndex] ? 'Öğrenildi Olarak İşaretlendi!' : 'Öğrendim olarak işaretle'}</span>
        </button>
      </div>

      {/* Active recall study tip */}
      <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4 flex gap-3">
        <BookOpen className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
        <div>
          <h5 className="text-xs font-bold text-indigo-900">Aktif Hatırlama (Active Recall) İpucu</h5>
          <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
            Kartın arkasını çevirmeden önce cevabı sesli olarak söylemeye veya kağıda yazmaya çalışın. Bu, nöral bağları güçlendirerek kalıcı öğrenmeyi sağlar.
          </p>
        </div>
      </div>
    </div>
  );
}

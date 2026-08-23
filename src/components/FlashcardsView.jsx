import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Check, 
  BookOpen, 
  AlertCircle, 
  Star, 
  Shuffle, 
  Printer, 
  TrendingUp 
} from 'lucide-react';
import { aiService } from '../services/ai';

export default function FlashcardsView({ 
  activeDoc, 
  apiKeyConfig, 
  onFlashcardsGenerated,
  onMasteryUpdated 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Card index references (shuffled or standard)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [starFilter, setStarFilter] = useState(false);
  const [order, setOrder] = useState([]); // indices order array

  // Leitner & Star state from LocalStorage
  // Schema: { [docName]: { [cardQuestion]: { level: 1-5, starred: boolean } } }
  const [leitnerData, setLeitnerData] = useState({});

  // Tinder Swipe drag state
  const [dragStartX, setDragStartX] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  const rawCards = activeDoc?.flashcards || [];

  // Filter and sort cards based on options
  const getProcessedCards = () => {
    let list = rawCards.map((card, idx) => ({ ...card, originalIndex: idx }));
    
    // Apply star filter
    if (starFilter) {
      list = list.filter(c => {
        const key = `${activeDoc.name}_${c.question}`;
        return leitnerData[key]?.starred === true;
      });
    }

    // Apply order
    if (order.length === list.length) {
      list = order.map(idx => list.find(c => c.originalIndex === idx)).filter(Boolean);
    }
    
    return list;
  };

  const processedCards = getProcessedCards();
  const currentCard = processedCards[currentIndex] || null;

  const loadLeitnerData = () => {
    try {
      const data = JSON.parse(localStorage.getItem('eduai_leitner_data') || '{}');
      setLeitnerData(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLeitnerData();
  }, [activeDoc?.name]);

  const fetchFlashcards = async (force = false) => {
    if (!activeDoc || !apiKeyConfig) return;
    if (activeDoc.flashcards && !force) return;

    setLoading(true);
    setError('');
    setIsFlipped(false);
    setCurrentIndex(0);
    setOrder([]);

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
    setIsFlipped(false);
    setCurrentIndex(0);
    setOrder([]);
  }, [activeDoc?.name]);

  const updateCardState = (question, fields) => {
    const key = `${activeDoc.name}_${question}`;
    const newLeitner = {
      ...leitnerData,
      [key]: {
        ...(leitnerData[key] || { level: 1, starred: false }),
        ...fields
      }
    };
    setLeitnerData(newLeitner);
    localStorage.setItem('eduai_leitner_data', JSON.stringify(newLeitner));

    // Propagate stats
    const totalMastered = Object.values(newLeitner).filter(v => v.level === 5).length;
    if (onMasteryUpdated) onMasteryUpdated(totalMastered);
  };

  const handleLevelUp = () => {
    if (!currentCard) return;
    const currentInfo = leitnerData[`${activeDoc.name}_${currentCard.question}`] || { level: 1, starred: false };
    const nextLevel = Math.min(5, currentInfo.level + 1);
    
    updateCardState(currentCard.question, { level: nextLevel });
    handleNext();
  };

  const handleLevelDown = () => {
    if (!currentCard) return;
    // Demote back to level 1 for active practice
    updateCardState(currentCard.question, { level: 1 });
    handleNext();
  };

  const toggleStar = (e) => {
    e.stopPropagation();
    if (!currentCard) return;
    const currentInfo = leitnerData[`${activeDoc.name}_${currentCard.question}`] || { level: 1, starred: false };
    
    updateCardState(currentCard.question, { starred: !currentInfo.starred });
  };

  const handleNext = () => {
    if (currentIndex < processedCards.length - 1) {
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

  const handleShuffle = () => {
    const indices = processedCards.map(c => c.originalIndex);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setOrder(indices);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Tinder Swipe Gesture Handlers
  const handleTouchStart = (e) => {
    setDragStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (dragStartX === null) return;
    const currentX = e.touches[0].clientX;
    setDragOffset(currentX - dragStartX);
  };

  const handleTouchEnd = () => {
    if (dragStartX === null) return;
    triggerSwipeResult();
  };

  const handleMouseDown = (e) => {
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (dragStartX === null) return;
    setDragOffset(e.clientX - dragStartX);
  };

  const handleMouseUp = () => {
    if (dragStartX === null) return;
    triggerSwipeResult();
  };

  const triggerSwipeResult = () => {
    if (dragOffset > 130) {
      // Swiped Right - Mastered (Level Up)
      handleLevelUp();
    } else if (dragOffset < -130) {
      // Swiped Left - Needs Practice (Level Down)
      handleLevelDown();
    }
    setDragStartX(null);
    setDragOffset(0);
  };

  // A4 Printable Sheet
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    let cardsHtml = '';
    rawCards.forEach((c, idx) => {
      cardsHtml += `
        <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; page-break-inside: avoid; display: flex; flex-direction: column; justify-content: space-between; height: 180px;">
          <div>
            <span style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase; background: #e0e7ff; padding: 2px 6px; border-radius: 4px;">${c.category || 'Ders Notu'}</span>
            <h4 style="font-size: 14px; margin-top: 10px; font-weight: bold; color: #1e293b;">Soru: ${c.question}</h4>
          </div>
          <div style="border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 12px; color: #475569;">
            Cevap: ${c.answer}
          </div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${activeDoc.name} - Bilgi Kartları</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 30px; }
            h2 { text-align: center; color: #1e293b; margin-bottom: 20px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; }
          </style>
        </head>
        <body>
          <h2>🎓 ${activeDoc.name} - Yazdırılabilir Bilgi Kartları</h2>
          <div class="grid">${cardsHtml}</div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  if (processedCards.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">Kart Bulunamadı</h3>
        <p className="text-xs text-slate-500 mb-6">
          {starFilter ? 'Yıldızlı kartınız bulunmamaktadır. Çalışırken kartları yıldızlayarak favorilere ekleyebilirsiniz.' : 'Kart destesi boş.'}
        </p>
        {starFilter && (
          <button
            onClick={() => setStarFilter(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Filtreyi Kaldır
          </button>
        )}
      </div>
    );
  }

  // Leitner level configurations
  const cardLeitnerInfo = currentCard ? (leitnerData[`${activeDoc.name}_${currentCard.question}`] || { level: 1, starred: false }) : { level: 1, starred: false };
  const starsArray = Array(5).fill(0);

  // Swipe animation variables
  const swipeStyle = dragStartX !== null ? {
    transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`,
    transition: 'none'
  } : {
    transform: 'none',
    transition: 'transform 0.25s ease'
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Otomatik Bilgi Kartları</h2>
          <p className="text-xs text-slate-500 mt-0.5">Tinder kaydırma hareketleriyle ve Leitner sistemiyle ders tekrarı yapın.</p>
        </div>
        
        <div className="flex gap-2">
          {/* Star Filter */}
          <button
            onClick={() => { setStarFilter(!starFilter); setCurrentIndex(0); }}
            className={`p-2 border rounded-xl transition ${
              starFilter 
                ? 'bg-amber-50 border-amber-200 text-amber-600' 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Sadece Yıldızlıları Göster"
          >
            <Star className={`w-4.5 h-4.5 ${starFilter ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
          
          {/* Shuffle */}
          <button
            onClick={handleShuffle}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 transition"
            title="Kartları Karıştır"
          >
            <Shuffle className="w-4.5 h-4.5" />
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 transition"
            title="Deste Çalışma Kağıdını Yazdır"
          >
            <Printer className="w-4.5 h-4.5" />
          </button>
          
          {/* Regenerate */}
          <button
            onClick={() => fetchFlashcards(true)}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 transition"
            title="Kartları Yeniden Üret"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Swipe hints */}
      <div className="flex justify-between text-[11px] text-slate-400 font-semibold px-2">
        <span className="flex items-center gap-1">← Sola Kaydır (Tekrar Çalış)</span>
        <span className="flex items-center gap-1">Sağa Kaydır (Öğrendim) →</span>
      </div>

      {/* Flashcard Area */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-80 perspective-1000 select-none relative overflow-visible"
      >
        {/* Swipe Indicators */}
        {dragStartX !== null && dragOffset > 40 && (
          <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg rotate-12 pointer-events-none shadow-md">
            ÖĞRENDİM
          </div>
        )}
        {dragStartX !== null && dragOffset < -40 && (
          <div className="absolute top-4 left-4 z-10 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg -rotate-12 pointer-events-none shadow-md">
            TEKRAR ÇALIŞ
          </div>
        )}

        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          style={swipeStyle}
          className={`relative w-full h-full duration-500 transform-style-3d cursor-pointer shadow-sm hover:shadow-md rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          
          {/* Front of Card */}
          <div className="absolute inset-0 bg-white border border-slate-150 rounded-3xl p-8 flex flex-col justify-between backface-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {currentCard.category || 'Ders Notu'}
              </span>
              
              {/* Star and Leitner Level */}
              <div className="flex items-center gap-2">
                {/* Leitner Level stars */}
                <div className="flex items-center gap-0.5" title={`Leitner Seviyesi: ${cardLeitnerInfo.level}`}>
                  {starsArray.map((_, i) => (
                    <TrendingUp 
                      key={i} 
                      className={`w-3.5 h-3.5 ${
                        i < cardLeitnerInfo.level ? 'text-indigo-600' : 'text-slate-200'
                      }`} 
                    />
                  ))}
                </div>

                <button
                  onClick={toggleStar}
                  className="p-1 rounded-lg hover:bg-slate-100 transition"
                >
                  <Star className={`w-4 h-4 ${cardLeitnerInfo.starred ? 'fill-amber-500 text-amber-500' : 'text-slate-400 hover:text-amber-500'}`} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-base md:text-lg font-bold text-slate-800 text-center leading-relaxed">
                {currentCard.question}
              </p>
            </div>

            <div className="flex justify-between items-center text-slate-400 text-[11px] mt-2">
              <span className="flex items-center gap-1 font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Cevabı görmek için tıkla
              </span>
              <span className="font-semibold text-slate-500">{currentIndex + 1} / {processedCards.length}</span>
            </div>
          </div>

          {/* Back of Card */}
          <div className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between backface-hidden rotate-y-180 text-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full">
                {currentCard.category || 'Ders Notu'}
              </span>
              <span className="text-xs font-semibold text-slate-400">Cevap</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center py-6 overflow-y-auto max-h-48 pr-1">
              <p className="text-sm md:text-base text-slate-100 text-center leading-relaxed whitespace-pre-wrap">
                {currentCard.answer}
              </p>
            </div>

            <div className="flex justify-between items-center text-[11px] mt-2">
              <span className="text-slate-400">Çevirmek için tıkla</span>
              <span className="font-semibold text-slate-400">{currentIndex + 1} / {processedCards.length}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Controls & Mark learned */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Navigation */}
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === processedCards.length - 1}
            className="p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Leitner rating buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleLevelDown}
            className="flex-1 sm:flex-initial px-5 py-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            Tekrar Çalış
          </button>
          
          <button
            onClick={handleLevelUp}
            className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-100"
          >
            <Check className="w-4 h-4" />
            Öğrendim!
          </button>
        </div>
      </div>

      {/* Leitner Box system info card */}
      <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4 flex gap-3">
        <BookOpen className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
        <div>
          <h5 className="text-xs font-bold text-indigo-900">Leitner Öğrenme Sistemi</h5>
          <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
            Bildiğiniz kartların seviyesi artar (maks 5). Bilmediğiniz kartlar ise doğrudan 1. Seviyeye geri döner. Seviyesi 5 olan kartlar tamamen ezberlenmiş kabul edilir ve istatistiklerinize eklenir.
          </p>
        </div>
      </div>
    </div>
  );
}

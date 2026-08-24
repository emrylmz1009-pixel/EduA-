import React, { useState, useEffect } from 'react';
import { Award, Calendar, FolderOpen, Trash2, ArrowRight, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function ArchiveView() {
  const [history, setHistory] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('eduai_quiz_history') || '[]');
      setHistory(stored);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearSingle = (index, e) => {
    e.stopPropagation();
    if (confirm('Bu sınav kaydını arşivden silmek istediğinize emin misiniz?')) {
      const updated = history.filter((_, idx) => idx !== index);
      setHistory(updated);
      localStorage.setItem('eduai_quiz_history', JSON.stringify(updated));
    }
  };

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (history.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
        <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">Soru Arşivi Boş</h3>
        <p className="text-sm text-slate-500">
          Çözdüğünüz deneme sınavları otomatik olarak buraya kaydedilecektir. Henüz hiçbir testi bitirmediniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Çözümlü Soru & Sınav Arşivi</h2>
        <p className="text-xs text-slate-500 mt-0.5">Geçmişte çözdüğünüz sınavları inceleyin ve çözümlerini tekrar çalışın.</p>
      </div>

      <div className="space-y-4">
        {history.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          const isVisual = item.type === 'visual_solve';
          
          if (isVisual) {
            return (
              <div 
                key={idx} 
                className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden transition-all duration-300"
              >
                {/* Row Header */}
                <div 
                  onClick={() => toggleExpand(idx)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition select-none"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full inline-block mb-1.5 uppercase">
                      Fotoğraftan Soru Çözümü ({item.subject})
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm truncate">{item.topicName || item.docName}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-xl">
                      Çözüldü
                    </span>

                    <button 
                      onClick={(e) => handleClearSingle(idx, e)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Bu Çözümü Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {item.imagePreview && (
                        <div className="md:col-span-4 flex items-center justify-center bg-white p-2 border border-slate-200 rounded-xl max-h-[220px]">
                          <img 
                            src={item.imagePreview} 
                            alt="Soru Görseli" 
                            className="object-contain max-h-[200px] rounded-lg"
                          />
                        </div>
                      )}
                      
                      <div className={`${item.imagePreview ? 'md:col-span-8' : 'md:col-span-12'} space-y-3`}>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Soru Metni</span>
                          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium leading-relaxed">
                            {item.questionText}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cevap Anahtarı</span>
                          <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                            Nihai Yanıt: {item.finalAnswer}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Adım Adım Çözüm Aşamaları</span>
                      <div className="space-y-2">
                        {item.solutionSteps?.map((step, sIdx) => (
                          <div key={sIdx} className="p-3 bg-white border border-slate-150 rounded-xl text-xs text-slate-600 leading-relaxed shadow-sm">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>

                    {item.studyTip && (
                      <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-xl space-y-1">
                        <strong className="block text-[9px] font-bold uppercase tracking-wider text-amber-900">💡 Öğretmen Taktiği</strong>
                        <p>{item.studyTip}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          const totalQ = item.totalQuestions || (item.correctCount + item.wrongCount);
          const scorePercent = totalQ > 0 ? Math.round((item.correctCount / totalQ) * 100) : 0;

          return (
            <div 
              key={idx} 
              className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden transition-all duration-300"
            >
              {/* Row Header */}
              <div 
                onClick={() => toggleExpand(idx)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition select-none"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-1.5 uppercase">
                    Ders Sınavı
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm truncate">{item.docName}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Score metrics */}
                  <div className="flex gap-2 text-xs font-bold text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded">{item.correctCount} D</span>
                    <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded">{item.wrongCount} Y</span>
                    <span className={`px-2 py-1 rounded ${scorePercent >= 70 ? 'bg-emerald-600 text-white' : scorePercent >= 40 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                      %{scorePercent} Başarı
                    </span>
                  </div>

                  <button 
                    onClick={(e) => handleClearSingle(idx, e)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    title="Bu Kaydı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Hatalı Yapılan Sorular ve Açıklamalar</h5>
                  
                  {item.wrongQuestions && item.wrongQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {item.wrongQuestions.map((q, qIdx) => (
                        <div key={qIdx} className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3 shadow-sm">
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block">
                            {q.category || 'Genel'}
                          </span>
                          <h4 className="font-bold text-slate-800 text-xs">{q.question}</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 border border-rose-100 rounded-lg bg-rose-50/10 flex items-center gap-1.5">
                              <span className="text-slate-400">Cevabınız:</span>
                              <strong className="text-rose-600">{q.userAnswer}</strong>
                            </div>
                            <div className="p-2 border border-emerald-100 rounded-lg bg-emerald-50/10 flex items-center gap-1.5">
                              <span className="text-slate-400">Doğru Cevap:</span>
                              <strong className="text-emerald-700">{q.correctAnswer}</strong>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 leading-relaxed">
                            <span className="font-bold text-slate-700 block mb-0.5">Çözüm / Açıklama:</span>
                            {q.explanation || 'Çözüm açıklaması bu sınav için mevcut değil.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-semibold italic text-center py-4 bg-white border border-emerald-100 rounded-xl">
                      🎉 Harika! Bu sınavda hiç hata yapmamışsınız, %100 başarı!
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

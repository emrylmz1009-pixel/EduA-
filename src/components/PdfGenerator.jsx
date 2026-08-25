import React, { useState } from 'react';
import { Sparkles, AlertCircle, Loader2, BookOpen, Printer, Download, ArrowRight, Award, Key } from 'lucide-react';
import { aiService } from '../services/ai';

export default function PdfGenerator({ apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [topic, setTopic] = useState('');
  const [booklet, setBooklet] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const handleGenerateBooklet = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError('Lütfen bir konu başlığı yazın.');
      return;
    }
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    setBooklet(null);
    setShowAnswers(false);

    try {
      const result = await aiService.writeTextbookBooklet(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        topic
      );

      setBooklet(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Konu anlatım fasikülü oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Print styles wrapper (wizard trick to isolate prints to the booklet card only) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide everything else */
          body * {
            visibility: hidden;
            background: white !important;
          }
          /* Show ONLY the booklet */
          #printable-booklet, #printable-booklet * {
            visibility: visible;
          }
          #printable-booklet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between no-print">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            DERS FASİKÜLÜ YAZARI
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Ders Notu & PDF Üretici</h2>
          <p className="text-xs md:text-sm text-slate-500">
            İstediğiniz ders konusunu yazın, yapay zeka tanımları, LaTeX formüllerini ve çözümlü soruları içeren bir kitapçık hazırlasın. A4 sayfalarına uyumlu olarak PDF indirin.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <BookOpen className="w-6 h-6" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5 no-print">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TOPIC INPUT FORM */}
      {!loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm no-print">
          <form onSubmit={handleGenerateBooklet} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Örn: 11. Sınıf Matematik - Trigonometrik Denklemler Konu Anlatımı"
              className="flex-1 px-4 py-3 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none bg-white font-semibold text-slate-700"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ders Kitapçığı Oluştur</span>
            </button>
          </form>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm space-y-4 animate-pulse no-print">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Fasikülünüz Yazılıyor</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Yapay zeka ders kitabı formatında konu anlatımını, LaTeX uyumlu formülleri ve alıştırma sorularını hazırlıyor...
          </p>
        </div>
      )}

      {/* BOOKLET CONTENT (A4 Print Optimized card) */}
      {booklet && !loading && (
        <div className="space-y-6">
          {/* Action strip */}
          <div className="flex justify-between items-center bg-white border border-slate-100 rounded-2xl p-4 shadow-sm no-print">
            <span className="text-xs font-bold text-slate-500">
              Ders kitapçığı hazır. PDF olarak kaydetmek veya yazdırmak için sağdaki butona tıklayın.
            </span>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>PDF Olarak Kaydet / Yazdır</span>
            </button>
          </div>

          {/* Printable Booklet frame */}
          <div 
            id="printable-booklet"
            className="bg-white border border-slate-150 rounded-3xl p-8 md:p-12 shadow-sm space-y-8"
          >
            {/* Booklet Header */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-2">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">
                {booklet.subject || 'Ders Fasikülü'}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                {booklet.title}
              </h1>
              <p className="text-xs text-slate-400 italic max-w-lg mx-auto">
                {booklet.introduction}
              </p>
            </div>

            {/* Theory content block */}
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900 border-l-4 border-slate-950 pl-2.5">
                1. Konu Anlatımı ve Kavramlar
              </h3>
              <div className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-700 whitespace-pre-line bg-slate-50/20 rounded-2xl p-5 border border-slate-100 font-medium">
                {booklet.theoryContent}
              </div>
            </div>

            {/* Formulas section */}
            {booklet.formulas && booklet.formulas.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 border-l-4 border-slate-950 pl-2.5">
                  2. Önemli Formüller ve Kurallar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {booklet.formulas.map((f, idx) => (
                    <div key={idx} className="p-4 border border-slate-150 bg-slate-50/50 rounded-2xl space-y-2 text-center">
                      <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm inline-block font-mono text-xs font-black text-indigo-900">
                        {f.formula}
                      </div>
                      <p className="text-[10px] text-slate-600 font-bold leading-normal">
                        {f.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Solved exercises */}
            {booklet.solvedQuestions && booklet.solvedQuestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 border-l-4 border-slate-950 pl-2.5">
                  3. Çözümlü Örnek Sorular
                </h3>
                <div className="space-y-4">
                  {booklet.solvedQuestions.map((q, idx) => (
                    <div key={idx} className="p-5 border border-slate-150 rounded-2xl space-y-3 bg-slate-50/10">
                      <h4 className="font-bold text-slate-800 text-xs">
                        Örnek Soru {idx + 1}: <span className="font-medium text-slate-600">{q.question}</span>
                      </h4>
                      <div className="border-t border-slate-150 pt-2.5 bg-white/60 p-4 rounded-xl border space-y-1">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider block">✍️ DETAYLI ÇÖZÜM</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                          {q.solution}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice / Home exercises */}
            {booklet.practiceQuestions && booklet.practiceQuestions.length > 0 && (
              <div className="space-y-4 pb-6">
                <div className="flex justify-between items-center border-l-4 border-slate-950 pl-2.5">
                  <h3 className="text-base font-black text-slate-900">
                    4. Pekiştirme Alıştırmaları
                  </h3>
                  <button
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full no-print hover:bg-indigo-100 transition"
                  >
                    {showAnswers ? 'Cevapları Gizle' : 'Cevap Anahtarını Göster'}
                  </button>
                </div>

                <div className="space-y-3">
                  {booklet.practiceQuestions.map((pq, idx) => (
                    <div key={idx} className="p-4 border border-slate-150 rounded-2xl flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-800 text-xs block">Soru {idx + 1}</span>
                        <p className="text-xs text-slate-600 leading-snug">{pq.question}</p>
                      </div>
                      
                      {(showAnswers || window.matchMedia('print').matches) && (
                        <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex-shrink-0 animate-scaleIn border border-emerald-100">
                          Cevap: {pq.answerKey}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

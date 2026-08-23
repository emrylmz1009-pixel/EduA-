import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, ArrowRight, Loader2, Sparkles, BookOpen, BrainCircuit, Award } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfExtractor';

export default function Dashboard({ 
  onPdfExtracted, 
  activeDoc,
  stats,
  onChangeTab 
}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Lütfen geçerli bir PDF dosyası yükleyin.');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError('');

    try {
      const result = await extractTextFromPdf(file, (percent) => {
        setProgress(percent);
      });

      onPdfExtracted({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        pageCount: result.pageCount,
        text: result.text
      });
    } catch (err) {
      setError(err.message || 'PDF metni ayıklanırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-8">
      {/* Welcome / Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-indigo-100/50">
        <div className="max-w-2xl">
          <span className="bg-indigo-500/30 text-indigo-100 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
            Yapay Zeka Destekli Ders Çalışma Asistanı
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
            EduAI ile Fırsat Eşitliği, Akıllı Öğrenme!
          </h1>
          <p className="text-indigo-100/90 mt-3 text-base md:text-lg font-light leading-relaxed">
            Ders notlarınızı veya kitaplarınızı PDF olarak yükleyin; yapay zeka bunları saniyeler içinde sizin için özetlesin, bilgi kartları çıkarsın ve deneme sınavları hazırlasın.
          </p>
        </div>
      </div>

      {/* Upload Zone & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Döküman Yükleme Alanı</h3>
            <p className="text-sm text-slate-500 mb-6">Özetlemek veya test üretmek istediğiniz ders notunu sürükleyip bırakın.</p>
          </div>

          {!loading && !activeDoc && (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition"
            >
              <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-sm font-semibold text-slate-700">PDF dosyasını seçmek için tıklayın veya sürükleyin</p>
              <p className="text-xs text-slate-400 mt-1">Sadece .pdf formatında (Maksimum 50 MB önerilir)</p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden" 
              />
            </div>
          )}

          {loading && (
            <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-8 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-700">Metinler PDF'ten Ayıklanıyor...</p>
              <p className="text-xs text-slate-400 mt-1">Lütfen bekleyin (İşlem tarayıcınızda yapılıyor)</p>
              
              <div className="w-full max-w-xs bg-slate-200 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 mt-1.5">{progress}%</span>
            </div>
          )}

          {!loading && activeDoc && (
            <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-5 flex items-start gap-4">
              <div className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-50">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 text-sm truncate">{activeDoc.name}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Boyut: {activeDoc.size}</span>
                  <span>•</span>
                  <span>Sayfa: {activeDoc.pageCount}</span>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
                  >
                    Başka Dosya Seç
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden" 
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs font-medium text-rose-600 mt-3">{error}</p>
          )}
        </div>

        {/* Stats Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Çalışma Özetim</h3>
            <p className="text-sm text-slate-500 mb-6">EduAI ile öğrenme metrikleriniz.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block mb-1">Çözülen Soru</span>
              <span className="text-2xl font-black text-slate-800">{stats.questionsSolved || 0}</span>
            </div>
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block mb-1">Doğru Oranı</span>
              <span className="text-2xl font-black text-slate-800">
                {stats.questionsSolved > 0 
                  ? `%${Math.round((stats.questionsCorrect / stats.questionsSolved) * 100)}` 
                  : '%0'}
              </span>
            </div>
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block mb-1">Çalışılan Konu</span>
              <span className="text-2xl font-black text-slate-800">{stats.topicsStudied || 0}</span>
            </div>
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block mb-1">Ezberlenen Kart</span>
              <span className="text-2xl font-black text-slate-800">{stats.flashcardsMastered || 0}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 leading-tight">
              Tüm verileriniz tarayıcınızda saklanır ve gizliliğiniz %100 güvendedir.
            </p>
          </div>
        </div>
      </div>

      {/* Active Document Actions */}
      {activeDoc && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Yapay Zeka İşlemleri</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Summary */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4 font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">Metin Özetleme</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sayfalarca notu ana fikirler, anahtar kavramlar ve maddeli ders planı olarak saniyeler içinde özetler.
                </p>
              </div>
              <button 
                onClick={() => onChangeTab('summary')}
                className="w-full flex items-center justify-between text-xs font-bold text-violet-600 group-hover:text-violet-700 bg-violet-50 hover:bg-violet-100/70 py-2.5 px-4 rounded-xl transition"
              >
                <span>Özet Oluştur</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Flashcards */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">Otomatik Bilgi Kartı</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Metindeki önemli formül, tanım ve kavramları tespit ederek hızlı tekrar için interaktif kartlar üretir.
                </p>
              </div>
              <button 
                onClick={() => onChangeTab('flashcards')}
                className="w-full flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 py-2.5 px-4 rounded-xl transition"
              >
                <span>Kartları Üret</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quiz */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-base mb-1">Akıllı Sınav Hazırlama</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ders notundan otomatik olarak çoktan seçmeli ve doğru-yanlış deneme testleri çıkartarak bilginizi ölçer.
                </p>
              </div>
              <button 
                onClick={() => onChangeTab('quiz')}
                className="w-full flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 py-2.5 px-4 rounded-xl transition"
              >
                <span>Testi Başlat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intro info for BYOK when not loaded */}
      {!activeDoc && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <h5 className="font-bold text-slate-800 text-sm">Fırsat Eşitliği ve BYOK Nedir?</h5>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Yapay zeka araçlarının kullanım maliyeti yüksektir. EduAI, sizin kendi API anahtarınızı (Bring Your Own Key) ekleyerek, 
                Google ve OpenAI altyapılarını aracı komisyonu olmadan tamamen ücretsiz veya neredeyse bedavaya kullanmanızı sağlar.
              </p>
            </div>
          </div>
          <button 
            onClick={() => onChangeTab('settings')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 bg-white px-4 py-2 rounded-xl transition shrink-0"
          >
            Anahtarı Bağla
          </button>
        </div>
      )}
    </div>
  );
}

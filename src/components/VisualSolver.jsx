import React, { useState, useEffect } from 'react';
import { Camera, Upload, Trash2, Sparkles, FolderPlus, Check, HelpCircle, Loader2 } from 'lucide-react';
import { aiService } from '../services/ai';

export default function VisualSolver({ apiKeyConfig }) {
  const [image, setImage] = useState(null); // { mimeType, base64 }
  const [previewUrl, setPreviewUrl] = useState('');
  const [subject, setSubject] = useState('Matematik');
  const [promptText, setPromptText] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [solution, setSolution] = useState(null);
  const [archived, setArchived] = useState(false);

  const subjects = [
    'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 
    'Türkçe & Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe', 'Diğer'
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir resim dosyası seçin.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      setImage({
        mimeType: file.type,
        base64: base64String
      });
      setPreviewUrl(reader.result);
      setSolution(null);
      setArchived(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImage(null);
    setPreviewUrl('');
    setSolution(null);
    setArchived(false);
    setError('');
  };

  const handleSolve = async () => {
    if (!previewUrl || !image) {
      setError('Lütfen öncelikle bir soru fotoğrafı yükleyin.');
      return;
    }
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    setSolution(null);
    setArchived(false);

    try {
      const result = await aiService.solveVisualQuestion(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        image.mimeType,
        image.base64,
        subject,
        promptText
      );
      
      setSolution(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Soru çözülürken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = () => {
    if (!solution) return;
    
    try {
      const history = JSON.parse(localStorage.getItem('eduai_quiz_history') || '[]');
      const archiveItem = {
        type: 'visual_solve',
        docName: `${subject} - Fotoğraftan Çözüm`,
        date: new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        subject,
        imagePreview: previewUrl, // Save preview base64 data to render inline in history
        questionText: solution.questionText,
        solutionSteps: solution.solutionSteps,
        finalAnswer: solution.finalAnswer,
        topicName: solution.topicName,
        studyTip: solution.studyTip
      };

      const updatedHistory = [archiveItem, ...history];
      localStorage.setItem('eduai_quiz_history', JSON.stringify(updatedHistory));
      setArchived(true);
    } catch (e) {
      console.error("Archive error:", e);
      alert("Çözüm arşive kaydedilemedi.");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            YENİ ÖZELLİK
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Fotoğraftan Soru Çözücü</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Çözemediğiniz sorunun fotoğrafını yükleyin veya kamerayla çekin, yapay zeka adım adım çözsün.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Camera className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Upload Column */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">1. Soru Fotoğrafı</h3>
            
            {!previewUrl ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:bg-slate-50/50 hover:border-indigo-300 transition text-center min-h-[220px]">
                <Upload className="w-8 h-8 text-slate-400 mb-3" />
                <span className="text-xs font-bold text-slate-700">Resim Seçin veya Çekin</span>
                <span className="text-[10px] text-slate-400 mt-1">PNG, JPG formatları desteklenir.</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[220px] max-h-[300px]">
                <img 
                  src={previewUrl} 
                  alt="Soru Önizleme" 
                  className="object-contain max-w-full max-h-[280px]" 
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2 right-2 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition"
                  title="Resmi Kaldır"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">2. Detaylar</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ders Seçin</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white"
                >
                  {subjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Özel Talimatlar (İsteğe Bağlı)</label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Örn: Hangi formülü kullandığını detaylı açıkla..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSolve}
              disabled={loading || !previewUrl}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Soru Çözülüyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Soruyu Çöz ve Açıkla</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="md:col-span-7 space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!solution && !loading && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center min-h-[350px] flex flex-col items-center justify-center space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-300" />
              <h4 className="font-bold text-slate-700 text-sm">Çözüm Bekleniyor</h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Sol taraftan sorunun resmini yükleyin ve "Soruyu Çöz" butonuna basarak adım adım açıklamalı yapay zeka analizini başlatın.
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center min-h-[350px] flex flex-col items-center justify-center space-y-4 shadow-sm animate-pulse">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <h4 className="font-bold text-slate-800 text-sm">Görsel Okunuyor ve Çözüm Hazırlanıyor</h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Yapay zeka sorununuzu tarıyor, metinleri çıkartıyor ve detaylı açıklama adımlarını yapılandırıyor. Lütfen bekleyin.
              </p>
            </div>
          )}

          {solution && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block uppercase">
                    {solution.topicName || subject}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm mt-1">Soru Analizi & Çözümü</h4>
                </div>

                <button
                  onClick={handleArchive}
                  disabled={archived}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition ml-2 ${
                    archived 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {archived ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Arşive Eklendi!</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Arşive Kaydet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Parsed question text */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sorunun Metni</span>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed font-medium">
                  {solution.questionText}
                </div>
              </div>

              {/* Solution steps */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adım Adım Çözüm</span>
                <div className="space-y-2.5">
                  {solution.solutionSteps?.map((step, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Answer */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Doğru Cevap</span>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] uppercase font-black">Nihai Yanıt</span>
                  <span>{solution.finalAnswer}</span>
                </div>
              </div>

              {/* Study Tip */}
              {solution.studyTip && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-800 leading-relaxed space-y-1">
                  <strong className="block text-amber-900 font-bold uppercase tracking-wider text-[9px]">💡 Ders Çalışma İpucu / Öğretmen Taktiği</strong>
                  <p>{solution.studyTip}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

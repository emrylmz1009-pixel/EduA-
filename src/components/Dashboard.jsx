import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  BrainCircuit, 
  Award, 
  Image as ImageIcon, 
  Mic, 
  Youtube, 
  Columns,
  Layers,
  Clock
} from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { aiService } from '../services/ai';

export default function Dashboard({ 
  onPdfExtracted, 
  activeDoc,
  stats,
  onChangeTab,
  apiKeyConfig
}) {
  const [uploadTab, setUploadTab] = useState('pdf'); // pdf, ocr, audio, youtube, compare
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  
  // Page limits
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState('');

  // YouTube / Compare states
  const [ytUrl, setYtUrl] = useState('');
  const [ytTopic, setYtTopic] = useState('');
  const [compareTextA, setCompareTextA] = useState('');
  const [compareTextB, setCompareTextB] = useState('');

  const fileInputRef = useRef(null);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const processFile = async (file) => {
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setError('');

    try {
      if (uploadTab === 'pdf') {
        if (file.type !== 'application/pdf') {
          throw new Error('Lütfen geçerli bir PDF dosyası seçin.');
        }
        
        const limitStart = parseInt(startPage) || 1;
        const limitEnd = endPage ? parseInt(endPage) : null;
        
        const result = await extractTextFromPdf(file, (percent) => {
          setProgress(percent);
        }, limitStart, limitEnd);

        onPdfExtracted({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          pageCount: result.pageCount,
          text: result.text,
          range: result.extractedRange,
          type: 'pdf'
        });
      } else if (uploadTab === 'ocr') {
        if (!file.type.startsWith('image/')) {
          throw new Error('Lütfen geçerli bir görsel dosyası seçin (PNG/JPG).');
        }
        if (!apiKeyConfig) {
          throw new Error('Görsel analizi (OCR) için öncelikle Ayarlar sekmesinden API anahtarı eklemelisiniz.');
        }

        setProgress(30);
        const base64 = await fileToBase64(file);
        setProgress(60);
        const text = await aiService.performOcr(
          apiKeyConfig.provider,
          apiKeyConfig.apiKey,
          apiKeyConfig.model,
          base64,
          file.type
        );
        setProgress(100);

        onPdfExtracted({
          name: `Fotoğraf Notu: ${file.name}`,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          pageCount: 1,
          text: text,
          type: 'ocr'
        });
      } else if (uploadTab === 'audio') {
        if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) {
          throw new Error('Lütfen geçerli bir ses dosyası seçin (MP3/WAV).');
        }
        if (!apiKeyConfig) {
          throw new Error('Ses dökümü için öncelikle Ayarlar sekmesinden API anahtarı eklemelisiniz.');
        }
        if (apiKeyConfig.provider === 'openai') {
          throw new Error('OpenAI doğrudan ses dosyası analizini desteklememektedir. Lütfen Google Gemini API anahtarı kullanın.');
        }

        setProgress(30);
        const base64 = await fileToBase64(file);
        setProgress(60);
        const text = await aiService.processAudio(
          apiKeyConfig.provider,
          apiKeyConfig.apiKey,
          apiKeyConfig.model,
          base64,
          file.type || 'audio/mp3'
        );
        setProgress(100);

        onPdfExtracted({
          name: `Ses Anlatımı: ${file.name}`,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          pageCount: 1,
          text: text,
          type: 'audio'
        });
      }
    } catch (err) {
      setError(err.message || 'Dosya işlenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!ytUrl.trim() || !ytTopic.trim()) {
      setError('Lütfen YouTube video adresini ve ders konusunu girin.');
      return;
    }
    if (!apiKeyConfig) {
      setError('YouTube ders özetleyici için geçerli bir API anahtarı girmelisiniz.');
      return;
    }

    setLoading(true);
    setProgress(50);
    setError('');

    try {
      // Prompt LLM to act as youtube transcription summary based on link & topic
      const systemPrompt = `Sen bir YouTube ders çözümleyicisisin. Öğrenci sana bir YouTube linki ve ders konusu göndermiştir. 
Bu video hakkında sahip olduğun genel bilgiyi, kanalın konu anlatım tarzını ve konunun temel hatlarını kullanarak Türkçe kapsamlı bir ders içeriği ve özet oluştur. 
Kullanıcının verimli ders çalışabilmesi için tüm detayları sağla.`;
      
      const userPrompt = `YouTube Video Linki: ${ytUrl}\nKonu Başlığı: ${ytTopic}\nLütfen bu ders konusuyla ilgili ayrıntılı metin içeriğini oluştur.`;
      
      const text = await aiService.chatWithPdf(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        "YouTube Video Dersi Analiz Aracı",
        [],
        userPrompt
      );

      onPdfExtracted({
        name: `YouTube Dersi: ${ytTopic}`,
        size: 'N/A',
        pageCount: 1,
        text: text,
        type: 'youtube'
      });
    } catch (err) {
      setError(err.message || 'YouTube içeriği işlenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareSubmit = async () => {
    if (!compareTextA.trim() || !compareTextB.trim()) {
      setError('Lütfen karşılaştırmak istediğiniz her iki metni de doldurun.');
      return;
    }
    if (!apiKeyConfig) {
      setError('Metin karşılaştırma analizi için geçerli bir API anahtarı girmelisiniz.');
      return;
    }

    setLoading(true);
    setProgress(50);
    setError('');

    try {
      const systemPrompt = `Sen bir eğitim analistisin. Öğrencinin sana gönderdiği iki farklı ders notunu/metnini karşılaştır. 
Her iki metnin benzerliklerini, farklılıklarını, birbirini tamamlayan noktalarını ve hangisinde hangi detayların daha iyi açıklandığını Türkçe olarak raporla.`;
      
      const userPrompt = `1. Metin:\n${compareTextA}\n\n2. Metin:\n${compareTextB}\n\nLütfen bu iki metnin detaylı karşılaştırmasını yap.`;
      
      const text = await aiService.chatWithPdf(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        "Metin Karşılaştırma Aracı",
        [],
        userPrompt
      );

      onPdfExtracted({
        name: `Metin Karşılaştırma Analizi`,
        size: 'N/A',
        pageCount: 1,
        text: text,
        type: 'compare'
      });
    } catch (err) {
      setError(err.message || 'Karşılaştırma analizi sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  // Estimate study time based on text characters
  const estimateStudyTime = () => {
    if (!activeDoc || !activeDoc.text) return 0;
    const wordCount = activeDoc.text.split(/\s+/).length;
    return Math.max(2, Math.round(wordCount / 180)); // 180 words per minute average reading speed
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-indigo-100/50">
        <div className="max-w-2xl">
          <span className="bg-indigo-500/30 text-indigo-100 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
            Yapay Zeka Destekli Ders Çalışma Asistanı
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
            EduAI ile Fırsat Eşitliği, Akıllı Öğrenme!
          </h1>
          <p className="text-indigo-100/90 mt-3 text-base md:text-lg font-light leading-relaxed">
            Ders notlarınızı veya dökümanlarınızı yükleyin; yapay zeka bunları sizin için saniyeler içinde analiz etsin, bilgi kartları çıkarsın, zihin haritaları çizsin ve deneme sınavları hazırlasın.
          </p>
        </div>
      </div>

      {/* Upload Zone & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col">
          {/* Uploader Navigation */}
          <div className="flex gap-1.5 border-b border-slate-100 pb-3 mb-6 overflow-x-auto">
            {[
              { id: 'pdf', name: 'PDF Notu', icon: FileText },
              { id: 'ocr', name: 'Görsel Not (OCR)', icon: ImageIcon },
              { id: 'audio', name: 'Ses Kaydı', icon: Mic },
              { id: 'youtube', name: 'YouTube Dersi', icon: Youtube },
              { id: 'compare', name: 'Not Kıyasla', icon: Columns }
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { setUploadTab(t.id); setError(''); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    uploadTab === t.id 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.name}
                </button>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-8 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-sm font-semibold text-slate-700">Döküman Analiz Ediliyor...</p>
                <p className="text-xs text-slate-400 mt-1">Yapay zeka verileri işliyor, lütfen bekleyin...</p>
                {progress > 0 && (
                  <div className="w-full max-w-xs bg-slate-200 rounded-full h-1.5 mt-4 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ) : activeDoc ? (
              <div className="border border-indigo-100 bg-indigo-50/20 rounded-2xl p-5 flex items-start gap-4">
                <div className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-50">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 text-sm truncate">{activeDoc.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    {activeDoc.size !== 'N/A' && <span>Boyut: {activeDoc.size}</span>}
                    <span>•</span>
                    <span>Sayfa: {activeDoc.pageCount}</span>
                    {activeDoc.range && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 font-medium">Seçim: Sayfa {activeDoc.range}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Estimated Reading Time */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tahmini Çalışma Süresi: <strong className="text-slate-700">{estimateStudyTime()} dakika</strong></span>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => { onPdfExtracted(null); }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white border border-rose-100 px-3 py-1.5 rounded-lg transition"
                    >
                      Dökümanı Kaldır
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* PDF tab */}
                {uploadTab === 'pdf' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Başlangıç Sayfası</label>
                        <input 
                          type="number" 
                          value={startPage} 
                          onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Bitiş Sayfası (Boş ise hepsi)</label>
                        <input 
                          type="number" 
                          value={endPage} 
                          onChange={(e) => setEndPage(e.target.value)}
                          placeholder="Örn: 10"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    
                    <div 
                      onClick={() => fileInputRef.current.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition"
                    >
                      <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
                      <p className="text-sm font-semibold text-slate-700">PDF dosyasını seçmek için tıklayın veya sürükleyin</p>
                      <p className="text-xs text-slate-400 mt-1">Sadece .pdf formatında</p>
                    </div>
                  </div>
                )}

                {/* OCR (Image) tab */}
                {uploadTab === 'ocr' && (
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition"
                  >
                    <ImageIcon className="w-12 h-12 text-slate-400 mb-4" />
                    <p className="text-sm font-semibold text-slate-700">Not Fotoğrafını (PNG/JPG) seçin</p>
                    <p className="text-xs text-slate-400 mt-1">El yazısı notlar veya kitap sayfaları için idealdir</p>
                  </div>
                )}

                {/* Audio tab */}
                {uploadTab === 'audio' && (
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/5 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition"
                  >
                    <Mic className="w-12 h-12 text-slate-400 mb-4" />
                    <p className="text-sm font-semibold text-slate-700">Ses kaydı (MP3/WAV) dosyasını seçin</p>
                    <p className="text-xs text-slate-400 mt-1">Sözlü ders anlatımlarını metne dönüştürmek için</p>
                  </div>
                )}

                {/* YouTube tab */}
                {uploadTab === 'youtube' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">YouTube Video Adresi (URL)</label>
                      <input 
                        type="text" 
                        value={ytUrl}
                        onChange={(e) => setYtUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Ders / Konu Başlığı</label>
                      <input 
                        type="text" 
                        value={ytTopic}
                        onChange={(e) => setYtTopic(e.target.value)}
                        placeholder="Örn: Limit ve Süreklilik Konu Anlatımı"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={handleYoutubeSubmit}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                    >
                      Dersi Analiz Et ve Yükle
                    </button>
                  </div>
                )}

                {/* Compare tab */}
                {uploadTab === 'compare' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">1. Metin / Ders Notu</label>
                        <textarea 
                          rows={4}
                          value={compareTextA}
                          onChange={(e) => setCompareTextA(e.target.value)}
                          placeholder="İlk ders notunun içeriğini buraya yapıştırın..."
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">2. Metin / Ders Notu</label>
                        <textarea 
                          rows={4}
                          value={compareTextB}
                          onChange={(e) => setCompareTextB(e.target.value)}
                          placeholder="Karşılaştırmak istediğiniz ikinci ders notunun içeriğini buraya yapıştırın..."
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCompareSubmit}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                    >
                      İki Notu Karşılaştır ve Analiz Et
                    </button>
                  </div>
                )}

                {/* General Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={
                    uploadTab === 'pdf' ? 'application/pdf' :
                    uploadTab === 'ocr' ? 'image/*' :
                    'audio/*'
                  }
                  className="hidden" 
                />
              </>
            )}
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-600 mt-4 bg-rose-50 p-2.5 rounded-lg">{error}</p>
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
                  Zihin Haritası (Mind Map) ve Sözlük içeren, özel uzunluklarda ders özetleri üretin.
                </p>
              </div>
              <button 
                onClick={() => onChangeTab('summary')}
                className="w-full flex items-center justify-between text-xs font-bold text-violet-600 group-hover:text-violet-700 bg-violet-50 hover:bg-violet-100/70 py-2.5 px-4 rounded-xl transition"
              >
                <span>Özet Modülüne Git</span>
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
                  Tinder kaydırma (Swipe), Leitner aralıklı tekrar sistemi ve yıldızlı kart desteleriyle çalışın.
                </p>
              </div>
              <button 
                onClick={() => onChangeTab('flashcards')}
                className="w-full flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 py-2.5 px-4 rounded-xl transition"
              >
                <span>Kart Destesine Git</span>
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
                  Geri sayım sayacı, Boşluk Doldurma, Klasik Yazılı (AI Değerlendirmeli) ve Eşleştirme testleriyle kendinizi ölçün.
                </p>
              </div>
              <button 
                onClick={() => onChangeTab('quiz')}
                className="w-full flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 py-2.5 px-4 rounded-xl transition"
              >
                <span>Sınav Modülüne Git</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

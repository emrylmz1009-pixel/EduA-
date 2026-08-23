import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, Layers, Clock, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { aiService } from '../services/ai';

export default function SummaryView({ activeDoc, apiKeyConfig, onSummaryGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('executive'); // executive, concepts, timeline, guide
  const [copied, setCopied] = useState(false);

  const summary = activeDoc?.summary || null;

  const fetchSummary = async (force = false) => {
    if (!activeDoc || !apiKeyConfig) return;
    if (activeDoc.summary && !force) return;

    setLoading(true);
    setError('');
    
    try {
      const result = await aiService.generateSummary(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text
      );
      
      onSummaryGenerated(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Özet oluşturulurken bir hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [activeDoc?.name]);

  const handleCopy = () => {
    if (!summary) return;
    
    let textToCopy = `# ${summary.title || activeDoc.name}\n\n`;
    textToCopy += `## Genel Özet\n${summary.executiveSummary}\n\n`;
    
    if (summary.keyConcepts && summary.keyConcepts.length > 0) {
      textToCopy += `## Temel Kavramlar\n`;
      summary.keyConcepts.forEach(c => {
        textToCopy += `- **${c.term}**: ${c.definition}\n`;
      });
      textToCopy += `\n`;
    }

    if (summary.timeline && summary.timeline.length > 0) {
      textToCopy += `## Zaman Tüneli / Süreç\n`;
      summary.timeline.forEach(t => {
        textToCopy += `- **${t.date}**: ${t.event}\n`;
      });
      textToCopy += `\n`;
    }

    if (summary.studyGuide && summary.studyGuide.length > 0) {
      textToCopy += `## Detaylı Çalışma Notları\n`;
      summary.studyGuide.forEach(g => {
        textToCopy += `### ${g.sectionTitle}\n${g.content}\n\n`;
      });
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!apiKeyConfig) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">API Anahtarı Eksik</h3>
        <p className="text-sm text-slate-500 mb-6">
          Ders özetlerini çıkartabilmek için öncelikle ayarlar sekmesinden geçerli bir API anahtarı eklemelisiniz.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Yapay Zeka Özeti Hazırlıyor...</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Döküman yapısı analiz ediliyor, önemli kavramlar ve konu başlıkları yapılandırılıyor. Lütfen pencereyi kapatmayın.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg mb-2">Özet Oluşturulamadı</h3>
        <p className="text-sm text-rose-600 mb-6 font-medium">{error}</p>
        <button
          onClick={() => fetchSummary(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Yeniden Dene
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const showTimelineTab = summary.timeline && summary.timeline.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Döküman Analizi
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-2">{summary.title || activeDoc.name}</h2>
          <p className="text-xs text-slate-500 mt-1">Yapay zeka tarafından çıkarılan çalışma özeti ve kılavuzu.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Panoya Kopyala (Markdown)</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => fetchSummary(true)}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition"
            title="Özeti Yeniden Oluştur"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('executive')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeSubTab === 'executive' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Genel Özet
        </button>

        <button
          onClick={() => setActiveSubTab('concepts')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeSubTab === 'concepts' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Temel Kavramlar ({summary.keyConcepts?.length || 0})
        </button>

        {showTimelineTab && (
          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
              activeSubTab === 'timeline' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Zaman Tüneli / Süreç ({summary.timeline?.length || 0})
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeSubTab === 'guide' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Çalışma Notları
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
        {/* Executive Summary */}
        {activeSubTab === 'executive' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">Metnin Özü ve Ana Fikir</h3>
            <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-line space-y-3">
              {summary.executiveSummary}
            </div>
          </div>
        )}

        {/* Key Concepts */}
        {activeSubTab === 'concepts' && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-slate-800">Bilmeniz Gereken Kritik Terim ve Kavramlar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.keyConcepts && summary.keyConcepts.map((concept, index) => (
                <div key={index} className="p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/5 transition">
                  <span className="font-bold text-slate-800 text-sm block mb-1">{concept.term}</span>
                  <p className="text-xs text-slate-600 leading-relaxed">{concept.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {activeSubTab === 'timeline' && showTimelineTab && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-800">Sıralı Kronoloji ve Süreç Aşamaları</h3>
            
            <div className="relative pl-6 border-l-2 border-slate-150 space-y-6 ml-2">
              {summary.timeline.map((event, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-indigo-600 border-4 border-white rounded-full"></div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-1.5">
                    {event.date}
                  </span>
                  <p className="text-sm font-semibold text-slate-800">{event.event}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Study Guide */}
        {activeSubTab === 'guide' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-800">Alt Konu Başlıklarına Göre Çalışma Notları</h3>
            
            <div className="space-y-6">
              {summary.studyGuide && summary.studyGuide.map((section, index) => (
                <div key={index} className="pb-6 last:pb-0 border-b last:border-0 border-slate-100">
                  <h4 className="font-bold text-indigo-900 text-sm mb-2">{section.sectionTitle}</h4>
                  <div className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

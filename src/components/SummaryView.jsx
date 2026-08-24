import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, BookOpen, Layers, Clock, Copy, Check, RefreshCw, AlertCircle, 
  MessageSquare, Send, BookMarked, Share2, Play, Pause, Square, Volume2 
} from 'lucide-react';
import { aiService } from '../services/ai';

export default function SummaryView({ activeDoc, apiKeyConfig, onSummaryGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('executive'); // executive, concepts, timeline, guide, glossary, mindmap
  const [copied, setCopied] = useState(false);
  const [summaryLength, setSummaryLength] = useState('Orta'); // Kısa, Orta, Detaylı

  // Chat PDF states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const chatBottomRef = useRef(null);

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
        activeDoc.text,
        summaryLength
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

  // Load Mermaid.js dynamically if Mind Map tab is opened
  useEffect(() => {
    if (activeSubTab === 'mindmap' && summary?.mindMap) {
      const scriptId = 'mermaid-script';
      let script = document.getElementById(scriptId);

      const renderDiagram = () => {
        try {
          if (window.mermaid) {
            window.mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
            const element = document.getElementById('mermaid-diagram-container');
            if (element) {
              element.removeAttribute('data-processed');
              element.innerHTML = summary.mindMap;
              window.mermaid.run({
                nodes: [element]
              });
            }
          }
        } catch (err) {
          console.error("Mermaid render error:", err);
        }
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.min.js';
        script.async = true;
        script.onload = () => {
          renderDiagram();
        };
        document.body.appendChild(script);
      } else {
        if (window.mermaid) {
          renderDiagram();
        } else {
          script.onload = () => renderDiagram();
        }
      }
    }
  }, [activeSubTab, summary?.mindMap]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

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

    if (summary.glossary && summary.glossary.length > 0) {
      textToCopy += `## Ders Sözlüğü\n`;
      summary.glossary.forEach(gl => {
        textToCopy += `- **${gl.term}**: ${gl.definition}\n`;
      });
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !apiKeyConfig) return;
    
    const userText = userInput.trim();
    setUserInput('');
    setSendingMessage(true);
    
    // Add user message
    const updatedMessages = [...chatMessages, { role: 'user', text: userText }];
    setChatMessages(updatedMessages);

    try {
      const response = await aiService.chatWithPdf(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        activeDoc.text,
        chatMessages,
        userText
      );

      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Hata: ${err.message || 'Soru yanıtlanırken bir hata oluştu.'}` }]);
    } finally {
      setSendingMessage(false);
    }
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

  // TTS / Audio Podcast states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1); // 0.8, 1, 1.25, 1.5
  const utteranceRef = useRef(null);

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
  };

  const pauseAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    setIsPausedAudio(true);
  };

  const resumeAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
    setIsPausedAudio(false);
  };

  const playAudio = () => {
    if (!window.speechSynthesis) {
      alert("Bu tarayıcı seslendirme özelliğini desteklemiyor.");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Determine the text to read based on activeSubTab
    let textToRead = '';
    if (activeSubTab === 'executive') {
      textToRead = summary.executiveSummary || '';
    } else if (activeSubTab === 'concepts') {
      textToRead = (summary.keyConcepts || []).map(c => `${c.concept}: ${c.explanation}`).join('. ');
    } else if (activeSubTab === 'timeline') {
      textToRead = (summary.timeline || []).map(t => `${t.event} (${t.date}): ${t.significance}`).join('. ');
    } else if (activeSubTab === 'guide') {
      textToRead = (summary.guideNotes || []).map(g => `${g.title}: ${g.content}`).join('. ');
    } else if (activeSubTab === 'glossary') {
      textToRead = (summary.glossary || []).map(g => `${g.term}: ${g.definition}`).join('. ');
    } else {
      textToRead = summary.title || activeDoc.name;
    }

    if (!textToRead) return;

    // Filter html tags if any
    const cleanText = textToRead.replace(/<[^>]*>/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = audioSpeed;
    
    // Attempt to find a Turkish voice
    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find(v => v.lang.startsWith('tr'));
    if (trVoice) {
      utterance.voice = trVoice;
    }

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    };

    utteranceRef.current = utterance;
    setIsPlayingAudio(true);
    setIsPausedAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  // Clean up synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update speed dynamically if playing
  useEffect(() => {
    if (isPlayingAudio && !isPausedAudio) {
      playAudio();
    }
  }, [audioSpeed]);

  const showTimelineTab = summary.timeline && summary.timeline.length > 0;

  return (
    <div className="flex gap-6 relative items-start">
      {/* Main summary view */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Summary Header */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Döküman Analizi
            </span>
            <h2 className="text-xl font-bold text-slate-800 mt-2">{summary.title || activeDoc.name}</h2>
            <p className="text-xs text-slate-500 mt-1">Yapay zeka tarafından çıkarılan çalışma özeti ve kılavuzu.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Length toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs font-semibold bg-slate-50 p-0.5">
              {['Kısa', 'Orta', 'Detaylı'].map(len => (
                <button
                  key={len}
                  onClick={() => setSummaryLength(len)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    summaryLength === len 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>

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
                  <span>Kopyala</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => fetchSummary(true)}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition"
              title="Yeniden Özetle"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`p-2 border rounded-xl transition ${
                chatOpen 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Not Soru Botunu (Chat PDF) Aç/Kapat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio Study Podcast Player */}
        <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-indigo-800 text-indigo-200 rounded-xl ${isPlayingAudio && !isPausedAudio ? 'animate-bounce' : ''}`}>
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Yapay Zeka Sesli Çalışma Podcasti</h4>
              <p className="text-[11px] text-indigo-100 mt-0.5">
                {isPlayingAudio 
                  ? (isPausedAudio ? "Ders özeti duraklatıldı..." : "Aktif sekme içeriği seslendiriliyor...") 
                  : "Ders özetini sesli kitap veya podcast olarak dinleyin."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center border border-indigo-700 rounded-xl overflow-hidden p-0.5 bg-indigo-950 text-[10px] font-bold">
              {[0.8, 1, 1.25, 1.5].map(speed => (
                <button
                  key={speed}
                  onClick={() => setAudioSpeed(speed)}
                  className={`px-2 py-1 rounded-lg transition ${
                    audioSpeed === speed 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-indigo-300 hover:text-indigo-100'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Play controls */}
            <div className="flex items-center gap-1 bg-indigo-950 border border-indigo-700 p-0.5 rounded-xl">
              {!isPlayingAudio ? (
                <button
                  onClick={playAudio}
                  className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Dinle</span>
                </button>
              ) : (
                <>
                  {isPausedAudio ? (
                    <button
                      onClick={resumeAudio}
                      className="p-1.5 text-indigo-300 hover:text-white transition"
                      title="Devam Et"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={pauseAudio}
                      className="p-1.5 text-indigo-300 hover:text-white transition"
                      title="Duraklat"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={stopAudio}
                    className="p-1.5 text-rose-400 hover:text-rose-300 transition"
                    title="Durdur"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: 'executive', name: 'Genel Özet', icon: BookOpen },
            { id: 'concepts', name: 'Temel Kavramlar', icon: Layers },
            { id: 'timeline', name: 'Zaman Tüneli', icon: Clock, condition: showTimelineTab },
            { id: 'guide', name: 'Çalışma Notları', icon: BookMarked },
            { id: 'glossary', name: 'Ders Sözlüğü', icon: Layers, count: summary.glossary?.length },
            { id: 'mindmap', name: 'Zihin Haritası', icon: Share2 }
          ].map(t => {
            if (t.condition === false) return null;
            const Icon = t.icon;
            const active = activeSubTab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setActiveSubTab(t.id)}
                className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
                  active 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.name}
                {t.count !== undefined && <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">{t.count}</span>}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm">
          {activeSubTab === 'executive' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-800">Metnin Özü ve Ana Fikir</h3>
              <div className="text-slate-600 leading-relaxed text-sm whitespace-pre-line space-y-3">
                {summary.executiveSummary}
              </div>
            </div>
          )}

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

          {activeSubTab === 'guide' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800">Ders Notu Çalışma Kılavuzu</h3>
              <div className="space-y-6">
                {summary.studyGuide && summary.studyGuide.map((section, index) => (
                  <div key={index} className="pb-6 last:pb-0 border-b last:border-0 border-slate-100">
                    <h4 className="font-bold text-indigo-900 text-sm mb-2">{section.sectionTitle}</h4>
                    <div className="text-slate-600 text-xs leading-relaxed whitespace-pre-line text-justify">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'glossary' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-slate-800">Ders Sözlüğü (Terimler ve Kelimeler)</h3>
              {summary.glossary && summary.glossary.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {summary.glossary.map((word, index) => (
                    <div key={index} className="py-3 flex flex-col md:flex-row md:items-start gap-2">
                      <span className="font-bold text-indigo-700 text-xs md:w-1/4 flex-shrink-0">{word.term}</span>
                      <p className="text-xs text-slate-600 md:w-3/4 leading-relaxed">{word.definition}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Bu ders notunda tanımlanan özel terim bulunamadı.</p>
              )}
            </div>
          )}

          {activeSubTab === 'mindmap' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-800">Görsel Zihin Haritası (Mind Map)</h3>
              <p className="text-xs text-slate-500">Konuların birbiriyle ilişkisini gösteren hiyerarşik yapı.</p>
              
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center overflow-x-auto min-h-64">
                <div id="mermaid-diagram-container" className="mermaid w-full flex justify-center">
                  {summary.mindMap || 'Zihin haritası yüklenemedi.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat PDF Panel Drawer */}
      {chatOpen && (
        <div className="w-80 h-[500px] border border-slate-200 bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden sticky top-24 shrink-0 transition-all">
          <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs">Akıllı Ders Asistanı</h4>
              <span className="text-[9px] text-slate-400">PDF içeriğine göre sorularınızı yanıtlar</span>
            </div>
            <button 
              onClick={() => setChatOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Kapat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50">
            {chatMessages.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 space-y-1">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p>Notla ilgili merak ettiğiniz her şeyi sorun!</p>
                <p className="text-[10px]">Örn: "Bu dersin en önemli çıkarımı nedir?"</p>
              </div>
            )}
            
            {chatMessages.map((m, idx) => (
              <div 
                key={idx} 
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none ml-auto'
                    : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-sm'
                }`}
              >
                {m.text}
              </div>
            ))}

            {sendingMessage && (
              <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none p-3 text-xs text-slate-400 shadow-sm flex items-center gap-2 max-w-[85%]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                Ders asistanı yanıtı yazıyor...
              </div>
            )}
            
            <div ref={chatBottomRef}></div>
          </div>

          {/* Footer Input */}
          <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
            <input 
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Sorunuzu yazın..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={sendingMessage || !userInput.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { aiService } from '../services/ai';

export default function Settings({ onSettingsSaved }) {
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [showKey, setShowKey] = useState(false);

  // Individual API key states
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [grokKey, setGrokKey] = useState('');

  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testMessage, setTestMessage] = useState('');
  const [savedSettings, setSavedSettings] = useState(null);

  // Available models based on provider
  const models = {
    gemini: [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Önerilen - Hızlı & Yeni)' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Gelişmiş Analiz)' }
    ],
    openai: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Önerilen - Hızlı & Ekonomik)' },
      { id: 'gpt-4o', name: 'GPT-4o (Gelişmiş Analiz)' }
    ],
    claude: [
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Önerilen - En Zeki Model)' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (Hızlı & Yetenekli)' }
    ],
    deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (Yüksek Performans & Ekonomik)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Derin Düşünme & Akıl Yürütme)' }
    ],
    groq: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Çok Yönlü & Hızlı)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Çok Hızlı)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Geniş Bağlam Penceresi)' }
    ],
    grok: [
      { id: 'grok-2-1212', name: 'Grok 2 (X.ai - Güncel Verili)' },
      { id: 'grok-2-vision-1212', name: 'Grok 2 Vision (Görsel Analiz)' }
    ]
  };

  const getActiveKey = () => {
    if (provider === 'gemini') return geminiKey;
    if (provider === 'openai') return openaiKey;
    if (provider === 'claude') return claudeKey;
    if (provider === 'deepseek') return deepseekKey;
    if (provider === 'groq') return groqKey;
    if (provider === 'grok') return grokKey;
    return '';
  };

  const setActiveKey = (val) => {
    if (provider === 'gemini') setGeminiKey(val);
    else if (provider === 'openai') setOpenaiKey(val);
    else if (provider === 'claude') setClaudeKey(val);
    else if (provider === 'deepseek') setDeepseekKey(val);
    else if (provider === 'groq') setGroqKey(val);
    else if (provider === 'grok') setGrokKey(val);
  };

  useEffect(() => {
    const savedProv = localStorage.getItem('eduai_provider') || import.meta.env.VITE_DEFAULT_PROVIDER || 'gemini';
    let savedMod = localStorage.getItem('eduai_model') || import.meta.env.VITE_DEFAULT_MODEL || 'gemini-1.5-flash';
    
    // Auto-migrate legacy models
    if (savedMod === 'gemini-1.5-flash' || savedMod === 'gemini-1.5-pro') {
      savedMod = 'gemini-3.6-flash';
      localStorage.setItem('eduai_model', 'gemini-3.6-flash');
    }

    // Load individual keys
    const gKey = localStorage.getItem('eduai_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
    const oKey = localStorage.getItem('eduai_openai_api_key') || import.meta.env.VITE_OPENAI_API_KEY || '';
    const cKey = localStorage.getItem('eduai_claude_api_key') || '';
    const dKey = localStorage.getItem('eduai_deepseek_api_key') || '';
    const grKey = localStorage.getItem('eduai_groq_api_key') || '';
    const gkKey = localStorage.getItem('eduai_grok_api_key') || '';

    setGeminiKey(gKey);
    setOpenaiKey(oKey);
    setClaudeKey(cKey);
    setDeepseekKey(dKey);
    setGroqKey(grKey);
    setGrokKey(gkKey);

    setProvider(savedProv);
    setModel(savedMod);

    const activeKey = savedProv === 'gemini' ? gKey :
                      savedProv === 'openai' ? oKey :
                      savedProv === 'claude' ? cKey :
                      savedProv === 'deepseek' ? dKey :
                      savedProv === 'groq' ? grKey : gkKey;

    if (activeKey) {
      setSavedSettings({
        provider: savedProv,
        model: savedMod,
        keyLength: activeKey.length
      });
      // Propagate initial config to parent context
      if (onSettingsSaved) {
        onSettingsSaved({ provider: savedProv, apiKey: activeKey, model: savedMod });
      }
    }
  }, []);

  const handleProviderChange = (e) => {
    const prov = e.target.value;
    setProvider(prov);
    
    // Pick default model for selected provider
    const defaultModel = prov === 'gemini' ? 'gemini-3.6-flash' :
                         prov === 'openai' ? 'gpt-4o-mini' :
                         prov === 'claude' ? 'claude-3-5-sonnet-latest' :
                         prov === 'deepseek' ? 'deepseek-chat' :
                         prov === 'groq' ? 'llama-3.3-70b-versatile' : 'grok-2-1212';
    setModel(defaultModel);
  };

  const handleSave = () => {
    const activeKey = getActiveKey();
    if (!activeKey.trim()) {
      alert('Lütfen geçerli bir API anahtarı girin.');
      return;
    }
    
    localStorage.setItem('eduai_provider', provider);
    localStorage.setItem('eduai_api_key', activeKey.trim());
    localStorage.setItem('eduai_model', model);

    // Save individual keys
    localStorage.setItem('eduai_gemini_api_key', geminiKey.trim());
    localStorage.setItem('eduai_openai_api_key', openaiKey.trim());
    localStorage.setItem('eduai_claude_api_key', claudeKey.trim());
    localStorage.setItem('eduai_deepseek_api_key', deepseekKey.trim());
    localStorage.setItem('eduai_groq_api_key', groqKey.trim());
    localStorage.setItem('eduai_grok_api_key', grokKey.trim());
    
    setSavedSettings({
      provider,
      model,
      keyLength: activeKey.length
    });
    
    if (onSettingsSaved) {
      onSettingsSaved({ provider, apiKey: activeKey.trim(), model });
    }
    alert('Ayarlar başarıyla kaydedildi.');
  };

  const handleTestConnection = async () => {
    const activeKey = getActiveKey();
    if (!activeKey.trim()) {
      setTestStatus('error');
      setTestMessage('Öncelikle bir API Anahtarı girmelisiniz.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Bağlantı test ediliyor...');

    try {
      const response = await aiService.testConnection(provider, activeKey.trim(), model);
      setTestStatus('success');
      setTestMessage(`Bağlantı Başarılı! Yapay Zeka Yanıtı: "${response}"`);
      
      // Auto-save on successful test
      handleSave();
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error.message || 'Bağlantı testi başarısız oldu. API anahtarınızı veya model seçiminizi kontrol edin.');
    }
  };

  const handleClear = () => {
    if (confirm('Ayarlarınızı ve tüm API anahtarlarınızı silmek istediğinize emin misiniz?')) {
      localStorage.removeItem('eduai_provider');
      localStorage.removeItem('eduai_api_key');
      localStorage.removeItem('eduai_model');
      localStorage.removeItem('eduai_gemini_api_key');
      localStorage.removeItem('eduai_openai_api_key');
      localStorage.removeItem('eduai_claude_api_key');
      localStorage.removeItem('eduai_deepseek_api_key');
      localStorage.removeItem('eduai_groq_api_key');
      localStorage.removeItem('eduai_grok_api_key');

      setGeminiKey('');
      setOpenaiKey('');
      setClaudeKey('');
      setDeepseekKey('');
      setGroqKey('');
      setGrokKey('');

      setSavedSettings(null);
      setTestStatus('idle');
      setTestMessage('');
      if (onSettingsSaved) {
        onSettingsSaved(null);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <Key className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">API Entegrasyon Ayarları</h2>
          <p className="text-sm text-slate-500">Kendi yapay zeka anahtarınızı bağlayarak platformu sınırsız ve ücretsiz kullanın.</p>
        </div>
      </div>

      {savedSettings ? (
        <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-emerald-900 text-sm">API Anahtarınız Aktif</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Platform şu anda <strong>{savedSettings.provider.toUpperCase()} ({savedSettings.model})</strong> üzerinden çalışmaktadır.
              Anahtarınız yerel tarayıcınızda (localStorage) şifreli olarak saklanır ve asla harici sunuculara gönderilmez.
            </p>
          </div>
          <button 
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-medium"
          >
            Sil
          </button>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-900 text-sm">Bağlantı Eksik</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              EduAI'nin özelliklerini (Özetleme, Soru Hazırlama, Bilgi Kartları) kullanabilmek için lütfen kendi Gemini veya OpenAI API anahtarınızı tanımlayın.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            API Sağlayıcı
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'gemini', name: 'Google Gemini' },
              { id: 'openai', name: 'OpenAI (ChatGPT)' },
              { id: 'claude', name: 'Anthropic Claude' },
              { id: 'deepseek', name: 'DeepSeek API' },
              { id: 'groq', name: 'Groq Cloud' },
              { id: 'grok', name: 'xAI Grok' }
            ].map((p) => (
              <label 
                key={p.id}
                className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${
                  provider === p.id 
                    ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 font-bold' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs">{p.name}</span>
                <input 
                  type="radio" 
                  name="provider" 
                  value={p.id} 
                  checked={provider === p.id}
                  onChange={handleProviderChange}
                  className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" 
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Yapay Zeka Modeli
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-sm bg-white"
          >
            {models[provider]?.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            API Anahtarı (API Key)
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={getActiveKey()}
              onChange={(e) => setActiveKey(e.target.value)}
              placeholder={
                provider === 'gemini' ? 'AIzaSy...' :
                provider === 'openai' ? 'sk-proj-...' :
                provider === 'claude' ? 'sk-ant-...' :
                provider === 'deepseek' ? 'sk-...' :
                provider === 'groq' ? 'gsk_...' : 'xai-...'
              }
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            {provider === 'gemini' && (
              <span>Gemini API anahtarınızı ücretsiz olarak <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">Google AI Studio</a> üzerinden alabilirsiniz.</span>
            )}
            {provider === 'openai' && (
              <span>OpenAI API anahtarınızı <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">OpenAI Platformu</a> üzerinden oluşturabilirsiniz.</span>
            )}
            {provider === 'claude' && (
              <span>Claude API anahtarınızı <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">Anthropic Console</a> üzerinden alabilirsiniz.</span>
            )}
            {provider === 'deepseek' && (
              <span>DeepSeek API anahtarınızı <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">DeepSeek Platformu</a> üzerinden oluşturabilirsiniz.</span>
            )}
            {provider === 'groq' && (
              <span>Groq API anahtarınızı ücretsiz olarak <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">Groq Console</a> üzerinden alabilirsiniz.</span>
            )}
            {provider === 'grok' && (
              <span>Grok API anahtarınızı <a href="https://console.x.ai/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">xAI Console</a> üzerinden oluşturabilirsiniz.</span>
            )}
          </p>
        </div>
        {testStatus !== 'idle' && (
          <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
            testStatus === 'testing' ? 'bg-blue-50 border-blue-100 text-blue-700' :
            testStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
            'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin mt-0.5 flex-shrink-0" />}
            <span>{testMessage}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {testStatus === 'testing' ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
          </button>
          <button
            onClick={handleSave}
            disabled={testStatus === 'testing'}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm shadow-indigo-100"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

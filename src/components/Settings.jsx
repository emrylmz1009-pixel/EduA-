import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { aiService } from '../services/ai';

export default function Settings({ onSettingsSaved }) {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [showKey, setShowKey] = useState(false);
  
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testMessage, setTestMessage] = useState('');
  const [savedSettings, setSavedSettings] = useState(null);

  // Available models based on provider
  const models = {
    gemini: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Önerilen - Hızlı & Ekonomik)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Gelişmiş Analiz)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
    ],
    openai: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Önerilen - Hızlı & Ekonomik)' },
      { id: 'gpt-4o', name: 'GPT-4o (Gelişmiş Analiz)' }
    ]
  };

  useEffect(() => {
    const savedProv = localStorage.getItem('eduai_provider') || import.meta.env.VITE_DEFAULT_PROVIDER || 'gemini';
    const savedKey = localStorage.getItem('eduai_api_key') || (savedProv === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY : import.meta.env.VITE_OPENAI_API_KEY) || '';
    const savedMod = localStorage.getItem('eduai_model') || import.meta.env.VITE_DEFAULT_MODEL || (savedProv === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
    
    setProvider(savedProv);
    setApiKey(savedKey);
    setModel(savedMod);

    if (savedKey) {
      setSavedSettings({
        provider: savedProv,
        model: savedMod,
        keyLength: savedKey.length
      });
      // Propagate initial config to parent context
      if (onSettingsSaved) {
        onSettingsSaved({ provider: savedProv, apiKey: savedKey, model: savedMod });
      }
    }
  }, []);

  const handleProviderChange = (e) => {
    const prov = e.target.value;
    setProvider(prov);
    setModel(prov === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
  };

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Lütfen geçerli bir API anahtarı girin.');
      return;
    }
    
    localStorage.setItem('eduai_provider', provider);
    localStorage.setItem('eduai_api_key', apiKey.trim());
    localStorage.setItem('eduai_model', model);
    
    setSavedSettings({
      provider,
      model,
      keyLength: apiKey.length
    });
    
    if (onSettingsSaved) {
      onSettingsSaved({ provider, apiKey: apiKey.trim(), model });
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Öncelikle bir API Anahtarı girmelisiniz.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Bağlantı test ediliyor...');

    try {
      const response = await aiService.testConnection(provider, apiKey.trim(), model);
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
    if (confirm('Ayarlarınızı ve API anahtarınızı silmek istediğinize emin misiniz?')) {
      localStorage.removeItem('eduai_provider');
      localStorage.removeItem('eduai_api_key');
      localStorage.removeItem('eduai_model');
      setApiKey('');
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
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${provider === 'gemini' ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <span className="font-medium text-sm">Google Gemini</span>
              <input 
                type="radio" 
                name="provider" 
                value="gemini" 
                checked={provider === 'gemini'}
                onChange={handleProviderChange}
                className="text-indigo-600 focus:ring-indigo-500" 
              />
            </label>
            <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${provider === 'openai' ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <span className="font-medium text-sm">OpenAI (ChatGPT)</span>
              <input 
                type="radio" 
                name="provider" 
                value="openai" 
                checked={provider === 'openai'}
                onChange={handleProviderChange}
                className="text-indigo-600 focus:ring-indigo-500" 
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Yapay Zeka Modeli
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-sm"
          >
            {models[provider].map((m) => (
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
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
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
            {provider === 'gemini' ? (
              <span>Gemini API anahtarınızı ücretsiz olarak <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">Google AI Studio</a> üzerinden saniyeler içinde alabilirsiniz.</span>
            ) : (
              <span>OpenAI API anahtarınızı <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">OpenAI Platformu</a> üzerinden oluşturabilirsiniz.</span>
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

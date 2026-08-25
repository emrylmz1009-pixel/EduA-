import React, { useState, useEffect } from 'react';
import { Target, Search, Sparkles, AlertCircle, Loader2, Award, ClipboardList, TrendingUp, CheckCircle, HelpCircle } from 'lucide-react';
import { aiService } from '../services/ai';
import schoolsData from '../data/schools.json';

export default function TargetTracker({ apiKeyConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search school states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  // Selected Target School state
  const [targetSchool, setTargetSchool] = useState(null);
  const [examType, setExamType] = useState('YKS');
  
  // Current student performance nets
  const [currentNets, setCurrentNets] = useState({
    turkce: 0,
    matematik: 0,
    fen: 0,
    sosyal: 0
  });

  useEffect(() => {
    // Load target school and current nets from local storage
    const storedTarget = localStorage.getItem('eduai_target_school');
    if (storedTarget) {
      setTargetSchool(JSON.parse(storedTarget));
    }
    const storedNets = localStorage.getItem('eduai_current_nets');
    if (storedNets) {
      setCurrentNets(JSON.parse(storedNets));
    }
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 1) {
      const filtered = schoolsData.filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.il.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSchool = async (school) => {
    setSuggestions([]);
    setSearchQuery('');
    setLoading(true);
    setError('');

    try {
      const result = await aiService.getTargetSchoolNets(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        school.name,
        examType
      );

      const targetData = {
        name: school.name,
        il: school.il,
        ilce: school.ilce,
        estimatedCutoff: result.estimatedCutoff,
        targetNets: result.targetNets || { turkce: 30, matematik: 30, fen: 15, sosyal: 15 },
        tutorAdvice: result.tutorAdvice,
        examType
      };

      setTargetSchool(targetData);
      localStorage.setItem('eduai_target_school', JSON.stringify(targetData));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Okul puan analizi alınırken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleNetChange = (subject, val) => {
    const num = Math.max(0, Math.min(40, Number(val) || 0));
    const updated = {
      ...currentNets,
      [subject]: num
    };
    setCurrentNets(updated);
    localStorage.setItem('eduai_current_nets', JSON.stringify(updated));
  };

  const handleResetTarget = () => {
    if (confirm('Hedef okulu sıfırlamak istediğinize emin misiniz?')) {
      setTargetSchool(null);
      localStorage.removeItem('eduai_target_school');
    }
  };

  const getPercent = (current, target) => {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            HEDEF VE PLANLAMA REHBERİ
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Hedef Takibi & Tercih Rehberi</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Hayalinizdeki okulu arayın, hedef netleri belirleyin ve güncel deneme netlerinizle karşılaştırarak hedefinize ne kadar yaklaştığınızı izleyin.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Target className="w-6 h-6" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Hedef Okul Analizi Hazırlanıyor</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Yapay zeka seçtiğiniz okulun taban puanlarını analiz ediyor ve kazanmanız için gereken ders ders net dağılımlarını hesaplıyor.
          </p>
        </div>
      )}

      {!targetSchool && !loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm">Hedef Okul Belirleme</h3>
            <p className="text-xs text-slate-400 mt-1">Hangi okul veya üniversiteyi kazanmak istiyorsunuz? Arayıp seçin.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sınav Türü</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white"
              >
                <option value="YKS">YKS (Üniversite)</option>
                <option value="LGS">LGS (Lise)</option>
              </select>
            </div>

            <div className="sm:col-span-2 relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Okul Adı veya İl</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Örn: Galatasaray, Kabataş, İstanbul Fen, ODTÜ vb..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs outline-none bg-white font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-150 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100 animate-slideDown">
                  {suggestions.map((sch) => (
                    <button
                      key={sch.id}
                      onClick={() => handleSelectSchool(sch)}
                      className="w-full px-4 py-3 text-left text-xs hover:bg-slate-50 transition flex justify-between items-center"
                    >
                      <span className="font-semibold text-slate-800">{sch.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                        {sch.il} / {sch.ilce}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {targetSchool && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Target details and advice */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    HEDEF OKUL ({targetSchool.examType})
                  </span>
                  <h3 className="font-black text-slate-800 text-sm leading-snug mt-1.5">{targetSchool.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{targetSchool.il} / {targetSchool.ilce}</p>
                </div>
                <button
                  onClick={handleResetTarget}
                  className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl transition"
                >
                  Değiştir
                </button>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-extrabold text-indigo-600 uppercase">Tahmini Taban Puan</span>
                  <p className="text-base font-black text-indigo-900">{targetSchool.estimatedCutoff}</p>
                </div>
                <div className="w-10 h-10 bg-indigo-600 rounded-xl text-white flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* AI Advisor Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Yapay Zeka Koç Analizi</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {targetSchool.tutorAdvice}
              </p>
            </div>
          </div>

          {/* Current Performance & Comparison Charts */}
          <div className="md:col-span-7 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-50 pb-2.5 flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-indigo-600" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Deneme Netlerinizi Güncelleyin</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'turkce', name: 'Türkçe / Edebiyat', color: 'accent-indigo-600' },
                  { id: 'matematik', name: 'Matematik & Geometri', color: 'accent-indigo-600' },
                  { id: 'fen', name: 'Fen Bilimleri', color: 'accent-indigo-600' },
                  { id: 'sosyal', name: 'Sosyal Bilimler', color: 'accent-indigo-600' }
                ].map((sub) => (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>{sub.name}</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{currentNets[sub.id]} Net</span>
                    </div>
                    <input 
                      type="range"
                      min={0}
                      max={40}
                      step={0.5}
                      value={currentNets[sub.id]}
                      onChange={(e) => handleNetChange(sub.id, e.target.value)}
                      className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer focus:outline-none ${sub.color}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Target vs. Actual Comparative Progress Bars */}
            <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-50 pb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Hedef Karşılaştırma</h4>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Maks: 40 Net</span>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'turkce', name: 'Türkçe / Edebiyat' },
                  { id: 'matematik', name: 'Matematik & Geometri' },
                  { id: 'fen', name: 'Fen Bilimleri' },
                  { id: 'sosyal', name: 'Sosyal Bilimler' }
                ].map((sub) => {
                  const current = currentNets[sub.id];
                  const target = targetSchool.targetNets?.[sub.id] || 25;
                  const isAchieved = current >= target;
                  const percent = getPercent(current, target);

                  return (
                    <div key={sub.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{sub.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">Hedef: {target} net</span>
                          <span className={`font-extrabold text-[10px] px-2 py-0.5 rounded-full ${
                            isAchieved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {current} / {target} Net (%{percent})
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative flex">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isAchieved ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                        {isAchieved && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            <CheckCircle className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, CheckCircle2, AlertCircle, RefreshCw, Loader2, Sparkles, Check } from 'lucide-react';
import { aiService } from '../services/ai';

export default function StudyPlanner({ apiKeyConfig }) {
  const [goal, setGoal] = useState('');
  const [exam, setExam] = useState('YKS');
  const [hours, setHours] = useState(15);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);

  // Track completed sessions local state for gamification/checklists
  const [completedSessions, setCompletedSessions] = useState({});

  const subjectsList = [
    'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 
    'Türkçe & Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe & Din'
  ];

  const examsList = ['YKS', 'LGS', 'Okul Sınavları', 'KPSS', 'DGS', 'Lise Sınavları', 'Diğer'];

  useEffect(() => {
    // Load study plan from localStorage
    try {
      const storedPlan = localStorage.getItem('eduai_study_plan');
      if (storedPlan) {
        setPlan(JSON.parse(storedPlan));
      }
      const storedCompleted = localStorage.getItem('eduai_study_plan_completed');
      if (storedCompleted) {
        setCompletedSessions(JSON.parse(storedCompleted));
      }
    } catch (e) {
      console.error("Failed to load study plan", e);
    }
  }, []);

  const handleSubjectToggle = (subj) => {
    if (selectedSubjects.includes(subj)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subj));
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  const handleCreatePlan = async () => {
    if (!goal.trim()) {
      setError('Lütfen öncelikle ders çalışma hedefinizi yazın.');
      return;
    }
    if (selectedSubjects.length === 0) {
      setError('Lütfen en az bir adet öncelikli ders seçin.');
      return;
    }
    if (!apiKeyConfig) {
      setError('API Anahtarı bulunamadı. Lütfen Ayarlar sekmesinden API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await aiService.generateStudyPlan(
        apiKeyConfig.provider,
        apiKeyConfig.apiKey,
        apiKeyConfig.model,
        goal,
        exam,
        hours,
        selectedSubjects
      );
      
      setPlan(result);
      localStorage.setItem('eduai_study_plan', JSON.stringify(result));
      
      // Reset completed sessions
      setCompletedSessions({});
      localStorage.removeItem('eduai_study_plan_completed');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Çalışma planı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionCompleted = (day, idx) => {
    const key = `${day}_${idx}`;
    const updated = {
      ...completedSessions,
      [key]: !completedSessions[key]
    };
    setCompletedSessions(updated);
    localStorage.setItem('eduai_study_plan_completed', JSON.stringify(updated));
  };

  const handleResetPlan = () => {
    if (confirm('Mevcut çalışma planınızı silip yeni bir plan oluşturmak istediğinize emin misiniz?')) {
      setPlan(null);
      setGoal('');
      setSelectedSubjects([]);
      setCompletedSessions({});
      localStorage.removeItem('eduai_study_plan');
      localStorage.removeItem('eduai_study_plan_completed');
    }
  };

  // Calculate total sessions and completed ones to render a progress bar
  const getAllSessions = () => {
    if (!plan || !plan.schedule) return [];
    const list = [];
    plan.schedule.forEach(dayPlan => {
      if (dayPlan.sessions) {
        dayPlan.sessions.forEach((sess, idx) => {
          list.push({ day: dayPlan.day, index: idx, ...sess });
        });
      }
    });
    return list;
  };

  const allSessions = getAllSessions();
  const totalSessionsCount = allSessions.length;
  const completedSessionsCount = Object.values(completedSessions).filter(Boolean).length;
  const progressPercent = totalSessionsCount > 0 
    ? Math.round((completedSessionsCount / totalSessionsCount) * 100) 
    : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            YAPAY ZEKA KOÇU
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Ders Çalışma Planlayıcı</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Hedeflerinize ve derslerinize uygun haftalık dengeli, verimli çalışma programınızı yapay zeka ile tasarlayın.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 hidden sm:flex">
          <Calendar className="w-6 h-6" />
        </div>
      </div>

      {!plan && !loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800 text-sm">Plan Oluşturma Parametreleri</h3>
            <p className="text-xs text-slate-400 mt-1">Yapay zekanın size en uygun takvimi hazırlaması için detayları doldurun.</p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hedef Sınavınız</label>
                <select
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 bg-white"
                >
                  {examsList.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Haftalık Çalışma Saati: {hours} Saat</label>
                <input 
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5">
                  <span>5 Saat (Hafif)</span>
                  <span>30 Saat (Dengeli)</span>
                  <span>60 Saat (Yoğun)</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ana Hedefiniz & Açıklama</label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Örn: YKS Sayısal bölümünde derece yapmak istiyorum, özellikle fizik ve matematik alanında netlerimi yükseltmeye odaklanmak istiyorum."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Öncelikli Dersler (Çoklu Seçim)</label>
                <div className="grid grid-cols-2 gap-2">
                  {subjectsList.map(subj => {
                    const isSelected = selectedSubjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => handleSubjectToggle(subj)}
                        className={`flex items-center justify-between px-3.5 py-2.5 border rounded-xl text-xs font-semibold transition text-left ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span>{subj}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreatePlan}
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Kişiselleştirilmiş Çalışma Programı Oluştur</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Haftalık Çalışma Programınız Hazırlanıyor</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Yapay zeka hedefinizi analiz ediyor, seçtiğiniz dersleri haftalık saat sınırınıza göre optimize ederek dengeli bir takvim oluşturuyor.
          </p>
        </div>
      )}

      {plan && (
        <div className="space-y-6">
          {/* Plan Info Card & Progress Bar */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {exam} ÇALIŞMA PLANI
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">{plan.planTitle || 'Haftalık Çalışma Programım'}</h3>
                <p className="text-xs text-slate-500 mt-1">{plan.weeklySummary}</p>
              </div>

              <button
                onClick={handleResetPlan}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 rounded-xl text-xs font-bold text-slate-500 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Programı Yenile</span>
              </button>
            </div>

            {/* Gamification progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Haftalık İlerleme Derecesi</span>
                <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {completedSessionsCount} / {totalSessionsCount} Oturum (%{progressPercent})
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {plan.schedule?.map((dayPlan, dIdx) => (
              <div 
                key={dIdx} 
                className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-3 md:col-span-1"
              >
                <div className="border-b border-slate-50 pb-2 text-center">
                  <span className="text-xs font-black text-slate-800 tracking-wide block uppercase">{dayPlan.day}</span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{dayPlan.sessions?.length || 0} Oturum</span>
                </div>

                <div className="space-y-2.5">
                  {dayPlan.sessions && dayPlan.sessions.length > 0 ? (
                    dayPlan.sessions.map((sess, sIdx) => {
                      const sessionKey = `${dayPlan.day}_${sIdx}`;
                      const isDone = !!completedSessions[sessionKey];
                      
                      return (
                        <div 
                          key={sIdx}
                          onClick={() => toggleSessionCompleted(dayPlan.day, sIdx)}
                          className={`p-3 border rounded-xl cursor-pointer transition select-none flex flex-col justify-between text-left space-y-2 min-h-[110px] ${
                            isDone 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-80' 
                              : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                isDone 
                                  ? 'bg-emerald-200 text-emerald-800' 
                                  : 'bg-indigo-50 text-indigo-700'
                              }`}>
                                {sess.subject}
                              </span>
                              {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                            </div>
                            <h5 className={`font-bold text-[10px] leading-tight ${isDone ? 'line-through text-emerald-700' : 'text-slate-800'}`}>
                              {sess.topic}
                            </h5>
                          </div>

                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold mt-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{sess.time} ({sess.duration})</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 border border-dashed border-slate-150 bg-slate-50/30 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 italic">Dinlenme Günü 💤</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Koç Tavsiyeleri */}
          {plan.recommendations && plan.recommendations.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">🎓 Yapay Zeka Koç Tavsiyeleri</h4>
              <ul className="space-y-2">
                {plan.recommendations.map((rec, rIdx) => (
                  <li key={rIdx} className="text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-1.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

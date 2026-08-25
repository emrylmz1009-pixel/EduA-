import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, CheckCircle2, AlertCircle, RefreshCw, Loader2, Sparkles, Check, Book, ListTodo, ChevronRight, CheckSquare, Square, Award, ClipboardList } from 'lucide-react';
import { aiService } from '../services/ai';

export default function StudyPlanner({ apiKeyConfig }) {
  const [goal, setGoal] = useState('');
  const [exam, setExam] = useState('YKS');
  const [hours, setHours] = useState(15);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);

  // Track completed sessions and subtasks
  const [completedSessions, setCompletedSessions] = useState({});
  const [completedTasks, setCompletedTasks] = useState({});
  const [selectedDay, setSelectedDay] = useState('Pazartesi');

  const subjectsList = [
    'Matematik', 'Geometri', 'Fizik', 'Kimya', 'Biyoloji', 
    'Türkçe & Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe & Din'
  ];

  const examsList = ['YKS', 'LGS', 'Okul Sınavları', 'KPSS', 'DGS', 'Lise Sınavları', 'Diğer'];

  useEffect(() => {
    try {
      const storedPlan = localStorage.getItem('eduai_study_plan');
      if (storedPlan) {
        const parsed = JSON.parse(storedPlan);
        setPlan(parsed);
        if (parsed.schedule && parsed.schedule.length > 0) {
          setSelectedDay(parsed.schedule[0].day);
        }
      }
      const storedCompleted = localStorage.getItem('eduai_study_plan_completed');
      if (storedCompleted) {
        setCompletedSessions(JSON.parse(storedCompleted));
      }
      const storedTasksCompleted = localStorage.getItem('eduai_study_plan_tasks_completed');
      if (storedTasksCompleted) {
        setCompletedTasks(JSON.parse(storedTasksCompleted));
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
      
      if (result.schedule && result.schedule.length > 0) {
        setSelectedDay(result.schedule[0].day);
      }
      
      // Reset completed sessions & tasks
      setCompletedSessions({});
      setCompletedTasks({});
      localStorage.removeItem('eduai_study_plan_completed');
      localStorage.removeItem('eduai_study_plan_tasks_completed');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Çalışma planı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionCompleted = (day, idx) => {
    const key = `${day}_${idx}`;
    const isDoneNow = !completedSessions[key];
    const updated = {
      ...completedSessions,
      [key]: isDoneNow
    };
    setCompletedSessions(updated);
    localStorage.setItem('eduai_study_plan_completed', JSON.stringify(updated));

    // Also auto-toggle all subtasks of this session
    const currentDayPlan = plan.schedule.find(d => d.day === day);
    const session = currentDayPlan?.sessions?.[idx];
    if (session) {
      const tasks = session.tasks || ["Konu anlatımını tekrar et", "Kazanım sorularını çöz", "Önemli formülleri not al"];
      const updatedTasks = { ...completedTasks };
      tasks.forEach((_, tIdx) => {
        const taskKey = `${day}_${idx}_${tIdx}`;
        updatedTasks[taskKey] = isDoneNow;
      });
      setCompletedTasks(updatedTasks);
      localStorage.setItem('eduai_study_plan_tasks_completed', JSON.stringify(updatedTasks));
    }
  };

  const toggleTaskCompleted = (day, sessIdx, taskIdx, totalTasks) => {
    const taskKey = `${day}_${sessIdx}_${taskIdx}`;
    const updatedTasks = {
      ...completedTasks,
      [taskKey]: !completedTasks[taskKey]
    };
    setCompletedTasks(updatedTasks);
    localStorage.setItem('eduai_study_plan_tasks_completed', JSON.stringify(updatedTasks));

    // Check if ALL tasks for this session are completed
    let allDone = true;
    for (let i = 0; i < totalTasks; i++) {
      const key = `${day}_${sessIdx}_${i}`;
      if (!updatedTasks[key]) {
        allDone = false;
        break;
      }
    }

    // Auto-update parent session status
    const sessionKey = `${day}_${sessIdx}`;
    const updatedSessions = {
      ...completedSessions,
      [sessionKey]: allDone
    };
    setCompletedSessions(updatedSessions);
    localStorage.setItem('eduai_study_plan_completed', JSON.stringify(updatedSessions));
  };

  const handleResetPlan = () => {
    if (confirm('Mevcut çalışma planınızı silip yeni bir plan oluşturmak istediğinize emin misiniz?')) {
      setPlan(null);
      setGoal('');
      setSelectedSubjects([]);
      setCompletedSessions({});
      setCompletedTasks({});
      localStorage.removeItem('eduai_study_plan');
      localStorage.removeItem('eduai_study_plan_completed');
      localStorage.removeItem('eduai_study_plan_tasks_completed');
    }
  };

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

  // Selected Day Details
  const selectedDayPlan = plan?.schedule?.find(d => d.day === selectedDay);
  const selectedDaySessions = selectedDayPlan?.sessions || [];

  // Calculate day completion status
  const isDayCompleted = (dayName) => {
    const dayData = plan?.schedule?.find(d => d.day === dayName);
    if (!dayData || !dayData.sessions || dayData.sessions.length === 0) return false;
    return dayData.sessions.every((_, idx) => !!completedSessions[`${dayName}_${idx}`]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between">
        <div className="space-y-1 flex-1 pr-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            YAPAY ZEKA KOÇU
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800">Kişiselleştirilmiş Çalışma Planı</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Hedeflerinize göre hazırlanmış haftalık ders takvimi. Güne tıklayarak yapılacakları, üniteleri ve konuları görebilirsiniz.
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
            Yapay zeka hedefinizi analiz ediyor, seçtiğiniz dersleri haftalık saat sınırınıza göre optimize ederek detaylı görevler, üniteler ve konular oluşturuyor.
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

          {/* Interactive Weekly Calendar (Day Selection Cards Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
            {plan.schedule?.map((dayPlan, idx) => {
              const isSelected = selectedDay === dayPlan.day;
              const isDone = isDayCompleted(dayPlan.day);
              const sessionsCount = dayPlan.sessions?.length || 0;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(dayPlan.day)}
                  className={`p-3.5 rounded-2xl border transition text-center flex flex-col justify-between items-center space-y-1.5 outline-none ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/30 text-indigo-900 ring-2 ring-indigo-500/20'
                      : isDone
                        ? 'border-emerald-200 bg-emerald-50/20 text-emerald-800 hover:bg-emerald-50/40'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] font-black tracking-wide uppercase block">{dayPlan.day}</span>
                  
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 animate-scaleIn">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sessionsCount} Ders
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Daily Detail Panel (What to do, Units, Topics & Checklists) */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                  {selectedDay} Günü Çalışma Detayları
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                Günün toplam dersi: {selectedDaySessions.length}
              </span>
            </div>

            <div className="space-y-4">
              {selectedDaySessions && selectedDaySessions.length > 0 ? (
                selectedDaySessions.map((sess, sIdx) => {
                  const sessionKey = `${selectedDay}_${sIdx}`;
                  const isSessDone = !!completedSessions[sessionKey];
                  const sessionTasks = sess.tasks || [
                    "Konu özetini / anlatımını tekrar et",
                    "Konuyla ilgili kavratıcı soru testlerini çöz",
                    "Yapılamayan soruları not al ve öğretmenine sor"
                  ];

                  return (
                    <div 
                      key={sIdx}
                      className={`p-5 border rounded-2xl transition space-y-4 relative ${
                        isSessDone 
                          ? 'bg-emerald-50/30 border-emerald-200' 
                          : 'border-slate-150 hover:border-slate-200 bg-slate-50/20'
                      }`}
                    >
                      {/* Session Top Badges / Time / Completed Switch */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/50 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isSessDone ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-600 text-white shadow-sm'
                          }`}>
                            {sess.subject}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            {sess.time} ({sess.duration})
                          </span>
                        </div>

                        {/* Direct Session Mark Done button */}
                        <button
                          onClick={() => toggleSessionCompleted(selectedDay, sIdx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                            isSessDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{isSessDone ? 'Dersi Tamamladın' : 'Dersi Tamamlandı İşaretle'}</span>
                        </button>
                      </div>

                      {/* Unit & Topic Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* ÜNİTE */}
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg mt-0.5">
                            <Book className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">ÇALIŞILACAK ÜNİTE</span>
                            <p className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
                              {sess.unit || sess.subject}
                            </p>
                          </div>
                        </div>

                        {/* KONU */}
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg mt-0.5">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">ÇALIŞILACAK KONU</span>
                            <p className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
                              {sess.topic}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Daily Task Checklist */}
                      <div className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Günlük Görev Listesi</span>
                        </div>
                        
                        <div className="space-y-2.5">
                          {sessionTasks.map((task, tIdx) => {
                            const taskKey = `${selectedDay}_${sIdx}_${tIdx}`;
                            const isTaskDone = !!completedTasks[taskKey];

                            return (
                              <div
                                key={tIdx}
                                onClick={() => toggleTaskCompleted(selectedDay, sIdx, tIdx, sessionTasks.length)}
                                className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition select-none ${
                                  isTaskDone 
                                    ? 'bg-slate-50/50 text-slate-400' 
                                    : 'hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                {isTaskDone ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                                )}
                                <span className={`text-xs leading-normal ${isTaskDone ? 'line-through' : 'font-medium'}`}>
                                  {task}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-2">
                  <span className="text-2xl">💤</span>
                  <h4 className="font-bold text-slate-700 text-xs">Bugün Dinlenme Günü!</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Ders çalışma programında bugün dinlenme günü olarak planlandı. Eğlenin, dinlenin ve bir sonraki gün için enerji toplayın!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Koç Tavsiyeleri */}
          {plan.recommendations && plan.recommendations.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Yapay Zeka Koç Tavsiyeleri</h4>
              </div>
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

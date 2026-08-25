import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  BrainCircuit, 
  Award, 
  Brain, 
  Settings as SettingsIcon,
  Menu,
  X,
  Clock,
  FolderOpen,
  Minimize2,
  User,
  School,
  Hash,
  Shield,
  Loader2,
  Key,
  Camera,
  Calendar,
  Volume2,
  Mic,
  Target
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import SummaryView from './components/SummaryView';
import FlashcardsView from './components/FlashcardsView';
import QuizView from './components/QuizView';
import WeaknessAnalysis from './components/WeaknessAnalysis';
import Settings from './components/Settings';
import ProductivityPanel from './components/ProductivityPanel';
import ArchiveView from './components/ArchiveView';
import Profile from './components/Profile';
import VisualSolver from './components/VisualSolver';
import StudyPlanner from './components/StudyPlanner';
import AudioDocAssistant from './components/AudioDocAssistant';
import TargetTracker from './components/TargetTracker';
import VoiceNotes from './components/VoiceNotes';
import OralExam from './components/OralExam';
import schoolsData from './data/schools.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  
  // Registration and login states
  const [profile, setProfile] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingIp, setCheckingIp] = useState(false);

  // 2FA login verification states
  const [sessionUnlocked, setSessionUnlocked] = useState(
    sessionStorage.getItem('eduai_session_unlocked') === 'true'
  );
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Registration form inputs
  const [regPin, setRegPin] = useState('');

  // Registration form inputs
  const [regName, setRegName] = useState('');
  const [regTc, setRegTc] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);

  const filteredSchools = regSchool.trim() 
    ? schoolsData.filter(s => s.name.toLowerCase().includes(regSchool.toLowerCase())).slice(0, 5)
    : [];
  const [regSchoolNumber, setRegSchoolNumber] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Shared States
  const [activeDoc, setActiveDoc] = useState(null);
  const [apiKeyConfig, setApiKeyConfig] = useState(null);
  const [stats, setStats] = useState({
    questionsSolved: 0,
    questionsCorrect: 0,
    topicsStudied: 0,
    flashcardsMastered: 0
  });

  // Load Profile, Settings, and Stats on Mount
  useEffect(() => {
    // API config
    const provider = localStorage.getItem('eduai_provider') || import.meta.env.VITE_DEFAULT_PROVIDER || 'gemini';
    const apiKey = localStorage.getItem('eduai_api_key') || (provider === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY : import.meta.env.VITE_OPENAI_API_KEY) || '';
    let model = localStorage.getItem('eduai_model') || import.meta.env.VITE_DEFAULT_MODEL || (provider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-4o-mini');
    
    // Auto-migrate legacy model names
    if (model === 'gemini-1.5-flash' || model === 'gemini-1.5-pro') {
      model = 'gemini-3.6-flash';
      localStorage.setItem('eduai_model', 'gemini-3.6-flash');
    }

    if (apiKey) {
      setApiKeyConfig({ provider, apiKey, model });
    }

    // Stats
    const storedStats = localStorage.getItem('eduai_stats');
    if (storedStats) {
      setStats(JSON.parse(storedStats));
    } else {
      recalculateStats();
    }

    // Profile & IP Auto-Login
    const storedProfile = localStorage.getItem('eduai_profile');
    if (storedProfile) {
      const parsedProfile = JSON.parse(storedProfile);
      setProfile(parsedProfile);
      setIsLoggedIn(true);
      
      // Background IP auto login check to bypass or enforce 2FA verification
      setCheckingIp(true);
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          // If IP matches the registered IP, auto-login and unlock instantly!
          if (data.ip === parsedProfile.ip) {
            setSessionUnlocked(true);
            sessionStorage.setItem('eduai_session_unlocked', 'true');
          } else {
            // IP mismatch: Lock session and require verification code
            // Unless already unlocked in sessionStorage for this tab session
            const wasUnlocked = sessionStorage.getItem('eduai_session_unlocked') === 'true';
            setSessionUnlocked(wasUnlocked);
          }
        })
        .catch(err => {
          console.error("IP check failed (offline/blocked), falling back to sessionStorage check:", err);
          // Secure fallback: use sessionStorage state
          const wasUnlocked = sessionStorage.getItem('eduai_session_unlocked') === 'true';
          setSessionUnlocked(wasUnlocked);
        })
        .finally(() => {
          setCheckingIp(false);
        });
    }
  }, []);

  const recalculateStats = () => {
    try {
      const history = JSON.parse(localStorage.getItem('eduai_quiz_history') || '[]');
      const solved = history.reduce((sum, item) => sum + item.totalQuestions, 0);
      const correct = history.reduce((sum, item) => sum + item.correctCount, 0);
      
      const allCategories = new Set();
      history.forEach(item => {
        if (item.categories) {
          item.categories.forEach(c => allCategories.add(c));
        }
      });

      const leitner = JSON.parse(localStorage.getItem('eduai_leitner_data') || '{}');
      const mastered = Object.values(leitner).filter(v => v.level === 5).length;

      const updatedStats = {
        questionsSolved: solved,
        questionsCorrect: correct,
        topicsStudied: allCategories.size,
        flashcardsMastered: mastered
      };

      setStats(updatedStats);
      localStorage.setItem('eduai_stats', JSON.stringify(updatedStats));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regTc.trim() || !regSchool.trim() || !regSchoolNumber.trim() || !regPin.trim()) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    
    // Turkish ID format verification (11 digits)
    if (regTc.trim().length !== 11 || !/^\d+$/.test(regTc.trim())) {
      alert('Lütfen geçerli bir 11 haneli T.C. Kimlik Numarası girin.');
      return;
    }

    // 6-digit PIN verification
    if (regPin.trim().length !== 6 || !/^\d{6}$/.test(regPin.trim())) {
      alert('Lütfen 6 haneli sayısal bir Güvenlik PIN Kodu oluşturun.');
      return;
    }

    setRegLoading(true);
    let ipAddress = '127.0.0.1';

    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      ipAddress = ipData.ip;
    } catch (err) {
      console.warn("Could not retrieve public IP, using default:", err);
    }

    const newProfile = {
      name: regName.trim(),
      tc: regTc.trim(),
      school: regSchool.trim(),
      schoolNumber: regSchoolNumber.trim(),
      ip: ipAddress,
      pin: regPin.trim()
    };

    localStorage.setItem('eduai_profile', JSON.stringify(newProfile));
    setProfile(newProfile);
    setIsLoggedIn(true);
    setSessionUnlocked(true);
    sessionStorage.setItem('eduai_session_unlocked', 'true');
    setRegLoading(false);
    
    // Reset states
    setRegPin('');
    alert('Kayıt işleminiz ve cihaz tanıma kurulumu başarıyla tamamlandı!');
  };

  const handleLoginVerification = (e) => {
    e.preventDefault();
    const token = pinInput.trim();
    if (!token) {
      setPinError('Lütfen güvenlik kodunu girin.');
      return;
    }

    if (token === profile?.pin) {
      setSessionUnlocked(true);
      sessionStorage.setItem('eduai_session_unlocked', 'true');
      
      // Update registered IP to current IP so they bypass verification next time
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          const updatedProfile = { ...profile, ip: data.ip };
          setProfile(updatedProfile);
          localStorage.setItem('eduai_profile', JSON.stringify(updatedProfile));
        })
        .catch(err => console.warn("Could not update profile IP automatically:", err));

      setPinInput('');
      setPinError('');
    } else {
      setPinError('Girdiğiniz güvenlik kodu hatalı. Lütfen tekrar deneyin.');
    }
  };

  const handleLogout = () => {
    if (confirm('Oturum kapatılacaktır. Tekrar giriş yapmak için cihaz tanıma veya PIN doğrulamanız gerekecektir. Emin misiniz?')) {
      setIsLoggedIn(false);
      setSessionUnlocked(false);
      sessionStorage.removeItem('eduai_session_unlocked');
      setPinInput('');
      setPinError('');
    }
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('eduai_profile', JSON.stringify(updatedProfile));
  };

  const handlePdfExtracted = (pdfData) => {
    setActiveDoc(pdfData);
    setActiveTab('dashboard');
  };

  const handleSettingsSaved = (config) => {
    setApiKeyConfig(config);
  };

  const handleSummaryGenerated = (summary) => {
    setActiveDoc(prev => ({ ...prev, summary }));
  };

  const handleFlashcardsGenerated = (flashcards) => {
    setActiveDoc(prev => ({ ...prev, flashcards }));
  };

  const handleQuizGenerated = (quiz) => {
    setActiveDoc(prev => ({ ...prev, quiz }));
  };

  const handleMasteryUpdated = (count) => {
    const newStats = { ...stats, flashcardsMastered: count };
    setStats(newStats);
    localStorage.setItem('eduai_stats', JSON.stringify(newStats));
  };

  const handleQuizCompleted = ({ docName, totalQuestions, correctCount, wrongCount, wrongQuestions, categories }) => {
    try {
      const history = JSON.parse(localStorage.getItem('eduai_quiz_history') || '[]');
      const newAttempt = {
        docName,
        date: new Date().toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        totalQuestions,
        correctCount,
        wrongCount,
        wrongQuestions,
        categories
      };
      
      const updatedHistory = [newAttempt, ...history];
      localStorage.setItem('eduai_quiz_history', JSON.stringify(updatedHistory));
      recalculateStats();
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { id: 'dashboard', name: 'Kontrol Paneli', icon: LayoutDashboard },
    { id: 'summary', name: 'Metin Özetleme', icon: BookOpen, requiresDoc: true },
    { id: 'audio-doc', name: 'Sesli PDF Asistanı', icon: Volume2, requiresDoc: true },
    { id: 'flashcards', name: 'Bilgi Kartları', icon: BrainCircuit, requiresDoc: true },
    { id: 'quiz', name: 'Deneme Sınavı', icon: Award, requiresDoc: true },
    { id: 'oral-exam', name: 'Sözlü Sınav Simülatörü', icon: Mic },
    { id: 'weakness', name: 'Zayıf Nokta Analizi', icon: Brain },
    { id: 'visual-solver', name: 'Fotoğraftan Soru Çözücü', icon: Camera },
    { id: 'study-planner', name: 'Ders Çalışma Planlayıcı', icon: Calendar },
    { id: 'target-tracker', name: 'Hedef Okul & Tercih', icon: Target },
    { id: 'productivity', name: 'Verimlilik & Pomodoro', icon: Clock },
    { id: 'voice-notes', name: 'Sesli Ders Notları', icon: Mic },
    { id: 'archive', name: 'Soru Arşivi', icon: FolderOpen },
    { id: 'profile', name: 'Profilim', icon: User },
    { id: 'settings', name: 'Ayarlar', icon: SettingsIcon },
  ];

  // Render IP Checking state on boot
  if (checkingIp) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h3 className="font-bold text-slate-800 text-base">Güvenli Giriş Doğrulanıyor...</h3>
        <p className="text-xs text-slate-400 mt-1">IP adresiniz arka planda sorgulanıyor ve hesabınız açılıyor.</p>
      </div>
    );
  }

  // Render Registration form if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-800">EduAI Öğrenci Kaydı</h2>
            <p className="text-xs text-slate-500 mt-1">
              Bilgilerinizi doldurarak kayıt adımlarını tamamlayın.
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Ad Soyad
              </label>
              <input 
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Örn: Emir Yılmaz"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 font-mono">
                <Shield className="w-3.5 h-3.5" />
                T.C. Kimlik Numarası
              </label>
              <input 
                type="text"
                required
                maxLength={11}
                value={regTc}
                onChange={(e) => setRegTc(e.target.value)}
                placeholder="11 haneli kimlik no"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <School className="w-3.5 h-3.5" />
                Okul Adı
              </label>
              <input 
                type="text"
                required
                value={regSchool}
                onChange={(e) => {
                  setRegSchool(e.target.value);
                  setShowSchoolSuggestions(true);
                }}
                onFocus={() => setShowSchoolSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSchoolSuggestions(false), 200);
                }}
                placeholder="Örn: Atatürk Fen Lisesi"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition"
              />
              {showSchoolSuggestions && filteredSchools.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 text-xs overflow-hidden max-h-48">
                  {filteredSchools.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => {
                        setRegSchool(s.name);
                        setShowSchoolSuggestions(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition font-medium text-slate-700 flex justify-between items-center"
                    >
                      <span>{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{s.ilce}, {s.il}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                Okul Numarası
              </label>
              <input 
                type="text"
                required
                value={regSchoolNumber}
                onChange={(e) => setRegSchoolNumber(e.target.value)}
                placeholder="Örn: 482"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1 font-mono">
                <Key className="w-3.5 h-3.5" />
                Güvenlik PIN Kodu (6 Haneli Sayısal)
              </label>
              <input 
                type="password"
                required
                maxLength={6}
                value={regPin}
                onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                placeholder="******"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-center tracking-widest font-mono text-sm outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">Bu kod, farklı bir cihazdan veya konumdan giriş yaparken kimliğinizi doğrulamak için istenecektir.</p>
            </div>

            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Kayıt Ol ve Başla</span>}
            </button>
          </form>

          {/* Quick Auto Login Bypass for already created profiles */}
          {profile && (
            <div className="text-center pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsLoggedIn(true)}
                className="text-[11px] text-indigo-600 hover:underline font-bold"
              >
                Kayıtlı Profil ile Giriş Yap ({profile.name})
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

    // Render 2FA login verification form if logged in but session is locked
    if (isLoggedIn && !sessionUnlocked) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Cihaz Doğrulaması</h2>
              <p className="text-xs text-slate-500 mt-1">
                Farklı bir ağ veya cihazdan giriş yaptığınız algılandı. Lütfen kayıt sırasında oluşturduğunuz 6 haneli Güvenlik PIN kodunuzu girin.
              </p>
            </div>

            <form onSubmit={handleLoginVerification} className="space-y-4">
              <div>
                <input 
                  type="password"
                  required
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="******"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-lg outline-none focus:border-indigo-500 transition font-mono font-bold tracking-widest"
                />
                {pinError && (
                  <p className="text-rose-500 text-[11px] font-bold text-center mt-2">{pinError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Doğrula ve Giriş Yap
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline font-semibold"
              >
                Başka Hesapla Giriş Yap (Profili Sıfırla)
              </button>
            </div>
          </div>
        </div>
      );
    }

  // Render Logged in Layout
  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-all duration-300 ${
      isZenMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Sidebar - Desktop */}
      {!isZenMode && (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 space-y-8 flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-lg leading-tight">EduAI</h1>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide">FIRSAT EŞİTLİĞİ</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const disabled = item.requiresDoc && !activeDoc;
              const active = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  disabled={disabled}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${
                    disabled 
                      ? 'opacity-40 cursor-not-allowed text-slate-400' 
                      : active 
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' 
                        : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Active PDF Status */}
          {activeDoc && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Aktif Belge</span>
              <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{activeDoc.name}</p>
            </div>
          )}
        </aside>
      )}

      {/* Header - Mobile */}
      {!isZenMode && (
        <header className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-20 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-800 text-base">EduAI</span>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && !isZenMode && (
        <div className="fixed inset-0 bg-slate-900/40 z-30 md:hidden flex justify-end animate-fadeIn" onClick={() => setMobileMenuOpen(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-64 max-w-[80vw] h-full bg-white p-5 flex flex-col space-y-6 shadow-2xl animate-slideInRight"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-black text-slate-800 text-base">EduAI</span>
            </div>

            <nav className="space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const disabled = item.requiresDoc && !activeDoc;
                const active = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    disabled={disabled}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${
                      disabled 
                        ? 'opacity-40 cursor-not-allowed text-slate-400' 
                        : active 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Floating Exit Zen Mode Button */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="fixed top-4 right-4 z-50 p-2.5 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl shadow-md flex items-center gap-2 text-xs font-bold transition"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Zen Çıkış</span>
        </button>
      )}

      {/* Main Content Pane */}
      <main className={`flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full transition-all ${
        isZenMode ? 'pt-16 pb-16' : ''
      }`}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            onPdfExtracted={handlePdfExtracted}
            activeDoc={activeDoc}
            stats={stats}
            onChangeTab={setActiveTab}
            apiKeyConfig={apiKeyConfig}
          />
        )}
        
        {activeTab === 'summary' && activeDoc && (
          <SummaryView 
            activeDoc={activeDoc}
            apiKeyConfig={apiKeyConfig}
            onSummaryGenerated={handleSummaryGenerated}
          />
        )}

        {activeTab === 'audio-doc' && activeDoc && (
          <AudioDocAssistant 
            activeDoc={activeDoc}
            apiKeyConfig={apiKeyConfig}
          />
        )}

        {activeTab === 'flashcards' && activeDoc && (
          <FlashcardsView 
            activeDoc={activeDoc}
            apiKeyConfig={apiKeyConfig}
            onFlashcardsGenerated={handleFlashcardsGenerated}
            onMasteryUpdated={handleMasteryUpdated}
          />
        )}

        {activeTab === 'quiz' && activeDoc && (
          <QuizView 
            activeDoc={activeDoc}
            apiKeyConfig={apiKeyConfig}
            onQuizGenerated={handleQuizGenerated}
            onQuizCompleted={handleQuizCompleted}
          />
        )}

        {activeTab === 'oral-exam' && (
          <OralExam 
            activeDoc={activeDoc}
            apiKeyConfig={apiKeyConfig}
          />
        )}

        {activeTab === 'weakness' && (
          <WeaknessAnalysis 
            activeDoc={activeDoc}
            apiKeyConfig={apiKeyConfig}
          />
        )}

        {activeTab === 'productivity' && (
          <ProductivityPanel 
            onZenToggle={() => setIsZenMode(!isZenMode)}
            isZenMode={isZenMode}
          />
        )}

        {activeTab === 'archive' && (
          <ArchiveView />
        )}

        {activeTab === 'visual-solver' && (
          <VisualSolver 
            apiKeyConfig={apiKeyConfig}
          />
        )}

        {activeTab === 'study-planner' && (
          <StudyPlanner 
            apiKeyConfig={apiKeyConfig}
          />
        )}

        {activeTab === 'target-tracker' && (
          <TargetTracker 
            apiKeyConfig={apiKeyConfig}
          />
        )}

        {activeTab === 'voice-notes' && (
          <VoiceNotes 
            apiKeyConfig={apiKeyConfig}
          />
        )}

        {activeTab === 'profile' && (
          <Profile 
            profile={profile}
            stats={stats}
            onLogout={handleLogout}
            onUpdate={handleProfileUpdate}
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            onSettingsSaved={handleSettingsSaved}
          />
        )}
      </main>
    </div>
  );
}

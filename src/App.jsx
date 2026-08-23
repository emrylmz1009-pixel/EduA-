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
  Minimize2
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import SummaryView from './components/SummaryView';
import FlashcardsView from './components/FlashcardsView';
import QuizView from './components/QuizView';
import WeaknessAnalysis from './components/WeaknessAnalysis';
import Settings from './components/Settings';
import ProductivityPanel from './components/ProductivityPanel';
import ArchiveView from './components/ArchiveView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  
  // Shared States
  const [activeDoc, setActiveDoc] = useState(null);
  const [apiKeyConfig, setApiKeyConfig] = useState(null);
  const [stats, setStats] = useState({
    questionsSolved: 0,
    questionsCorrect: 0,
    topicsStudied: 0,
    flashcardsMastered: 0
  });

  // Load Settings and Stats on Mount
  useEffect(() => {
    // API config
    const provider = localStorage.getItem('eduai_provider') || import.meta.env.VITE_DEFAULT_PROVIDER || 'gemini';
    const apiKey = localStorage.getItem('eduai_api_key') || (provider === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY : import.meta.env.VITE_OPENAI_API_KEY) || '';
    const model = localStorage.getItem('eduai_model') || import.meta.env.VITE_DEFAULT_MODEL || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
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

      // Retrieve Leitner mastered count (level === 5)
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

  const handlePdfExtracted = (pdfData) => {
    setActiveDoc(pdfData); // contains { name, size, pageCount, text }
    setActiveTab('dashboard'); // go back to dashboard
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
      // Save attempt to history
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

      // Update stats
      recalculateStats();
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { id: 'dashboard', name: 'Kontrol Paneli', icon: LayoutDashboard },
    { id: 'summary', name: 'Metin Özetleme', icon: BookOpen, requiresDoc: true },
    { id: 'flashcards', name: 'Bilgi Kartları', icon: BrainCircuit, requiresDoc: true },
    { id: 'quiz', name: 'Deneme Sınavı', icon: Award, requiresDoc: true },
    { id: 'weakness', name: 'Zayıf Nokta Analizi', icon: Brain },
    { id: 'productivity', name: 'Verimlilik & Pomodoro', icon: Clock },
    { id: 'archive', name: 'Soru Arşivi', icon: FolderOpen },
    { id: 'settings', name: 'Ayarlar', icon: SettingsIcon },
  ];

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
        <div className="fixed inset-0 bg-slate-900/40 z-30 md:hidden animate-fadeIn" onClick={() => setMobileMenuOpen(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-64 max-w-[80vw] h-full bg-white p-5 flex flex-col space-y-6 animate-slideInRight"
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

        {activeTab === 'settings' && (
          <Settings 
            onSettingsSaved={handleSettingsSaved}
          />
        )}
      </main>
    </div>
  );
}

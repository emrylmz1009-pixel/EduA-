import React, { useState, useEffect } from 'react';
import { User, School, Hash, ShieldAlert, Award, Play, Eye, EyeOff, LogOut, Save } from 'lucide-react';
import schoolsData from '../data/schools.json';

export default function Profile({ profile, onLogout, onUpdate, stats }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [tc, setTc] = useState(profile?.tc || '');
  const [school, setSchool] = useState(profile?.school || '');
  const [schoolNumber, setSchoolNumber] = useState(profile?.schoolNumber || '');
  const [showTc, setShowTc] = useState(false);
  const [showSchoolSuggestions, setShowSchoolSuggestions] = useState(false);

  const filteredSchools = school.trim() 
    ? schoolsData.filter(s => s.name.toLowerCase().includes(school.toLowerCase())).slice(0, 5)
    : [];

  // Retrieve Pomodoro completed count
  const [pomodoros, setPomodoros] = useState(0);

  useEffect(() => {
    const savedPomos = localStorage.getItem('eduai_pomodoro_count') || '0';
    setPomodoros(parseInt(savedPomos));
  }, []);

  const handleSave = () => {
    if (!name.trim() || !tc.trim() || !school.trim() || !schoolNumber.trim()) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    
    // Simple Turkish ID validation check (must be 11 digits)
    if (tc.trim().length !== 11 || !/^\d+$/.test(tc.trim())) {
      alert('Lütfen geçerli bir 11 haneli T.C. Kimlik Numarası girin.');
      return;
    }

    onUpdate({
      ...profile,
      name: name.trim(),
      tc: tc.trim(),
      school: school.trim(),
      schoolNumber: schoolNumber.trim()
    });
    setIsEditing(false);
  };

  const getMaskedTc = (value) => {
    if (!value) return '';
    if (value.length < 6) return '******';
    return `${value.substring(0, 2)}******${value.substring(value.length - 2)}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <User className="w-10 h-10" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-slate-800">{profile?.name}</h2>
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">EduAI Öğrenci Profili</p>
            
            {/* Background IP Recognition Notice */}
            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full inline-block mt-2 font-medium">
              ✓ IP Otomatik Giriş Koruması Aktif
            </span>
          </div>
          
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 border border-rose-100 hover:border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition self-center sm:self-start"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Profile Credentials */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
          <h3 className="font-bold text-slate-800 text-sm">Öğrenci Bilgileri</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-indigo-600 hover:underline font-bold"
            >
              Düzenle
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-bold"
            >
              <Save className="w-4.5 h-4.5" />
              Kaydet
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Ad Soyad</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">T.C. Kimlik Numarası</label>
              <input 
                type="text" 
                maxLength={11}
                value={tc}
                onChange={(e) => setTc(e.target.value)}
                placeholder="11 haneli T.C. No"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="relative">
              <label className="block font-bold text-slate-600 mb-1">Okul Adı</label>
              <input 
                type="text" 
                value={school}
                onChange={(e) => {
                  setSchool(e.target.value);
                  setShowSchoolSuggestions(true);
                }}
                onFocus={() => setShowSchoolSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSchoolSuggestions(false), 200);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
              {showSchoolSuggestions && filteredSchools.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 text-xs overflow-hidden max-h-48">
                  {filteredSchools.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => {
                        setSchool(s.name);
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
              <label className="block font-bold text-slate-600 mb-1">Okul Numarası</label>
              <input 
                type="text" 
                value={schoolNumber}
                onChange={(e) => setSchoolNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">T.C. KİMLİK NO</span>
                <span className="font-bold text-slate-700 font-mono flex items-center gap-1.5 mt-0.5">
                  {showTc ? profile?.tc : getMaskedTc(profile?.tc)}
                  <button 
                    onClick={() => setShowTc(!showTc)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showTc ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3">
              <School className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">OKUL</span>
                <span className="font-bold text-slate-700 mt-0.5 block">{profile?.school}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3">
              <Hash className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">OKUL NUMARASI</span>
                <span className="font-bold text-slate-700 mt-0.5 block">{profile?.schoolNumber}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">GÜVENLİK E-POSTASI</span>
                <span className="font-bold text-slate-700 mt-0.5 block truncate">
                  {profile?.email}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Security Details Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
          <h3 className="font-bold text-slate-800 text-sm">E-posta Doğrulaması (2FA)</h3>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
            Aktif
          </span>
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed">
          Hesabınız e-posta doğrulaması altındadır. Giriş yaparken kayıtlı e-posta adresinize (<strong>{profile?.email}</strong>) gönderilen 6 haneli doğrulama kodunu girmeniz istenir.
        </p>
      </div>

      {/* Stats recap cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
          <Award className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
          <span className="text-[10px] text-slate-400 block font-bold uppercase">Çözülen Soru</span>
          <span className="text-xl font-black text-slate-800 mt-1 block">{stats.questionsSolved || 0}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
          <Award className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
          <span className="text-[10px] text-slate-400 block font-bold uppercase">Başarı Oranı</span>
          <span className="text-xl font-black text-slate-800 mt-1 block">
            {stats.questionsSolved > 0 
              ? `%${Math.round((stats.questionsCorrect / stats.questionsSolved) * 100)}` 
              : '%0'}
          </span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
          <Award className="w-6 h-6 text-violet-600 mx-auto mb-1.5" />
          <span className="text-[10px] text-slate-400 block font-bold uppercase">Ezber Kartı</span>
          <span className="text-xl font-black text-slate-800 mt-1 block">{stats.flashcardsMastered || 0}</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
          <Play className="w-6 h-6 text-rose-600 mx-auto mb-1.5" />
          <span className="text-[10px] text-slate-400 block font-bold uppercase">Pomodoro</span>
          <span className="text-xl font-black text-slate-800 mt-1 block">{pomodoros || 0}</span>
        </div>
      </div>
    </div>
  );
}

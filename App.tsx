
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TabView, Student, AttendanceRecord, StudentResult, Exam, CustomFieldDefinition, Holiday, AnnualRecord, User, FeeRecord, Homework, Announcement } from './types';
import AttendanceTracker from './components/AttendanceTracker';
import ResultsManager from './components/ResultsManager';
import AnnualResultsManager from './components/AnnualResultsManager';
import Login from './components/Login';
import FeeManager from './components/FeeManager';
import UserManagement from './components/UserManagement';
import PromotionManager from './components/PromotionManager';
import HomeworkManager from './components/HomeworkManager';
import AnnouncementManager from './components/AnnouncementManager';
import ExamManager from './components/ExamManager';
import StudentDashboard from './components/StudentDashboard';
import StudentManager from './components/StudentManager';
import { dbService } from './services/db';
import { CalendarCheck, GraduationCap, FileBadge, LogOut, IndianRupee, Shield, BookOpen, Bell, Layers, Home, ChevronRight, Menu, X, User as UserIcon, TrendingUp, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('et_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [annualRecords, setAnnualRecords] = useState<AnnualRecord[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [selectedClass, setSelectedClass] = useState<string>('');

  // Persistence Logic
  const saveTimeoutRef = useRef<Record<string, number>>({});
  
  const scheduleSave = useCallback((store: string, data: any[]) => {
    if (saveTimeoutRef.current[store]) {
      window.clearTimeout(saveTimeoutRef.current[store]);
    }
    saveTimeoutRef.current[store] = window.setTimeout(async () => {
      await dbService.putAll(store, data);
    }, 1000);
  }, []);

  // Hydration from DB
  useEffect(() => {
    const hydrate = async () => {
      try {
        const [s, a, e, r, ar, cf, h, u, f, hw, ann] = await Promise.all([
          dbService.getAll('students'),
          dbService.getAll('attendance'),
          dbService.getAll('exams'),
          dbService.getAll('results'),
          dbService.getAll('annualRecords'),
          dbService.getAll('customFields'),
          dbService.getAll('holidays'),
          dbService.getAll('users'),
          dbService.getAll('fees'),
          dbService.getAll('homework'),
          dbService.getAll('announcements')
        ]);

        let finalStudents = [...s];
        let finalUsers = [...u];

        if (finalStudents.length === 0) {
          const sampleStudent: Student = {
            id: 'sample-student-id',
            name: 'John Doe',
            rollNo: '101',
            className: 'Class 1',
            medium: 'English',
            dob: '2015-05-20',
            placeOfBirth: 'Mumbai',
            address: '123 Main St, Koparkhairane, Navi Mumbai',
            phone: '9876543210',
            customFields: {}
          };
          finalStudents = [sampleStudent];
        }

        if (!finalUsers.some(user => user.role === 'headmaster')) {
          finalUsers.push({ 
            id: 'admin-primary', 
            username: 'admin', 
            password: 'admin123', 
            name: 'Administrator', 
            role: 'headmaster' 
          });
        }

        setStudents(finalStudents);
        setUsers(finalUsers);
        setAttendance(a);
        setExams(e);
        setResults(r);
        setAnnualRecords(ar);
        setCustomFieldDefs(cf);
        setHolidays(h);
        setFees(f);
        setHomework(hw);
        setAnnouncements(ann);
      } catch (err) {
        console.error("Hydration Error:", err);
      } finally {
        setIsLoaded(true);
      }
    };
    hydrate();
  }, []);

  useEffect(() => { if (isLoaded) scheduleSave('students', students); }, [students, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('attendance', attendance); }, [attendance, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('exams', exams); }, [exams, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('results', results); }, [results, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('annualRecords', annualRecords); }, [annualRecords, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('customFields', customFieldDefs); }, [customFieldDefs, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('holidays', holidays); }, [holidays, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('users', users); }, [users, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('fees', fees); }, [fees, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('homework', homework); }, [homework, isLoaded, scheduleSave]);
  useEffect(() => { if (isLoaded) scheduleSave('announcements', announcements); }, [announcements, isLoaded, scheduleSave]);

  useEffect(() => {
    if (currentUser) sessionStorage.setItem('et_session', JSON.stringify(currentUser));
    else sessionStorage.removeItem('et_session');
  }, [currentUser]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 size={64} className="text-indigo-600 animate-spin" />
        </div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Indrayani System Initializing...</p>
      </div>
    );
  }

  if (!currentUser) return <Login users={users} onLogin={setCurrentUser} />;

  const theme = {
    headmaster: { text: 'text-rose-700', bg: 'bg-rose-600', lightBg: 'bg-rose-50 border-rose-200', gradient: 'from-rose-50 to-white', shadow: 'shadow-rose-100', icon: Shield },
    teacher: { text: 'text-sky-700', bg: 'bg-sky-600', lightBg: 'bg-sky-50 border-sky-200', gradient: 'from-sky-50 to-white', shadow: 'shadow-sky-100', icon: BookOpen },
    student: { text: 'text-emerald-700', bg: 'bg-emerald-600', lightBg: 'bg-emerald-50 border-emerald-200', gradient: 'from-emerald-50 to-white', shadow: 'shadow-emerald-100', icon: GraduationCap }
  }[currentUser.role];

  if (currentUser.role === 'student') {
    return <StudentDashboard currentUser={currentUser} onLogout={() => setCurrentUser(null)} students={students} homework={homework} exams={exams} results={results} attendance={attendance} announcements={announcements} annualRecords={annualRecords} holidays={holidays} />;
  }

  const dashboardItems = [
    { id: 'students', label: 'Students', desc: 'Admissions & Profiles', icon: GraduationCap, color: 'bg-blue-600' },
    { id: 'attendance', label: 'Attendance', desc: 'Track Daily Presence', icon: CalendarCheck, color: 'bg-emerald-600' },
    { id: 'exams', label: 'Exam Planner', desc: 'Schedule & Timetables', icon: Layers, color: 'bg-purple-600' },
    { id: 'results', label: 'Results', desc: 'Marks Entry & Analysis', icon: FileBadge, color: 'bg-amber-600' },
    { id: 'annual', label: 'Reports', desc: 'Annual Report Cards', icon: FileBadge, color: 'bg-pink-600' },
    { id: 'homework', label: 'Homework', desc: 'Assignments & Tasks', icon: BookOpen, color: 'bg-indigo-600' },
    { id: 'notices', label: 'Notices', desc: 'Announcements', icon: Bell, color: 'bg-rose-600' },
  ];

  if (currentUser.role === 'headmaster' || currentUser.role === 'teacher') dashboardItems.push({ id: 'fees', label: 'Fees', desc: 'Payment Tracking', icon: IndianRupee, color: 'bg-teal-600' });
  if (currentUser.role === 'headmaster') {
    dashboardItems.push({ id: 'users', label: 'Users', desc: 'Manage Access', icon: Shield, color: 'bg-slate-600' });
    dashboardItems.push({ id: 'promotion', label: 'Promotion', desc: 'Student Progression', icon: TrendingUp, color: 'bg-violet-600' });
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 animate-fade-up">
             {dashboardItems.map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as TabView)} className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all text-left group flex flex-col justify-between min-h-[140px] sm:min-h-[160px] active:scale-95">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white mb-3 sm:mb-4 ${item.color} shadow-md group-hover:scale-110 transition-transform`}>
                     <item.icon size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-lg font-bold text-slate-800 group-hover:${theme.text} transition-colors leading-tight`}>{item.label}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className={`mt-2 sm:mt-4 flex items-center text-[10px] sm:text-xs font-bold ${theme.text} opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0`}>
                     <span>Open Module</span> <ChevronRight size={14} className="ml-1 w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                </button>
             ))}
          </div>
        );
      case 'students': return <StudentManager students={students} setStudents={setStudents} customFieldDefs={customFieldDefs} setCustomFieldDefs={setCustomFieldDefs} users={users} setUsers={setUsers} currentUser={currentUser} />;
      case 'attendance': return <AttendanceTracker students={students} attendance={attendance} setAttendance={setAttendance} selectedClass={selectedClass ? selectedClass.split('|')[0] : ''} setSelectedClass={(cls) => setSelectedClass(cls ? `${cls}|English` : '')} holidays={holidays} setHolidays={setHolidays} currentUser={currentUser} />;
      case 'exams': return <ExamManager exams={exams} setExams={setExams} />;
      case 'results': return <ResultsManager students={students} results={results} setResults={setResults} attendance={attendance} selectedClass={selectedClass.split('|')[0]} setSelectedClass={(cls) => setSelectedClass(cls ? `${cls}|English` : '')} exams={exams} setExams={setExams} />;
      case 'annual': return <AnnualResultsManager students={students} annualRecords={annualRecords} setAnnualRecords={setAnnualRecords} selectedClass={selectedClass} setSelectedClass={setSelectedClass} exams={exams} customFieldDefs={customFieldDefs} />;
      case 'homework': return <HomeworkManager homework={homework} setHomework={setHomework} selectedClass={selectedClass} setSelectedClass={setSelectedClass} />;
      case 'notices': return <AnnouncementManager announcements={announcements} setAnnouncements={setAnnouncements} />;
      case 'fees': return <FeeManager students={students} fees={fees} setFees={setFees} readOnly={currentUser.role === 'teacher'} />;
      case 'users': return <UserManagement users={users} setUsers={setUsers} currentUser={currentUser} students={students} />;
      case 'promotion': return <PromotionManager students={students} setStudents={setStudents} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header Elevated to z-[100] */}
      <header className={`bg-gradient-to-b ${theme.gradient} backdrop-blur-md sticky top-0 z-[100] shadow-sm border-b ${theme.lightBg}`}>
         <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
               {activeTab !== 'home' && <button onClick={() => setActiveTab('home')} className={`p-2.5 bg-white hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 active:scale-95 transition-all shadow-sm`}><Home size={22} /></button>}
               <div className="flex items-center gap-3">
                  <div className={`${theme.bg} p-2.5 rounded-xl shadow-lg ${theme.shadow} hidden xs:flex`}><theme.icon size={22} className="text-white" /></div>
                  <div>
                    <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 uppercase italic leading-none">Indrayani School</h1>
                    {activeTab !== 'home' && <p className={`text-[10px] font-black ${theme.text} uppercase tracking-widest mt-0.5`}>{activeTab}</p>}
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               <div className="hidden xs:flex items-center gap-3 bg-white/60 py-1.5 px-3 rounded-2xl border border-white/50 shadow-sm">
                  <div className={`w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black`}>{currentUser.name.charAt(0)}</div>
                  <div className="flex flex-col"><span className="text-xs font-black text-slate-800">{currentUser.name}</span><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentUser.role}</span></div>
               </div>
               <button onClick={() => { setCurrentUser(null); setActiveTab('home'); }} className="p-2.5 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 rounded-xl active:scale-95 transition-all hover:shadow-md"><LogOut size={22} /></button>
            </div>
         </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:py-8">{renderContent()}</main>
      <footer className="py-8 text-center text-[11px] text-slate-400 font-bold tracking-[0.1em] uppercase">© 2025 Indrayani Education Group</footer>
    </div>
  );
};

export default App;

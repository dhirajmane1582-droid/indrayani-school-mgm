
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, CLASSES, Holiday, User } from '../types';
import { Calendar, Check, X, BarChart3, CalendarOff, ChevronLeft, ChevronRight, Plus, Trash2, Search, Info, AlertCircle, CalendarRange, Users, UserCheck, UserMinus, User as UserIcon } from 'lucide-react';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  currentUser: User;
}

type AttendanceFilter = 'all' | 'present' | 'absent';

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  students,
  attendance,
  setAttendance,
  selectedClass,
  setSelectedClass,
  holidays,
  setHolidays,
  currentUser
}) => {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>('all');
  
  // Holiday Form State
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState(today);
  const [newHolidayEndDate, setNewHolidayEndDate] = useState(today);
  const [isRange, setIsRange] = useState(false);

  const getStatus = (studentId: string) => {
    const record = attendance.find(r => r.studentId === studentId && r.date === selectedDate);
    return record?.present;
  };

  const classStudents = useMemo(() => {
    return selectedClass ? students.filter(s => s.className === selectedClass) : [];
  }, [students, selectedClass]);

  const stats = useMemo(() => {
    const total = classStudents.length;
    let present = 0;
    let absent = 0;
    classStudents.forEach(s => {
      const status = getStatus(s.id);
      if (status === true) present++;
      else if (status === false) absent++;
    });
    return { total, present, absent, unmarked: total - (present + absent) };
  }, [classStudents, attendance, selectedDate]);

  const filteredStudents = useMemo(() => {
    let list = [...classStudents];

    // Filter by Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.includes(q));
    }

    // Filter by Status Tab
    if (statusFilter === 'present') {
        list = list.filter(s => getStatus(s.id) === true);
    } else if (statusFilter === 'absent') {
        list = list.filter(s => getStatus(s.id) === false);
    }

    return list.sort((a,b) => (parseInt(a.rollNo)||0) - (parseInt(b.rollNo)||0));
  }, [classStudents, attendance, selectedDate, searchQuery, statusFilter]);

  const toggleAttendance = (studentId: string, present: boolean) => {
      if (currentDayHoliday || isSunday || selectedDate > today) return;
      setAttendance(prev => {
          const clean = prev.filter(r => !(r.studentId === studentId && r.date === selectedDate));
          return [...clean, { id: crypto.randomUUID(), studentId, date: selectedDate, present }];
      });
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split('T')[0];
    if (newDateStr <= today) {
        setSelectedDate(newDateStr);
    }
  };

  const checkHoliday = (dateStr: string) => holidays.find(h => h.endDate ? (dateStr >= h.date && dateStr <= h.endDate) : h.date === dateStr);
  const currentDayHoliday = checkHoliday(selectedDate);
  const isSunday = new Date(selectedDate).getDay() === 0;

  const markAll = (present: boolean) => {
    if (currentDayHoliday || isSunday || !selectedClass || selectedDate > today) return;
    const newRecords = classStudents.map(student => ({
        id: crypto.randomUUID(),
        date: selectedDate,
        studentId: student.id,
        present
    }));
    setAttendance(prev => {
      const otherRecords = prev.filter(r => r.date !== selectedDate || !classStudents.find(s => s.id === r.studentId));
      return [...otherRecords, ...newRecords];
    });
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim()) return;
    
    const newH: Holiday = {
        id: crypto.randomUUID(),
        date: newHolidayDate,
        endDate: isRange ? newHolidayEndDate : undefined,
        name: newHolidayName.trim()
    };
    
    setHolidays(prev => [...prev, newH].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setNewHolidayName('');
    setIsRange(false);
  };

  const handleDeleteHoliday = (id: string) => {
      if (window.confirm("Delete this holiday?")) {
          setHolidays(prev => prev.filter(h => h.id !== id));
      }
  };

  const formatDateShort = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date and Class Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">Class Attendance</h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-black tracking-widest">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsHolidayModalOpen(true)} 
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase transition-all ${currentDayHoliday ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'}`}
                    >
                        <CalendarOff size={16}/>
                        <span className="hidden sm:inline">{currentUser.role === 'headmaster' ? 'Manage Holidays' : 'Holidays'}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col xs:flex-row items-center gap-3">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full xs:w-auto shadow-sm">
                    <button onClick={() => changeDate(-1)} className="p-2.5 hover:bg-slate-200 rounded-lg transition-all active:scale-90 text-slate-500"><ChevronLeft size={18}/></button>
                    <input 
                        type="date" 
                        value={selectedDate} 
                        max={today}
                        onChange={(e) => setSelectedDate(e.target.value)} 
                        className="bg-transparent text-sm font-black text-slate-800 px-3 outline-none cursor-pointer" 
                    />
                    <button 
                        onClick={() => changeDate(1)} 
                        disabled={selectedDate >= today}
                        className="p-2.5 hover:bg-slate-200 rounded-lg transition-all active:scale-90 text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18}/>
                    </button>
                </div>
                <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)} 
                    className="w-full xs:flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none cursor-pointer transition-all"
                >
                    <option value="">Select Class</option>
                    {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* Holiday/Sunday Banner */}
      {(currentDayHoliday || isSunday) && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${isSunday ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              {isSunday ? <Info size={20}/> : <AlertCircle size={20}/>}
              <div>
                  <p className="text-sm font-black uppercase tracking-tight">
                      {isSunday ? "Sunday - Weekend Break" : `Holiday: ${currentDayHoliday?.name}`}
                  </p>
                  <p className="text-xs opacity-80 font-medium">Attendance marking is disabled for this day.</p>
              </div>
          </div>
      )}

      {!selectedClass ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 italic">
              Please select a class to view or record attendance.
          </div>
      ) : (
          <div className={`space-y-4 transition-opacity duration-300 ${(currentDayHoliday || isSunday) ? 'opacity-60' : 'opacity-100'}`}>
              
              {/* Quick Actions Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => markAll(true)} 
                        disabled={!!currentDayHoliday || isSunday || selectedDate > today} 
                        className="flex-1 sm:px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all active:scale-95"
                    >
                        Mark All Present
                    </button>
                    <button 
                        onClick={() => markAll(false)} 
                        disabled={!!currentDayHoliday || isSunday || selectedDate > today} 
                        className="flex-1 sm:px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all active:scale-95"
                    >
                        Mark All Absent
                    </button>
                </div>

                {/* Present/Absent Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
                    <button 
                        onClick={() => setStatusFilter('all')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={14}/>
                        <span>All</span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${statusFilter === 'all' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>{stats.total}</span>
                    </button>
                    <button 
                        onClick={() => setStatusFilter('present')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'present' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <UserCheck size={14}/>
                        <span>Present</span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${statusFilter === 'present' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{stats.present}</span>
                    </button>
                    <button 
                        onClick={() => setStatusFilter('absent')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'absent' ? 'bg-white text-rose-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <UserMinus size={14}/>
                        <span>Absent</span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${statusFilter === 'absent' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>{stats.absent}</span>
                    </button>
                </div>
              </div>

              <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Quick search by name or roll..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-slate-900 placeholder-slate-400" 
                  />
              </div>

              {/* List View: Conditional Rendering based on statusFilter */}
              <div className={statusFilter === 'all' ? "grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
                  {filteredStudents.length === 0 ? (
                      <div className="col-span-full py-16 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                          No students found matching current filters.
                      </div>
                  ) : filteredStudents.map(student => {
                      const status = getStatus(student.id);
                      const disabled = !!currentDayHoliday || isSunday || selectedDate > today;
                      
                      // MARKING VIEW (ALL TAB)
                      if (statusFilter === 'all') {
                          return (
                              <div key={student.id} className={`bg-white rounded-2xl border p-4 transition-all duration-300 ${status === true ? 'border-emerald-500 ring-4 ring-emerald-50' : status === false ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                  <div className="flex items-center gap-3 mb-5">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${status === true ? 'bg-emerald-600 text-white' : status === false ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                          {student.rollNo}
                                      </div>
                                      <div className="flex-1 overflow-hidden">
                                          <div className="font-bold text-slate-800 text-sm truncate">{student.name}</div>
                                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Roll No: {student.rollNo}</div>
                                      </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                      <button 
                                        onClick={() => toggleAttendance(student.id, true)} 
                                        disabled={disabled}
                                        className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${status === true ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 border border-slate-100'} disabled:opacity-40 disabled:cursor-not-allowed`}
                                      >
                                          <Check size={20}/>
                                          <span className="text-[9px] font-black uppercase tracking-tighter">Present</span>
                                      </button>
                                      <button 
                                        onClick={() => toggleAttendance(student.id, false)} 
                                        disabled={disabled}
                                        className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${status === false ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-rose-50 border border-slate-100'} disabled:opacity-40 disabled:cursor-not-allowed`}
                                      >
                                          <X size={20}/>
                                          <span className="text-[9px] font-black uppercase tracking-tighter">Absent</span>
                                      </button>
                                  </div>
                              </div>
                          );
                      }

                      // LIST VIEW (PRESENT/ABSENT TABS)
                      return (
                          <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-slate-300 transition-all animate-in slide-in-from-left-2 duration-300">
                               <div className="flex items-center gap-4">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${statusFilter === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                       {student.rollNo}
                                   </div>
                                   <div className="font-bold text-slate-800 text-sm uppercase">{student.name}</div>
                               </div>
                               <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${statusFilter === 'present' ? 'text-emerald-500 bg-emerald-50/50' : 'text-rose-500 bg-rose-50/50'}`}>
                                   {statusFilter}
                               </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* HOLIDAY MANAGEMENT MODAL */}
      {isHolidayModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">Academic Holidays</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">Institutional Calendar 2024-25</p>
                      </div>
                      <button onClick={() => setIsHolidayModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
                      {currentUser.role === 'headmaster' && (
                          <section className="space-y-4">
                              <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> Declare New Holiday</h4>
                              <form onSubmit={handleAddHoliday} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm text-slate-900">
                                  <div className="flex bg-slate-200 p-1 rounded-xl mb-2">
                                      <button 
                                        type="button"
                                        onClick={() => setIsRange(false)} 
                                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${!isRange ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                      >
                                          Single Day
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setIsRange(true)} 
                                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${isRange ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                      >
                                          Date Range
                                      </button>
                                  </div>
                                  
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Event Name</label>
                                      <input 
                                          type="text" 
                                          value={newHolidayName} 
                                          onChange={(e) => setNewHolidayName(e.target.value)} 
                                          placeholder="e.g. Diwali Vacation, Sports Day" 
                                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-900" 
                                      />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div>
                                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">{isRange ? 'Start Date' : 'Date'}</label>
                                          <input 
                                              type="date" 
                                              value={newHolidayDate} 
                                              onChange={(e) => setNewHolidayDate(e.target.value)} 
                                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-900" 
                                          />
                                      </div>
                                      {isRange && (
                                          <div className="animate-in slide-in-from-right-2 duration-300">
                                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">End Date</label>
                                              <input 
                                                  type="date" 
                                                  value={newHolidayEndDate} 
                                                  onChange={(e) => setNewHolidayEndDate(e.target.value)} 
                                                  min={newHolidayDate}
                                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-slate-900" 
                                              />
                                          </div>
                                      )}
                                  </div>
                                  <button type="submit" className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all">Add to Calendar</button>
                              </form>
                          </section>
                      )}

                      <section className="space-y-4 pb-4">
                          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={14}/> Scheduled Events</h4>
                          {holidays.length === 0 ? (
                              <div className="py-12 text-center text-slate-400 italic text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">No holidays declared yet.</div>
                          ) : (
                              <div className="space-y-3">
                                  {holidays.map(h => (
                                      <div key={h.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl group hover:border-indigo-300 transition-all shadow-sm">
                                          <div className="flex items-center gap-4">
                                              <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl">
                                                  {h.endDate ? <CalendarRange size={18}/> : <CalendarOff size={18}/>}
                                              </div>
                                              <div>
                                                  <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{h.name}</div>
                                                  <div className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1.5">
                                                      {formatDateShort(h.date)}
                                                      {h.endDate && (
                                                          <>
                                                            <ArrowRightIcon size={10} className="text-slate-300" />
                                                            {formatDateShort(h.endDate)}
                                                          </>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          {currentUser.role === 'headmaster' && (
                                              <button 
                                                onClick={() => handleDeleteHoliday(h.id)} 
                                                className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Delete Holiday"
                                              >
                                                  <Trash2 size={18}/>
                                              </button>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </section>
                  </div>
                  
                  <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                      <button 
                        onClick={() => setIsHolidayModalOpen(false)} 
                        className="w-full py-4 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 active:scale-95 transition-all shadow-xl"
                      >
                          Close Calendar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// Simple ArrowRight icon for range display since it wasn't imported
const ArrowRightIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

export default AttendanceTracker;

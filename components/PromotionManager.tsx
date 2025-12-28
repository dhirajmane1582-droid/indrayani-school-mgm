
import React, { useState, useMemo } from 'react';
import { Student, SPECIFIC_CLASSES } from '../types';
import { TrendingUp, Users, ArrowRight, CheckCircle2, ChevronDown, Search, Filter, AlertTriangle, GraduationCap } from 'lucide-react';

interface PromotionManagerProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const PromotionManager: React.FC<PromotionManagerProps> = ({ students, setStudents }) => {
  const [sourceSpecificClass, setSourceSpecificClass] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Migration Logic Helper
  const getNextClass = (currentClass: string): string => {
    if (currentClass === 'Nursery') return 'Jr. KG';
    if (currentClass === 'Jr. KG') return 'Sr. KG';
    if (currentClass === 'Sr. KG') return 'Class 1';
    
    if (currentClass.startsWith('Class ')) {
        const num = parseInt(currentClass.replace('Class ', ''));
        if (num === 10) return 'Alumni';
        if (num < 10) return `Class ${num + 1}`;
    }
    
    return currentClass; // Default (e.g., Alumni stays Alumni)
  };

  const filteredStudents = useMemo(() => {
    if (!sourceSpecificClass) return [];
    const [className, medium] = sourceSpecificClass.split('|');
    let list = students.filter(s => s.className === className && (s.medium || 'English') === medium);
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.includes(q));
    }
    
    return list.sort((a,b) => (parseInt(a.rollNo)||0) - (parseInt(b.rollNo)||0));
  }, [students, sourceSpecificClass, searchQuery]);

  const toggleSelection = (id: string) => {
    const n = new Set(selectedStudentIds);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelectedStudentIds(n);
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
        setSelectedStudentIds(new Set());
    } else {
        setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handlePromote = () => {
    if (selectedStudentIds.size === 0) return;
    
    const count = selectedStudentIds.size;
    const msg = count === filteredStudents.length 
        ? `Are you sure you want to promote the ENTIRE class to their next level?`
        : `Confirm promotion for ${count} selected students?`;

    if (window.confirm(msg)) {
        setStudents(prev => prev.map(s => {
            if (selectedStudentIds.has(s.id)) {
                return { ...s, className: getNextClass(s.className) };
            }
            return s;
        }));
        
        setSelectedStudentIds(new Set());
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Promotion Tool Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
             <div className="flex items-center gap-2 text-violet-600 mb-1">
                <TrendingUp size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight">Academic Promotion</h2>
             </div>
             <p className="text-sm text-slate-500 font-medium italic">Move students to the next grade for the upcoming session.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Filter candidates..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                />
             </div>
             <div className="relative">
                <select
                  value={sourceSpecificClass}
                  onChange={(e) => { setSourceSpecificClass(e.target.value); setSelectedStudentIds(new Set()); }}
                  className="appearance-none pl-4 pr-10 py-3 bg-violet-50 border border-violet-100 rounded-xl text-sm font-black text-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 cursor-pointer min-w-[220px]"
                >
                  <option value="">Source Class</option>
                  {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" size={18} />
             </div>
          </div>
        </div>
      </div>

      {/* Main Promotion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Stats & Logic Preview */}
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Progression Logic</h3>
                  <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <span>Class 1 - 9</span>
                          <ArrowRight size={14}/>
                          <span>Next Grade</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <span>Class 10</span>
                          <ArrowRight size={14}/>
                          <span className="text-violet-600">Alumni</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <span>Pre-Primary</span>
                          <ArrowRight size={14}/>
                          <span>Structured Path</span>
                      </div>
                  </div>
              </div>

              <div className="bg-violet-900 text-white p-6 rounded-2xl shadow-xl shadow-violet-100">
                  <h3 className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-4">Action Summary</h3>
                  <div className="text-4xl font-black mb-1">{selectedStudentIds.size}</div>
                  <div className="text-xs font-bold opacity-80 uppercase">Students Selected</div>
                  
                  <button 
                    onClick={handlePromote}
                    disabled={selectedStudentIds.size === 0}
                    className="mt-8 w-full py-4 bg-white text-violet-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-violet-50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                      Promote Selected
                  </button>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-[10px] leading-relaxed font-bold text-amber-800 uppercase italic">
                      Caution: Promotion updates the student's current grade permanently. Historical marks and results are preserved but linked to the new class context.
                  </p>
              </div>
          </div>

          {/* Right Column: Student Selection List */}
          <div className="lg:col-span-3">
              {!sourceSpecificClass ? (
                  <div className="bg-white h-[400px] rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="font-bold text-sm uppercase tracking-widest">Select a source class to begin</p>
                  </div>
              ) : filteredStudents.length === 0 ? (
                  <div className="bg-white h-[400px] rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <p className="font-bold text-sm uppercase tracking-widest">No students found in this class</p>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                           <label className="flex items-center gap-3 cursor-pointer group">
                               <input 
                                  type="checkbox" 
                                  checked={selectedStudentIds.size === filteredStudents.length} 
                                  onChange={toggleSelectAll}
                                  className="w-5 h-5 rounded border-2 border-slate-300 text-violet-600 focus:ring-violet-500" 
                               />
                               <span className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-violet-600 transition-colors">Select Entire Class</span>
                           </label>
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               Class Strength: {filteredStudents.length}
                           </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredStudents.map(student => {
                              const isSelected = selectedStudentIds.has(student.id);
                              const nextClass = getNextClass(student.className);
                              
                              return (
                                  <div 
                                    key={student.id} 
                                    onClick={() => toggleSelection(student.id)}
                                    className={`group relative bg-white p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-violet-500 ring-4 ring-violet-50 shadow-md' : 'border-slate-200 hover:border-violet-200 hover:shadow-sm'}`}
                                  >
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${isSelected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                              {student.rollNo}
                                          </div>
                                          <div className="flex-1 overflow-hidden">
                                              <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-violet-900' : 'text-slate-800'}`}>{student.name}</h4>
                                              <div className="flex items-center gap-2 mt-1">
                                                  <span className="text-[9px] font-black text-slate-400 uppercase">{student.className}</span>
                                                  <ArrowRight size={10} className="text-slate-300" />
                                                  <span className={`text-[9px] font-black uppercase ${isSelected ? 'text-violet-600' : 'text-slate-400/50 italic'}`}>{nextClass}</span>
                                              </div>
                                          </div>
                                          {isSelected && (
                                              <div className="bg-violet-100 text-violet-600 p-1 rounded-full animate-in zoom-in duration-200">
                                                  <CheckCircle2 size={18} />
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {showSuccess && (
          <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-emerald-500 p-1.5 rounded-full"><CheckCircle2 size={20} /></div>
              <div>
                  <div className="text-sm font-black uppercase tracking-widest">Promotion Successful</div>
                  <div className="text-xs text-slate-400 font-medium">Class data has been updated.</div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PromotionManager;

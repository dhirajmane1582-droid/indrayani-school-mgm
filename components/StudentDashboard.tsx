
import React, { useMemo, useState, useEffect } from 'react';
import { User, Student, Homework, Exam, StudentResult, AttendanceRecord, Announcement, AnnualRecord, Holiday, getSubjectsForClass } from '../types';
import { BookOpen, Calendar, GraduationCap, Bell, UserCheck, CalendarCheck, FileBadge, LogOut, LayoutDashboard, Clock, AlertCircle, Download, X, ChevronRight, Home, Info, Award } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface StudentDashboardProps {
  currentUser: User;
  onLogout: () => void;
  students: Student[];
  homework: Homework[];
  exams: Exam[];
  results: StudentResult[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  annualRecords?: AnnualRecord[];
  holidays?: Holiday[];
}

const PDF_STYLES = `
    .report-wrapper {
        padding: 0;
        margin: 0;
        background: #fff;
    }
    .report-page { 
        font-family: 'Times New Roman', Times, serif; 
        padding: 15mm; 
        width: 190mm; 
        min-height: 267mm; 
        box-sizing: border-box; 
        color: #000;
        background: #fff;
        position: relative;
        border: 2px solid #000;
        margin: auto;
    }
    .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .trust-name { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 3px; color: #000; }
    .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #000; }
    .address { font-size: 11px; color: #000; font-weight: bold; margin-bottom: 2px; }
    .contact { font-size: 11px; color: #000; font-weight: bold; }
    .report-title { font-size: 15px; font-weight: bold; margin-top: 10px; border: 1.5px solid #000; display: inline-block; padding: 4px 20px; text-transform: uppercase; }
    
    .student-info { margin-top: 15px; margin-bottom: 20px; border: 1px solid #000; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { font-size: 13px; border-bottom: 1px dotted #000; padding-bottom: 3px; }
    .label { font-weight: bold; margin-right: 5px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th, td { border: 1px solid #000; padding: 8px 4px; text-align: center; color: #000; }
    th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .subject-cell { text-align: left; padding-left: 10px; font-weight: bold; }
    
    .section-title { font-weight: bold; font-size: 13px; margin-bottom: 6px; text-decoration: underline; text-transform: uppercase; color: #000; }
    
    .footer-section { margin-top: auto; }
    .remarks-box { border: 1.5px solid #000; padding: 10px; margin-bottom: 15px; min-height: 50px; font-size: 13px; }
    .promotion-text { font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 40px; text-transform: uppercase; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding: 0 5mm; }
    .sig-box { text-align: center; border-top: 1.5px solid #000; width: 40mm; padding-top: 6px; font-size: 13px; font-weight: bold; color: #000; }
`;

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  onLogout,
  students,
  homework,
  exams,
  results,
  attendance,
  announcements,
  annualRecords = []
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'homework' | 'exams' | 'results' | 'attendance' | 'notices'>('home');
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Notification State using keys specific to current student
  const [seenResultIds, setSeenResultIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`seen_results_${currentUser.linkedStudentId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [seenHomeworkIds, setSeenHomeworkIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`seen_homework_${currentUser.linkedStudentId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [annualSeen, setAnnualSeen] = useState<boolean>(() => {
    const saved = localStorage.getItem(`seen_annual_${currentUser.linkedStudentId}`);
    return saved === 'true';
  });
  
  const student = useMemo(() => students.find(s => s.id === currentUser.linkedStudentId), [students, currentUser]);

  const studentAnnualRecord = useMemo(() => {
    if (!student) return null;
    const r = annualRecords.find(rec => rec.studentId === student.id);
    return (r && r.published) ? r : null;
  }, [annualRecords, student]);

  const relevantHomework = useMemo(() => {
    if (!student) return [];
    return homework.filter(h => h.className === student.className && h.medium === (student.medium || 'English'));
  }, [homework, student]);

  const studentResults = useMemo(() => {
     if (!student) return [];
     return results.filter(r => r.studentId === student.id && r.published);
  }, [results, student]);

  const hasNewHomework = useMemo(() => {
    return relevantHomework.some(h => !seenHomeworkIds.includes(h.id));
  }, [relevantHomework, seenHomeworkIds]);

  const hasNewResults = useMemo(() => {
    return studentResults.some(r => !seenResultIds.includes(r.id));
  }, [studentResults, seenResultIds]);

  const hasNewAnnual = useMemo(() => {
    return !!studentAnnualRecord && !annualSeen;
  }, [studentAnnualRecord, annualSeen]);

  // Observer Effect: Mark items as seen when relevant tab is active
  useEffect(() => {
    if (activeTab === 'results') {
      // Mark annual results seen
      if (studentAnnualRecord && !annualSeen) {
        setAnnualSeen(true);
        localStorage.setItem(`seen_annual_${currentUser.linkedStudentId}`, 'true');
      }
      
      // Mark standard results seen
      if (studentResults.length > 0) {
        const allResultIds = studentResults.map(r => r.id);
        const isAnythingNew = allResultIds.some(id => !seenResultIds.includes(id));
        if (isAnythingNew) {
          const updated = Array.from(new Set([...seenResultIds, ...allResultIds]));
          setSeenResultIds(updated);
          localStorage.setItem(`seen_results_${currentUser.linkedStudentId}`, JSON.stringify(updated));
        }
      }
    }
    
    if (activeTab === 'homework' && relevantHomework.length > 0) {
      const allHwIds = relevantHomework.map(h => h.id);
      const isAnythingNew = allHwIds.some(id => !seenHomeworkIds.includes(id));
      if (isAnythingNew) {
        const updated = Array.from(new Set([...seenHomeworkIds, ...allHwIds]));
        setSeenHomeworkIds(updated);
        localStorage.setItem(`seen_homework_${currentUser.linkedStudentId}`, JSON.stringify(updated));
      }
    }
  }, [activeTab, studentResults, relevantHomework, studentAnnualRecord, annualSeen, currentUser.linkedStudentId]);

  const studentExams = useMemo(() => {
      if (!student) return [];
      return exams.filter(e => e.className === student.className && e.published && e.timetable && e.timetable.length > 0)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [exams, student]);

  const attendanceStats = useMemo(() => {
      if (!student) return { present: 0, total: 0, percentage: 0 };
      const records = attendance.filter(r => r.studentId === student.id);
      const present = records.filter(r => r.present).length;
      const total = records.length;
      return { present, total, percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0 };
  }, [attendance, student]);

  const storedHolidays: Holiday[] = useMemo(() => {
      try {
          const saved = localStorage.getItem('et_holidays');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  }, []);

  const checkHoliday = (dateStr: string) => storedHolidays.find(h => h.endDate ? (dateStr >= h.date && dateStr <= h.endDate) : h.date === dateStr);

  const getNextClass = (currentClass: string): string => {
      if (currentClass === 'Nursery') return 'Jr. KG';
      if (currentClass === 'Jr. KG') return 'Sr. KG';
      if (currentClass === 'Sr. KG') return 'Class 1';
      if (currentClass.startsWith('Class ')) {
          const num = parseInt(currentClass.replace('Class ', ''));
          if (num === 10) return 'Alumni';
          return `Class ${num + 1}`;
      }
      return 'Next Standard';
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
  };

  const handleDownloadPDF = async () => {
    if (!student || !studentAnnualRecord) return;
    setIsDownloading(true);

    const h2p = (html2pdf as any).default || html2pdf;
    if (typeof h2p !== 'function') {
        console.error("html2pdf library resolution failed.");
        setIsDownloading(false);
        return;
    }

    const record = studentAnnualRecord;
    const defaults = getSubjectsForClass(student.className, student.medium || 'English').map(s => s.name);
    const combinedSubjects = new Set([...defaults, ...(record.customSubjects || [])]);
    const subjects = Array.from(combinedSubjects);
    
    const nextClass = getNextClass(student.className);
    const schoolName = student.medium === 'Semi' ? 'INDRAYANI INTERNATIONAL SCHOOL' : 'INDRAYANI ENGLISH MEDIUM SCHOOL';
    const trustName = "SHREE GANESH EDUCATION ACADEMY";
    const address = "Sector 18, Plot No. 23, 24, 25, 26, Koparkhairane, Navi Mumbai 400709.";
    const contact = "Ph No. 8425919111 / 8422019111";

    const rows = subjects.map(sub => `
        <tr>
            <td class="subject-cell">${sub}</td>
            <td>${record.sem1Grades?.[sub] || '-'}</td>
            <td>${record.sem2Grades?.[sub] || '-'}</td>
        </tr>
    `).join('');

    const htmlContent = `
        <div class="report-page">
            <div class="header">
                <div class="trust-name">${trustName}</div>
                <div class="school-name">${schoolName}</div>
                <div class="address">${address}</div>
                <div class="contact">${contact}</div>
                <div class="report-title">ANNUAL PROGRESS REPORT (2024-25)</div>
            </div>
            
            <div class="student-info">
                <div class="info-item"><span class="label">NAME:</span>${student.name.toUpperCase()}</div>
                <div class="info-item"><span class="label">ROLL NO:</span>${student.rollNo}</div>
                <div class="info-item"><span class="label">CLASS:</span>${student.className.toUpperCase()}</div>
                <div class="info-item"><span class="label">MEDIUM:</span>${(student.medium || 'English').toUpperCase()}</div>
            </div>

            <div class="section-title">Academic Performance</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50%;">Subject</th>
                        <th>Semester 1</th>
                        <th>Semester 2</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div class="section-title">Co-Scholastic & Personal Development</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50%;">Area of Evaluation</th>
                        <th>Semester 1</th>
                        <th>Semester 2</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="subject-cell">Hobbies & Interests</td>
                        <td>${record.hobbiesSem1 || '-'}</td>
                        <td>${record.hobbiesSem2 || '-'}</td>
                    </tr>
                     <tr>
                        <td class="subject-cell">Areas of Improvement</td>
                        <td>${record.improvementsSem1 || '-'}</td>
                        <td>${record.improvementsSem2 || '-'}</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-title">Class Teacher's Remarks</div>
            <div class="remarks-box">
                ${record.remarks || 'Satisfactory performance throughout the academic session.'}
            </div>

            <div class="promotion-text">
                Promoted to: ${nextClass.toUpperCase()}
            </div>

            <div class="signatures">
                <div class="sig-box">Class Teacher</div>
                <div class="sig-box">Principal</div>
                <div class="sig-box">Parent</div>
            </div>
        </div>
    `;

    const element = document.createElement('div');
    element.className = "report-wrapper";
    element.innerHTML = `<style>${PDF_STYLES}</style>${htmlContent}`;

    const opt = {
        margin: 0,
        filename: `${student.name.replace(/\s+/g, '_')}_Progress_Report.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
        await h2p().set(opt).from(element).save();
    } catch (err) {
        console.error("PDF Export Error:", err);
    } finally {
        setIsDownloading(false);
    }
  };

  const renderCalendar = () => {
     if (!student) return null;
     const today = new Date();
     const year = today.getFullYear();
     const month = today.getMonth();
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     const firstDay = new Date(year, month, 1).getDay();

     const days = [];
     for(let i=0; i<firstDay; i++) days.push(<div key={`e-${i}`} className="h-10"></div>);

     for(let d=1; d<=daysInMonth; d++) {
         const dateObj = new Date(year, month, d);
         const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
         const record = attendance.find(r => r.studentId === student.id && r.date === dateStr);
         const isSunday = dateObj.getDay() === 0;
         const isHoliday = checkHoliday(dateStr);

         let bgClass = 'bg-slate-50 text-slate-400';
         if (isHoliday) bgClass = 'bg-rose-100 text-rose-700 font-bold border border-rose-200';
         else if (isSunday) bgClass = 'bg-amber-100 text-amber-700 font-bold border border-amber-200';
         else if (record) bgClass = record.present ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-rose-100 text-rose-700 font-bold';

         days.push(
             <div key={d} className={`h-10 rounded-lg flex items-center justify-center text-xs ${bgClass} relative group`}>
                 <span>{d}</span>
                 {isHoliday && <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] p-1 rounded z-10 whitespace-nowrap">{isHoliday.name}</div>}
             </div>
         );
     }
     return (
         <div className="grid grid-cols-7 gap-2">
             {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 mb-2">{d}</div>)}
             {days}
         </div>
     );
  };

  if (!student) return null;

  const renderHomeGrid = () => {
    const modules = [
        { 
          id: 'homework', 
          label: 'My Homework', 
          desc: hasNewHomework ? "New homework posted!" : `${relevantHomework.length} assignments`, 
          icon: BookOpen, 
          color: 'bg-indigo-600', 
          badgeColor: 'bg-red-600', 
          isNew: hasNewHomework 
        },
        { id: 'exams', label: 'Exam Schedule', desc: 'Upcoming tests', icon: CalendarCheck, color: 'bg-purple-600' },
        { 
          id: 'results', 
          label: 'Report Cards', 
          desc: 'Marks & Results', 
          icon: FileBadge, 
          color: 'bg-amber-600', 
          // Prioritize Blue for Annual, then Green for Exam results
          badgeColor: hasNewAnnual ? 'bg-blue-600' : 'bg-emerald-500', 
          isNew: hasNewAnnual || hasNewResults 
        },
        { id: 'attendance', label: 'Attendance', desc: `${attendanceStats.percentage}% presence`, icon: UserCheck, color: 'bg-emerald-600' },
        { id: 'notices', label: 'Notice Board', desc: 'School updates', icon: Bell, color: 'bg-rose-600' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                    <GraduationCap size={32} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800">{student.name}</h2>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        Roll {student.rollNo} • {student.className} ({(student.medium || 'English')})
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {modules.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => handleTabChange(item.id as any)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-200 transition-all text-left group flex flex-col justify-between min-h-[140px] sm:min-h-[160px] relative active:scale-95"
                    >
                        {item.isNew && (
                          <span className={`absolute top-3 right-3 ${item.badgeColor} text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-md ring-2 ring-white animate-pulse z-10`}>
                            (NEW)
                          </span>
                        )}
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white mb-4 ${item.color} shadow-lg transition-transform group-hover:scale-110`}>
                            <item.icon size={20} className="sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors leading-tight">{item.label}</h3>
                            <p className={`text-[10px] sm:text-xs mt-1 font-bold ${item.id === 'homework' && item.isNew ? 'text-red-600' : 'text-slate-500'}`}>
                                {item.desc}
                            </p>
                        </div>
                        <div className="mt-3 flex items-center text-[10px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                             OPEN MODULE <ChevronRight size={12} className="ml-1" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
  };

  const renderHomework = () => (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-slate-800">My Homework</h2>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black uppercase">Recent Assignments</span>
          </div>
          {relevantHomework.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500"><BookOpen size={48} className="mx-auto mb-3 opacity-20"/><p className="font-bold">No homework assignments found.</p></div>
          ) : (
              relevantHomework.map(hw => (
                  <div key={hw.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{hw.subject}</span>
                          <div className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1 uppercase"><Clock size={12}/> Posted: {hw.date}</div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">{hw.title}</h3>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                         <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{hw.description}</p>
                      </div>
                  </div>
              ))
          )}
      </div>
  );

  const renderExams = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
           <h2 className="text-xl font-black text-slate-800 mb-4 uppercase tracking-tight">Exam Schedule</h2>
           {studentExams.length === 0 ? (
               <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500"><CalendarCheck size={48} className="mx-auto mb-3 opacity-20"/><p className="font-bold">No exams scheduled yet.</p></div>
           ) : (
               studentExams.map(exam => (
                   <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                       <div className="bg-slate-900 px-5 py-4 flex justify-between items-center text-white">
                           <h3 className="font-black text-sm uppercase tracking-wider">{exam.title}</h3>
                           <span className="text-[10px] font-black bg-emerald-500 px-2 py-1 rounded uppercase">{exam.type}</span>
                       </div>
                       <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm border-none">
                               <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100 text-[10px] uppercase">
                                   <tr>
                                       <th className="px-5 py-3 border-none bg-slate-50 text-slate-500">Date</th>
                                       <th className="px-5 py-3 border-none bg-slate-50 text-slate-500">Subject</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                   {exam.timetable?.map(row => (
                                       <tr key={row.id} className="hover:bg-slate-50">
                                           <td className="px-5 py-4 border-none font-mono text-xs font-bold text-slate-600">{row.date}</td>
                                           <td className="px-5 py-4 border-none font-bold text-slate-800">{row.subject}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </div>
               ))
           )}
      </div>
  );

  const renderResults = () => {
      const record = studentAnnualRecord;
      const defaults = student ? getSubjectsForClass(student.className, student.medium || 'English').map(s => s.name) : [];
      const annualSubjects = record ? Array.from(new Set([...defaults, ...(record.customSubjects || [])])) : [];
      
      return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-black text-slate-800">Academic Progress</h2>
              {record && (
                  <button 
                    onClick={handleDownloadPDF} 
                    disabled={isDownloading} 
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <Download size={18} /> {isDownloading ? 'Generating...' : 'Download Official PDF'}
                  </button>
              )}
          </div>

          {record ? (
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                          <Award size={120} />
                      </div>
                      <div className="relative z-10">
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Annual Result Card</div>
                          <h3 className="text-3xl font-black tracking-tighter mb-1">SESSION 2024-25</h3>
                          <div className="flex items-center gap-3 mt-4">
                              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">{student.className}</div>
                              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">{(student.medium || 'English')} Medium</div>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 sm:p-8">
                      <div className="flex items-center gap-2 mb-6 text-slate-400">
                          <BookOpen size={16} />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Scholastic Performance</h4>
                      </div>
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                          <table className="w-full text-left">
                              <thead className="bg-slate-50 border-y border-slate-100">
                                  <tr>
                                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50 border-none">Subject</th>
                                      <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50 border-none">Semester 1</th>
                                      <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50 border-none">Semester 2</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {annualSubjects.map(sub => (
                                      <tr key={sub} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-5 font-bold text-slate-800">{sub}</td>
                                          <td className="px-6 py-5 text-center font-black text-slate-400 text-lg">{record.sem1Grades?.[sub] || '-'}</td>
                                          <td className="px-6 py-5 text-center font-black text-emerald-600 text-xl">{record.sem2Grades?.[sub] || '-'}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                          <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                               <div className="flex items-center gap-2 mb-4 text-emerald-600">
                                   <Award size={18} />
                                   <h4 className="text-[10px] font-black uppercase tracking-widest">Hobbies & Interests</h4>
                               </div>
                               <div className="space-y-4">
                                   <div>
                                       <span className="text-[9px] font-black text-slate-400 uppercase">Term 1</span>
                                       <p className="text-sm font-medium text-slate-700 mt-1">{record.hobbiesSem1 || 'N/A'}</p>
                                   </div>
                                   <div className="pt-3 border-t border-slate-200">
                                       <span className="text-[9px] font-black text-slate-400 uppercase">Term 2</span>
                                       <p className="text-sm font-medium text-slate-700 mt-1">{record.hobbiesSem2 || 'N/A'}</p>
                                   </div>
                               </div>
                          </div>
                          
                          <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                               <div className="flex items-center gap-2 mb-4 text-amber-600">
                                   <Award size={18} />
                                   <h4 className="text-[10px] font-black uppercase tracking-widest">Growth & Improvement</h4>
                               </div>
                               <div className="space-y-4">
                                   <div>
                                       <span className="text-[9px] font-black text-slate-400 uppercase">Term 1</span>
                                       <p className="text-sm font-medium text-slate-700 mt-1">{record.improvementsSem1 || 'N/A'}</p>
                                   </div>
                                   <div className="pt-3 border-t border-slate-200">
                                       <span className="text-[9px] font-black text-slate-400 uppercase">Term 2</span>
                                       <p className="text-sm font-medium text-slate-700 mt-1">{record.improvementsSem2 || 'N/A'}</p>
                                   </div>
                               </div>
                          </div>
                      </div>

                      <div className="mt-12 bg-slate-900 rounded-[1.5rem] p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                           <div className="max-w-md">
                               <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                   <Info size={16} />
                                   <span className="text-[10px] font-black uppercase tracking-widest">Teacher's Remark</span>
                               </div>
                               <p className="text-slate-300 italic text-sm leading-relaxed">"{record.remarks || 'Promoted to higher standard with good progress.'}"</p>
                           </div>
                           <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 text-center min-w-[200px]">
                               <div className="text-[10px] font-black text-emerald-400 uppercase mb-1">PROMOTED TO</div>
                               <div className="text-xl font-black">{getNextClass(student.className)}</div>
                           </div>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="space-y-6">
                  {studentResults.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300 text-slate-400">
                          <FileBadge size={64} className="mx-auto mb-4 opacity-10"/>
                          <p className="font-black uppercase tracking-widest text-xs">No Results Published Yet</p>
                      </div>
                  ) : (
                      studentExams.filter(exam => studentResults.some(r => r.examId === exam.id)).map(exam => {
                          const result = studentResults.find(r => r.examId === exam.id);
                          const subjects = getSubjectsForClass(student.className, student.medium || 'English');
                          let activeSubjects = exam.activeSubjectIds ? subjects.filter(s => exam.activeSubjectIds?.includes(s.id)) : subjects;
                          if (exam.customSubjects) activeSubjects = [...activeSubjects, ...exam.customSubjects];
                          const finalSubjects = activeSubjects.map(sub => ({ ...sub, maxMarks: exam.customMaxMarks?.[sub.id] ?? sub.maxMarks, evaluationType: exam.customEvaluationTypes?.[sub.id] ?? sub.evaluationType ?? 'marks' }));
                          let totalObtained = 0, totalMax = 0;
                          return (
                              <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                  <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
                                      <div><h3 className="font-black text-slate-800 uppercase tracking-tight">{exam.title}</h3><p className="text-[10px] text-slate-400 font-bold uppercase">{exam.type}</p></div>
                                      <div className="text-xs font-black text-emerald-700 bg-white border border-emerald-100 px-3 py-1.5 rounded-xl shadow-sm">Marksheet</div>
                                  </div>
                                  <div className="p-6">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {finalSubjects.map(sub => {
                                              const mark = result?.marks[sub.id];
                                              if (sub.evaluationType !== 'grade' && mark !== undefined) {
                                                   const numMark = parseFloat(String(mark));
                                                   if (!isNaN(numMark)) { totalObtained += numMark; totalMax += sub.maxMarks; }
                                              }
                                              return (
                                                  <div key={sub.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 bg-slate-50">
                                                      <span className="font-bold text-slate-500 text-xs uppercase">{sub.name}</span>
                                                      <span className="font-black text-slate-800">{mark ?? '-'} {!sub.evaluationType || sub.evaluationType === 'marks' ? <span className="text-slate-400 text-[10px] font-normal">/ {sub.maxMarks}</span> : ''}</span>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                      {totalMax > 0 && <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-8"><div className="text-right"><span className="block text-slate-400 text-[10px] font-black uppercase mb-1">Total</span><span className="font-black text-slate-800 text-2xl">{totalObtained} <span className="text-sm text-slate-300">/ {totalMax}</span></span></div><div className="text-right"><span className="block text-slate-400 text-[10px] font-black uppercase mb-1">Percentage</span><span className={`font-black text-2xl px-3 py-1 rounded-xl ${((totalObtained/totalMax)*100) >= 35 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>{((totalObtained/totalMax)*100).toFixed(1)}%</span></div></div>}
                                  </div>
                              </div>
                          );
                       })
                  )}
              </div>
          )}
      </div>
      );
  };

  const renderAttendance = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Attendance Record</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Session 2024-25</p></div>
              <div className="flex gap-8">
                  <div className="text-center"><div className="text-3xl font-black text-emerald-600">{attendanceStats.present}</div><div className="text-[10px] font-black text-slate-400 uppercase">Present</div></div>
                  <div className="text-center"><div className="text-3xl font-black text-rose-600">{attendanceStats.total - attendanceStats.present}</div><div className="text-[10px] font-black text-slate-400 uppercase">Absent</div></div>
                  <div className="text-center bg-emerald-50 p-2 rounded-2xl ring-4 ring-emerald-50/50"><div className="text-3xl font-black text-emerald-600">{attendanceStats.percentage}%</div><div className="text-[10px] font-black text-slate-400 uppercase">Avg</div></div>
              </div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h3 className="font-black text-slate-700 mb-6 flex items-center gap-2 uppercase tracking-widest text-xs"><Calendar size={18} className="text-emerald-600"/> Monthly Performance</h3>{renderCalendar()}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
       <header className="bg-emerald-50/80 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-emerald-200">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeTab !== 'home' && <button onClick={() => handleTabChange('home')} className="p-2.5 bg-white hover:bg-slate-100 rounded-xl text-slate-600 hover:text-emerald-700 transition-all shadow-sm active:scale-95 border border-slate-200"><Home size={22} /></button>}
            <div className="hidden sm:flex bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-100"><GraduationCap size={24} className="text-white" /></div>
            <div><h1 className="text-base sm:text-xl font-black text-slate-900 uppercase italic leading-none">Indrayani School</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden xs:flex flex-col text-right mr-2"><div className="text-sm font-black text-slate-800 leading-none">{student.name}</div><div className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mt-1">{student.className}</div></div>
            <button onClick={onLogout} className="p-2.5 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 rounded-xl transition-all shadow-sm group active:scale-95"><LogOut size={22} className="group-hover:translate-x-1 transition-transform" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 mb-20 sm:mb-0">
         {activeTab === 'home' && renderHomeGrid()}
         {activeTab === 'homework' && renderHomework()}
         {activeTab === 'exams' && renderExams()}
         {activeTab === 'results' && renderResults()}
         {activeTab === 'notices' && <div className="space-y-4">{announcements.map(notice => <div key={notice.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">Official</span><span className="text-[10px] font-bold text-slate-400">{notice.date}</span></div><h3 className="text-lg font-black text-slate-800 mb-2">{notice.title}</h3><p className="text-slate-600 text-sm">{notice.content}</p></div>)}</div>}
         {activeTab === 'attendance' && renderAttendance()}
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 shadow-lg">
          <button onClick={() => handleTabChange('home')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-emerald-700' : 'text-slate-400'}`}><LayoutDashboard size={20} /><span className="text-[9px] font-black uppercase">Home</span></button>
          <button onClick={() => handleTabChange('homework')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'homework' ? 'text-emerald-700' : 'text-slate-400'} relative`}>
            {hasNewHomework && <div className="absolute top-1 right-3 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse"></div>}
            <BookOpen size={20} /><span className="text-[9px] font-black uppercase">Study</span>
          </button>
          <button onClick={() => handleTabChange('results')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'results' ? 'text-emerald-700' : 'text-slate-400'} relative`}>
            {(hasNewResults || hasNewAnnual) && (
              <div className={`absolute top-1 right-3 w-2.5 h-2.5 ${hasNewAnnual ? 'bg-blue-500' : 'bg-emerald-500'} rounded-full border-2 border-white animate-pulse`}></div>
            )}
            <FileBadge size={20} /><span className="text-[9px] font-black uppercase">Marks</span>
          </button>
          <button onClick={() => handleTabChange('attendance')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'attendance' ? 'text-emerald-700' : 'text-slate-400'}`}><UserCheck size={20} /><span className="text-[9px] font-black uppercase">Status</span></button>
      </nav>
    </div>
  );
};

export default StudentDashboard;

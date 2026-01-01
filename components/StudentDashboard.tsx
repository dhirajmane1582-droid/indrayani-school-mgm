
import React, { useMemo, useState, useEffect } from 'react';
import { User, Student, Homework, Exam, StudentResult, AttendanceRecord, Announcement, AnnualRecord, Holiday, getSubjectsForClass } from '../types';
import { BookOpen, GraduationCap, Bell, UserCheck, CalendarCheck, FileBadge, LogOut, Download, X, RefreshCw, Loader2, Eye } from 'lucide-react';
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
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const formatResilientDate = (val: any): string => {
    if (!val) return '-';
    const num = Number(val);
    if (!isNaN(num) && num > 10000 && num < 100000) {
        try {
            const date = new Date((num - 25569) * 86400 * 1000);
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return val.toString();
        }
    }
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    } catch (e) {}
    return val.toString();
};

const PDF_STYLES_STRETCH_COLOR = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
    .pdf-container {
        width: 210mm;
        height: 297mm;
        padding: 5mm;
        background: #ffffff !important;
        margin: 0 auto;
        font-family: 'Times New Roman', Times, serif;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    .page-border {
        border: 4px double #000000;
        height: 100%;
        width: 100%;
        padding: 6mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff !important;
    }
    .header { text-align: center; position: relative; margin-bottom: 8px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff !important; }
    .logo-container { 
        position: absolute; 
        top: 0; 
        left: 0; 
        width: 85px; 
        height: 85px; 
        padding: 5px; 
        background: #ffffff !important; 
        border-radius: 12px; 
        border: 1.5px solid #e2e8f0; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        z-index: 10;
    }
    .logo-img { width: 100%; height: 100%; object-fit: contain; background: #ffffff !important; display: block; }
    .school-group { font-size: 13px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #000000; }
    .school-name { font-size: 26px; font-weight: 900; text-transform: uppercase; color: #f97316; margin: 0; line-height: 1; }
    .school-details { font-size: 10px; margin-top: 5px; font-weight: 800; color: #374151; }
    .report-badge { 
        margin-top: 10px; 
        font-size: 16px; 
        font-weight: 900; 
        text-transform: uppercase; 
        border: 2px solid #000000; 
        display: inline-block; 
        padding: 5px 45px;
        background: #f8fafc;
        color: #000000;
        border-radius: 6px;
    }

    .student-info-box { 
        border: 2px solid #000000; 
        margin-top: 15px; 
        padding: 15px; 
        display: grid; 
        grid-template-columns: 1.2fr 0.8fr; 
        gap: 10px 35px; 
        font-size: 14px;
        background: #ffffff;
        border-radius: 12px;
    }
    .field-row { display: flex; align-items: baseline; }
    .field-label { font-weight: 900; min-width: 120px; text-transform: uppercase; font-size: 11px; color: #475569; }
    .field-value { border-bottom: 2px solid #000000; flex: 1; font-weight: bold; color: #000000; padding-left: 5px; }

    .main-grades-section { flex-grow: 4; display: flex; flex-direction: column; margin: 20px 0; min-height: 0; background: #ffffff !important; }
    .grades-table { width: 100%; border-collapse: collapse; height: 100%; }
    .grades-table th { background: #1e293b; color: #ffffff !important; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 2px solid #000000; padding: 12px 5px; }
    .grades-table td { border: 2px solid #000000; padding: 8px 5px; text-align: center; font-size: 13px; font-weight: bold; color: #000; }
    .sub-name { text-align: left; padding-left: 20px; font-size: 13px; color: #000000; }
    .grade-val { color: #000000; font-weight: 900; }
    .perc-row { background: #f8fafc !important; }
    .perc-row td { font-size: 14px; font-weight: 900; padding: 12px; border-top: 3px solid #000; }

    .remarks-section { flex-grow: 2.5; margin-bottom: 15px; display: flex; flex-direction: column; min-height: 0; background: #ffffff !important; }
    .remarks-grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 2.5px solid #000000; border-radius: 10px; overflow: hidden; height: 100%; }
    .remarks-grid-table th, .remarks-grid-table td { border: 1.5px solid #000000; padding: 10px; font-size: 13px; vertical-align: top; color: #000; }
    .remarks-grid-table th { background: #1e293b; color: #ffffff !important; text-transform: uppercase; font-weight: 900; font-size: 11px; }
    .criteria-label { font-weight: 900; background: #f8fafc !important; width: 170px; text-transform: uppercase; font-size: 10px; color: #475569; vertical-align: middle; }
    .remarks-text-cell { line-height: 1.4; color: #000000; font-style: italic; font-weight: 600; }

    .grade-key-row { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .grade-key-row td { border: 1.5px solid #000000; font-size: 10px; padding: 6px; text-align: center; font-weight: bold; color: #000000; background: #ffffff !important; }

    .result-ribbon { 
        border: 3px solid #000000; 
        padding: 15px; 
        text-align: center; 
        background: #f8fafc !important;
        margin-bottom: 20px;
        border-radius: 15px;
    }
    .result-main { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #000000; }
    .result-main span { color: #f97316; }
    .reopening { font-size: 11px; font-weight: bold; color: #374151; margin-top: 5px; }

    .signatures-row { display: flex; justify-content: space-between; padding: 0 20px; margin-top: 15px; }
    .sig-block { width: 220px; border-top: 3px solid #000000; text-align: center; padding-top: 8px; font-weight: 900; font-size: 13px; text-transform: uppercase; color: #000000; }
`;

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser, onLogout, students, homework, exams, results, attendance, announcements, annualRecords = [], onRefresh, isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'homework' | 'exams' | 'results' | 'attendance' | 'notices'>('home');
  const [isDownloading, setIsDownloading] = useState(false);
  const student = useMemo(() => students.find(s => s.id === currentUser.linkedStudentId), [students, currentUser]);
  const studentAnnualRecord = useMemo(() => student ? annualRecords.find(r => r.studentId === student.id && r.published) || null : null, [annualRecords, student]);

  // Seen state tracking for notifications
  const [seenHomeworkIds, setSeenHomeworkIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`seen_hw_${currentUser.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [seenResultIds, setSeenResultIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`seen_res_${currentUser.id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem(`seen_hw_${currentUser.id}`, JSON.stringify(Array.from(seenHomeworkIds)));
  }, [seenHomeworkIds, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`seen_res_${currentUser.id}`, JSON.stringify(Array.from(seenResultIds)));
  }, [seenResultIds, currentUser.id]);

  const homeworkForClass = useMemo(() => {
    if (!student) return [];
    return homework.filter(h => h.className === student.className);
  }, [homework, student]);

  const resultsForStudent = useMemo(() => {
    if (!student) return [];
    return results.filter(r => r.studentId === student.id && r.published);
  }, [results, student]);

  const hasNewHomework = useMemo(() => {
    return homeworkForClass.some(h => !seenHomeworkIds.has(h.id));
  }, [homeworkForClass, seenHomeworkIds]);

  const hasNewResults = useMemo(() => {
    return resultsForStudent.some(r => !seenResultIds.has(r.id));
  }, [resultsForStudent, seenResultIds]);

  const handleOpenHomework = () => {
    setActiveTab('homework');
    const newSeen = new Set(seenHomeworkIds);
    homeworkForClass.forEach(h => newSeen.add(h.id));
    setSeenHomeworkIds(newSeen);
  };

  const handleOpenResults = () => {
    setActiveTab('results');
    const newSeen = new Set(seenResultIds);
    resultsForStudent.forEach(r => newSeen.add(r.id));
    setSeenResultIds(newSeen);
  };

  const attendancePercentage = useMemo(() => {
    if (!student) return '0.0';
    const records = attendance.filter(r => r.studentId === student.id);
    if (records.length === 0) return '100.0';
    const presentCount = records.filter(r => r.present).length;
    return ((presentCount / records.length) * 100).toFixed(1);
  }, [attendance, student]);

  const generatePDFContent = () => {
    if (!student || !studentAnnualRecord) return '';
    const record = studentAnnualRecord;
    const className = student.className;
    const medium = student.medium || 'English';
    const subjects = Array.from(new Set([...getSubjectsForClass(className, medium as 'English' | 'Semi').map(s => s.name), ...(record.customSubjects || [])]));
    const schoolName = medium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
    const nextClass = className.startsWith('Class ') ? `Class ${parseInt(className.replace('Class ', '')) + 1}` : className === 'Sr. KG' ? 'Class 1' : 'Next Grade';

    const rows = subjects.map((sub, i) => `
        <tr>
            <td style="width:45px;">${i+1}</td>
            <td class="sub-name">${sub}</td>
            <td class="grade-val">${record.sem1Grades?.[sub] || '-'}</td>
            <td class="grade-val">${record.sem2Grades?.[sub] || '-'}</td>
        </tr>
    `).join('');

    return `
      <div class="pdf-container">
          <div class="page-border">
              <div class="header">
                  <div class="logo-container">
                      <img 
                        src="https://i.ibb.co/R4t9Jhc1/LOGO-IN.png" 
                        crossorigin="anonymous" 
                        class="logo-img" 
                      />
                  </div>
                  <p class="school-group">Shree Ganesh Education Academy's</p>
                  <h1 class="school-name">${schoolName}</h1>
                  <p class="school-details">Academic Session: 2024-25 | Sector 18, Koparkhairane</p>
                  <div class="report-badge">Annual Progress Card</div>
              </div>

              <div class="student-info-box">
                  <div class="field-row"><span class="field-label">Student:</span><span class="field-value">${student.name.toUpperCase()}</span></div>
                  <div class="field-row"><span class="field-label">Roll No:</span><span class="field-value">${student.rollNo}</span></div>
                  <div class="field-row"><span class="field-label">Standard:</span><span class="field-value">${student.className}</span></div>
                  <div class="field-row"><span class="field-label">Date of Birth:</span><span class="field-value">${formatResilientDate(student.dob)}</span></div>
              </div>

              <div class="main-grades-section">
                  <table class="grades-table">
                      <thead>
                          <tr>
                              <th style="width:45px;">SR.</th>
                              <th class="sub-name">SUBJECTS</th>
                              <th>SEM 1 GRADE</th>
                              <th>SEM 2 GRADE</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${rows}
                          <tr class="perc-row">
                                <td colspan="2" style="text-align: right; padding-right: 20px;">OVERALL PERCENTAGE (%)</td>
                                <td colspan="2">${record.overallPercentage || '-'} %</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              <div class="remarks-section">
                  <table class="remarks-grid-table">
                      <thead>
                          <tr>
                              <th>Evaluation Criteria</th>
                              <th>First Semester</th>
                              <th>Second Semester</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr>
                              <td class="criteria-label">Special Improvements</td>
                              <td class="remarks-text-cell">${record.specialImprovementsSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.specialImprovementsSem2 || '-'}</td>
                          </tr>
                          <tr>
                              <td class="criteria-label">Hobbies & Interests</td>
                              <td class="remarks-text-cell">${record.hobbiesSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.hobbiesSem2 || '-'}</td>
                          </tr>
                          <tr>
                              <td class="criteria-label">Necessary Improvements</td>
                              <td class="remarks-text-cell">${record.necessaryImprovementSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.necessaryImprovementSem2 || '-'}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              <table class="grade-key-row">
                  <tr>
                      <td>A1: 91%+</td><td>A2: 81-90%</td><td>B1: 71-80%</td><td>B2: 61-70%</td>
                      <td>C1: 51-60%</td><td>C2: 41-50%</td><td>D: 33-40%</td><td>E: <33%</td>
                  </tr>
              </table>

              <div class="result-ribbon">
                  <div class="result-main">FINAL STATUS: <span>${record.resultStatus || 'PASS'}</span> | PROMOTED TO: <span>${nextClass}</span></div>
                  <div class="reopening">SCHOOL REOPENING DATE: 11TH JUNE 2025</div>
              </div>

              <div class="signatures-row">
                  <div class="sig-block">CLASS TEACHER</div>
                  <div class="sig-block">PRINCIPAL</div>
              </div>
          </div>
      </div>
    `;
  };

  const downloadPDF = async () => {
    setIsDownloading(true);
    const h2p = (window as any).html2pdf || html2pdf;
    if (!h2p) { setIsDownloading(false); return; }
    const lib = h2p.default || h2p;
    const element = document.createElement('div');
    element.innerHTML = `<style>${PDF_STYLES_STRETCH_COLOR}</style>${generatePDFContent()}`;
    const opt = { 
        margin: 0, 
        filename: `AnnualReport_${student?.name.replace(/\s+/g, '_')}.pdf`, 
        image: { type: 'png' }, 
        html2canvas: { 
            scale: 3, 
            useCORS: true, 
            backgroundColor: '#ffffff'
        }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    try { await lib().set(opt).from(element).save(); } catch (err) { console.error("PDF download failed", err); } finally { setIsDownloading(false); }
  };

  if (!student) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
       <header className="bg-emerald-50/50 px-6 py-4 sticky top-0 z-50 flex justify-between items-center border-b border-emerald-100/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <GraduationCap size={24}/>
             </div>
             <h1 className="font-black italic uppercase tracking-tighter text-slate-800 text-lg">Indrayani School</h1>
          </div>
          <div className="flex gap-2">
              <button 
                onClick={onRefresh} 
                className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 shadow-sm transition-all active:scale-95 ${isSyncing ? 'animate-spin' : ''}`}
              >
                  <RefreshCw size={22}/>
              </button>
              <button 
                onClick={onLogout} 
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 shadow-sm transition-all active:scale-95"
              >
                  <LogOut size={22}/>
              </button>
          </div>
       </header>

       <main className="max-w-7xl mx-auto w-full p-4 sm:p-6">
          <div className="mb-8 p-6 bg-slate-50 border border-slate-200/60 rounded-[2rem] animate-in fade-in slide-in-from-left duration-500">
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3">{student.name}</h2>
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-1.5">
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Standard:</span>
                   <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.className}</span>
                </div>
                <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-emerald-200"></div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Roll No:</span>
                   <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.rollNo}</span>
                </div>
                <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-emerald-200"></div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Medium:</span>
                   <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{student.medium || 'English'}</span>
                </div>
             </div>
          </div>

          {activeTab === 'home' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in duration-500">
                  {/* HOMEWORK CARD */}
                  <button 
                    onClick={handleOpenHomework}
                    className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative"
                  >
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                          <BookOpen size={24}/>
                      </div>
                      <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-slate-800">My Homework</h3>
                              {hasNewHomework && <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-tight animate-pulse">(NEW)</span>}
                          </div>
                          <p className={`text-xs font-bold ${hasNewHomework ? 'text-rose-500' : 'text-slate-400'}`}>
                            {hasNewHomework ? 'New homework posted!' : 'No new updates'}
                          </p>
                      </div>
                  </button>

                  <button 
                    onClick={() => setActiveTab('exams')}
                    className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative"
                  >
                      <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                          <CalendarCheck size={24}/>
                      </div>
                      <div className="flex-1 pt-0.5">
                          <h3 className="text-lg font-bold text-slate-800 mb-1">Exam Schedule</h3>
                          <p className="text-slate-500 font-medium text-xs">Upcoming tests</p>
                      </div>
                  </button>

                  {/* REPORT CARDS CARD */}
                  <button 
                    onClick={handleOpenResults}
                    className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative"
                  >
                      <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                          <FileBadge size={24}/>
                      </div>
                      <div className="flex-1 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-800">Report Cards</h3>
                            {hasNewResults && <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-tight animate-pulse">(NEW)</span>}
                          </div>
                          <p className="text-slate-500 font-medium text-xs">Marks & Results</p>
                      </div>
                  </button>

                  <button 
                    onClick={() => setActiveTab('attendance')}
                    className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative"
                  >
                      <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                          <UserCheck size={24}/>
                      </div>
                      <div className="flex-1 pt-0.5">
                          <h3 className="text-lg font-bold text-slate-800 mb-1">Attendance</h3>
                          <p className="text-slate-500 font-medium text-xs">{attendancePercentage}% presence</p>
                      </div>
                  </button>

                  <button 
                    onClick={() => setActiveTab('notices')}
                    className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-5 group relative"
                  >
                      <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shrink-0">
                          <Bell size={24}/>
                      </div>
                      <div className="flex-1 pt-0.5">
                          <h3 className="text-lg font-bold text-slate-800 mb-1">Notice Board</h3>
                          <p className="text-slate-500 font-medium text-xs">School updates</p>
                      </div>
                  </button>
              </div>
          )}

          {activeTab === 'results' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center">
                      <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><X size={20}/> Back</button>
                      {studentAnnualRecord && (<button onClick={downloadPDF} disabled={isDownloading} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">{isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16}/>} Download PDF</button>)}
                  </div>
                  {studentAnnualRecord ? (
                      <div className="bg-slate-200 p-4 sm:p-12 rounded-3xl border shadow-inner flex justify-center items-start overflow-x-auto">
                          <div className="bg-white shadow-2xl scale-75 sm:scale-90 origin-top min-w-[210mm]" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES_STRETCH_COLOR}</style>${generatePDFContent()}` }} />
                      </div>
                  ) : (
                      <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center gap-4"><Eye size={48} className="opacity-20" /><div><p className="font-black text-sm uppercase tracking-widest">Report Not Available</p><p className="text-xs font-medium">Please contact the school office if you expect a report here.</p></div></div>
                  )}
              </div>
          )}

          {activeTab === 'homework' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2"><X size={20}/> Close</button>
                  <h2 className="text-2xl font-black text-slate-800">Daily Homework</h2>
                  {homeworkForClass.length === 0 ? (<div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 italic">No homework assigned.</div>) : (homeworkForClass.map(h => (<div key={h.id} className="bg-white p-6 rounded-3xl border shadow-sm border-slate-100"><div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">{h.subject}</span><span className="text-[10px] text-slate-400 font-bold">{h.date}</span></div><h3 className="font-bold text-lg mb-2">{h.title}</h3><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{h.description}</p></div>)))}
              </div>
          )}

          {activeTab === 'notices' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2"><X size={20}/> Close</button>
                  <h2 className="text-2xl font-black text-slate-800">School Notices</h2>
                  {announcements.filter(a => a.targetClass === 'All' || a.targetClass === student.className).length === 0 ? (<div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 italic">No notices yet.</div>) : (announcements.filter(a => a.targetClass === 'All' || a.targetClass === student.className).map(a => (<div key={a.id} className="bg-white p-6 rounded-3xl border shadow-sm border-slate-100"><div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 px-2 py-1 rounded-lg">Official</span><span className="text-[10px] text-slate-400 font-bold">{a.date}</span></div><h3 className="font-bold text-lg mb-2">{a.title}</h3><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.content}</p></div>)))}
              </div>
          )}

          {activeTab === 'attendance' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2"><X size={20}/> Close</button>
                  <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-xl flex items-center justify-between">
                      <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Academic Year 2024-25</p>
                          <h2 className="text-4xl font-black mb-1">{attendancePercentage}%</h2>
                          <p className="text-sm font-bold uppercase opacity-90 tracking-tighter">Current Attendance</p>
                      </div>
                      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30"><UserCheck size={48}/></div>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-50 bg-slate-50/30 text-[10px] font-black uppercase text-slate-400 tracking-widest">Recent Records</div>
                      <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto no-scrollbar">
                          {attendance.filter(r => r.studentId === student.id).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10).map(r => (
                              <div key={r.id} className="p-4 flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${r.present ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                      <span className="font-bold text-slate-700 text-sm">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${r.present ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>{r.present ? 'Present' : 'Absent'}</span>
                              </div>
                          ))}
                          {attendance.filter(r => r.studentId === student.id).length === 0 && <div className="p-12 text-center text-slate-300 italic text-sm">No records logged yet.</div>}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'exams' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setActiveTab('home')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-2"><X size={20}/> Close</button>
                  <h2 className="text-2xl font-black text-slate-800 mb-4">Exam Schedules</h2>
                  <div className="grid grid-cols-1 gap-4">
                      {exams.filter(e => e.className === student.className).length === 0 ? (<div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 italic">No exams scheduled.</div>) : (exams.filter(e => e.className === student.className).map(e => (
                          <div key={e.id} className="bg-white p-6 rounded-3xl border shadow-sm border-slate-100">
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <span className="text-[10px] font-black uppercase bg-purple-50 text-purple-700 px-2 py-1 rounded-lg border border-purple-100">{e.type}</span>
                                      <h3 className="font-black text-xl mt-2">{e.title}</h3>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Starting Date</p>
                                      <p className="font-black text-slate-800">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                  </div>
                              </div>
                              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100/50 text-slate-500 font-black uppercase">
                                          <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Subject</th></tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {e.timetable?.map(t => (
                                              <tr key={t.id}><td className="px-4 py-3 font-bold text-slate-600">{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td><td className="px-4 py-3 font-black text-slate-800">{t.subject}</td></tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )))}
                  </div>
              </div>
          )}
       </main>
    </div>
  );
};

export default StudentDashboard;

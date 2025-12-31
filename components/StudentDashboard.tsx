
import React, { useMemo, useState, useEffect } from 'react';
import { User, Student, Homework, Exam, StudentResult, AttendanceRecord, Announcement, AnnualRecord, Holiday, getSubjectsForClass } from '../types';
import { BookOpen, Calendar, GraduationCap, Bell, UserCheck, CalendarCheck, FileBadge, LogOut, LayoutDashboard, Clock, AlertCircle, Download, X, ChevronRight, Home, Info, Award, RefreshCw, Eye, Loader2 } from 'lucide-react';
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

const PDF_STYLES_STRETCH_COLOR = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
    .pdf-container {
        width: 210mm;
        height: 297mm;
        padding: 5mm;
        background: #ffffff;
        margin: 0 auto;
        font-family: 'Times New Roman', Times, serif;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    .page-border {
        border: 4px double #e11d48;
        height: 100%;
        width: 100%;
        padding: 6mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff;
    }
    .header { text-align: center; position: relative; margin-bottom: 8px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; }
    .logo-container { 
        position: absolute; 
        top: 0; 
        left: 0; 
        width: 85px; 
        height: 85px; 
        padding: 5px; 
        background: #ffffff; 
        border-radius: 12px; 
        border: 1.5px solid #fecaca; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        z-index: 10;
    }
    .logo-img { width: 100%; height: 100%; object-fit: contain; background: #ffffff; display: block; }
    .school-group { font-size: 13px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #1e1b4b; }
    .school-name { font-size: 26px; font-weight: 900; text-transform: uppercase; color: #e11d48; margin: 0; line-height: 1; }
    .school-details { font-size: 10px; margin-top: 5px; font-weight: 800; color: #475569; }
    .report-badge { 
        margin-top: 10px; 
        font-size: 16px; 
        font-weight: 900; 
        text-transform: uppercase; 
        border: 2px solid #e11d48; 
        display: inline-block; 
        padding: 5px 45px;
        background: #fff1f2;
        color: #1e1b4b;
        border-radius: 6px;
    }

    .student-info-box { 
        border: 2px solid #e11d48; 
        margin-top: 15px; 
        padding: 15px; 
        display: grid; 
        grid-template-columns: 1.2fr 0.8fr; 
        gap: 10px 35px; 
        font-size: 13px;
        background: #fff1f2;
        border-radius: 12px;
    }
    .field-row { display: flex; align-items: baseline; }
    .field-label { font-weight: 900; min-width: 120px; text-transform: uppercase; font-size: 11px; color: #e11d48; }
    .field-value { border-bottom: 2px solid #e11d48; flex: 1; font-weight: bold; color: #1e1b4b; padding-left: 5px; }

    .main-grades-section { flex-grow: 3; display: flex; flex-direction: column; margin: 20px 0; min-height: 0; background: #ffffff; }
    .grades-table { width: 100%; border-collapse: collapse; height: 100%; }
    .grades-table th { background: #1e1b4b; color: #ffffff; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 2px solid #1e1b4b; padding: 10px 5px; }
    .grades-table td { border: 2px solid #1e1b4b; padding: 8px 5px; text-align: center; font-size: 12px; font-weight: bold; color: #000; }
    .sub-name { text-align: left; padding-left: 20px; font-size: 12px; color: #1e1b4b; }
    .grade-val { color: #e11d48; font-weight: 900; }

    .remarks-section { flex-grow: 2; margin-bottom: 15px; display: flex; flex-direction: column; min-height: 0; background: #ffffff; }
    .remarks-grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 2.5px solid #e11d48; border-radius: 10px; overflow: hidden; height: 100%; }
    .remarks-grid-table th, .remarks-grid-table td { border: 1.5px solid #e11d48; padding: 8px; font-size: 12px; vertical-align: top; color: #000; }
    .remarks-grid-table th { background: #1e1b4b; color: #ffffff; text-transform: uppercase; font-weight: 900; font-size: 11px; }
    .criteria-label { font-weight: 900; background: #fff1f2; width: 160px; text-transform: uppercase; font-size: 10px; color: #e11d48; vertical-align: middle; }
    .remarks-text-cell { line-height: 1.4; color: #1e1b4b; font-style: italic; font-weight: 600; }

    .grade-key-row { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .grade-key-row td { border: 1.5px solid #e11d48; font-size: 10px; padding: 5px; text-align: center; font-weight: bold; color: #be123c; background: #fffafb; }

    .result-ribbon { 
        border: 3px solid #e11d48; 
        padding: 12px; 
        text-align: center; 
        background: #ffffff;
        margin-bottom: 20px;
        border-radius: 15px;
        box-shadow: 0 6px 0 #e11d48;
    }
    .result-main { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #1e1b4b; }
    .result-main span { color: #e11d48; }
    .reopening { font-size: 11px; font-weight: bold; color: #475569; margin-top: 5px; }

    .signatures-row { display: flex; justify-content: space-between; padding: 0 20px; margin-top: 15px; }
    .sig-block { width: 220px; border-top: 3px solid #1e1b4b; text-align: center; padding-top: 8px; font-weight: 900; font-size: 13px; text-transform: uppercase; color: #1e1b4b; }
`;

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser, onLogout, students, homework, exams, results, attendance, announcements, annualRecords = [], onRefresh, isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'homework' | 'exams' | 'results' | 'attendance' | 'notices'>('home');
  const [isDownloading, setIsDownloading] = useState(false);
  const student = useMemo(() => students.find(s => s.id === currentUser.linkedStudentId), [students, currentUser]);
  const studentAnnualRecord = useMemo(() => student ? annualRecords.find(r => r.studentId === student.id && r.published) || null : null, [annualRecords, student]);

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
                  <div class="field-row"><span class="field-label">Date of Birth:</span><span class="field-value">${student.dob}</span></div>
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
                              <td class="criteria-label">Teacher's Observations</td>
                              <td class="remarks-text-cell">${record.specialImprovementsSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.specialImprovementsSem2 || '-'}</td>
                          </tr>
                          <tr>
                              <td class="criteria-label">Hobbies & Interests</td>
                              <td class="remarks-text-cell">${record.hobbiesSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.hobbiesSem2 || '-'}</td>
                          </tr>
                          <tr>
                              <td class="criteria-label">Areas for Growth</td>
                              <td class="remarks-text-cell">${record.necessaryImprovementSem1 || '-'}</td>
                              <td class="remarks-text-cell">${record.necessaryImprovementSem2 || '-'}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>

              <table class="grade-key-row">
                  <tr>
                      <td>A1: 91%+</td><td>A2: 81-90%</td><td>B1: 71-80%</td><td>B2: 61-70%</td>
                      <td>C1: 51-60%</td><td>C2: 41-50%</td><td>D: 33-40%</td><td>E: &lt;33%</td>
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
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: true
        }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    try { await lib().set(opt).from(element).save(); } catch (err) { console.error("PDF download failed", err); } finally { setIsDownloading(false); }
  };

  if (!student) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
       <header className="bg-emerald-600 p-4 sticky top-0 z-50 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3"><Home onClick={() => setActiveTab('home')} className="cursor-pointer" size={24}/><h1 className="font-black italic uppercase tracking-tighter">Student Portal</h1></div>
          <div className="flex gap-2">
              <button onClick={onRefresh} className={`p-2 bg-white/20 rounded-lg transition-all ${isSyncing ? 'animate-spin' : ''}`} title="Refresh Records"><RefreshCw size={20}/></button>
              <button onClick={onLogout} className="p-2 bg-white/20 rounded-lg" title="Logout"><LogOut size={20}/></button>
          </div>
       </header>
       <main className="max-w-4xl mx-auto w-full p-4">
          {activeTab === 'home' && (
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex items-center gap-4">
                      <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white"><GraduationCap size={32}/></div>
                      <div><h2 className="text-xl font-black">{student.name}</h2><p className="text-xs text-slate-400 font-bold uppercase">{student.className} • Roll {student.rollNo}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setActiveTab('results')} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col items-center gap-2 hover:bg-emerald-50 transition-colors"><FileBadge size={32} className="text-amber-600"/><span className="font-black text-xs uppercase">Annual Report</span></button>
                      <button onClick={() => setActiveTab('homework')} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col items-center gap-2 hover:bg-emerald-50 transition-colors"><BookOpen size={32} className="text-indigo-600"/><span className="font-black text-xs uppercase">Homework</span></button>
                      <button onClick={() => setActiveTab('exams')} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col items-center gap-2 hover:bg-emerald-50 transition-colors"><CalendarCheck size={32} className="text-purple-600"/><span className="font-black text-xs uppercase">Exam Schedule</span></button>
                      <button onClick={() => setActiveTab('attendance')} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col items-center gap-2 hover:bg-emerald-50 transition-colors"><UserCheck size={32} className="text-emerald-600"/><span className="font-black text-xs uppercase">Attendance</span></button>
                  </div>
              </div>
          )}
          {activeTab === 'results' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center">
                      <div><h2 className="text-2xl font-black text-slate-800">Annual Progress Card</h2><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Academic Year 2024-25</p></div>
                      {studentAnnualRecord && (<button onClick={downloadPDF} disabled={isDownloading} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">{isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16}/>} Download PDF</button>)}
                  </div>
                  {studentAnnualRecord ? (
                      <div className="bg-slate-200 p-4 sm:p-12 rounded-3xl border shadow-inner flex justify-center items-start overflow-x-auto">
                          <div className="bg-white shadow-2xl scale-75 sm:scale-90 origin-top min-w-[210mm]" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES_STRETCH_COLOR}</style>${generatePDFContent()}` }} />
                      </div>
                  ) : (
                      <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center gap-4"><Eye size={48} className="opacity-20" /><div><p className="font-black text-sm uppercase tracking-widest">Report Not Available</p><p className="text-xs font-medium">Please contact the school office if you expect a report here.</p></div><button onClick={onRefresh} className="mt-4 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all">Sync with Server</button></div>
                  )}
              </div>
          )}
          {activeTab === 'homework' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-black">Daily Homework</h2>
                  {homework.filter(h => h.className === student.className).length === 0 ? (<div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 italic">No homework assigned.</div>) : (homework.filter(h => h.className === student.className).map(h => (<div key={h.id} className="bg-white p-5 rounded-3xl border shadow-sm"><div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">{h.subject}</span><span className="text-[10px] text-slate-400 font-bold">{h.date}</span></div><h3 className="font-bold mb-2">{h.title}</h3><p className="text-sm text-slate-600">{h.description}</p></div>)))}
              </div>
          )}
       </main>
       <nav className="fixed bottom-0 inset-x-0 bg-white border-t p-3 flex justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40">
           <button onClick={() => setActiveTab('home')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-emerald-600' : 'text-slate-400'}`}><Home size={22}/><span className="text-[8px] font-black uppercase">Home</span></button>
           <button onClick={() => setActiveTab('results')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'results' ? 'text-emerald-600' : 'text-slate-400'}`}><FileBadge size={22}/><span className="text-[8px] font-black uppercase">Report</span></button>
           <button onClick={() => setActiveTab('homework')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'homework' ? 'text-emerald-600' : 'text-slate-400'}`}><BookOpen size={22}/><span className="text-[8px] font-black uppercase">Work</span></button>
           <button onClick={() => setActiveTab('attendance')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'attendance' ? 'text-emerald-600' : 'text-slate-400'}`}><UserCheck size={22}/><span className="text-[8px] font-black uppercase">Status</span></button>
       </nav>
    </div>
  );
};

export default StudentDashboard;

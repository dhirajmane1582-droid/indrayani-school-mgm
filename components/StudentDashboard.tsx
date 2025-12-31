
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

const PDF_STYLES_COLOR = `
    @page { size: A4; margin: 0; }
    .report-wrapper { background: #fff; padding: 0; margin: 0; width: 210mm; height: 297mm; }
    .report-page { 
        font-family: 'Inter', 'Segoe UI', Tahoma, sans-serif; 
        padding: 10mm; 
        width: 210mm; 
        height: 297mm; 
        box-sizing: border-box; 
        color: #1e1b4b;
        background: #fff;
        border: 12px double #e11d48;
        margin: auto;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    .header-box { display: flex; align-items: center; margin-bottom: 15px; border-bottom: 3px solid #1e1b4b; padding-bottom: 12px; position: relative; }
    .logo-container { width: 75px; height: 75px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 12px; margin-right: 15px; border: 1px solid #fecaca; padding: 5px; }
    .logo-img { width: 100%; height: 100%; object-fit: contain; }
    
    .header-text { flex: 1; text-align: center; }
    .trust-name { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e1b4b; margin-bottom: 3px; letter-spacing: 0.5px; }
    .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #e11d48; margin-bottom: 5px; line-height: 1; }
    .udise { font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px; }
    .address { font-size: 9px; color: #1e1b4b; font-weight: 800; text-transform: uppercase; background: #fff7ed; border-top: 1.5px solid #1e1b4b; border-bottom: 1.5px solid #1e1b4b; padding: 3px 0; }
    .progress-card-title { font-size: 15px; font-weight: 900; margin-top: 8px; text-transform: uppercase; color: #1e1b4b; text-decoration: underline; text-underline-offset: 4px; }
    
    .student-info { margin-top: 15px; margin-bottom: 15px; font-size: 12px; background: #fff1f2; padding: 12px; border-radius: 10px; border: 1.5px solid #e11d48; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-item { display: flex; align-items: center; }
    .info-label { font-weight: 900; width: 150px; color: #e11d48; text-transform: uppercase; font-size: 11px; }
    .info-value { font-weight: 800; color: #1e1b4b; border-bottom: 1px dashed #e11d48; flex: 1; padding-left: 5px; }

    .tables-container { display: flex; gap: 12px; margin-bottom: 15px; }
    .semester-table-box { flex: 1; border: 1.5px solid #1e1b4b; border-radius: 8px; overflow: hidden; }
    .table-title { font-weight: 900; text-align: center; padding: 5px; font-size: 11px; text-transform: uppercase; background: #1e1b4b; color: #fff; }
    
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #1e1b4b; padding: 5px 3px; text-align: center; }
    th { font-weight: bold; text-transform: uppercase; font-size: 10px; background: #fef2f2; color: #e11d48; }
    .subject-cell { text-align: left; padding-left: 8px; font-weight: 800; color: #1e1b4b; }
    .grade-val { font-weight: 900; color: #e11d48; }
    
    .remarks-wrapper { border: 1.5px solid #1e1b4b; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
    .remarks-title { font-weight: 900; text-align: center; background: #1e1b4b; color: #fff; padding: 5px; font-size: 11px; text-transform: uppercase; }
    .remarks-table { width: 100%; border-collapse: collapse; }
    .remarks-table th { background: #fefce8; color: #854d0e; font-size: 9px; padding: 3px; border: 1px solid #1e1b4b; }
    .remarks-table td { height: 50px; vertical-align: top; padding: 6px; font-size: 11px; font-weight: 500; border: 1px solid #1e1b4b; text-align: left; line-height: 1.3; }

    .grade-key { margin-bottom: 15px; border: 1.5px solid #1e1b4b; border-radius: 6px; overflow: hidden; }
    .key-header { background: #fef2f2; color: #e11d48; padding: 3px 8px; font-size: 10px; font-weight: 900; border-bottom: 1px solid #1e1b4b; }
    .key-grid { display: flex; font-size: 10px; font-weight: 800; text-align: center; }
    .key-cell { flex: 1; border-right: 1px solid #1e1b4b; padding: 4px 2px; }
    .key-cell:last-child { border-right: 0; }

    .result-footer { text-align: center; margin-top: auto; padding: 12px; background: #fdf2f8; border-radius: 12px; border: 2px solid #e11d48; }
    .result-line { font-weight: 900; margin-bottom: 3px; text-transform: uppercase; font-size: 13px; color: #1e1b4b; }
    .result-line span { color: #e11d48; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 10px; }
    .sig-box { text-align: center; border-top: 2px solid #1e1b4b; width: 180px; padding-top: 6px; font-size: 11px; font-weight: 900; color: #1e1b4b; }
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

    const subRows1 = subjects.map((sub, i) => `<tr><td style="width:30px;">${i+1}</td><td class="subject-cell">${sub}</td><td class="grade-val" style="width:55px;">${record.sem1Grades?.[sub] || '-'}</td></tr>`).join('');
    const subRows2 = subjects.map((sub, i) => `<tr><td style="width:30px;">${i+1}</td><td class="subject-cell">${sub}</td><td class="grade-val" style="width:55px;">${record.sem2Grades?.[sub] || '-'}</td></tr>`).join('');

    return `
      <div class="report-page">
          <div class="header-box">
              <div class="logo-container">
                <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" class="logo-img" alt="Logo" />
              </div>
              <div class="header-text">
                  <div class="trust-name">SHREE GANESH EDUCATION ACADEMY'S</div>
                  <div class="school-name">${schoolName}</div>
                  <div class="udise">UDISE :- PRI : 27211003415, SEC : 27211003417</div>
                  <div class="address">SECTOR 18, NEAR GARDEN, KOPARKHAIRANE, NAVI MUMBAI. PH: 8425919111</div>
                  <div class="progress-card-title">PROGRESS CARD 2024-25</div>
              </div>
          </div>
          
          <div class="student-info">
              <div class="info-item"><span class="info-label">Name of the Student :</span><span class="info-value">${student.name.toUpperCase()}</span></div>
              <div class="info-item"><span class="info-label">Roll no :</span><span class="info-value">${student.rollNo}</span></div>
              <div class="info-item"><span class="info-label">Standard :</span><span class="info-value">${student.className}</span></div>
              <div class="info-item"><span class="info-label">DOB :</span><span class="info-value">${student.dob}</span></div>
          </div>

          <div class="tables-container">
              <div class="semester-table-box">
                  <div class="table-title">First Semester Grades</div>
                  <table>
                      <thead><tr><th>Sr.no</th><th>Subject</th><th>Grade</th></tr></thead>
                      <tbody>${subRows1}</tbody>
                  </table>
              </div>
              <div class="semester-table-box">
                  <div class="table-title">Second Semester Grades</div>
                  <table>
                      <thead><tr><th>Sr.no</th><th>Subject</th><th>Grade</th></tr></thead>
                      <tbody>${subRows2}</tbody>
                  </table>
              </div>
          </div>

          <div class="remarks-wrapper">
              <div class="remarks-title">Descriptive Remarks</div>
              <table class="remarks-table">
                  <thead>
                      <tr><th colspan="3" style="background:#fff1f2;">Semester 1 Outcomes</th><th colspan="3" style="background:#ecfdf5;">Semester 2 Outcomes</th></tr>
                      <tr>
                          <th>Special Imp.</th><th>Hobbies</th><th>Necessary Imp.</th>
                          <th>Special Imp.</th><th>Hobbies</th><th>Necessary Imp.</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td>${record.specialImprovementsSem1 || ''}</td><td>${record.hobbiesSem1 || ''}</td><td>${record.necessaryImprovementSem1 || ''}</td>
                          <td>${record.specialImprovementsSem2 || ''}</td><td>${record.hobbiesSem2 || ''}</td><td>${record.necessaryImprovementSem2 || ''}</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          <div class="grade-key">
              <div class="key-header">Evaluation Grade Key</div>
              <div class="key-grid">
                  <div class="key-cell">91%+ <br/> A1</div><div class="key-cell">81-90% <br/> A2</div>
                  <div class="key-cell">71-80% <br/> B1</div><div class="key-cell">61-70% <br/> B2</div>
                  <div class="key-cell">51-60% <br/> C1</div><div class="key-cell">41-50% <br/> C2</div>
                  <div class="key-cell">33-40% <br/> D</div><div class="key-cell">Below 33% <br/> E</div>
              </div>
          </div>

          <div class="result-footer">
              <div class="result-line">FINAL RESULT : <span>${record.resultStatus || 'PASS'}</span></div>
              <div class="result-line">PROMOTED TO : <span>${nextClass}</span></div>
              <div class="result-line">REOPENING DATE : 11th JUNE 2025</div>
              <div class="signatures">
                  <div class="sig-box">CLASS TEACHER</div>
                  <div class="sig-box">PRINCIPAL</div>
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
    element.innerHTML = `<style>${PDF_STYLES_COLOR}</style>${generatePDFContent()}`;
    const opt = { 
        margin: 0, 
        filename: `AnnualReport_${student?.name.replace(/\s+/g, '_')}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 }, 
        html2canvas: { scale: 3, useCORS: true }, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    try {
        await lib().set(opt).from(element).save();
    } catch (err) {
        console.error("PDF download failed", err);
    } finally {
        setIsDownloading(false);
    }
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
          {isSyncing && (
              <div className="mb-4 bg-emerald-50 border border-emerald-100 p-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                  <RefreshCw size={12} className="animate-spin" /> Synchronizing...
              </div>
          )}

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
                      <div>
                          <h2 className="text-2xl font-black text-slate-800">Annual Progress Card</h2>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Academic Year 2024-25</p>
                      </div>
                      {studentAnnualRecord && (
                          <button onClick={downloadPDF} disabled={isDownloading} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                              {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16}/>} Save Colorful PDF
                          </button>
                      )}
                  </div>

                  {studentAnnualRecord ? (
                      <div className="bg-slate-200 p-4 sm:p-12 rounded-3xl border shadow-inner flex justify-center items-start overflow-x-auto">
                          <div className="bg-white shadow-2xl scale-75 sm:scale-100 origin-top min-w-[210mm]" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES_COLOR}</style>${generatePDFContent()}` }} />
                      </div>
                  ) : (
                      <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center gap-4">
                          <Eye size={48} className="opacity-20" />
                          <div>
                              <p className="font-black text-sm uppercase tracking-widest">Report Not Available</p>
                              <p className="text-xs font-medium">Please contact the school office if you expect a report here.</p>
                          </div>
                          <button onClick={onRefresh} className="mt-4 px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all">Sync with Server</button>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'homework' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-black">Daily Homework</h2>
                  {homework.filter(h => h.className === student.className).length === 0 ? (
                      <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 italic">No homework assigned.</div>
                  ) : (
                      homework.filter(h => h.className === student.className).map(h => (
                        <div key={h.id} className="bg-white p-5 rounded-3xl border shadow-sm"><div className="flex justify-between mb-2"><span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">{h.subject}</span><span className="text-[10px] text-slate-400 font-bold">{h.date}</span></div><h3 className="font-bold mb-2">{h.title}</h3><p className="text-sm text-slate-600">{h.description}</p></div>
                      ))
                  )}
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

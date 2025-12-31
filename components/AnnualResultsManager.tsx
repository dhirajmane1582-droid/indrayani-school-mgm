
import React, { useState, useMemo } from 'react';
import { Student, AnnualRecord, SPECIFIC_CLASSES, getSubjectsForClass, Exam, CustomFieldDefinition } from '../types';
import { ChevronLeft, Search, CheckCircle2, FileText, X, Download, Eye, Edit3, Loader2, AlertTriangle, Printer, RefreshCw, CheckSquare, Square, Globe, GlobeLock } from 'lucide-react';
import { dbService } from '../services/db';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface AnnualResultsManagerProps {
  students: Student[];
  annualRecords: AnnualRecord[];
  setAnnualRecords: React.Dispatch<React.SetStateAction<AnnualRecord[]>>;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  exams: Exam[];
  customFieldDefs: CustomFieldDefinition[];
}

const PDF_STYLES_BW = `
    @page { size: A4; margin: 0; }
    .report-wrapper { background-color: #fff; padding: 0; margin: 0; width: 210mm; height: 297mm; box-sizing: border-box; }
    .report-page { 
        font-family: 'Inter', 'Arial', sans-serif; 
        padding: 8mm; 
        width: 210mm; 
        height: 297mm; 
        box-sizing: border-box; 
        color: #000;
        background: #fff;
        border: 4px double #000;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    .header-box { display: flex; align-items: center; justify-content: center; margin-bottom: 8px; border-bottom: 1.5px solid #000; padding-bottom: 8px; position: relative; }
    .logo-placeholder { position: absolute; left: 0; width: 60px; height: 60px; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; text-align: center; }
    .header-text { text-align: center; flex: 1; }
    .trust-name { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    .school-name { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
    .udise { font-size: 10px; font-weight: bold; margin-bottom: 4px; }
    .address { font-size: 9px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; }
    .progress-card-title { font-size: 13px; font-weight: 900; margin-top: 8px; text-transform: uppercase; }
    
    .student-details { margin-top: 10px; margin-bottom: 12px; font-size: 12px; line-height: 1.6; }
    .detail-row { display: flex; margin-bottom: 2px; }
    .detail-label { font-weight: bold; width: 160px; }
    .detail-value { flex: 1; font-weight: bold; border-bottom: 1px dotted #000; }

    .section-title { font-weight: 900; text-align: center; font-size: 11px; text-transform: uppercase; margin: 8px 0 4px 0; text-decoration: underline; }

    .tables-flex { display: flex; gap: 10px; width: 100%; margin-bottom: 12px; }
    .semester-box { flex: 1; }
    .table-header-sm { font-weight: bold; text-align: center; border: 1px solid #000; border-bottom: 0; padding: 2px; font-size: 10px; text-transform: uppercase; background: #eee; }
    
    table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000; }
    th, td { border: 1px solid #000; padding: 4px 2px; text-align: center; color: #000; }
    th { font-weight: bold; text-transform: uppercase; font-size: 10px; background: #f9f9f9; }
    .sub-col { text-align: left; padding-left: 6px; font-weight: bold; }
    
    .remarks-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
    .remarks-table th { font-size: 9px; padding: 2px; }
    .remarks-table td { height: 45px; vertical-align: top; padding: 4px; font-size: 10px; text-align: left; }

    .grade-key-container { margin-top: 10px; border: 1px solid #000; }
    .grade-key-title { font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 2px 5px; border-bottom: 1px solid #000; background: #eee; }
    .grade-key-row { display: flex; font-size: 9px; font-weight: bold; }
    .key-item { flex: 1; border-right: 1px solid #000; text-align: center; padding: 2px; }
    .key-item:last-child { border-right: 0; }

    .footer-section { margin-top: auto; padding-top: 15px; text-align: center; font-size: 12px; }
    .footer-line { font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
    .sig-container { display: flex; justify-content: space-between; margin-top: 30px; padding: 0 10px; }
    .sig-box { border-top: 1.5px solid #000; width: 160px; text-align: center; padding-top: 5px; font-weight: 900; font-size: 11px; }
`;

const AnnualResultsManager: React.FC<AnnualResultsManagerProps> = ({
  students,
  annualRecords,
  setAnnualRecords,
  selectedClass,
  setSelectedClass,
  exams,
  customFieldDefs
}) => {
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewData, setPreviewData] = useState<{student: Student, record: AnnualRecord} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    const [className, medium] = selectedClass.split('|');
    let list = students.filter(s => s.className === className && (s.medium || 'English') === medium);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, selectedClass, searchQuery]);

  const editingStudent = useMemo(() => {
    return students.find(s => s.id === editingStudentId) || null;
  }, [students, editingStudentId]);

  const getRecord = (studentId: string) => {
      return annualRecords.find(r => r.studentId === studentId) || {
        studentId, academicYear: '2024-25', grades: {}, sem1Grades: {}, sem2Grades: {}, remarks: '',
        hobbies: '', hobbiesSem1: '', hobbiesSem2: '', improvements: '', improvementsSem1: '', improvementsSem2: '',
        specialImprovementsSem1: '', specialImprovementsSem2: '', necessaryImprovementSem1: '', necessaryImprovementSem2: '',
        resultStatus: 'PASS', customSubjects: [], published: false
      };
  };

  const handleRecordChange = (studentId: string, field: keyof AnnualRecord, value: any, nestedKey?: string) => {
      setAnnualRecords(prev => {
          const idx = prev.findIndex(r => r.studentId === studentId);
          let rec = idx >= 0 ? { ...prev[idx] } : { ...getRecord(studentId) };
          if (nestedKey) {
             // @ts-ignore
             rec[field] = { ...rec[field], [nestedKey]: value };
          } else {
             // @ts-ignore
             rec[field] = value;
          }
          const newArr = [...prev];
          if (idx >= 0) {
              newArr[idx] = rec;
          } else {
              newArr.push(rec);
          }
          return newArr;
      });
  };

  const handleBulkPublish = async (pub: boolean) => {
      if (selectedStudentIds.size === 0) {
          alert("Please select students first.");
          return;
      }
      
      setIsSyncing(true);
      const updatedRecords = [...annualRecords];
      
      selectedStudentIds.forEach(sid => {
          const idx = updatedRecords.findIndex(r => r.studentId === sid);
          if (idx >= 0) {
              updatedRecords[idx] = { ...updatedRecords[idx], published: pub };
          } else {
              updatedRecords.push({
                  ...getRecord(sid),
                  published: pub
              });
          }
      });

      setAnnualRecords(updatedRecords);
      try {
          await dbService.putAll('annualRecords', updatedRecords);
          setSelectedStudentIds(new Set());
      } finally {
          setIsSyncing(false);
      }
  };

  const toggleStudentSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelection = new Set(selectedStudentIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedStudentIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
        setSelectedStudentIds(new Set());
    } else {
        setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      try {
          await dbService.putAll('annualRecords', annualRecords);
      } finally {
          setIsSyncing(false);
      }
  };

  const generatePDFContent = (student: Student, record: AnnualRecord) => {
      const className = student.className;
      const medium = student.medium || 'English';
      const subjects = Array.from(new Set([...getSubjectsForClass(className, medium as 'English' | 'Semi').map(s => s.name), ...(record.customSubjects || [])]));
      const schoolName = medium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
      const nextClass = className.startsWith('Class ') ? `Class ${parseInt(className.replace('Class ', '')) + 1}` : className === 'Sr. KG' ? 'Class 1' : 'Next Grade';

      const subRows1 = subjects.map((sub, i) => `<tr><td style="width:30px;">${i+1}</td><td class="sub-col">${sub}</td><td style="width:50px;">${record.sem1Grades?.[sub] || '-'}</td></tr>`).join('');
      const subRows2 = subjects.map((sub, i) => `<tr><td style="width:30px;">${i+1}</td><td class="sub-col">${sub}</td><td style="width:50px;">${record.sem2Grades?.[sub] || '-'}</td></tr>`).join('');

      return `
        <div class="report-page">
            <div class="header-box">
                <div class="logo-placeholder">LOGO</div>
                <div class="header-text">
                    <div class="trust-name">SHREE GANESH EDUCATION ACADEMY'S</div>
                    <div class="school-name">${schoolName}</div>
                    <div class="udise">UDISE :- PRI : 27211003415, SEC : 27211003417</div>
                    <div class="address">SECTOR 18, NEAR GARDEN, KOPARKHAIRANE, NAVI MUMBAI. PH: 8425919111</div>
                    <div class="progress-card-title">PROGRESS CARD 2024-25</div>
                </div>
            </div>

            <div class="student-details">
                <div class="detail-row"><span class="detail-label">Name of the Student :</span><span class="detail-value">${student.name.toUpperCase()}</span></div>
                <div class="detail-row"><span class="detail-label">Standard :</span><span class="detail-value">${student.className}</span></div>
                <div class="detail-row"><span class="detail-label">Roll no :</span><span class="detail-value">${student.rollNo}</span></div>
                <div class="detail-row"><span class="detail-label">DOB :</span><span class="detail-value">${student.dob}</span></div>
            </div>

            <div class="section-title">Academic Grades</div>
            <div class="tables-flex">
                <div class="semester-box">
                    <div class="table-header-sm">First Semester</div>
                    <table>
                        <thead><tr><th>Sr.no</th><th>Subject</th><th>Grade</th></tr></thead>
                        <tbody>${subRows1}</tbody>
                    </table>
                </div>
                <div class="semester-box">
                    <div class="table-header-sm">Second Semester</div>
                    <table>
                        <thead><tr><th>Sr.no</th><th>Subject</th><th>Grade</th></tr></thead>
                        <tbody>${subRows2}</tbody>
                    </table>
                </div>
            </div>

            <div class="section-title">Descriptive Remarks</div>
            <table class="remarks-table">
                <thead>
                    <tr><th colspan="3">First Semester</th><th colspan="3">Second Semester</th></tr>
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

            <div class="grade-key-container">
                <div class="grade-key-title">Grade Key: Criteria for Evaluation</div>
                <div class="grade-key-row">
                    <div class="key-item">91%+ <br/> A1</div><div class="key-item">81-90% <br/> A2</div>
                    <div class="key-item">71-80% <br/> B1</div><div class="key-item">61-70% <br/> B2</div>
                    <div class="key-item">51-60% <br/> C1</div><div class="key-item">41-50% <br/> C2</div>
                    <div class="key-item">33-40% <br/> D</div><div class="key-item">Below 33% <br/> E</div>
                </div>
            </div>

            <div class="footer-section">
                <div class="footer-line">RESULT : ${record.resultStatus || 'PASS'}</div>
                <div class="footer-line">NEXT YEAR STANDARD : ${nextClass}</div>
                <div class="footer-line">SCHOOL WILL REOPEN : 11th JUNE 2025</div>
                
                <div class="sig-container">
                    <div class="sig-box">TEACHER'S SIGN</div>
                    <div class="sig-box">PRINCIPAL'S SIGN</div>
                </div>
            </div>
        </div>
      `;
  };

  const downloadPDF = async (student: Student, record: AnnualRecord) => {
      setIsGenerating(true);
      const h2p = (window as any).html2pdf || html2pdf;
      if (!h2p) {
          alert("PDF Library not found.");
          setIsGenerating(false);
          return;
      }
      
      const lib = h2p.default || h2p;
      const element = document.createElement('div');
      element.innerHTML = `<style>${PDF_STYLES_BW}</style>${generatePDFContent(student, record)}`;
      
      const opt = { 
          margin: 0, 
          filename: `${student.name.replace(/\s+/g, '_')}_ProgressCard_BW.pdf`, 
          image: { type: 'jpeg', quality: 0.98 }, 
          html2canvas: { scale: 3, useCORS: true }, 
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
      };
      
      try {
          await lib().set(opt).from(element).save();
      } catch (err) {
          console.error("PDF generation failed:", err);
          alert("Export failed.");
      } finally {
          setIsGenerating(false);
      }
  };

  if (editingStudent) {
    const record = getRecord(editingStudent.id);
    const subjects = Array.from(new Set([...getSubjectsForClass(editingStudent.className, (editingStudent.medium || 'English') as 'English' | 'Semi').map(s => s.name), ...(record.customSubjects || [])]));
    return (
        <div className="bg-white min-h-screen flex flex-col animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setEditingStudentId(null)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                    <div><h3 className="font-bold text-slate-900">{editingStudent.name}</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Standard: {editingStudent.className} • Roll: {editingStudent.rollNo}</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setPreviewData({ student: editingStudent, record })} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all" title="Preview B/W Card"><Eye size={20} /></button>
                    <button onClick={() => downloadPDF(editingStudent, record)} disabled={isGenerating} className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50" title="Download B/W PDF">
                        {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-5xl mx-auto w-full">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Academic Grades</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjects.map(sub => (
                            <div key={sub} className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-indigo-200 transition-all">
                                <div className="font-black text-slate-700 text-xs uppercase mb-3 truncate">{sub}</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Sem 1</label>
                                        <input 
                                            type="text" 
                                            value={record.sem1Grades?.[sub] || ''} 
                                            onChange={(e) => handleRecordChange(editingStudent.id, 'sem1Grades', e.target.value, sub)} 
                                            className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm"
                                            placeholder="-"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Sem 2</label>
                                        <input 
                                            type="text" 
                                            value={record.sem2Grades?.[sub] || ''} 
                                            onChange={(e) => handleRecordChange(editingStudent.id, 'sem2Grades', e.target.value, sub)} 
                                            className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm"
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Remarks (Sem 1)</h4>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Special improvements</label><textarea value={record.specialImprovementsSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Hobbies</label><textarea value={record.hobbiesSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Necessary Improvement</label><textarea value={record.necessaryImprovementSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Remarks (Sem 2)</h4>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Special improvements</label><textarea value={record.specialImprovementsSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Hobbies</label><textarea value={record.hobbiesSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Necessary Improvement</label><textarea value={record.necessaryImprovementSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl border border-slate-800">
                    <div>
                        <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">Final Academic Standing</label>
                        <select 
                            value={record.resultStatus} 
                            onChange={(e) => handleRecordChange(editingStudent.id, 'resultStatus', e.target.value)} 
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                        </select>
                    </div>
                    <button 
                        onClick={() => handleRecordChange(editingStudent.id, 'published', !record.published)} 
                        className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${record.published ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                    >
                        {record.published ? 'Status: Published' : 'Status: Draft'}
                    </button>
                </section>
            </div>
            <div className="p-4 border-t sticky bottom-0 bg-white/80 backdrop-blur-md z-40">
                <button onClick={() => setEditingStudentId(null)} className="w-full max-w-lg mx-auto block py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Save & Back to Registry</button>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Academic Progress Registry</h2>
            <p className="text-sm text-slate-500 font-medium">Manage and generate official B/W Progress Cards.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-medium outline-none w-full sm:w-48" placeholder="Search..."/>
            </div>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                <option value="">Select Class</option>
                {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={handleManualSync} disabled={isSyncing} className={`p-2 rounded-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all ${isSyncing ? 'animate-spin' : ''}`} title="Sync with Cloud">
                <RefreshCw size={20} />
            </button>
        </div>
      </div>

      {selectedStudentIds.size > 0 && (
          <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                  <CheckSquare size={20} />
                  <div>
                      <p className="font-black uppercase text-xs tracking-widest">{selectedStudentIds.size} Students Selected</p>
                  </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => handleBulkPublish(true)} className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">Publish</button>
                  <button onClick={() => handleBulkPublish(false)} className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">Unpublish</button>
                  <button onClick={() => setSelectedStudentIds(new Set())} className="px-4 py-2.5 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
              </div>
          </div>
      )}
      
      {!selectedClass ? (
          <div className="py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center gap-4">
              <FileText size={48} className="text-slate-200" />
              <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Select a class to manage records.</p>
          </div>
      ) : (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-2">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    {selectedStudentIds.size === filteredStudents.length ? <CheckSquare size={20}/> : <Square size={20}/>}
                </button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select All Candidates</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredStudents.map(s => {
                    const rec = getRecord(s.id);
                    const isSelected = selectedStudentIds.has(s.id);
                    return (
                        <div key={s.id} className="relative group">
                            <div onClick={() => toggleStudentSelection(s.id)} className="absolute top-4 left-4 z-10 p-1 rounded-md cursor-pointer text-slate-300 hover:text-indigo-600">
                                {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                            </div>
                            <button onClick={() => setEditingStudentId(s.id)} className={`w-full bg-white p-5 pl-12 rounded-2xl border transition-all text-left flex flex-col h-full hover:shadow-lg ${rec.published ? 'border-emerald-100 ring-2 ring-emerald-50' : 'border-slate-200 hover:border-indigo-400'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200 uppercase tracking-widest">ROLL: {s.rollNo}</span>
                                    {rec.published && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                </div>
                                <h3 className="font-black text-slate-800 flex-1 leading-tight group-hover:text-indigo-600 transition-colors uppercase truncate w-full">{s.name}</h3>
                                <div className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={12}/> Edit Data</div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] p-4 flex items-center justify-center">
            <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Print Preview (B/W)</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Single A4 Institutional Layout</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadPDF(previewData.student, previewData.record)} disabled={isGenerating} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14}/>} Print B/W PDF
                        </button>
                        <button onClick={() => setPreviewData(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-200 p-8 flex justify-center items-start shadow-inner">
                    <div className="bg-white shadow-2xl scale-75 sm:scale-100 origin-top" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES_BW}</style>${generatePDFContent(previewData.student, previewData.record)}` }} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnnualResultsManager;

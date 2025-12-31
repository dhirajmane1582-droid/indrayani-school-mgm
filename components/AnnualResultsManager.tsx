
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

const PDF_STYLES_STRETCH = `
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
        border: 2.5px solid #000000;
        height: 100%;
        width: 100%;
        padding: 5mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff;
    }
    .header { text-align: center; position: relative; margin-bottom: 5px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; }
    .logo-container { 
        position: absolute; 
        top: 0; 
        left: 0; 
        width: 85px; 
        height: 85px; 
        background: #ffffff; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        z-index: 10;
    }
    .logo-img { width: 100%; height: 100%; object-fit: contain; background: #ffffff; display: block; }
    .school-group { font-size: 13px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #000; }
    .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #000; margin: 0; line-height: 1.1; }
    .school-details { font-size: 10px; margin-top: 4px; font-weight: bold; color: #000; }
    .report-badge { 
        margin-top: 8px; 
        font-size: 14px; 
        font-weight: bold; 
        text-transform: uppercase; 
        border: 2px solid #000; 
        display: inline-block; 
        padding: 4px 40px;
        background: #f0f0f0;
    }

    .student-info-box { 
        border: 1.5px solid #000; 
        margin-top: 10px; 
        padding: 10px; 
        display: grid; 
        grid-template-columns: 1.2fr 0.8fr; 
        gap: 6px 20px; 
        font-size: 12px;
        background: #ffffff;
    }
    .field-row { display: flex; align-items: baseline; }
    .field-label { font-weight: bold; min-width: 100px; text-transform: uppercase; font-size: 11px; color: #000; }
    .field-value { border-bottom: 1.5px dotted #000; flex: 1; font-weight: bold; padding-left: 5px; color: #000; }

    .main-grades-section { flex-grow: 3; display: flex; flex-direction: column; margin: 12px 0; min-height: 0; background: #ffffff; }
    .grades-table { width: 100%; border-collapse: collapse; height: 100%; }
    .grades-table th { background: #f0f0f0; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1.5px solid #000; padding: 6px 4px; color: #000; }
    .grades-table td { border: 1.5px solid #000; padding: 5px 4px; text-align: center; font-size: 12px; font-weight: bold; color: #000; }
    .sub-name { text-align: left; padding-left: 15px; font-size: 12px; }

    .remarks-section { flex-grow: 2; margin-bottom: 12px; display: flex; flex-direction: column; min-height: 0; background: #ffffff; }
    .remarks-grid-table { width: 100%; border-collapse: collapse; table-layout: fixed; height: 100%; }
    .remarks-grid-table th, .remarks-grid-table td { border: 1.5px solid #000; padding: 6px; font-size: 11px; vertical-align: top; color: #000; }
    .remarks-grid-table th { background: #f0f0f0; text-transform: uppercase; font-weight: 900; font-size: 10px; }
    .criteria-label { font-weight: bold; background: #fafafa; width: 160px; text-transform: uppercase; font-size: 9px; vertical-align: middle; }
    .remarks-val { font-style: italic; font-weight: bold; line-height: 1.3; }

    .grade-key-row { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .grade-key-row td { border: 1px solid #000; font-size: 9px; padding: 4px; text-align: center; font-weight: bold; background: #fcfcfc; color: #000; }

    .result-ribbon { 
        border: 2.5px solid #000; 
        padding: 10px; 
        text-align: center; 
        background: #f0f0f0;
        margin-bottom: 10px;
    }
    .result-main { font-size: 15px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; color: #000; }
    .reopening { font-size: 10px; font-weight: bold; margin-top: 4px; color: #000; }

    .signatures-row { display: flex; justify-content: space-between; padding: 0 15px; margin-top: 5px; }
    .sig-block { width: 220px; border-top: 2px solid #000; text-align: center; padding-top: 6px; font-weight: 900; font-size: 12px; text-transform: uppercase; color: #000; }
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

  const editingStudent = useMemo(() => 
    editingStudentId ? students.find(s => s.id === editingStudentId) : null,
    [editingStudentId, students]
  );

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
      if (selectedStudentIds.size === 0) return;
      setIsSyncing(true);
      const updatedRecords = [...annualRecords];
      selectedStudentIds.forEach(sid => {
          const idx = updatedRecords.findIndex(r => r.studentId === sid);
          if (idx >= 0) updatedRecords[idx] = { ...updatedRecords[idx], published: pub };
          else updatedRecords.push({ ...getRecord(sid), published: pub });
      });
      setAnnualRecords(updatedRecords);
      try { await dbService.putAll('annualRecords', updatedRecords); setSelectedStudentIds(new Set()); }
      finally { setIsSyncing(false); }
  };

  const toggleStudentSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelection = new Set(selectedStudentIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedStudentIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) setSelectedStudentIds(new Set());
    else setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      try { await dbService.putAll('annualRecords', annualRecords); } finally { setIsSyncing(false); }
  };

  const generatePDFContent = (student: Student, record: AnnualRecord) => {
      const className = student.className;
      const medium = student.medium || 'English';
      const subjects = Array.from(new Set([...getSubjectsForClass(className, medium as 'English' | 'Semi').map(s => s.name), ...(record.customSubjects || [])]));
      const schoolName = medium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
      const address = "SECTOR 18, KOPARKHAIRANE, NAVI MUMBAI | UDISE: 27211003415";
      const nextClass = className.startsWith('Class ') ? `Class ${parseInt(className.replace('Class ', '')) + 1}` : className === 'Sr. KG' ? 'Class 1' : 'Next Grade';

      const rows = subjects.map((sub, i) => `
          <tr>
              <td style="width:45px;">${i+1}</td>
              <td class="sub-name">${sub}</td>
              <td>${record.sem1Grades?.[sub] || '-'}</td>
              <td>${record.sem2Grades?.[sub] || '-'}</td>
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
                    <p class="school-details">${address}</p>
                    <div class="report-badge">Annual Progress Card 2024-25</div>
                </div>

                <div class="student-info-box">
                    <div class="field-row"><span class="field-label">Student Name:</span><span class="field-value">${student.name.toUpperCase()}</span></div>
                    <div class="field-row"><span class="field-label">Roll No:</span><span class="field-value">${student.rollNo}</span></div>
                    <div class="field-row"><span class="field-label">Standard:</span><span class="field-value">${student.className}</span></div>
                    <div class="field-row"><span class="field-label">D.O.B:</span><span class="field-value">${student.dob}</span></div>
                </div>

                <div class="main-grades-section">
                    <table class="grades-table">
                        <thead>
                            <tr>
                                <th style="width:45px;">SR.</th>
                                <th class="sub-name">SUBJECTS</th>
                                <th>FIRST SEMESTER</th>
                                <th>SECOND SEMESTER</th>
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
                                <td class="remarks-val">${record.specialImprovementsSem1 || '-'}</td>
                                <td class="remarks-val">${record.specialImprovementsSem2 || '-'}</td>
                            </tr>
                            <tr>
                                <td class="criteria-label">Hobbies & Interests</td>
                                <td class="remarks-val">${record.hobbiesSem1 || '-'}</td>
                                <td class="remarks-val">${record.hobbiesSem2 || '-'}</td>
                            </tr>
                            <tr>
                                <td class="criteria-label">Necessary Improvements</td>
                                <td class="remarks-val">${record.necessaryImprovementSem1 || '-'}</td>
                                <td class="remarks-val">${record.necessaryImprovementSem2 || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <table class="grade-key-row">
                    <tr>
                        <td>91%+(A1)</td><td>81-90%(A2)</td><td>71-80%(B1)</td><td>61-70%(B2)</td>
                        <td>51-60%(C1)</td><td>41-50%(C2)</td><td>33-40%(D)</td><td>&lt;33%(E)</td>
                    </tr>
                </table>

                <div class="result-ribbon">
                    <div class="result-main">RESULT: ${record.resultStatus || 'PASS'} | PROMOTED TO: ${nextClass}</div>
                    <div class="reopening">SCHOOL REOPENS: 11TH JUNE 2025</div>
                </div>

                <div class="signatures-row">
                    <div class="sig-block">CLASS TEACHER'S SIGN</div>
                    <div class="sig-block">PRINCIPAL'S SIGN</div>
                </div>
            </div>
        </div>
      `;
  };

  const downloadPDF = async (student: Student, record: AnnualRecord) => {
      setIsGenerating(true);
      const h2p = (window as any).html2pdf || html2pdf;
      if (!h2p) { alert("PDF Library missing."); setIsGenerating(false); return; }
      const lib = h2p.default || h2p;
      const element = document.createElement('div');
      element.innerHTML = `<style>${PDF_STYLES_STRETCH}</style>${generatePDFContent(student, record)}`;
      const opt = { 
          margin: 0, 
          filename: `${student.name.replace(/\s+/g, '_')}_ProgressCard.pdf`, 
          image: { type: 'png' }, // Enforce PNG to maintain alpha/transparency
          html2canvas: { 
              scale: 3, 
              useCORS: true, 
              backgroundColor: '#ffffff',
              logging: false,
              allowTaint: true
          }, 
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
      };
      try { await lib().set(opt).from(element).save(); } catch (err) { alert("PDF Error: " + err); } finally { setIsGenerating(false); }
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
                    <button onClick={() => setPreviewData({ student: editingStudent, record })} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all" title="Preview Card"><Eye size={20} /></button>
                    <button onClick={() => downloadPDF(editingStudent, record)} disabled={isGenerating} className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50" title="Download PDF">
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
                                        <input type="text" value={record.sem1Grades?.[sub] || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'sem1Grades', e.target.value, sub)} className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm" placeholder="-" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Sem 2</label>
                                        <input type="text" value={record.sem2Grades?.[sub] || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'sem2Grades', e.target.value, sub)} className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 outline-none transition-all shadow-sm" placeholder="-" />
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
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Teacher's Observations</label><textarea value={record.specialImprovementsSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Hobbies</label><textarea value={record.hobbiesSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Necessary Improvement</label><textarea value={record.necessaryImprovementSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Remarks (Sem 2)</h4>
                        <div className="space-y-4">
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Teacher's Observations</label><textarea value={record.specialImprovementsSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Hobbies</label><textarea value={record.hobbiesSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                            <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Necessary Improvement</label><textarea value={record.necessaryImprovementSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="..." /></div>
                        </div>
                    </div>
                </section>
                <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl border border-slate-800">
                    <div>
                        <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">Final Academic Standing</label>
                        <select value={record.resultStatus} onChange={(e) => handleRecordChange(editingStudent.id, 'resultStatus', e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                            <option value="PASS">PASS</option><option value="FAIL">FAIL</option>
                        </select>
                    </div>
                    <button onClick={() => handleRecordChange(editingStudent.id, 'published', !record.published)} className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${record.published ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
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
        <div><h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Academic Progress Registry</h2><p className="text-sm text-slate-500 font-medium">Manage and generate annual progress cards.</p></div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-medium outline-none w-full sm:w-48" placeholder="Search..."/></div>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                <option value="">Select Class</option>{SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={handleManualSync} disabled={isSyncing} className={`p-2 rounded-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all ${isSyncing ? 'animate-spin' : ''}`} title="Sync with Cloud"><RefreshCw size={20} /></button>
        </div>
      </div>
      {!selectedClass ? (
          <div className="py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center gap-4"><FileText size={48} className="text-slate-200" /><p className="font-black text-slate-400 uppercase tracking-widest text-sm">Select a class to manage records.</p></div>
      ) : (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-2"><button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">{selectedStudentIds.size === filteredStudents.length ? <CheckSquare size={20}/> : <Square size={20}/>}</button><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select All Candidates</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredStudents.map(s => {
                    const rec = getRecord(s.id); const isSelected = selectedStudentIds.has(s.id);
                    return (
                        <div key={s.id} className="relative group">
                            <div onClick={() => toggleStudentSelection(s.id)} className="absolute top-4 left-4 z-10 p-1 rounded-md cursor-pointer text-slate-300 hover:text-indigo-600">{isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}</div>
                            <button onClick={() => setEditingStudentId(s.id)} className={`w-full bg-white p-5 pl-12 rounded-2xl border transition-all text-left flex flex-col h-full hover:shadow-lg ${rec.published ? 'border-emerald-100 ring-2 ring-emerald-50' : 'border-slate-200 hover:border-indigo-400'}`}>
                                <div className="flex justify-between items-start mb-3"><span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200 uppercase tracking-widest">ROLL: {s.rollNo}</span>{rec.published && <CheckCircle2 size={14} className="text-emerald-500"/>}</div>
                                <h3 className="font-black text-slate-800 flex-1 leading-tight group-hover:text-indigo-600 transition-colors uppercase truncate w-full">{s.name}</h3><div className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={12}/> Edit Data</div>
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
                    <div><h3 className="text-xl font-black text-slate-800 tracking-tight">Print Preview</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Institutional High-Occupancy Layout</p></div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadPDF(previewData.student, previewData.record)} disabled={isGenerating} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">{isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14}/>} Download PDF</button>
                        <button onClick={() => setPreviewData(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-200 p-4 sm:p-8 flex justify-center items-start shadow-inner">
                    <div className="bg-white shadow-2xl scale-75 sm:scale-90 origin-top" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES_STRETCH}</style>${generatePDFContent(previewData.student, previewData.record)}` }} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnnualResultsManager;

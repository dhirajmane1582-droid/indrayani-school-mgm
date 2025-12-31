
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

const PDF_STYLES = `
    .report-wrapper { background-color: #fff; padding: 0; margin: 0; }
    .report-page { 
        font-family: 'Inter', sans-serif; 
        padding: 10mm; 
        width: 190mm; 
        min-height: 270mm; 
        box-sizing: border-box; 
        color: #000;
        background: #fff;
        border: 1px solid #000;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .trust-name { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; color: #000; }
    .school-name { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #000; }
    .udise { font-size: 9px; font-weight: bold; margin-bottom: 4px; }
    .address { font-size: 8px; margin-bottom: 2px; font-weight: bold; text-transform: uppercase; }
    .progress-card-title { font-size: 12px; font-weight: bold; margin-top: 5px; text-transform: uppercase; text-decoration: underline; }
    
    .student-info { margin-top: 10px; margin-bottom: 15px; font-size: 11px; }
    .info-line { display: flex; margin-bottom: 4px; }
    .info-label { font-weight: bold; width: 130px; }
    .info-value { border-bottom: 1px solid #000; flex: 1; padding-left: 5px; font-weight: bold; }

    .tables-container { display: flex; gap: 10px; margin-bottom: 15px; }
    .semester-table-box { flex: 1; }
    .table-title { font-weight: bold; text-align: center; border: 1px solid #000; border-bottom: 0; padding: 3px; font-size: 10px; text-transform: uppercase; background: #f0f0f0; }
    
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #000; padding: 4px; text-align: center; color: #000; }
    th { font-weight: bold; text-transform: uppercase; font-size: 9px; }
    .subject-cell { text-align: left; padding-left: 5px; font-weight: bold; }
    
    .remarks-container { border: 1px solid #000; border-top: 0; margin-bottom: 15px; }
    .remarks-header-row { display: flex; background: #eee; border-top: 1px solid #000; }
    .remarks-col { flex: 1; border-right: 1px solid #000; font-weight: bold; padding: 3px; font-size: 9px; text-align: center; text-transform: uppercase; }
    .remarks-col:last-child { border-right: 0; }
    .remarks-data-row { display: flex; border-top: 1px solid #000; min-height: 45px; }
    .remarks-cell { flex: 1; border-right: 1px solid #000; padding: 4px; font-size: 9px; word-break: break-word; }
    .remarks-cell:last-child { border-right: 0; }
    .desc-remarks-title { font-weight: bold; text-align: center; border: 1px solid #000; padding: 3px; font-size: 10px; text-transform: uppercase; background: #eee; }

    .grade-key { margin-bottom: 15px; }
    .result-footer { text-align: center; margin-top: auto; font-size: 11px; }
    .result-line { font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
    .signatures { display: flex; justify-content: space-between; margin-top: 25px; }
    .sig-box { text-align: center; border-top: 1px solid #000; width: 130px; padding-top: 4px; font-size: 10px; font-weight: bold; }
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
          // Explicitly push everything to cloud
          await dbService.putAll('annualRecords', annualRecords);
      } finally {
          setIsSyncing(false);
      }
  };

  const generatePDFContent = (student: Student, record: AnnualRecord) => {
      const className = student.className;
      const medium = student.medium || 'English';
      
      const subjects = Array.from(new Set([
        ...getSubjectsForClass(className, medium as 'English' | 'Semi').map(s => s.name), 
        ...(record.customSubjects || [])
      ]));
      
      const schoolName = medium === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
      const address = "SECTOR 18, NEAR GARDEN, KOPARKHAIRANE, NAVI MUMBAI";
      const nextClass = className.startsWith('Class ') ? `Class ${parseInt(className.replace('Class ', '')) + 1}` : className === 'Sr. KG' ? 'Class 1' : 'Next Grade';

      const subjectRows1 = subjects.map((sub, i) => `<tr><td>${i+1}</td><td class="subject-cell">${sub}</td><td>${record.sem1Grades?.[sub] || ''}</td></tr>`).join('');
      const subjectRows2 = subjects.map((sub, i) => `<tr><td>${i+1}</td><td class="subject-cell">${sub}</td><td>${record.sem2Grades?.[sub] || ''}</td></tr>`).join('');

      return `
        <div class="report-page">
            <div class="header">
                <div class="trust-name">SHREE GANESH EDUCATION ACADEMY'S</div>
                <div class="school-name">${schoolName}</div>
                <div class="udise">UDISE :- PRI : 27211003415, SEC : 27211003417</div>
                <div class="address">${address}</div>
                <div class="progress-card-title">PROGRESS CARD 2024-25</div>
            </div>

            <div class="student-info">
                <div class="info-line"><span class="info-label">Name of the Student :</span><span class="info-value">${student.name.toUpperCase()}</span></div>
                <div class="info-line"><span class="info-label">Standard :</span><span class="info-value">${student.className}</span></div>
                <div class="info-line"><span class="info-label">Roll no :</span><span class="info-value">${student.rollNo}</span></div>
                <div class="info-line"><span class="info-label">DOB :</span><span class="info-value">${student.dob}</span></div>
            </div>

            <div class="tables-container">
                <div class="semester-table-box">
                    <div class="table-title">First Semester</div>
                    <table>
                        <thead><tr><th style="width:30px;">Sr.no</th><th>Subject</th><th style="width:60px;">Grade</th></tr></thead>
                        <tbody>${subjectRows1}</tbody>
                    </table>
                </div>
                <div class="semester-table-box">
                    <div class="table-title">Second Semester</div>
                    <table>
                        <thead><tr><th style="width:30px;">Sr.no</th><th>Subject</th><th style="width:60px;">Grade</th></tr></thead>
                        <tbody>${subjectRows2}</tbody>
                    </table>
                </div>
            </div>

            <div class="desc-remarks-title">Descriptive Remarks</div>
            <div class="remarks-container">
                <div class="remarks-header-row">
                    <div class="remarks-col">First Semester</div>
                    <div class="remarks-col">Second Semester</div>
                </div>
                <div class="remarks-header-row">
                    <div class="remarks-col" style="font-size:7px;">Special Improvements</div>
                    <div class="remarks-col" style="font-size:7px;">Hobbies</div>
                    <div class="remarks-col" style="font-size:7px;">Necessary Imp.</div>
                    <div class="remarks-col" style="font-size:7px;">Special Improvements</div>
                    <div class="remarks-col" style="font-size:7px;">Hobbies</div>
                    <div class="remarks-col" style="font-size:7px;">Necessary Imp.</div>
                </div>
                <div class="remarks-data-row">
                    <div class="remarks-cell">${record.specialImprovementsSem1 || ''}</div>
                    <div class="remarks-cell">${record.hobbiesSem1 || ''}</div>
                    <div class="remarks-cell">${record.necessaryImprovementSem1 || ''}</div>
                    <div class="remarks-cell">${record.specialImprovementsSem2 || ''}</div>
                    <div class="remarks-cell">${record.hobbiesSem2 || ''}</div>
                    <div class="remarks-cell">${record.necessaryImprovementSem2 || ''}</div>
                </div>
            </div>

            <div class="grade-key">
                <div style="font-size:9px; font-weight:bold; margin-bottom:3px;">Grade Key: A1(91%+), A2(81-90%), B1(71-80%), B2(61-70%), C1(51-60%), C2(41-50%), D(33-40%), E(<33%)</div>
            </div>

            <div class="result-footer">
                <div class="result-line">RESULT : ${record.resultStatus || 'PASS'}</div>
                <div class="result-line">NEXT YEAR STANDARD : ${nextClass}</div>
                <div class="result-line">SCHOOL WILL REOPEN : 11th JUNE 2025</div>
                
                <div class="signatures">
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
      element.innerHTML = `<style>${PDF_STYLES}</style>${generatePDFContent(student, record)}`;
      
      const opt = { 
          margin: 0, 
          filename: `${student.name.replace(/\s+/g, '_')}_ProgressCard.pdf`, 
          image: { type: 'jpeg', quality: 0.98 }, 
          html2canvas: { scale: 3, useCORS: true }, 
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
      };
      
      try {
          await lib().set(opt).from(element).save();
      } catch (err) {
          console.error("PDF generation failed:", err);
          alert("Export failed. Please try again.");
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
                    <button onClick={() => setPreviewData({ student: editingStudent, record })} className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all" title="Preview Card"><Eye size={20} /></button>
                    <button onClick={() => downloadPDF(editingStudent, record)} disabled={isGenerating} className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50" title="Download Card">
                        {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
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
                                        <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Sem 1 Grade</label>
                                        <input 
                                            type="text" 
                                            value={record.sem1Grades?.[sub] || ''} 
                                            onChange={(e) => handleRecordChange(editingStudent.id, 'sem1Grades', e.target.value, sub)} 
                                            className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                                            placeholder="-"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-400 font-black uppercase block mb-1">Sem 2 Grade</label>
                                        <input 
                                            type="text" 
                                            value={record.sem2Grades?.[sub] || ''} 
                                            onChange={(e) => handleRecordChange(editingStudent.id, 'sem2Grades', e.target.value, sub)} 
                                            className="w-full bg-white border border-slate-300 rounded-xl py-2 text-center font-black text-indigo-700 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
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
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Descriptive Remarks (Sem 1)</h4>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Special Improvements</label><textarea value={record.specialImprovementsSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="Enter observations..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Hobbies</label><textarea value={record.hobbiesSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="Enter interests..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Necessary Improvement</label><textarea value={record.necessaryImprovementSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem1', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="Target areas..." /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h4 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Descriptive Remarks (Sem 2)</h4>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Special Improvements</label><textarea value={record.specialImprovementsSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'specialImprovementsSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="Enter observations..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Hobbies</label><textarea value={record.hobbiesSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="Enter interests..." /></div>
                            <div><label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 block">Necessary Improvement</label><textarea value={record.necessaryImprovementSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'necessaryImprovementSem2', e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-medium text-slate-800 focus:border-indigo-600 outline-none min-h-[80px]" placeholder="Target areas..." /></div>
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col sm:flex-row justify-between items-center gap-6 shadow-xl border border-slate-800">
                    <div>
                        <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">Academic Standing</label>
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
                        className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${record.published ? 'bg-emerald-500 text-white shadow-emerald-900/40 hover:bg-emerald-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
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
            <p className="text-sm text-slate-500 font-medium">Generate and publish year-end progress cards.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full sm:w-48" placeholder="Search..."/>
            </div>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                <option value="">Select Class</option>
                {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={handleManualSync} disabled={isSyncing} className={`p-2 rounded-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all ${isSyncing ? 'bg-indigo-50 animate-spin' : 'bg-white'}`} title="Sync with Cloud">
                <RefreshCw size={20} />
            </button>
        </div>
      </div>

      {selectedStudentIds.size > 0 && (
          <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                      <CheckSquare size={20} />
                  </div>
                  <div>
                      <p className="font-black uppercase text-xs tracking-widest">{selectedStudentIds.size} Students Selected</p>
                      <p className="text-[10px] text-indigo-100 font-medium">Apply cloud publishing actions to all selected.</p>
                  </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => handleBulkPublish(true)} disabled={isSyncing} className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                      {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <Globe size={14}/>} Publish
                  </button>
                  <button onClick={() => handleBulkPublish(false)} disabled={isSyncing} className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                      {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <GlobeLock size={14}/>} Unpublish
                  </button>
                  <button onClick={() => setSelectedStudentIds(new Set())} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
              </div>
          </div>
      )}
      
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
        <AlertTriangle className="text-amber-600 shrink-0" size={20} />
        <p className="text-xs font-bold text-amber-800">Publishing makes the report immediately visible on the Student Portal across all devices.</p>
      </div>

      {!selectedClass ? (
          <div className="py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center gap-4">
              <div className="bg-slate-100 p-6 rounded-full text-slate-300">
                  <FileText size={48} />
              </div>
              <div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Registry is Empty</p>
                <p className="text-xs text-slate-500 font-medium">Select a class to manage academic progress.</p>
              </div>
          </div>
      ) : (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-2">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}
                </button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select All Candidates</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredStudents.map(s => {
                    const rec = getRecord(s.id);
                    const isSelected = selectedStudentIds.has(s.id);
                    return (
                        <div key={s.id} className="relative group">
                            <div 
                                onClick={() => toggleStudentSelection(s.id)}
                                className="absolute top-4 left-4 z-10 p-1 rounded-md transition-all cursor-pointer text-slate-300 hover:text-indigo-600"
                            >
                                {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                            </div>
                            <button onClick={() => setEditingStudentId(s.id)} className={`w-full bg-white p-5 pl-12 rounded-2xl border transition-all text-left flex flex-col h-full group hover:shadow-lg ${rec.published ? 'border-emerald-100 ring-2 ring-emerald-50' : 'border-slate-200 hover:border-indigo-400'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200 uppercase tracking-widest">ROLL: {s.rollNo}</span>
                                    {rec.published ? (
                                        <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            <CheckCircle2 size={10}/> PUBLISHED
                                        </div>
                                    ) : (
                                        <div className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            DRAFT
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-black text-slate-800 flex-1 leading-tight group-hover:text-indigo-600 transition-colors uppercase truncate w-full">{s.name}</h3>
                                <div className="text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit3 size={12}/> Edit Progress Data
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {previewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] p-4 flex items-center justify-center">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Official Document Preview</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional Reporting Format</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => downloadPDF(previewData.student, previewData.record)} disabled={isGenerating} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14}/>} Download PDF
                        </button>
                        <button onClick={() => setPreviewData(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-200 p-4 sm:p-12 flex justify-center items-start shadow-inner">
                    <div className="bg-white shadow-2xl border border-slate-300 w-full max-w-[190mm] min-h-[270mm] scale-90 sm:scale-100 origin-top" dangerouslySetInnerHTML={{ __html: `<style>${PDF_STYLES}</style>${generatePDFContent(previewData.student, previewData.record)}` }} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnnualResultsManager;

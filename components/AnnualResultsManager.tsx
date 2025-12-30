
import React, { useState, useMemo, useRef } from 'react';
import { Student, AnnualRecord, SPECIFIC_CLASSES, getSubjectsForClass, Exam, CustomFieldDefinition } from '../types';
import { Save, ChevronLeft, ChevronRight, Search, CheckCircle2, AlertCircle, CheckSquare, Square, FileText, X, ArrowLeft, ArrowRight, Printer, Download, Settings, Plus, Trash2, Eye, Share2, Edit3, Upload } from 'lucide-react';
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
    .report-wrapper {
        background-color: #fff;
        padding: 10mm;
    }
    .report-page { 
        font-family: 'Times New Roman', serif; 
        padding: 15mm; 
        width: 190mm; 
        min-height: 267mm; 
        box-sizing: border-box; 
        color: #000;
        background: #fff;
        border: 2px solid #000;
        margin: auto;
    }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 1.5px solid #000; padding-bottom: 15px; }
    .trust-name { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; color: #000; letter-spacing: 0.5px; }
    .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; color: #000; }
    .address { font-size: 11px; margin-bottom: 2px; color: #000; font-weight: bold; }
    .contact { font-size: 11px; margin-bottom: 10px; color: #000; font-weight: bold; }
    .report-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-top: 15px; color: #000; border: 1px solid #000; display: inline-block; padding: 4px 20px; }
    
    .student-info { margin-bottom: 25px; border: 1px solid #000; padding: 12px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .field-pair { display: flex; gap: 8px; min-width: 48%; }
    .label { font-weight: bold; font-size: 13px; color: #000; }
    .value { font-size: 13px; border-bottom: 1px dotted #000; flex: 1; color: #000; }
    .value.bold { font-weight: bold; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th, td { border: 1px solid #000; padding: 8px 4px; text-align: center; color: #000; }
    th { background-color: #eee; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .subject-cell { text-align: left; padding-left: 10px; font-weight: bold; }
    
    .section-header { font-weight: bold; font-size: 13px; margin-bottom: 6px; text-transform: uppercase; color: #000; text-decoration: underline; }
    
    .footer-info { margin-top: 20px; }
    .remarks-section { margin-bottom: 15px; }
    .remark-box { border: 1px solid #000; padding: 10px; min-height: 40px; margin-top: 5px; font-size: 13px; }
    .promotion-box { text-align: center; margin: 20px 0; font-size: 15px; font-weight: bold; }

    .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
    .sig-box { text-align: center; border-top: 1.5px solid #000; width: 30%; padding-top: 6px; font-size: 13px; font-weight: bold; color: #000; }
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
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
  
  const [previewData, setPreviewData] = useState<{student: Student, record: AnnualRecord} | null>(null);
  
  const [reportConfig, setReportConfig] = useState<{
      showCustomFields: string[];
  }>(() => {
      const saved = localStorage.getItem('et_report_config');
      return saved ? JSON.parse(saved) : { showCustomFields: [] };
  });

  const [newSubInModal, setNewSubInModal] = useState('');

  const toggleReportField = (id: string) => {
      setReportConfig(prev => {
          const newFields = prev.showCustomFields.includes(id) 
            ? prev.showCustomFields.filter(f => f !== id)
            : [...prev.showCustomFields, id];
          const newConfig = { ...prev, showCustomFields: newFields };
          localStorage.setItem('et_report_config', JSON.stringify(newConfig));
          return newConfig;
      });
  };

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    const [className, medium] = selectedClass.split('|');
    let list = students.filter(s => s.className === className && (s.medium || 'English') === medium);
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
    }
    
    return list.sort((a, b) => {
        const ra = parseInt(a.rollNo) || 0;
        const rb = parseInt(b.rollNo) || 0;
        return ra - rb;
    });
  }, [students, selectedClass, searchQuery]);

  const editingStudent = useMemo(() => {
    return filteredStudents.find(s => s.id === editingStudentId) || students.find(s => s.id === editingStudentId) || null;
  }, [filteredStudents, students, editingStudentId]);

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!editingStudentId) return;
    const currentIndex = filteredStudents.findIndex(s => s.id === editingStudentId);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
        setEditingStudentId(filteredStudents[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < filteredStudents.length - 1) {
        setEditingStudentId(filteredStudents[currentIndex + 1].id);
    }
  };

  const defaultSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const [className, medium] = selectedClass.split('|');
    return getSubjectsForClass(className, medium as 'English' | 'Semi');
  }, [selectedClass]);

  const getRecord = (studentId: string) => {
      return annualRecords.find(r => r.studentId === studentId) || {
        studentId,
        academicYear: '2024-2025',
        grades: {},
        sem1Grades: {},
        sem2Grades: {},
        remarks: '',
        hobbies: '',
        hobbiesSem1: '',
        hobbiesSem2: '',
        improvements: '',
        improvementsSem1: '',
        improvementsSem2: '',
        customSubjects: [],
        published: false
      };
  };

  const getStudentSubjects = (record: AnnualRecord) => {
      const defaults = defaultSubjects.map(s => s.name);
      if (!record.customSubjects || record.customSubjects.length === 0) return defaults;
      return record.customSubjects;
  };

  const handleRecordChange = (studentId: string, field: keyof AnnualRecord, value: any, nestedKey?: string) => {
      setAnnualRecords(prev => {
          const existingIndex = prev.findIndex(r => r.studentId === studentId);
          let currentRecord = existingIndex >= 0 ? prev[existingIndex] : getRecord(studentId);
          
          let updatedRecord = { ...currentRecord };

          if (nestedKey) {
             // @ts-ignore
             updatedRecord[field] = { ...updatedRecord[field], [nestedKey]: value };
          } else {
             // @ts-ignore
             updatedRecord[field] = value;
          }

          if (existingIndex >= 0) {
              const newArr = [...prev];
              newArr[existingIndex] = updatedRecord;
              return newArr;
          }
          return [...prev, updatedRecord];
      });
  };

  const toggleSubject = (studentId: string, subjectName: string) => {
      setAnnualRecords(prev => {
          const idx = prev.findIndex(r => r.studentId === studentId);
          let record = idx >= 0 ? prev[idx] : getRecord(studentId);
          
          let currentActive = record.customSubjects && record.customSubjects.length > 0 
            ? record.customSubjects 
            : defaultSubjects.map(s => s.name);
          
          let newActive;
          if (currentActive.includes(subjectName)) {
              newActive = currentActive.filter(s => s !== subjectName);
          } else {
              newActive = [...currentActive, subjectName];
          }
          
          const updatedRecord = { ...record, customSubjects: newActive };
          
          if (idx >= 0) {
              const newArr = [...prev];
              newArr[idx] = updatedRecord;
              return newArr;
          }
          return [...prev, updatedRecord];
      });
  };

  const addCustomSubjectInModal = (studentId: string) => {
      const sub = newSubInModal.trim();
      if (!sub) return;
      
      setAnnualRecords(prev => {
          const idx = prev.findIndex(r => r.studentId === studentId);
          let record = idx >= 0 ? prev[idx] : getRecord(studentId);
          
          let currentActive = record.customSubjects && record.customSubjects.length > 0 
            ? record.customSubjects 
            : defaultSubjects.map(s => s.name);
          
          if (!currentActive.includes(sub)) {
              currentActive = [...currentActive, sub];
          }
          
          const updatedRecord = { ...record, customSubjects: currentActive };
          
          if (idx >= 0) {
              const newArr = [...prev];
              newArr[idx] = updatedRecord;
              return newArr;
          }
          return [...prev, updatedRecord];
      });
      setNewSubInModal('');
  };

  const handlePublishAll = (publish: boolean) => {
      if(window.confirm(`Are you sure you want to ${publish ? 'Publish' : 'Unpublish'} results for all ${filteredStudents.length} students?`)) {
          const studentIds = new Set(filteredStudents.map(s => s.id));
          setAnnualRecords(prev => {
              const newRecords = [...prev];
              newRecords.forEach((r, i) => {
                  if (studentIds.has(r.studentId)) {
                      newRecords[i] = { ...r, published: publish };
                  }
              });
              filteredStudents.forEach(s => {
                  if (!newRecords.find(r => r.studentId === s.id)) {
                      newRecords.push({ ...getRecord(s.id), published: publish });
                  }
              });
              return newRecords;
          });
          setShowSaveSuccess(true);
          setTimeout(() => setShowSaveSuccess(false), 2000);
      }
  };

  const generatePDFContent = (student: Student, record: AnnualRecord) => {
      const [cls, med] = selectedClass.split('|');
      const subjects = getStudentSubjects(record);
      
      const nextClass = cls.startsWith('Class ') 
        ? `Class ${parseInt(cls.replace('Class ', '')) + 1}` 
        : cls === 'Nursery' ? 'Jr. KG' 
        : cls === 'Jr. KG' ? 'Sr. KG' 
        : cls === 'Sr. KG' ? 'Class 1' 
        : 'Next Standard';

      const schoolName = med === 'English' ? 'INDRAYANI ENGLISH MEDIUM SCHOOL' : 'INDRAYANI INTERNATIONAL SCHOOL';
      const address = "Sector 18, Plot No. 23, 24, 25, 26, Koparkhairane, Navi Mumbai 400709.";
      const phone = "Ph No. 8425919111 / 8422019111";
      const trustName = "SHREE GANESH EDUCATION ACADEMY";
      
      let customFieldsHTML = '';
      reportConfig.showCustomFields.forEach(fid => {
          const def = customFieldDefs.find(d => d.id === fid);
          const val = student.customFields?.[fid] || '-';
          if (def) {
              customFieldsHTML += `<div class="field-pair"><span class="label">${def.label}:</span> <span class="value">${val}</span></div>`;
          }
      });

      const rows = subjects.map(sub => `
        <tr>
            <td class="subject-cell">${sub}</td>
            <td>${record.sem1Grades?.[sub] || '-'}</td>
            <td>${record.sem2Grades?.[sub] || '-'}</td>
        </tr>
      `).join('');

      return `
        <div class="report-page">
            <div class="header">
                <div class="trust-name">${trustName}</div>
                <div class="school-name">${schoolName}</div>
                <div class="address">${address}</div>
                <div class="contact">${phone}</div>
                <div class="report-title">ANNUAL PROGRESS REPORT (2024-25)</div>
            </div>
            
            <div class="student-info">
                <div class="info-row">
                    <div class="field-pair"><span class="label">NAME:</span> <span class="value bold">${student.name.toUpperCase()}</span></div>
                    <div class="field-pair"><span class="label">ROLL NO:</span> <span class="value">${student.rollNo}</span></div>
                </div>
                <div class="info-row">
                    <div class="field-pair"><span class="label">CLASS:</span> <span class="value">${student.className.toUpperCase()}</span></div>
                    <div class="field-pair"><span class="label">MEDIUM:</span> <span class="value">${(student.medium || 'English').toUpperCase()}</span></div>
                </div>
                <div class="info-row">
                   ${customFieldsHTML}
                </div>
            </div>

            <div class="academic-section">
                <div class="section-header">Academic Performance</div>
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
            </div>

            <div class="coscholastic-section">
                <div class="section-header">Co-Scholastic & Personal Development</div>
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
            </div>

            <div class="footer-info">
                <div class="remarks-section">
                    <span class="label">Class Teacher's Remarks:</span>
                    <div class="remark-box">${record.remarks || 'Satisfactory progress shown throughout the academic year.'}</div>
                </div>
                <div class="promotion-box">
                    PROMOTED TO: ${nextClass.toUpperCase()}
                </div>
            </div>

            <div class="signatures">
                <div class="sig-box">Class Teacher</div>
                <div class="sig-box">Principal</div>
                <div class="sig-box">Parent</div>
            </div>
        </div>
      `;
  };

  const downloadPDF = async (student: Student, record: AnnualRecord) => {
      // Robust library resolution for html2pdf
      const exporter = (html2pdf as any).default || (window as any).html2pdf || html2pdf;
      if (typeof exporter !== 'function') {
          console.error("html2pdf library could not be resolved.");
          alert("PDF library failed to load.");
          return;
      }

      const content = generatePDFContent(student, record);
      const element = document.createElement('div');
      element.className = "report-wrapper";
      element.innerHTML = `<style>${PDF_STYLES}</style>${content}`;

      const opt = {
          margin: 0,
          filename: `${student.name.replace(/\s+/g, '_')}_ReportCard.pdf`,
          image: { type: 'jpeg' as const, quality: 1.0 },
          html2canvas: { scale: 3 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      try {
          const worker = exporter();
          if (worker && typeof worker.set === 'function') {
            await worker.set(opt).from(element).save();
          } else {
            await exporter(element, opt);
          }
      } catch (err) {
          console.error("PDF Download Error:", err);
          alert("Failed to download PDF.");
      }
  };

  const downloadClassPDF = async () => {
      const exporter = (html2pdf as any).default || (window as any).html2pdf || html2pdf;
      if (typeof exporter !== 'function') return;

      if (!window.confirm(`Generate PDF for all ${filteredStudents.length} students? This may take a moment.`)) return;

      const element = document.createElement('div');
      element.className = "report-wrapper";
      element.innerHTML = `<style>${PDF_STYLES}.report-page { page-break-after: always; margin-bottom: 20mm; }</style>`;

      filteredStudents.forEach(student => {
          const record = getRecord(student.id);
          element.innerHTML += generatePDFContent(student, record);
      });

      const opt = {
          margin: 0,
          filename: `${selectedClass.replace('|','_')}_All_Reports.pdf`,
          image: { type: 'jpeg' as const, quality: 1.0 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      try {
          const worker = exporter();
          if (worker && typeof worker.set === 'function') {
            await worker.set(opt).from(element).save();
          } else {
            await exporter(element, opt);
          }
      } catch (err) {
          console.error("Bulk PDF Download Error:", err);
          alert("Failed to download bulk PDF.");
      }
  };

  if (editingStudent) {
      const record = getRecord(editingStudent.id);
      const currentIndex = filteredStudents.findIndex(s => s.id === editingStudent.id);
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === filteredStudents.length - 1;

      const currentSubjects = getStudentSubjects(record);

      return (
          <div className="bg-white min-h-screen sm:min-h-0 sm:rounded-xl shadow-xl border border-slate-200 flex flex-col animate-in slide-in-from-right duration-300 fixed inset-0 z-50 sm:relative sm:inset-auto sm:z-0">
              <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setEditingStudentId(null)}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                      >
                          <ChevronLeft size={24} />
                      </button>
                      <div>
                          <h3 className="font-bold text-slate-800 leading-tight">{editingStudent.name}</h3>
                          <div className="text-xs text-slate-500">Roll No: {editingStudent.rollNo} • {editingStudent.className}</div>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                       <button 
                          onClick={() => setPreviewData({ student: editingStudent, record })} 
                          className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                          title="Preview PDF"
                        >
                           <Eye size={20} />
                       </button>
                       <button 
                          onClick={() => downloadPDF(editingStudent, record)} 
                          className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                          title="Download PDF"
                        >
                           <Upload size={20} />
                       </button>
                       <div className="text-xs font-medium text-slate-400 hidden sm:block">
                           {currentIndex + 1} of {filteredStudents.length}
                       </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
                  <div className="max-w-3xl mx-auto space-y-6">
                      <div className="space-y-4">
                          <div className="flex justify-between items-end">
                              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Subject Grades</h4>
                              <button 
                                onClick={() => setIsManageSubjectsOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs font-bold shadow-sm"
                              >
                                <Edit3 size={14} /> Manage Subjects
                              </button>
                          </div>
                          
                          {currentSubjects.map(sub => (
                              <div key={sub} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                  <div className="flex justify-between items-center mb-3">
                                      <span className="font-bold text-slate-800">{sub}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-semibold text-slate-500 mb-1">Semester 1</label>
                                          <input 
                                              type="text" 
                                              value={record.sem1Grades?.[sub] || ''}
                                              onChange={(e) => handleRecordChange(editingStudent.id, 'sem1Grades', e.target.value, sub)}
                                              className="w-full text-center font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-2.5 px-3 focus:border-indigo-500 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                              placeholder="-"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-xs font-semibold text-slate-500 mb-1">Semester 2</label>
                                          <input 
                                              type="text" 
                                              value={record.sem2Grades?.[sub] || ''}
                                              onChange={(e) => handleRecordChange(editingStudent.id, 'sem2Grades', e.target.value, sub)}
                                              className="w-full text-center font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-2.5 px-3 focus:border-indigo-500 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                              placeholder="-"
                                          />
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Co-Scholastic & Remarks</h4>
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Hobbies (Sem 1)</label>
                                      <textarea value={record.hobbiesSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem1', e.target.value)} className="w-full bg-white border border-slate-300 p-2 rounded text-sm text-slate-900"/>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Hobbies (Sem 2)</label>
                                      <textarea value={record.hobbiesSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'hobbiesSem2', e.target.value)} className="w-full bg-white border border-slate-300 p-2 rounded text-sm text-slate-900"/>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Improvement (Sem 1)</label>
                                      <textarea value={record.improvementsSem1 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'improvementsSem1', e.target.value)} className="w-full bg-white border border-slate-300 p-2 rounded text-sm text-slate-900"/>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-semibold text-slate-500 mb-1">Improvement (Sem 2)</label>
                                      <textarea value={record.improvementsSem2 || ''} onChange={(e) => handleRecordChange(editingStudent.id, 'improvementsSem2', e.target.value)} className="w-full bg-white border border-slate-300 p-2 rounded text-sm text-slate-900"/>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-semibold text-slate-500 mb-2">Teacher's Remarks</label>
                                  <textarea 
                                      value={record.remarks}
                                      onChange={(e) => handleRecordChange(editingStudent.id, 'remarks', e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px]"
                                      placeholder="Annual remarks..."
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Publish Result</span>
                          <button 
                              onClick={() => handleRecordChange(editingStudent.id, 'published', !record.published)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${record.published ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${record.published ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                      </div>
                  </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between gap-4">
                  <button 
                      onClick={() => handleNavigate('prev')}
                      disabled={isFirst}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      <ArrowLeft size={16} /> <span className="hidden xs:inline">Prev</span>
                  </button>
                  <button 
                      onClick={() => setEditingStudentId(null)}
                      className="flex-[2] bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all glow-indigo"
                  >
                      Save & Close
                  </button>
                  <button 
                      onClick={() => handleNavigate('next')}
                      disabled={isLast}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      <span className="hidden xs:inline">Next</span> <ArrowRight size={16} />
                  </button>
              </div>

              {/* Manage Subjects Modal */}
              {isManageSubjectsOpen && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-0 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                          <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                              <div>
                                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Manage Report Subjects</h3>
                                  <p className="text-xs text-slate-500 uppercase font-black">{editingStudent.name}</p>
                              </div>
                              <button onClick={() => setIsManageSubjectsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                                  <X size={20}/>
                              </button>
                          </div>
                          <div className="p-6 overflow-y-auto max-h-[50vh] space-y-6">
                              <section>
                                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">Standard Subjects</h4>
                                  <div className="space-y-2">
                                      {defaultSubjects.map(sub => {
                                          const isActive = currentSubjects.includes(sub.name);
                                          return (
                                              <button 
                                                key={sub.id} 
                                                onClick={() => toggleSubject(editingStudent.id, sub.name)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'}`}
                                              >
                                                  <span className="font-bold text-sm">{sub.name}</span>
                                                  {isActive ? <CheckSquare size={18} /> : <Square size={18} />}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </section>
                              <section>
                                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">Custom Subjects</h4>
                                  <div className="flex gap-2 mb-3">
                                      <input 
                                        type="text" 
                                        value={newSubInModal}
                                        onChange={(e) => setNewSubInModal(e.target.value)}
                                        placeholder="Add Other Subject..."
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                      />
                                      <button 
                                        onClick={() => addCustomSubjectInModal(editingStudent.id)}
                                        className="bg-indigo-600 text-white p-2 rounded-lg"
                                      >
                                          <Plus size={20}/>
                                      </button>
                                  </div>
                                  <div className="space-y-2">
                                      {currentSubjects.filter(s => !defaultSubjects.some(ds => ds.name === s)).map(sub => (
                                          <div key={sub} className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl">
                                              <span className="font-bold text-sm">{sub}</span>
                                              <button onClick={() => toggleSubject(editingStudent.id, sub)} className="text-rose-500">
                                                  <Trash2 size={16}/>
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </section>
                          </div>
                          <div className="p-6 bg-slate-50 border-t border-slate-200">
                              <button onClick={() => setIsManageSubjectsOpen(false)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Apply Selection</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Annual Results</h2>
          <p className="text-sm text-slate-500">Select a class to manage report cards.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student..." 
                  className="w-full sm:w-64 pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">Select Class</option>
                {SPECIFIC_CLASSES.filter(c => !c.value.startsWith('Class 10')).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
        </div>
      </div>
      
      {selectedClass && filteredStudents.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 bg-white text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium">
                  <Settings size={16} /> Settings
              </button>
              <button onClick={() => downloadClassPDF()} className="flex items-center gap-2 bg-white text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium">
                  <Upload size={16} /> Class PDF
              </button>
              <div className="flex-1"></div>
              <button onClick={() => handlePublishAll(true)} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 text-sm font-bold">
                  <Share2 size={16} /> Publish Class
              </button>
              <button onClick={() => handlePublishAll(false)} className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-sm font-medium">
                  Unpublish All
              </button>
          </div>
      )}

      <div className="min-h-[400px]">
         {!selectedClass ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">No Class Selected</p>
                <p className="text-sm">Please select a class from the dropdown above.</p>
            </div>
         ) : filteredStudents.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
             <AlertCircle size={48} className="mb-4 opacity-20" />
             <p>No students found in this class.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStudents.map(student => {
                  const record = getRecord(student.id);
                  const isFilled = Object.keys(record.sem2Grades || {}).length > 0;
                  
                  return (
                      <button 
                        key={student.id}
                        onClick={() => setEditingStudentId(student.id)}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group flex flex-col h-full"
                      >
                          <div className="flex justify-between items-start mb-3 w-full">
                              <div className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded">
                                  Roll: {student.rollNo}
                              </div>
                              {record.published ? (
                                  <div className="text-emerald-600 bg-emerald-50 p-1 rounded-full" title="Published">
                                      <CheckCircle2 size={16} />
                                  </div>
                              ) : (
                                  <div className="text-slate-300 p-1" title="Draft">
                                      <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>
                                  </div>
                              )}
                          </div>
                          
                          <div className="mb-4 flex-1">
                              <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-700 transition-colors">
                                  {student.name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{student.className}</p>
                          </div>

                          <div className="w-full pt-3 border-t border-slate-50 flex justify-between items-center text-sm">
                              <span className={`text-xs font-medium ${isFilled ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  {isFilled ? 'Edit Grades' : 'Enter Grades'}
                              </span>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                          </div>
                      </button>
                  );
              })}
           </div>
         )}
      </div>

      {showSaveSuccess && (
          <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[100] animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <span className="font-medium">Changes Saved</span>
          </div>
      )}

      {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Report Card Settings</h3>
                      <button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-slate-400"/></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Select additional student fields to display on the report card.</p>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
                      {customFieldDefs.length === 0 ? (
                          <div className="text-sm text-slate-400 italic">No custom fields defined in Student Manager.</div>
                      ) : (
                          customFieldDefs.map(def => (
                              <label key={def.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-100">
                                  <input 
                                    type="checkbox" 
                                    checked={reportConfig.showCustomFields.includes(def.id)}
                                    onChange={() => toggleReportField(def.id)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                  />
                                  <span className="text-sm font-medium text-slate-700">{def.label}</span>
                              </label>
                          ))
                      )}
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm">Done</button>
              </div>
          </div>
      )}

      {previewData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-200 rounded-xl shadow-2xl max-w-5xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
                    <h3 className="font-bold text-slate-800">Report Card Preview</h3>
                    <div className="flex gap-2">
                        <button onClick={() => downloadPDF(previewData.student, previewData.record)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
                            <Upload size={16}/> Download
                        </button>
                        <button onClick={() => setPreviewData(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <X size={20}/>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-500/10">
                    <div className="bg-white shadow-lg" dangerouslySetInnerHTML={{ 
                        __html: `<style>${PDF_STYLES}</style>` + generatePDFContent(previewData.student, previewData.record) 
                    }} />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AnnualResultsManager;

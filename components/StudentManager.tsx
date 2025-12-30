
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Student, CLASSES, SPECIFIC_CLASSES, CustomFieldDefinition, User } from '../types';
import { Search, Filter, Trash2, X, GraduationCap, MapPin, Phone, Calendar, Settings, UserPlus, ChevronDown, CheckCircle2, Languages, Download, Lock, Key, ArrowRight, Upload, FileSpreadsheet, FileDown, AlertCircle, Info, Layers, Copy, Check, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { dbService } from '../services/db';

interface StudentManagerProps {
  students: Student[];
  setStudents: (val: React.SetStateAction<Student[]>) => void;
  customFieldDefs: CustomFieldDefinition[];
  setCustomFieldDefs: React.Dispatch<React.SetStateAction<CustomFieldDefinition[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
}

const StudentManager: React.FC<StudentManagerProps> = ({ 
  students, 
  setStudents, 
  customFieldDefs, 
  setCustomFieldDefs,
  users,
  setUsers,
  currentUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecificClass, setFilterSpecificClass] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Student> & { customId?: string, customPass?: string }>({
    name: '',
    rollNo: '',
    className: 'Class 1',
    medium: 'English',
    dob: '',
    placeOfBirth: '',
    address: '',
    phone: '',
    alternatePhone: '',
    customFields: {},
    customId: '',
    customPass: ''
  });

  const [newFieldName, setNewFieldName] = useState('');

  useEffect(() => {
    if (isModalOpen || isSettingsOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isModalOpen, isSettingsOpen]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNo.includes(searchQuery);
      let matchesClass = true;
      if (filterSpecificClass) {
          const [cls, med] = filterSpecificClass.split('|');
          matchesClass = s.className === cls && (s.medium || 'English') === med;
      }
      return matchesSearch && matchesClass;
    }).sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, searchQuery, filterSpecificClass]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualSync = async () => {
      setIsSyncing(true);
      try {
          await dbService.putAll('students', students);
          await dbService.putAll('users', users);
          showToast("Cloud Synchronized Successfully", "success");
      } catch (e) {
          showToast("Sync Failed", "error");
      } finally {
          setIsSyncing(false);
      }
  };

  const normalizeClassName = (val: string): string => {
    const v = val.trim();
    if (/^\d+$/.test(v)) return `Class ${v}`;
    const lower = v.toLowerCase();
    if (lower.includes('nur')) return 'Nursery';
    if (lower.includes('jr')) return 'Jr. KG';
    if (lower.includes('sr')) return 'Sr. KG';
    if (lower.startsWith('class ')) {
        const num = lower.replace('class ', '').trim();
        return `Class ${num.charAt(0).toUpperCase() + num.slice(1)}`;
    }
    return v;
  };

  const generateCredentials = (student: Student, allUsers: User[]) => {
    const dobParts = student.dob.split('-'); 
    const dobStr = dobParts.length === 3 ? `${dobParts[2]}${dobParts[1]}${dobParts[0]}` : student.dob.replace(/-/g, '');
    const nameParts = student.name.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
    const firstName = nameParts[0] || 'student';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    let username = `${firstName}${dobStr}`;
    const exists = allUsers.some(u => u.username === username && u.linkedStudentId !== student.id);
    if (exists && lastName) {
        username = `${firstName}${lastName}${dobStr}`;
    }

    const initials = nameParts.map(p => p[0]).join('') || 'stu';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const password = `${initials}${randomNum}`;
    
    return { username, password };
  };

  const handleCopyCredentials = (s: Student, u?: User) => {
      if (!u) return;
      const text = `Indrayani School Login\nStudent: ${s.name}\nID: ${u.username}\nPass: ${u.password}\nPortal: ${window.location.origin}`;
      navigator.clipboard.writeText(text);
      showToast("Login Details Copied", "success");
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    if (field === 'name') setNameError(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: { ...(prev.customFields || {}), [fieldId]: value }
    }));
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z ]+$/.test(formData.name || '')) {
      setNameError("Name must contain letters and spaces only.");
      return;
    }
    if (!/^\d{10}$/.test(formData.phone || '')) {
      alert("Phone must be 10 digits.");
      return;
    }

    const studentId = formData.id || crypto.randomUUID();
    const newStudent: Student = {
      id: studentId,
      name: (formData.name || '').trim(),
      rollNo: formData.rollNo || '',
      className: formData.className || 'Class 1',
      medium: (formData.medium as any) || 'English',
      dob: formData.dob || '',
      placeOfBirth: formData.placeOfBirth || '',
      address: formData.address || '',
      phone: formData.phone || '',
      alternatePhone: formData.alternatePhone || '',
      customFields: formData.customFields || {}
    };

    const { username, password } = generateCredentials(newStudent, users);
    
    setUsers(prev => {
      const existingUser = prev.find(u => u.linkedStudentId === studentId);
      const userPayload = { 
        id: existingUser?.id || crypto.randomUUID(),
        username: formData.customId || existingUser?.username || username,
        password: formData.customPass || existingUser?.password || password,
        name: newStudent.name,
        role: 'student' as const,
        linkedStudentId: studentId
      };

      if (existingUser) {
        return prev.map(u => u.linkedStudentId === studentId ? userPayload : u);
      } else {
        return [...prev, userPayload];
      }
    });

    if (formData.id) {
      setStudents(prev => prev.map(s => s.id === formData.id ? newStudent : s));
      showToast("Profile Updated", "success");
    } else {
      setStudents(prev => [...prev, newStudent]);
      showToast("Student Added! Cloud Syncing...", "success");
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', rollNo: '', className: 'Class 1', medium: 'English', dob: '', placeOfBirth: '', address: '', phone: '', alternatePhone: '', customFields: {}, customId: '', customPass: '' });
    setNameError(null);
  };

  const editStudent = (student: Student) => {
    const user = users.find(u => u.linkedStudentId === student.id);
    setFormData({ 
        ...student, 
        customId: user?.username || '', 
        customPass: user?.password || '' 
    });
    setNameError(null);
    setIsModalOpen(true);
  };

  const handleExportData = () => {
    const exportData = filteredStudents.map(s => ({
      'Roll No': s.rollNo,
      'Full Name': s.name,
      'Class': s.className,
      'Medium': s.medium || 'English',
      'DOB': s.dob,
      'Phone': s.phone,
      'Address': s.address
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `StudentList_${filterSpecificClass.replace('|', '_') || 'All'}.xlsx`);
  };

  const downloadImportTemplate = () => {
    const headers = [['Roll No', 'Full Name', 'Class', 'Medium', 'DOB (YYYY-MM-DD)', 'Place of Birth', 'Phone', 'Address']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      if (data.length === 0) { alert("File is empty."); return; }
      const importedStudents: Student[] = [];
      const newUsers: User[] = [];
      data.forEach((row: any) => {
        const studentId = crypto.randomUUID();
        const s: Student = {
          id: studentId,
          name: (row['Full Name'] || row['Name'] || '').toString().trim(),
          rollNo: (row['Roll No'] || row['Roll'] || '').toString(),
          className: normalizeClassName((row['Class'] || 'Class 1').toString()),
          medium: (row['Medium']?.toString().toLowerCase().includes('semi') ? 'Semi' : 'English'),
          dob: (row['DOB (YYYY-MM-DD)'] || row['DOB'] || '').toString(),
          placeOfBirth: (row['Place of Birth'] || '').toString(),
          phone: (row['Phone'] || '').toString().replace(/\D/g, ''),
          address: (row['Address'] || '').toString(),
          customFields: {}
        };
        if (s.name && s.rollNo) {
          importedStudents.push(s);
          const creds = generateCredentials(s, [...users, ...newUsers]);
          newUsers.push({
            id: crypto.randomUUID(),
            username: creds.username,
            password: creds.password,
            name: s.name,
            role: 'student',
            linkedStudentId: s.id
          });
        }
      });
      if (importedStudents.length > 0) {
        setStudents(prev => [...prev, ...importedStudents]);
        setUsers(prev => [...prev, ...newUsers]);
        showToast(`${importedStudents.length} Students Imported. Click Push to sync Cloud!`, "success");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleAddFieldDef = () => {
    if (!newFieldName.trim()) return;
    setCustomFieldDefs(prev => [...prev, { id: crypto.randomUUID(), label: newFieldName.trim() }]);
    setNewFieldName('');
  };

  const removeFieldDef = (id: string) => {
    if (window.confirm('Delete field?')) {
        dbService.delete('customFields', id);
        setCustomFieldDefs(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleRemoveStudent = async (student: Student) => {
    if (window.confirm(`Are you sure you want to remove ${student.name}?`)) {
      await dbService.delete('students', student.id);
      const studentUser = users.find(u => u.linkedStudentId === student.id);
      if (studentUser) await dbService.delete('users', studentUser.id);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      setUsers(prev => prev.filter(u => u.linkedStudentId !== student.id));
      showToast("Student Removed", "info");
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border bg-slate-800 text-white border-slate-700">
          <CheckCircle2 size={20} className="text-emerald-400"/>
          <span className="text-sm font-bold uppercase tracking-wider">{toast.msg}</span>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-300 flex flex-col lg:flex-row gap-4 items-center justify-between no-print">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                <input type="text" placeholder="Search name or roll no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-400 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all font-bold text-slate-900" />
            </div>
            <div className="relative">
                <select value={filterSpecificClass} onChange={(e) => setFilterSpecificClass(e.target.value)}
                    className="appearance-none pl-10 pr-10 py-2.5 bg-slate-100 border border-slate-400 rounded-xl text-sm font-black text-slate-800 outline-none cursor-pointer">
                    <option value="">All Classes</option>
                    {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
            </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1">
            <button onClick={handleManualSync} disabled={isSyncing} className={`p-2.5 rounded-xl border transition-all shadow-sm ${isSyncing ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-indigo-600 border-slate-400 hover:bg-indigo-50'}`} title="Push All to Cloud">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={downloadImportTemplate} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors shadow-sm" title="Template"><FileDown size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-400 text-slate-800 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"><Download size={16} /> Import</button>
            <button onClick={handleExportData} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-400 text-slate-800 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"><Upload size={16} /> Export</button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-slate-200 text-slate-800 rounded-xl border border-slate-400 shadow-sm hover:bg-slate-300 transition-colors"><Settings size={20} /></button>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg whitespace-nowrap"><UserPlus size={18} /> Admit Student</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-500 flex flex-col items-center">
                <GraduationCap size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 italic font-black uppercase tracking-widest">No Students Found</p>
            </div>
        ) : (
            filteredStudents.map(student => {
                const studentUser = users.find(u => u.role === 'student' && u.linkedStudentId === student.id);
                const studentCustomFields = customFieldDefs.filter(def => student.customFields?.[def.id]);

                return (
                    <div key={student.id} className={`bg-white rounded-2xl border transition-all ${expandedStudentId === student.id ? 'border-indigo-600 ring-4 ring-indigo-100 shadow-xl' : 'border-slate-300 hover:border-indigo-400 shadow-sm'}`}>
                        <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${expandedStudentId === student.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'}`}>{student.rollNo}</div>
                            <div className="flex-1 overflow-hidden">
                                <h3 className="font-black text-slate-950 text-sm truncate uppercase">{student.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase border border-indigo-200">{student.className}</span>
                                    {studentUser ? (
                                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase border border-emerald-100 flex items-center gap-1"><Lock size={8}/> Access Active</span>
                                    ) : (
                                        <span className="text-[9px] font-black bg-rose-50 text-rose-500 px-2 py-0.5 rounded uppercase border border-rose-100">No Login</span>
                                    )}
                                </div>
                            </div>
                            <ChevronDown size={18} className={`text-slate-500 transition-transform ${expandedStudentId === student.id ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedStudentId === student.id && (
                            <div className="px-5 pb-5 pt-2 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 text-[11px] font-bold">
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                            <div className="flex items-center gap-2 text-slate-900"><Calendar size={14} className="text-slate-600" /> {student.dob || 'No DOB'}</div>
                                            <div className="flex items-center gap-2 text-slate-900"><Phone size={14} className="text-slate-600" /> {student.phone}</div>
                                            <div className="flex items-center gap-2 text-slate-900 col-span-2"><MapPin size={14} className="text-slate-600" /> {student.address}</div>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Lock size={12}/> Login Credentials</h4>
                                            {studentUser && (
                                                <button onClick={() => handleCopyCredentials(student, studentUser)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm">
                                                    <Copy size={12}/> Copy for Parents
                                                </button>
                                            )}
                                        </div>
                                        {studentUser ? (
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div><span className="text-[10px] text-slate-400 uppercase block mb-1">Username</span><span className="font-black font-mono text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-100 block">{studentUser.username}</span></div>
                                                <div><span className="text-[10px] text-slate-400 uppercase block mb-1">Password</span><span className="font-black font-mono text-indigo-900 bg-white px-2 py-1 rounded border border-indigo-100 block">{studentUser.password}</span></div>
                                            </div>
                                        ) : (
                                            <div className="text-rose-400 italic text-[11px] font-bold">Login account was not generated. Edit profile to fix.</div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center justify-end gap-2 pt-4 border-t border-slate-300">
                                    <button onClick={() => editStudent(student)} className="px-4 py-2 bg-indigo-50 text-indigo-800 rounded-lg text-[10px] font-black uppercase border border-indigo-200">Edit Profile</button>
                                    <button onClick={() => handleRemoveStudent(student)} className="px-4 py-2 bg-rose-50 text-rose-800 rounded-lg text-[10px] font-black uppercase border border-rose-200">Remove</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })
        )}
      </div>

      {/* PORTALED ADMISSION MODAL */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col pointer-events-none">
            <div className="absolute inset-0 top-[var(--header-height)] bg-slate-950/40 backdrop-blur-md pointer-events-auto" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative top-[var(--header-height)] flex-1 overflow-hidden flex items-start justify-center p-4 pointer-events-none">
                <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-top-4 duration-300 border border-slate-200 max-h-[calc(100dvh-var(--header-height)-2rem)] overflow-hidden">
                    <div className="px-8 pt-8 pb-4 shrink-0 bg-white">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[1.5rem] font-bold text-[#1e1b4b] leading-tight tracking-tight">
                                {formData.id ? 'Edit Profile' : 'New Admission'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
                        </div>
                    </div>
                    <form onSubmit={handleAddStudent} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Full Name</label>
                                    <input id="student-name-input" type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className={`w-full px-4 py-3 bg-white border ${nameError ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-100' : 'border-slate-200'} rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] transition-all shadow-sm`} placeholder="e.g. Rahul Sharma" required />
                                    {nameError && <p className="text-[10px] text-rose-600 font-bold mt-1.5 flex items-center gap-1 animate-in slide-in-from-top-1"><AlertCircle size={12}/> {nameError}</p>}
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Standard</label>
                                    <select value={formData.className} onChange={(e) => handleInputChange('className', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#818cf8] transition-all shadow-sm cursor-pointer" required>
                                        {CLASSES.map(cls => <option key={cls.value} value={cls.value}>{cls.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Roll No</label>
                                    <input type="text" value={formData.rollNo} onChange={(e) => handleInputChange('rollNo', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="101" required />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">DOB</label>
                                    <input type="date" value={formData.dob} onChange={(e) => handleInputChange('dob', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" required />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Place of Birth</label>
                                    <input type="text" value={formData.placeOfBirth} onChange={(e) => handleInputChange('placeOfBirth', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="e.g. Mumbai" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Phone</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-[#818cf8] shadow-sm" placeholder="10 digits" maxLength={10} required />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-0.5 tracking-wider">Access ID</label>
                                    <input type="text" value={formData.customId} onChange={(e) => handleInputChange('customId', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-900 outline-none focus:border-indigo-400" placeholder="Auto-generated" />
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Address</label>
                                <textarea value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none min-h-[80px] focus:border-[#818cf8] transition-all resize-none shadow-sm" />
                            </div>
                        </div>
                        <div className="px-8 py-6 shrink-0 flex items-center justify-end gap-6 bg-white border-t border-slate-50 sticky bottom-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-base font-semibold text-slate-500 hover:text-slate-900">Cancel</button>
                            <button type="submit" className="px-10 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-bold shadow-lg shadow-indigo-100 hover:bg-[#818cf8] transition-all active:scale-95 leading-none glow-indigo">Save & Sync</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StudentManager;

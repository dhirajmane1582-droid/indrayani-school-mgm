
import React, { useState, useMemo, useRef } from 'react';
import { Student, CLASSES, SPECIFIC_CLASSES, CustomFieldDefinition, User } from '../types';
import { Plus, Search, Filter, Trash2, X, GraduationCap, MapPin, Phone, Calendar, Info, Settings, UserPlus, ChevronDown, Upload, FileDown, AlertCircle, CheckCircle2, ArrowLeft, Smartphone, User as UserIcon, CreditCard, Users as UsersIcon, Heart } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    rollNo: '',
    className: 'Class 1',
    medium: 'English',
    dob: '',
    placeOfBirth: '',
    address: '',
    phone: '',
    alternatePhone: '',
    customFields: {}
  });

  const [newFieldName, setNewFieldName] = useState('');

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
    setTimeout(() => setToast(null), 4000);
  };

  const validateStudent = (s: Partial<Student>): { valid: boolean, errors: string[] } => {
    const errors: string[] = [];
    const nameRegex = /^[a-zA-Z0-9 ]+$/;
    if (!s.name || !nameRegex.test(s.name)) {
      errors.push("Name must be alphanumeric only.");
    }
    const phoneRegex = /^\d{10}$/;
    if (!s.phone || !phoneRegex.test(s.phone)) {
      errors.push("Primary Phone must be exactly 10 digits.");
    }
    if (s.alternatePhone && s.alternatePhone.trim() !== '' && !phoneRegex.test(s.alternatePhone)) {
      errors.push("Alternate Phone must be 10 digits.");
    }
    if (!s.rollNo) errors.push("Roll Number is required.");
    if (!s.className) errors.push("Class selection is required.");
    return { valid: errors.length === 0, errors };
  };

  const handleInputChange = (field: keyof Student, value: any) => {
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
    const { valid, errors } = validateStudent(formData);
    if (!valid) {
      alert(`Validation Errors:\n\n• ${errors.join('\n• ')}`);
      return;
    }
    const newStudent: Student = {
      id: formData.id || crypto.randomUUID(),
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
    if (formData.id) {
      setStudents(prev => prev.map(s => s.id === formData.id ? newStudent : s));
      showToast("Profile Updated", "success");
    } else {
      setStudents(prev => [...prev, newStudent]);
      showToast("Admission Successful", "success");
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', rollNo: '', className: 'Class 1', medium: 'English', dob: '', placeOfBirth: '', address: '', phone: '', alternatePhone: '', customFields: {} });
  };

  const editStudent = (student: Student) => {
    setFormData(student);
    setIsModalOpen(true);
  };

  const handleQuickAddField = (label: string) => {
    if (customFieldDefs.some(d => d.label.toLowerCase() === label.toLowerCase())) {
        showToast(`${label} already exists`, 'info');
        return;
    }
    const newDef: CustomFieldDefinition = { id: crypto.randomUUID(), label };
    setCustomFieldDefs(prev => [...prev, newDef]);
    showToast(`Added ${label} to custom fields`, 'success');
  };

  const handleAddFieldDef = () => {
    if (!newFieldName.trim()) return;
    const newDef: CustomFieldDefinition = { id: crypto.randomUUID(), label: newFieldName.trim() };
    setCustomFieldDefs(prev => [...prev, newDef]);
    setNewFieldName('');
  };

  const removeFieldDef = (id: string) => {
    if (window.confirm("Remove this field? Existing student data for this field will be hidden.")) {
        setCustomFieldDefs(prev => prev.filter(d => d.id !== id));
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Full Name': 'Rahul Patil',
        'Roll No': '101',
        'Class': 'Class 1',
        'Medium': 'English',
        'DOB': '2015-05-20',
        'Place of Birth': 'Mumbai',
        'Address': 'Sector 18, Koparkhairane',
        'Phone': '9876543210',
        'Alternate Phone': '8876543210',
        ...customFieldDefs.reduce((acc, def) => ({ ...acc, [def.label]: '' }), {})
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "School_Admission_Template.xlsx");
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const newStudents: Student[] = [];
        let successCount = 0;
        let failCount = 0;
        data.forEach((row: any) => {
          const studentData: Partial<Student> = {
            name: String(row['Full Name'] || row['Name'] || '').trim(),
            rollNo: String(row['Roll No'] || row['Roll Number'] || ''),
            className: String(row['Class'] || 'Class 1'),
            medium: String(row['Medium'] || 'English').toLowerCase().includes('semi') ? 'Semi' : 'English',
            dob: String(row['DOB'] || row['Date of Birth'] || ''),
            placeOfBirth: String(row['Place of Birth'] || ''),
            address: String(row['Address'] || ''),
            phone: String(row['Phone'] || row['Mobile'] || '').replace(/\D/g, ''),
            alternatePhone: String(row['Alternate Phone'] || '').replace(/\D/g, ''),
            customFields: {}
          };
          customFieldDefs.forEach(def => {
            if (row[def.label]) studentData.customFields![def.id] = String(row[def.label]);
          });
          const { valid } = validateStudent(studentData);
          if (valid) {
            newStudents.push({ ...(studentData as Student), id: crypto.randomUUID() });
            successCount++;
          } else {
            failCount++;
          }
        });
        if (newStudents.length > 0) {
          setStudents(prev => [...prev, ...newStudents]);
          showToast(`Imported ${successCount} Students.`, 'success');
        } else {
          showToast("Import failed. Check formatting.", "error");
        }
      } catch (err) {
        showToast("Error processing file", "error");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 border ${
          toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-400' : 
          toast.type === 'error' ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-800 text-white border-slate-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          <span className="text-sm font-bold uppercase tracking-wider">{toast.msg}</span>
        </div>
      )}

      {/* List Controls */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" placeholder="Search name or roll no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800" />
            </div>
            <div className="relative">
                <select value={filterSpecificClass} onChange={(e) => setFilterSpecificClass(e.target.value)}
                    className="appearance-none pl-10 pr-10 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none cursor-pointer">
                    <option value="">All Classes</option>
                    {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1">
            <button onClick={downloadTemplate} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all"><FileDown size={16} /> Template</button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-200 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all"><Upload size={16} /> Import<input type="file" ref={fileInputRef} onChange={handleBulkImport} accept=".xlsx,.xls,.csv" className="hidden" /></button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all shadow-sm"><Settings size={20} /></button>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 whitespace-nowrap"><UserPlus size={18} /> Admit Student</button>
        </div>
      </div>

      {/* Student List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-400 flex flex-col items-center">
                <GraduationCap size={48} className="text-slate-200 mb-4" />
                <p className="text-slate-400 italic font-black uppercase tracking-widest">No Students Found</p>
            </div>
        ) : (
            filteredStudents.map(student => (
                <div key={student.id} className={`bg-white rounded-2xl border transition-all ${expandedStudentId === student.id ? 'border-indigo-500 ring-4 ring-indigo-100/50 shadow-xl' : 'border-slate-300 hover:border-indigo-400 shadow-sm'}`}>
                    <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${expandedStudentId === student.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{student.rollNo}</div>
                        <div className="flex-1 overflow-hidden">
                            <h3 className="font-black text-slate-900 text-sm truncate uppercase">{student.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">{student.className} ({student.medium || 'English'})</span>
                            </div>
                        </div>
                        <ChevronDown size={18} className={`text-slate-400 transition-transform ${expandedStudentId === student.id ? 'rotate-180 text-indigo-600' : ''}`} />
                    </div>
                    {expandedStudentId === student.id && (
                        <div className="px-5 pb-5 pt-2 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-100 p-4 rounded-xl border border-slate-200 text-[11px] font-bold">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-800"><Calendar size={14} className="text-slate-500" /> DOB: {student.dob || 'N/A'}</div>
                                    <div className="flex items-center gap-2 text-slate-800"><MapPin size={14} className="text-slate-500" /> {student.placeOfBirth || '-'}</div>
                                    <div className="flex items-center gap-2 text-slate-800"><Phone size={14} className="text-slate-500" /> {student.phone}</div>
                                </div>
                                <div className="space-y-2 text-slate-800">
                                    <div className="flex items-start gap-2"><Info size={14} className="text-slate-500 mt-0.5" /> <span className="line-clamp-3">{student.address || 'No Address Recorded'}</span></div>
                                </div>
                            </div>
                            <div className="mt-5 flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                                <button onClick={() => editStudent(student)} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">Edit Profile</button>
                                <button onClick={() => { if(window.confirm('Delete student record?')) setStudents(prev => prev.filter(s => s.id !== student.id)); }} className="px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-100">Remove</button>
                            </div>
                        </div>
                    )}
                </div>
            ))
        )}
      </div>

      {/* ADMISSION MODAL - ENHANCED VISIBILITY */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[400] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
            <form onSubmit={handleAddStudent} className="bg-white w-full max-w-5xl h-full sm:h-[90vh] sm:rounded-[2rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden border border-slate-400">
                {/* Modern Header - Darker Gray */}
                <div className="px-8 h-20 flex items-center justify-between border-b border-slate-300 bg-slate-100">
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="p-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-2xl transition-all border border-transparent hover:border-slate-300">
                            <ArrowLeft size={22} />
                        </button>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{formData.id ? 'Update Profile' : 'Student Admission'}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-200">System v2.5</span>
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="text-right">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Academic Year</div>
                             <div className="text-xs font-black text-slate-900">2025 - 2026</div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100/50">
                            <GraduationCap size={24} />
                        </div>
                    </div>
                </div>

                {/* Form Content - High Contrast */}
                <div className="flex-1 overflow-y-auto px-8 py-10 no-scrollbar bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        
                        {/* Primary Information Column */}
                        <div className="lg:col-span-7 space-y-12">
                            
                            {/* Section: Basic Identity */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md"><UserIcon size={18}/></div>
                                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.25em]">Identity Profile</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="sm:col-span-2 group">
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider group-focus-within:text-indigo-600 transition-colors">Full Name (Legal)</label>
                                        <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} 
                                            className="w-full px-5 py-4 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-sm" 
                                            placeholder="First Middle Last Name" required />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Academic Roll No</label>
                                        <input type="text" value={formData.rollNo} onChange={(e) => handleInputChange('rollNo', e.target.value)} 
                                            className="w-full px-5 py-4 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-sm" 
                                            placeholder="Reg. ID" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Medium of Instruction</label>
                                        <div className="flex bg-slate-200 p-1.5 rounded-2xl border border-slate-300">
                                            <button type="button" onClick={() => handleInputChange('medium', 'English')} 
                                                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.25rem] transition-all ${formData.medium === 'English' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-slate-300' : 'text-slate-500 hover:text-slate-800'}`}>
                                                English
                                            </button>
                                            <button type="button" onClick={() => handleInputChange('medium', 'Semi')} 
                                                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-[1.25rem] transition-all ${formData.medium === 'Semi' ? 'bg-white text-orange-700 shadow-md ring-1 ring-slate-300' : 'text-slate-500 hover:text-slate-800'}`}>
                                                Semi
                                            </button>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Class Allocation</label>
                                        <div className="relative">
                                            <select value={formData.className} onChange={(e) => handleInputChange('className', e.target.value)} 
                                                className="w-full appearance-none px-5 py-4 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-sm">
                                                {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={20} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Contact & Emergency */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md"><Phone size={18}/></div>
                                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.25em]">Contact Channels</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Primary Phone</label>
                                        <Smartphone className="absolute left-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
                                        <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))} 
                                            placeholder="10 Digits" maxLength={10}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-sm" required />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Secondary / Emergency</label>
                                        <Phone className="absolute left-4 bottom-4 text-slate-500 pointer-events-none" size={18} />
                                        <input type="tel" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value.replace(/\D/g, ''))} 
                                            placeholder="Alternative Phone" maxLength={10}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-sm" />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Secondary Column: Address & Custom */}
                        <div className="lg:col-span-5 space-y-12">
                            
                            {/* Section: Geo & Personal */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md"><MapPin size={18}/></div>
                                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.25em]">Personal Details</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Birth Date</label>
                                        <input type="date" value={formData.dob} onChange={(e) => handleInputChange('dob', e.target.value)} 
                                            className="w-full px-4 py-4 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Birth Place</label>
                                        <input type="text" value={formData.placeOfBirth} onChange={(e) => handleInputChange('placeOfBirth', e.target.value)} 
                                            placeholder="City Name"
                                            className="w-full px-4 py-4 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">Residence Address</label>
                                        <textarea value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} 
                                            className="w-full px-5 py-5 bg-slate-100 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 outline-none min-h-[140px] focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm leading-relaxed" 
                                            placeholder="Full permanent residential address..." />
                                    </div>
                                </div>
                            </section>

                            {/* Section: Custom / Suggestion Fields */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md"><Plus size={18}/></div>
                                        <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.25em]">Extended Profile</h4>
                                    </div>
                                    <button type="button" onClick={() => setIsSettingsOpen(true)} className="p-2 text-indigo-700 hover:bg-slate-200 rounded-lg transition-colors border border-transparent hover:border-slate-300"><Settings size={18}/></button>
                                </div>

                                {/* SUGGESTED CUSTOM FIELDS - DARKER BACKGROUND FOR CONTRAST */}
                                <div className="bg-slate-100 p-6 rounded-[2rem] border border-slate-300 space-y-6 shadow-inner">
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => handleQuickAddField("Father's Name")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-xl text-[10px] font-black uppercase hover:shadow-md hover:border-indigo-400 transition-all"><UsersIcon size={12}/> + Father</button>
                                        <button type="button" onClick={() => handleQuickAddField("Mother's Name")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-xl text-[10px] font-black uppercase hover:shadow-md hover:border-indigo-400 transition-all"><Heart size={12}/> + Mother</button>
                                        <button type="button" onClick={() => handleQuickAddField("Bank Account No")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-xl text-[10px] font-black uppercase hover:shadow-md hover:border-indigo-400 transition-all"><CreditCard size={12}/> + Bank</button>
                                        <button type="button" onClick={() => handleQuickAddField("Aadhar Card No")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-xl text-[10px] font-black uppercase hover:shadow-md hover:border-indigo-400 transition-all"><Info size={12}/> + Aadhar</button>
                                    </div>

                                    {customFieldDefs.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-6">
                                            {customFieldDefs.map(def => (
                                                <div key={def.id}>
                                                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-2 ml-1 tracking-wider">{def.label}</label>
                                                    <input type="text" value={formData.customFields?.[def.id] || ''} onChange={(e) => handleCustomFieldChange(def.id, e.target.value)} 
                                                        className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-sm" 
                                                        placeholder={`Enter ${def.label}`} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 px-4 border border-dashed border-slate-400 rounded-2xl">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">No custom fields active. Use quick-add above to capture details like Parent Names or Banking info.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Footer Controls - Darker background */}
                <div className="px-8 py-8 border-t border-slate-300 flex items-center justify-end gap-4 bg-slate-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} 
                        className="px-8 py-4 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-md border border-transparent hover:border-slate-300 transition-all">
                        Discard
                    </button>
                    <button type="submit" 
                        className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200/50 hover:bg-indigo-700 active:scale-95 transition-all">
                        {formData.id ? 'Update Student Record' : 'Confirm & Complete Enrollment'}
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* Field Settings Modal - Darker theme */}
      {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[500] p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200 border border-slate-400">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-xl font-black text-slate-900">Field Configurator</h3>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Manage Admission Schema</p>
                      </div>
                      <button onClick={() => setIsSettingsOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><X size={24}/></button>
                  </div>
                  <div className="space-y-8">
                      <div className="bg-slate-100 p-5 rounded-3xl border border-slate-300">
                          <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 ml-1 tracking-widest">New Field Definition</label>
                          <div className="flex gap-2">
                              <input type="text" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="e.g. Passport ID" className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-slate-900 shadow-sm" />
                              <button onClick={handleAddFieldDef} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-90"><Plus size={20}/></button>
                          </div>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                          {customFieldDefs.length === 0 ? (
                              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No custom fields defined</p>
                              </div>
                          ) : (
                              customFieldDefs.map(def => (
                                  <div key={def.id} className="flex items-center justify-between p-4 bg-white border border-slate-300 rounded-2xl shadow-sm hover:border-indigo-300 transition-all group">
                                      <span className="text-sm font-bold text-slate-800">{def.label}</span>
                                      <button onClick={() => removeFieldDef(def.id)} className="text-slate-300 hover:text-rose-600 transition-colors p-2 hover:bg-rose-50 rounded-xl"><Trash2 size={18}/></button>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black transition-all shadow-xl">Apply Schema Changes</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentManager;

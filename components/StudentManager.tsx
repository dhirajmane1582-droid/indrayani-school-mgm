
import React, { useState, useMemo, useRef } from 'react';
import { Student, CLASSES, SPECIFIC_CLASSES, CustomFieldDefinition, User } from '../types';
import { Plus, Search, Filter, Trash2, X, GraduationCap, MapPin, Phone, Calendar, Info, Settings, UserPlus, ChevronDown, Upload, FileDown, AlertCircle, CheckCircle2, ArrowLeft, Smartphone, User as UserIcon, CreditCard, Users as UsersIcon, Heart, Languages, Download } from 'lucide-react';
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

  const handleExportData = () => {
    if (filteredStudents.length === 0) {
      showToast("No data to export", "info");
      return;
    }

    const exportData = filteredStudents.map(s => {
      const row: any = {
        'Roll No': s.rollNo,
        'Full Name': s.name,
        'Class': s.className,
        'Medium': s.medium || 'English',
        'Date of Birth': s.dob,
        'Place of Birth': s.placeOfBirth || '',
        'Phone': s.phone,
        'Alternate Phone': s.alternatePhone || '',
        'Address': s.address
      };
      
      // Add custom fields
      customFieldDefs.forEach(def => {
        row[def.label] = s.customFields?.[def.id] || '';
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `StudentList_${filterSpecificClass || 'All'}.xlsx`);
    showToast("Export Successful", "success");
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
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-300 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                <input type="text" placeholder="Search name or roll no..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-400 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all font-bold text-slate-900 placeholder-slate-500" />
            </div>
            <div className="relative">
                <select value={filterSpecificClass} onChange={(e) => setFilterSpecificClass(e.target.value)}
                    className="appearance-none pl-10 pr-10 py-2.5 bg-slate-100 border border-slate-400 rounded-xl text-sm font-black text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none cursor-pointer">
                    <option value="">All Classes</option>
                    {SPECIFIC_CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
            </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1">
            <button onClick={handleExportData} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-400 text-slate-800 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm"><Download size={16} /> Export</button>
            <button onClick={downloadTemplate} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-400 text-slate-800 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm"><FileDown size={16} /> Template</button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-100 border border-indigo-400 text-indigo-900 rounded-xl hover:bg-indigo-200 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm"><Upload size={16} /> Import<input type="file" ref={fileInputRef} onChange={handleBulkImport} accept=".xlsx,.xls,.csv" className="hidden" /></button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 transition-all border border-slate-400 shadow-sm"><Settings size={20} /></button>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 whitespace-nowrap"><UserPlus size={18} /> Admit Student</button>
        </div>
      </div>

      {/* Student List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-500 flex flex-col items-center">
                <GraduationCap size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 italic font-black uppercase tracking-widest">No Students Found</p>
            </div>
        ) : (
            filteredStudents.map(student => (
                <div key={student.id} className={`bg-white rounded-2xl border transition-all ${expandedStudentId === student.id ? 'border-indigo-600 ring-4 ring-indigo-100 shadow-xl' : 'border-slate-300 hover:border-indigo-400 shadow-sm'}`}>
                    <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${expandedStudentId === student.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-800'}`}>{student.rollNo}</div>
                        <div className="flex-1 overflow-hidden">
                            <h3 className="font-black text-slate-950 text-sm truncate uppercase">{student.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded uppercase border border-indigo-200">{student.className} ({student.medium || 'English'})</span>
                            </div>
                        </div>
                        <ChevronDown size={18} className={`text-slate-500 transition-transform ${expandedStudentId === student.id ? 'rotate-180 text-indigo-700' : ''}`} />
                    </div>
                    {expandedStudentId === student.id && (
                        <div className="px-5 pb-5 pt-2 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-100 p-4 rounded-xl border border-slate-300 text-[11px] font-bold">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-900"><Calendar size={14} className="text-slate-600" /> DOB: {student.dob || 'N/A'}</div>
                                    <div className="flex items-center gap-2 text-slate-900"><MapPin size={14} className="text-slate-600" /> {student.placeOfBirth || '-'}</div>
                                    <div className="flex items-center gap-2 text-slate-900"><Phone size={14} className="text-slate-600" /> {student.phone}</div>
                                </div>
                                <div className="space-y-2 text-slate-900">
                                    <div className="flex items-start gap-2"><Info size={14} className="text-slate-600 mt-0.5" /> <span className="line-clamp-3">{student.address || 'No Address Recorded'}</span></div>
                                </div>
                            </div>
                            <div className="mt-5 flex items-center justify-end gap-2 pt-4 border-t border-slate-300">
                                <button onClick={() => editStudent(student)} className="px-4 py-2 bg-indigo-50 text-indigo-800 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-200 hover:bg-indigo-100">Edit Profile</button>
                                <button onClick={() => { if(window.confirm('Delete student record?')) setStudents(prev => prev.filter(s => s.id !== student.id)); }} className="px-4 py-2 bg-rose-50 text-rose-800 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-200 hover:bg-rose-100">Remove</button>
                            </div>
                        </div>
                    )}
                </div>
            ))
        )}
      </div>

      {/* ADMISSION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-8 pt-8 pb-4 shrink-0">
                    <h3 className="text-2xl font-black text-[#1e1b4b] tracking-tight">{formData.id ? 'Edit Student' : 'Add New Student'}</h3>
                </div>

                {/* Form Body - Scrollable */}
                <form onSubmit={handleAddStudent} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-8 py-4 no-scrollbar space-y-5">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {/* Full Name */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Full Name</label>
                                <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-indigo-400 transition-all" 
                                    placeholder="e.g. John Doe" required />
                            </div>

                            {/* Roll Number */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Roll Number</label>
                                <input type="text" value={formData.rollNo} onChange={(e) => handleInputChange('rollNo', e.target.value)} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-indigo-400 transition-all" 
                                    placeholder="e.g. 101" required />
                            </div>

                            {/* Date of Birth */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Date of Birth</label>
                                <input type="date" value={formData.dob} onChange={(e) => handleInputChange('dob', e.target.value)} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-indigo-400 transition-all" />
                            </div>

                            {/* Place of Birth */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Place of Birth</label>
                                <input type="text" value={formData.placeOfBirth} onChange={(e) => handleInputChange('placeOfBirth', e.target.value)} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-indigo-400 transition-all" 
                                    placeholder="e.g. Mumbai" />
                            </div>

                            {/* Grade / Class Selection */}
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Assigned Class</label>
                                <div className="relative">
                                    <select value={formData.className} onChange={(e) => handleInputChange('className', e.target.value)} 
                                        className="w-full appearance-none px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 transition-all">
                                        {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Medium Toggle Section */}
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Medium</label>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => handleInputChange('medium', 'English')} 
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${formData.medium === 'English' ? 'bg-[#eef2ff] border-indigo-200 text-[#4338ca]' : 'bg-white border-slate-200 text-slate-900'}`}>
                                        <Languages size={18} /> English Med.
                                    </button>
                                    <button type="button" onClick={() => handleInputChange('medium', 'Semi')} 
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${formData.medium === 'Semi' ? 'bg-[#eef2ff] border-indigo-200 text-[#4338ca]' : 'bg-white border-slate-200 text-slate-900'}`}>
                                        <Languages size={18} /> Semi English
                                    </button>
                                </div>
                            </div>

                            {/* Phone Numbers */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Phone No</label>
                                <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-indigo-400 transition-all" 
                                    placeholder="e.g. 9876543210" maxLength={10} required />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Alternate Phone</label>
                                <input type="tel" value={formData.alternatePhone} onChange={(e) => handleInputChange('alternatePhone', e.target.value.replace(/\D/g, ''))} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-indigo-400 transition-all" 
                                    placeholder="Optional" maxLength={10} />
                            </div>

                            {/* Address */}
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">Address</label>
                                <textarea value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} 
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none min-h-[100px] focus:border-indigo-400 transition-all resize-none" 
                                    placeholder="e.g. 123 Main St, City" />
                            </div>
                        </div>

                        {/* Custom Fields Section */}
                        {customFieldDefs.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extended Information</h4>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    {customFieldDefs.map(def => (
                                        <div key={def.id} className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-800 mb-2 ml-0.5">{def.label}</label>
                                            <input type="text" value={formData.customFields?.[def.id] || ''} onChange={(e) => handleCustomFieldChange(def.id, e.target.value)} 
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-300 outline-none focus:border-indigo-400 transition-all" 
                                                placeholder={`Enter ${def.label}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-6 shrink-0 flex items-center justify-end gap-6 bg-white">
                        <button type="button" onClick={() => setIsModalOpen(false)} 
                            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" 
                            className="px-10 py-2.5 bg-[#a5b4fc] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#818cf8] transition-all">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* NEW MANAGE CUSTOM FIELDS MODAL - DESIGNED FROM SCREENSHOT */}
      {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
              <div className="bg-white rounded-[1.5rem] shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-8">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-6">
                          <h3 className="text-[1.3rem] font-bold text-[#1e293b] leading-tight">Manage Custom Fields</h3>
                          <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors -mt-1 -mr-1">
                              <X size={24} strokeWidth={1.5} />
                          </button>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[#64748b] leading-relaxed mb-8">
                          Add custom fields like "Mother's Name" or "Bank Details" to your student profiles.
                      </p>

                      {/* Input Section */}
                      <div className="flex gap-3 mb-8">
                          <input 
                              type="text" 
                              value={newFieldName} 
                              onChange={(e) => setNewFieldName(e.target.value)} 
                              placeholder="Field Name (e.g. Mother's Name)" 
                              className="flex-1 px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-300 transition-all"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddFieldDef()}
                          />
                          <button 
                              onClick={handleAddFieldDef} 
                              className="bg-[#a5b4fc] text-white px-7 py-3.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#818cf8] transition-all active:scale-95"
                          >
                              Add
                          </button>
                      </div>

                      {/* Fields List */}
                      <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                          {customFieldDefs.length === 0 ? (
                              <div className="text-center py-6">
                                  <p className="text-sm italic text-[#94a3b8]">No custom fields added yet.</p>
                              </div>
                          ) : (
                              customFieldDefs.map(def => (
                                  <div key={def.id} className="flex items-center justify-between px-5 py-4 bg-white border border-slate-100 rounded-xl shadow-sm group hover:border-indigo-200 transition-all">
                                      <span className="text-sm font-bold text-[#1e293b]">{def.label}</span>
                                      <button 
                                          onClick={() => removeFieldDef(def.id)} 
                                          className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                      >
                                          <Trash2 size={18} strokeWidth={1.5} />
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end">
                          <button 
                              onClick={() => setIsSettingsOpen(false)} 
                              className="px-8 py-2.5 bg-[#f1f5f9] text-[#1e293b] rounded-xl text-sm font-bold hover:bg-[#e2e8f0] transition-all"
                          >
                              Done
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentManager;


import React, { useRef, useState } from 'react';
import { Database, DownloadCloud, UploadCloud, AlertTriangle, CheckCircle2, ShieldAlert, FileJson, Terminal, Copy, ExternalLink } from 'lucide-react';

interface SystemManagerProps {
  onExport: () => void;
  onImport: (data: any) => void;
}

const SystemManager: React.FC<SystemManagerProps> = ({ onExport, onImport }) => {
  const [status, setStatus] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [showSql, setShowSql] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sqlSchema = `-- INDRAYANI SCHOOL DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to fix "Table not found" or missing column errors.

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "rollNo" TEXT,
  "className" TEXT,
  medium TEXT,
  dob TEXT,
  "placeOfBirth" TEXT,
  address TEXT,
  phone TEXT,
  "alternatePhone" TEXT,
  "customFields" JSONB DEFAULT '{}'::jsonb
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT,
  "linkedStudentId" UUID
);

-- 3. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  "studentId" UUID REFERENCES students(id) ON DELETE CASCADE,
  present BOOLEAN
);

-- 4. Exams Table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  type TEXT,
  date TEXT,
  "className" TEXT,
  published BOOLEAN DEFAULT false,
  "customMaxMarks" JSONB DEFAULT '{}'::jsonb,
  "customEvaluationTypes" JSONB DEFAULT '{}'::jsonb,
  "activeSubjectIds" TEXT[],
  "customSubjects" JSONB DEFAULT '[]'::jsonb,
  timetable JSONB DEFAULT '[]'::jsonb
);

-- Ensure timetable and other columns exist for users with old tables
ALTER TABLE exams ADD COLUMN IF NOT EXISTS timetable JSONB DEFAULT '[]'::jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "customMaxMarks" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "customEvaluationTypes" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "activeSubjectIds" TEXT[];
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "customSubjects" JSONB DEFAULT '[]'::jsonb;

-- 5. Results Table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" UUID REFERENCES students(id) ON DELETE CASCADE,
  "examId" UUID REFERENCES exams(id) ON DELETE CASCADE,
  marks JSONB DEFAULT '{}'::jsonb,
  "aiRemark" TEXT,
  published BOOLEAN DEFAULT false
);

-- 6. Annual Records Table
CREATE TABLE IF NOT EXISTS annual_records (
  "studentId" UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  "academicYear" TEXT,
  grades JSONB DEFAULT '{}'::jsonb,
  "sem1Grades" JSONB DEFAULT '{}'::jsonb,
  "sem2Grades" JSONB DEFAULT '{}'::jsonb,
  remarks TEXT,
  hobbies TEXT,
  "hobbiesSem1" TEXT,
  "hobbiesSem2" TEXT,
  improvements TEXT,
  "improvementsSem1" TEXT,
  "improvementsSem2" TEXT,
  "customSubjects" TEXT[],
  "subjectOrder" TEXT[],
  medium TEXT,
  published BOOLEAN DEFAULT false
);

-- 7. Custom Field Definitions
CREATE TABLE IF NOT EXISTS custom_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL
);

-- 8. Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  "endDate" TEXT,
  name TEXT
);

-- 9. Fees Table
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" UUID REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC,
  date TEXT,
  remarks TEXT
);

-- 10. Homework Table
CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT,
  "dueDate" TEXT,
  "className" TEXT,
  medium TEXT,
  subject TEXT,
  title TEXT,
  description TEXT
);

-- 11. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT,
  title TEXT,
  content TEXT,
  "targetClass" TEXT
);

-- DISABLE RLS FOR TESTING (Enable proper RLS policies later for security)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE annual_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_defs DISABLE ROW LEVEL SECURITY;
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setStatus({ msg: "SQL Copied to Clipboard!", type: 'success' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("CRITICAL WARNING: This will overwrite ALL data on this device with the backup file. This cannot be undone. Proceed?")) {
            onImport(json);
            setStatus({ msg: "Database Restored Successfully!", type: 'success' });
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (err) {
        setStatus({ msg: "Invalid backup file format.", type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Cloud Database Setup Panel */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-xl">
                    <Terminal size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Cloud Database Setup</h3>
                    <p className="text-xs text-slate-400 font-medium">Fix "Table Not Found" or missing columns in Supabase</p>
                </div>
            </div>
            <button 
                onClick={() => setShowSql(!showSql)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold uppercase transition-all"
            >
                {showSql ? 'Hide SQL' : 'Show SQL'}
            </button>
        </div>

        {showSql && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200 mt-4">
                <p className="text-xs text-slate-300 leading-relaxed bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                    Your Supabase project needs to have the correct structure. If you previously ran this script, run it again to add new columns (like Timetables) to your database.
                    Copy the code below, go to your <strong>Supabase Dashboard {" > "} SQL Editor</strong>, and run it.
                </p>
                <div className="relative">
                    <pre className="bg-black/50 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-[300px] text-emerald-400 border border-white/5">
                        {sqlSchema}
                    </pre>
                    <button 
                        onClick={copySql}
                        className="absolute top-2 right-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg transition-all active:scale-90"
                        title="Copy SQL"
                    >
                        <Copy size={16} />
                    </button>
                </div>
                <div className="flex gap-4">
                    <a 
                        href="https://supabase.com/dashboard/projects" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        Open Supabase <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Data Management</h2>
            <p className="text-sm text-slate-500 font-medium">Backup and transfer school records between devices.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-indigo-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <DownloadCloud size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Create Backup</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Generate a portable JSON file containing all students, results, attendance, and user accounts. Store this file safely to prevent data loss.
              </p>
            </div>
            <button 
              onClick={onExport}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <FileJson size={18} />
              Download System Backup
            </button>
          </div>

          {/* Import Section */}
          <div className="bg-rose-50/30 p-6 rounded-2xl border border-rose-100 flex flex-col justify-between group hover:border-rose-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Restore / Sync</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Upload a backup file from another device to sync accounts and records. <strong>Warning:</strong> Current data on this device will be deleted.
              </p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-white text-rose-600 border border-rose-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert size={18} />
              Import Data File
            </button>
          </div>
        </div>

        {status && (
          <div className={`mt-8 p-4 rounded-xl flex items-center gap-3 border animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <span className="text-sm font-bold">{status.msg}</span>
          </div>
        )}
      </div>

      {/* Security Disclaimer */}
      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex gap-4">
        <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={24} />
        <div>
          <h4 className="font-bold text-amber-900 mb-1 uppercase text-xs tracking-wider">Crucial Security Information</h4>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            This management system is <strong>fully offline-first</strong>. If Supabase setup is skipped, your data remains stored in this browser.
            <br/><br/>
            To use multiple devices, you must either setup Supabase (recommended) or manually move the backup file. If you clear your browser's data/cache without Supabase setup, your school records may be lost.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemManager;


import React, { useRef, useState } from 'react';
import { Database, DownloadCloud, UploadCloud, AlertTriangle, CheckCircle2, ShieldAlert, FileJson, Terminal, Copy, ExternalLink, RefreshCw } from 'lucide-react';

interface SystemManagerProps {
  onExport: () => void;
  onImport: (data: any) => void;
}

const SystemManager: React.FC<SystemManagerProps> = ({ onExport, onImport }) => {
  const [status, setStatus] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [showSql, setShowSql] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sqlSchema = `-- INDRAYANI SCHOOL DATABASE COMPREHENSIVE REPAIR SCRIPT
-- Run this in Supabase SQL Editor to fix synchronization issues and missing columns.

-- 1. REPAIR/CREATE STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "mothersName" TEXT,
  "rollNo" TEXT,
  "className" TEXT,
  medium TEXT DEFAULT 'English',
  religion TEXT,
  dob TEXT,
  "placeOfBirth" TEXT,
  address TEXT,
  phone TEXT,
  "alternatePhone" TEXT,
  "aadharNo" TEXT,
  "apaarId" TEXT,
  "penNo" TEXT,
  caste TEXT,
  "customFields" JSONB DEFAULT '{}'::jsonb
);

-- 2. ENSURE ALL STUDENT COLUMNS EXIST
DO $$ 
BEGIN 
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS "mothersName" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS religion TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS medium TEXT DEFAULT 'English'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS "placeOfBirth" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS "alternatePhone" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS "aadharNo" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS "apaarId" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS "penNo" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE students ADD COLUMN IF NOT EXISTS caste TEXT; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 3. REPAIR/CREATE USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  "linkedStudentId" UUID REFERENCES students(id) ON DELETE CASCADE
);

-- 4. REPAIR/CREATE ANNUAL RECORDS TABLE
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
  "specialImprovementsSem1" TEXT,
  "specialImprovementsSem2" TEXT,
  "necessaryImprovementSem1" TEXT,
  "necessaryImprovementSem2" TEXT,
  "resultStatus" TEXT,
  "overallPercentage" TEXT,
  "customSubjects" TEXT[],
  "subjectOrder" TEXT[],
  medium TEXT,
  published BOOLEAN DEFAULT false
);

-- 5. ENSURE ALL ANNUAL RECORD COLUMNS EXIST
DO $$ 
BEGIN 
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "hobbiesSem1" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "hobbiesSem2" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "improvementsSem1" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "improvementsSem2" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "specialImprovementsSem1" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "specialImprovementsSem2" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "necessaryImprovementSem1" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "necessaryImprovementSem2" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "overallPercentage" TEXT; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TABLE annual_records ADD COLUMN IF NOT EXISTS "resultStatus" TEXT; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 6. REPAIR/CREATE RESULTS TABLE
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" UUID REFERENCES students(id) ON DELETE CASCADE,
  "examId" UUID,
  marks JSONB DEFAULT '{}'::jsonb,
  "aiRemark" TEXT,
  published BOOLEAN DEFAULT false
);

-- 7. DISABLE RLS (Security handled by App Logic)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE annual_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

-- 8. CLEAR CACHE
NOTIFY pgrst, 'reload schema';
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setStatus({ msg: "SQL Migration Copied!", type: 'success' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("CRITICAL WARNING: This will overwrite ALL data on this device with the backup file. Proceed?")) {
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
      <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-800">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-xl">
                    <Terminal size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">Full Cloud Database Repair</h3>
                    <p className="text-xs text-indigo-200 font-medium">Fixes PEN No, Religion & Sync Errors</p>
                </div>
            </div>
            <button 
                onClick={() => setShowSql(!showSql)}
                className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-xs font-bold uppercase transition-all border border-indigo-400/30"
            >
                {showSql ? 'Hide Script' : 'Show Repair SQL'}
            </button>
        </div>

        {showSql && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200 mt-4">
                <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-3">
                    <p className="text-sm font-bold text-indigo-100 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400" /> 
                        Cloud Sync Error Fix
                    </p>
                    <p className="text-xs text-indigo-100 leading-relaxed">
                        If you are getting "Cloud Error" when saving, your cloud database is likely missing new columns like <strong>PEN No.</strong> or <strong>Caste</strong>. 
                        <strong> Copy this script and run it in the Supabase SQL Editor.</strong>
                    </p>
                </div>
                <div className="relative">
                    <pre className="bg-black/40 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-[250px] text-emerald-400 border border-white/5">
                        {sqlSchema}
                    </pre>
                    <button onClick={copySql} className="absolute top-2 right-2 p-2 bg-indigo-600 hover:bg-indigo-50 rounded-lg shadow-lg transition-all active:scale-90" title="Copy SQL"><Copy size={16} /></button>
                </div>
                <div className="flex gap-4">
                    <a href="https://supabase.com/dashboard/project/tubdjcdghosxozzehuep/sql/new" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-indigo-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl">Open Supabase SQL Editor <ExternalLink size={14} /></a>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-3 rounded-2xl text-slate-600"><Database size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Backup</h2>
            <p className="text-sm text-slate-500 font-medium">Download local snapshots.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-indigo-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform"><DownloadCloud size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Local Backup</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">Download a JSON file containing all data currently on this device.</p>
            </div>
            <button onClick={onExport} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"><FileJson size={18} /> Download Backup</button>
          </div>
          <div className="bg-rose-50/30 p-6 rounded-2xl border border-rose-100 flex flex-col justify-between group hover:border-rose-300 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform"><UploadCloud size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Restore All</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">Upload a backup file to overwrite all local and cloud data.</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white text-rose-600 border border-rose-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"><ShieldAlert size={18} /> Import Backup</button>
          </div>
        </div>

        {status && (
          <div className={`mt-8 p-4 rounded-xl flex items-center gap-3 border animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <span className="text-sm font-bold">{status.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;

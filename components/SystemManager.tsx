
import React, { useRef, useState } from 'react';
import { Database, DownloadCloud, UploadCloud, AlertTriangle, CheckCircle2, ShieldAlert, FileJson } from 'lucide-react';

interface SystemManagerProps {
  onExport: () => void;
  onImport: (data: any) => void;
}

const SystemManager: React.FC<SystemManagerProps> = ({ onExport, onImport }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            This management system is <strong>fully offline</strong>. There is no central server. Your data is your responsibility.
            <br/><br/>
            To use multiple devices, you must manually move the backup file. If you clear your browser's data/cache, your school records may be lost unless you have a recent backup file.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemManager;

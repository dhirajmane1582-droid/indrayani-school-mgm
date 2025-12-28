
import React, { useState, useMemo } from 'react';
import { User, UserRole, Student } from '../types';
import { Trash2, UserPlus, Shield, GraduationCap, X, Check, User as UserIcon, Search, Plus } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  students: Student[];
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, currentUser, students }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('teacher');
  
  // Student Linking State
  const [linkedStudentId, setLinkedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students.slice(0, 5);
    const q = studentSearch.toLowerCase();
    return students.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.rollNo.includes(q)
    ).slice(0, 10);
  }, [students, studentSearch]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) return;
    if (newRole === 'student' && !linkedStudentId) {
        alert("Please select a student profile to link.");
        return;
    }

    if (users.some(u => u.username === newUsername)) {
      alert('Username already exists');
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username: newUsername,
      password: newPassword,
      name: newName,
      role: newRole,
      linkedStudentId: newRole === 'student' ? linkedStudentId : undefined
    };

    setUsers([...users, newUser]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewRole('teacher');
    setLinkedStudentId('');
    setStudentSearch('');
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const getStudentName = (id?: string) => {
      if (!id) return '';
      const s = students.find(stud => stud.id === id);
      return s ? `${s.name} (${s.className})` : 'Unknown Student';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500">Create and manage access credentials.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white w-10 h-10 rounded-xl hover:bg-indigo-700 flex items-center justify-center shadow-sm transition-all active:scale-95"
          title="Add New User"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Linked Profile</th>
                <th className="px-6 py-4 text-center">Password</th>
                <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">{user.username}</td>
                    <td className="px-6 py-4">
                    {user.role === 'headmaster' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                        <Shield size={12} /> Headmaster
                        </span>
                    )}
                    {user.role === 'teacher' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        <GraduationCap size={12} /> Teacher
                        </span>
                    )}
                    {user.role === 'student' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <UserIcon size={12} /> Student
                        </span>
                    )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                        {user.role === 'student' ? getStudentName(user.linkedStudentId) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                    {user.id === currentUser.id ? '******' : user.password}
                    </td>
                    <td className="px-6 py-4 text-right">
                    {user.id !== currentUser.id && (
                        <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete User"
                        >
                        <Trash2 size={16} />
                        </button>
                    )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-800">Add New User</h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 uppercase tracking-wider text-[11px] font-bold">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 uppercase tracking-wider text-[11px] font-bold">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
                  placeholder="e.g. john.doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 uppercase tracking-wider text-[11px] font-bold">Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
                  placeholder="Set a password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 uppercase tracking-wider text-[11px] font-bold">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${newRole === 'teacher' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400'}`}>
                    <input type="radio" name="role" checked={newRole === 'teacher'} onChange={() => setNewRole('teacher')} className="hidden" />
                    <GraduationCap size={18} />
                    <span className="font-bold text-[10px] uppercase">Teacher</span>
                    {newRole === 'teacher' && <Check size={12} className="mt-1" />}
                  </label>
                  
                  <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${newRole === 'headmaster' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400'}`}>
                    <input type="radio" name="role" checked={newRole === 'headmaster'} onChange={() => setNewRole('headmaster')} className="hidden" />
                    <Shield size={18} />
                    <span className="font-bold text-[10px] uppercase">Admin</span>
                    {newRole === 'headmaster' && <Check size={12} className="mt-1" />}
                  </label>

                  <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${newRole === 'student' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-400'}`}>
                    <input type="radio" name="role" checked={newRole === 'student'} onChange={() => setNewRole('student')} className="hidden" />
                    <UserIcon size={18} />
                    <span className="font-bold text-[10px] uppercase">Student</span>
                    {newRole === 'student' && <Check size={12} className="mt-1" />}
                  </label>
                </div>
              </div>
              
              {/* Student Linking Selection */}
              {newRole === 'student' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in zoom-in duration-200">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-3 tracking-widest">Link Student Profile</label>
                      <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                             type="text" 
                             className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                             placeholder="Search student name..."
                             value={studentSearch}
                             onChange={(e) => setStudentSearch(e.target.value)}
                          />
                      </div>
                      <div className="max-h-[150px] overflow-y-auto space-y-1 border border-slate-200 bg-white rounded-lg p-1">
                          {filteredStudents.length === 0 ? (
                              <div className="p-4 text-xs text-slate-400 text-center font-medium italic">No students found.</div>
                          ) : (
                              filteredStudents.map(s => (
                                  <div 
                                    key={s.id}
                                    onClick={() => setLinkedStudentId(s.id)}
                                    className={`px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-indigo-50 flex justify-between items-center transition-colors ${linkedStudentId === s.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                                  >
                                      <div>
                                          <div>{s.name}</div>
                                          <div className="text-[10px] text-slate-500 font-medium">{s.className} ({s.medium || 'English'})</div>
                                      </div>
                                      {linkedStudentId === s.id && <Check size={14}/>}
                                  </div>
                              ))
                          )}
                      </div>
                      {linkedStudentId && (
                          <div className="mt-3 text-xs text-emerald-600 font-bold flex items-center gap-2 px-1">
                              <Check size={14} className="bg-emerald-100 rounded-full p-0.5" /> 
                              <span>Linked: {students.find(s => s.id === linkedStudentId)?.name}</span>
                          </div>
                      )}
                  </div>
              )}

              <div className="pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

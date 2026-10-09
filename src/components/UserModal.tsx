import React, { useState } from 'react';
import { X, UserCheck, GraduationCap, School } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  role: 'teacher' | 'student';
  color: string;
  onSave: (name: string, role: 'teacher' | 'student', color: string) => void;
}

const AVATAR_COLORS = [
  '#4f46e5', // indigo
  '#059669', // emerald
  '#dc2626', // red
  '#d97706', // amber
  '#2563eb', // blue
  '#7c3aed', // purple
  '#db2777', // pink
  '#0d9488', // teal
];

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  name: initialName,
  role: initialRole,
  color: initialColor,
  onSave,
}) => {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<'teacher' | 'student'>(initialRole);
  const [color, setColor] = useState(initialColor);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), role, color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Your Whiteboard Profile</h2>
              <p className="text-xs text-slate-500">How you appear to students/teachers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Teacher Ahmed, Sarah (UK), Ali (Pak)"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Your Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  role === 'teacher'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <School className="w-4 h-4 text-indigo-600" />
                Teacher (Host)
              </button>
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  role === 'student'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Student
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Live Cursor Color
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-900' : 'hover:scale-110'
                  }`}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

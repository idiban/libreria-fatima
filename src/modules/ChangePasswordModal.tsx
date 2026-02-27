import React, { useState } from 'react';
import { X, Loader2, Key, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ current: false, new: false, confirm: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({ current: false, new: false, confirm: false });

    if (newPassword !== confirmPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      setFieldErrors({ current: false, new: true, confirm: true });
      return;
    }
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      setFieldErrors({ current: false, new: true, confirm: true });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await response.json();
        setError(err.error || 'Error al cambiar la contraseña.');
        if (err.field === 'current') {
          setFieldErrors({ ...fieldErrors, current: true });
        }
      }
    } catch (e) {
      setError('Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
            <h3 className="text-2xl font-black mb-6">Cambiar Contraseña</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Contraseña Actual</label>
                <input 
                  type={showPasswords ? 'text' : 'password'} 
                  required 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  className={`w-full px-5 py-3 bg-[#F9FAFB] rounded-xl font-bold outline-none focus:ring-2 transition-all ${fieldErrors.current ? 'ring-2 ring-red-500' : 'focus:ring-[var(--color-primary)]'}`} 
                />
              </div>
              <div className="space-y-1 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nueva Contraseña</label>
                <input 
                  type={showPasswords ? 'text' : 'password'} 
                  required 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className={`w-full px-5 py-3 bg-[#F9FAFB] rounded-xl font-bold outline-none focus:ring-2 transition-all ${fieldErrors.new ? 'ring-2 ring-red-500' : 'focus:ring-[var(--color-primary)]'}`} 
                />
              </div>
              <div className="space-y-1 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirmar Nueva Contraseña</label>
                <input 
                  type={showPasswords ? 'text' : 'password'} 
                  required 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className={`w-full px-5 py-3 bg-[#F9FAFB] rounded-xl font-bold outline-none focus:ring-2 transition-all ${fieldErrors.confirm ? 'ring-2 ring-red-500' : 'focus:ring-[var(--color-primary)]'}`} 
                />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-4 top-9 text-gray-400">
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs font-bold text-center pt-2">{error}</p>}
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={onClose} className="flex-1 py-4 px-6 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isLoading} className="flex-[2] py-4 bg-[var(--color-primary)] text-white rounded-xl font-black shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />} Cambiar Contraseña
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

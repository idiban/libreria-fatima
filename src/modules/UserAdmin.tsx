import React, { useState } from 'react';
import { 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  Key, 
  Shield, 
  HelpCircle, 
  X, 
  Check, 
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface UserAdminProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onFetchUsers: () => void;
}

export default function UserAdmin({ currentUser, allUsers, onFetchUsers }: UserAdminProps) {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAdminResetModalOpen, setIsAdminResetModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'vendedor' as const
  });
  const [editUserFormData, setEditUserFormData] = useState({ username: '', role: 'vendedor' as const });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ create: false, reset: false });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (userFormData.password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData)
      });
      if (response.ok) {
        onFetchUsers();
        setIsUserModalOpen(false);
        setUserFormData({ username: '', email: '', password: '', role: 'vendedor' });
        setConfirmPassword('');
      } else {
        const err = await response.json();
        setError(err.error || 'Error al crear el usuario');
      }
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserFormData)
      });
      if (response.ok) {
        onFetchUsers();
        setIsEditUserModalOpen(false);
        setEditingUser(null);
      } else {
        const err = await response.json();
        setError(err.error || 'Error al actualizar el usuario');
      }
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        onFetchUsers();
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } else {
        const err = await response.json();
        alert(err.error || 'Error al eliminar el usuario');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedUserId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      if (response.ok) {
        setIsAdminResetModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setSelectedUserId(null);
        alert('Contraseña actualizada con éxito');
      } else {
        const err = await response.json();
        setError(err.error || 'Error al actualizar la contraseña');
      }
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Administración de Usuarios</h2>
          <p className="text-gray-500 font-medium">Gestiona los accesos y roles del sistema.</p>
        </div>
        
        <button
          onClick={() => setIsUserModalOpen(true)}
          className="bg-[#B23B23] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-[#B23B23]/20 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#FDF2F0] overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse overflow-visible">
            <thead>
              <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#FDF2F0]">
                <th className="px-8 py-6">Usuario</th>
                <th className="px-8 py-6">Email</th>
                <th className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    Rol
                    <div className="relative group">
                      <HelpCircle className="w-4 h-4 text-gray-300 cursor-help hover:text-[#B23B23] transition-colors" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-[#2D1A1A] text-white text-[10px] font-medium rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] shadow-2xl border border-white/10 backdrop-blur-sm">
                        <div className="space-y-2">
                          <p><span className="text-orange-400 font-black uppercase">Owner:</span> Acceso total, propietario del sistema.</p>
                          <p><span className="text-orange-400 font-black uppercase">Admin:</span> Gestiona usuarios y stock. Acceso a estadísticas.</p>
                          <p><span className="text-orange-400 font-black uppercase">Vendedor:</span> Registra ventas y ve el catálogo.</p>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-[#2D1A1A] rotate-45 -mt-1.5" />
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FDF2F0]">
              {allUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#FFF9F5] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#B23B23] flex items-center justify-center text-white text-xs font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-[#2D1A1A]">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-500 font-medium">{user.email}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'owner' ? 'bg-amber-100 text-amber-600' :
                      user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setIsAdminResetModalOpen(true);
                        }}
                        className="p-2 hover:bg-[#FDF2F0] rounded-xl text-gray-400 hover:text-[#B23B23] transition-all"
                        title="Resetear Contraseña"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setEditUserFormData({ username: user.username, role: user.role || 'vendedor' });
                          setIsEditUserModalOpen(true);
                        }}
                        className="p-2 hover:bg-[#FDF2F0] rounded-xl text-gray-400 hover:text-[#B23B23] transition-all"
                        title="Editar Usuario"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user.role !== 'owner' && user.id !== currentUser.id && (
                        <button
                          onClick={() => {
                            setUserToDelete(user.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Create User Modal */}
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUserModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
              <h3 className="text-2xl font-black mb-6">Nuevo Usuario</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre de Usuario</label>
                  <input type="text" required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email</label>
                  <input type="email" required value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Rol</label>
                  <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]">
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Contraseña</label>
                  <input type={showPasswords.create ? "text" : "password"} required value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]" />
                  <button type="button" onClick={() => setShowPasswords({...showPasswords, create: !showPasswords.create})} className="absolute right-4 top-9 text-gray-400"><Eye className="w-4 h-4" /></button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirmar Contraseña</label>
                  <input type={showPasswords.create ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]" />
                </div>
                {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#B23B23] text-white rounded-xl font-black shadow-lg shadow-[#B23B23]/20 flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Crear Usuario
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit User Modal */}
        {isEditUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditUserModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
              <h3 className="text-2xl font-black mb-6">Editar Usuario</h3>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre de Usuario</label>
                  <input type="text" required value={editUserFormData.username} onChange={e => setEditUserFormData({...editUserFormData, username: e.target.value})} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Rol</label>
                  <select value={editUserFormData.role} onChange={e => setEditUserFormData({...editUserFormData, role: e.target.value as any})} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]">
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#B23B23] text-white rounded-xl font-black shadow-lg shadow-[#B23B23]/20 flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar Cambios
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Reset Password Modal */}
        {isAdminResetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdminResetModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10">
              <h3 className="text-2xl font-black mb-2">Resetear Contraseña</h3>
              <p className="text-gray-500 text-sm mb-6">Establece una nueva contraseña para este usuario.</p>
              <form onSubmit={handleAdminResetPassword} className="space-y-4">
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nueva Contraseña</label>
                  <input type={showPasswords.reset ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]" />
                  <button type="button" onClick={() => setShowPasswords({...showPasswords, reset: !showPasswords.reset})} className="absolute right-4 top-9 text-gray-400"><Eye className="w-4 h-4" /></button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirmar Contraseña</label>
                  <input type={showPasswords.reset ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-5 py-3 bg-[#FFF9F5] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#B23B23]" />
                </div>
                {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#B23B23] text-white rounded-xl font-black shadow-lg shadow-[#B23B23]/20 flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />} Actualizar Contraseña
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black mb-2">¿Eliminar Usuario?</h3>
              <p className="text-gray-500 text-sm mb-8">Esta acción no se puede deshacer. El usuario perderá acceso al sistema.</p>
              <div className="flex flex-col gap-2">
                <button onClick={handleDeleteUser} disabled={isLoading} className="w-full py-4 bg-red-500 text-white rounded-xl font-black shadow-lg shadow-red-500/20">
                  Sí, Eliminar
                </button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 bg-gray-50 text-gray-400 rounded-xl font-black">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

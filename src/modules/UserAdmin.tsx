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
  Save,
  ChevronDown
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
  
  // Estados para los dropdowns personalizados
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isEditRoleDropdownOpen, setIsEditRoleDropdownOpen] = useState(false);

  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    role: 'vendedor' as const
  });
  const [editUserFormData, setEditUserFormData] = useState({ username: '', role: 'vendedor' as const });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ create: false, reset: false });

  const visibleUsers = allUsers.filter(user => 
    currentUser.role === 'owner' || user.role !== 'owner'
  );

  const formatName = (str: string) => {
    const onlyLetters = str.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s´']/g, '');
    return onlyLetters.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

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
        setUserFormData({ username: '', password: '', role: 'vendedor' });
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
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Administración</h2>
          <p className="text-sm sm:text-base text-gray-500 font-medium">Gestiona los accesos y roles del sistema.</p>
        </div>
        
        <button
          onClick={() => setIsUserModalOpen(true)}
          className="bg-[var(--color-primary)] text-white px-6 py-4 sm:py-3 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-[#FDF2F0] overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse overflow-visible">
            <thead>
              <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#FDF2F0]">
                <th className="px-8 py-6">Usuario</th>
                <th className="px-8 py-6">Rol</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FDF2F0]">
              {visibleUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#FFF9F5] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-[#2D1A1A]">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'owner' ? 'bg-amber-100 text-amber-600' :
                      user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {user.role === 'owner' ? 'Dueño' : user.role === 'admin' ? 'Administrador' : user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex items-center gap-2">
                      {(user.role !== 'owner' || currentUser.id === user.id) && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setIsAdminResetModalOpen(true);
                            }}
                            className="p-2 hover:bg-emerald-50 rounded-xl text-gray-400 hover:text-emerald-600 transition-all"
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
                            className="p-2 hover:bg-emerald-50 rounded-xl text-gray-400 hover:text-emerald-600 transition-all"
                            title="Editar Usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
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

      <div className="md:hidden space-y-4">
        {visibleUsers.map((user) => (
          <div key={user.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#FDF2F0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[#2D1A1A]">{user.username}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest mt-1 ${
                    user.role === 'owner' ? 'bg-amber-100 text-amber-600' :
                    user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {user.role === 'owner' ? 'Dueño' : user.role === 'admin' ? 'Administrador' : user.role}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {(user.role !== 'owner' || currentUser.id === user.id) && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setIsAdminResetModalOpen(true);
                      }}
                      className="p-3 bg-emerald-50 rounded-xl text-emerald-600"
                    >
                      <Key className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setEditUserFormData({ username: user.username, role: user.role || 'vendedor' });
                        setIsEditUserModalOpen(true);
                      }}
                      className="p-3 bg-emerald-50 rounded-xl text-emerald-600"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </>
                )}
                {user.role !== 'owner' && user.id !== currentUser.id && (
                  <button
                    onClick={() => {
                      setUserToDelete(user.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-3 bg-red-50 rounded-xl text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUserModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-visible p-10 text-[#2D1A1A]">
              <h3 className="text-2xl font-black mb-6">Nuevo Usuario</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre de Usuario</label>
                  <input type="text" required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: formatName(e.target.value)})} className="w-full px-5 py-3 bg-[#EEF2F6] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all" />
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Rol</label>
                  
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="w-full px-5 py-3 bg-[#EEF2F6] rounded-xl font-bold flex items-center justify-between hover:bg-[#E2E8F0] transition-all"
                  >
                    <span className="capitalize">{userFormData.role === 'admin' ? 'Administrador' : userFormData.role}</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isRoleDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsRoleDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute z-20 w-full bg-white rounded-2xl shadow-xl border border-[#FDF2F0] overflow-hidden p-2"
                        >
                          {['vendedor', 'admin'].map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setUserFormData({ ...userFormData, role: role as any });
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-between ${
                                userFormData.role === role 
                                ? 'bg-[var(--color-primary)] text-white' 
                                : 'text-[#2D1A1A] hover:bg-[#F5F7FA]'
                              }`}
                            >
                              <span className="capitalize">{role === 'admin' ? 'Administrador' : role}</span>
                              {userFormData.role === role && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Contraseña</label>
                  <input 
                    type={showPasswords.create ? "text" : "password"} 
                    required 
                    value={userFormData.password} 
                    onChange={e => { setUserFormData({...userFormData, password: e.target.value}); setError(''); }} 
                    className={`w-full px-5 py-3 bg-[#EEF2F6] border-2 ${error === 'Las contraseñas no coinciden' ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:ring-[var(--color-primary)]'} rounded-xl font-bold outline-none focus:ring-2 transition-all`} 
                  />
                  <button type="button" onClick={() => setShowPasswords({...showPasswords, create: !showPasswords.create})} className="absolute right-4 top-[38px] text-gray-400 hover:text-[var(--color-primary)] transition-colors">
                    {showPasswords.create ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirmar Contraseña</label>
                  <input 
                    type={showPasswords.create ? "text" : "password"} 
                    required 
                    value={confirmPassword} 
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }} 
                    className={`w-full px-5 py-3 bg-[#EEF2F6] border-2 ${error === 'Las contraseñas no coinciden' ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:ring-[var(--color-primary)]'} rounded-xl font-bold outline-none focus:ring-2 transition-all`} 
                  />
                </div>

                {error && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full mt-2 py-4 bg-[var(--color-primary)] text-white rounded-xl font-black shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Crear Usuario
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isEditUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditUserModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-visible p-10 text-[#2D1A1A]">
              <h3 className="text-2xl font-black mb-6">Editar Usuario</h3>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre de Usuario</label>
                  <input type="text" required value={editUserFormData.username} onChange={e => setEditUserFormData({...editUserFormData, username: formatName(e.target.value)})} className="w-full px-5 py-3 bg-[#EEF2F6] rounded-xl font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all" />
                </div>
                
                {editingUser?.role !== 'owner' && (
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Rol</label>
                    
                    <button
                      type="button"
                      onClick={() => setIsEditRoleDropdownOpen(!isEditRoleDropdownOpen)}
                      className="w-full px-5 py-3 bg-[#EEF2F6] rounded-xl font-bold flex items-center justify-between hover:bg-[#E2E8F0] transition-all"
                    >
                      <span className="capitalize">{editUserFormData.role === 'admin' ? 'Administrador' : editUserFormData.role}</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${isEditRoleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isEditRoleDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsEditRoleDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 5, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute z-20 w-full bg-white rounded-2xl shadow-xl border border-[#FDF2F0] overflow-hidden p-2"
                          >
                            {['vendedor', 'admin'].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => {
                                  setEditUserFormData({ ...editUserFormData, role: role as any });
                                  setIsEditRoleDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-between ${
                                  editUserFormData.role === role 
                                  ? 'bg-[var(--color-primary)] text-white' 
                                  : 'text-[#2D1A1A] hover:bg-[#F5F7FA]'
                                }`}
                              >
                                <span className="capitalize">{role === 'admin' ? 'Administrador' : role}</span>
                                {editUserFormData.role === role && <Check className="w-4 h-4" />}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                
                {error && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full mt-2 py-4 bg-[var(--color-primary)] text-white rounded-xl font-black shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar Cambios
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAdminResetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdminResetModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-[#2D1A1A]">
              <h3 className="text-2xl font-black mb-2">Resetear Contraseña</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">Establece una nueva contraseña para este usuario.</p>
              <form onSubmit={handleAdminResetPassword} className="space-y-4">
                
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nueva Contraseña</label>
                  <input 
                    type={showPasswords.reset ? "text" : "password"} 
                    required 
                    value={newPassword} 
                    onChange={e => { setNewPassword(e.target.value); setError(''); }} 
                    className={`w-full px-5 py-3 bg-[#EEF2F6] border-2 ${error === 'Las contraseñas no coinciden' ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:ring-[var(--color-primary)]'} rounded-xl font-bold outline-none focus:ring-2 transition-all`} 
                  />
                  <button type="button" onClick={() => setShowPasswords({...showPasswords, reset: !showPasswords.reset})} className="absolute right-4 top-[38px] text-gray-400 hover:text-[var(--color-primary)] transition-colors">
                    {showPasswords.reset ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Confirmar Contraseña</label>
                  <input 
                    type={showPasswords.reset ? "text" : "password"} 
                    required 
                    value={confirmPassword} 
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }} 
                    className={`w-full px-5 py-3 bg-[#EEF2F6] border-2 ${error === 'Las contraseñas no coinciden' ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:ring-[var(--color-primary)]'} rounded-xl font-bold outline-none focus:ring-2 transition-all`} 
                  />
                </div>

                {error && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full mt-2 py-4 bg-[var(--color-primary)] text-white rounded-xl font-black shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />} Actualizar Contraseña
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center text-[#2D1A1A]">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black mb-2">¿Eliminar Usuario?</h3>
              <p className="text-gray-500 text-sm mb-8 font-medium">Esta acción no se puede deshacer. El usuario perderá acceso al sistema.</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleDeleteUser} 
                  disabled={isLoading} 
                  className="w-full py-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl font-black shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Sí, Eliminar
                </button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-[0.98] transition-all rounded-xl font-black">
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
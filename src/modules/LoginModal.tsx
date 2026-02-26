import React, { useState } from 'react';
import { LogIn, User, Key, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
    
    if (name === 'username' && value.length > 1) {
      try {
        const res = await fetch(`/api/users/suggest?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (e) {}
    } else {
      setSuggestions([]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (response.ok) {
        const user = await response.json();
        onLoginSuccess(user);
        onClose();
        setLoginForm({ username: '', password: '' });
      } else {
        const err = await response.json();
        setLoginError(err.error || 'Credenciales incorrectas');
      }
    } catch (e) {
      setLoginError('Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 sm:p-12">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-[#2D1A1A] mb-2">Bienvenido</h2>
                  <p className="text-gray-500 font-medium">Ingresa tus credenciales para continuar.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="username"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-bold"
                      placeholder="Tu nombre de usuario"
                      value={loginForm.username}
                      onChange={handleInputChange}
                      autoComplete="off"
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                        {suggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setLoginForm(prev => ({ ...prev, username: s.username }));
                              setSuggestions([]);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-[#FFF9F5] transition-colors flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#B23B23] flex items-center justify-center text-white text-xs font-bold">
                              {s.username[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-sm">{s.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Contraseña</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      className="w-full pl-12 pr-12 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-bold"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#B23B23] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    {loginError}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#B23B23] hover:bg-[#962D1A] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#B23B23]/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-6 h-6" />
                      Ingresar al Sistema
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

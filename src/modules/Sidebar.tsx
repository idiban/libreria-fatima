import React from 'react';
import { 
  Library, 
  BookOpen, 
  Users, 
  TrendingUp, 
  DollarSign, 
  ClipboardList, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Key,
  Contact
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentUser: UserProfile | null;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  timeLeft?: number;
}

export default function Sidebar({ 
  currentUser, 
  activeView, 
  onViewChange, 
  onLogout,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  timeLeft
}: SidebarProps) {
  const menuItems = [
    { id: 'catalog', label: 'Catálogo', icon: Library, roles: ['owner', 'admin', 'vendedor'] },
    { id: 'books', label: 'Libros', icon: BookOpen, roles: ['owner', 'admin', 'vendedor'] },
    { id: 'sales', label: 'Ventas', icon: DollarSign, roles: ['owner', 'admin', 'vendedor'] },
    { id: 'clients', label: 'Clientes', icon: Contact, roles: ['owner', 'admin', 'vendedor'] },
    { id: 'debtors', label: 'Deudas', icon: UserCheck, roles: ['owner', 'admin', 'vendedor'] },
    { id: 'stats', label: 'Estadísticas', icon: TrendingUp, roles: ['owner', 'admin'] },
    { id: 'users', label: 'Administración', icon: Users, roles: ['owner', 'admin'] },
    { id: 'logs', label: 'Logs', icon: ClipboardList, roles: ['owner'] },
  ];

  const filteredItems = menuItems.filter(item => 
    !currentUser || (currentUser.role && item.roles.includes(currentUser.role))
  );

  return (
    <>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: typeof window !== 'undefined' && window.innerWidth < 768 ? 280 : (isCollapsed ? 80 : 280),
          x: typeof window !== 'undefined' && window.innerWidth < 768 ? (isMobileOpen ? 0 : -280) : 0
        }}
        className="fixed md:sticky top-0 h-[100dvh] bg-white border-r border-[var(--color-warm-surface)] flex flex-col z-[70] shadow-2xl md:shadow-none"
      >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-[var(--color-primary)] p-2 rounded-xl shrink-0">
          <Library className="w-6 h-6 text-white" />
        </div>
        {(!isCollapsed || isMobileOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-hidden whitespace-nowrap"
          >
            <h1 className="font-bold text-lg leading-tight">Librería Fátima</h1>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-bold">Sistema Interno</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onViewChange(item.id);
              setIsMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative group ${
              activeView === item.id 
                ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' 
                : 'text-gray-500 hover:bg-[var(--color-warm-bg)] hover:text-[var(--color-primary)]'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-sm"
              >
                {item.label}
              </motion.span>
            )}
            {isCollapsed && !isMobileOpen && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-[#1A1A1A] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* User & Collapse */}
      <div className="p-4 pb-8 md:pb-4 border-t border-[#FDF2F0] space-y-2">
        {currentUser && (!isCollapsed || isMobileOpen) && (
          <div className="px-4 py-3 bg-[var(--color-warm-bg)] border border-[var(--color-primary)]/10 shadow-sm rounded-2xl mb-2 flex items-center justify-center">
            <p className="text-sm font-black text-[var(--color-primary)] truncate">{currentUser?.username || 'Usuario Desconocido'}</p>
          </div>
        )}
        
        {/* Este botón ahora está oculto en móviles (hidden md:flex) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex w-full items-center gap-3 px-4 py-3 text-gray-400 hover:text-[#B23B23] transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!isCollapsed && <span className="text-sm font-bold">Colapsar Menú</span>}
        </button>

        <button
          onClick={() => (onViewChange('change-password'))}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-[var(--color-warm-bg)] hover:text-[var(--color-primary)] rounded-2xl transition-all relative group"
        >
          <Key className="w-5 h-5 shrink-0" />
          {(!isCollapsed || isMobileOpen) && <span className="text-sm font-bold">Cambiar Contraseña</span>}
          {isCollapsed && !isMobileOpen && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-[#1A1A1A] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Cambiar Contraseña
            </div>
          )}
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all relative group"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!isCollapsed || isMobileOpen) && <span className="text-sm font-bold">Cerrar Sesión</span>}
          {isCollapsed && !isMobileOpen && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-[#1A1A1A] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Cerrar Sesión
            </div>
          )}
        </button>
        
        <div className="flex items-center gap-2">
          {/* Timer hidden as requested */}
          {false && currentUser && (!isCollapsed || isMobileOpen) && timeLeft !== undefined && (
            <div className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black font-mono text-gray-500">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
    </>
  );
}
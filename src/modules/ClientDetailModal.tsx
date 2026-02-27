import React, { useState, useEffect } from 'react';
import { X, Edit2, Check, Loader2, History, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClientRecord } from '../types';

interface ClientDetailModalProps {
  client: ClientRecord;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ClientDetailModal({ client, onClose, onUpdate }: ClientDetailModalProps) {
  const [name, setName] = useState(client.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/clients/${client.id}/history`);
        const data = await res.json();
        setHistory(data.history || []);
      } catch (e) {
        console.error("Error al cargar historial:", e);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [client.id]);

  const handleSaveName = async () => {
    if (!name.trim() || name === client.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (res.ok) {
        onUpdate();
        setIsEditing(false);
      } else {
        alert("Error al actualizar el nombre");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return Number(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getDebtDate = (entry: any) => {
    if (!entry.timestamp) return 'Fecha desconocida';
    const date = new Date(entry.timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-[var(--color-warm-surface)] flex justify-between items-center bg-[var(--color-warm-bg)] shrink-0">
            <div className="flex-1 mr-4">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    className="text-xl sm:text-2xl font-black text-[var(--color-primary)] bg-white border-2 border-[var(--color-primary)] rounded-xl px-3 py-1 w-full outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <button 
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-primary)] leading-tight truncate">{name}</h2>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-white rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Perfil del Cliente</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm shrink-0">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="space-y-8">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-60">Total Compras</p>
                  <p className="text-xl font-black text-emerald-700">{history.filter(h => h.type !== 'payment').length}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${client.totalDebt > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${client.totalDebt > 0 ? 'text-red-600' : 'text-gray-600'}`}>Deuda Actual</p>
                  <p className={`text-xl font-black ${client.totalDebt > 0 ? 'text-red-700' : 'text-gray-700'}`}>${formatPrice(client.totalDebt)}</p>
                </div>
              </div>

              {/* History Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-gray-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Historial de Transacciones</h3>
                </div>
                
                {loadingHistory ? (
                  <div className="py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mx-auto" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-10 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <p className="text-gray-400 font-medium">No hay transacciones registradas.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry, idx) => (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-[2rem] border shadow-sm transition-all ${
                          entry.type === 'payment' 
                            ? 'bg-emerald-50 border-emerald-100' 
                            : 'bg-white border-[var(--color-warm-surface)]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className={`font-black text-sm ${entry.type === 'payment' ? 'text-emerald-900' : 'text-[var(--color-primary)]'}`}>
                              {entry.type === 'payment' ? 'Abono / Pago' : 'Compra Realizada'}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{getDebtDate(entry)}</p>
                          </div>
                          <p className={`font-black text-lg ${entry.type === 'payment' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {entry.type === 'payment' ? `-$${formatPrice(entry.amount)}` : `$${formatPrice(entry.total || entry.amount)}`}
                          </p>
                        </div>

                        {entry.items && entry.items.length > 0 && (
                          <div className="pt-3 border-t border-gray-100">
                            <ul className="space-y-1.5">
                              {entry.items.map((item: any, i: number) => (
                                <li key={i} className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 font-medium">{item.title} (x{item.quantity})</span>
                                  <span className="font-bold text-gray-400">${formatPrice(item.price * item.quantity)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {entry.type !== 'payment' && entry.amountPaid > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-400">Pagado al momento</span>
                            <span className="text-emerald-600">${formatPrice(entry.amountPaid)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 sm:p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] shrink-0">
            <button
              onClick={onClose}
              className="w-full py-4 px-6 rounded-2xl font-black text-gray-400 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

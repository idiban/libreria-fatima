import React, { useState, useEffect } from 'react';
import { X, Edit2, Check, Loader2, History, User, Search, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClientRecord } from '../types';

interface ClientDetailModalProps {
  client: ClientRecord;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ClientDetailModal({ client, onClose, onUpdate }: ClientDetailModalProps) {
  const [name, setName] = useState(client?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ESTADOS PARA ACTUALIZACIÓN VISUAL INSTANTÁNEA
  const [currentDebt, setCurrentDebt] = useState(client?.totalDebt || 0);
  const [currentCredit, setCurrentCredit] = useState(client?.creditBalance || 0);

  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

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
    if (client?.id) fetchHistory();
  }, [client?.id]);

  const handleSaveName = async () => {
    if (!name.trim() || name === client.name) { setIsEditing(false); return; }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (res.ok) { onUpdate(); setIsEditing(false); }
      else alert("Error al actualizar");
    } catch (e) { alert("Error de conexión"); }
    finally { setIsSaving(false); }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      const endpoint = itemToDelete.type === 'payment'
        ? `/api/debts/payment/${itemToDelete.id}`
        : `/api/sales/${itemToDelete.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      
      if (res.ok) {
        // Encontrar el ítem antes de borrarlo para hacer la matemática instantánea
        const deletedItem = history.find(h => h.id === itemToDelete.id);
        
        if (deletedItem) {
          let netBalance = currentDebt - currentCredit;
          if (itemToDelete.type === 'payment') {
            netBalance += (deletedItem.amount || 0);
          } else {
            netBalance -= ((deletedItem.total || 0) - (deletedItem.amountPaid || 0));
          }
          setCurrentDebt(netBalance > 0 ? netBalance : 0);
          setCurrentCredit(netBalance < 0 ? Math.abs(netBalance) : 0);
        }

        setHistory(prev => prev.filter(h => h.id !== itemToDelete.id));
        onUpdate(); 

        // ---> ¡NUEVO! Avisar a la app que el stock de libros cambió <---
        if (itemToDelete.type !== 'payment') {
          window.dispatchEvent(new Event('stockUpdated'));
        }

      } else {
        const err = await res.json();
        alert(`Error al eliminar: ${err.error || 'Problema desconocido'}`);
      }
    } catch (e) {
      alert("Error de red al intentar eliminar.");
    } finally {
      setIsDeletingItem(false);
      setItemToDelete(null);
    }
  };

  const formatPrice = (price: number) => Number(price || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  const getDebtDate = (entry: any) => {
    if (!entry.timestamp) return 'Fecha desconocida';
    const date = new Date(entry.timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  const normalizeText = (text: string) => (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const normalizedSearch = normalizeText(searchTerm).trim();
  const filteredHistory = history.filter(entry => {
    if (!normalizedSearch) return true;
    const dateStr = normalizeText(getDebtDate(entry));
    const typeStr = entry.type === 'payment' ? 'abono pago' : 'compra realizada';
    const amountStr = formatPrice(entry.type === 'payment' ? entry.amount : (entry.total || entry.amount));
    const itemsMatch = entry.items?.some((item: any) => normalizeText(item.title).includes(normalizedSearch));
    return dateStr.includes(normalizedSearch) || typeStr.includes(normalizedSearch) || amountStr.includes(normalizedSearch) || itemsMatch;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]" >
          <div className="p-6 sm:p-8 border-b border-[var(--color-warm-surface)] flex justify-between items-center bg-[var(--color-warm-bg)] shrink-0">
            <div className="flex-1 mr-4">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input autoFocus type="text" className="text-xl sm:text-2xl font-black text-[var(--color-primary)] bg-white border-2 border-[var(--color-primary)] rounded-xl px-3 py-1 w-full outline-none" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} />
                  <button onClick={handleSaveName} disabled={isSaving} className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg active:scale-95 transition-all">{isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}</button>
                </div>
              ) : (
                <div className="flex items-center gap-3"><h2 className="text-2xl sm:text-3xl font-black text-[var(--color-primary)] leading-tight truncate">{name}</h2><button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] transition-all"><Edit2 className="w-4 h-4" /></button></div>
              )}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Perfil del Cliente</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm shrink-0"><X className="w-6 h-6 text-gray-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${currentCredit > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${currentCredit > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>Saldo a Favor</p>
                  <p className={`text-xl font-black ${currentCredit > 0 ? 'text-emerald-700' : 'text-gray-700'}`}>${formatPrice(currentCredit)}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${currentDebt > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${currentDebt > 0 ? 'text-red-600' : 'text-gray-600'}`}>Deuda Actual</p>
                  <p className={`text-xl font-black ${currentDebt > 0 ? 'text-red-700' : 'text-gray-700'}`}>${formatPrice(currentDebt)}</p>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2"><History className="w-4 h-4 text-gray-400" /><h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Historial</h3></div>
                  <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 border rounded-xl text-sm font-medium outline-none focus:border-[var(--color-primary)]" /></div>
                </div>
                {loadingHistory ? (<div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mx-auto" /></div>) : filteredHistory.length === 0 ? (<div className="py-10 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200"><p className="text-gray-400 font-medium">No hay registros.</p></div>) : (
                  <div className="space-y-4">
                    {filteredHistory.map((entry, idx) => (
                      <div key={idx} className={`p-5 rounded-[2rem] border shadow-sm transition-all ${entry.type === 'payment' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-[var(--color-warm-surface)]'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className={`font-black text-sm ${entry.type === 'payment' ? 'text-emerald-900' : 'text-[var(--color-primary)]'}`}>{entry.type === 'payment' ? 'Abono / Pago' : 'Compra Realizada'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{getDebtDate(entry)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className={`font-black text-lg ${entry.type === 'payment' ? 'text-emerald-600' : 'text-gray-600'}`}>${formatPrice(entry.type === 'payment' ? entry.amount : (entry.total || entry.amount))}</p>
                            <button
                              onClick={() => setItemToDelete({ id: entry.id, type: entry.type })}
                              className="p-1.5 sm:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {entry.items?.length > 0 && (
                          <div className="pt-3 border-t border-gray-100">
                            <ul className="space-y-2">
                              {entry.items.map((item: any, i: number) => (
                                <li key={i} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-3"><div className="w-8 h-12 rounded-md bg-gray-50 border overflow-hidden shrink-0 flex items-center justify-center">{item.cover_url && !item.bookId?.startsWith('custom_') ? <img src={item.cover_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-gray-300">Art.</span>}</div><span className="text-gray-500 font-medium">{item.title} (x{item.quantity})</span></div>
                                  <span className="font-bold text-red-500">${formatPrice(item.price * item.quantity)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {entry.type !== 'payment' && entry.amountPaid > 0 && (<div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold"><span className="text-gray-500">Pagado al momento</span><span className="text-emerald-600">${formatPrice(entry.amountPaid)}</span></div>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] shrink-0"><button onClick={onClose} className="w-full py-4 px-6 rounded-2xl font-black text-gray-400 bg-white border hover:bg-gray-50 transition-all shadow-sm">Cerrar</button></div>
        </motion.div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeletingItem && setItemToDelete(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900">¿Eliminar Registro?</h3>
            <p className="text-gray-500 text-sm mb-6">
              {itemToDelete.type === 'payment'
                ? 'El dinero de este pago se sumará nuevamente a la deuda del cliente.'
                : 'Esta acción restaurará el stock de los libros y ajustará la deuda del cliente.'}
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDelete} 
                disabled={isDeletingItem} 
                className="w-full py-3 sm:py-4 bg-red-500 hover:bg-red-600 transition-colors text-white rounded-xl font-black shadow-lg shadow-red-500/20 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isDeletingItem ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sí, Eliminar'}
              </button>
              <button 
                onClick={() => setItemToDelete(null)} 
                disabled={isDeletingItem} 
                className="w-full py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 rounded-xl font-black disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
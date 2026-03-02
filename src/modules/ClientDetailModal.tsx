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

  const historyWithBalances = React.useMemo(() => {
    let runningBal = 0;
    return [...history]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(entry => {
        const debtBefore = runningBal > 0 ? runningBal : 0;
        const creditBefore = runningBal < 0 ? Math.abs(runningBal) : 0;
        let netChange = 0;
        if (entry.type === 'payment') {
          netChange = -Number(entry.amount || 0);
        } else {
          netChange = Number(entry.total || 0) - Number(entry.amountPaid || 0);
        }
        runningBal += netChange;
        return { ...entry, debtBefore, creditBefore };
      })
      .reverse();
  }, [history]);

  const normalizedSearch = normalizeText(searchTerm).trim();
  const filteredHistory = historyWithBalances.filter(entry => {
    if (!normalizedSearch) return true;
    const dateStr = normalizeText(getDebtDate(entry));
    const typeStr = entry.type === 'payment' ? 'abono pago' : 'compra realizada';
    const amountStr = formatPrice(entry.type === 'payment' ? entry.amount : (entry.total || entry.amount));
    const itemsMatch = entry.items?.some((item: any) => normalizeText(item.title).includes(normalizedSearch));
    return dateStr.includes(normalizedSearch) || typeStr.includes(normalizedSearch) || amountStr.includes(normalizedSearch) || itemsMatch;
  });

  return (
    <>
      <AnimatePresence>
        <div key="main-client-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
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
                     {filteredHistory.map((entry, idx) => {
                        const isPayment = entry.type === 'payment';
                        
                        // Cálculos exactos para recrear el cuadro resumen del carrito
                        const booksTotal = !isPayment ? (entry.items || []).filter((i:any) => !i.bookId.startsWith('custom_')).reduce((acc:number, item:any) => acc + (item.price * item.quantity), 0) : 0;
                        const articlesTotal = !isPayment ? (entry.items || []).filter((i:any) => i.bookId.startsWith('custom_')).reduce((acc:number, item:any) => acc + (item.price * item.quantity), 0) : 0;
                        const rawTotalItems = booksTotal + articlesTotal;
                        const discountAmount = Math.round(rawTotalItems * ((entry.discount || 0) / 100));
                        
                        const netTotalToPay = (entry.total || 0) + (entry.debtBefore || 0);
                        const cashNeeded = Math.max(0, netTotalToPay - (entry.creditBefore || 0));
                        const isFalta = (entry.amountPaid || 0) < cashNeeded;
                        const balanceDifference = Math.abs((entry.amountPaid || 0) - cashNeeded);
                        const isFavor = (entry.amountPaid || 0) > cashNeeded;
                        const debtVal = balanceDifference;

                        return (
                          <div key={idx} className={`relative p-4 sm:p-5 rounded-[2rem] border shadow-sm transition-all ${isPayment ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-[var(--color-warm-surface)]'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-3 pr-8">
                              <div className="flex-1 pr-10">
                                <p className={`font-black text-sm ${isPayment ? 'text-emerald-900' : 'text-[var(--color-primary)]'}`}>
                                  {isPayment ? 'Abono / Pago de Deuda' : `Compra del ${getDebtDate(entry)}`}
                                </p>
                                {isPayment && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{getDebtDate(entry)}</p>}

                                {!isPayment && (entry.paymentMethod && entry.paymentMethod.length > 0) && (
                                  <div className="flex gap-2 mt-2 mb-1">
                                    {entry.paymentMethod.includes('efectivo') && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">Efectivo</span>}
                                    {entry.paymentMethod.includes('transferencia') && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-widest">Transf.</span>}
                                  </div>
                                )}
                                {!isPayment && entry.notes && <p className="text-[10px] text-gray-500 italic mt-1.5 bg-gray-50 p-2 rounded-lg max-w-sm">"{entry.notes}"</p>}
                                {!isPayment && entry.sellerName && (
                                  <div className="flex items-center gap-1.5 mt-2 ml-0.5 opacity-80">
                                    <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[8px] font-black shrink-0 uppercase">
                                      {entry.sellerName[0]}
                                    </div>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest truncate">Vendedor: {entry.sellerName}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-start gap-3 shrink-0">
                                <div className="text-right">
                                  {isPayment ? (
                                    <p className="font-black text-lg text-emerald-600">Pagó: ${formatPrice(entry.amount)}</p>
                                  ) : (
                                    <p className={`font-black text-sm sm:text-base ${isFavor ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {isFavor ? 'Abono: ' : 'Deuda: '}${formatPrice(Math.abs(debtVal))}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => setItemToDelete({ id: entry.id, type: entry.type })}
                                  className="absolute top-4 right-4 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Eliminar registro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {!isPayment && entry.items?.length > 0 && (
                              <div className="pt-2 border-t border-gray-100 mb-3">
                                <ul className="space-y-2 mt-2">
                                  {entry.items.map((item: any, i: number) => (
                                    <li key={i} className="flex justify-between items-center text-xs">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-12 rounded-md bg-gray-50 border overflow-hidden shrink-0 flex items-center justify-center">
                                          {item.cover_url && !item.bookId?.startsWith('custom_') ? <img src={item.cover_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-gray-300">Art.</span>}
                                        </div>
                                        <span className="text-gray-500 font-medium">{item.title} <span className="text-gray-400">(x{item.quantity})</span></span>
                                      </div>
                                      <span className="font-bold text-[var(--color-primary)]">${formatPrice(item.price * item.quantity)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {!isPayment && (
                              <div className={`mt-3 rounded-2xl p-3 sm:p-4 flex flex-col border ${
                                isFalta ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'
                              }`}>
                                <div className="space-y-1.5 text-xs font-medium">
                                    {booksTotal > 0 && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Valor libros:</span> 
                                        <span className="text-gray-800 font-bold">${formatPrice(booksTotal)}</span>
                                      </div>
                                    )}
                                    {articlesTotal > 0 && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Valor artículos:</span> 
                                        <span className="text-gray-800 font-bold">${formatPrice(articlesTotal)}</span>
                                      </div>
                                    )}
                                    {(entry.discount || 0) > 0 && (
                                      <div className="flex justify-between items-center bg-emerald-100/50 px-2 py-1 -mx-2 rounded-md">
                                        <span className="text-emerald-700 font-bold">Descuento ({entry.discount}%):</span> 
                                        <span className="text-emerald-600 font-black">-${formatPrice(discountAmount)}</span>
                                      </div>
                                    )}
                                    {entry.debtBefore > 0 && (
                                      <div className="flex justify-between items-center pt-1">
                                        <span className="text-gray-600">Deuda anterior:</span> 
                                        <span className="text-red-500 font-bold">${formatPrice(entry.debtBefore)}</span>
                                      </div>
                                    )}
                                    {entry.creditBefore > 0 && (
                                      <div className="flex justify-between items-center pt-1">
                                        <span className="text-gray-600">A favor anterior:</span> 
                                        <span className="text-emerald-600 font-bold">${formatPrice(entry.creditBefore)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/60 mt-2">
                                      <span className="text-gray-600">Total Venta:</span> 
                                      <span className="text-gray-900 font-black">${formatPrice(netTotalToPay)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Lo que pagó:</span> 
                                      <span className="text-gray-900 font-black">${formatPrice(entry.amountPaid)}</span>
                                    </div>
                                </div>

                                <div className={`mt-2 pt-2 border-t flex justify-between items-center ${isFalta ? 'border-red-200' : 'border-emerald-200'}`}>
                                  {balanceDifference === 0 ? (
                                    <span className="font-black uppercase tracking-widest text-[10px] text-emerald-800 w-full text-center">
                                      Quedó al día
                                    </span>
                                  ) : (
                                    <>
                                      <span className={`font-black uppercase tracking-widest text-[10px] ${isFalta ? 'text-red-800' : 'text-emerald-800'}`}>
                                        {isFalta ? 'Deuda generada:' : 'Saldo a favor generado:'}
                                      </span>
                                      <span className={`text-base sm:text-lg font-black ${isFalta ? 'text-red-600' : 'text-emerald-600'}`}>
                                        ${formatPrice(balanceDifference)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] shrink-0"><button onClick={onClose} className="w-full py-4 px-6 rounded-2xl font-black text-gray-400 bg-white border hover:bg-gray-50 transition-all shadow-sm">Cerrar</button></div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AnimatePresence>
        {itemToDelete && (
          <div key="delete-confirm-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
                  className="w-full py-3 sm:py-4 bg-gray-200 hover:bg-gray-300 transition-colors text-gray-700 rounded-xl font-black disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
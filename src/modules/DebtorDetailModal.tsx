import React, { useState, useEffect } from 'react';
import { X, DollarSign, Loader2, Check, Trash2, AlertTriangle, PiggyBank } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClientRecord, SaleRecord, BookItem } from '../types';

interface DebtorDetailModalProps {
  client: ClientRecord;
  onClose: () => void;
  onPaymentSuccess: () => void;
  books: BookItem[];
}

export default function DebtorDetailModal({ client, onClose, onPaymentSuccess, books }: DebtorDetailModalProps) {
  const [debtData, setDebtData] = useState<{ history: any[], totalDebt: number }>({ history: [], totalDebt: 0 });
  const [loading, setLoading] = useState(true);
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [isPaying, setIsPaying] = useState(false);
  
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  
  // NUEVO: Estado para el popup de sobrepago
  const [showOverpayConfirm, setShowOverpayConfirm] = useState(false);

  useEffect(() => {
    const fetchDebtDetail = async () => {
      try {
        const res = await fetch(`/api/debts/client/${client.id}`);
        const data = await res.json();
        
        setDebtData({
          history: Array.isArray(data) ? data : (data.history || []),
          totalDebt: data.totalDebt !== undefined ? data.totalDebt : client.totalDebt
        });
      } catch (e) {
        console.error("Error al cargar detalle de deuda:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDebtDetail();
  }, [client.id]);

  const formatPrice = (price: number) => {
    return Number(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getDebtDate = (entry: any) => {
    if (!entry.timestamp) return 'Fecha desconocida';
    
    let date;
    if (typeof entry.timestamp === 'object') {
      if (entry.timestamp.seconds) date = new Date(entry.timestamp.seconds * 1000);
      else if (entry.timestamp._seconds) date = new Date(entry.timestamp._seconds * 1000);
      else date = new Date(entry.timestamp);
    } else {
      date = new Date(entry.timestamp);
    }

    if (isNaN(date.getTime())) return 'Fecha inválida';

    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  const getActiveHistory = () => {
    if (debtData.totalDebt <= 0) return [];
    
    let runningBalance = 0;
    let lastZeroIndex = -1;

    const sortedHistory = [...debtData.history].sort((a, b) => {
      const timeA = a.timestamp?.seconds || new Date(a.timestamp).getTime();
      const timeB = b.timestamp?.seconds || new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    sortedHistory.forEach((entry, index) => {
      if (entry.type === 'payment') {
        runningBalance -= entry.amount;
      } else {
        runningBalance += (entry.total - (entry.amountPaid || 0));
      }
      
      if (runningBalance <= 0) {
        lastZeroIndex = index;
      }
    });

    return sortedHistory.slice(lastZeroIndex + 1).reverse();
  };

  const visibleHistory = getActiveHistory();

  const handleOpenDeleteModal = (e: React.MouseEvent, paymentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPaymentToDelete(paymentId);
  };

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    
    setDeletingPaymentId(paymentToDelete);
    try {
      const response = await fetch(`/api/debts/payment/${paymentToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onPaymentSuccess(); 
        onClose(); 
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const err = await response.json();
          alert(`Error al eliminar: ${err.error}`);
        } else {
          alert(`Error del servidor: Ruta no encontrada.`);
        }
      }
    } catch (error) {
      console.error(error);
      alert('Error de red al intentar eliminar el pago.');
    } finally {
      setDeletingPaymentId(null);
      setPaymentToDelete(null);
    }
  };

  // NUEVO: Verificación antes de ejecutar el pago
  const handlePayment = async () => {
    if (amountToPay <= 0) return;

    if (amountToPay > client.totalDebt && !showOverpayConfirm) {
      setShowOverpayConfirm(true);
      return;
    }

    executePayment();
  };

  // NUEVO: Ejecución real del pago separada
  const executePayment = async () => {
    setIsPaying(true);
    try {
      const response = await fetch(`/api/clients/${client.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountToPay })
      });

      if (response.ok) {
        onPaymentSuccess();
      } else {
        try {
          const err = await response.json();
          alert(`Error al procesar el pago: ${err.error}`);
        } catch {
          alert('Error al procesar el pago. El servidor no respondió correctamente.');
        }
      }
    } catch (e) {
      alert('Error al procesar el pago');
    } finally {
      setIsPaying(false);
      setShowOverpayConfirm(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        <div key="main-debtor-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 sm:p-8 border-b border-[var(--color-warm-surface)] flex justify-between items-center bg-[var(--color-warm-bg)]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-primary)] leading-tight">{client.name}</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Detalle de Deuda Actual</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm shrink-0">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
              {loading ? (
                <div className="text-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mx-auto" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 ml-1">Movimientos de Deuda Vigente</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 sm:pr-4 -mr-2 sm:-mr-4">
                      {visibleHistory.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm py-4">No hay deudas activas actualmente.</p>
                      ) : ( visibleHistory.map((entry, idx) => {
                        
                        const isPayment = entry.type === 'payment';
                        const debtVal = isPayment ? 0 : entry.total - (entry.amountPaid || 0);
                        const isFavor = debtVal < 0;

                        return (
                        <div key={idx} className={`p-4 sm:p-5 border rounded-2xl shadow-sm ${isPayment ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-[var(--color-warm-surface)]'}`}>
                          {isPayment ? (
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex-1">
                                <p className="font-bold text-sm text-emerald-900 leading-tight">{entry.label || 'Pago de deuda'}</p>
                                <p className="text-[10px] font-medium text-emerald-600 mt-0.5">{getDebtDate(entry)}</p>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                <p className="font-black text-sm sm:text-base text-emerald-600">Pagó: ${formatPrice(entry.amount)}</p>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenDeleteModal(e, entry.id)}
                                  disabled={deletingPaymentId === entry.id}
                                  className="p-1.5 sm:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                  title="Eliminar pago"
                                >
                                  {deletingPaymentId === entry.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                                <div>
                                  <p className="font-bold text-sm leading-tight text-[var(--color-primary)]">Compra del {getDebtDate(entry)}</p>
                                  {entry.total !== undefined && (
                                    <div className="mt-1 flex gap-3 text-[10px] font-medium text-gray-500">
                                      <p>Total: ${formatPrice(entry.total)}</p>
                                      <p>Pagado: ${formatPrice(entry.amountPaid)}</p>
                                    </div>
                                  )}
                                </div>
                                <p className={`font-black text-sm sm:text-base ${isFavor ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {isFavor ? 'Abono: ' : 'Deuda: '}${formatPrice(Math.abs(debtVal))}
                                </p>
                              </div>
                              <ul className="mt-3 text-xs text-gray-500 space-y-2">
                                {entry.items?.map((item: any) => {
                                  const book = books.find(b => b.id === item.bookId);
                                  const hasCover = book?.cover_url && !item.bookId.startsWith('custom_');
                                  
                                  return (
                                    <li key={item.bookId} className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                      <div className="w-10 h-14 rounded-md bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                                        {hasCover ? (
                                          <img src={book.cover_url} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[8px] font-bold text-gray-300 text-center px-1">Artículo</span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-700 truncate">{item.title} <span className="text-gray-400 font-medium">(x{item.quantity})</span></p>
                                        <p className="font-black text-[var(--color-primary)] mt-0.5">${formatPrice(item.price * item.quantity)}</p>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </>
                          )}
                        </div>
                      )}))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-6 border-t border-[var(--color-warm-surface)]">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Monto a Pagar</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          className="w-full pl-12 pr-4 py-3 sm:py-4 bg-gray-100 border-2 border-transparent focus:border-[var(--color-primary)] rounded-2xl outline-none transition-all font-black text-lg sm:text-xl"
                          value={amountToPay ? formatPrice(amountToPay) : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setAmountToPay(Number(val)); 
                            // SE ELIMINÓ EL LÍMITE: if (num > client.totalDebt)
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => setAmountToPay(client.totalDebt)}
                        className="mt-2 w-full py-2 bg-[var(--color-primary)] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Pagar toda la deuda
                      </button>
                    </div>
                    <div className="flex justify-center sm:justify-end items-center h-full">
                      {/* MODIFICADO: Caja dinámica igual a SalesModal */}
                      <div className={`w-full sm:w-auto rounded-2xl p-4 flex flex-col justify-center items-center text-white shadow-xl transition-all duration-300 ${
                        amountToPay >= client.totalDebt
                          ? 'bg-emerald-500 shadow-emerald-500/20' 
                          : 'bg-red-500 shadow-red-500/20'
                      }`}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Deuda Total</p>
                        <p className="text-3xl font-black">${formatPrice(client.totalDebt)}</p>
                        
                        {client.totalDebt - amountToPay > 0 && amountToPay > 0 && (
                          <p className="text-[10px] sm:text-[9px] font-bold mt-1 bg-white/20 px-3 py-1 rounded-lg">
                            Falta: ${formatPrice(client.totalDebt - amountToPay)}
                          </p>
                        )}
                        
                        {amountToPay > client.totalDebt && (
                          <p className="text-[10px] sm:text-[9px] font-bold mt-1 bg-white/20 px-3 py-1 rounded-lg text-emerald-100">
                            A favor: ${formatPrice(amountToPay - client.totalDebt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] flex gap-3 sm:gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-black text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-sm text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={isPaying || amountToPay <= 0}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-black text-sm sm:text-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 sm:gap-3 active:scale-95 disabled:opacity-50"
              >
                {isPaying ? (
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                    Pagar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Modal Confirmación Eliminar Pago */}
      <AnimatePresence>
        {paymentToDelete && (
          <div key="delete-payment-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setPaymentToDelete(null)} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 sm:p-10 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black mb-2">¿Eliminar Pago?</h3>
              <p className="text-gray-500 text-sm mb-8">El dinero se volverá a sumar a la deuda del cliente.</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDeletePayment} 
                  disabled={deletingPaymentId !== null} 
                  className="w-full py-4 bg-red-500 hover:bg-red-600 transition-colors text-white rounded-xl font-black shadow-lg shadow-red-500/20 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {deletingPaymentId !== null ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sí, Eliminar'}
                </button>
                <button 
                  onClick={() => setPaymentToDelete(null)} 
                  className="w-full py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 rounded-xl font-black"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* NUEVO: Popup de Confirmación PiggyBank para Saldos a Favor en Pagos */}
      <AnimatePresence>
        {showOverpayConfirm && (
          <div key="overpay-confirm-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOverpayConfirm(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <PiggyBank className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-[#2D1A1A] mb-3">¿Saldo a Favor?</h3>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                ¿Quieres dejar <span className="text-emerald-600 font-black">${formatPrice(amountToPay - client.totalDebt)}</span> como saldo a favor para este cliente?
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={executePayment} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                  Sí, guardar saldo
                </button>
                <button onClick={() => setShowOverpayConfirm(false)} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black active:scale-95 transition-all">
                  Corregir monto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
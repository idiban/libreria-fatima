import React, { useState, useEffect } from 'react';
import { X, DollarSign, Loader2, Check } from 'lucide-react';
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

  useEffect(() => {
    const fetchDebtDetail = async () => {
      try {
        const res = await fetch(`/api/debts/client/${client.id}`);
        const data = await res.json();
        
        // CORRECCIÓN 1: Manejar si el backend devuelve un Array directamente o el Objeto esperado
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
    
    // CORRECCIÓN 2: Manejo de Firebase Timestamps (_seconds/seconds) o Strings
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

  const handlePayment = async () => {
    if (amountToPay <= 0) return;
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
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Detalle de Deuda</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
            {loading ? (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mx-auto" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Compras con Deuda</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-4 -mr-4">
                    {debtData.history.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm py-4">No hay compras con deuda registradas.</p>
                    ) : ( debtData.history.map((entry, idx) => (
                      <div key={idx} className={`p-4 border rounded-2xl shadow-sm ${entry.type === 'payment' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-[var(--color-warm-surface)]'}`}>
                        {entry.type === 'payment' ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-sm text-emerald-900">{entry.label || 'Pago de deuda'}</p>
                              <p className="text-[10px] font-medium text-emerald-600">{getDebtDate(entry)}</p>
                            </div>
                            <p className="font-black text-sm text-emerald-600">Pagó: ${formatPrice(entry.amount)}</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm">Compra del {getDebtDate(entry)}</p>
                                {entry.total !== undefined && (
                                  <div className="mt-1 space-y-0.5">
                                    <p className="text-[10px] font-medium text-gray-400">Total: ${formatPrice(entry.total)}</p>
                                    <p className="text-[10px] font-medium text-gray-400">Pagado: ${formatPrice(entry.amountPaid)}</p>
                                  </div>
                                )}
                              </div>
                              {/* CORRECCIÓN 3: Calcular la deuda basada en la colección "ventas" (total - amountPaid) */}
                              <p className="font-black text-sm text-red-500">Deuda: ${formatPrice(entry.total - (entry.amountPaid || 0))}</p>
                            </div>
                            <ul className="mt-2 text-xs text-gray-500 space-y-2">
                              {entry.items?.map((item: any) => {
                                const book = books.find(b => b.id === item.bookId);
                                return (
                                  <li key={item.bookId} className="flex items-center gap-3">
                                    <img src={book?.cover_url || 'https://via.placeholder.com/40x60'} alt={item.title} className="w-8 h-12 object-cover rounded-md bg-gray-100" />
                                    <div>
                                      <p className="font-bold">{item.title} (x{item.quantity})</p>
                                      <p>Valor: ${formatPrice(item.price * item.quantity)}</p>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        )}
                      </div>
                    )))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[var(--color-warm-surface)]">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Monto a Pagar</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-gray-100 border-2 border-transparent focus:border-[var(--color-primary)] rounded-2xl outline-none transition-all font-black text-xl"
                        value={amountToPay ? formatPrice(amountToPay) : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          let num = Number(val);
                          if (num > client.totalDebt) num = client.totalDebt;
                          setAmountToPay(num);
                        }}
                      />
                    </div>
                    <button 
                      onClick={() => setAmountToPay(client.totalDebt)}
                      className="mt-2 w-full py-2 bg-[var(--color-primary)] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Pagar todo
                    </button>
                  </div>
                  <div className="flex justify-center sm:justify-end items-center">
                    <div className={`rounded-2xl p-3 px-5 flex flex-col justify-center items-center text-white shadow-xl bg-red-500 shadow-red-500/20`}>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Deuda Total</p>
                      <p className="text-2xl font-black">${formatPrice(client.totalDebt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl font-black text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handlePayment}
              disabled={isPaying || amountToPay <= 0}
              className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isPaying ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Pagar
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  Check, 
  Loader2, 
  User, 
  DollarSign, 
  Trash2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem, UserProfile, SaleItem } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBook: BookItem;
  currentUser: UserProfile;
  onSaleSuccess: () => void;
}

export default function SaleModal({ isOpen, onClose, initialBook, currentUser, onSaleSuccess }: SaleModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [items, setItems] = useState<SaleItem[]>([
    { bookId: initialBook.id, title: initialBook.title, price: initialBook.price, quantity: 1, stock: initialBook.stock }
  ]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [bookSuggestions, setBookSuggestions] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [smartClientPrompt, setSmartClientPrompt] = useState<{ existing: any, current: string } | null>(null);
  const [clientNameError, setClientNameError] = useState(false);
  const [selectedClientDebt, setSelectedClientDebt] = useState<number | null>(null);

  const [isClientSelected, setIsClientSelected] = useState(false);

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  useEffect(() => {
    if (clientName.length > 2 && !isClientSelected) {
      const fetchSuggestions = async () => {
        try {
          const res = await fetch(`/api/clients/suggest?q=${encodeURIComponent(clientName)}`);
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.indexOf('application/json') !== -1) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setClientSuggestions(data);
            } else {
              setClientSuggestions([]);
            }
          } else {
            setClientSuggestions([]);
          }
        } catch (e) {}
      };
      fetchSuggestions();
    } else {
      setClientSuggestions([]);
      if (clientName.length <= 2) {
        setIsClientSelected(false);
      }
    }
  }, [clientName, isClientSelected]);

  const handleBookSearch = async (term: string) => {
    setBookSearchTerm(term);
    if (term.length > 2) {
      setIsSearching(true);
      try {
        // AI-powered search (not labeled as AI)
        const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as string) });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ text: `Basado en el término de búsqueda "${term}", identifica qué libros del catálogo podrían coincidir. Responde solo con una lista de IDs de libros si los conoces, o palabras clave para filtrar.` }],
        });
        
        // For now, simple fetch but we can use AI to refine the query
        const res = await fetch('/api/books');
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const allBooks: BookItem[] = await res.json();
          if (Array.isArray(allBooks)) {
            const filtered = allBooks.filter(b => 
              b.title.toLowerCase().includes(term.toLowerCase()) || 
              b.author.toLowerCase().includes(term.toLowerCase())
            );
            setBookSuggestions(filtered);
          } else {
            setBookSuggestions([]);
          }
        } else {
          setBookSuggestions([]);
        }
      } catch (e) {} finally {
        setIsSearching(false);
      }
    } else {
      setBookSuggestions([]);
    }
  };

  const addItem = (book: BookItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.bookId === book.id);
      if (existing) {
        return prev.map(i => i.bookId === book.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { bookId: book.id, title: book.title, price: book.price, quantity: 1, stock: book.stock }];
    });
    setBookSearchTerm('');
    setBookSuggestions([]);
  };

  const updateQuantity = (bookId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.bookId === bookId) {
        let newQty = item.quantity + delta;
        if (newQty < 1) newQty = 1; // Cantidad mínima 1
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (bookId: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.bookId !== bookId));
  };

  useEffect(() => {
    if (amountPaid > total) {
      setAmountPaid(total);
    }
  }, [total, amountPaid]);

  const handleFinalize = async () => {
    if (!clientName.trim()) {
      setClientNameError(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          clientId,
          clientName,
          amountPaid,
          total,
          sellerId: currentUser.id,
          sellerName: currentUser.username
        })
      });

      if (response.ok) {
        onSaleSuccess();
        onClose();
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (e) {
      alert('Error al procesar la venta.');
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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-[var(--color-warm-surface)] flex justify-between items-center bg-[var(--color-warm-bg)]">
              <div>
                <h2 className="text-3xl font-black text-[var(--color-primary)] leading-tight flex items-center gap-2">
                  <span>{clientName || 'Venta'}</span>
                  {selectedClientDebt && selectedClientDebt > 0 && (
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">Debe ${formatPrice(selectedClientDebt)}</span>
                  )}
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Carrito de Compras</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Client Section */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Comprador</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    className={`w-full pl-12 pr-4 py-4 bg-[var(--color-warm-bg)] border-2 rounded-2xl outline-none transition-all font-bold ${clientNameError ? 'border-red-500' : 'border-transparent focus:border-[var(--color-primary)]'}`}
                    placeholder="Nombre del cliente..."
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      setClientId(null);
                      if (clientNameError) setClientNameError(false);
                      setSelectedClientDebt(null);
                    }}
                  />
                  {clientNameError && <p className="text-red-500 text-xs font-bold mt-1 ml-2 absolute">Debes ingresar un nombre de comprador.</p>}
                  {clientSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                      {clientSuggestions.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setClientName(c.name);
                            setClientId(c.id);
                            if (c.totalDebt) {
                              setSelectedClientDebt(c.totalDebt);
                            }
                            setIsClientSelected(true);
                            setClientSuggestions([]);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-[var(--color-warm-bg)] transition-colors flex items-center justify-between"
                        >
                          <span className="font-bold text-sm">{c.name}</span>
                          <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest">Existente</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Productos</label>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.bookId} className="flex items-center gap-4 p-4 bg-white border border-[var(--color-warm-surface)] rounded-2xl shadow-sm">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm leading-tight">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[var(--color-primary)] font-black text-xs">${formatPrice(item.price)}</p>
                          {item.stock === 0 && (
                            <span className="text-[8px] font-black uppercase text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Sin Stock</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-[var(--color-warm-bg)] rounded-xl p-1">
                        <button 
                          onClick={() => updateQuantity(item.bookId, -1)}
                          className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-[var(--color-primary)] transition-all"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.bookId, 1)}
                          className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-[var(--color-primary)] transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeItem(item.bookId);
                        }}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add More Search */}
                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-dashed border-gray-300 rounded-2xl text-sm outline-none focus:border-[var(--color-primary)] transition-all"
                    placeholder="Buscar otro libro para agregar..."
                    value={bookSearchTerm}
                    onChange={(e) => handleBookSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                    </div>
                  )}
                  {bookSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 max-h-60 overflow-y-auto">
                      {bookSuggestions.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => addItem(b)}
                          className="w-full px-4 py-3 text-left hover:bg-[var(--color-warm-bg)] transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-sm">{b.title}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{b.author}</p>
                          </div>
                          <span className="font-black text-[var(--color-primary)] text-xs">${formatPrice(b.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Section */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[var(--color-warm-surface)]">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Monto Pagado</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-[var(--color-warm-bg)] border-2 border-transparent focus:border-[var(--color-primary)] rounded-2xl outline-none transition-all font-black text-xl"
                      value={amountPaid ? formatPrice(amountPaid) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        let num = Number(val);
                        if (num > total) num = total;
                        setAmountPaid(num);
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => setAmountPaid(total)}
                    className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:underline ml-1"
                  >
                    Pagó todo
                  </button>
                </div>
                <div className={`rounded-3xl p-6 flex flex-col justify-center items-end text-white shadow-xl transition-all duration-300 ${
                  amountPaid >= total 
                    ? 'bg-emerald-500 shadow-emerald-500/20' 
                    : 'bg-red-500 shadow-red-500/20'
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total a Pagar</p>
                  <p className="text-2xl font-black">${formatPrice(total)}</p>
                  {total - amountPaid > 0 && (
                    <p className="text-[10px] font-bold mt-2 bg-white/20 px-2 py-1 rounded-lg">
                      Deuda: ${formatPrice(total - amountPaid)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalize}
                disabled={isLoading}
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    Listo
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

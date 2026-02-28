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
  AlertCircle,
  Trash2,
  PiggyBank 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem, UserProfile, SaleItem } from '../types';
import { GoogleGenAI } from "@google/genai";

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
    { bookId: initialBook.id, title: initialBook.title, price: initialBook.price, quantity: 1, stock: initialBook.stock, cover_url: initialBook.cover_url }
  ]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [bookSuggestions, setBookSuggestions] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [clientNameError, setClientNameError] = useState(false);
  const [selectedClientDebt, setSelectedClientDebt] = useState<number | null>(null);
  const [selectedClientCredit, setSelectedClientCredit] = useState<number>(0); 
  const [showOverpayConfirm, setShowOverpayConfirm] = useState(false); 

  const [isClientSelected, setIsClientSelected] = useState(false);

  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // El Total siempre debe ser el valor de la compra actual
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Modificado: El total neto a pagar es solo el total de la compra. 
  // La deuda/crédito previo se maneja en la lógica de pago pero no ensucia el precio del producto.
  const netTotalToPay = total + (selectedClientDebt || 0);

  const latestSearch = useRef<string>('');

  useEffect(() => {
    if (!isOpen) {
      setClientNameError(false);
      setShowOverpayConfirm(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (clientName.length > 1 && !isClientSelected) {
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
      if (clientName.length <= 1) {
        setIsClientSelected(false);
      }
    }
  }, [clientName, isClientSelected]);

  const handleBookSearch = async (term: string) => {
    setBookSearchTerm(term);
    latestSearch.current = term;

    if (term.length > 2) {
      setIsSearching(true);
      try {
        const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as string) });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ text: `Basado en el término de búsqueda "${term}", identifica qué libros del catálogo podrían coincidir. Responde solo con una lista de IDs de libros si los conoces, o palabras clave para filtrar.` }],
        });
        
        const res = await fetch('/api/books');
        const contentType = res.headers.get('content-type');
        
        if (latestSearch.current !== term) return;

        if (contentType && contentType.indexOf('application/json') !== -1) {
          const allBooks: BookItem[] = await res.json();
          if (Array.isArray(allBooks)) {
            const normalizedTerm = normalizeText(term);
            const filtered = allBooks.filter(b => 
              normalizeText(b.title).includes(normalizedTerm) || 
              normalizeText(b.author).includes(normalizedTerm) ||
              normalizeText(b.category || '').includes(normalizedTerm)
            );
            setBookSuggestions(filtered);
          } else {
            setBookSuggestions([]);
          }
        } else {
          setBookSuggestions([]);
        }
      } catch (e) {} finally {
        if (latestSearch.current === term) {
          setIsSearching(false);
        }
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
      return [...prev, { bookId: book.id, title: book.title, price: book.price, quantity: 1, stock: book.stock, cover_url: book.cover_url }];
    });
    setBookSearchTerm('');
    setBookSuggestions([]);
    setIsSearching(false);
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim() || !customItemPrice) return;
    const priceNum = Number(customItemPrice.replace(/\D/g, ''));
    if (priceNum <= 0) return;

    const newItem: any = {
      bookId: `custom_${Date.now()}`, 
      title: customItemName.trim(),
      price: priceNum,
      quantity: 1,
      stock: 99999, 
      cover_url: '' 
    };

    setItems(prev => [...prev, newItem]);
    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomItemForm(false);
  };

  const updateQuantity = (bookId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.bookId === bookId) {
        let newQty = item.quantity + delta;
        if (newQty < 1) newQty = 1;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (bookId: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.bookId !== bookId));
  };

  const handleFinalize = async () => {
    if (!clientName.trim()) {
      setClientNameError(true);
      return;
    }

    // Usamos el total actual para la validación del popup de saldo a favor
    if (amountPaid > netTotalToPay && !showOverpayConfirm) {
      setShowOverpayConfirm(true);
      return;
    }

    executeFinalize();
  };

  const executeFinalize = async () => {
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
          total, // Valor de la compra
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
      setShowOverpayConfirm(false);
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
                  <span>{clientName || 'Nueva Venta'}</span>
                  <div className="flex gap-2">
                    {selectedClientDebt !== null && selectedClientDebt > 0 && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100">Debe ${formatPrice(selectedClientDebt)}</span>
                    )}
                    {selectedClientCredit > 0 && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Favor: ${formatPrice(selectedClientCredit)}</span>
                    )}
                  </div>
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
                    className={`w-full pl-12 pr-4 py-4 bg-gray-100 border-2 rounded-2xl outline-none transition-all font-bold ${clientNameError ? 'border-red-500' : 'border-transparent focus:border-[var(--color-primary)]'}`}
                    placeholder="Nombre del comprador..."
                    value={clientName}
                    onChange={(e) => {
                      setClientName(capitalizeWords(e.target.value));
                      setClientId(null);
                      if (clientNameError) setClientNameError(false);
                      setSelectedClientDebt(null);
                      setSelectedClientCredit(0);
                      setIsClientSelected(false);
                    }}
                  />
                  {clientNameError && <p className="text-red-500 text-xs font-bold mt-1 ml-2 absolute">Debes ingresar un nombre de comprador.</p>}
                  {!isClientSelected && clientName.length > 1 && clientSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 z-50 shadow-lg">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> ¿Quisiste decir alguno de estos?
                      </p>
                      <div className="space-y-1">
                        {clientSuggestions.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setClientName(c.name);
                              setClientId(c.id);
                              setSelectedClientDebt(c.totalDebt || 0);
                              setSelectedClientCredit(c.creditBalance || 0);
                              // Al seleccionar, si tiene crédito, sugerimos el pago total con su crédito
                              if (c.creditBalance > 0) {
                                setAmountPaid(c.creditBalance);
                              }
                              setIsClientSelected(true);
                              setClientSuggestions([]);
                            }}
                            className="w-full px-3 py-2 text-left bg-white hover:bg-amber-100 rounded-xl transition-colors flex items-center justify-between border border-amber-100"
                          >
                            <span className="font-bold text-sm text-amber-900">{c.name}</span>
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Usar Existente</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Productos</label>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.bookId} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-[var(--color-warm-surface)] rounded-2xl shadow-sm relative">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-14 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                          {item.cover_url ? (
                            <img src={item.cover_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-200 bg-[var(--color-warm-bg)]">
                              <span className="text-[8px] font-bold text-center px-1">Artículo</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm leading-tight pr-8 sm:pr-0">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[var(--color-primary)] font-black text-xs">${formatPrice(item.price)}</p>
                            {item.stock === 0 && !item.bookId.startsWith('custom_') && (
                              <span className="text-[8px] font-black uppercase text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">Sin Stock</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-3 bg-[var(--color-warm-bg)] rounded-xl p-1">
                            <button onClick={() => updateQuantity(item.bookId, -1)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-[var(--color-primary)] transition-all">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.bookId, 1)} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-[var(--color-primary)] transition-all">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(item.bookId); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="sm:hidden font-black text-[var(--color-primary)] text-sm">
                          ${formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-12 pr-10 py-3 bg-white border border-dashed border-gray-300 rounded-2xl text-sm outline-none focus:border-[var(--color-primary)] transition-all"
                    placeholder="Buscar por título, autor o categoría..."
                    value={bookSearchTerm}
                    onChange={(e) => handleBookSearch(e.target.value)}
                  />
                  {isSearching ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                    </div>
                  ) : bookSearchTerm ? (
                    <button 
                      onClick={() => {
                        setBookSearchTerm('');
                        setBookSuggestions([]);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                  {bookSearchTerm.length > 2 && bookSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 max-h-60 overflow-y-auto">
                      {bookSuggestions.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => addItem(b)}
                          className="w-full px-4 py-3 text-left hover:bg-[var(--color-warm-bg)] transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-10 rounded bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                            {b.cover_url ? (
                              <img src={b.cover_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-200">
                                <span className="text-[6px] font-bold">N/A</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm leading-tight">{b.title}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{b.author}</p>
                          </div>
                          <span className="font-black text-[var(--color-primary)] text-xs shrink-0">${formatPrice(b.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  {!showCustomItemForm ? (
                    <button
                      onClick={() => setShowCustomItemForm(true)}
                      className="flex items-center gap-1 text-[var(--color-primary)] font-bold text-xs uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                      <Plus className="w-4 h-4" /> Agregar artículo
                    </button>
                  ) : (
                    <div className="p-4 bg-[var(--color-warm-bg)] border border-dashed border-[var(--color-primary)] rounded-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          placeholder="Nombre del artículo..."
                          value={customItemName}
                          onChange={(e) => setCustomItemName(capitalizeWords(e.target.value))}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[var(--color-primary)] text-sm font-bold transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-32">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Precio"
                            value={customItemPrice ? formatPrice(Number(customItemPrice)) : ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setCustomItemPrice(val);
                            }}
                            className="w-full pl-8 pr-3 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[var(--color-primary)] text-sm font-bold transition-all"
                          />
                        </div>
                        <button 
                          onClick={handleAddCustomItem}
                          disabled={!customItemName.trim() || !customItemPrice}
                          className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setShowCustomItemForm(false);
                            setCustomItemName('');
                            setCustomItemPrice('');
                          }}
                          className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-xl transition-colors shrink-0"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[var(--color-warm-surface)]">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Monto Pagado</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-gray-100 border-2 border-transparent focus:border-[var(--color-primary)] rounded-2xl outline-none transition-all font-black text-lg sm:text-xl"
                      value={amountPaid ? formatPrice(amountPaid) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setAmountPaid(Number(val));
                      }}
                    />
                  </div>
                  <button 
                    onClick={() => setAmountPaid(netTotalToPay)}
                    className="mt-2 w-full py-3 sm:py-2 bg-[var(--color-primary)] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Saldar cuenta
                  </button>
                </div>
                <div className="flex justify-center items-center">
                  <div className={`w-full sm:w-auto rounded-2xl p-4 sm:p-3 sm:px-5 flex flex-col justify-center items-center text-white shadow-xl transition-all duration-300 ${
                    amountPaid >= netTotalToPay
                      ? 'bg-emerald-500 shadow-emerald-500/20' 
                      : 'bg-red-500 shadow-red-500/20'
                  }`}>
                    <p className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest opacity-60">Total Venta</p>
                    <p className="text-2xl sm:text-2xl font-black">${formatPrice(netTotalToPay)}</p>
                    {netTotalToPay - amountPaid > 0 && (
                      <p className="text-[10px] sm:text-[9px] font-bold mt-1 bg-white/20 px-3 py-1 sm:px-2 sm:py-0.5 rounded-lg">
                        Falta: ${formatPrice(netTotalToPay - amountPaid)}
                      </p>
                    )}
                    {amountPaid > netTotalToPay && (
                      <p className="text-[10px] sm:text-[9px] font-bold mt-1 bg-white/20 px-3 py-1 sm:px-2 sm:py-0.5 rounded-lg text-emerald-100">
                        A favor: ${formatPrice(amountPaid - netTotalToPay)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-gray-400 bg-white border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalize}
                disabled={isLoading || !amountPaid || amountPaid <= 0 || !clientName.trim()}
                className="flex-[2] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-4 px-6 rounded-2xl font-black text-xl shadow-xl shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
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

      {/* Popup de Confirmación PiggyBank */}
      <AnimatePresence>
        {showOverpayConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOverpayConfirm(false)} className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6"><PiggyBank className="w-10 h-10 text-emerald-500" /></div>
              <h3 className="text-2xl font-black text-[#2D1A1A] mb-3">¿Saldo a Favor?</h3>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">¿Quieres dejar <span className="text-emerald-600 font-black">${formatPrice(amountPaid - netTotalToPay)}</span> como saldo a favor para este cliente?</p>
              <div className="flex flex-col gap-3">
                <button onClick={executeFinalize} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Sí, guardar saldo</button>
                <button onClick={() => setShowOverpayConfirm(false)} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black active:scale-95 transition-all">Corregir monto</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem, UserProfile, SaleItem, SaleRecord } from '../types';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord;
  currentUser: UserProfile;
  onSaleSuccess: () => void;
}

export default function EditSaleModal({ isOpen, onClose, sale, currentUser, onSaleSuccess }: EditSaleModalProps) {
  const [clientName, setClientName] = useState(sale.clientName || '');
  const [clientId, setClientId] = useState<string | null>(sale.clientId || null);
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [items, setItems] = useState<SaleItem[]>(sale.items || []);
  const [amountPaid, setAmountPaid] = useState<number>(sale.amountPaid || 0);
  const [isSearching, setIsSearching] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [bookSuggestions, setBookSuggestions] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientNameError, setClientNameError] = useState(false);
  const [selectedClientDebt, setSelectedClientDebt] = useState<number | null>(null);

  const [isClientSelected, setIsClientSelected] = useState(!!sale.clientId);

  // ESTADOS PARA AGREGAR ARTÍCULO MANUAL
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

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const latestSearch = useRef<string>('');

  useEffect(() => {
    if (!isOpen) {
      setClientNameError(false);
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

  // FUNCIÓN PARA AGREGAR ARTÍCULO MANUAL
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

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: 'PUT',
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
        window.dispatchEvent(new Event('stockUpdated')); // <-- EL GRITO AL GUARDAR EDICIÓN
        onClose();
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (e) {
      alert('Error al actualizar la venta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        onSaleSuccess();
        window.dispatchEvent(new Event('stockUpdated')); // <-- EL GRITO AL ELIMINAR VENTA
        onClose();
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (e) {
      alert('Error al eliminar la venta.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
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
            className="relative w-full max-w-2xl bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 sm:p-8 border-b border-[var(--color-warm-surface)] flex justify-between items-center bg-[var(--color-warm-bg)] shrink-0">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-primary)] leading-tight flex items-center gap-2">
                  <span>Editar Venta</span>
                </h2>
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Carrito de Compras</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-red-50 text-red-400 hover:text-red-500 rounded-full transition-colors shadow-sm">
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8">
              {/* Client Section */}
              <div className="space-y-3 sm:space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Comprador</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <input
                    type="text"
                    className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-gray-100 border-2 rounded-xl sm:rounded-2xl outline-none transition-all font-bold text-sm sm:text-base ${clientNameError ? 'border-red-500' : 'border-transparent focus:border-[var(--color-primary)]'}`}
                    placeholder="Nombre del comprador..."
                    value={clientName}
                    onChange={(e) => {
                      setClientName(capitalizeWords(e.target.value));
                      setClientId(null);
                      if (clientNameError) setClientNameError(false);
                      setSelectedClientDebt(null);
                      setIsClientSelected(false);
                    }}
                  />
                  {clientNameError && <p className="text-red-500 text-[10px] sm:text-xs font-bold mt-1 ml-2 absolute">Debes ingresar un nombre de comprador.</p>}
                  {!isClientSelected && clientName.length > 1 && clientSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-amber-50 border-2 border-amber-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 z-50 shadow-lg">
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
                              if (c.totalDebt) {
                                setSelectedClientDebt(c.totalDebt);
                              }
                              setIsClientSelected(true);
                              setClientSuggestions([]);
                            }}
                            className="w-full px-3 py-2 text-left bg-white hover:bg-amber-100 rounded-lg sm:rounded-xl transition-colors flex items-center justify-between border border-amber-100"
                          >
                            <span className="font-bold text-xs sm:text-sm text-amber-900">{c.name}</span>
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Usar Existente</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3 sm:space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Productos</label>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.bookId} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-[var(--color-warm-surface)] rounded-xl sm:rounded-2xl shadow-sm relative">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1">
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
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-[var(--color-primary)] font-black text-xs">${formatPrice(item.price)}</p>
                            
                            {!item.bookId.startsWith('custom_') && (
                              <span className="text-[8px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                Stock: {item.stock}
                              </span>
                            )}

                            {(item.stock === 0 || item.quantity > item.stock) && !item.bookId.startsWith('custom_') && (
                              <span className="text-[8px] font-black uppercase text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                Sin Stock
                              </span>
                            )}
                          </div>

                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-3 mt-1 sm:mt-0">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 bg-[var(--color-warm-bg)] rounded-lg sm:rounded-xl p-1">
                            <button onClick={() => updateQuantity(item.bookId, -1)} className="p-1 sm:p-1.5 hover:bg-white rounded-md sm:rounded-lg text-gray-400 hover:text-[var(--color-primary)] transition-all">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-black text-xs sm:text-sm w-5 sm:w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.bookId, 1)} className="p-1 sm:p-1.5 hover:bg-white rounded-md sm:rounded-lg text-gray-400 hover:text-[var(--color-primary)] transition-all">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(item.bookId); }} className="p-1.5 sm:p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                        <p className="sm:hidden font-black text-[var(--color-primary)] text-sm">
                          ${formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add More Search */}
                <div className="relative mt-3 sm:mt-4">
                  <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 sm:pl-12 pr-10 py-2.5 sm:py-3 bg-white border border-dashed border-gray-300 rounded-xl sm:rounded-2xl text-xs sm:text-sm outline-none focus:border-[var(--color-primary)] transition-all"
                    placeholder="Buscar por título, autor o categoría..."
                    value={bookSearchTerm}
                    onChange={(e) => handleBookSearch(e.target.value)}
                  />
                  {isSearching ? (
                    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                    </div>
                  ) : bookSearchTerm ? (
                    <button 
                      onClick={() => {
                        setBookSearchTerm('');
                        setBookSuggestions([]);
                      }}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                  {bookSearchTerm.length > 2 && bookSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 py-2 z-50 max-h-48 sm:max-h-60 overflow-y-auto">
                      {bookSuggestions.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => addItem(b)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-[var(--color-warm-bg)] transition-colors flex items-center gap-3"
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
                            <p className="font-bold text-xs sm:text-sm leading-tight">{b.title}</p>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium">{b.author}</p>
                          </div>
                          <span className="font-black text-[var(--color-primary)] text-xs shrink-0">${formatPrice(b.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* NUEVO: Agregar artículo manual */}
                <div className="mt-3 sm:mt-4">
                  {!showCustomItemForm ? (
                    <button
                      onClick={() => setShowCustomItemForm(true)}
                      className="flex items-center gap-1 text-[var(--color-primary)] font-bold text-xs uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                      <Plus className="w-4 h-4" /> Agregar artículo
                    </button>
                  ) : (
                    <div className="p-3 sm:p-4 bg-[var(--color-warm-bg)] border border-dashed border-[var(--color-primary)] rounded-xl sm:rounded-2xl flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          placeholder="Nombre del artículo..."
                          value={customItemName}
                          onChange={(e) => setCustomItemName(capitalizeWords(e.target.value))}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg sm:rounded-xl outline-none focus:border-[var(--color-primary)] text-xs sm:text-sm font-bold transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-32">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Precio"
                            value={customItemPrice ? formatPrice(Number(customItemPrice)) : ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setCustomItemPrice(val);
                            }}
                            className="w-full pl-8 pr-3 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg sm:rounded-xl outline-none focus:border-[var(--color-primary)] text-xs sm:text-sm font-bold transition-all"
                          />
                        </div>
                        <button 
                          onClick={handleAddCustomItem}
                          disabled={!customItemName.trim() || !customItemPrice}
                          className="p-2.5 sm:p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setShowCustomItemForm(false);
                            setCustomItemName('');
                            setCustomItemPrice('');
                          }}
                          className="p-2.5 sm:p-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg sm:rounded-xl transition-colors shrink-0"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-5 sm:pt-6 border-t border-[var(--color-warm-surface)]">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Monto Pagado</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-gray-100 border-2 border-transparent focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-black text-lg sm:text-xl"
                      value={amountPaid ? formatPrice(amountPaid) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setAmountPaid(Number(val));
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setAmountPaid(total + (selectedClientDebt || 0))}
                    className="mt-2 w-full py-3 sm:py-2 bg-[var(--color-primary)] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Pagó todo
                  </button>
                </div>
                <div className="flex justify-center items-center">
                  <div className={`w-full sm:w-auto rounded-xl sm:rounded-2xl p-4 sm:p-3 sm:px-5 flex flex-col justify-center items-center text-white shadow-xl transition-all duration-300 ${
                    amountPaid >= total
                      ? 'bg-emerald-500 shadow-emerald-500/20' 
                      : 'bg-red-500 shadow-red-500/20'
                  }`}>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-80">Total Venta</p>
                    <p className="text-xl sm:text-2xl font-black">${formatPrice(total)}</p>
                    {total - amountPaid > 0 && (
                      <p className="text-[10px] sm:text-[9px] font-bold mt-1 bg-white/20 px-3 py-1 sm:px-2 sm:py-0.5 rounded-lg">
                        Deuda generada: ${formatPrice(total - amountPaid)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] flex gap-3 sm:gap-4 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-sm text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalize}
                disabled={isLoading || !clientName.trim()}
                className="flex-[2] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 sm:gap-3 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-black text-[var(--color-primary)] mb-2">¿Eliminar Venta?</h3>
            <p className="text-gray-500 font-medium mb-6 text-sm sm:text-base">Esta acción restaurará el stock de los libros y ajustará la deuda del cliente. No se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
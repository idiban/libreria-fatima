import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Save, 
  Camera, 
  Upload, 
  Sparkles, 
  Loader2, 
  BookOpen, 
  ChevronUp,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem, UserProfile } from '../types';

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBook: BookItem | null;
  onSave: () => void;
  books: BookItem[];
  currentUser: UserProfile | null;
}

export default function BookModal({ isOpen, onClose, editingBook, onSave, books, currentUser }: BookModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    tomo: '',
    author: '',
    price: 0,
    stock: 0,
    category: '',
    description: '',
    cover_url: '',
    contraportada_url: ''
  });
  const [isScanningFields, setIsScanningFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showAiReminder, setShowAiReminder] = useState(false);
  const [errors, setErrors] = useState({ title: false, author: false, price: false, stock: false, category: false });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [isBackLoading, setIsBackLoading] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const frontCameraRef = useRef<HTMLInputElement>(null);
  const backCameraRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  useEffect(() => {
    if (!isOpen) {
      setErrors({ title: false, author: false, price: false, stock: false, category: false });
      setValidationError(null);
      setIsBackLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.title.length > 3 && !editingBook) {
      const normalizedInput = normalize(formData.title);
      const similar = books.find(b => {
        const normalizedTitle = normalize(b.title);
        return normalizedTitle.includes(normalizedInput) || normalizedInput.includes(normalizedTitle);
      });
      if (similar) {
        setDuplicateWarning(`Aviso: Ya existe un libro similar: "${similar.title}"`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.title, books, editingBook]);

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1200; 
        const MAX_HEIGHT = 1600;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.90));
      };
    });
  };

  const scanWithAI = async () => {
    if (!formData.cover_url && !formData.contraportada_url) return;
    setIsScanningFields(true);
    
    try {
      const response = await fetch('/api/ai/scan-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cover_url: formData.cover_url,
          contraportada_url: formData.contraportada_url
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error del servidor');
      }

      const result = await response.json();
      
      setFormData(prev => ({
        ...prev,
        title: result.title || prev.title,
        author: result.author || prev.author,
        category: result.category || prev.category,
        description: result.description || prev.description
      }));
      setShowAiReminder(true);
    } catch (error: any) {
      console.error('Error in manual scan:', error);
      alert(error.message || 'Error al escanear con IA.');
    } finally {
      setIsScanningFields(false);
    }
  };

  const removeImage = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFormData(prev => ({ ...prev, cover_url: '' }));
    } else {
      setFormData(prev => ({ ...prev, contraportada_url: '' }));
      setIsBackLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (side === 'front') {
          setFormData(prev => ({ ...prev, cover_url: base64 }));
        } else {
          setIsBackLoading(true);
          setFormData(prev => ({ ...prev, contraportada_url: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Limpiamos el input
  };

  useEffect(() => {
    if (editingBook) {
      setFormData({
        title: editingBook.title,
        tomo: editingBook.tomo || '',
        author: editingBook.author,
        price: editingBook.price,
        stock: editingBook.stock,
        category: editingBook.category || '',
        description: editingBook.description || '',
        cover_url: editingBook.cover_url || '',
        contraportada_url: editingBook.contraportada_url || ''
      });
      if (editingBook.contraportada_url) setIsBackLoading(true);
    } else {
      setIsBackLoading(false);
      setFormData({
        title: '',
        tomo: '',
        author: '',
        price: 0,
        stock: 0,
        category: '',
        description: '',
        cover_url: '',
        contraportada_url: ''
      });
    }
  }, [editingBook, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price' || name === 'stock') {
      const sanitizedValue = value.replace(/\D/g, '').replace(/^0+(?!$)/, '');
      const numValue = sanitizedValue === '' ? 0 : parseInt(sanitizedValue, 10);

      setFormData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const adjustPrice = (delta: number) => {
    setFormData(prev => ({ ...prev, price: Math.max(0, prev.price + delta) }));
  };

  const isOwner = currentUser?.role === 'owner';
  const perms = currentUser?.permissions || { canAddBook: true, canEditStock: true, canEditBook: true, canDeleteBook: true };
  const canEditStock = isOwner || perms.canEditStock !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    setValidationError(null);

    const newErrors = {
      title: !formData.title.trim(),
      author: !formData.author.trim(),
      price: !formData.price || formData.price <= 0,
      stock: formData.stock === undefined || formData.stock === null || formData.stock < 0,
      category: !formData.category.trim()
    };
    
    setErrors(newErrors);

    if (newErrors.title || newErrors.author || newErrors.price || newErrors.stock || newErrors.category) {
      setValidationError("Complete los campos en rojo");
      return;
    }

    if (formData.price < 1000 || formData.price >= 100000) {
      setShowPriceConfirm(true);
      return;
    }

    executeSave();
  };

  const executeSave = async () => {
    setIsLoading(true);
    try {
      let finalFormData: any = { ...formData };
      if (formData.cover_url.startsWith('data:')) {
        finalFormData.cover_url = await compressImage(formData.cover_url);
      }
      if (formData.contraportada_url?.startsWith('data:')) {
        finalFormData.contraportada_url = await compressImage(formData.contraportada_url);
      }

      if (editingBook && !canEditStock) {
        delete finalFormData.stock;
      }

      const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';
      const method = editingBook ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalFormData)
      });
      
      if (response.ok) {
        onSave();
        onClose();
      } else {
        if (response.status === 403) {
           alert("Usted no tiene permisos para esa acción");
           setValidationError("Usted no tiene permisos para esa acción");
           return;
        }

        let errorMsg = 'Error al guardar el libro. Por favor intenta de nuevo.';
        try {
          const errorData = await response.json();
          errorMsg = `Error al guardar: ${errorData.error || 'Error desconocido'}`;
        } catch (e) {
          console.error("No se pudo parsear la respuesta JSON del error:", e);
        }
        
        setValidationError(errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Submit error:', error);
      setValidationError('Error de conexión al guardar el libro.');
      alert('Error al guardar el libro. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="main-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full max-h-[98vh] sm:max-h-[90vh]"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-8 border-b border-[var(--color-warm-surface)] flex justify-between items-center bg-[var(--color-warm-bg)] shrink-0">
                  <div>
                    <h2 className="text-xl sm:text-3xl font-black text-[var(--color-primary)]">
                      {editingBook ? 'Editar Libro' : 'Nuevo Libro'}
                    </h2>
                    <p className="text-gray-500 font-medium text-xs sm:text-sm">Completa la información</p>
                  </div>
                  <button type="button" onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                    <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                    {/* Left Column: Images */}
                    <div className="space-y-6 sm:space-y-8">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        
                        {/* PORTADA */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Portada</label>
                          <div className={`aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden group relative ${!formData.cover_url ? 'flex flex-col items-center justify-center gap-3' : ''}`}>
                            {formData.cover_url ? (
                              <img key={formData.cover_url} src={formData.cover_url} alt="" className="w-full h-full object-contain bg-black/5" />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[var(--color-primary)] shadow-sm" onClick={() => frontInputRef.current?.click()}>
                                  <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Subir</p>
                              </div>
                            )}
                          </div>
                          
                          {/* BOTONES PORTADA */}
                          <div className="flex gap-1 w-full mt-1">
                            <button 
                              type="button"
                              onClick={() => frontCameraRef.current?.click()}
                              className="flex-1 py-2 sm:py-2.5 bg-gray-100 rounded-lg sm:rounded-xl text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm flex items-center justify-center"
                            >
                              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => frontInputRef.current?.click()}
                              className="flex-1 py-2 sm:py-2.5 bg-gray-100 rounded-lg sm:rounded-xl text-gray-500 hover:bg-gray-200 transition-all shadow-sm flex items-center justify-center"
                            >
                              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            {formData.cover_url && (
                              <button 
                                type="button"
                                onClick={() => removeImage('front')}
                                className="flex-1 py-2 sm:py-2.5 bg-red-50 rounded-lg sm:rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            )}
                          </div>
                          <input type="file" ref={frontInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} />
                          <input type="file" ref={frontCameraRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'front')} />
                        </div>

                        {/* CONTRAPORTADA */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Contraportada</label>
                          <div className={`aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden group relative ${!formData.contraportada_url ? 'flex flex-col items-center justify-center gap-3' : ''}`}>
                            <AnimatePresence>
                              {isBackLoading && formData.contraportada_url && (
                                <motion.div 
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                  className="absolute inset-0 z-10 bg-gray-100 flex flex-col items-center justify-center gap-2 animate-pulse"
                                >
                                  <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cargando...</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            {formData.contraportada_url ? (
                              <img 
                                key={formData.contraportada_url} 
                                src={formData.contraportada_url} 
                                alt="" 
                                className="w-full h-full object-contain bg-black/5"
                                onLoad={() => setIsBackLoading(false)}
                                onError={() => setIsBackLoading(false)} 
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[var(--color-primary)] shadow-sm" onClick={() => backInputRef.current?.click()}>
                                  <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Subir</p>
                              </div>
                            )}
                          </div>
                          
                          {/* BOTONES CONTRAPORTADA */}
                          <div className="flex gap-1 w-full mt-1">
                            <button 
                              type="button"
                              onClick={() => backCameraRef.current?.click()}
                              className="flex-1 py-2 sm:py-2.5 bg-gray-100 rounded-lg sm:rounded-xl text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm flex items-center justify-center"
                            >
                              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => backInputRef.current?.click()}
                              className="flex-1 py-2 sm:py-2.5 bg-gray-100 rounded-lg sm:rounded-xl text-gray-500 hover:bg-gray-200 transition-all shadow-sm flex items-center justify-center"
                            >
                              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            {formData.contraportada_url && (
                              <button 
                                type="button"
                                onClick={() => removeImage('back')}
                                className="flex-1 py-2 sm:py-2.5 bg-red-50 rounded-lg sm:rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            )}
                          </div>
                          <input type="file" ref={backInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
                          <input type="file" ref={backCameraRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'back')} />
                        </div>

                      </div>

                      {isScanningFields ? (
                        <div className="w-full py-3 sm:py-4 bg-[var(--color-warm-surface)] text-[var(--color-primary)] border-2 border-[var(--color-primary)]/10 rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-3 transition-all text-xs sm:text-base">
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          Escaneando información...
                        </div>
                      ) : (
                        (formData.cover_url || formData.contraportada_url) && (
                          <button
                            type="button"
                            onClick={scanWithAI}
                            className="w-full py-3 sm:py-4 bg-[var(--color-primary)] text-white rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all text-xs sm:text-base"
                          >
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                            Completar automáticamente
                          </button>
                        )
                      )}
                      
                      {showAiReminder && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-[10px] sm:text-xs font-bold flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4 shrink-0" />
                          Recuerda revisar los campos antes de guardar
                        </motion.div>
                      )}
                    </div>

                    {/* Right Column: Fields */}
                    <div className="space-y-4 sm:space-y-6">
                      
                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                        <input
                          type="text"
                          name="title"
                          className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-gray-100 border-2 ${errors.title ? 'border-red-500' : 'border-transparent'} focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-bold text-sm sm:text-base`}
                          value={formData.title}
                          onChange={(e) => {
                            handleInputChange(e);
                            if (errors.title) setErrors(prev => ({ ...prev, title: false }));
                          }}
                        />
                        {duplicateWarning && (
                          <p className="text-[10px] sm:text-xs font-bold text-orange-500 mt-1 animate-pulse leading-tight">
                            <span className="font-black uppercase tracking-widest">Aviso:</span> {duplicateWarning.replace('Aviso: ', '')}
                          </p>
                        )}
                      </div>

                      {/* Campo Adicional debajo del título y mucho más compacto */}
                      <div className="space-y-1.5 w-[60%] sm:w-[200px]">
                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Adicional <span className="text-gray-300 font-medium">(Opc.)</span></label>
                        <input
                          type="text"
                          name="tomo"
                          placeholder="Ej. Tomo 1, Tapa dura"
                          className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 border-2 border-transparent focus:border-[var(--color-primary)] rounded-lg sm:rounded-xl outline-none transition-all font-bold text-xs sm:text-sm"
                          value={formData.tomo}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Autor</label>
                        <input
                          type="text"
                          name="author"
                          className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-gray-100 border-2 ${errors.author ? 'border-red-500' : 'border-transparent'} focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-bold text-sm sm:text-base`}
                          value={formData.author}
                          onChange={(e) => {
                            handleInputChange(e);
                            if (errors.author) setErrors(prev => ({ ...prev, author: false }));
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Precio</label>
                          <div className="relative">
                            <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg sm:text-xl">$</span>
                            <input
                              ref={priceInputRef}
                              type="text"
                              inputMode="numeric"
                              name="price"
                              className={`w-full pl-8 sm:pl-10 pr-10 sm:pr-12 py-3 sm:py-4 bg-gray-100 border-2 ${errors.price ? 'border-red-500' : 'border-transparent'} focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-black text-lg sm:text-xl`}
                              value={formData.price === 0 ? '' : formData.price.toLocaleString('es-CL')}
                              onChange={(e) => {
                                handleInputChange(e);
                                if (errors.price) setErrors(prev => ({ ...prev, price: false }));
                              }}
                            />
                            <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex flex-col">
                              <button type="button" onClick={() => adjustPrice(1000)} className="p-1 sm:p-1 hover:text-[var(--color-primary)]"><ChevronUp className="w-4 h-4" /></button>
                              <button type="button" onClick={() => adjustPrice(-1000)} className="p-1 sm:p-1 hover:text-[var(--color-primary)]"><ChevronDown className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Stock</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            name="stock"
                            disabled={editingBook !== null && !canEditStock}
                            className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-gray-100 border-2 ${errors.stock ? 'border-red-500' : 'border-transparent'} focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-black text-lg sm:text-xl ${(editingBook && !canEditStock) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={formData.stock}
                            onChange={(e) => {
                              handleInputChange(e);
                              if (errors.stock) setErrors(prev => ({ ...prev, stock: false }));
                            }}
                            onClick={(e) => {
                              if (editingBook && !canEditStock) {
                                e.preventDefault();
                                alert("Usted no tiene permisos para esa acción");
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Categoría</label>
                        <input
                          type="text"
                          name="category"
                          className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-gray-100 border-2 ${errors.category ? 'border-red-500' : 'border-transparent'} focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-bold text-sm sm:text-base`}
                          value={formData.category}
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/[0-9]/g, '');
                            handleInputChange(e);
                            if (errors.category) setErrors(prev => ({ ...prev, category: false }));
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Descripción</label>
                        <textarea
                          name="description"
                          rows={3}
                          className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-gray-100 border-2 border-transparent focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-medium text-xs sm:text-sm resize-none"
                          value={formData.description}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-8 bg-[var(--color-warm-bg)] border-t border-[var(--color-warm-surface)] flex flex-col gap-3 sm:gap-4 shrink-0">
                  {validationError && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2"
                    >
                      <X className="w-4 h-4 shrink-0" />
                      {validationError}
                    </motion.div>
                  )}
                  <div className="flex gap-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-gray-400 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm text-sm sm:text-base"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-[2] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-sm sm:text-xl shadow-xl shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 sm:gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <><Save className="w-5 h-5 sm:w-6 sm:h-6" /> Guardar Libro</>}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Precio */}
      <AnimatePresence>
        {showPriceConfirm && (
          <div key="confirm-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPriceConfirm(false)}
              className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 flex flex-col items-center text-center gap-6"
            >
              <div className="w-16 h-16 bg-[var(--color-warm-bg)] rounded-2xl flex items-center justify-center text-[var(--color-primary)]">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-2">¿Confirmar Precio?</h3>
                <p className="text-gray-500 font-medium">
                  Has ingresado un precio de <span className="text-[var(--color-primary)] font-black">${formData.price.toLocaleString('es-CL')}</span>. 
                  ¿Estás seguro que este valor es correcto?
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => {
                    setShowPriceConfirm(false);
                    setTimeout(() => priceInputRef.current?.focus(), 100);
                  }}
                  className="flex-1 py-4 bg-gray-100 rounded-xl font-black text-gray-400 hover:bg-gray-200 transition-all"
                >
                  Corregir
                </button>
                <button
                  onClick={() => {
                    setShowPriceConfirm(false);
                    executeSave();
                  }}
                  className="flex-1 py-4 bg-[var(--color-primary)] text-white rounded-xl font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20"
                >
                  Sí, es correcto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
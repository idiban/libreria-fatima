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
  Trash2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { BookItem } from '../types';

// --- NUEVA FUNCIÓN UTILITARIA PARA EL RECORTADOR (react-image-crop) ---
const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): string => {
  const canvas = document.createElement('canvas');
  // Calculamos la escala real por si la imagen se está mostrando más pequeña en pantalla
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
};
// ------------------------------------------------

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBook: BookItem | null;
  onSave: () => void;
  books: BookItem[];
}

export default function BookModal({ isOpen, onClose, editingBook, onSave, books }: BookModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    price: 0,
    stock: 0,
    category: '',
    description: '',
    cover_url: '',
    contraportada_url: ''
  });
  const [isScanningFields, setIsScanningFields] = useState(false);
  const [isRefiningFront, setIsRefiningFront] = useState(false);
  const [isRefiningBack, setIsRefiningBack] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showAiReminder, setShowAiReminder] = useState(false);
  const [errors, setErrors] = useState({ title: false, author: false, price: false, stock: false, category: false });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);

  // --- NUEVOS ESTADOS DEL RECORTADOR (react-image-crop) ---
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [currentCropSide, setCurrentCropSide] = useState<'front' | 'back' | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // --------------------------------------------------------
  
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

        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 800;

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
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const refineImage = async (base64: string, side: 'front' | 'back') => {
    if (side === 'front') setIsRefiningFront(true);
    else setIsRefiningBack(true);

    try {
      const response = await fetch('/api/ai/refine-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, side })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error del servidor');
      }

      const data = await response.json();
      
      if (side === 'front') {
        setFormData(prev => ({ ...prev, cover_url: data.image }));
      } else {
        setFormData(prev => ({ ...prev, contraportada_url: data.image }));
      }
    } catch (error: any) {
      console.error('Error refining image:', error);
      alert(error.message || 'Error al refinar la imagen con IA.');
    } finally {
      if (side === 'front') setIsRefiningFront(false);
      else setIsRefiningBack(false);
    }
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
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setCurrentCropSide(side);
        setShowCropper(true);
        // Reseteamos el recorte inicial
        setCrop({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
        setCompletedCrop(null);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Limpiamos el input
  };

  const handleSaveCrop = async () => {
    if (!imgRef.current || !currentCropSide) return;

    let cropToUse = completedCrop;
    
    // Si el usuario le da a "Listo" sin tocar nada, usamos el área seleccionada por defecto
    if (!cropToUse || cropToUse.width === 0 || cropToUse.height === 0) {
      const { width, height } = imgRef.current;
      cropToUse = {
        unit: 'px',
        x: width * 0.1,
        y: height * 0.1,
        width: width * 0.8,
        height: height * 0.8
      };
    }

    try {
      const croppedBase64 = getCroppedImg(imgRef.current, cropToUse);
      const compressedBase64 = await compressImage(croppedBase64);
      
      if (currentCropSide === 'front') {
        setFormData(prev => ({ ...prev, cover_url: compressedBase64 }));
      } else {
        setFormData(prev => ({ ...prev, contraportada_url: compressedBase64 }));
      }
      
      setShowCropper(false);
      setTempImage(null);
      setCurrentCropSide(null);
      
    } catch (e) {
      console.error(e);
      alert("Hubo un error al procesar el recorte de la imagen.");
    }
  };

  useEffect(() => {
    if (editingBook) {
      setFormData({
        title: editingBook.title,
        author: editingBook.author,
        price: editingBook.price,
        stock: editingBook.stock,
        category: editingBook.category || '',
        description: editingBook.description || '',
        cover_url: editingBook.cover_url || '',
        contraportada_url: editingBook.contraportada_url || ''
      });
    } else {
      setFormData({
        title: '',
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
      const sanitizedValue = value.replace(/^0+(?!$)/, '');
      const numValue = sanitizedValue === '' ? 0 : parseInt(sanitizedValue, 10);
      
      if (e.target instanceof HTMLInputElement) {
        e.target.value = sanitizedValue || '0';
      }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    setValidationError(null);

    const newErrors = {
      title: !formData.title.trim(),
      author: !formData.author.trim(),
      price: !formData.price || formData.price <= 0,
      stock: formData.stock === undefined || formData.stock === null || formData.stock <= 0,
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
      let finalFormData = { ...formData };
      if (formData.cover_url.startsWith('data:')) {
        finalFormData.cover_url = await compressImage(formData.cover_url);
      }
      if (formData.contraportada_url?.startsWith('data:')) {
        finalFormData.contraportada_url = await compressImage(formData.contraportada_url);
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
        const errorData = await response.json();
        const errorMsg = `Error al guardar: ${errorData.error || 'Error desconocido'}`;
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
                        <div className="space-y-3">
                          <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Portada</label>
                          <div className={`aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden group relative ${!formData.cover_url ? 'flex flex-col items-center justify-center gap-3' : ''}`}>
                            {formData.cover_url ? (
                              <>
                                <img src={formData.cover_url} alt="" className="w-full h-full object-cover bg-black/5" />
                                {isRefiningFront && (
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Ajustando...</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[var(--color-primary)] shadow-sm" onClick={() => frontInputRef.current?.click()}>
                                  <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Subir</p>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 right-2 flex gap-1 z-10">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); frontCameraRef.current?.click(); }}
                                className="flex-1 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm flex items-center justify-center"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); frontInputRef.current?.click(); }}
                                className="flex-1 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl text-gray-400 hover:bg-gray-100 transition-all shadow-sm flex items-center justify-center"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                              {formData.cover_url && (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeImage('front'); }}
                                  className="flex-1 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <input type="file" ref={frontInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} />
                          <input type="file" ref={frontCameraRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'front')} />
                          
                          {/* BOTÓN ALARGADO - PORTADA */}
                          {formData.cover_url && (
                            <button
                              type="button"
                              onClick={() => refineImage(formData.cover_url, 'front')}
                              disabled={isRefiningFront}
                              className="w-full py-2 px-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-50"
                            >
                              <Sparkles className="w-4 h-4" />
                              {isRefiningFront ? 'Procesando...' : 'Arreglar imagen'}
                            </button>
                          )}
                        </div>

                        {/* CONTRAPORTADA */}
                        <div className="space-y-3">
                          <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Contraportada</label>
                          <div className={`aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden group relative ${!formData.contraportada_url ? 'flex flex-col items-center justify-center gap-3' : ''}`}>
                            {formData.contraportada_url ? (
                              <>
                                <img src={formData.contraportada_url} alt="" className="w-full h-full object-cover bg-black/5" />
                                {isRefiningBack && (
                                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20">
                                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Ajustando...</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[var(--color-primary)] shadow-sm" onClick={() => backInputRef.current?.click()}>
                                  <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Subir</p>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 right-2 flex gap-1 z-10">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); backCameraRef.current?.click(); }}
                                className="flex-1 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm flex items-center justify-center"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); backInputRef.current?.click(); }}
                                className="flex-1 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl text-gray-400 hover:bg-gray-100 transition-all shadow-sm flex items-center justify-center"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                              {formData.contraportada_url && (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeImage('back'); }}
                                  className="flex-1 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <input type="file" ref={backInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
                          <input type="file" ref={backCameraRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, 'back')} />
                          
                          {/* BOTÓN ALARGADO - CONTRAPORTADA */}
                          {formData.contraportada_url && (
                            <button
                              type="button"
                              onClick={() => refineImage(formData.contraportada_url, 'back')}
                              disabled={isRefiningBack}
                              className="w-full py-2 px-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-50"
                            >
                              <Sparkles className="w-4 h-4" />
                              {isRefiningBack ? 'Procesando...' : 'Arreglar imagen'}
                            </button>
                          )}
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
                            e.target.value = e.target.value.replace(/[0-9]/g, '');
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
                            <input
                              ref={priceInputRef}
                              type="number"
                              name="price"
                              className={`w-full pl-4 sm:pl-5 pr-10 sm:pr-12 py-3 sm:py-4 bg-gray-100 border-2 ${errors.price ? 'border-red-500' : 'border-transparent'} focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-black text-lg sm:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              value={formData.price}
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
                            type="number"
                            name="stock"
                            className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-gray-100 border-2 ${errors.stock ? 'border-red-500' : 'border-transparent'} focus:border-[var(--color-primary)] rounded-xl sm:rounded-2xl outline-none transition-all font-black text-lg sm:text-xl`}
                            value={formData.stock}
                            onChange={(e) => {
                              handleInputChange(e);
                              if (errors.stock) setErrors(prev => ({ ...prev, stock: false }));
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

      {/* --- NUEVO MODAL DEL RECORTADOR (react-image-crop) --- */}
      <AnimatePresence>
        {showCropper && tempImage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full h-full sm:h-[90vh] sm:max-w-2xl bg-[#111] sm:rounded-[2rem] overflow-hidden flex flex-col"
            >
              {/* Header del Cropper */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center text-white">
                <button 
                  onClick={() => { setShowCropper(false); setTempImage(null); }}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <span className="font-bold text-sm uppercase tracking-widest text-white/80">Ajusta los bordes</span>
                <button 
                  onClick={handleSaveCrop}
                  className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors text-white rounded-full font-bold flex items-center gap-2 shadow-lg"
                >
                  <Check className="w-5 h-5" /> Listo
                </button>
              </div>

              {/* Área de la imagen dinámica */}
              <div className="flex-1 w-full overflow-hidden flex items-center justify-center p-4 pt-20 pb-20">
                <div className="flex justify-center items-center max-h-full max-w-full">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                  >
                    <img
                      ref={imgRef}
                      src={tempImage}
                      alt="Encuadre"
                      className="max-h-[70vh] w-auto border-2 border-white/5 rounded-md shadow-2xl"
                      style={{ display: 'block' }}
                    />
                  </ReactCrop>
                </div>
              </div>

              {/* Instrucción inferior visual */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                <p className="text-white/60 text-center text-xs sm:text-sm font-medium">
                  Arrastra las esquinas del recuadro para que encajen justo con el libro
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ----------------------------------------------------- */}

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
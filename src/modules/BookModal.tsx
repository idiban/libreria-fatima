import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Save, 
  Camera, 
  Upload, 
  Sparkles, 
  Loader2, 
  BookOpen, 
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

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

        // Max dimensions to keep it under 1MB while maintaining quality
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
        
        // Compress to jpeg with 0.8 quality
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const refineImage = async (base64: string, side: 'front' | 'back') => {
    if (side === 'front') setIsRefiningFront(true);
    else setIsRefiningBack(true);

    const callAI = async (retryCount = 0): Promise<any> => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "") {
        throw new Error("API Key no configurada. Por favor, asegúrate de configurar GEMINI_API_KEY en los secretos del panel lateral.");
      }

      const promptText = `RECORTE Y ENDEREZADO PROFESIONAL TOTAL: Detecta la ${side === 'front' ? 'portada' : 'contraportada'} del libro en la imagen. Corrige la perspectiva para que se vea perfectamente recta, plana y rectangular (vista de escaneo). REGLA OBLIGATORIA: Amplía la ${side === 'front' ? 'portada' : 'contraportada'} al máximo posible de forma que ocupe el 100% exacto de la imagen, de borde a borde. Prohibido dejar márgenes gruesos alrededor. ELIMINA ABSOLUTAMENTE TODO EL FONDO ORIGINAL: baldosas, suelo, piso, sombras, manos, dedos, muebles, madera, paredes o cualquier objeto externo. REGLA CRÍTICA DE BORDES: Si al enderezar o rotar quedan espacios vacíos o triangulares en las esquinas del encuadre rectangular final, rellena esos espacios vacíos ÚNICAMENTE con un color sólido y uniforme BLANCO GRISÁCEO CLARO (hex #F0F0F0). Devuelve la imagen perfectamente rectangular, rellenando todo el encuadre de forma gigante.`;

      try {
        const ai = new GoogleGenAI({ apiKey });
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64.split(',')[1],
                  mimeType: "image/jpeg",
                },
              },
              {
                text: promptText,
              },
            ],
          },
        });
      } catch (error: any) {
        if (error?.message?.includes('429') && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return callAI(retryCount + 1);
        }
        throw error;
      }
    };

    try {
      const response = await callAI();

      let newImage = base64;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          newImage = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (side === 'front') {
        setFormData(prev => ({ ...prev, cover_url: newImage }));
      } else {
        setFormData(prev => ({ ...prev, contraportada_url: newImage }));
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
    
    const categoriasPermitidas = [
      "Espiritualidad", 
      "Filosofía", 
      "Crisis de la Iglesia", 
      "Historia", 
      "Vidas de Santos", 
    ];
    
    const callAI = async (retryCount = 0): Promise<any> => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "") {
        throw new Error("API Key no configurada. Por favor, asegúrate de configurar GEMINI_API_KEY en los secretos del panel lateral.");
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptInstruction = `Analiza estas imágenes de un libro (portada y/o contraportada). Extrae el título, autor, categoría y descripción completa. 
        IMPORTANTE: 
        1) En el campo 'title' pon ÚNICAMENTE el título principal del libro, ignora subtítulos or textos secundarios largos. 
        2) Tanto el título como el autor deben usar mayúsculas y minúsculas correctamente (formato de nombre propio), NUNCA todo en mayúsculas. 
        3) OBLIGATORIO: Para la 'category', DEBES elegir ESTRICTAMENTE una de esta lista: ${categoriasPermitidas.join(', ')}. Si el libro no encaja perfecto, elige la más cercana.
        Responde estrictamente en JSON.`;

        const parts: any[] = [{ text: promptInstruction }];
        
        if (formData.cover_url) {
          parts.push({ inlineData: { mimeType: "image/jpeg", data: formData.cover_url.split(',')[1] } });
        }
        if (formData.contraportada_url) {
          parts.push({ inlineData: { mimeType: "image/jpeg", data: formData.contraportada_url.split(',')[1] } });
        }

        return await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [{ parts }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                // 👇 3. NUEVO: Le forzamos el 'enum' al esquema para que no invente palabras
                category: { 
                  type: Type.STRING,
                  enum: categoriasPermitidas
                },
                description: { type: Type.STRING }
              },
              required: ["title", "author", "category", "description"]
            }
          }
        });
      } catch (error: any) {
        if (error?.message?.includes('429') && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return callAI(retryCount + 1);
        }
        throw error;
      }
    };

    try {
      const response = await callAI();
      const result = JSON.parse(response.text || "{}");
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
      reader.onloadend = async () => {
        let base64String = reader.result as string;
        
        // Compress first to ensure it fits and is easier for AI to process
        base64String = await compressImage(base64String);
        
        if (side === 'front') {
          setFormData(prev => ({ ...prev, cover_url: base64String }));
        } else {
          setFormData(prev => ({ ...prev, contraportada_url: base64String }));
        }
        // Start refining immediately and in parallel
        refineImage(base64String, side);
      };
      reader.readAsDataURL(file);
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
      // Remove leading zeros and parse as integer
      const sanitizedValue = value.replace(/^0+(?!$)/, '');
      const numValue = sanitizedValue === '' ? 0 : parseInt(sanitizedValue, 10);
      
      // Force the input value to match the sanitized version to prevent "01" display
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

    // Validation
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
      // Compress images before sending if they are base64
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
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
              {/* Header - MODIFICACIÓN: Paddings y textos más compactos en móvil */}
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

              {/* Content - MODIFICACIÓN: Paddings reducidos en móvil y espacios entre campos más pequeños */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
                  {/* Left Column: Images */}
                  <div className="space-y-6 sm:space-y-8">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-3">
                        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Portada</label>
                        <div 
                          className="aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-warm-surface)] transition-all overflow-hidden group relative"
                        >
                          {formData.cover_url ? (
                            <>
                              <img src={formData.cover_url} alt="" className="w-full h-full object-cover bg-black/5" />
                              {isRefiningFront && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Ajustando...</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2" onClick={() => frontInputRef.current?.click()}>
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[var(--color-primary)] shadow-sm">
                                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                              </div>
                              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Subir</p>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
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
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Contraportada</label>
                        <div 
                          className="aspect-[3/4] bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-warm-surface)] transition-all overflow-hidden group relative"
                        >
                          {formData.contraportada_url ? (
                            <>
                              <img src={formData.contraportada_url} alt="" className="w-full h-full object-cover bg-black/5" />
                              {isRefiningBack && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" />
                                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Ajustando...</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2" onClick={() => backInputRef.current?.click()}>
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[var(--color-primary)] shadow-sm">
                                <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                              </div>
                              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Subir</p>
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
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
                        className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 text-[10px] sm:text-xs font-bold flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 shrink-0" />
                        Recuerda revisar los campos antes de guardar
                      </motion.div>
                    )}
                  </div>

                  {/* Right Column: Fields - MODIFICACIÓN: Inputs más pequeños en móvil */}
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

              {/* Footer - MODIFICACIÓN: Paddings reducidos y botones más pequeños en móvil */}
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

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showPriceConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
    </AnimatePresence>
  );
}
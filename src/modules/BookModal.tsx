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
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBook: BookItem | null;
  onSave: () => void;
}

export default function BookModal({ isOpen, onClose, editingBook, onSave }: BookModalProps) {
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
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

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
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value
    }));
  };

  const adjustPrice = (delta: number) => {
    setFormData(prev => ({ ...prev, price: Math.max(0, prev.price + delta) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (side === 'front') {
          setFrontImage(base64String);
          setFormData(prev => ({ ...prev, cover_url: base64String }));
        } else {
          setBackImage(base64String);
          setFormData(prev => ({ ...prev, contraportada_url: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const scanWithAI = async () => {
    if (!formData.cover_url && !formData.contraportada_url) return;
    setIsScanning(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as string) });
      const parts: any[] = [{ text: "Analiza estas imágenes de un libro. Extrae el título, autor, categoría y descripción completa. Responde estrictamente en JSON." }];
      
      if (formData.cover_url.startsWith('data:')) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: formData.cover_url.split(',')[1] } });
      }
      if (formData.contraportada_url?.startsWith('data:')) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: formData.contraportada_url.split(',')[1] } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "author", "category", "description"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setFormData(prev => ({ ...prev, ...result }));
    } catch (error) {
      alert('Error al escanear con IA.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';
      const method = editingBook ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      alert('Error al guardar el libro.');
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
            onClick={onClose}
            className="absolute inset-0 bg-[#2D1A1A]/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Header */}
              <div className="p-8 border-b border-[#FDF2F0] flex justify-between items-center bg-[#FFF9F5]">
                <div>
                  <h2 className="text-3xl font-black text-[#2D1A1A]">
                    {editingBook ? 'Editar Libro' : 'Nuevo Libro'}
                  </h2>
                  <p className="text-gray-500 font-medium">Completa la información</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column: Images */}
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Portada</label>
                        <div 
                          onClick={() => frontInputRef.current?.click()}
                          className="aspect-[3/4] bg-[#FFF9F5] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#B23B23] hover:bg-[#FDF2F0] transition-all overflow-hidden group"
                        >
                          {formData.cover_url ? (
                            <img src={formData.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[#B23B23] shadow-sm">
                                <Camera className="w-6 h-6" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subir Imagen</p>
                            </>
                          )}
                        </div>
                        <input type="file" ref={frontInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Contraportada</label>
                        <div 
                          onClick={() => backInputRef.current?.click()}
                          className="aspect-[3/4] bg-[#FFF9F5] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#B23B23] hover:bg-[#FDF2F0] transition-all overflow-hidden group"
                        >
                          {formData.contraportada_url ? (
                            <img src={formData.contraportada_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-gray-300 group-hover:text-[#B23B23] shadow-sm">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subir Imagen</p>
                            </>
                          )}
                        </div>
                        <input type="file" ref={backInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={scanWithAI}
                      disabled={isScanning || (!formData.cover_url && !formData.contraportada_url)}
                      className="w-full py-4 bg-[#2D1A1A] text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50"
                    >
                      {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-orange-400" />}
                      Completar campos automáticamente
                    </button>
                  </div>

                  {/* Right Column: Fields */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Título</label>
                      <input
                        type="text"
                        name="title"
                        required
                        className="w-full px-5 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-bold"
                        value={formData.title}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Autor</label>
                      <input
                        type="text"
                        name="author"
                        required
                        className="w-full px-5 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-bold"
                        value={formData.author}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Precio</label>
                        <div className="relative">
                          <input
                            type="number"
                            name="price"
                            required
                            className="w-full pl-5 pr-12 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-black text-xl"
                            value={formData.price}
                            onChange={handleInputChange}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                            <button type="button" onClick={() => adjustPrice(1000)} className="p-1 hover:text-[#B23B23]"><ChevronUp className="w-4 h-4" /></button>
                            <button type="button" onClick={() => adjustPrice(-1000)} className="p-1 hover:text-[#B23B23]"><ChevronDown className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Stock</label>
                        <input
                          type="number"
                          name="stock"
                          required
                          className="w-full px-5 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-black text-xl"
                          value={formData.stock}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Categoría</label>
                      <input
                        type="text"
                        name="category"
                        className="w-full px-5 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-bold"
                        value={formData.category}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Descripción</label>
                      <textarea
                        name="description"
                        rows={4}
                        className="w-full px-5 py-4 bg-[#FFF9F5] border-2 border-transparent focus:border-[#B23B23] rounded-2xl outline-none transition-all font-medium text-sm resize-none"
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-[#FFF9F5] border-t border-[#FDF2F0] flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 px-6 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-[#B23B23] hover:bg-[#962D1A] text-white py-4 px-6 rounded-2xl font-black text-xl shadow-xl shadow-[#B23B23]/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> Guardar Libro</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

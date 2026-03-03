import React, { useState, MouseEvent } from 'react';
import { ChevronLeft, BookOpen, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { BookItem, UserProfile } from '../types';

interface BookDetailProps {
  book: BookItem;
  onBack: () => void;
  currentUser: UserProfile | null;
  onSaleClick: (book: BookItem) => void;
}

export default function BookDetail({ book, onBack, currentUser, onSaleClick }: BookDetailProps) {
  const [activeImage, setActiveImage] = useState<'cover' | 'back'>('cover');

  // --- LÓGICA DEL ZOOM INTERNO ---
  const [showZoom, setShowZoom] = useState(false);
  const [zoomRatio, setZoomRatio] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    // Obtenemos las dimensiones y posición del contenedor en la pantalla
    const { top, left, width, height } = e.currentTarget.getBoundingClientRect();
    
    // Calculamos la posición exacta del mouse dentro del contenedor
    const x = e.clientX - left;
    const y = e.clientY - top;

    // Lo convertimos a porcentaje (0% a 100%)
    const xPercent = Math.max(0, Math.min(100, (x / width) * 100));
    const yPercent = Math.max(0, Math.min(100, (y / height) * 100));

    setZoomRatio({ x: xPercent, y: yPercent });
  };
  // -------------------------------

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const currentImageUrl = activeImage === 'cover' ? book.cover_url : book.contraportada_url;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-full flex flex-col"
    >
      {/* Botón Volver fijo arriba a la izquierda */}
      <div className="sticky top-0 z-30 bg-[var(--color-warm-bg)]/80 backdrop-blur-md py-4 px-6 sm:px-10 flex items-center shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white text-gray-600 border border-[var(--color-warm-surface)] px-4 py-2.5 rounded-2xl font-black shadow-sm hover:ring-2 hover:ring-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all group text-sm"
        >
          <ChevronLeft className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
          <span>Volver al Catálogo</span>
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 lg:p-10">
        <div className="max-w-6xl mx-auto flex flex-col bg-white rounded-[3rem] p-6 sm:p-8 lg:p-12 shadow-xl border border-[#FDF2F0]">
          
          <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
            
            {/* Sección de Imagen (Izquierda) */}
            <div className="w-full md:w-[260px] lg:w-[280px] shrink-0 space-y-4 flex flex-col items-center mx-auto md:mx-0">
              
              {/* Contenedor Principal de la Imagen */}
              <div 
                className="aspect-[3/4] w-full max-w-[200px] md:max-w-full rounded-[2rem] overflow-hidden bg-gray-50 shadow-inner relative cursor-crosshair"
                onMouseEnter={() => {
                  // Solo activamos el zoom si el dispositivo usa mouse (no táctil)
                  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                    currentImageUrl && setShowZoom(true);
                  }
                }}
                onMouseLeave={() => setShowZoom(false)}
                onMouseMove={handleMouseMove}
              >
                {/* Imagen Base */}
                {activeImage === 'cover' ? (
                  book.cover_url ? (
                    <img 
                      src={book.cover_url} 
                      alt={book.title} 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <BookOpen className="w-32 h-32" />
                    </div>
                  )
                ) : (
                  <img 
                    src={book.contraportada_url} 
                    alt="Contraportada" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* ZOOM: Capa superpuesta que cubre TODO el recuadro */}
                {showZoom && currentImageUrl && (
                  <div
                    className="absolute inset-0 z-10 bg-white"
                    style={{
                      backgroundImage: `url(${currentImageUrl})`,
                      backgroundSize: '250%',
                      backgroundPosition: `${zoomRatio.x}% ${zoomRatio.y}%`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
              </div>
              
              {/* Miniaturas */}
              {book.contraportada_url && (
                <div className="flex gap-3 justify-center mt-2">
                  <button 
                    onClick={() => setActiveImage('cover')}
                    className={`w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === 'cover' ? 'border-[var(--color-primary)] opacity-100 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="Portada miniatura" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveImage('back')}
                    className={`w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === 'back' ? 'border-[var(--color-primary)] opacity-100 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={book.contraportada_url} alt="Contraportada miniatura" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </button>
                </div>
              )}
            </div>

            {/* Sección de Info Principal y Descripción (Derecha) */}
            <div className="flex-1 w-full flex flex-col">
              
              <div className="mb-2">
                {book.category && (
                  <span className="inline-block px-4 py-1.5 bg-emerald-50 rounded-full text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">
                    {book.category}
                  </span>
                )}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2D1A1A] leading-tight mb-3 sm:mb-4">{book.title}</h1>
                <p className="text-lg text-gray-400 font-bold mb-4">{book.author}</p>
                
                <div className="flex items-center gap-6">
                  <p className="text-4xl sm:text-5xl font-black text-[var(--color-primary)]">${formatPrice(book.price)}</p>
                </div>

                {currentUser && (
                  <div className="mt-6 max-w-sm">
                    <button
                      onClick={() => onSaleClick(book)}
                      disabled={book.stock <= 0}
                      className="w-full bg-[#B23B23] hover:bg-[#962D1A] text-white py-4 sm:py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-[#B23B23]/30 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-6 h-6" />
                      Vender este libro
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full pt-4 border-t border-[#FDF2F0]">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Descripción</h3>
                <p className="text-gray-600 leading-relaxed text-base sm:text-lg whitespace-pre-line">
                  {book.description || 'Sin descripción disponible.'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
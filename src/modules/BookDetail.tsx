import React from 'react';
import { ChevronLeft, BookOpen, ShoppingCart, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { BookItem, UserProfile } from '../types';

interface BookDetailProps {
  book: BookItem;
  onBack: () => void;
  currentUser: UserProfile | null;
  onSaleClick: (book: BookItem) => void;
}

export default function BookDetail({ book, onBack, currentUser, onSaleClick }: BookDetailProps) {
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-full flex flex-col"
    >
      <div className="sticky top-0 z-30 bg-[var(--color-warm-bg)]/80 backdrop-blur-md py-4 px-6 sm:px-10 flex items-center shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-[var(--color-primary)] transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Volver al catálogo</span>
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 lg:p-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 bg-white rounded-[3rem] p-6 sm:p-8 shadow-xl border border-[#FDF2F0]">
        {/* Images Section */}
        <div className="space-y-6">
          <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-50 shadow-inner md:w-3/4 lg:w-2/3 mx-auto">
            {book.cover_url ? (
              <img 
                src={book.cover_url} 
                alt={book.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200">
                <BookOpen className="w-32 h-32" />
              </div>
            )}
          </div>
          
          {book.contraportada_url && (
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-50 shadow-inner md:w-3/4 lg:w-2/3 mx-auto">
              <img 
                src={book.contraportada_url} 
                alt="Contraportada" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex flex-col">
          <div className="mb-8">
            {book.category && (
              <span className="inline-block px-4 py-1.5 bg-emerald-50 rounded-full text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">
                {book.category}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-black text-[#2D1A1A] leading-tight mb-3 sm:mb-4">{book.title}</h1>
            <p className="text-lg text-gray-400 font-bold mb-4 sm:mb-6">{book.author}</p>
            
            <div className="flex items-center gap-6 mb-8">
              <p className="text-4xl sm:text-5xl font-black text-[var(--color-primary)]">${formatPrice(book.price)}</p>
            </div>
          </div>

          <div className="flex-1 space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Descripción</h3>
              <p className="text-gray-600 leading-relaxed text-base sm:text-lg whitespace-pre-line">
                {book.description || 'Sin descripción disponible.'}
              </p>
            </div>
          </div>

          {currentUser && (
            <div className="mt-12 pt-8 border-t border-[#FDF2F0]">
              <button
                onClick={() => onSaleClick(book)}
                disabled={book.stock <= 0}
                className="w-full bg-[#B23B23] hover:bg-[#962D1A] text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-[#B23B23]/30 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-8 h-8" />
                Vender este libro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </motion.div>
  );
}
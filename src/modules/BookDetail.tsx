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
      className="max-w-5xl mx-auto"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-[#B23B23] transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold">Volver al catálogo</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white rounded-[3rem] p-8 sm:p-12 shadow-xl border border-[#FDF2F0]">
        {/* Images Section */}
        <div className="space-y-6">
          <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-50 shadow-inner">
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
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-50 shadow-inner opacity-80 hover:opacity-100 transition-opacity">
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
              <span className="inline-block px-4 py-1.5 bg-[#FDF2F0] rounded-full text-xs font-black uppercase tracking-widest text-[#B23B23] mb-4">
                {book.category}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl font-black text-[#2D1A1A] leading-tight mb-4">{book.title}</h1>
            <p className="text-xl text-gray-400 font-bold mb-6">{book.author}</p>
            
            <div className="flex items-center gap-6 mb-8">
              <p className="text-5xl font-black text-[#B23B23]">${formatPrice(book.price)}</p>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${book.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="font-black text-sm uppercase tracking-widest text-gray-400">
                    {book.stock > 0 ? 'En Stock' : 'Agotado'}
                  </span>
                </div>
                <p className="text-xs font-bold text-gray-400 mt-1">{book.stock} unidades disponibles</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Descripción</h3>
              <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
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
    </motion.div>
  );
}

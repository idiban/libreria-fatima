import React from 'react';
import { BookOpen, Edit2, ShoppingCart, Plus, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { BookItem, UserProfile } from '../types';

interface CatalogProps {
  books: BookItem[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  currentUser: UserProfile | null;
  onEditBook: (book: BookItem) => void;
  onAddBook: () => void;
  onSaleClick: (book: BookItem) => void;
  onBookClick: (book: BookItem) => void;
}

export default function Catalog({
  books,
  loading,
  searchTerm,
  setSearchTerm,
  currentUser,
  onEditBook,
  onAddBook,
  onSaleClick,
  onBookClick
}: CatalogProps) {
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  };

  const filteredBooks = books.filter(book => {
    const term = normalizeText(searchTerm);
    return normalizeText(book.title).includes(term) || 
           normalizeText(book.author).includes(term) ||
           normalizeText(book.category).includes(term);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">
            {currentUser ? 'Venta de Libros' : 'Nuestro Catálogo'}
          </h2>
          <p className="text-gray-500 font-medium">
            {currentUser ? 'Selecciona un libro para venderlo' : 'Explora nuestra selección de libros disponibles.'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, autor o categoría..."
              className="pl-12 pr-10 py-3 bg-white border border-[var(--color-warm-surface)] rounded-2xl text-sm w-full md:w-80 focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {currentUser && (
            <button
              onClick={onAddBook}
              className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Añadir Libro</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        {loading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={`loading-skeleton-${i}`} className="bg-white rounded-[2rem] p-4 animate-pulse">
              <div className="aspect-[3/4] bg-gray-100 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded-full w-1/2" />
            </div>
          ))
        ) : filteredBooks.map((book, index) => (
          <motion.div
            layout
            key={book.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-3 sm:p-4 shadow-sm hover:shadow-xl transition-all group relative border border-transparent hover:border-gray-100 cursor-pointer"
            onClick={() => {
              if (currentUser) {
                onSaleClick(book);
              } else {
                onBookClick(book);
              }
            }}
          >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-4 bg-gray-50 relative">
              {book.cover_url ? (
                <img 
                  src={book.cover_url} 
                  alt={book.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <BookOpen className="w-12 h-12" />
                </div>
              )}

            </div>
            
            <div className="space-y-1 mb-4">
              <h3 className="text-sm sm:text-base font-bold leading-tight group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 text-[var(--color-primary)]">{book.title}</h3>
              <p className="text-gray-400 font-medium text-[10px] sm:text-xs truncate">{book.author}</p>
              <div className="flex flex-col mt-2">
                <p className="text-[var(--color-primary)] font-black text-sm sm:text-lg">${formatPrice(book.price)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {book.category && (
                    <span className="px-2 py-0.5 bg-[var(--color-warm-surface)] rounded-full text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)]">
                      {book.category}
                    </span>
                  )}
                  {currentUser && (
                    <span className={`text-[10px] font-bold ${book.stock === 0 ? 'text-red-500' : book.stock <= 3 ? 'text-orange-500' : 'text-emerald-500'}`}>
                      Stock: {book.stock}
                    </span>
                  )}
                </div>
              </div>
            </div>


          </motion.div>
        ))}
      </div>
    </div>
  );
}

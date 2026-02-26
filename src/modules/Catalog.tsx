import React from 'react';
import { BookOpen, Edit2, ShoppingCart, Plus, Search } from 'lucide-react';
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

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Nuestro Catálogo</h2>
          <p className="text-gray-500 font-medium">Explora nuestra selección de libros disponibles.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título o autor..."
              className="pl-12 pr-6 py-3 bg-white border border-[#FDF2F0] rounded-2xl text-sm w-full md:w-80 focus:ring-2 focus:ring-[#B23B23] transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {currentUser && (
            <button
              onClick={onAddBook}
              className="bg-[#B23B23] text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-[#B23B23]/20 hover:scale-105 transition-all shrink-0"
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
            <div key={i} className="bg-white rounded-[2rem] p-4 animate-pulse">
              <div className="aspect-[3/4] bg-gray-100 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded-full w-1/2" />
            </div>
          ))
        ) : filteredBooks.map((book) => (
          <motion.div
            layout
            key={book.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-3 sm:p-4 shadow-sm hover:shadow-xl transition-all group relative border border-transparent hover:border-gray-100 cursor-pointer"
            onClick={() => onBookClick(book)}
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
              {book.stock <= 0 && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Sin Stock</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1 mb-4">
              <h3 className="text-sm sm:text-base font-bold leading-tight group-hover:text-[#B23B23] transition-colors line-clamp-2 text-[#2D1A1A]">{book.title}</h3>
              <p className="text-gray-400 font-medium text-[10px] sm:text-xs truncate">{book.author}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[#B23B23] font-black text-sm sm:text-lg">${formatPrice(book.price)}</p>
                {book.category && (
                  <span className="hidden sm:inline-block px-2 py-0.5 bg-[#FDF2F0] rounded-full text-[8px] font-black uppercase tracking-widest text-[#B23B23]">
                    {book.category}
                  </span>
                )}
              </div>
            </div>

            {currentUser && (
              <div className="flex items-center gap-1 pt-3 border-t border-[#FDF2F0]">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBook(book);
                  }}
                  className="flex-1 py-2 hover:bg-[#FDF2F0] rounded-xl text-gray-400 hover:text-[#B23B23] transition-all flex items-center justify-center"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaleClick(book);
                  }}
                  disabled={book.stock <= 0}
                  className="flex-1 py-2 bg-[#B23B23] text-white rounded-xl hover:bg-[#962D1A] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

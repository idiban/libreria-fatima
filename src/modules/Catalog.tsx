import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Edit2, ShoppingCart, Plus, Search, X, Filter, ChevronDown } from 'lucide-react';
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
  onSaleClick: (book: BookItem | null) => void;
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);

  // Resetear el límite cuando cambia la búsqueda o categorías
  useEffect(() => {
    setDisplayLimit(20);
  }, [searchTerm, selectedCategories]);

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const normalizeText = (text: string) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Extraer dinámicamente las categorías únicas de los libros cargados
  const uniqueCategories = useMemo(() => {
    const categories = books.map(b => b.category).filter(Boolean);
    return Array.from(new Set(categories)).sort();
  }, [books]);

  // Función para seleccionar/deseleccionar categorías
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // Filtrado ajustado para considerar el buscador Y las categorías seleccionadas
  const filteredBooks = books.filter(book => {
    const term = normalizeText(searchTerm);
    const matchesSearch = normalizeText(book.title).includes(term) || 
           normalizeText(book.author).includes(term) ||
           (book.category && normalizeText(book.category).includes(term));
           
    const matchesCategory = selectedCategories.length === 0 || 
                            (book.category && selectedCategories.includes(book.category));

    return matchesSearch && matchesCategory;
  });

  const visibleBooks = filteredBooks.slice(0, displayLimit);
  const hasMore = filteredBooks.length > displayLimit;

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayLimit(prev => prev + 20);
      }
    }, { threshold: 0.1 });

    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, displayLimit]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* HEADER CON BUSCADOR CENTRADO Y NOTORIO */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">
            {currentUser ? 'Venta de Libros' : 'Nuestro Catálogo'}
          </h2>
          <p className="text-gray-500 font-medium">
            {currentUser ? 'Selecciona un libro para venderlo o inicia una venta nueva' : 'Explora nuestra selección de libros disponibles.'}
          </p>
        </div>
        
        {/* BUSCADOR CENTRADO */}
        <div className="flex justify-center w-full">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, autor o categoría..."
              className="pl-12 pr-10 py-4 bg-white border-2 border-[var(--color-warm-surface)] rounded-2xl text-base w-full focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] transition-all shadow-md font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2">
          {currentUser && (
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <button
                onClick={() => onSaleClick(null)}
                className="bg-[var(--color-primary)] text-white px-4 py-3 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all flex-1 sm:flex-none text-sm"
              >
                <ShoppingCart className="w-5 h-5 shrink-0" />
                <span>Vender</span>
              </button>
              {(!currentUser.permissions || currentUser.permissions.canAddBook !== false || currentUser.role === 'owner') && (
                <button
                  onClick={onAddBook}
                  className="bg-[var(--color-primary)] text-white px-4 py-3 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all flex-1 sm:flex-none text-sm"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                  <span>Añadir Libro</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: SIDEBAR + GRID */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        
        {/* SIDEBAR DE CATEGORÍAS (Solo visitantes) */}
        {!currentUser && uniqueCategories.length > 0 && (
          <aside className="w-full lg:w-56 shrink-0 lg:sticky lg:top-24 z-10">
            
            {/* Botón Colapsable para Móvil */}
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden w-full flex items-center justify-between bg-white border border-[var(--color-warm-surface)] p-3.5 rounded-2xl shadow-sm mb-2 hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-sm text-gray-700">Filtrar Categorías</span>
                {selectedCategories.length > 0 && (
                  <span className="bg-[var(--color-primary)] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {selectedCategories.length}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Contenedor de Filtros (Oculto en móvil por defecto, visible en desktop) */}
            <div className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex flex-col gap-3 bg-white lg:bg-transparent p-4 lg:p-0 rounded-2xl border border-[var(--color-warm-surface)] lg:border-none shadow-sm lg:shadow-none mb-4 lg:mb-0`}>
              <div className="flex items-center justify-between">
                <h3 className="hidden lg:block font-black text-gray-400 uppercase tracking-widest text-[10px] sm:text-xs ml-1">
                  Filtrar Categorías
                </h3>
                {selectedCategories.length > 0 && (
                  <button 
                    onClick={() => setSelectedCategories([])}
                    className="text-[10px] font-bold text-[var(--color-primary)] hover:underline ml-auto lg:ml-0"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2">
                <button
                  onClick={() => setSelectedCategories([])}
                  className={`col-span-2 lg:col-span-1 text-center lg:text-left px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                    selectedCategories.length === 0
                      ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 shadow-sm'
                  }`}
                >
                  Todas las categorías
                </button>
                
                {uniqueCategories.map(category => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`text-center lg:text-left px-2 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border flex items-center justify-center lg:justify-start leading-tight min-h-[44px] lg:min-h-0 ${
                        isSelected 
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' 
                          : 'bg-white border-transparent text-gray-500 hover:bg-gray-50 border-[var(--color-warm-surface)] shadow-sm'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        {/* GRID DE LIBROS */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {loading ? (
              Array(10).fill(0).map((_, i) => (
                <div key={`loading-skeleton-${i}`} className="bg-white rounded-[2rem] p-4 animate-pulse">
                  <div className="aspect-[3/4] bg-gray-100 rounded-2xl mb-4" />
                  <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              ))
            ) : visibleBooks.map((book) => (
              <motion.div
                layout
                key={book.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] p-3 sm:p-4 shadow-sm hover:shadow-xl transition-all group relative border border-transparent hover:border-gray-100 cursor-pointer flex flex-col"
                onClick={() => {
                  if (currentUser) {
                    onSaleClick(book);
                  } else {
                    onBookClick(book);
                  }
                }}
              >
                <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-3 sm:mb-4 bg-gray-50 relative shrink-0">
                  {book.cover_url ? (
                    <img 
                      src={book.cover_url} 
                      alt={book.title} 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <BookOpen className="w-12 h-12" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-bold leading-tight group-hover:text-[var(--color-primary)] transition-colors line-clamp-2 text-[var(--color-primary)] flex-1">{book.title}</h3>
                    {book.tomo && (
                      <span className="shrink-0 bg-amber-100 text-amber-700 font-black text-[10px] px-2 py-0.5 rounded-md mt-0.5">
                        {book.tomo}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 font-medium text-[10px] sm:text-xs truncate mt-1">{book.author}</p>
                  
                  <div className="flex flex-col mt-auto pt-3 gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[var(--color-primary)] font-black text-sm sm:text-lg leading-none">${formatPrice(book.price)}</p>
                      {currentUser && (
                        <span className={`text-[10px] font-bold whitespace-nowrap ${book.stock === 0 ? 'text-red-500' : book.stock <= 3 ? 'text-orange-500' : 'text-emerald-500'}`}>
                          Stock: {book.stock}
                        </span>
                      )}
                    </div>
                    {book.category && (
                      <span className="self-start px-2 py-0.5 bg-[var(--color-warm-surface)] rounded-full text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)] truncate max-w-full">
                        {book.category}
                      </span>
                    )}
                  </div>
                </div>

              </motion.div>
            ))}
          </div>

          {/* Sentinel para Infinite Scroll */}
          {hasMore && (
            <div id="infinite-scroll-sentinel" className="h-20 flex items-center justify-center mt-8">
              <div className="w-8 h-8 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
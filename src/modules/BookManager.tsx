import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Minus, Search, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2, X, Filter, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { BookItem, UserProfile } from '../types';
import ConfirmationModal from '../components/ConfirmationModal'; 

// Función de ayuda para formatear precios con puntos (ej. 15.000)
const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return '0';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

interface BookManagerProps {
  books: BookItem[];
  currentUser: UserProfile | null;
  onEditBook: (book: BookItem) => void;
  onAddBook: () => void;
  onBookDeleted: () => void;
}

type SortColumn = 'title' | 'category' | 'price' | 'stock';
type SortDirection = 'asc' | 'desc';

export default function BookManager({ books, currentUser, onEditBook, onAddBook, onBookDeleted }: BookManagerProps) {
  
  const isOwner = currentUser?.role === 'owner';
  const perms = currentUser?.permissions || { canAddBook: true, canEditStock: true, canEditBook: true, canDeleteBook: true };
  const [searchTerm, setSearchTerm] = useState('');
  const [bookToDelete, setBookToDelete] = useState<BookItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para el ordenamiento
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [displayLimit, setDisplayLimit] = useState(20);

  // Estados para el filtro de categorías
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Resetear el límite cuando cambia la búsqueda, el ordenamiento o las categorías
  useEffect(() => {
    setDisplayLimit(20);
  }, [searchTerm, sortColumn, sortDirection, selectedCategories]);

  const normalizeText = (text: string) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Extraer dinámicamente las categorías únicas
  const uniqueCategories = useMemo(() => {
    const categories = books.map(b => b.category).filter(Boolean) as string[];
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-[var(--color-primary)]" /> : <ArrowDown className="w-4 h-4 text-[var(--color-primary)]" />;
  };

  const sortedBooks = [...books].sort((a, b) => {
    let compareResult = 0;
    
    if (sortColumn === 'title') {
      compareResult = a.title.localeCompare(b.title);
    } else if (sortColumn === 'category') {
      const catA = a.category || '';
      const catB = b.category || '';
      compareResult = catA.localeCompare(catB);
    } else if (sortColumn === 'price') {
      compareResult = (a.price || 0) - (b.price || 0);
    } else if (sortColumn === 'stock') {
      compareResult = a.stock - b.stock;
    }

    return sortDirection === 'asc' ? compareResult : -compareResult;
  });
  
  const filteredBooks = sortedBooks.filter(b => {
    const normalizedSearch = normalizeText(searchTerm);
    const matchesSearch = normalizeText(b.title).includes(normalizedSearch) || 
                          normalizeText(b.author).includes(normalizedSearch);
    
    const matchesCategory = selectedCategories.length === 0 || 
                            (b.category && selectedCategories.includes(b.category));

    return matchesSearch && matchesCategory;
  });

  const visibleBooks = filteredBooks.slice(0, displayLimit);
  const hasMore = filteredBooks.length > displayLimit;

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayLimit(prev => prev + 20);
      }
    }, { threshold: 0.1 });

    const sentinel = document.getElementById('manager-scroll-sentinel');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, displayLimit]);

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/books/${bookToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onBookDeleted();
        setBookToDelete(null);
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (e) {
      alert('Error al eliminar el libro.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--color-primary)]">Gestión de libros</h2>
            <span className="whitespace-nowrap px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-black rounded-full border border-[var(--color-primary)]/20 shadow-sm">
              {searchTerm || selectedCategories.length > 0 ? `${filteredBooks.length} de ${books.length}` : `${books.length} total`}
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-500 font-medium">Administra y organiza los libros de tu librería.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:flex-initial">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar libro..."
            className="pl-12 pr-10 py-4 sm:py-3 bg-white border border-[var(--color-warm-surface)] rounded-2xl text-sm w-full sm:w-64 md:w-80 focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
          {(isOwner || perms.canAddBook !== false) && (
            <button
              onClick={onAddBook}
              className="bg-[var(--color-primary)] text-white px-6 py-4 sm:py-3 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Añadir Libro</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: FILTROS SUPERIORES + TABLA */}
      <div className="flex flex-col gap-6 items-start">
        
        {/* BARRA HORIZONTAL DE CATEGORÍAS */}
        {uniqueCategories.length > 0 && (
          <div className="w-full">
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden w-full flex items-center justify-between bg-white border border-[var(--color-warm-surface)] p-3.5 rounded-2xl shadow-sm hover:border-[var(--color-primary)] transition-colors"
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

            {/* Cuadrícula de categorías */}
            <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3 bg-white lg:bg-transparent p-4 lg:p-0 rounded-2xl border border-[var(--color-warm-surface)] lg:border-none shadow-sm lg:shadow-none mt-2 lg:mt-0 w-full`}>
              
              <button
                onClick={() => setSelectedCategories([])}
                className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all text-center w-full ${
                  selectedCategories.length === 0
                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 shadow-sm'
                }`}
              >
                Todas
              </button>
              
              {uniqueCategories.map(category => {
                const isSelected = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border text-center w-full truncate ${
                      isSelected 
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm'
                    }`}
                    title={category}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            
            {/* Botón de limpiar filtros aparte para que no rompa la cuadrícula */}
            {selectedCategories.length > 0 && (
              <div className="flex justify-end mt-3">
                <button 
                  onClick={() => setSelectedCategories([])}
                  className="text-[11px] sm:text-xs font-bold text-[var(--color-primary)] hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* LISTADOS DE LIBROS */}
        <div className="w-full min-w-0">
          
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-[var(--color-warm-surface)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[var(--color-warm-surface)]">
                    <th 
                      className="px-8 py-6 cursor-pointer hover:bg-gray-50 transition-colors group select-none"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-2">
                        Libro {renderSortIcon('title')}
                      </div>
                    </th>
                    <th 
                      className="px-8 py-6 cursor-pointer hover:bg-gray-50 transition-colors group select-none"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        Categoría {renderSortIcon('category')}
                      </div>
                    </th>
                    <th 
                      className="w-24 px-2 py-4 text-center cursor-pointer hover:bg-gray-50 transition-colors group select-none"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Precio {renderSortIcon('price')}
                      </div>
                    </th>
                    <th 
                      className="w-36 px-2 py-4 text-center cursor-pointer hover:bg-gray-50 transition-colors group select-none"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Stock {renderSortIcon('stock')}
                      </div>
                    </th>
                    {(isOwner || perms.canEditBook !== false || perms.canDeleteBook !== false) && (
                      <th className="w-24 px-4 py-4 text-right cursor-default">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-warm-surface)]">
                  {visibleBooks.map((book) => (
                    <BookRow 
                      key={book.id} 
                      book={book} 
                      onEditBook={onEditBook}
                      onDeleteRequest={setBookToDelete}
                      canEditBook={isOwner || perms.canEditBook !== false}
                      canDeleteBook={isOwner || perms.canDeleteBook !== false}
                      canEditStock={isOwner || perms.canEditStock !== false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {visibleBooks.map((book) => (
              <div key={book.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-[var(--color-warm-surface)] space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-[var(--color-primary)] truncate text-lg">{book.title}</p>
                      {book.tomo && (
                        <span className="shrink-0 bg-amber-100 text-amber-700 font-black text-[9px] px-1.5 py-0.5 rounded flex items-center">
                          {book.tomo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-bold truncate mb-2">{book.author}</p>
                    <span className="inline-block px-2 py-0.5 bg-[var(--color-warm-surface)] rounded-full text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)]">
                      {book.category || 'Sin categoría'}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4 pt-4 border-t border-[var(--color-warm-surface)]">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Precio</span>
                      <span className="text-xl font-bold text-gray-700">
                        ${formatPrice(book.price)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Stock</span>
                      <InlineStockInput book={book} textClass="text-lg" disabled={!(isOwner || perms.canEditStock !== false)} />
                    </div>
                  </div>
                  
                  {(isOwner || perms.canEditBook !== false || perms.canDeleteBook !== false) && (
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                      {(isOwner || perms.canEditBook !== false) && (
                        <button 
                          onClick={() => onEditBook(book)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-warm-bg)] rounded-xl text-[var(--color-primary)] font-bold text-sm shadow-sm active:scale-95 transition-all"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </button>
                      )}
                      {(isOwner || perms.canDeleteBook !== false) && (
                        <button 
                          onClick={() => setBookToDelete(book)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-50 rounded-xl text-red-500 font-bold text-sm shadow-sm active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sentinel para Infinite Scroll */}
          {hasMore && (
            <div id="manager-scroll-sentinel" className="h-20 flex items-center justify-center py-4 mt-4">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
            </div>
          )}
          
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleDeleteBook}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar el libro "${bookToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}

/// NUEVO: Componente para modificar el stock en vivo (Con Debounce optimizado)
function InlineStockInput({ book, textClass = "text-lg", disabled = false }: { book: BookItem, textClass?: string, disabled?: boolean }) {
  const [stock, setStock] = useState<number | string>(book.stock);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setStock(book.stock);
  }, [book.stock]);

  useEffect(() => {
    const numericStock = typeof stock === 'string' ? parseInt(stock, 10) : stock;
    const isValid = !isNaN(numericStock) && numericStock >= 0;

    if (numericStock === book.stock || !isValid) return;

    const timer = setTimeout(async () => {
      setIsUpdating(true);

      try {
        const response = await fetch(`/api/books/${book.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: numericStock })
        });
        
        if (response.ok) {
          window.dispatchEvent(new Event('stockUpdated'));
        } else {
          setStock(book.stock); 
        }
      } catch (error) {
        setStock(book.stock); 
      } finally {
        setIsUpdating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [stock, book.stock, book.id]);

  const handleIncrement = () => setStock(Number(stock) + 1);
  const handleDecrement = () => setStock(Math.max(0, Number(stock) - 1));

  const handleInputBlur = () => {
    if (stock === '') setStock(book.stock);
  };

  return (
    <div 
      className={`inline-flex items-center gap-0 bg-white p-0.5 rounded-lg border border-gray-200 shadow-sm transition-all ${disabled ? 'opacity-50' : 'hover:shadow hover:border-[var(--color-primary)]/40'}`}
      onClickCapture={(e) => {
        if (disabled) {
          e.stopPropagation();
          e.preventDefault();
          alert("Usted no tiene permisos para esa acción");
        }
      }}
    >
      <button 
        onClick={handleDecrement}
        disabled={disabled || Number(stock) === 0}
        className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        title="Disminuir stock"
      >
        <Minus className="w-3 h-3" />
      </button>
      
      <div className="relative flex items-center justify-center">
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-md z-10">
            <Loader2 className="w-3 h-3 animate-spin text-[var(--color-primary)]" />
          </div>
        )}
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          disabled={disabled}
          title="Editar stock"
          className={`w-8 px-0.5 py-0 bg-transparent focus:bg-gray-50 focus:ring-1 focus:ring-[var(--color-primary)]/20 rounded-md outline-none transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-black text-sm ${textClass} ${
            Number(stock) === 0 ? 'text-red-500' : Number(stock) <= 3 ? 'text-orange-500' : 'text-emerald-500'
          }`}
        />
      </div>
      
      <button 
        onClick={handleIncrement}
        disabled={disabled}
        className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        title="Aumentar stock"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

interface BookRowProps {
  key?: string;
  book: BookItem;
  onEditBook: (book: BookItem) => void;
  onDeleteRequest: (book: BookItem) => void;
  canEditBook?: boolean;
  canDeleteBook?: boolean;
  canEditStock?: boolean;
}

function BookRow({ book, onEditBook, onDeleteRequest, canEditBook = true, canDeleteBook = true, canEditStock = true }: BookRowProps) {
  return (
    <tr className="hover:bg-[var(--color-warm-bg)] transition-colors group">
      <td className="px-8 py-6 align-middle">
        <div className="flex items-center gap-4">
          <div className="w-12 h-16 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
            {book.cover_url ? (
              <img src={book.cover_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200">
                <Package className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 max-w-[200px] xl:max-w-[350px]">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-[var(--color-primary)] truncate text-base group-hover:text-[var(--color-primary-hover)] transition-colors" title={book.title}>
                {book.title}
              </p>
              {book.tomo && (
                <span className="shrink-0 bg-amber-100 text-amber-700 font-black text-[9px] px-1.5 py-0.5 rounded flex items-center">
                  {book.tomo}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-bold truncate" title={book.author}>
              {book.author}
            </p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6 align-middle">
        <span className="inline-block whitespace-nowrap px-3 py-1 bg-[var(--color-warm-surface)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">
          {book.category || 'Sin categoría'}
        </span>
      </td>
      <td className="px-2 py-4 text-center align-middle">
        <div className="text-sm font-bold text-gray-600">
          ${formatPrice(book.price)}
        </div>
      </td>
      <td className="px-2 py-4 text-center align-middle">
        <InlineStockInput book={book} textClass="text-sm" disabled={!canEditStock} />
      </td>
      {(canEditBook || canDeleteBook) && (
        <td className="px-4 py-4 text-right align-middle">
          <div className="flex items-center justify-end gap-1">
            {canEditBook && (
              <button 
                onClick={() => onEditBook(book)}
                className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm transition-all"
                title="Editar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {canDeleteBook && (
              <button 
                onClick={() => onDeleteRequest(book)}
                className="p-1.5 bg-red-50 border border-red-100 rounded-md text-red-500 hover:bg-red-100 hover:border-red-200 shadow-sm transition-all"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
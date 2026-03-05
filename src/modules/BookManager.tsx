import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, Search, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BookItem } from '../types';
import ConfirmationModal from '../components/ConfirmationModal'; 

// Función de ayuda para formatear precios con puntos (ej. 15.000)
const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return '0';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

interface BookManagerProps {
  books: BookItem[];
  onEditBook: (book: BookItem) => void;
  onAddBook: () => void;
  onBookDeleted: () => void;
}

// Agregamos 'price' a las columnas ordenables
type SortColumn = 'title' | 'category' | 'price' | 'stock';
type SortDirection = 'asc' | 'desc';

export default function BookManager({ books, onEditBook, onAddBook, onBookDeleted }: BookManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookToDelete, setBookToDelete] = useState<BookItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Nuevos estados para el ordenamiento
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const normalizeText = (text: string) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Función para manejar el clic en las columnas
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Si ya estamos ordenando por esta columna, invertimos la dirección
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es una columna nueva, la seleccionamos y ordenamos ascendente por defecto
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Función que renderiza el ícono correcto según el estado de ordenamiento
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 text-[var(--color-primary)]" /> : <ArrowDown className="w-4 h-4 text-[var(--color-primary)]" />;
  };

  // Lógica dinámica de ordenamiento
  const sortedBooks = [...books].sort((a, b) => {
    let compareResult = 0;
    
    if (sortColumn === 'title') {
      compareResult = a.title.localeCompare(b.title);
    } else if (sortColumn === 'category') {
      const catA = a.category || '';
      const catB = b.category || '';
      compareResult = catA.localeCompare(catB);
    } else if (sortColumn === 'price') {
      // Lógica de ordenamiento para precio
      compareResult = (a.price || 0) - (b.price || 0);
    } else if (sortColumn === 'stock') {
      compareResult = a.stock - b.stock;
    }

    return sortDirection === 'asc' ? compareResult : -compareResult;
  });
  
  const filteredBooks = sortedBooks.filter(b => {
    const normalizedSearch = normalizeText(searchTerm);
    return normalizeText(b.title).includes(normalizedSearch) || 
           normalizeText(b.author).includes(normalizedSearch);
  });

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
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">Gestión de libros</h2>
          <p className="text-sm sm:text-base text-gray-500 font-medium">Administra y organiza los libros de tu librería.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar libro..."
              className="pl-12 pr-6 py-4 sm:py-3 bg-white border border-[var(--color-warm-surface)] rounded-2xl text-sm w-full sm:w-64 md:w-80 focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={onAddBook}
            className="bg-[var(--color-primary)] text-white px-6 py-4 sm:py-3 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Añadir Libro</span>
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-[var(--color-warm-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                {/* Columnas de Precio, Stock y Acciones ajustadas */}
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
                <th className="w-24 px-4 py-4 text-right cursor-default">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-warm-surface)]">
              {filteredBooks.map((book) => (
                <BookRow 
                  key={book.id} 
                  book={book} 
                  onEditBook={onEditBook}
                  onDeleteRequest={setBookToDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredBooks.map((book) => (
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
                <p className="font-bold text-[var(--color-primary)] truncate text-lg">{book.title}</p>
                <p className="text-xs text-gray-400 font-bold truncate mb-2">{book.author}</p>
                <span className="inline-block px-2 py-0.5 bg-[var(--color-warm-surface)] rounded-full text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)]">
                  {book.category || 'Sin categoría'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 pt-4 border-t border-[var(--color-warm-surface)]">
              {/* Contenedor espacioso para Precio y Stock */}
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Precio</span>
                  <span className="text-xl font-bold text-gray-700">
                    ${formatPrice(book.price)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Stock</span>
                  <InlineStockInput book={book} textClass="text-lg" />
                </div>
              </div>
              
              {/* Botones de acción abajo para dar espacio */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-50">
                <button 
                  onClick={() => onEditBook(book)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-warm-bg)] rounded-xl text-[var(--color-primary)] font-bold text-sm shadow-sm active:scale-95 transition-all"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button 
                  onClick={() => setBookToDelete(book)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-50 rounded-xl text-red-500 font-bold text-sm shadow-sm active:scale-95 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
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

// NUEVO: Componente para modificar el stock en vivo (Con estado de carga y UI Premium para Web y Móvil)
function InlineStockInput({ book, textClass = "text-lg" }: { book: BookItem, textClass?: string }) {
  const [stock, setStock] = useState<number | string>(book.stock);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isUpdating) {
      setStock(book.stock);
    }
  }, [book.stock, isUpdating]);

  const updateStockInDB = async (newStock: number) => {
    const validStock = isNaN(newStock) || newStock < 0 ? 0 : newStock;
    if (validStock === book.stock) return;

    setIsUpdating(true);
    setStock(validStock);

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: validStock })
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
  };

  const handleInputBlur = () => {
    const numStock = typeof stock === 'string' ? parseInt(stock, 10) : stock;
    updateStockInDB(numStock);
  };

  const handleIncrement = () => updateStockInDB(Number(stock) + 1);
  const handleDecrement = () => updateStockInDB(Math.max(0, Number(stock) - 1));

  return (
    // Reducimos padding (p-0.5), redondeo (rounded-lg)
    <div className="inline-flex items-center gap-0 bg-white p-0.5 rounded-lg border border-gray-200 shadow-sm hover:shadow hover:border-[var(--color-primary)]/40 transition-all">
      <button 
        onClick={handleDecrement}
        disabled={isUpdating || Number(stock) === 0}
        // Botón más chico (w-6 h-6), ícono mini (w-3 h-3)
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
          disabled={isUpdating}
          title="Editar stock"
          // Input más angosto (w-8), texto más chico (text-sm)
          className={`w-8 px-0.5 py-0 bg-transparent focus:bg-gray-50 focus:ring-1 focus:ring-[var(--color-primary)]/20 rounded-md outline-none transition-all text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-black text-sm ${textClass} ${
            Number(stock) === 0 ? 'text-red-500' : Number(stock) <= 3 ? 'text-orange-500' : 'text-emerald-500'
          }`}
        />
      </div>
      
      <button 
        onClick={handleIncrement}
        disabled={isUpdating}
        // Botón más chico (w-6 h-6), ícono mini (w-3 h-3)
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
}

function BookRow({ book, onEditBook, onDeleteRequest }: BookRowProps) {
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
          {/* min-w-0 y max-w evitan que textos largos deformen la columna */}
          <div className="min-w-0 max-w-[200px] xl:max-w-[350px]">
            <p 
              className="font-bold text-[var(--color-primary)] truncate text-base mb-0.5 group-hover:text-[var(--color-primary-hover)] transition-colors" 
              title={book.title}
            >
              {book.title}
            </p>
            <p className="text-xs text-gray-400 font-bold truncate" title={book.author}>
              {book.author}
            </p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6 align-middle">
        {/* whitespace-nowrap mantiene la etiqueta siempre en una sola línea */}
        <span className="inline-block whitespace-nowrap px-3 py-1 bg-[var(--color-warm-surface)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">
          {book.category || 'Sin categoría'}
        </span>
      </td>
      {/* Celdas ajustadas (menos padding, fuente y botones ligeramente más chicos) */}
      <td className="px-2 py-4 text-center align-middle">
        <div className="text-sm font-bold text-gray-600">
          ${formatPrice(book.price)}
        </div>
      </td>
      <td className="px-2 py-4 text-center align-middle">
        {/* Cambiamos a text-sm para que el número del stock no sea tan grande */}
        <InlineStockInput book={book} textClass="text-sm" />
      </td>
      <td className="px-4 py-4 text-right align-middle">
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => onEditBook(book)}
            // Padding a p-1.5, redondeo a md y tamaño de icono a w-3.5 h-3.5
            className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm transition-all"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onDeleteRequest(book)}
            className="p-1.5 bg-red-50 border border-red-100 rounded-md text-red-500 hover:bg-red-100 hover:border-red-200 shadow-sm transition-all"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
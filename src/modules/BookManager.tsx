import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit2, Trash2, AlertCircle, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BookItem } from '../types';
import ConfirmationModal from '../components/ConfirmationModal'; // Nuevo modal de confirmación

interface BookManagerProps {
  books: BookItem[];
  onEditBook: (book: BookItem) => void;
  onAddBook: () => void;
  onBookDeleted: () => void;
}

export default function BookManager({ books, onEditBook, onAddBook, onBookDeleted }: BookManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookToDelete, setBookToDelete] = useState<BookItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedBooks = [...books].sort((a, b) => a.title.localeCompare(b.title));
  const filteredBooks = sortedBooks.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">Gestión de Libros</h2>
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
                <th className="px-8 py-6">Libro</th>
                <th className="px-8 py-6">Categoría</th>
                <th className="px-8 py-6 text-center">Stock</th>
                <th className="px-8 py-6 text-right">Acciones</th>
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
            
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-warm-surface)]">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stock</span>
                <span className={`text-xl font-black ${book.stock === 0 ? 'text-red-500' : 'text-[var(--color-primary)]'}`}>
                  {book.stock}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onEditBook(book)}
                  className="p-3 bg-[var(--color-warm-bg)] rounded-xl text-[var(--color-primary)] shadow-sm active:scale-95 transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setBookToDelete(book)}
                  className="p-3 bg-red-50 rounded-xl text-red-500 shadow-sm active:scale-95 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
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

interface BookRowProps {
  key?: string;
  book: BookItem;
  onEditBook: (book: BookItem) => void;
  onDeleteRequest: (book: BookItem) => void;
}

function BookRow({ book, onEditBook, onDeleteRequest }: BookRowProps) {
  return (
    <tr className="hover:bg-[var(--color-warm-bg)] transition-colors group">
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-16 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
            {book.cover_url ? (
              <img src={book.cover_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-200">
                <Package className="w-6 h-6" />
              </div>
            )}
          </div>
          <div>
            <p className="font-bold text-[var(--color-primary)] group-hover:text-[var(--color-primary)] transition-colors">{book.title}</p>
            <p className="text-xs text-gray-400 font-medium">{book.author}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6">
        <span className="px-3 py-1 bg-[var(--color-warm-surface)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">
          {book.category || 'Sin categoría'}
        </span>
      </td>
      <td className="px-8 py-6 text-center">
        <div className={`text-lg font-black ${book.stock === 0 ? 'text-red-500' : 'text-[var(--color-primary)]'}`}>
          {book.stock}
        </div>
      </td>
      <td className="px-8 py-6 text-right">
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => onEditBook(book)}
            className="p-2 hover:bg-[var(--color-warm-surface)] rounded-xl text-gray-400 hover:text-[var(--color-primary)] transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDeleteRequest(book)}
            className="p-2 hover:bg-[var(--color-warm-surface)] rounded-xl text-gray-400 hover:text-red-500 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

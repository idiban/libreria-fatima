import React, { useState } from 'react';
import { Package, Plus, Minus, Search, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { BookItem } from '../types';

interface StockManagerProps {
  books: BookItem[];
  onUpdateStock: (bookId: string, newStock: number) => Promise<void>;
}

export default function StockManager({ books, onUpdateStock }: StockManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const sortedBooks = [...books].sort((a, b) => a.title.localeCompare(b.title));
  const filteredBooks = sortedBooks.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStockChange = async (book: BookItem, delta: number) => {
    const newStock = Math.max(0, book.stock + delta);
    if (newStock === book.stock) return;
    
    setUpdatingId(book.id);
    try {
      await onUpdateStock(book.id, newStock);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Control de Stock</h2>
          <p className="text-gray-500 font-medium">Administra las existencias de tus libros.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar libro..."
            className="pl-12 pr-6 py-3 bg-white border border-[#FDF2F0] rounded-2xl text-sm w-full md:w-80 focus:ring-2 focus:ring-[#B23B23] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-[#FDF2F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#FDF2F0]">
                <th className="px-8 py-6">Libro</th>
                <th className="px-8 py-6">Categoría</th>
                <th className="px-8 py-6 text-center">Stock Actual</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FDF2F0]">
              {filteredBooks.map((book) => (
                <tr key={book.id} className="hover:bg-[#FFF9F5] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 rounded-lg bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-200">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-[#2D1A1A] group-hover:text-[#B23B23] transition-colors">{book.title}</p>
                        <p className="text-xs text-gray-400 font-medium">{book.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-[#FDF2F0] rounded-full text-[10px] font-black uppercase tracking-widest text-[#B23B23]">
                      {book.category || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${book.stock > 10 ? 'bg-emerald-500' : book.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
                      <span className={`text-lg font-black ${book.stock === 0 ? 'text-red-500' : 'text-[#2D1A1A]'}`}>
                        {book.stock}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-flex items-center gap-2 bg-[#FDF2F0] p-1.5 rounded-2xl">
                      <button
                        disabled={updatingId === book.id || book.stock === 0}
                        onClick={() => handleStockChange(book, -1)}
                        className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 transition-all disabled:opacity-50"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="w-10 text-center">
                        {updatingId === book.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#B23B23]" />
                        ) : (
                          <span className="font-black text-sm">{book.stock}</span>
                        )}
                      </div>
                      <button
                        disabled={updatingId === book.id}
                        onClick={() => handleStockChange(book, 1)}
                        className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-emerald-500 transition-all disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

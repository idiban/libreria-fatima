/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Package, 
  TrendingUp, 
  BookOpen,
  X,
  Save,
  Library
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookItem {
  id: number;
  title: string;
  author: string;
  price: number;
  stock: number;
  cover_url: string;
  contraportada_url?: string;
}

export default function App() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    price: 0,
    stock: 0,
    cover_url: '',
    contraportada_url: ''
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books');
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';
      const method = editingBook ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchBooks();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving book:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este libro?')) return;
    try {
      const response = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setBooks(books.filter(b => b.id !== (id as any)));
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const openModal = (book?: BookItem) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author,
        price: book.price,
        stock: book.stock,
        cover_url: book.cover_url || '',
        contraportada_url: book.contraportada_url || ''
      });
    } else {
      setEditingBook(null);
      setFormData({
        title: '',
        author: '',
        price: 0,
        stock: 0,
        cover_url: '',
        contraportada_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: books.length,
    stock: books.reduce((acc, b) => acc + b.stock, 0),
    value: books.reduce((acc, b) => acc + (b.price * b.stock), 0)
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E0] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#5A5A40] p-2 rounded-lg">
              <Library className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Librería Fátima</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar libros..."
                className="pl-10 pr-4 py-2 bg-[#F5F5F0] border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-[#5A5A40] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => openModal()}
              className="bg-[#5A5A40] hover:bg-[#4A4A35] text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Libro
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Títulos', value: stats.total, icon: BookOpen, color: 'text-blue-600' },
            { label: 'Stock Total', value: stats.stock, icon: Package, color: 'text-emerald-600' },
            { label: 'Valor Inventario', value: `$${stats.value.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E5E0]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gray-50 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E0] overflow-hidden">
          <div className="p-6 border-b border-[#E5E5E0] flex items-center justify-between">
            <h2 className="text-lg font-semibold">Inventario de Libros</h2>
            <div className="sm:hidden">
              <input
                type="text"
                placeholder="Buscar..."
                className="px-4 py-1.5 bg-[#F5F5F0] border-none rounded-full text-sm w-40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Libro</th>
                  <th className="px-6 py-4">Precio</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E0]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">Cargando inventario...</td>
                  </tr>
                ) : filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No se encontraron libros</td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => (
                    <motion.tr 
                      layout
                      key={book.id} 
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                            {book.cover_url ? (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Book className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{book.title}</p>
                            <p className="text-sm text-gray-500">{book.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">${book.price.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${book.stock > 10 ? 'bg-emerald-500' : book.stock > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <span className="font-medium">{book.stock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openModal(book)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-[#5A5A40] transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(book.id as any)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-[#E5E5E0] flex items-center justify-between bg-gray-50/50">
                <h3 className="text-xl font-bold">{editingBook ? 'Editar Libro' : 'Nuevo Libro'}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Título</label>
                      <input
                        required
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                        placeholder="Ej: La Lámpara Bajo el Celemín"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Autor</label>
                      <input
                        required
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                        placeholder="Ej: Álvaro Calderón"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Precio</label>
                        <input
                          required
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Stock</label>
                        <input
                          required
                          type="number"
                          name="stock"
                          value={formData.stock}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">URL Portada</label>
                      <input
                        name="cover_url"
                        value={formData.cover_url}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">URL Contraportada</label>
                      <input
                        name="contraportada_url"
                        value={formData.contraportada_url}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A35] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#5A5A40]/20 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    {editingBook ? 'Guardar Cambios' : 'Crear Libro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

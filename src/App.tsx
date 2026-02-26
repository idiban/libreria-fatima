import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem, UserProfile } from './types';
import { Menu, Library } from 'lucide-react';

// Modules
import Sidebar from './modules/Sidebar';
import Catalog from './modules/Catalog';
import StockManager from './modules/StockManager';
import UserAdmin from './modules/UserAdmin';
import StatsDashboard from './modules/StatsDashboard';
import ActivityLogs from './modules/ActivityLogs';
import SalesHistory from './modules/SalesHistory';
import DebtorsList from './modules/DebtorsList';
import BookDetail from './modules/BookDetail';
import SaleModal from './modules/SaleModal';
import LoginModal from './modules/LoginModal';
import BookModal from './modules/BookModal';

export default function App() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('catalog');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Selection State
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [saleBook, setSaleBook] = useState<BookItem | null>(null);
  
  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  
  // Admin Data
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const fetchBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/books');
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (e) {}
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllUsers(data.sort((a, b) => a.username.localeCompare(b.username)));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchBooks();
    checkAuth();
  }, [fetchBooks, checkAuth]);

  useEffect(() => {
    if (activeView === 'users') fetchUsers();
  }, [activeView, fetchUsers]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setCurrentUser(null);
    setActiveView('catalog');
  };

  const handleUpdateStock = async (bookId: string, newStock: number) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (response.ok) {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: newStock } : b));
      }
    } catch (e) {}
  };

  const renderView = () => {
    switch (activeView) {
      case 'catalog':
        if (selectedBook) {
          return (
            <BookDetail 
              book={selectedBook} 
              onBack={() => setSelectedBook(null)} 
              currentUser={currentUser}
              onSaleClick={(book) => setSaleBook(book)}
            />
          );
        }
        return (
          <Catalog 
            books={books}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            currentUser={currentUser}
            onEditBook={(book) => {
              setEditingBook(book);
              setIsBookModalOpen(true);
            }}
            onAddBook={() => {
              setEditingBook(null);
              setIsBookModalOpen(true);
            }}
            onSaleClick={(book) => setSaleBook(book)}
            onBookClick={(book) => setSelectedBook(book)}
          />
        );
      case 'stock':
        return <StockManager books={books} onUpdateStock={handleUpdateStock} />;
      case 'users':
        return currentUser ? <UserAdmin currentUser={currentUser} allUsers={allUsers} onFetchUsers={fetchUsers} /> : null;
      case 'stats':
        return <StatsDashboard />;
      case 'logs':
        return <ActivityLogs />;
      case 'sales':
        return <SalesHistory />;
      case 'debtors':
        return <DebtorsList />;
      default:
        return <Catalog books={books} loading={loading} searchTerm={searchTerm} setSearchTerm={setSearchTerm} currentUser={currentUser} onEditBook={() => {}} onAddBook={() => {}} onSaleClick={() => {}} onBookClick={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F5] flex">
      {currentUser && (
        <Sidebar 
          currentUser={currentUser}
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            setSelectedBook(null);
          }}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentUser && (
          <div className="md:hidden bg-white border-b border-[#FDF2F0] p-4 flex items-center justify-between z-40 shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-[#B23B23] p-1.5 rounded-lg">
                <Library className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-bold text-lg text-[#2D1A1A]">Librería Fátima</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        )}
        <div className="flex-1 p-4 md:p-6 lg:p-10 overflow-y-auto">
          <AnimatePresence mode="wait">
          <motion.div
            key={activeView + (selectedBook?.id || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {!currentUser && activeView === 'catalog' && !selectedBook && (
              <div className="flex justify-end mb-8">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-[#B23B23] text-white px-4 py-2 text-sm md:px-6 md:py-3 md:text-base rounded-2xl font-black shadow-lg shadow-[#B23B23]/20 hover:scale-105 transition-all"
                >
                  Ingresar al Sistema
                </button>
              </div>
            )}
            {renderView()}
          </motion.div>
        </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      <BookModal 
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        editingBook={editingBook}
        onSave={fetchBooks}
      />

      {saleBook && currentUser && (
        <SaleModal 
          isOpen={!!saleBook}
          onClose={() => setSaleBook(null)}
          initialBook={saleBook}
          currentUser={currentUser}
          onSaleSuccess={fetchBooks}
        />
      )}
    </div>
  );
}

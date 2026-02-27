import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookItem, UserProfile } from './types';
import { Menu, Library } from 'lucide-react';

// Modules
import Sidebar from './modules/Sidebar';
import Catalog from './modules/Catalog';
import BookManager from './modules/BookManager';
import UserAdmin from './modules/UserAdmin';
import StatsDashboard from './modules/StatsDashboard';
import ActivityLogs from './modules/ActivityLogs';
import SalesHistory from './modules/SalesHistory';
import DebtorsList from './modules/DebtorsList';
import ClientsList from './modules/ClientsList';
import BookDetail from './modules/BookDetail';
import SaleModal from './modules/SaleModal';
import LoginModal from './modules/LoginModal';
import BookModal from './modules/BookModal';
import ChangePasswordModal from './modules/ChangePasswordModal';

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

  // Handle Browser Back Button for All Views
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { view, bookId } = event.state;
        setActiveView(view || 'catalog');
        
        if (view === 'catalog' && bookId) {
          const book = books.find(b => b.id === bookId);
          setSelectedBook(book || null);
        } else {
          setSelectedBook(null);
        }
      } else {
        // Default state (initial load)
        setActiveView('catalog');
        setSelectedBook(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [books]);

  const navigateTo = (view: string, book: BookItem | null = null) => {
    setActiveView(view);
    setSelectedBook(book);
    
    const state = { view, bookId: book?.id };
    // Avoid pushing duplicate states
    if (JSON.stringify(window.history.state) !== JSON.stringify(state)) {
      window.history.pushState(state, '');
    }
  };

  const handleBookClick = (book: BookItem) => {
    navigateTo('catalog', book);
  };

  const handleBackToCatalog = () => {
    window.history.back();
  };

  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [saleBook, setSaleBook] = useState<BookItem | null>(null);
  
  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  
  // Admin Data
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Session Timer
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds

  const resetTimer = useCallback(() => {
    setTimeLeft(3600);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearInterval(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, resetTimer]);

  const fetchBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/books');
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setBooks(data);
        } else {
          console.error("Failed to fetch books:", data);
          setBooks([]);
        }
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/me');
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.indexOf('application/json') !== -1) {
        const user = await response.json();
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    } catch (e) {}
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllUsers(data.sort((a, b) => a.username.localeCompare(b.username)));
        }
      } else {
        handleLogout();
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
      case 'change-password':
        setIsChangePasswordModalOpen(true);
        setActiveView('catalog'); // Fallback to a default view
        break;
      case 'catalog':
        if (selectedBook) {
          return (
            <BookDetail 
              book={selectedBook} 
              onBack={handleBackToCatalog} 
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
            onBookClick={handleBookClick}
          />
        );
      case 'books':
        return <BookManager books={books} onEditBook={(book) => {
          setEditingBook(book);
          setIsBookModalOpen(true);
        }} onAddBook={() => {
          setEditingBook(null);
          setIsBookModalOpen(true);
        }} onBookDeleted={fetchBooks} />;
      case 'users':
        return currentUser ? <UserAdmin currentUser={currentUser} allUsers={allUsers} onFetchUsers={fetchUsers} /> : null;
      case 'stats':
        return <StatsDashboard />;
      case 'logs':
        return <ActivityLogs />;
      case 'sales':
        return currentUser ? <SalesHistory currentUser={currentUser} /> : null;
      case 'clients':
        return <ClientsList />;
      case 'debtors':
        return <DebtorsList books={books} />;
      default:
        return <Catalog books={books} loading={loading} searchTerm={searchTerm} setSearchTerm={setSearchTerm} currentUser={currentUser} onEditBook={() => {}} onAddBook={() => {}} onSaleClick={() => {}} onBookClick={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)] flex">
      {currentUser && (
        <Sidebar 
          currentUser={currentUser}
          activeView={activeView}
          onViewChange={(view) => navigateTo(view)}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
          timeLeft={timeLeft}
        />
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {currentUser && !selectedBook && (
          <div className="md:hidden bg-white border-b border-[var(--color-warm-surface)] p-4 flex items-center justify-between z-40 shrink-0">
            <button onClick={() => navigateTo('catalog')} className="flex items-center gap-2">
              <div className="bg-[var(--color-primary)] p-1.5 rounded-lg">
                <Library className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-bold text-lg text-[var(--color-primary)]">Librería Fátima</h1>
            </button>
            {currentUser && (
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
        <div className={`flex-1 overflow-y-auto ${selectedBook ? 'p-0' : 'p-4 md:p-6 lg:p-10'}`}>
          <AnimatePresence mode="wait">
          <motion.div
            key={activeView + (selectedBook?.id || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {!currentUser && !selectedBook && (
              <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigateTo('catalog')} className="flex items-center gap-2">
                  <div className="bg-[var(--color-primary)] p-1.5 rounded-lg">
                    <Library className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="font-bold text-lg text-[var(--color-primary)]">Librería Fátima</h1>
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-[var(--color-primary)] text-white px-4 py-2 text-sm md:px-6 md:py-3 md:text-base rounded-2xl font-black shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all"
                >
                  Ingresar
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
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsMobileMenuOpen(false);
        }}
      />

      <BookModal 
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        editingBook={editingBook}
        onSave={fetchBooks}
        books={books}
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

      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={() => alert('Contraseña actualizada con éxito')}
      />
    </div>
  );
}

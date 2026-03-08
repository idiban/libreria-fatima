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
  
  // Global Data Cache
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [hasFetchedSales, setHasFetchedSales] = useState(false);
  const [hasFetchedClients, setHasFetchedClients] = useState(false);
  const [hasFetchedLogs, setHasFetchedLogs] = useState(false);

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
    if (JSON.stringify(window.history.state) !== JSON.stringify(state)) {
      window.history.pushState(state, '');
    }
  };

  const handleBookClick = (book: BookItem) => {
    navigateTo('catalog', book);
  };

  const handleBackToCatalog = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('catalog');
    }
  };

  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [saleBook, setSaleBook] = useState<BookItem | null>(null);
  
  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  
  // Admin Data
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  // Session Timer
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hora

  // SOLUCIÓN: Establecer la fecha de expiración real en localStorage
  const resetTimer = useCallback(() => {
    const expireTime = Date.now() + 3600000; // Hora actual + 1 hora
    localStorage.setItem('sessionExpire', expireTime.toString());
    setTimeLeft(3600); 
  }, []);

  // SOLUCIÓN: Validar la sesión basada en el reloj del sistema, no en el setInterval
  useEffect(() => {
    if (!currentUser) return;

    // Al iniciar sesión (o recargar), si no hay fecha de expiración o ya expiró, la creamos
    const expireTimeStr = localStorage.getItem('sessionExpire');
    if (!expireTimeStr || parseInt(expireTimeStr, 10) < Date.now()) {
      resetTimer();
    }

    const checkExpiration = () => {
      const expireTimeStr = localStorage.getItem('sessionExpire');
      if (expireTimeStr) {
        const expireTime = parseInt(expireTimeStr, 10);
        const now = Date.now();
        const secondsLeft = Math.floor((expireTime - now) / 1000);

        if (secondsLeft <= 0) {
          handleLogout(true);
        } else {
          setTimeLeft(secondsLeft);
        }
      }
    };

    const timer = setInterval(checkExpiration, 1000);

    // Escuchar eventos para renovar la hora de expiración
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      // Para no saturar el localStorage, solo actualizamos si quedan menos de 59 minutos
      const expireTimeStr = localStorage.getItem('sessionExpire');
      if (expireTimeStr) {
        const expireTime = parseInt(expireTimeStr, 10);
        const secondsLeft = Math.floor((expireTime - Date.now()) / 1000);
        if (secondsLeft < 3540) { 
          resetTimer();
        }
      } else {
        resetTimer();
      }
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    // Revisar inmediatamente en caso de que volvamos de una hibernación (visibilitychange)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkExpiration();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser, resetTimer]);

  const fetchBooks = useCallback(async (force = false) => {
    try {
      const response = await fetch('/api/books');
      if (response.status === 401) {
        handleLogout();
        return;
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setBooks(data);
          if (force) {
            fetchSales(true);
            fetchClients(true);
          }
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

  const fetchClients = useCallback(async (force = false) => {
    if (hasFetchedClients && !force) return;
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (Array.isArray(data)) {
        setClients(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
        setHasFetchedClients(true);
      }
    } catch (e) {}
  }, [hasFetchedClients]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/me');
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.indexOf('application/json') !== -1) {
        const user = await response.json();
        setCurrentUser(user);
        resetTimer(); // Al validar que estamos logueados, iniciamos el reloj
      } else {
        setCurrentUser(null);
      }
    } catch (e) {}
  }, [resetTimer]);

  useEffect(() => {
    if (currentUser) {
      fetchClients();
    }
  }, [currentUser, fetchClients]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.status === 401) {
        handleLogout();
        return;
      }
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

  const fetchSales = useCallback(async (force = false) => {
    if (hasFetchedSales && !force) return;
    try {
      const res = await fetch('/api/sales');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSales(data);
        setHasFetchedSales(true);
        // Si refrescamos ventas, las deudas de los clientes cambian
        if (force) {
          fetchClients(true);
        }
      }
    } catch (e) {}
  }, [hasFetchedSales, fetchClients]);

  const fetchLogs = useCallback(async (force = false) => {
    if (hasFetchedLogs && !force) return;
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
        setHasFetchedLogs(true);
      }
    } catch (e) {}
  }, [hasFetchedLogs]);

  useEffect(() => {
    fetchBooks();
    checkAuth();

    const handleStockUpdate = () => {
      fetchBooks();
    };

    window.addEventListener('stockUpdated', handleStockUpdate);

    return () => {
      window.removeEventListener('stockUpdated', handleStockUpdate);
    };
  }, [fetchBooks, checkAuth]);

  useEffect(() => {
    if (activeView === 'users') fetchUsers();
    if (activeView === 'sales') fetchSales();
    if (activeView === 'clients') fetchClients();
    if (activeView === 'logs') fetchLogs();
  }, [activeView, fetchUsers, fetchSales, fetchClients, fetchLogs]);

  const handleLogout = async (isExpired = false) => {
    await fetch('/api/logout', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isExpired })
    });
    setCurrentUser(null);
    setActiveView('catalog');
    localStorage.removeItem('sessionExpire'); // Limpiar fecha al cerrar sesión
    // Reset cache
    setSales([]);
    setClients([]);
    setLogs([]);
    setHasFetchedSales(false);
    setHasFetchedClients(false);
    setHasFetchedLogs(false);
  };

  const handleUpdateStock = async (bookId: string, newStock: number) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.ok) {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, stock: newStock } : b));
      }
    } catch (e) {}
  };

  const renderView = () => {
    const safeView = (!currentUser && activeView !== 'catalog') ? 'catalog' : activeView;

    switch (safeView) {
      case 'change-password':
        setIsChangePasswordModalOpen(true);
        setActiveView('catalog'); 
        break;
      case 'catalog':
        if (selectedBook) {
          return (
            <BookDetail 
              book={selectedBook} 
              onBack={handleBackToCatalog} 
              currentUser={currentUser}
              onSaleClick={(book) => {
                setSaleBook(book);
                setIsSaleModalOpen(true);
              }}
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
            onSaleClick={(book) => {
              setSaleBook(book);
              setIsSaleModalOpen(true);
            }}
            onBookClick={handleBookClick}
          />
        );
     case 'books':
        return <BookManager books={books} currentUser={currentUser} onEditBook={(book) => {
          setEditingBook(book);
          setIsBookModalOpen(true);
        }} onAddBook={() => {
          setEditingBook(null);
          setIsBookModalOpen(true);
        }} onBookDeleted={fetchBooks} />;
      case 'users':
        return <UserAdmin currentUser={currentUser!} allUsers={allUsers} onFetchUsers={fetchUsers} />;
      case 'stats':
        return <StatsDashboard />;
      case 'logs':
        return <ActivityLogs logs={logs} loading={!hasFetchedLogs} onRefresh={() => fetchLogs(true)} />;
      case 'sales':
        return <SalesHistory currentUser={currentUser!} sales={sales} clients={clients} loading={!hasFetchedSales} onRefresh={() => fetchSales(true)} />;
      case 'clients':
        return <ClientsList clients={clients} loading={!hasFetchedClients} onRefresh={() => fetchClients(true)} />;
      case 'debtors':
        return <DebtorsList books={books} clients={clients} loading={!hasFetchedClients} onRefresh={() => fetchClients(true)} />;
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
        currentUser={currentUser} // <-- AGREGA ESTA LÍNEA
      />

      {currentUser && (
        <SaleModal 
          isOpen={isSaleModalOpen}
          onClose={() => {
            setIsSaleModalOpen(false);
            setSaleBook(null); 
          }}
          initialBook={saleBook}
          currentUser={currentUser}
          clients={clients}
          onSaleSuccess={() => {
            fetchBooks();
            fetchSales(true);
            fetchClients(true);
          }}
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
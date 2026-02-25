import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Library,
  LogIn,
  LogOut,
  User,
  Shield,
  ShoppingCart,
  ChevronDown,
  Check,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  Key,
  Eye,
  EyeOff,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface BookItem {
  id: string;
  title: string;
  author: string;
  price: number;
  stock: number;
  category: string;
  description: string;
  cover_url: string;
  contraportada_url?: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role?: 'owner' | 'admin' | 'vendedor';
}

export default function App() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAdminResetModalOpen, setIsAdminResetModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);
  const [view, setView] = useState<'catalog' | 'admin'>('catalog');
  
  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Login State
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    price: 0,
    stock: 0,
    category: '',
    description: '',
    cover_url: '',
    contraportada_url: ''
  });

  // Admin Users State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'vendedor' as const
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [userError, setUserError] = useState('');
  const [editUserError, setEditUserError] = useState('');
  const [adminResetError, setAdminResetError] = useState('');
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserFormData, setEditUserFormData] = useState({ username: '', role: 'vendedor' });

  const [showPasswords, setShowPasswords] = useState({
    login: false,
    change: false,
    adminReset: false,
    createUser: false
  });

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

  useEffect(() => {
    fetchBooks();
    checkAuth();
  }, [fetchBooks, checkAuth]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserPanelOpen(false);
      }
    };

    if (isUserPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserPanelOpen]);

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (side === 'front') {
          setFrontImage(base64String);
          setFormData(prev => ({ ...prev, cover_url: base64String }));
        } else {
          setBackImage(base64String);
          setFormData(prev => ({ ...prev, contraportada_url: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const scanWithAI = async () => {
    if (!frontImage && !backImage) return;
    setIsScanning(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as string) });
      const parts: any[] = [{ text: "Analiza estas imágenes de la portada y contraportada de un libro. Extrae el título, autor, categoría (ej: Espiritualidad, Historia, Novela) y el texto COMPLETO de la descripción que aparece en la contraportada (transcríbelo íntegramente, no lo resumas). Responde estrictamente en formato JSON." }];
      
      if (frontImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: frontImage.split(',')[1]
          }
        });
      }
      if (backImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: backImage.split(',')[1]
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "author", "category", "description"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setFormData(prev => ({
        ...prev,
        title: result.title || prev.title,
        author: result.author || prev.author,
        category: result.category || prev.category,
        description: result.description || prev.description
      }));
    } catch (error) {
      console.error('AI Scan Error:', error);
      alert('Hubo un error al escanear el libro con IA.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLoginChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
    
    if (name === 'username' && value.length > 1) {
      try {
        const res = await fetch(`/api/users/suggest?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions(data);
      } catch (e) {}
    } else {
      setSuggestions([]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setIsLoginModalOpen(false);
        setLoginForm({ username: '', password: '' });
      } else {
        const err = await response.json();
        setLoginError(err.error || 'Credenciales incorrectas');
      }
    } catch (e) {
      console.error(e);
      setLoginError('Error al conectar con el servidor');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setCurrentUser(null);
    setView('catalog');
    setIsUserPanelOpen(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (response.ok) {
        alert('Contraseña actualizada con éxito');
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResetError('');
    if (!selectedUserId) return;
    if (newPassword !== confirmPassword) {
      setAdminResetError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setAdminResetError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      const response = await fetch(`/api/users/${selectedUserId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      if (response.ok) {
        alert('Contraseña del usuario actualizada con éxito');
        setIsAdminResetModalOpen(false);
        setNewPassword('');
        setConfirmPassword('');
        setSelectedUserId(null);
      } else {
        const err = await response.json();
        setAdminResetError(err.error || 'Error al actualizar la contraseña');
      }
    } catch (e) {
      console.error(e);
      setAdminResetError('Error de conexión');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    if (userFormData.password !== confirmPassword) {
      setUserError('Las contraseñas no coinciden');
      return;
    }
    if (userFormData.password.length < 6) {
      setUserError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData)
      });
      if (response.ok) {
        fetchAllUsers();
        setIsUserModalOpen(false);
        setUserFormData({ username: '', email: '', password: '', role: 'vendedor' });
        setConfirmPassword('');
      } else {
        const err = await response.json();
        setUserError(err.error || 'Error al crear el usuario');
      }
    } catch (e) {
      console.error(e);
      setUserError('Error de conexión');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError('');
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserFormData)
      });
      if (response.ok) {
        fetchAllUsers();
        setIsEditUserModalOpen(false);
        setEditingUser(null);
      } else {
        const err = await response.json();
        console.error('DEBUG: Update user failed:', err);
        setEditUserError(err.error || 'Error al actualizar el usuario');
      }
    } catch (e) {
      console.error(e);
      setEditUserError('Error de conexión');
    }
  };

  const confirmDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      console.log('DEBUG: Sending DELETE request to /api/users/' + userToDelete);
      const response = await fetch(`/api/users/${userToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        console.log('DEBUG: User deleted successfully');
        fetchAllUsers();
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      } else {
        const contentType = response.headers.get("content-type");
        let errorMessage = 'Error al eliminar el usuario';
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const err = await response.json();
          errorMessage = err.error || errorMessage;
        }
        console.error('DEBUG: Delete failed:', errorMessage);
        alert(errorMessage);
      }
    } catch (e) {
      console.error('DEBUG: Error deleting user:', e);
      alert('Error de conexión al intentar eliminar el usuario');
    }
  };

  const handleSale = async (bookId: string) => {
    if (!currentUser) return;
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, quantity: 1, sellerId: currentUser.id })
      });
      if (response.ok) {
        fetchBooks();
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (e) {
      console.error(e);
    }
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este libro?')) return;
    try {
      const response = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setBooks(books.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = data.sort((a, b) => a.username.localeCompare(b.username));
        setAllUsers(sorted);
      } else {
        setAllUsers([]);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      fetchAllUsers();
    } catch (e) {}
  };

  const openModal = (book?: BookItem) => {
    setFrontImage(null);
    setBackImage(null);
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author,
        price: book.price,
        stock: book.stock,
        category: book.category || '',
        description: book.description || '',
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
        category: '',
        description: '',
        cover_url: '',
        contraportada_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
    setFrontImage(null);
    setBackImage(null);
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-[#2D1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#FDF2F0] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('catalog')}>
            <div className="bg-[#B23B23] p-2.5 rounded-xl shadow-lg shadow-[#B23B23]/20">
              <Library className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Librería Fátima</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#B23B23] font-bold">Catálogo Oficial</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título o autor..."
                className="pl-12 pr-6 py-3 bg-[#FFF9F5] border-none rounded-2xl text-sm w-80 focus:ring-2 focus:ring-[#B23B23] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {currentUser ? (
              <div className="flex items-center gap-3">
                {currentUser.role && ['admin', 'owner'].includes(currentUser.role) && (
                  <button 
                    onClick={() => {
                      setView(view === 'admin' ? 'catalog' : 'admin');
                      if (view === 'catalog') fetchAllUsers();
                    }}
                    className={`p-3 rounded-2xl transition-all ${view === 'admin' ? 'bg-[#B23B23] text-white' : 'bg-[#FDF2F0] text-gray-600 hover:bg-[#FBE9E7]'}`}
                  >
                    <Shield className="w-5 h-5" />
                  </button>
                )}
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setIsUserPanelOpen(!isUserPanelOpen)}
                    className="flex items-center gap-2 bg-[#FDF2F0] px-4 py-2.5 rounded-2xl hover:bg-[#FBE9E7] transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#B23B23] flex items-center justify-center text-white text-xs font-bold">
                      {currentUser.username[0].toUpperCase()}
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-xs font-bold leading-none">{currentUser.username}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  <AnimatePresence>
                    {isUserPanelOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50"
                      >
                        <button 
                          onClick={() => {
                            setIsPasswordModalOpen(true);
                            setIsUserPanelOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          Cambiar Contraseña
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        <button 
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          Cerrar Sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-[#B23B23] hover:bg-[#962D1A] text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#B23B23]/20 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Ingresar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {view === 'catalog' ? (
          <>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-4xl font-bold tracking-tight mb-2 text-[#2D1A1A]">Nuestro Catálogo</h2>
                <p className="text-gray-500 font-medium">Explora nuestra selección de libros disponibles.</p>
              </div>
              {currentUser && (
                <button
                  onClick={() => openModal()}
                  className="bg-[#B23B23] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#B23B23]/20 hover:scale-105 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Añadir Libro
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-[2.5rem] p-6 animate-pulse">
                    <div className="aspect-[3/4] bg-gray-100 rounded-3xl mb-6" />
                    <div className="h-6 bg-gray-100 rounded-full w-3/4 mb-3" />
                    <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                  </div>
                ))
              ) : filteredBooks.map((book) => (
                <motion.div
                  layout
                  key={book.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2.5rem] p-6 shadow-sm hover:shadow-2xl transition-all group relative border border-transparent hover:border-gray-100"
                >
                  <div className="aspect-[3/4] rounded-3xl overflow-hidden mb-6 bg-gray-50 relative">
                    {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        alt={book.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <BookOpen className="w-16 h-16" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1 mb-6">
                    <h3 className="text-xl font-bold leading-tight group-hover:text-[#B23B23] transition-colors line-clamp-2 text-[#2D1A1A]">{book.title}</h3>
                    <p className="text-gray-400 font-medium text-sm">{book.author}</p>
                    <p className="text-[#B23B23] font-black text-xl mt-2">${formatPrice(book.price)}</p>
                    {book.category && (
                      <span className="inline-block mt-2 px-3 py-1 bg-[#FDF2F0] rounded-full text-[10px] font-black uppercase tracking-widest text-[#B23B23]">
                        {book.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#FDF2F0]">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${book.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {book.stock > 0 ? `${book.stock} disponibles` : 'Sin stock'}
                      </span>
                    </div>
                    
                    {currentUser && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openModal(book)}
                          className="p-2.5 hover:bg-[#FDF2F0] rounded-xl text-gray-400 hover:text-[#B23B23] transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleSale(book.id)}
                          disabled={book.stock <= 0}
                          className="p-2.5 bg-[#B23B23] text-white rounded-xl hover:bg-[#962D1A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-bold tracking-tight mb-2 text-[#2D1A1A]">Panel de Administración</h2>
                <p className="text-gray-500 font-medium">Gestiona los usuarios y permisos de la librería.</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="bg-[#B23B23] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#B23B23]/20 hover:scale-105 transition-all"
                >
                  <User className="w-5 h-5" />
                  Nuevo Usuario
                </button>
                <button 
                  onClick={() => setView('catalog')}
                  className="text-gray-400 hover:text-[#2D1A1A] font-bold flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cerrar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-[#FDF2F0] overflow-visible">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-left border-collapse overflow-visible">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-[#FDF2F0]">
                      <th className="pb-6">Usuario</th>
                      <th className="pb-6">
                        <div className="flex items-center gap-2">
                          Rol Actual (V2)
                          <div className="relative group inline-block">
                            <HelpCircle className="w-5 h-5 text-gray-300 cursor-help hover:text-[#B23B23] transition-colors p-0.5" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-[#1A1A1A] text-white text-[11px] font-medium rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[9999] shadow-2xl border border-white/10 backdrop-blur-sm pointer-events-none">
                              <div className="space-y-3">
                                <p><span className="text-[#FF8A65] font-black uppercase tracking-tighter mr-1">Admin:</span> Gestiona usuarios, permisos y contraseñas. Acceso total al panel.</p>
                                <p><span className="text-[#FF8A65] font-black uppercase tracking-tighter mr-1">Vendedor:</span> Registra ventas y administra el stock de libros.</p>
                                <p><span className="text-[#FF8A65] font-black uppercase tracking-tighter mr-1">Owner:</span> Propietario del sistema con todos los privilegios.</p>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1A1A1A] rotate-45 -mt-1.5 border-r border-b border-white/10" />
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="pb-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FDF2F0]">
                    {allUsers.map((u) => (
                      <tr key={u.id} className="group">
                        <td className="py-6 font-bold flex items-center gap-3">
                          {u.username}
                          {u.role === 'owner' && <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Owner</span>}
                        </td>
                        <td className="py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            u.role === 'owner' ? 'bg-amber-100 text-amber-600' :
                            u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {u.role || 'vendedor'}
                          </span>
                        </td>
                        <td className="py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {u.role !== 'owner' && u.id !== currentUser.id && (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditUserFormData({ username: u.username, role: u.role || 'vendedor' });
                                    setIsEditUserModalOpen(true);
                                  }}
                                  className="p-2 text-[#B23B23] hover:bg-[#FDF2F0] rounded-lg transition-all"
                                  title="Editar Usuario"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedUserId(u.id);
                                    setIsAdminResetModalOpen(true);
                                  }}
                                  className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                  title="Resetear Contraseña"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    confirmDeleteUser(u.id);
                                  }}
                                  className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center group/trash"
                                  title="Eliminar Usuario"
                                >
                                  <Trash2 className="w-5 h-5 group-hover/trash:scale-110 transition-transform" />
                                </button>
                              </>
                            )}
                            {u.id === currentUser.id && (
                              <span className="text-[10px] font-bold text-gray-400 italic px-4">Tú (Sin acciones)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden p-12"
            >
              <h3 className="text-2xl font-bold mb-6">Cambiar Contraseña</h3>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Nueva Contraseña</label>
                  <input
                    required
                    type={showPasswords.change ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, change: !prev.change }))}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-[#B23B23] transition-colors"
                  >
                    {showPasswords.change ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Confirmar Nueva Contraseña</label>
                  <input
                    required
                    type={showPasswords.change ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    className={`w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold ${passwordError ? 'ring-2 ring-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, change: !prev.change }))}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-[#B23B23] transition-colors"
                  >
                    {showPasswords.change ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {passwordError && <p className="text-red-500 text-[10px] font-bold mt-2 ml-4">{passwordError}</p>}
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-[#B23B23] text-white rounded-2xl font-bold shadow-xl shadow-[#B23B23]/30 transition-all active:scale-95"
                >
                  Actualizar Contraseña
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Password Reset Modal */}
      <AnimatePresence>
        {isAdminResetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAdminResetModalOpen(false);
                setSelectedUserId(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden p-12"
            >
              <h3 className="text-2xl font-bold mb-2">Resetear Contraseña</h3>
              <p className="text-gray-500 text-sm mb-6 font-medium">Establece una nueva contraseña temporal para el usuario.</p>
              <form onSubmit={handleAdminResetPassword} className="space-y-6">
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Nueva Contraseña Temporal</label>
                  <input
                    required
                    type={showPasswords.adminReset ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (adminResetError) setAdminResetError('');
                    }}
                    className={`w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold ${adminResetError ? 'ring-2 ring-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, adminReset: !prev.adminReset }))}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-[#B23B23] transition-colors"
                  >
                    {showPasswords.adminReset ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Confirmar Nueva Contraseña</label>
                  <input
                    required
                    type={showPasswords.adminReset ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (adminResetError) setAdminResetError('');
                    }}
                    className={`w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold ${adminResetError ? 'ring-2 ring-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, adminReset: !prev.adminReset }))}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-[#B23B23] transition-colors"
                  >
                    {showPasswords.adminReset ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-[#B23B23] text-white rounded-2xl font-bold shadow-xl shadow-[#B23B23]/30 transition-all active:scale-95"
                >
                  Confirmar Nueva Contraseña
                </button>
                {adminResetError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-[10px] font-bold mt-2 ml-4"
                  >
                    {adminResetError}
                  </motion.p>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4">¿Eliminar Usuario?</h3>
              <p className="text-gray-400 text-sm mb-8">Esta acción no se puede deshacer. El usuario perderá todo acceso al sistema.</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={deleteUser}
                  className="w-full py-5 bg-red-500 text-white rounded-2xl font-bold shadow-xl shadow-red-500/30 transition-all active:scale-95"
                >
                  Sí, Eliminar Permanentemente
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl font-bold transition-all hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditUserModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden p-12"
            >
              <h3 className="text-2xl font-bold mb-6">Editar Usuario</h3>
              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Nombre de Usuario</label>
                  <input
                    required
                    value={editUserFormData.username}
                    onChange={(e) => {
                      setEditUserFormData({...editUserFormData, username: e.target.value});
                      if (editUserError) setEditUserError('');
                    }}
                    className={`w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold ${editUserError && editUserError.includes('existe') ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Rol</label>
                  <select
                    value={editUserFormData.role}
                    onChange={(e) => setEditUserFormData({...editUserFormData, role: e.target.value as any})}
                    className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-[#B23B23] text-white rounded-2xl font-bold shadow-xl shadow-[#B23B23]/30 transition-all active:scale-95"
                >
                  Guardar Cambios
                </button>
                {editUserError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-[10px] font-bold mt-2 ml-4"
                  >
                    {editUserError}
                  </motion.p>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden p-12"
            >
              <h3 className="text-2xl font-bold mb-6">Crear Nuevo Usuario</h3>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Nombre de Usuario</label>
                  <input
                    required
                    value={userFormData.username}
                    onChange={(e) => {
                      setUserFormData({...userFormData, username: e.target.value});
                      if (userError) setUserError('');
                    }}
                    className={`w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold ${userError && userError.includes('existe') ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Contraseña Temporal</label>
                  <input
                    required
                    type={showPasswords.createUser ? "text" : "password"}
                    value={userFormData.password}
                    onChange={(e) => {
                      setUserFormData({...userFormData, password: e.target.value});
                      if (userError) setUserError('');
                    }}
                    className={`w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold ${userError && !userError.includes('existe') ? 'ring-2 ring-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, createUser: !prev.createUser }))}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-[#B23B23] transition-colors"
                  >
                    {showPasswords.createUser ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Confirmar Contraseña</label>
                  <input
                    required
                    type={showPasswords.createUser ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (userError) setUserError('');
                    }}
                    className={`w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold ${userError && !userError.includes('existe') ? 'ring-2 ring-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, createUser: !prev.createUser }))}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-[#B23B23] transition-colors"
                  >
                    {showPasswords.createUser ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Rol</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({...userFormData, role: e.target.value as any})}
                    className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-[#B23B23] text-white rounded-2xl font-bold shadow-xl shadow-[#B23B23]/30 transition-all active:scale-95"
                >
                  Crear Usuario
                </button>
                {userError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-[10px] font-bold mt-2 ml-4"
                  >
                    {userError}
                  </motion.p>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden p-12"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-[#FFF9F5] rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                  <Library className="w-10 h-10 text-[#B23B23]" />
                </div>
                <h3 className="text-3xl font-bold mb-2">Bienvenido</h3>
                <p className="text-gray-400 font-medium">Ingresa tus credenciales para continuar.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Usuario</label>
                  <input
                    required
                    name="username"
                    value={loginForm.username}
                    onChange={handleLoginChange}
                    autoComplete="off"
                    className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                    placeholder="Tu nombre de usuario"
                  />
                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50"
                      >
                        {suggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setLoginForm(prev => ({ ...prev, username: s.username }));
                              setSuggestions([]);
                            }}
                            className="w-full px-6 py-3 text-left hover:bg-gray-50 flex items-center justify-between group"
                          >
                            <span className="font-bold text-sm">{s.username}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-4">Contraseña</label>
                  <input
                    required
                    type={showPasswords.login ? "text" : "password"}
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, login: !prev.login }))}
                    className="absolute right-4 top-[38px] text-gray-400 hover:text-[#B23B23] transition-colors"
                  >
                    {showPasswords.login ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-[#B23B23] hover:bg-[#962D1A] text-white rounded-2xl font-bold shadow-xl shadow-[#B23B23]/30 transition-all active:scale-95 mt-4"
                >
                  Iniciar Sesión
                </button>
                {loginError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-xs font-bold text-center mt-4 bg-red-50 py-3 rounded-xl border border-red-100"
                  >
                    {loginError}
                  </motion.p>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Book Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden"
            >
              <div className="px-12 py-10 border-b border-[#FDF2F0] flex items-center justify-between bg-[#FDF2F0]/30">
                <div>
                  <h3 className="text-3xl font-bold text-[#2D1A1A]">{editingBook ? 'Editar Libro' : 'Nuevo Libro'}</h3>
                  <p className="text-gray-400 text-sm mt-1">Completa la información o usa la IA para escanear.</p>
                </div>
                <button onClick={closeModal} className="p-4 hover:bg-white rounded-3xl transition-all">
                  <X className="w-8 h-8" />
                </button>
              </div>
              
              <div className="p-12 overflow-y-auto max-h-[75vh]">
                {!editingBook && (
                  <div className="mb-12">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-[#B23B23]" />
                      Escaneo Inteligente
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Front Cover Upload */}
                      <div 
                        onClick={() => frontInputRef.current?.click()}
                        className="relative aspect-[3/4] bg-[#FFF9F5] rounded-[2.5rem] border-2 border-dashed border-gray-200 hover:border-[#B23B23] transition-all cursor-pointer group overflow-hidden"
                      >
                        {frontImage ? (
                          <img src={frontImage} className="w-full h-full object-cover" alt="Portada" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-[#B23B23]">
                            <Camera className="w-12 h-12 mb-4" />
                            <p className="font-bold text-sm">Foto de Portada</p>
                            <p className="text-[10px] uppercase tracking-widest mt-2">Click para subir</p>
                          </div>
                        )}
                        <input type="file" ref={frontInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} />
                      </div>

                      {/* Back Cover Upload */}
                      <div 
                        onClick={() => backInputRef.current?.click()}
                        className="relative aspect-[3/4] bg-[#FFF9F5] rounded-[2.5rem] border-2 border-dashed border-gray-200 hover:border-[#B23B23] transition-all cursor-pointer group overflow-hidden"
                      >
                        {backImage ? (
                          <img src={backImage} className="w-full h-full object-cover" alt="Contraportada" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-[#B23B23]">
                            <ImageIcon className="w-12 h-12 mb-4" />
                            <p className="font-bold text-sm">Foto de Reverso</p>
                            <p className="text-[10px] uppercase tracking-widest mt-2">Click para subir</p>
                          </div>
                        )}
                        <input type="file" ref={backInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
                      </div>
                    </div>

                    {(frontImage || backImage) && (
                      <button
                        onClick={scanWithAI}
                        disabled={isScanning}
                        className="w-full mt-8 py-5 bg-[#B23B23] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-[#B23B23]/30 hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Analizando con IA...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-6 h-6" />
                            Completar Automáticamente con IA
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Título del Libro</label>
                        <input
                          required
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                          placeholder="Ej: La Lámpara Bajo el Celemín"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Autor</label>
                        <input
                          required
                          name="author"
                          value={formData.author}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                          placeholder="Ej: Álvaro Calderón"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Categoría</label>
                        <input
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                          placeholder="Ej: Espiritualidad, Historia..."
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Precio</label>
                          <input
                            required
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Stock</label>
                          <input
                            required
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleInputChange}
                            className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Descripción (Contraportada)</label>
                        <textarea
                          name="description"
                          rows={4}
                          value={formData.description}
                          onChange={handleInputChange}
                          className="w-full px-6 py-4 bg-[#FFF9F5] border-none rounded-2xl focus:ring-2 focus:ring-[#B23B23] outline-none transition-all font-bold resize-none"
                          placeholder="Breve resumen del libro..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-6 pt-10 border-t border-[#FDF2F0]">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-10 py-5 rounded-2xl text-sm font-bold text-gray-400 hover:bg-[#FDF2F0] transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-12 py-5 bg-[#B23B23] hover:bg-[#962D1A] text-white rounded-2xl font-bold shadow-2xl shadow-[#B23B23]/30 flex items-center gap-3 transition-all active:scale-95"
                    >
                      <Save className="w-6 h-6" />
                      {editingBook ? 'Guardar Cambios' : 'Crear Libro'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

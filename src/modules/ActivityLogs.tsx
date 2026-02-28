import React, { useState, useEffect } from 'react';
import { Search, Clock, History } from 'lucide-react';
import { ActivityLog } from '../types';

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          console.error("Failed to fetch logs:", data);
          setLogs([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // TRADUCTOR DE ACCIONES A ESPAÑOL AMIGABLE
  const translateAction = (action: string) => {
    const dictionary: Record<string, string> = {
      'LOGIN': 'Inicio de Sesión',
      'LOGOUT': 'Cierre de Sesión',
      'SALE': 'Venta Realizada',
      'SALE_DELETE': 'Venta Eliminada',
      'SALE_UPDATE': 'Venta Editada',
      'STOCK_UPDATE': 'Stock Actualizado',
      'USER_CREATE': 'Usuario Creado',
      'USER_UPDATE': 'Usuario Editado', // <-- Faltaba esto
      'USER_DELETE': 'Usuario Eliminado',
      'BOOK_CREATE': 'Libro Añadido',
      'BOOK_UPDATE': 'Libro Editado',
      'BOOK_DELETE': 'Libro Eliminado',
      'DEBT_PAYMENT': 'Pago de Deuda',
      'PAYMENT_DELETE': 'Pago Eliminado',
      'CLIENT_UPDATE': 'Cliente Editado'
    };
    return dictionary[action] || action;
  };

  // TRADUCTOR INTELIGENTE (ELIMINA IDs, FORMATEA Y ABRE OBJETOS)
  const formatDetails = (details: any) => {
    if (!details || Object.keys(details).length === 0) return 'Sin detalles adicionales';

    const formatPrice = (val: number) => `$${Number(val).toLocaleString('es-CL')}`;

    const keyDictionary: Record<string, string> = {
      clientName: 'Cliente',
      total: 'Total',
      itemsCount: 'Artículos',
      amountPaid: 'Monto pagado',
      stock: 'Stock',
      newStock: 'Nuevo stock', // <-- Faltaba
      title: 'Título',
      bookTitle: 'Libro',      // <-- Faltaba
      author: 'Autor',
      username: 'Usuario',
      newUsername: 'Nuevo usuario', // <-- Faltaba
      deletedUsername: 'Usuario eliminado', // <-- Faltaba
      role: 'Rol',
      price: 'Precio',
      name: 'Nombre',
      details: 'Detalle'
    };

    // MAGIA: Si hay un objeto anidado llamado "updates" (que causaba el [object Object]), lo desarmamos.
    let flatDetails = { ...details };
    if (flatDetails.updates && typeof flatDetails.updates === 'object') {
      const { updates, ...rest } = flatDetails;
      flatDetails = { ...rest, ...updates }; // Mezcla lo que hay adentro de "updates" con el resto
    }

    const validEntries = Object.entries(flatDetails).filter(([key]) => {
      const lowerKey = key.toLowerCase();
      // Ocultar cualquier cosa que parezca un ID, URL, contraseña o correo y cosas internas como 'lowercase'
      if (lowerKey.includes('id') || lowerKey.includes('url') || lowerKey.includes('email') || lowerKey.includes('password') || lowerKey.includes('lowercase')) {
        return false;
      }
      return true;
    });

    if (validEntries.length === 0) return 'Acción registrada.';

    return validEntries
      .map(([key, value]) => {
        const translatedKey = keyDictionary[key] || key;
        
        let finalValue = value;
        if (typeof value === 'number' && ['total', 'amountPaid', 'price'].includes(key)) {
          finalValue = formatPrice(value);
        } else if (typeof value === 'object' && value !== null) {
          // Por si hay otro objeto escondido, lo vuelve texto plano separado por comas
          finalValue = Object.values(value).join(', ');
        }

        return `${translatedKey}: ${finalValue}`;
      })
      .join(' • ');
  };

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    return log.username.toLowerCase().includes(search) ||
           translateAction(log.action).toLowerCase().includes(search) ||
           formatDetails(log.details).toLowerCase().includes(search);
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': 
      case 'DEBT_PAYMENT': return 'text-emerald-600 bg-emerald-50';
      case 'LOGOUT': return 'text-orange-600 bg-orange-50';
      case 'SALE': return 'text-blue-600 bg-blue-50';
      case 'SALE_UPDATE':
      case 'STOCK_UPDATE':
      case 'BOOK_CREATE':
      case 'BOOK_UPDATE': return 'text-purple-600 bg-purple-50';
      case 'USER_CREATE':
      case 'USER_UPDATE': return 'text-indigo-600 bg-indigo-50'; // <-- Añadido color para Update
      case 'USER_DELETE': 
      case 'BOOK_DELETE': 
      case 'SALE_DELETE': 
      case 'PAYMENT_DELETE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // FECHA ELEGANTE EN 24 HORAS
  const formatDate = (date: any) => {
    if (!date) return 'Fecha desconocida';
    const d = new Date(date);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">Logs de Actividad</h2>
          <p className="text-sm sm:text-base text-gray-500 font-medium">Registro completo de todas las acciones en el sistema.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar actividad..."
            className="pl-12 pr-6 py-4 sm:py-3 bg-white border border-[var(--color-warm-surface)] rounded-2xl text-sm w-full focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* VISTA ESCRITORIO (TABLA FLEXIBLE) */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-[var(--color-warm-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[var(--color-warm-surface)]">
                <th className="px-8 py-6 whitespace-nowrap">Fecha y Hora</th>
                <th className="px-8 py-6">Usuario</th>
                <th className="px-8 py-6">Acción</th>
                <th className="px-8 py-6">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-warm-surface)]">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-full w-full" /></td>
                  </tr>
                ))
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-warm-bg)] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{formatDate(log.timestamp)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {log.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-[var(--color-primary)] text-sm whitespace-nowrap">{log.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block whitespace-nowrap ${getActionColor(log.action)}`}>
                      {translateAction(log.action)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm text-gray-600 font-medium leading-relaxed whitespace-normal break-words">
                      {formatDetails(log.details)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {!loading && filteredLogs.length === 0 && (
           <div className="p-12 text-center text-gray-400 font-medium flex flex-col items-center justify-center">
             <History className="w-12 h-12 mb-4 opacity-50" />
             No se encontraron registros de actividad.
           </div>
        )}
      </div>

      {/* VISTA MÓVIL (TARJETAS) */}
      <div className="md:hidden space-y-4">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={`mob-skel-${i}`} className="bg-white p-5 rounded-[2rem] border border-[var(--color-warm-surface)] animate-pulse h-28" />
          ))
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map(log => (
            <div key={`mob-${log.id}`} className="bg-white p-5 rounded-[2rem] shadow-sm border border-[var(--color-warm-surface)] space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-white font-black shrink-0 shadow-md shadow-[var(--color-primary)]/20">
                    {log.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-primary)] text-base truncate">{log.username}</p>
                    <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {formatDate(log.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                 <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block mb-3 ${getActionColor(log.action)}`}>
                    {translateAction(log.action)}
                 </span>
                 <div className="bg-[var(--color-warm-bg)] p-3.5 rounded-xl text-xs text-gray-600 font-medium leading-relaxed border border-[var(--color-warm-surface)]">
                   {formatDetails(log.details)}
                 </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-300">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm">No se encontraron registros.</p>
          </div>
        )}
      </div>
    </div>
  );
}
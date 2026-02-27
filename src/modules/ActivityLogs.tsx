import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Calendar, User, Info, Clock } from 'lucide-react';
import { motion } from 'motion/react';
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

  const filteredLogs = logs.filter(log => 
    log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'text-emerald-500 bg-emerald-50';
      case 'LOGOUT': return 'text-orange-500 bg-orange-50';
      case 'SALE': return 'text-blue-500 bg-blue-50';
      case 'STOCK_UPDATE': return 'text-purple-500 bg-purple-50';
      case 'USER_CREATE': return 'text-indigo-500 bg-indigo-50';
      case 'USER_DELETE': return 'text-red-500 bg-red-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const formatDate = (date: any) => {
    const d = new Date(date);
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Logs de Actividad</h2>
          <p className="text-gray-500 font-medium">Registro completo de todas las acciones en el sistema.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por usuario o acción..."
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
                <th className="px-8 py-6">Fecha y Hora</th>
                <th className="px-8 py-6">Usuario</th>
                <th className="px-8 py-6">Acción</th>
                <th className="px-8 py-6">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FDF2F0]">
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-full w-full" /></td>
                  </tr>
                ))
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FFF9F5] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#B23B23] flex items-center justify-center text-white text-[10px] font-bold">
                        {log.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-[#2D1A1A] text-sm">{log.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs text-gray-500 font-medium max-w-md truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(log.details || {}).filter(([key]) => key !== 'email')
                        )
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
  );
}

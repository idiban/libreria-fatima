import React, { useState, useEffect } from 'react';
import { History, Search, Edit2, Check, X, Loader2, Filter, Calendar, User, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { SaleRecord } from '../types';

export default function SalesHistory() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await fetch('/api/sales');
        const data = await res.json();
        if (Array.isArray(data)) {
          setSales(data);
        } else {
          console.error("Failed to fetch sales:", data);
          setSales([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, []);

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatDate = (date: any) => {
    const d = new Date(date);
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = (sale: SaleRecord) => {
    setEditingId(sale.id);
    setEditData({ ...sale });
  };

  const handleSave = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/sales/${editData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (response.ok) {
        setSales(sales.map(s => s.id === editData.id ? editData : s));
        setEditingId(null);
        setEditData(null);
      }
    } catch (e) {
      alert('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const clientName = sale.clientName || '';
    const sellerName = sale.sellerName || '';

    return clientName.toLowerCase().includes(lowerCaseSearchTerm) ||
           sellerName.toLowerCase().includes(lowerCaseSearchTerm) ||
           sale.items.some(i => (i.title || '').toLowerCase().includes(lowerCaseSearchTerm));
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Historial de Ventas</h2>
          <p className="text-gray-500 font-medium">Visualiza y edita todas las transacciones realizadas.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, vendedor o libro..."
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
                <th className="px-8 py-6">Fecha</th>
                <th className="px-8 py-6">Cliente</th>
                <th className="px-8 py-6">Productos</th>
                <th className="px-8 py-6">Total</th>
                <th className="px-8 py-6">Pagado</th>
                <th className="px-8 py-6">Deuda</th>
                <th className="px-8 py-6">Vendedor</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FDF2F0]">
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-full w-full" /></td>
                  </tr>
                ))
              ) : filteredSales && filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-[#FFF9F5] transition-colors group">
                  <td className="px-8 py-6 text-xs text-gray-500 font-bold">{formatDate(sale.timestamp)}</td>
                  <td className="px-8 py-6">
                    {editingId === sale.id ? (
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-[#B23B23] rounded-lg text-sm font-bold"
                        value={editData.clientName}
                        onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                      />
                    ) : (
                      <span className="font-bold text-[#2D1A1A]">{sale.clientName}</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs text-gray-500 font-medium max-w-xs truncate">
                      {sale.items && sale.items.map(i => `${i.quantity}x ${i.title}`).join(', ')}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {editingId === sale.id ? (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          className="w-24 pl-5 pr-2 py-2 bg-white border border-[#B23B23] rounded-lg text-sm font-black"
                          value={editData.total}
                          onChange={(e) => setEditData({ ...editData, total: Number(e.target.value) })}
                        />
                      </div>
                    ) : (
                      <span className="font-black text-[#2D1A1A]">${formatPrice(sale.total ?? 0)}</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    {editingId === sale.id ? (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          className="w-24 pl-5 pr-2 py-2 bg-white border border-[#B23B23] rounded-lg text-sm font-black"
                          value={editData.amountPaid}
                          onChange={(e) => setEditData({ ...editData, amountPaid: Number(e.target.value) })}
                        />
                      </div>
                    ) : (
                      <span className="font-black text-emerald-600">${formatPrice(sale.amountPaid ?? 0)}</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`font-black ${sale.debt > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                      ${formatPrice((sale.total ?? 0) - (sale.amountPaid ?? 0))}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#B23B23] flex items-center justify-center text-white text-[8px] font-bold">
                        {sale.sellerName ? sale.sellerName[0].toUpperCase() : '?'}
                      </div>
                      <span className="text-xs font-bold text-gray-500">{sale.sellerName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {editingId === sale.id ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditData(null);
                          }}
                          className="p-2 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(sale)}
                        className="p-2 hover:bg-[#FDF2F0] rounded-xl text-gray-400 hover:text-[#B23B23] transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
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

import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Edit2, Check, X, Loader2, DollarSign, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { ClientRecord } from '../types';

export default function DebtorsList() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDebt, setEditDebt] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        setClients(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleSave = async (client: ClientRecord) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalDebt: editDebt })
      });
      if (response.ok) {
        setClients(clients.map(c => c.id === client.id ? { ...c, totalDebt: editDebt } : c));
        setEditingId(null);
      }
    } catch (e) {
      alert('Error al actualizar la deuda');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) && client.totalDebt > 0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Deudores</h2>
          <p className="text-gray-500 font-medium">Gestiona los pagos pendientes de tus clientes.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            className="pl-12 pr-6 py-3 bg-white border border-[#FDF2F0] rounded-2xl text-sm w-full md:w-80 focus:ring-2 focus:ring-[#B23B23] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] animate-pulse">
              <div className="h-6 bg-gray-100 rounded-full w-3/4 mb-4" />
              <div className="h-4 bg-gray-100 rounded-full w-1/2" />
            </div>
          ))
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-[#2D1A1A]">¡Todo al día!</h3>
            <p className="text-gray-400 font-medium">No hay clientes con deudas pendientes.</p>
          </div>
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={client.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0] relative group overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 opacity-10 -mr-8 -mt-8 rounded-full group-hover:scale-150 transition-transform duration-500" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#B23B23] flex items-center justify-center text-white shadow-lg shadow-[#B23B23]/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#2D1A1A] leading-tight">{client.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cliente</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Deuda Total</p>
              {editingId === client.id ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      className="w-full pl-10 pr-4 py-3 bg-[#FFF9F5] border-2 border-[#B23B23] rounded-2xl outline-none font-black text-xl"
                      value={editDebt}
                      onChange={(e) => setEditDebt(Number(e.target.value))}
                    />
                  </div>
                  <button
                    onClick={() => handleSave(client)}
                    disabled={isSaving}
                    className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-black text-red-500">${formatPrice(client.totalDebt)}</p>
                  <button
                    onClick={() => {
                      setEditingId(client.id);
                      setEditDebt(client.totalDebt);
                    }}
                    className="p-3 bg-[#FDF2F0] text-[#B23B23] rounded-2xl hover:bg-[#B23B23] hover:text-white transition-all shadow-sm"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-[#FDF2F0] flex items-center gap-2 text-orange-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Pago Pendiente</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

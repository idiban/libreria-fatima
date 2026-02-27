import React, { useState, useEffect } from 'react';
import { Contact, Search, Edit2, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ClientRecord } from '../types';
import ClientDetailModal from './ClientDetailModal';

export default function ClientsList() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setClients(data.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          setClients([]);
        }
      } else {
        setClients([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">Gestión de Clientes</h2>
          <p className="text-sm sm:text-base text-gray-500 font-medium">Administra la información y el historial de tus clientes.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="pl-12 pr-6 py-4 sm:py-3 bg-white border border-[var(--color-warm-surface)] rounded-2xl text-sm w-full sm:w-64 md:w-80 focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-[var(--color-warm-surface)] animate-pulse h-20" />
          ))
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedClient(client)}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-[var(--color-primary)] transition-all cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-warm-bg)] flex items-center justify-center text-[var(--color-primary)] text-xl font-black group-hover:scale-110 transition-transform">
                {client.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-primary)] leading-tight">{client.name}</h3>

              </div>
            </div>
            <div className="text-center bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2">
              <p className="text-xl font-black text-emerald-600">{client.totalItemsPurchased || 0}</p>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Artículos</p>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedClient && (
        <ClientDetailModal 
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={() => {
            fetchClients();
          }}
        />
      )}
    </div>
  );
}

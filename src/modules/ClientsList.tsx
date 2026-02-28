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

      {/* Nueva disposición en Grid (tarjetas cuadradas pequeñas) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {loading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-[var(--color-warm-surface)] animate-pulse h-32" />
          ))
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={client.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSelectedClient(client)}
            className="bg-white p-4 sm:p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-[var(--color-primary)] transition-all cursor-pointer group flex flex-col items-center justify-center gap-3 text-center h-full"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--color-warm-bg)] flex items-center justify-center text-[var(--color-primary)] text-xl sm:text-2xl font-black group-hover:scale-110 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all shadow-sm shrink-0">
              {client.name[0].toUpperCase()}
            </div>
            <h3 className="font-bold text-[var(--color-primary)] text-xs sm:text-sm leading-tight break-words w-full">
              {client.name}
            </h3>
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
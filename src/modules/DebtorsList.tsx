import React, { useState, useEffect } from 'react';
import { UserCheck, Search, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { ClientRecord, BookItem } from '../types';

// Suponiendo que tienes un modal para el detalle de la deuda
import DebtorDetailModal from './DebtorDetailModal';

export default function DebtorsList({ books }: { books: BookItem[] }) {
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
          setClients(data.filter(c => c.totalDebt > 0));
        } else {
          setClients([]);
        }
      } else {
        // No se puede hacer logout desde aquí, pero se puede limpiar la lista
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

  // Mejora 2: Ordenar de mayor a menor deuda (.sort)
  const filteredClients = clients
    .filter(client => client.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.totalDebt - a.totalDebt);

  // Mejora 1: Cálculo del total de deudas
  const totalDebtSum = clients.reduce((acc, client) => acc + client.totalDebt, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">Deudores</h2>
          <p className="text-gray-500 font-medium">Gestiona los pagos pendientes de tus clientes.</p>
          
          {/* Mejora 1: Renderizado condicional del total de deudas */}
          {totalDebtSum > 0 && (
            <p className="text-red-500 font-bold text-xl mt-3 flex items-center gap-1">
              Total deudas: ${formatPrice(totalDebtSum)}
            </p>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            className="pl-12 pr-6 py-3 bg-white border border-[var(--color-warm-surface)] rounded-2xl text-sm w-full md:w-80 focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* VISTA MÓVIL: Grilla de tarjetas original (se oculta en md) */}
      <div className="grid md:hidden grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={`loading-debtor-${i}`} className="bg-white rounded-[2rem] p-4 animate-pulse">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4" />
              <div className="h-4 bg-gray-100 rounded-full w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-gray-100 rounded-full w-1/2 mx-auto" />
            </div>
          ))
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <h3 className="text-2xl font-bold text-[var(--color-primary)]">¡Felicitaciones!</h3>
            <p className="text-gray-500 mt-2">No hay deudores pendientes.</p>
          </div>
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={client.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all group relative border border-transparent hover:border-gray-100 cursor-pointer text-center"
            onClick={() => setSelectedClient(client)}
          >
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-4xl font-black mx-auto mb-4 group-hover:scale-110 transition-transform">
              {client.name?.[0]?.toUpperCase() || ''}
            </div>
            <h3 
              className="font-bold text-[var(--color-primary)] leading-tight break-words"
              style={{ 
                fontSize: client.name?.length > 20 ? '0.75rem' : client.name?.length > 15 ? '0.875rem' : '1.125rem' 
              }}
            >
              {client.name}
            </h3>
            <p className="text-red-500 font-black text-2xl mt-2">${formatPrice(client.totalDebt)}</p>
          </motion.div>
        ))}
      </div>

      {/* VISTA WEB: Lista estructurada nueva (se muestra a partir de md) */}
      <div className="hidden md:flex flex-col gap-3">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={`loading-debtor-web-${i}`} className="bg-white rounded-2xl p-4 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-4 w-1/3">
                <div className="w-12 h-12 bg-gray-100 rounded-full shrink-0" />
                <div className="h-4 bg-gray-100 rounded-full w-full" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-24" />
            </div>
          ))
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold text-[var(--color-primary)]">¡Felicitaciones!</h3>
            <p className="text-gray-500 mt-2">No hay deudores pendientes.</p>
          </div>
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={`web-${client.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group border border-transparent hover:border-[var(--color-primary)] cursor-pointer flex items-center justify-between"
            onClick={() => setSelectedClient(client)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl font-black group-hover:scale-110 transition-transform shrink-0">
                {client.name?.[0]?.toUpperCase() || ''}
              </div>
              <h3 className="font-bold text-[var(--color-primary)] text-lg">
                {client.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-gray-400 font-medium text-sm">Deuda:</p>
              <p className="text-red-500 font-black text-xl">${formatPrice(client.totalDebt)}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedClient && (
        <DebtorDetailModal 
          client={selectedClient}
          books={books}
          onClose={() => setSelectedClient(null)}
          onPaymentSuccess={() => { // Refetch clients or update locally
            setSelectedClient(null);
            fetchClients(); 
          }}
        />
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Contact, Search, Edit2, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ClientRecord } from '../types';
import ClientDetailModal from './ClientDetailModal';

interface ClientsListProps {
  clients: ClientRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export default function ClientsList({ clients, loading, onRefresh }: ClientsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  const formatPrice = (price: number) => {
    return Number(price || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const normalizeText = (text: string) => {
    return (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const normalizedSearch = normalizeText(searchTerm);

  const filteredClients = clients.filter(client => 
    normalizeText(client.name).includes(normalizedSearch)
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

      {/* VISTA MÓVIL: Disposición en Grid */}
      <div className="grid md:hidden grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          Array(10).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-[var(--color-warm-surface)] animate-pulse h-40" />
          ))
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={client.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSelectedClient(client)}
            className="bg-white p-4 sm:p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-[var(--color-primary)] transition-all cursor-pointer group flex flex-col items-center text-center h-full"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--color-warm-bg)] flex items-center justify-center text-[var(--color-primary)] text-xl sm:text-2xl font-black group-hover:scale-110 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all shadow-sm shrink-0 mb-3">
              {client.name[0].toUpperCase()}
            </div>
            
            <h3 className="font-bold text-[var(--color-primary)] text-xs sm:text-sm leading-tight break-words w-full">
              {client.name}
            </h3>

            {/* Compras: texto sutil y limpio */}
            {(client.purchaseCount && client.purchaseCount > 0) ? (
              <p className="text-[10px] text-gray-400 font-medium mt-1">
                {client.purchaseCount} {client.purchaseCount === 1 ? 'compra' : 'compras'}
              </p>
            ) : null}
            
            {/* Resumen Móvil Mejorado (Tipo Fila / Key-Value) */}
            <div className="flex flex-col w-full mt-auto pt-3 gap-1.5">
              {(client.totalDebt > 0) && (
                <div className="flex items-center justify-between bg-red-50/50 px-2.5 py-1.5 rounded-xl border border-red-50">
                  <span className="text-[8px] sm:text-[9px] font-black text-red-400 uppercase tracking-widest">Deuda</span>
                  <span className="text-xs sm:text-sm font-black text-red-600">${formatPrice(client.totalDebt)}</span>
                </div>
              )}
              {(client.creditBalance > 0) && (
                <div className="flex items-center justify-between bg-emerald-50/50 px-2.5 py-1.5 rounded-xl border border-emerald-50">
                  <span className="text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-widest">Favor</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-600">${formatPrice(client.creditBalance)}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* VISTA WEB: Diseño de lista */}
      <div className="hidden md:flex flex-col gap-3">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={`loading-client-web-${i}`} className="bg-white p-4 rounded-2xl shadow-sm border border-[var(--color-warm-surface)] animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0" />
                <div className="h-4 bg-gray-100 rounded-full w-48" />
              </div>
              <div className="flex gap-4">
                 <div className="w-16 h-8 bg-gray-100 rounded-lg" />
                 <div className="w-24 h-8 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))
        ) : filteredClients.map((client) => (
          <motion.div
            layout
            key={`web-${client.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedClient(client)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-transparent hover:border-[var(--color-primary)] transition-all cursor-pointer group flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-warm-bg)] flex items-center justify-center text-[var(--color-primary)] text-xl font-black group-hover:scale-110 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all shadow-sm shrink-0">
                {client.name[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-[var(--color-primary)] text-lg leading-tight">
                  {client.name}
                </h3>
                {/* Compras como subtítulo bajo el nombre */}
                {(client.purchaseCount && client.purchaseCount > 0) ? (
                  <span className="text-[11px] sm:text-xs text-gray-400 font-medium mt-0.5">
                    {client.purchaseCount} {client.purchaseCount === 1 ? 'compra' : 'compras'}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Resumen Web: Un solo espacio a la derecha para Deuda o A Favor */}
            <div className="flex flex-col items-end shrink-0 w-24">
              {(client.totalDebt > 0) ? (
                <>
                  <span className="text-[9px] font-black text-red-400/80 uppercase tracking-widest">Deuda</span>
                  <span className="text-sm font-bold text-red-600">${formatPrice(client.totalDebt)}</span>
                </>
              ) : (client.creditBalance && client.creditBalance > 0) ? (
                <>
                  <span className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest">A favor</span>
                  <span className="text-sm font-bold text-emerald-600">${formatPrice(client.creditBalance)}</span>
                </>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>

      {selectedClient && (
        <ClientDetailModal 
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
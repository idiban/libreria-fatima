import React, { useState, useEffect } from 'react';
import { History, Search, Calendar, User, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';
import { SaleRecord, UserProfile } from '../types';
import EditSaleModal from './SaleModal';

interface SalesHistoryProps {
  currentUser: UserProfile;
  sales: SaleRecord[];
  clients: any[];
  loading: boolean;
  onRefresh: () => void;
}

export default function SalesHistory({ currentUser, sales, clients, loading, onRefresh }: SalesHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatRut = (rut: string) => {
    if (!rut) return '';
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedBody}-${dv}`;
  };

  const formatDate = (date: any) => {
    const d = new Date(date);
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const filteredSales = sales.filter(sale => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const clientName = sale.clientName || '';
    const sellerName = sale.sellerName || '';
    const paymentMethods = Array.isArray(sale.paymentMethod) ? sale.paymentMethod.join(' ') : (sale.paymentMethod || '');
    // Convertimos el total a string para permitir la búsqueda
    const totalAmount = (sale.total ?? 0).toString();

    return clientName.toLowerCase().includes(lowerCaseSearchTerm) ||
           sellerName.toLowerCase().includes(lowerCaseSearchTerm) ||
           paymentMethods.toLowerCase().includes(lowerCaseSearchTerm) ||
           totalAmount.includes(lowerCaseSearchTerm) ||
           sale.items.some(i => (i.title || '').toLowerCase().includes(lowerCaseSearchTerm));
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[var(--color-primary)]">Historial de Ventas</h2>
          <p className="text-gray-500 font-medium">Visualiza y edita todas las transacciones realizadas.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, monto, pago o libro..."
            className="pl-12 pr-6 py-3 bg-white border border-[var(--color-warm-surface)] rounded-2xl text-sm w-full md:w-80 focus:ring-2 focus:ring-[var(--color-primary)] transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-transparent animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-32" />
                  <div className="h-3 bg-gray-100 rounded-full w-24" />
                </div>
              </div>
            </div>
          ))
        ) : filteredSales.length > 0 ? (
          filteredSales.map((sale) => {
            return (
              <motion.div
                layout
                key={sale.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedSale(sale)}
                className="bg-white p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-[var(--color-primary)] transition-all cursor-pointer group flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--color-warm-bg)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:scale-110 transition-transform">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-primary)] leading-tight">{formatDate(sale.timestamp)}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs text-gray-600 font-bold">{sale.clientName}</p>
                        </div>
                        {sale.clientRut && (
                          <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-md">
                            <Fingerprint className="w-3 h-3 text-gray-400" />
                            <p className="text-[10px] text-gray-500 font-black">{formatRut(sale.clientRut)}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-[6px] font-bold">
                          {sale.sellerName ? sale.sellerName[0].toUpperCase() : '?'}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Vendedor: {sale.sellerName}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 sm:gap-10 bg-gray-50 p-3 rounded-2xl sm:bg-transparent sm:p-0">
                    <div className="flex-1 sm:flex-none text-right sm:text-left">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Venta</p>
                      <p className="font-black text-lg text-[var(--color-primary)]">${formatPrice(sale.total ?? 0)}</p>
                    </div>
                    <div className="flex-1 sm:flex-none text-right sm:text-left">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pagado</p>
                      <p className="font-black text-lg text-emerald-600">${formatPrice(sale.amountPaid ?? 0)}</p>
                    </div>
                  </div>
                </div>

                {/* AQUÍ ESTÁ EL CAMBIO: Agregamos !! para forzar que sea un booleano verdadero/falso */}
                {!!(sale.notes || (sale.paymentMethod && sale.paymentMethod.length > 0) || (sale.discount && sale.discount > 0)) && (
                  <div className="mt-1 pt-3 border-t border-gray-100/50 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="space-y-2">
                      {sale.paymentMethod && sale.paymentMethod.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(sale.paymentMethod as any).includes('efectivo') && <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">Efectivo</span>}
                          {(sale.paymentMethod as any).includes('transferencia') && <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">Transferencia</span>}
                        </div>
                      )}
                      {sale.notes && <p className="text-xs text-gray-500 italic max-w-lg bg-gray-50 p-2 rounded-lg">"{sale.notes}"</p>}
                    </div>
                    {sale.discount && sale.discount > 0 ? (
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg uppercase tracking-widest">Desc. {sale.discount}%</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No se encontraron ventas.</p>
          </div>
        )}
      </div>

      {selectedSale && (
        <EditSaleModal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          sale={selectedSale}
          currentUser={currentUser}
          clients={clients}
          onSaleSuccess={() => {
            setSelectedSale(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
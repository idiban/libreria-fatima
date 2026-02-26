import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';

export default function StatsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B23B23]" />
    </div>
  );

  const formatCurrency = (val: number) => `$${val.toLocaleString('es-CL')}`;

  const summaryCards = [
    { label: 'Ventas Totales', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Libros Vendidos', value: stats?.totalSales || 0, icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Clientes Activos', value: stats?.totalClients || 0, icon: Users, color: 'bg-purple-500' },
    { label: 'Promedio Venta', value: formatCurrency(Math.round((stats?.totalRevenue || 0) / (stats?.totalSales || 1))), icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Estadísticas</h2>
        <p className="text-gray-500 font-medium">Resumen del rendimiento de la librería.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0] relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${card.color} opacity-5 -mr-8 -mt-8 rounded-full group-hover:scale-150 transition-transform duration-500`} />
            <div className={`${card.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-current/20`}>
              <card.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{card.label}</p>
            <p className="text-3xl font-black text-[#2D1A1A]">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#B23B23]" />
              Ventas por Día
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.salesByDay || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FDF2F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#FFF9F5' }}
                />
                <Bar dataKey="total" fill="#B23B23" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Books */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#B23B23]" />
              Libros Más Vendidos
            </h3>
          </div>
          <div className="space-y-6">
            {stats?.topBooks?.map((book: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#FFF9F5] flex items-center justify-center text-[#B23B23] font-black text-xs">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-[#2D1A1A] truncate">{book.title}</p>
                  <div className="w-full bg-[#FDF2F0] h-2 rounded-full mt-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(book.count / stats.topBooks[0].count) * 100}%` }}
                      className="bg-[#B23B23] h-full rounded-full"
                    />
                  </div>
                </div>
                <span className="font-black text-[#B23B23] text-sm">{book.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

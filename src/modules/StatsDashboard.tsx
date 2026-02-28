import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BookOpen, 
  DollarSign, 
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  PiggyBank,
  AlertTriangle,
  Trophy,
  UserX
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
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function StatsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all'); // Filtro de tiempo

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats?timeframe=${timeframe}`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [timeframe]);

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B23B23]" />
    </div>
  );

  const formatCurrency = (val: number) => `$${Number(val || 0).toLocaleString('es-CL')}`;

  const summaryCards = [
    { label: 'Ventas Totales', value: formatCurrency(stats?.totalRevenue), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Libros Vendidos', value: stats?.totalSales || 0, icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Deuda por Cobrar', value: formatCurrency(stats?.totalDebt), icon: TrendingUp, color: 'bg-red-500' },
    { label: 'Saldos a Favor', value: formatCurrency(stats?.totalCredit), icon: PiggyBank, color: 'bg-orange-500' },
  ];

  const PIE_COLORS = ['#B23B23', '#D97757', '#F2A679', '#F6C89F', '#FDE4CF', '#E5E7EB'];

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2 text-[#2D1A1A]">Estadísticas</h2>
          <p className="text-gray-500 font-medium">Resumen del rendimiento financiero y de inventario.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-[#FDF2F0]">
          <Filter className="w-5 h-5 text-[#B23B23]" />
          <select 
            className="bg-transparent font-black text-sm text-[#2D1A1A] outline-none cursor-pointer"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="today">Hoy</option>
            <option value="7days">Últimos 7 días</option>
            <option value="month">Este Mes</option>
            <option value="all">Todo el tiempo</option>
          </select>
        </div>
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
        {/* Sales Bar Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#B23B23]" />
              Evolución de Ventas
            </h3>
          </div>
          <div className="h-80 w-full relative">
            {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#B23B23]" /></div>}
            {stats?.salesByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FDF2F0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    cursor={{ fill: '#FFF9F5' }}
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                  />
                  <Bar dataKey="total" fill="#B23B23" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No hay datos en este periodo</div>
            )}
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#B23B23]" />
              Ventas por Categoría
            </h3>
          </div>
          <div className="h-80 w-full relative">
            {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#B23B23]" /></div>}
            {stats?.salesByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.salesByCategory}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.salesByCategory.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value} unidades`, 'Vendidos']}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No hay datos en este periodo</div>
            )}
          </div>
        </div>
      </div>

      {/* TERCERA FILA: Listas Top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Top Libros */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0]">
          <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-[#B23B23]" /> Top Libros
          </h3>
          <div className="space-y-5">
            {stats?.topBooks?.length > 0 ? stats.topBooks.map((book: any, i: number) => (
              <div key={book.id || i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#FFF9F5] flex items-center justify-center text-[#B23B23] font-black text-xs shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#2D1A1A] truncate">{book.title}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{book.count} vendidos</p>
                </div>
              </div>
            )) : <p className="text-sm text-gray-400 font-medium">Sin registros</p>}
          </div>
        </div>

        {/* Mejores Clientes */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#FDF2F0]">
          <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-[#B23B23]" /> Mejores Clientes
          </h3>
          <div className="space-y-5">
            {stats?.topClients?.length > 0 ? stats.topClients.map((client: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">
                    {i + 1}
                  </div>
                  <p className="font-bold text-sm text-[#2D1A1A] truncate">{client.name}</p>
                </div>
                <span className="font-black text-emerald-600 text-sm">{formatCurrency(client.total)}</span>
              </div>
            )) : <p className="text-sm text-gray-400 font-medium">Sin registros</p>}
          </div>
        </div>

        {/* Columna Mixta: Deudores y Stock */}
        <div className="space-y-8">
          {/* Top Deudores */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-100">
            <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2 mb-6">
              <UserX className="w-5 h-5 text-red-500" /> Mayores Deudores
            </h3>
            <div className="space-y-4">
              {stats?.topDebtors?.length > 0 ? stats.topDebtors.slice(0,3).map((debtor: any, i: number) => (
                <div key={debtor.id} className="flex justify-between items-center bg-red-50 p-3 rounded-2xl">
                  <p className="font-bold text-sm text-red-900 truncate mr-2">{debtor.name}</p>
                  <span className="font-black text-red-600 text-sm">{formatCurrency(debtor.totalDebt)}</span>
                </div>
              )) : <p className="text-sm text-gray-400 font-medium">Nadie debe dinero actualmente 🎉</p>}
            </div>
          </div>

          {/* Stock Crítico */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-orange-100">
            <h3 className="font-black text-lg text-[#2D1A1A] flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Stock Crítico
            </h3>
            <div className="space-y-3">
              {stats?.criticalStock?.length > 0 ? stats.criticalStock.map((book: any) => (
                <div key={book.id} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <p className="font-bold text-xs text-gray-600 truncate mr-2">{book.title}</p>
                  <span className={`font-black text-xs px-2 py-1 rounded-lg ${book.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                    Quedan {book.stock}
                  </span>
                </div>
              )) : <p className="text-sm text-gray-400 font-medium">El stock está saludable.</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
import express from "express";
import { getFirestore, admin } from "../firebase.ts";

const router = express.Router();

// Función para sincronizar estadísticas si el documento no existe
async function getOrSyncStats(firestore: admin.firestore.Firestore) {
  const statsRef = firestore.collection("metadata").doc("stats");
  const statsDoc = await statsRef.get();

  if (statsDoc.exists) {
    return statsDoc.data();
  }

  // Si no existe, calculamos todo por primera vez (Migración)
  console.log("Sincronizando estadísticas por primera vez...");
  
  const salesAggregation = await firestore.collection("ventas").aggregate({
    totalRevenue: admin.firestore.AggregateField.sum('total'),
    totalSales: admin.firestore.AggregateField.count()
  }).get();

  const clientsAggregation = await firestore.collection("clientes").aggregate({
    totalClients: admin.firestore.AggregateField.count()
  }).get();

  const statsData = {
    totalRevenue: salesAggregation.data().totalRevenue || 0,
    totalSales: salesAggregation.data().totalSales || 0,
    totalClients: clientsAggregation.data().totalClients || 0,
    lastSync: admin.firestore.FieldValue.serverTimestamp()
  };

  await statsRef.set(statsData);
  return statsData;
}

router.get("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { timeframe } = req.query;

    // Obtenemos los totales persistentes (0 lecturas de escaneo)
    const globalStats: any = await getOrSyncStats(firestore);

    // 1. Obtener todos los libros (para categorías y stock crítico)
    const booksSnap = await firestore.collection("libros").get();
    const books = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const bookMap = new Map(books.map(b => [b.id, b]));

    // 2. Alerta de Stock Crítico
    const criticalStock = books
      .filter(b => b.stock <= 3)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    // 3. Deudores (Esto sigue siendo dinámico)
    const clientsCol = firestore.collection("clientes");
    const debtAggregation = await clientsCol.aggregate({
      totalDebt: admin.firestore.AggregateField.sum('totalDebt'),
      totalCredit: admin.firestore.AggregateField.sum('creditBalance')
    }).get();
    
    const { totalDebt, totalCredit } = debtAggregation.data();

    const topDebtorsSnap = await clientsCol
      .where('totalDebt', '>', 0)
      .orderBy('totalDebt', 'desc')
      .limit(5)
      .get();
    
    const topDebtors = topDebtorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 4. Filtrado por Fecha para Ventas (Solo si hay timeframe)
    let totalRevenue = globalStats.totalRevenue;
    let totalSales = 0; // Este lo calculamos del periodo
    let salesByDayMap = new Map<string, number>();
    let bookCountMap = new Map<string, { title: string, count: number }>();
    let categoryMap = new Map<string, number>();
    let clientSpentMap = new Map<string, number>();

    let salesQuery: any = firestore.collection("ventas");
    
    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let startDate = new Date();
      if (timeframe === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === '7days') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeframe === 'month') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }
      salesQuery = salesQuery.where('timestamp', '>=', startDate);
      
      const revenueAggregation = await salesQuery.aggregate({
        totalRevenue: admin.firestore.AggregateField.sum('total')
      }).get();
      totalRevenue = revenueAggregation.data().totalRevenue || 0;
    }

    const salesSnap = await salesQuery.get();
    
    salesSnap.docs.forEach((doc: any) => {
      const sale = doc.data();
      
      if (sale.timestamp) {
        const date = sale.timestamp.toDate();
        const dateStr = date.toISOString().split('T')[0]; 
        salesByDayMap.set(dateStr, (salesByDayMap.get(dateStr) || 0) + (sale.total || 0));
      }

      if (sale.clientName) {
        clientSpentMap.set(sale.clientName, (clientSpentMap.get(sale.clientName) || 0) + (sale.total || 0));
      }

      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (!item.bookId.startsWith('custom_')) {
            totalSales += item.quantity;
            
            const currentBook = bookCountMap.get(item.bookId) || { title: item.title, count: 0 };
            currentBook.count += item.quantity;
            bookCountMap.set(item.bookId, currentBook);

            const bookData = bookMap.get(item.bookId);
            const category = bookData?.category || 'Sin categoría';
            categoryMap.set(category, (categoryMap.get(category) || 0) + item.quantity);
          }
        });
      }
    });

    const sortedSalesByDay = Array.from(salesByDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => {
        const [y, m, d] = date.split('-');
        return { date: `${d}/${m}`, total };
      });

    const topBooks = Array.from(bookCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const salesByCategory = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topClients = Array.from(clientSpentMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    res.json({
      totalRevenue,
      totalSales: timeframe === 'all' ? globalStats.totalSales : totalSales,
      totalClients: globalStats.totalClients,
      totalDebt,
      totalCredit,
      salesByDay: sortedSalesByDay,
      topBooks,
      salesByCategory,
      topDebtors,
      criticalStock,
      topClients
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
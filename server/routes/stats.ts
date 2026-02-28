import express from "express";
import { getFirestore } from "../firebase.ts";

const router = express.Router();

router.get("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { timeframe } = req.query;

    // 1. Obtener todos los libros (para categorías y stock crítico)
    const booksSnap = await firestore.collection("libros").get();
    const books = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const bookMap = new Map(books.map(b => [b.id, b]));

    // 2. Alerta de Stock Crítico (Libros con 3 o menos)
    const criticalStock = books
      .filter(b => b.stock <= 3)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    // 3. Obtener Clientes (para calcular deudas globales y mejores clientes)
    const clientsSnap = await firestore.collection("clientes").get();
    const clients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    let totalDebt = 0;
    let totalCredit = 0;
    clients.forEach(c => {
      totalDebt += (c.totalDebt || 0);
      totalCredit += (c.creditBalance || 0);
    });

    const topDebtors = [...clients]
      .filter(c => (c.totalDebt || 0) > 0)
      .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0))
      .slice(0, 5);

    // 4. Filtrado por Fecha para Ventas
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
    }

    const salesSnap = await salesQuery.get();
    
    let totalRevenue = 0;
    let totalSales = 0;
    const salesByDayMap = new Map<string, number>();
    const bookCountMap = new Map<string, { title: string, count: number }>();
    const categoryMap = new Map<string, number>();
    const clientSpentMap = new Map<string, number>();

    salesSnap.docs.forEach((doc: any) => {
      const sale = doc.data();
      totalRevenue += (sale.total || 0);
      
      // Agrupar ventas por día
      if (sale.timestamp) {
        const date = sale.timestamp.toDate();
        // Usamos YYYY-MM-DD para poder ordenarlos cronológicamente sin fallos
        const dateStr = date.toISOString().split('T')[0]; 
        salesByDayMap.set(dateStr, (salesByDayMap.get(dateStr) || 0) + (sale.total || 0));
      }

      // Agrupar clientes que más gastan
      if (sale.clientName) {
        clientSpentMap.set(sale.clientName, (clientSpentMap.get(sale.clientName) || 0) + (sale.total || 0));
      }

      // Analizar los items vendidos (Libros y Categorías)
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (!item.bookId.startsWith('custom_')) {
            totalSales += item.quantity;
            
            // Libros más vendidos
            const currentBook = bookCountMap.get(item.bookId) || { title: item.title, count: 0 };
            currentBook.count += item.quantity;
            bookCountMap.set(item.bookId, currentBook);

            // Ventas por Categoría
            const bookData = bookMap.get(item.bookId);
            const category = bookData?.category || 'Sin categoría';
            categoryMap.set(category, (categoryMap.get(category) || 0) + item.quantity);
          }
        });
      }
    });

    // --- FORMATEO FINAL DE LOS DATOS ---
    
    // Ordenar fechas cronológicamente y cambiar formato a DD/MM
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
      totalSales,
      totalClients: clients.length,
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
import express from "express";
import { getFirestore } from "../firebase.ts";

const router = express.Router();

router.get("/logs", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const snapshot = await firestore.collection("logs")
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();
    
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/stats", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const salesSnapshot = await firestore.collection("ventas").get();
    const booksSnapshot = await firestore.collection("libros").get();
    const usersSnapshot = await firestore.collection("usuarios").get();

    const sales = salesSnapshot.docs.map(doc => doc.data() as any);
    const books = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const totalRevenue = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
    const totalSales = sales.length;
    
    const salesByUser: Record<string, { count: number, total: number, username: string }> = {};
    sales.forEach(sale => {
      if (!salesByUser[sale.userId]) {
        const user = users.find(u => u.id === sale.userId);
        salesByUser[sale.userId] = { count: 0, total: 0, username: user?.username || "Unknown" };
      }
      salesByUser[sale.userId].count += 1;
      salesByUser[sale.userId].total += (sale.total || 0);
    });

    const salesByBook: Record<string, { count: number, title: string }> = {};
    sales.forEach(sale => {
      if (!salesByBook[sale.bookId]) {
        const book = books.find(b => b.id === sale.bookId);
        salesByBook[sale.bookId] = { count: 0, title: book?.title || "Unknown" };
      }
      salesByBook[sale.bookId].count += (sale.quantity || 0);
    });

    res.json({
      totalRevenue,
      totalSales,
      salesByUser: Object.values(salesByUser),
      topBooks: Object.values(salesByBook).sort((a, b) => b.count - a.count).slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

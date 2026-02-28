import express from "express";
import { getFirestore, admin } from "../firebase.ts";
import { logActivity, normalizeUsername } from "../utils.ts";

const router = express.Router();

router.get("/:id/history", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  try {
    const { id } = req.params;
    
    const salesSnapshot = await firestore.collection("ventas")
      .where("clientId", "==", id)
      .get();
    
    const sales = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'sale',
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    const paymentsSnapshot = await firestore.collection("pagos")
      .where("clientId", "==", id)
      .get();

    const payments = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    const history = [...sales, ...payments].sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeB - timeA;
    });

    res.json({ history });
  } catch (error) {
    console.error("Error en /api/clients/:id/history:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/suggest", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") return res.json([]);
    const query = normalizeUsername(q);
    
    const snapshot = await firestore.collection("clientes").get();
    
    const suggestions = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(client => {
        const normalizedName = normalizeUsername(client.name || '');
        return normalizedName.includes(query) || query.includes(normalizedName);
      })
      .slice(0, 5);
      
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  try {
    const clientsSnapshot = await firestore.collection("clientes").get();
    const clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const salesSnapshot = await firestore.collection("ventas").get();
    const itemsByClient = salesSnapshot.docs.reduce((acc, doc) => {
      const sale = doc.data();
      if (sale.clientId && Array.isArray(sale.items)) {
        const totalItems = sale.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        acc[sale.clientId] = (acc[sale.clientId] || 0) + totalItems;
      }
      return acc;
    }, {} as { [key: string]: number });

    const clientsWithItemCount = clients.map(client => ({
      ...client,
      totalItemsPurchased: itemsByClient[(client as any).id] || 0
    }));

    res.json(clientsWithItemCount);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.patch("/:id", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.name) updates.name_lowercase = updates.name.toLowerCase();
    await firestore.collection("clientes").doc(id).update(updates);
    // --- NUEVO: LOG DE CLIENTE EDITADO ---
    const userCookie = req.cookies?.user;
    if (userCookie) {
      const user = JSON.parse(userCookie);
      await logActivity(user.id, user.username, "CLIENT_UPDATE", { clientName: updates.name });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/:id/pay", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
      const { id } = req.params;
      const { amount } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
          return res.status(400).json({ error: "Monto de pago inválido." });
      }

      let clientNameLog = 'N/A';

      await firestore.runTransaction(async (transaction) => {
          const clientRef = firestore.collection("clientes").doc(id);
          const clientDoc = await transaction.get(clientRef);

          if (!clientDoc.exists) {
              throw new Error("Cliente no encontrado.");
          }

          const clientData = clientDoc.data()!;
          clientNameLog = clientData.name || 'N/A';

          const currentDebt = clientData.totalDebt || 0;
          const currentCredit = clientData.creditBalance || 0;

          const finalNetBalance = currentDebt - currentCredit - amount;

          transaction.update(clientRef, { 
              totalDebt: finalNetBalance > 0 ? finalNetBalance : 0,
              creditBalance: finalNetBalance < 0 ? Math.abs(finalNetBalance) : 0
          });

          const paymentRef = firestore.collection("pagos").doc();
          transaction.set(paymentRef, {
            clientId: id,
            clientName: clientNameLog,
            amount: amount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'payment'
          });
      });

      const userCookie = req.cookies?.user;
      if (userCookie) {
          try {
              const user = JSON.parse(userCookie);
              await logActivity(user.id, user.username, "DEBT_PAYMENT", {
                  clientName: clientNameLog, // <-- ¡AQUÍ ESTÁ LA MAGIA! Agregamos el nombre
                  amountPaid: amount
              });
          } catch (e) {
              console.error("Error parsing user cookie for logging:", e);
          }
      }

      res.json({ success: true, message: "Pago procesado correctamente." });

  } catch (error) {
      res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
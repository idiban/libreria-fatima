import express from "express";
import { getFirestore } from "../firebase.ts";
import { logActivity } from "../utils.ts"; 

const router = express.Router();

// GET /api/debts/client/:clientId
router.get("/client/:clientId", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  try {
    const { clientId } = req.params;
    
    const clientDoc = await firestore.collection("clientes").doc(clientId).get();
    const totalDebt = clientDoc.exists ? (clientDoc.data()?.totalDebt || 0) : 0;

    const salesSnapshot = await firestore.collection("ventas")
      .where("clientId", "==", clientId)
      .get();
    
    // Se quitó el filter para que las compras que sobrepagan también se calculen
    const sales = salesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: 'sale',
        ...data,
        amount: (data.total || 0) - (data.amountPaid || 0),
        timestamp: data.timestamp?.toDate()
      };
    });

    const paymentsSnapshot = await firestore.collection("pagos")
      .where("clientId", "==", clientId)
      .get();

    const payments = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'payment',
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    // Ordenamos desde la MÁS ANTIGUA a la MÁS NUEVA para calcular la deuda acumulada
    const allHistory = [...sales, ...payments].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB; 
    });

    let activeHistory: any[] = [];
    let runningDebt = 0;

    for (const entry of allHistory) {
      if (entry.type === 'sale') {
        runningDebt += entry.amount;
      } else if (entry.type === 'payment') {
        runningDebt -= (entry.amount || 0);
      }

      activeHistory.push(entry);

      // Si en algún punto la deuda queda en 0 o sobrepagada, 
      // limpiamos el historial visible porque las deudas anteriores ya se saldaron.
      if (runningDebt <= 0) {
        activeHistory = [];
        runningDebt = 0;
      }
    }

    // Volvemos a ordenar de la MÁS NUEVA a la MÁS ANTIGUA para mostrar en pantalla
    activeHistory.reverse();

    res.json({ totalDebt, history: activeHistory });
  } catch (error) {
    console.error("Error al obtener deudas:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// DELETE /api/debts/payment/:id
router.delete("/payment/:id", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { id } = req.params;
    let paymentDataLog: any = null; // <-- Variable para el log

    await firestore.runTransaction(async (transaction) => {
      const paymentRef = firestore.collection("pagos").doc(id);
      const paymentDoc = await transaction.get(paymentRef);

      if (!paymentDoc.exists) throw new Error("Pago no encontrado.");

      const paymentData = paymentDoc.data()!;
      paymentDataLog = paymentData; // <-- Guardamos la info antes de borrar
      const clientId = paymentData.clientId;
      const amount = paymentData.amount || 0;

      const clientRef = firestore.collection("clientes").doc(clientId);
      const clientDoc = await transaction.get(clientRef);

      if (clientDoc.exists) {
        const currentDebt = clientDoc.data()?.totalDebt || 0;
        const currentCredit = clientDoc.data()?.creditBalance || 0;
        
        const finalNetBalance = currentDebt - currentCredit + amount;

        transaction.update(clientRef, { 
          totalDebt: finalNetBalance > 0 ? finalNetBalance : 0,
          creditBalance: finalNetBalance < 0 ? Math.abs(finalNetBalance) : 0
        });
      }

      transaction.delete(paymentRef);
    });

    // --- NUEVO: GUARDAR EN EL LOG DE ACTIVIDAD ---
    const userCookie = req.cookies?.user;
    if (userCookie && paymentDataLog) {
        try {
            const user = JSON.parse(userCookie);
            await logActivity(user.id, user.username, "PAYMENT_DELETE", {
                clientName: paymentDataLog.clientName || 'Desconocido',
                amountPaid: paymentDataLog.amount || 0
            });
        } catch (e) {
            console.error("Error parsing user cookie for logging:", e);
        }
    }

    res.json({ success: true, message: "Pago eliminado correctamente." });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
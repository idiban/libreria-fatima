import express from "express";
import { getFirestore, admin } from "../firebase.ts";
import { logActivity } from "../utils.ts";

const router = express.Router();

router.post("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    // 1. AGREGADO: clientRut, manualDate, affectStock en la desestructuración
    const { items, clientId, clientName, clientRut, amountPaid, total, sellerId, sellerName, paymentMethod, notes, discount, manualDate, affectStock = true } = req.body;
    
    await firestore.runTransaction(async (transaction) => {
      const bookItems = items.filter((item: any) => !item.bookId.startsWith('custom_'));
      const bookRefs = bookItems.map((item: any) => firestore.collection("libros").doc(item.bookId));
      const bookDocs = bookRefs.length > 0 ? await transaction.getAll(...bookRefs) : [];

      for (let i = 0; i < bookDocs.length; i++) {
        if (!bookDocs[i].exists) throw new Error(`El libro ${bookItems[i].title} no existe`);
      }

      let finalClientId = clientId;
      let clientRef;

      if (clientId) {
        clientRef = firestore.collection("clientes").doc(clientId);
      } else {
        clientRef = firestore.collection("clientes").doc();
        finalClientId = clientRef.id;
      }
      
      const clientDoc: any = clientId ? await transaction.get(clientRef) : null;

      // SOLO ACTUALIZAR STOCK SI affectStock ES TRUE
      if (affectStock) {
        for (let i = 0; i < bookDocs.length; i++) {
          const currentStock = (bookDocs[i].data() as any)?.stock || 0;
          transaction.update(bookRefs[i], { stock: Math.max(0, currentStock - bookItems[i].quantity) });
        }
      }

      const currentDebt = clientDoc?.exists ? (clientDoc.data().totalDebt || 0) : 0;
      const currentCredit = clientDoc?.exists ? (clientDoc.data().creditBalance || 0) : 0;
      
      const netChange = Number(total) - Number(amountPaid);
      const finalNetBalance = currentDebt - currentCredit + netChange;

      // 2. AGREGADO: rut en el objeto de actualización del cliente
      const clientUpdate: any = {
        name: clientName,
        rut: clientRut || '', // Guardamos el RUT en la colección clientes
        totalDebt: finalNetBalance > 0 ? finalNetBalance : 0,
        creditBalance: finalNetBalance < 0 ? Math.abs(finalNetBalance) : 0
      };

      if (!clientId) {
        transaction.set(clientRef, {
          ...clientUpdate,
          name_lowercase: clientName.toLowerCase(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        transaction.update(clientRef, clientUpdate);
      }
      
      const saleRef = firestore.collection("ventas").doc();
      
      // Lógica de fecha manual: Combinar fecha seleccionada con hora actual
      let saleTimestamp = admin.firestore.FieldValue.serverTimestamp();
      if (manualDate) {
        const d = new Date(manualDate);
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        saleTimestamp = admin.firestore.Timestamp.fromDate(d);
      }

      transaction.set(saleRef, {
        items,
        clientId: finalClientId,
        clientName,
        clientRut: clientRut || '', // 3. AGREGADO: rut en la colección ventas
        total: Number(total),
        amountPaid: Number(amountPaid),
        sellerId,
        sellerName,
        paymentMethod: paymentMethod || [],
        notes: notes || '',
        discount: Number(discount) || 0,
        timestamp: saleTimestamp,
        affectStock
      });
    });

    await logActivity(sellerId, sellerName, "SALE", { clientName, total: Number(total), itemsCount: items.length });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  try {
    const snapshot = await firestore.collection("ventas").orderBy("timestamp", "desc").get();
    const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put("/:id", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { id } = req.params;
    // 4. AGREGADO: clientRut, manualDate, affectStock en la desestructuración del PUT
    const { items, clientId, clientName, clientRut, amountPaid, total, sellerId, sellerName, paymentMethod, notes, discount, manualDate, affectStock = true } = req.body;
    
    await firestore.runTransaction(async (transaction) => {
      const saleRef = firestore.collection("ventas").doc(id);
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists) throw new Error("Venta no encontrada");
      const oldSaleData = saleDoc.data()!;
      const oldAffectStock = oldSaleData.affectStock !== undefined ? oldSaleData.affectStock : true;
      
      const oldBookIds = (oldSaleData.items || []).filter((i: any) => !i.bookId.startsWith('custom_')).map((i: any) => i.bookId);
      const newBookIds = (items || []).filter((i: any) => !i.bookId.startsWith('custom_')).map((i: any) => i.bookId);
      const allBookIds = Array.from(new Set([...oldBookIds, ...newBookIds]));
      
      const bookRefs = allBookIds.map(bookId => firestore.collection("libros").doc(bookId));
      const bookDocs = bookRefs.length > 0 ? await transaction.getAll(...bookRefs) : [];
      const bookDocsMap = new Map();
      bookDocs.forEach(doc => { if (doc.exists) bookDocsMap.set(doc.id, doc); });
      
      let oldClientRef = null;
      let oldClientDoc = null;
      if (oldSaleData.clientId) {
        oldClientRef = firestore.collection("clientes").doc(oldSaleData.clientId);
        oldClientDoc = await transaction.get(oldClientRef);
      }
      
      let newClientRef = null;
      let newClientDoc = null;
      let finalClientId = clientId;
      if (clientId) {
        if (clientId === oldSaleData.clientId) {
          newClientRef = oldClientRef;
          newClientDoc = oldClientDoc;
        } else {
          newClientRef = firestore.collection("clientes").doc(clientId);
          newClientDoc = await transaction.get(newClientRef);
        }
      } else {
        newClientRef = firestore.collection("clientes").doc();
        finalClientId = newClientRef.id;
      }
      
      const stockChanges = new Map<string, number>();
      
      // Si antes afectaba stock, devolvemos lo viejo
      if (oldAffectStock) {
        for (const oldItem of (oldSaleData.items || []).filter((i: any) => !i.bookId.startsWith('custom_'))) {
          stockChanges.set(oldItem.bookId, (stockChanges.get(oldItem.bookId) || 0) + oldItem.quantity);
        }
      }
      
      // Si ahora afecta stock, restamos lo nuevo
      if (affectStock) {
        for (const newItem of (items || []).filter((i: any) => !i.bookId.startsWith('custom_'))) {
          stockChanges.set(newItem.bookId, (stockChanges.get(newItem.bookId) || 0) - newItem.quantity);
        }
      }
      
      for (const [bookId, change] of stockChanges.entries()) {
        if (change !== 0) {
          const doc = bookDocsMap.get(bookId);
          if (doc) {
            const currentStock = doc.data()?.stock || 0;
            transaction.update(firestore.collection("libros").doc(bookId), { stock: Math.max(0, currentStock + change) });
          }
        }
      }
      
      const oldDebt = (oldSaleData.total || 0) - (oldSaleData.amountPaid || 0);
      const newDebt = Number(total) - Number(amountPaid);
      
      if (oldSaleData.clientId === finalClientId) {
        if (oldClientRef && oldClientDoc && oldClientDoc.exists) {
          const currentD = oldClientDoc.data().totalDebt || 0;
          const currentC = oldClientDoc.data().creditBalance || 0;
          const finalBal = currentD - currentC - oldDebt + newDebt;
          transaction.update(oldClientRef, { 
            totalDebt: finalBal > 0 ? finalBal : 0,
            creditBalance: finalBal < 0 ? Math.abs(finalBal) : 0,
            name: clientName,
            rut: clientRut || '' // 5. AGREGADO: Actualizar rut en cliente existente
          });
        }
      } else {
        if (oldClientRef && oldClientDoc && oldClientDoc.exists) {
          const curD = oldClientDoc.data().totalDebt || 0;
          const curC = oldClientDoc.data().creditBalance || 0;
          const oldBal = curD - curC - oldDebt;
          transaction.update(oldClientRef, { 
            totalDebt: oldBal > 0 ? oldBal : 0, 
            creditBalance: oldBal < 0 ? Math.abs(oldBal) : 0 
          });
        }
        
        const finalNewBal = (newClientDoc?.exists ? (newClientDoc.data().totalDebt - newClientDoc.data().creditBalance) : 0) + newDebt;
        const newClientUpdate = {
          name: clientName,
          rut: clientRut || '', // 6. AGREGADO: rut para nuevo cliente o cambio de cliente
          totalDebt: finalNewBal > 0 ? finalNewBal : 0,
          creditBalance: finalNewBal < 0 ? Math.abs(finalNewBal) : 0
        };

        if (!clientId) {
          transaction.set(newClientRef, { ...newClientUpdate, name_lowercase: clientName.toLowerCase(), createdAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
          transaction.update(newClientRef, newClientUpdate);
        }
      }
      
      // Lógica de fecha manual para actualización
      let saleTimestamp = oldSaleData.timestamp;
      if (manualDate) {
        const d = new Date(manualDate);
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        saleTimestamp = admin.firestore.Timestamp.fromDate(d);
      }

      transaction.update(saleRef, { 
        items, 
        clientId: finalClientId, 
        clientName, 
        clientRut: clientRut || '', // 7. AGREGADO: Actualizar rut en la venta
        total: Number(total), 
        amountPaid: Number(amountPaid), 
        sellerId, 
        sellerName,
        paymentMethod: paymentMethod || [],
        notes: notes || '',
        discount: Number(discount) || 0,
        timestamp: saleTimestamp,
        affectStock
      });
    });

    const userCookie = req.cookies?.user;
    if (userCookie) {
      const user = JSON.parse(userCookie);
      await logActivity(user.id, user.username, "SALE_UPDATE", { 
        clientName: clientName, 
        total: Number(total) 
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});


router.delete("/:id", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { id } = req.params;
    let saleDataLog: any = null;

    await firestore.runTransaction(async (transaction) => {
      const saleRef = firestore.collection("ventas").doc(id);
      const saleDoc = await transaction.get(saleRef);
      if (!saleDoc.exists) throw new Error("Venta no encontrada");
      
      const saleData = saleDoc.data()!;
      saleDataLog = saleData;
      
      const bookItems = (saleData.items || []).filter((item: any) => !item.bookId.startsWith('custom_'));
      
      const stockUpdates = new Map<string, number>();
      for (const item of bookItems) {
        stockUpdates.set(item.bookId, (stockUpdates.get(item.bookId) || 0) + Number(item.quantity));
      }

      const uniqueBookIds = Array.from(stockUpdates.keys());
      const bookRefs = uniqueBookIds.map(bookId => firestore.collection("libros").doc(bookId));
      const bookDocs = bookRefs.length > 0 ? await transaction.getAll(...bookRefs) : [];
      
      if (saleData.clientId) {
        const clientRef = firestore.collection("clientes").doc(saleData.clientId);
        const clientDoc = await transaction.get(clientRef);
        if (clientDoc.exists) {
          const saleDebt = Number(saleData.total || 0) - Number(saleData.amountPaid || 0);
          const curD = Number(clientDoc.data().totalDebt || 0);
          const curC = Number(clientDoc.data().creditBalance || 0);
          const finalB = curD - curC - saleDebt;
          transaction.update(clientRef, { 
            totalDebt: finalB > 0 ? finalB : 0, 
            creditBalance: finalB < 0 ? Math.abs(finalB) : 0 
          });
        }
      }
      
      for (let i = 0; i < bookDocs.length; i++) {
        if (bookDocs[i].exists) {
          const bookId = bookDocs[i].id;
          const currentStock = Number((bookDocs[i].data() as any)?.stock || 0);
          const quantityToRestore = stockUpdates.get(bookId) || 0;
          transaction.update(bookRefs[i], { stock: currentStock + quantityToRestore });
        }
      }
      
      transaction.delete(saleRef);
    });

    const userCookie = req.cookies?.user;
    if (userCookie && saleDataLog) {
        try {
            const user = JSON.parse(userCookie);
            await logActivity(user.id, user.username, "SALE_DELETE", {
                clientName: saleDataLog.clientName || 'Desconocido',
                total: saleDataLog.total || 0
            });
        } catch (e) {
            console.error("Error parsing user cookie for logging:", e);
        }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/client/:clientId", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  try {
      const { clientId } = req.params;
      const snapshot = await firestore.collection("ventas").where("clientId", "==", clientId).get();
      let sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().timestamp?.toDate() }));
      sales = sales.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
      res.json(sales);
  } catch (error) {
      res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
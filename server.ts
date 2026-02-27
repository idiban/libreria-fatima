import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy Firebase Initialization
let db: admin.firestore.Firestore | null = null;

function getFirestore() {
  if (!db) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase credentials missing. Falling back to mock behavior or failing fast on requests.");
      return null;
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    db = admin.firestore();
  }
  return db;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Middleware to extend session on activity
  app.use((req, res, next) => {
    const userCookie = req.cookies.user;
    if (userCookie) {
      res.cookie("user", userCookie, { 
        httpOnly: true, 
        sameSite: 'none', 
        secure: true,
        maxAge: 3600000 // 1 hour
      });
    }
    next();
  });

  // Middleware to check authentication
  const checkAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    next();
  };

  // Middleware to check for specific roles
  const checkRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.cookies.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const user = JSON.parse(req.cookies.user);
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    next();
  };

  // API Routes - Books
  app.get("/api/books", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
    
    try {
      const snapshot = await firestore.collection("libros").orderBy("titulo").get();
      const books = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          title: data.titulo || "",
          author: data.autor || "",
          price: data.precio || 0,
          stock: data.stock || 0,
          category: data.categoria || "",
          description: data.descripcion || "",
          cover_url: data.portada_url || "",
          contraportada_url: data.contraportada_url || "",
          createdAt: data.createdAt
        };
      });
      res.json(books);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/books", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { title, author, price, stock, category, description, cover_url, contraportada_url } = req.body;
      const docRef = await firestore.collection("libros").add({
        titulo: title,
        autor: author,
        precio: price,
        stock: stock,
        categoria: category || "",
        descripcion: description || "",
        portada_url: cover_url,
        contraportada_url: contraportada_url || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      const newDoc = await docRef.get();
      const data = newDoc.data();
      res.status(201).json({ id: docRef.id, title: data?.titulo, author: data?.autor, price: data?.precio, stock: data?.stock, cover_url: data?.portada_url });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/books/:id", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      const updates = req.body;
      const firestoreUpdates: any = {};
      
      if (updates.title !== undefined) firestoreUpdates.titulo = updates.title;
      if (updates.author !== undefined) firestoreUpdates.autor = updates.author;
      if (updates.price !== undefined) firestoreUpdates.precio = updates.price;
      if (updates.stock !== undefined) firestoreUpdates.stock = updates.stock;
      if (updates.category !== undefined) firestoreUpdates.categoria = updates.category;
      if (updates.description !== undefined) firestoreUpdates.descripcion = updates.description;
      if (updates.cover_url !== undefined) firestoreUpdates.portada_url = updates.cover_url;
      if (updates.contraportada_url !== undefined) firestoreUpdates.contraportada_url = updates.contraportada_url;

      await firestore.collection("libros").doc(id).update(firestoreUpdates);
      
      // Log stock change if stock was updated
      if (updates.stock !== undefined) {
        const bookDoc = await firestore.collection("libros").doc(id).get();
        const bookData = bookDoc.data();
        const userCookie = req.cookies.user;
        if (userCookie) {
          const user = JSON.parse(userCookie);
          await logActivity(user.id, user.username, "STOCK_UPDATE", {
            bookId: id,
            bookTitle: bookData?.titulo,
            newStock: updates.stock
          });
        }
      }

      const updatedDoc = await firestore.collection("libros").doc(id).get();
      const data = updatedDoc.data();
      res.json({ id: updatedDoc.id, title: data?.titulo, author: data?.autor, price: data?.precio, stock: data?.stock, cover_url: data?.portada_url });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      await firestore.collection("libros").doc(id).delete();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Routes - Sales
  app.post("/api/sales", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { items, clientId, clientName, amountPaid, total, sellerId, sellerName } = req.body;
      
      await firestore.runTransaction(async (transaction) => {
        // 1. READS
        const bookRefs = items.map((item: any) => firestore.collection("libros").doc(item.bookId));
        const bookDocs = await transaction.getAll(...bookRefs);

        for (let i = 0; i < bookDocs.length; i++) {
          if (!bookDocs[i].exists) throw new Error(`El libro ${items[i].title} no existe`);
        }

        let finalClientId = clientId;
        let clientRef;

        if (clientId) {
          clientRef = firestore.collection("clientes").doc(clientId);
        } else {
          clientRef = firestore.collection("clientes").doc();
          finalClientId = clientRef.id;
        }
        
        const clientDoc = clientId ? await transaction.get(clientRef) : null;

        // 2. WRITES
        for (let i = 0; i < bookDocs.length; i++) {
          const currentStock = bookDocs[i].data()?.stock || 0;
          transaction.update(bookRefs[i], { stock: Math.max(0, currentStock - items[i].quantity) });
        }

        const debtChange = Number(total) - Number(amountPaid);

        if (!clientId) { // New client
          transaction.set(clientRef, {
            name: clientName,
            name_lowercase: clientName.toLowerCase(),
            totalDebt: debtChange,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else if (clientDoc && clientDoc.exists) { // Existing client
          const currentDebt = clientDoc.data()?.totalDebt || 0;
          transaction.update(clientRef, { 
            totalDebt: currentDebt + debtChange,
            name: clientName
          });
        }
        
        const saleRef = firestore.collection("ventas").doc();
        const saleData = {
          items,
          clientId: finalClientId,
          clientName,
          total: Number(total),
          amountPaid: Number(amountPaid),
          sellerId,
          sellerName,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        transaction.set(saleRef, saleData);
      });

      // Log Activity outside transaction to avoid retries duplicating logs
      await logActivity(sellerId, sellerName, "SALE", {
        clientName,
        total: Number(total),
        itemsCount: items.length
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/sales", async (req, res) => {
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

  app.put("/api/sales/:id", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      const { items, clientId, clientName, amountPaid, total, sellerId, sellerName } = req.body;
      
      await firestore.runTransaction(async (transaction) => {
        const saleRef = firestore.collection("ventas").doc(id);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists) throw new Error("Venta no encontrada");
        const oldSaleData = saleDoc.data()!;
        
        const oldBookIds = (oldSaleData.items || []).map((i: any) => i.bookId);
        const newBookIds = (items || []).map((i: any) => i.bookId);
        const allBookIds = Array.from(new Set([...oldBookIds, ...newBookIds]));
        
        const bookRefs = allBookIds.map(bookId => firestore.collection("libros").doc(bookId));
        const bookDocs = bookRefs.length > 0 ? await transaction.getAll(...bookRefs) : [];
        const bookDocsMap = new Map();
        bookDocs.forEach(doc => {
          if (doc.exists) bookDocsMap.set(doc.id, doc);
        });
        
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
        for (const oldItem of (oldSaleData.items || [])) {
          stockChanges.set(oldItem.bookId, (stockChanges.get(oldItem.bookId) || 0) + oldItem.quantity);
        }
        for (const newItem of (items || [])) {
          stockChanges.set(newItem.bookId, (stockChanges.get(newItem.bookId) || 0) - newItem.quantity);
        }
        
        for (const [bookId, change] of stockChanges.entries()) {
          if (change !== 0) {
            const doc = bookDocsMap.get(bookId);
            if (doc) {
              const currentStock = doc.data()?.stock || 0;
              const ref = firestore.collection("libros").doc(bookId);
              transaction.update(ref, { stock: Math.max(0, currentStock + change) });
            }
          }
        }
        
        const oldDebt = (oldSaleData.total || 0) - (oldSaleData.amountPaid || 0);
        const newDebt = Number(total) - Number(amountPaid);
        
        if (oldSaleData.clientId === finalClientId) {
          if (oldClientRef && oldClientDoc && oldClientDoc.exists) {
            const currentDebt = oldClientDoc.data()?.totalDebt || 0;
            transaction.update(oldClientRef, { 
              totalDebt: currentDebt - oldDebt + newDebt,
              name: clientName
            });
          }
        } else {
          if (oldClientRef && oldClientDoc && oldClientDoc.exists) {
            const currentDebt = oldClientDoc.data()?.totalDebt || 0;
            transaction.update(oldClientRef, { totalDebt: currentDebt - oldDebt });
          }
          
          if (!clientId) {
            transaction.set(newClientRef, {
              name: clientName,
              name_lowercase: clientName.toLowerCase(),
              totalDebt: newDebt,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } else if (newClientRef && newClientDoc && newClientDoc.exists) {
            const currentDebt = newClientDoc.data()?.totalDebt || 0;
            transaction.update(newClientRef, { 
              totalDebt: currentDebt + newDebt,
              name: clientName
            });
          }
        }
        
        transaction.update(saleRef, {
          items,
          clientId: finalClientId,
          clientName,
          total: Number(total),
          amountPaid: Number(amountPaid),
          sellerId,
          sellerName
        });
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      
      await firestore.runTransaction(async (transaction) => {
        const saleRef = firestore.collection("ventas").doc(id);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists) throw new Error("Venta no encontrada");
        const saleData = saleDoc.data()!;
        
        const bookRefs = (saleData.items || []).map((item: any) => firestore.collection("libros").doc(item.bookId));
        const bookDocs = bookRefs.length > 0 ? await transaction.getAll(...bookRefs) : [];
        
        let clientRef = null;
        let clientDoc = null;
        if (saleData.clientId) {
          clientRef = firestore.collection("clientes").doc(saleData.clientId);
          clientDoc = await transaction.get(clientRef);
        }
        
        for (let i = 0; i < bookDocs.length; i++) {
          if (bookDocs[i].exists) {
            const currentStock = bookDocs[i].data()?.stock || 0;
            const item = saleData.items.find((item: any) => item.bookId === bookDocs[i].id);
            if (item) {
              transaction.update(bookRefs[i], { stock: currentStock + item.quantity });
            }
          }
        }
        
        if (clientRef && clientDoc && clientDoc.exists) {
          const currentDebt = clientDoc.data()?.totalDebt || 0;
          const saleDebt = (saleData.total || 0) - (saleData.amountPaid || 0);
          transaction.update(clientRef, { totalDebt: currentDebt - saleDebt });
        }
        
        transaction.delete(saleRef);
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/sales/client/:clientId", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
    try {
        const { clientId } = req.params;
        const snapshot = await firestore.collection("ventas")
            .where("clientId", "==", clientId)
            .orderBy("timestamp", "desc")
            .get();
        const sales = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(), 
            date: doc.data().timestamp?.toDate()
        }));
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

  app.get("/api/debts/client/:clientId", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
    try {
      const { clientId } = req.params;
      
      const clientDoc = await firestore.collection("clientes").doc(clientId).get();
      const totalDebt = clientDoc.exists ? (clientDoc.data()?.totalDebt || 0) : 0;

      // ELIMINADO: .orderBy("timestamp", "desc") para evitar error de índice en Firebase
      const salesSnapshot = await firestore.collection("ventas")
        .where("clientId", "==", clientId)
        .get();
      
      const sales = salesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'sale',
          ...data,
          amount: (data.total || 0) - (data.amountPaid || 0),
          timestamp: data.timestamp?.toDate()
        };
      }).filter(sale => sale.amount > 0);

      // ELIMINADO: .orderBy("timestamp", "desc")
      const paymentsSnapshot = await firestore.collection("pagos")
        .where("clientId", "==", clientId)
        .get();

      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      // Este sort en memoria ordena todo cronológicamente, haciendo innecesario el orderBy de Firebase
      const history = [...sales, ...payments].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Descendente (más recientes primero)
      });

      res.json({ totalDebt, history });
    } catch (error) {
      console.error("Error al obtener deudas:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Routes - Clients
  app.get("/api/clients/:id/history", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
    try {
      const { id } = req.params;
      
      // Fetch all sales for this client
      const salesSnapshot = await firestore.collection("ventas")
        .where("clientId", "==", id)
        .orderBy("timestamp", "desc")
        .get();
      
      const sales = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'sale',
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      // Fetch payments from 'pagos' collection
      const paymentsSnapshot = await firestore.collection("pagos")
        .where("clientId", "==", id)
        .orderBy("timestamp", "desc")
        .get();

      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      // Merge and sort by timestamp
      const history = [...sales, ...payments].sort((a, b) => {
        const timeA = a.timestamp?.getTime() || 0;
        const timeB = b.timestamp?.getTime() || 0;
        return timeB - timeA;
      });

      res.json({ history });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/clients/suggest", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") return res.json([]);
      const query = normalizeUsername(q);
      
      // Fetch all clients and filter in memory for substring match
      // Note: For large datasets, use a dedicated search service (Algolia, ElasticSearch)
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

  app.get("/api/clients", async (req, res) => {
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

  app.patch("/api/clients/:id", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.name) updates.name_lowercase = updates.name.toLowerCase();
      await firestore.collection("clientes").doc(id).update(updates);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/clients/:id/pay", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: "Monto de pago inválido." });
        }

        await firestore.runTransaction(async (transaction) => {
            const clientRef = firestore.collection("clientes").doc(id);
            const clientDoc = await transaction.get(clientRef);

            if (!clientDoc.exists) {
                throw new Error("Cliente no encontrado.");
            }

            const currentDebt = clientDoc.data()?.totalDebt || 0;
            if (amount > currentDebt) {
                throw new Error("El monto del pago no puede ser mayor a la deuda total.");
            }

            const newDebt = currentDebt - amount;
            transaction.update(clientRef, { totalDebt: newDebt });

            // No longer creating separate 'pagos' documents to reduce redundancy

            // Actualizar la colección 'deudas'
            // Create a payment document in 'pagos' collection
            const paymentRef = firestore.collection("pagos").doc();
            transaction.set(paymentRef, {
              clientId: id,
              clientName: clientDoc.data()?.name || 'N/A',
              amount: amount,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              type: 'payment'
            });
        });

        const userCookie = req.cookies.user;
        if (userCookie) {
            const user = JSON.parse(userCookie);
            await logActivity(user.id, user.username, "DEBT_PAYMENT", {
                clientId: id,
                amountPaid: amount
            });
        }

        res.json({ success: true, message: "Pago procesado correctamente." });

    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

  // Helper to normalize usernames (lowercase and remove accents)
  const normalizeUsername = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  // Helper to generate email from username
  const generateEmail = (username: string) => {
    const cleanName = username.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, '.');
    return `${cleanName}@libreriafatima.cl`;
  };

  const logActivity = async (userId: string, username: string, action: string, details: any = {}) => {
    const firestore = getFirestore();
    if (!firestore) return;
    try {
      await firestore.collection("logs").add({
        userId,
        username,
        action,
        details,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error("Error logging activity:", e);
    }
  };

  // API Routes - Users & Auth
  app.get("/api/users/suggest", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") return res.json([]);
      
      const query = normalizeUsername(q);
      
      // Fetch all users and filter in memory for substring match
      const snapshot = await firestore.collection("usuarios").get();
        
      const suggestions = snapshot.docs
        .map(doc => ({
          id: doc.id,
          username: doc.data().username,
          username_lowercase: doc.data().username_lowercase,
          email: doc.data().email
        } as any))
        .filter(user => (user.username_lowercase || '').includes(query))
        .slice(0, 5);
        
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/login", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { username, password } = req.body;
      const normalizedInput = normalizeUsername(username);
      
      const snapshot = await firestore.collection("usuarios")
        .where("username_lowercase", "==", normalizedInput)
        .limit(1)
        .get();

      if (snapshot.empty) return res.status(401).json({ error: "Usuario no encontrado" });
      
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      const email = userData.email;

      if (!email) return res.status(400).json({ error: "El usuario no tiene un email asociado" });

      // Verify credentials using Firebase Auth REST API
      const apiKey = process.env.FIREBASE_WEB_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "FIREBASE_WEB_API_KEY no configurada" });

      const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const authData: any = await authRes.json();

      if (!authRes.ok) {
        const errorMsg = authData.error?.message === 'INVALID_PASSWORD' ? 'Contraseña incorrecta' : 
                         authData.error?.message === 'EMAIL_NOT_FOUND' ? 'Usuario no registrado en Auth' : 
                         'Error de autenticación';
        return res.status(401).json({ error: errorMsg });
      }

      let user: any = { id: userDoc.id, ...userData };

      // Auto-promote Ignacio Dibán to owner if not already
      if (normalizedInput === "ignacio diban" && user.role !== "owner") {
        user.role = "owner";
        await firestore.collection("usuarios").doc(user.id).update({ role: "owner" });
      }

      await logActivity(user.id, user.username, "LOGIN");

      const oneHour = 3600000;
      res.cookie("user", JSON.stringify(user), { 
        httpOnly: true, 
        sameSite: 'none', 
        secure: true,
        maxAge: oneHour
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/refresh-session", (req, res) => {
    const userCookie = req.cookies.user;
    if (!userCookie) return res.status(401).json({ error: "No session" });
    
    const oneHour = 3600000;
    res.cookie("user", userCookie, { 
      httpOnly: true, 
      sameSite: 'none', 
      secure: true,
      maxAge: oneHour
    });
    res.json({ success: true });
  });

  app.post("/api/logout", async (req, res) => {
    const userCookie = req.cookies.user;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        await logActivity(user.id, user.username, "LOGOUT");
      } catch (e) {}
    }
    res.clearCookie("user");
    res.json({ success: true });
  });

  app.get("/api/me", (req, res) => {
    const userCookie = req.cookies.user;
    if (!userCookie) return res.status(401).json({ error: "No autenticado" });
    res.json(JSON.parse(userCookie));
  });

  app.get("/api/users", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const snapshot = await firestore.collection("usuarios").get();
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/users/:id/password", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      const { password } = req.body;
      
      const userDoc = await firestore.collection("usuarios").doc(id).get();
      if (!userDoc.exists) return res.status(404).json({ error: "Usuario no encontrado" });
      
      const email = userDoc.data()?.email;
      if (!email) return res.status(400).json({ error: "Usuario sin email" });

      // Update password in Firebase Auth
      const authUser = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(authUser.uid, { password });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/users", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { username, password, role } = req.body;
      const normalizedUsername = normalizeUsername(username);
      const email = generateEmail(username);
      
      // Check if user exists in Firestore
      const existing = await firestore.collection("usuarios")
        .where("username_lowercase", "==", normalizedUsername)
        .get();
      
      if (!existing.empty) return res.status(400).json({ error: "El usuario ya existe" });

      // Create user in Firebase Auth
      const authUser = await admin.auth().createUser({
        email,
        password,
        displayName: username
      });

      // Create user in Firestore
      const docRef = await firestore.collection("usuarios").doc(authUser.uid).set({
        username,
        username_lowercase: normalizedUsername,
        email,
        role: role || 'vendedor',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log user creation
      const userCookie = req.cookies.user;
      if (userCookie) {
        const adminUser = JSON.parse(userCookie);
        await logActivity(adminUser.id, adminUser.username, "USER_CREATE", {
          newUserId: authUser.uid,
          newUsername: username,
          role: role || 'vendedor'
        });
      }

      res.status(201).json({ id: authUser.uid, username, role, email });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      const userDoc = await firestore.collection("usuarios").doc(id).get();
      
      if (!userDoc.exists) return res.status(404).json({ error: "Usuario no encontrado" });
      if (userDoc.data()?.role === 'owner') return res.status(403).json({ error: "No se puede eliminar al Propietario (Owner)" });

      // Delete from Firebase Auth
      try {
        await admin.auth().deleteUser(id);
      } catch (e) {
        console.warn("User not found in Auth, but deleting from Firestore anyway");
      }

      await firestore.collection("usuarios").doc(id).delete();

      // Log user deletion
      const userCookie = req.cookies.user;
      if (userCookie) {
        const adminUser = JSON.parse(userCookie);
        await logActivity(adminUser.id, adminUser.username, "USER_DELETE", {
          deletedUserId: id,
          deletedUsername: userDoc.data()?.username
        });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/change-password", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const userCookie = req.cookies.user;
      if (!userCookie) return res.status(401).json({ error: "No autenticado" });
      
      const currentUser = JSON.parse(userCookie);
      const { newPassword } = req.body;

      // Update in Firebase Auth
      await admin.auth().updateUser(currentUser.id, { password: newPassword });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      const { username, role } = req.body;
      
      const userDoc = await firestore.collection("usuarios").doc(id).get();
      if (!userDoc.exists) return res.status(404).json({ error: "Usuario no encontrado" });
      
      const updates: any = {};
      if (username) {
        const normalizedUsername = normalizeUsername(username);
        // Check if username is already taken by another user
        const existing = await firestore.collection("usuarios")
          .where("username_lowercase", "==", normalizedUsername)
          .get();
        
        if (!existing.empty && existing.docs.some(doc => doc.id !== id)) {
          return res.status(400).json({ error: "El nombre de usuario ya está en uso" });
        }

        updates.username = username;
        updates.username_lowercase = normalizedUsername;
      }
      if (role) {
        // Don't allow changing role of owner if it's the last owner (though usually only one)
        if (userDoc.data()?.role === 'owner' && role !== 'owner') {
           return res.status(403).json({ error: "No se puede cambiar el rol del Propietario" });
        }
        updates.role = role;
      }

      await firestore.collection("usuarios").doc(id).update(updates);
      
      // Log user update
      const userCookie = req.cookies.user;
      if (userCookie) {
        const adminUser = JSON.parse(userCookie);
        await logActivity(adminUser.id, adminUser.username, "USER_UPDATE", {
          updatedUserId: id,
          updates
        });
      }

      if (username) {
        try {
          await admin.auth().updateUser(id, { displayName: username });
        } catch (e) {
          console.warn("Could not update Auth displayName:", e);
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.patch('/api/me/password', checkAuth, async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    const { currentPassword, newPassword } = req.body;
    const userCookie = req.cookies.user;
    if (!userCookie) return res.status(401).json({ error: 'No autenticado' });
    
    const currentUser = JSON.parse(userCookie);
    const userId = currentUser.id;

    try {
      const auth = admin.auth();
      const user = await auth.getUser(userId);
      const email = user.email;

      if (!email) {
        return res.status(400).json({ error: 'El usuario no tiene un email registrado.' });
      }

      const apiKey = process.env.FIREBASE_WEB_API_KEY;
      if (!apiKey) {
        console.error('FIREBASE_WEB_API_KEY no está configurada.');
        return res.status(500).json({ error: 'Error del servidor.' });
      }

      const verifyPasswordUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
      const verifyResponse = await fetch(verifyPasswordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: currentPassword, returnSecureToken: false })
      });

      if (!verifyResponse.ok) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta.', field: 'current' });
      }

      await auth.updateUser(userId, { password: newPassword });

      res.status(200).json({ message: 'Contraseña actualizada con éxito.' });

    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  });

  app.patch("/api/users/:id/role", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { id } = req.params;
      const { role } = req.body;
      
      const userDoc = await firestore.collection("usuarios").doc(id).get();
      if (userDoc.data()?.role === 'owner') return res.status(403).json({ error: "No se puede cambiar el rol del Propietario (Owner)" });

      await firestore.collection("usuarios").doc(id).update({ role });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Vite middleware for development
  app.get("/api/logs", async (req, res) => {
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

  app.get("/api/stats", async (req, res) => {
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
      
      // Sales by user
      const salesByUser: Record<string, { count: number, total: number, username: string }> = {};
      sales.forEach(sale => {
        if (!salesByUser[sale.userId]) {
          const user = users.find(u => u.id === sale.userId);
          salesByUser[sale.userId] = { count: 0, total: 0, username: user?.username || "Unknown" };
        }
        salesByUser[sale.userId].count += 1;
        salesByUser[sale.userId].total += (sale.total || 0);
      });

      // Top selling books
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

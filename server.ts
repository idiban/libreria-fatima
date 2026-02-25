import express from "express";
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
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

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
      const { bookId, quantity, sellerId } = req.body;
      const bookRef = firestore.collection("libros").doc(bookId);
      
      await firestore.runTransaction(async (transaction) => {
        const bookDoc = await transaction.get(bookRef);
        if (!bookDoc.exists) throw new Error("El libro no existe");
        
        const currentStock = bookDoc.data()?.stock || 0;
        if (currentStock < quantity) throw new Error("Stock insuficiente");
        
        transaction.update(bookRef, { stock: currentStock - quantity });
        
        const saleRef = firestore.collection("ventas").doc();
        transaction.set(saleRef, {
          bookId,
          quantity,
          sellerId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          totalPrice: (bookDoc.data()?.precio || 0) * quantity
        });
      });
      
      res.json({ success: true });
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

  // API Routes - Users & Auth
  app.get("/api/users/suggest", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") return res.json([]);
      
      const query = normalizeUsername(q);
      const snapshot = await firestore.collection("usuarios")
        .where("username_lowercase", ">=", query)
        .where("username_lowercase", "<=", query + "\uf8ff")
        .limit(5)
        .get();
        
      const suggestions = snapshot.docs.map(doc => ({
        id: doc.id,
        username: doc.data().username,
        email: doc.data().email
      }));
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

      res.cookie("user", JSON.stringify(user), { httpOnly: true, sameSite: 'none', secure: true });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/logout", (req, res) => {
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

      const sales = salesSnapshot.docs.map(doc => doc.data());
      const books = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
          salesByBook[sale.bookId] = { count: 0, title: book?.titulo || "Unknown" };
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

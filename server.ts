import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

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

  app.use(express.json());

  // API Routes
  app.get("/api/books", async (req, res) => {
    const firestore = getFirestore();
    if (!firestore) {
      return res.status(500).json({ error: "Firebase not configured. Please set environment variables." });
    }
    
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
      const { title, author, price, stock, cover_url, contraportada_url } = req.body;
      const docRef = await firestore.collection("libros").add({
        titulo: title,
        autor: author,
        precio: price,
        stock: stock,
        portada_url: cover_url,
        contraportada_url: contraportada_url || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      const newDoc = await docRef.get();
      const data = newDoc.data();
      res.status(201).json({ 
        id: docRef.id, 
        title: data?.titulo,
        author: data?.autor,
        price: data?.precio,
        stock: data?.stock,
        cover_url: data?.portada_url
      });
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
      if (updates.cover_url !== undefined) firestoreUpdates.portada_url = updates.cover_url;
      if (updates.contraportada_url !== undefined) firestoreUpdates.contraportada_url = updates.contraportada_url;

      await firestore.collection("libros").doc(id).update(firestoreUpdates);
      const updatedDoc = await firestore.collection("libros").doc(id).get();
      const data = updatedDoc.data();
      res.json({ 
        id: updatedDoc.id, 
        title: data?.titulo,
        author: data?.autor,
        price: data?.precio,
        stock: data?.stock,
        cover_url: data?.portada_url
      });
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

  // Vite middleware for development
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

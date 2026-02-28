import express from "express";
import { getFirestore, admin } from "../firebase.ts";
import { logActivity } from "../utils.ts";

const router = express.Router();

router.get("/", async (req, res) => {
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

router.post("/", async (req, res) => {
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
    
    // --- NUEVO: LOG DE CREACIÓN DE LIBRO ---
    const userCookie = req.cookies?.user;
    if (userCookie) {
      const user = JSON.parse(userCookie);
      await logActivity(user.id, user.username, "BOOK_CREATE", { title: title, price: price });
    }

    res.status(201).json({ id: docRef.id, title: data?.titulo, author: data?.autor, price: data?.precio, stock: data?.stock, cover_url: data?.portada_url });
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

router.delete("/:id", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { id } = req.params;
    
    // --- NUEVO: OBTENER NOMBRE ANTES DE BORRAR PARA EL LOG ---
    const bookDoc = await firestore.collection("libros").doc(id).get();
    const bookTitle = bookDoc.data()?.titulo;

    await firestore.collection("libros").doc(id).delete();

    // --- NUEVO: LOG DE ELIMINACIÓN DE LIBRO ---
    const userCookie = req.cookies?.user;
    if (userCookie && bookTitle) {
      const user = JSON.parse(userCookie);
      await logActivity(user.id, user.username, "BOOK_DELETE", { title: bookTitle });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

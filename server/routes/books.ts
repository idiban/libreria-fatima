import express from "express";
import { getFirestore, admin } from "../firebase.ts";
import { logActivity, uploadImageToStorage } from "../utils.ts";

const router = express.Router();

router.get("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });
  
  try {
    const bucket = admin.storage().bucket();
    const snapshot = await firestore.collection("libros").orderBy("titulo").get();
    
    const books = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();

      // Mantenemos la URL estática: Arregla el problema de Shift+F5 en producción.
      const getRealUrl = (path: string) => {
        if (!path) return path;
        if (path.startsWith('http')) return path; // Por si la DB ya tiene URLs completas guardadas
        const encodedPath = encodeURIComponent(path);
        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
      };

      return { 
        id: doc.id, 
        title: data.titulo || "",
        author: data.autor || "",
        price: data.precio || 0,
        stock: data.stock || 0,
        category: data.categoria || "",
        description: data.descripcion || "",
        cover_url: getRealUrl(data.portada_url),
        contraportada_url: getRealUrl(data.contraportada_url),
        createdAt: data.createdAt
      };
    }));

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
    
    const finalCoverUrl = await uploadImageToStorage(cover_url, 'portadas');
    const finalContraportadaUrl = contraportada_url ? await uploadImageToStorage(contraportada_url, 'contraportadas') : null;

    const docRef = await firestore.collection("libros").add({
      titulo: title,
      autor: author,
      precio: price,
      stock: stock,
      categoria: category || "",
      descripcion: description || "",
      portada_url: finalCoverUrl,
      contraportada_url: finalContraportadaUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const newDoc = await docRef.get();
    const data = newDoc.data();
    
    const userCookie = req.signedCookies?.user;
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
    const bucket = admin.storage().bucket();
    
    const bookDoc = await firestore.collection("libros").doc(id).get();
    const oldData = bookDoc.data();

    // NUEVA FUNCIÓN DE BORRADO: Capaz de limpiar las URLs corruptas de pruebas anteriores
    const deleteFile = async (pathOrUrl: string) => {
      if (!pathOrUrl) return;
      let pathToDelete = pathOrUrl;

      if (pathOrUrl.startsWith('http')) {
        const match = pathOrUrl.match(/o\/(.+?)\?alt=media/);
        if (match && match[1]) {
          pathToDelete = decodeURIComponent(match[1]);
        } else {
          return; // No es una URL de Firebase válida, no hacemos nada
        }
      }

      await bucket.file(pathToDelete).delete().catch(e => console.error("Error borrando archivo antiguo:", e));
    };
    
    if (updates.title !== undefined) firestoreUpdates.titulo = updates.title;
    if (updates.author !== undefined) firestoreUpdates.autor = updates.author;
    if (updates.price !== undefined) firestoreUpdates.precio = updates.price;
    if (updates.stock !== undefined) firestoreUpdates.stock = updates.stock;
    if (updates.category !== undefined) firestoreUpdates.categoria = updates.category;
    if (updates.description !== undefined) firestoreUpdates.descripcion = updates.description;
    
    // CORRECCIÓN VITAL: Solo procesamos y subimos si NO es una URL http (es decir, si es realmente una imagen nueva)
    if (updates.cover_url !== undefined && !updates.cover_url.startsWith('http')) {
      if (oldData?.portada_url) await deleteFile(oldData.portada_url);
      firestoreUpdates.portada_url = await uploadImageToStorage(updates.cover_url, 'portadas');
    }
    if (updates.contraportada_url !== undefined && !updates.contraportada_url.startsWith('http')) {
      if (oldData?.contraportada_url) await deleteFile(oldData.contraportada_url);
      firestoreUpdates.contraportada_url = await uploadImageToStorage(updates.contraportada_url, 'contraportadas');
    }

    await firestore.collection("libros").doc(id).update(firestoreUpdates);
    
    if (updates.stock !== undefined) {
      const updatedBookDoc = await firestore.collection("libros").doc(id).get();
      const bookData = updatedBookDoc.data();
      const userCookie = req.signedCookies?.user; 
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
    const bucket = admin.storage().bucket();

    const bookDoc = await firestore.collection("libros").doc(id).get();
    if (!bookDoc.exists) return res.status(404).json({ error: "Libro no encontrado" });
    
    const data = bookDoc.data();
    const bookTitle = data?.titulo;

    // Utilizamos la misma función inteligente de borrado para el DELETE
    const deleteFile = async (pathOrUrl: string) => {
      if (!pathOrUrl) return;
      let pathToDelete = pathOrUrl;

      if (pathOrUrl.startsWith('http')) {
        const match = pathOrUrl.match(/o\/(.+?)\?alt=media/);
        if (match && match[1]) {
          pathToDelete = decodeURIComponent(match[1]);
        } else {
          return;
        }
      }

      await bucket.file(pathToDelete).delete().catch(e => console.error("Error borrando archivo:", e));
    };

    if (data?.portada_url) await deleteFile(data.portada_url);
    if (data?.contraportada_url) await deleteFile(data.contraportada_url);

    await firestore.collection("libros").doc(id).delete();

    const userCookie = req.signedCookies?.user;
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
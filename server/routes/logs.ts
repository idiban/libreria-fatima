import express from "express";
import { getFirestore } from "../firebase.ts";

const router = express.Router();

router.get("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    // Traemos los últimos 100 registros ordenados por el más reciente
    const snapshot = await firestore.collection("logs")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();
      
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    res.json(logs);
  } catch (error) {
    console.error("Error al obtener logs:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
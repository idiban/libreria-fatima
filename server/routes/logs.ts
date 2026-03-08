import express from "express";
import { getFirestore, admin } from "../firebase.ts";
import { checkRole } from "../middleware.ts"; 

const router = express.Router();

router.get("/", checkRole(["owner"]), async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { lastId, startDate, endDate, limit = 50 } = req.query;
    const pageSize = Math.min(Number(limit), 200);

    let query: any = firestore.collection("logs").orderBy("timestamp", "desc");

    if (startDate) {
      // El frontend ya envía la fecha exacta calculada
      query = query.where("timestamp", ">=", admin.firestore.Timestamp.fromDate(new Date(startDate as string)));
    }
    if (endDate) {
      // El frontend ya envía la fecha exacta calculada
      query = query.where("timestamp", "<=", admin.firestore.Timestamp.fromDate(new Date(endDate as string)));
    }

    if (lastId) {
      const lastDoc = await firestore.collection("logs").doc(lastId as string).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.limit(pageSize).get();
      
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
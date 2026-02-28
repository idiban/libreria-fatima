import express from "express";
import { getFirestore, admin } from "../firebase.ts";
import { logActivity, normalizeUsername, generateEmail } from "../utils.ts";

const router = express.Router();

router.get("/suggest", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { q } = req.query;
    if (!q || typeof q !== "string") return res.json([]);
    
    const query = normalizeUsername(q);
    
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

router.get("/", async (req, res) => {
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

router.patch("/:id/password", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const userDoc = await firestore.collection("usuarios").doc(id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "Usuario no encontrado" });
    
    const email = userDoc.data()?.email;
    if (!email) return res.status(400).json({ error: "Usuario sin email" });

    const authUser = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(authUser.uid, { password });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { username, password, role } = req.body;
    const normalizedUsername = normalizeUsername(username);
    const email = generateEmail(username);
    
    const existing = await firestore.collection("usuarios")
      .where("username_lowercase", "==", normalizedUsername)
      .get();
    
    if (!existing.empty) return res.status(400).json({ error: "El usuario ya existe" });

    const authUser = await admin.auth().createUser({
      email,
      password,
      displayName: username
    });

    const docRef = await firestore.collection("usuarios").doc(authUser.uid).set({
      username,
      username_lowercase: normalizedUsername,
      email,
      role: role || 'vendedor',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

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

router.delete("/:id", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const { id } = req.params;
    const userDoc = await firestore.collection("usuarios").doc(id).get();
    
    if (!userDoc.exists) return res.status(404).json({ error: "Usuario no encontrado" });
    if (userDoc.data()?.role === 'owner') return res.status(403).json({ error: "No se puede eliminar al Propietario (Owner)" });

    try {
      await admin.auth().deleteUser(id);
    } catch (e) {
      console.warn("User not found in Auth, but deleting from Firestore anyway");
    }

    await firestore.collection("usuarios").doc(id).delete();

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

router.patch("/:id", async (req, res) => {
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
      if (userDoc.data()?.role === 'owner' && role !== 'owner') {
         return res.status(403).json({ error: "No se puede cambiar el rol del Propietario" });
      }
      updates.role = role;
    }

    await firestore.collection("usuarios").doc(id).update(updates);
    
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

router.patch("/:id/role", async (req, res) => {
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

export default router;

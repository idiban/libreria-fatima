import express from "express";
import { getFirestore, admin } from "../firebase.ts";
import { logActivity, normalizeUsername } from "../utils.ts";
import { checkAuth } from "../middleware.ts";

const router = express.Router();

router.post("/login", async (req, res) => {
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

router.post("/refresh-session", (req, res) => {
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

router.post("/logout", async (req, res) => {
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

router.get("/me", (req, res) => {
  const userCookie = req.cookies.user;
  if (!userCookie) return res.status(401).json({ error: "No autenticado" });
  res.json(JSON.parse(userCookie));
});

router.post("/change-password", async (req, res) => {
  const firestore = getFirestore();
  if (!firestore) return res.status(500).json({ error: "Firebase not configured" });

  try {
    const userCookie = req.cookies.user;
    if (!userCookie) return res.status(401).json({ error: "No autenticado" });
    
    const currentUser = JSON.parse(userCookie);
    const { newPassword } = req.body;

    await admin.auth().updateUser(currentUser.id, { password: newPassword });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.patch('/me/password', checkAuth, async (req, res) => {
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

    // --- NUEVO: LOG DE CONTRASEÑA PROPIA ---
    await logActivity(currentUser.id, currentUser.username, "USER_UPDATE", { 
      details: "Actualizó su propia contraseña" 
    });

    res.status(200).json({ message: 'Contraseña actualizada con éxito.' });

  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;


import { getFirestore, admin } from "./firebase.ts";

export const normalizeUsername = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const generateEmail = (username: string) => {
  const cleanName = username.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, '.');
  return `${cleanName}@libreriafatima.cl`;
};

export const logActivity = async (userId: string, username: string, action: string, details: any = {}) => {
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

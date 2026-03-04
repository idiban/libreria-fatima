
import { getFirestore, admin } from "./firebase.ts";
import crypto from "crypto";

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

export const uploadImageToStorage = async (base64String: string, folder: string): Promise<string> => {
  if (!base64String || !base64String.startsWith('data:image')) {
    return base64String || ""; // Si ya es una URL o está vacío, no hace nada
  }

  const bucket = admin.storage().bucket();
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('El formato de la imagen no es válido');
  }

  const mimeType = matches[1];
  const imageBuffer = Buffer.from(matches[2], 'base64');
  const extension = mimeType.split('/')[1] || 'jpeg';
  
  // Genera un nombre único: portadas/img_123456_abcd.jpeg
  const filename = `${folder}/img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`;
  const file = bucket.file(filename);
  const uuid = crypto.randomUUID(); 

  await file.save(imageBuffer, {
    metadata: { 
      contentType: mimeType,
      metadata: { firebaseStorageDownloadTokens: uuid }
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${uuid}`;
};

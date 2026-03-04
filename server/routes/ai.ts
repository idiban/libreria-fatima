import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

// --- FUNCIÓN PARA AGREGAR EL MARGEN (LO NUEVO) ---
const expandPoints = (points: any, margin: number = 0.04) => {
  const cx = (points.top_left.x + points.top_right.x + points.bottom_right.x + points.bottom_left.x) / 4;
  const cy = (points.top_left.y + points.top_right.y + points.bottom_right.y + points.bottom_left.y) / 4;

  const expand = (p: { x: number; y: number }) => ({
    x: Math.round(Math.max(0, Math.min(1000, cx + (p.x - cx) * (1 + margin)))),
    y: Math.round(Math.max(0, Math.min(1000, cy + (p.y - cy) * (1 + margin))))
  });

  return {
    top_left: expand(points.top_left),
    top_right: expand(points.top_right),
    bottom_right: expand(points.bottom_right),
    bottom_left: expand(points.bottom_left)
  };
};

// Ruta para Refinar Imagen
router.post("/refine-image", async (req, res) => {
  const rawKey = process.env.GEMINI_KEY_FINAL || "";
  const apiKey = rawKey.replace(/['"]/g, '').trim();

  if (!apiKey) return res.status(500).json({ error: "API Key no configurada en el servidor" });

  try {
    const { base64, side } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = base64.split(',')[1];

    const promptText = `Actúa como un sistema experto de visión artificial. Analiza la imagen y detecta los 4 vértices del CONTORNO EXTERIOR FÍSICO del libro entero (${side === 'front' ? 'portada' : 'contraportada'}). 
    REGLAS CRÍTICAS: 
    1. Debes enmarcar TODO EL LIBRO de extremo a extremo físico. El borde es el límite donde termina el material del libro y empieza el fondo (mesas, baldosas).
    2. NUNCA recortes solo una foto, texto o recuadro interno del diseño del libro. Si ves letras, esas están DENTRO del libro.
    3. Excluye por completo el fondo (mesa, mantel, etc).
    4. El sistema de coordenadas está normalizado de 0 a 1000:
       - X=0 es el borde izquierdo absoluto de la foto, X=1000 es el borde derecho absoluto.
       - Y=0 es el borde superior absoluto de la foto, Y=1000 es el borde inferior absoluto.
    Devuelve ÚNICAMENTE un JSON con las 4 esquinas exactas (top_left, top_right, bottom_right, bottom_left). Cada esquina debe tener 'x' e 'y'.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            top_left: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ["x", "y"] },
            top_right: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ["x", "y"] },
            bottom_right: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ["x", "y"] },
            bottom_left: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ["x", "y"] }
          },
          required: ["top_left", "top_right", "bottom_right", "bottom_left"]
        }
      }
    });

    const rawPoints = JSON.parse(response.text || "{}");
    
    // APLICACIÓN DEL MARGEN (4%)
    const points = expandPoints(rawPoints, 0.04);

    res.json({ points });
  } catch (error: any) {
    console.error("AI Refine Error:", error);
    res.status(500).json({ error: "Error al detectar las esquinas de la imagen." });
  }
});

// Ruta para Escanear Datos del Libro (TOTALMENTE INTACTA)
router.post("/scan-book", async (req, res) => {
  const rawKey = process.env.GEMINI_KEY_FINAL || "";
  const apiKey = rawKey.replace(/['"]/g, '').trim();

  if (!apiKey) return res.status(500).json({ error: "API Key no configurada en el servidor" });

  try {
    const { cover_url, contraportada_url } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    const categoriasPermitidas = ["Espiritualidad", "Sagradas Escrituras", "Filosofía y Teología", "Magisterio y Catecismo", "Crisis de la Iglesia", "Santísima Virgen María", "Vida de Santos", "Historia y Literatura", "Monseñor Lefebvre"];
    const promptInstruction = `Analiza estas imágenes de un libro (portada y/o contraportada). Extrae el título, autor, categoría y descripción completa. IMPORTANTE: 1) En el campo 'title' pon ÚNICAMENTE el título principal del libro, ignora subtítulos or textos secundarios largos. 2) Tanto el título como el autor deben usar mayúsculas y minúsculas correctamente (formato de nombre propio), NUNCA todo en mayúsculas. 3) OBLIGATORIO: Para la 'category', DEBES elegir ESTRICTAMENTE una de esta lista: ${categoriasPermitidas.join(', ')}. Si el libro no encaja perfecto, elige la más cercana. Responde estrictamente en JSON.`;

    const parts: any[] = [{ text: promptInstruction }];
    
    if (cover_url) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: cover_url.split(',')[1] } });
    }
    if (contraportada_url) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: contraportada_url.split(',')[1] } });
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            category: { type: Type.STRING, enum: categoriasPermitidas },
            description: { type: Type.STRING }
          },
          required: ["title", "author", "category", "description"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("AI Scan Error:", error);
    res.status(500).json({ error: "Error al escanear datos con IA." });
  }
});

export default router;
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

// Ruta para Refinar Imagen
router.post("/refine-image", async (req, res) => {
  // Obtenemos la llave y le quitamos espacios en blanco o comillas accidentales
  // Obtenemos la llave usando EL NUEVO NOMBRE
  const rawKey = process.env.GEMINI_KEY_FINAL || "";
  const apiKey = rawKey.replace(/['"]/g, '').trim();

  if (!apiKey) return res.status(500).json({ error: "API Key no configurada en el servidor" });
  

  try {
    const { base64, side } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `RECORTE Y ENDEREZADO PROFESIONAL TOTAL: Detecta la ${side === 'front' ? 'portada' : 'contraportada'} del libro en la imagen. Corrige la perspectiva para que se vea perfectamente recta, plana y rectangular (vista de escaneo). REGLA OBLIGATORIA: Amplía la ${side === 'front' ? 'portada' : 'contraportada'} al máximo posible de forma que ocupe el 100% exacto de la imagen, de borde a borde. Prohibido dejar márgenes gruesos alrededor. ELIMINA ABSOLUTAMENTE TODO EL FONDO ORIGINAL: baldosas, suelo, piso, sombras, manos, dedos, muebles, madera, paredes o cualquier objeto externo. REGLA CRÍTICA DE BORDES: Si al enderezar o rotar quedan espacios vacíos o triangulares en las esquinas del encuadre rectangular final, rellena esos espacios vacíos ÚNICAMENTE con un color sólido y uniforme BLANCO GRISÁCEO CLARO (hex #F0F0F0). Devuelve la imagen perfectamente rectangular, rellenando todo el encuadre de forma gigante.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64.split(',')[1], mimeType: "image/jpeg" } },
          { text: promptText },
        ],
      },
    });

    let newImage = base64;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        newImage = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    res.json({ image: newImage });
  } catch (error: any) {
    console.error("AI Refine Error:", error);
    res.status(500).json({ error: "Error al procesar la imagen con IA." });
  }
});

// Ruta para Escanear Datos del Libro
router.post("/scan-book", async (req, res) => {
  // Obtenemos la llave y le quitamos espacios en blanco o comillas accidentales
  // Obtenemos la llave usando EL NUEVO NOMBRE
  const rawKey = process.env.GEMINI_KEY_FINAL || "";
  const apiKey = rawKey.replace(/['"]/g, '').trim();

  if (!apiKey) return res.status(500).json({ error: "API Key no configurada en el servidor" });
  

  try {
    const { cover_url, contraportada_url } = req.body;
    const ai = new GoogleGenAI({ apiKey });

    const categoriasPermitidas = ["Espiritualidad", "Filosofía", "Crisis de la Iglesia", "Historia", "Vidas de Santos"];
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
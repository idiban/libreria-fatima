import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

// Añade checkAuth a tu importación de middleware:
import { sessionMiddleware, checkAuth } from "./server/middleware.ts"; 

import booksRouter from "./server/routes/books.ts";
import salesRouter from "./server/routes/sales.ts";
import clientsRouter from "./server/routes/clients.ts";
import debtsRouter from "./server/routes/debts.ts";
import usersRouter from "./server/routes/users.ts";
import authRouter from "./server/routes/auth.ts";
import statsRouter from "./server/routes/stats.ts";
import logsRouter from "./server/routes/logs.ts";
import aiRoutes from './server/routes/ai.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  // Recuerda que aquí pusimos el secreto de la cookie:
  app.use(cookieParser("secreto_libreria_fatima_2024")); 

  app.use(sessionMiddleware);

  // --- ORDEN DE RUTAS CORREGIDO Y PROTEGIDO ---
  
  // 1. Auth no lleva checkAuth porque el usuario necesita poder hacer login
  app.use("/api", authRouter);         

  // 2. A todas las demás, les ponemos el candado checkAuth en la puerta principal:
  app.use("/api/books", booksRouter);
  app.use("/api/sales", checkAuth, salesRouter);
  app.use("/api/clients", checkAuth, clientsRouter);
  app.use("/api/debts", checkAuth, debtsRouter);
app.use("/api/users", usersRouter);
  app.use("/api/stats", checkAuth, statsRouter);
  app.use("/api/logs", checkAuth, logsRouter);
  app.use('/api/ai', checkAuth, aiRoutes);
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
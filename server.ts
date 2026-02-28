import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

import { sessionMiddleware } from "./server/middleware.ts";
import booksRouter from "./server/routes/books.ts";
import salesRouter from "./server/routes/sales.ts";
import clientsRouter from "./server/routes/clients.ts";
import debtsRouter from "./server/routes/debts.ts";
import usersRouter from "./server/routes/users.ts";
import authRouter from "./server/routes/auth.ts";
import statsRouter from "./server/routes/stats.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Middleware to extend session on activity
  app.use(sessionMiddleware);

  // API Routes
  app.use("/api/books", booksRouter);
  app.use("/api/sales", salesRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/debts", debtsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api", authRouter);
  app.use("/api", statsRouter);

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

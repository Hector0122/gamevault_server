import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import gameRoutes from "./routes/game.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
// La app RN ignora CORS; esto solo restringe a clientes web. Sin
// CORS_ORIGIN queda abierto, igual que antes.
app.use(
  cors(
    process.env.CORS_ORIGIN
      ? { origin: process.env.CORS_ORIGIN.split(",") }
      : undefined
  )
);
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", gameRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GameVault server running at http://localhost:${PORT}`);
});

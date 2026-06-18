import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import gameRoutes from './routes/game.routes.js';
import { errorHandler } from './middleware/error.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use('/api', gameRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GameVault server running at http://localhost:${PORT}`);
});

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import orderRoutes from './routes/orders.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/orders', orderRoutes);

app.listen(process.env.PORT, () => console.log(`Order Service (Neo4j) running on port ${process.env.PORT}`));
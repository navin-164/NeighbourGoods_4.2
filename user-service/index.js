import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ User DB Connected'))
  .catch(err => console.error(err));

app.use('/api/auth', authRoutes); // Auth routes

app.listen(process.env.PORT, () => console.log(`User Service running on port ${process.env.PORT}`));
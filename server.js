import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// --- 1. SERVE FRONTEND STATIC FILES ---
app.use(express.static(path.join(__dirname, 'public')));

// --- 2. SPECIFIC ROUTES (MUST BE FIRST!) ---
// These are specific "exceptions" that start with /api/auth but should NOT go to User Service

// Lender Dashboard -> Product Service (Port 5002)
app.use('/api/auth/dashboard/lender', createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: { '^/api/auth/dashboard/lender': '/api/items/dashboard/lender' }
}));

// Customer Dashboard -> Order Service (Port 5003)
app.use('/api/auth/dashboard/customer', createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: { '^/api/auth/dashboard/customer': '/api/orders/dashboard/customer' }
}));

// Recommendations -> Order Service (Port 5003)
app.use('/api/auth/dashboard/recommendations', createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: { '^/api/auth/dashboard/recommendations': '/api/orders/dashboard/recommendations' }
}));


// --- 3. GENERAL MICROSERVICE ROUTES ---

// AUTH SERVICE (Port 5001) - Catches all OTHER /api/auth requests
app.use('/api/auth', createProxyMiddleware({ 
    target: 'http://localhost:5001', 
    changeOrigin: true 
}));

// PRODUCT SERVICE (Port 5002)
app.use('/api/items', createProxyMiddleware({ 
    target: 'http://localhost:5002', 
    changeOrigin: true 
}));

// UPLOADS (Served by Product Service)
app.use('/uploads', createProxyMiddleware({ 
    target: 'http://localhost:5002', 
    changeOrigin: true 
}));

// ORDER SERVICE (Port 5003)
app.use('/api/orders', createProxyMiddleware({ 
    target: 'http://localhost:5003', 
    changeOrigin: true 
}));

// --- 4. FALLBACK ROUTE ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(5000, () => console.log('🚀 Gateway running on http://localhost:5000'));
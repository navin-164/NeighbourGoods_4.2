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
// This serves index.html, style.css, and script.js from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- 2. MICROSERVICE PROXIES ---

// 1. AUTH SERVICE (Port 5001)
app.use('/api/auth', createProxyMiddleware({ 
    target: 'http://localhost:5001', 
    changeOrigin: true 
}));

// 2. PRODUCT SERVICE (Port 5002)
// Handles items and serves uploaded images
app.use('/api/items', createProxyMiddleware({ 
    target: 'http://localhost:5002', 
    changeOrigin: true 
}));

// Proxy for uploads folder (served by Product Service)
app.use('/uploads', createProxyMiddleware({ 
    target: 'http://localhost:5002', 
    changeOrigin: true 
}));

// 3. ORDER SERVICE (Port 5003)
// Handles borrowing, buying, and transaction history
app.use('/api/orders', createProxyMiddleware({ 
    target: 'http://localhost:5003', 
    changeOrigin: true 
}));

// --- 3. LEGACY ROUTE MAPPING (Dashboard) ---

// Forward "Lender Dashboard" requests to Product Service
app.use('/api/auth/dashboard/lender', createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: { '^/api/auth/dashboard/lender': '/api/items/dashboard/lender' }
}));

// Forward "Customer Dashboard" requests to Order Service
app.use('/api/auth/dashboard/customer', createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: { '^/api/auth/dashboard/customer': '/api/orders/dashboard/customer' }
}));

// Forward "Recommendations" to Order Service
app.use('/api/auth/dashboard/recommendations', createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: { '^/api/auth/dashboard/recommendations': '/api/orders/dashboard/recommendations' }
}));

// --- 4. FALLBACK ROUTE ---
// If a request doesn't match an API route or a static file, serve index.html
// This ensures the app works like a Single Page Application (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(5000, () => console.log('🚀 Gateway running on http://localhost:5000'));
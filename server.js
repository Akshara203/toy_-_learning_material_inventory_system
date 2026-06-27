import express from 'express';
import path from 'path';
import net from 'net';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config'; // Crucial for loading environment variables like DB credentials locally

// Routes
import authRouter from './backend/routes/auth.js';
import inventoryRouter from './backend/routes/inventory.js';
import categoriesRouter from './backend/routes/categories.js';
import stockRouter from './backend/routes/stock.js';
import damageRouter from './backend/routes/damage.js';
import dashboardRouter from './backend/routes/dashboard.js';
import reportsRouter from './backend/routes/reports.js';

// Helper function to check if a specific port is free
function checkPort(port, host = '0.0.0.0') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Resolve false for other terminal connection/listen failures as well
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, host);
  });
}

// Helper function to scan ports starting from a base index
async function getAvailablePort(startPort, host = '0.0.0.0', maxAttempts = 100) {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const isAvailable = await checkPort(port, host);
    if (isAvailable) {
      return port;
    }
    console.warn(`[Port Conflict] Port ${port} is currently busy. Scanning next port...`);
    port++;
  }
  throw new Error(`Exceeded ${maxAttempts} port probe attempts. No available ports found starting from ${startPort}.`);
}

async function startServer() {
  const app = express();
  
  // Probe port dynamically (defaults to port process.env.PORT or 3000)
  const basePort = parseInt(process.env.PORT || '3000', 10);
  const PORT = await getAvailablePort(basePort, '0.0.0.0');

  // Parse incoming payload headers
  app.use(express.json());

  // CORS middleware supporting credentials and dynamic origins for production
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // 1. Core API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/stock', stockRouter);
  app.use('/api/damage', damageRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);

  // 2. Client Side static routing middleware
  if (process.env.NODE_ENV !== 'production') {
    console.log('Mounting Vite middleware in development mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production-built assets from /dist...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server listener with robust event handlers
  const serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server Ready] Full Stack Application running!`);
    console.log(`  -> Local:   http://localhost:${PORT}`);
    console.log(`  -> Network: http://0.0.0.0:${PORT}`);
    if (PORT !== basePort) {
      console.warn(`[Warning Alert] Preferred port ${basePort} was busy. Fallback assigned port: ${PORT}.`);
    }
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Critical Server Error] Port ${PORT} occupied while trying to listen. Please try starting again.`);
      process.exit(1);
    } else {
      console.error(`[Fatal Server Error] Uncaught error during request listener:`, err.message);
    }
  });
}

startServer().catch((error) => {
  console.error('Fatal: Server failed to launch:', error);
});

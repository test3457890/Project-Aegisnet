import { createServer } from 'http';
import { app } from './server';
import { initWebSocket } from './websocket/ws';
import { initDb } from './db/db';
import { seedDb } from './db/seed';

const PORT = Number(process.env.API_PORT || 8000);

const startServer = async () => {
  try {
    // Ensure DB schema is ready
    await initDb();
    await seedDb({ initialize: false });

    const server = createServer(app);
    initWebSocket(server);

    server.listen(PORT, "127.0.0.1", () => {
      console.log(`[AegisNet API] MVP backend running at http://localhost:${PORT}`);
      console.log(`[AegisNet API] Health: http://localhost:${PORT}/health`);
      console.log(`[AegisNet API] WebSocket: ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

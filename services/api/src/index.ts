import { createServer } from 'http';
import { config } from 'dotenv';
import { assertPrototypeEnvironment } from './config/prototype';

const startServer = async () => {
  try {
    config();
    assertPrototypeEnvironment();
    const PORT = Number(process.env.API_PORT || 8000);
    if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
      throw new Error('API_PORT must be an integer from 0 to 65535.');
    }
    // Import stateful modules only after the production gate succeeds.
    const { app } = await import('./server');
    const { initWebSocket } = await import('./websocket/ws');
    const { initDb } = await import('./db/db');
    const { seedDb } = await import('./db/seed');
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

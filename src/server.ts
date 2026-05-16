/**
 * @file server.ts - 핑이 백엔드 서버 진입점
 *
 * HTTP 서버를 생성하고 Socket.io WebSocket을 초기화한 후 서버를 시작한다.
 * SIGTERM 시그널을 수신하면 graceful shutdown을 수행한다.
 */
import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { initializeWebSocket } from './websocket';

const httpServer = createServer(app);

initializeWebSocket(httpServer);

httpServer.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🐕 Pingi Backend Server                             ║
║                                                       ║
║   Local:    http://localhost:${config.port}                   ║
║   Docs:     http://localhost:${config.port}/api-docs          ║
║   Health:   http://localhost:${config.port}/v1/health         ║
║   WebSocket: ws://localhost:${config.port}/v1/ws              ║
║                                                       ║
║   Environment: ${config.nodeEnv.padEnd(36)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

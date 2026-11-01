import { loadConfig } from './config';
import { createApp } from './app';

const config = loadConfig();

const app = await createApp(config);
await app.listen({ port: config.port });

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, 'shutdown: close connections');
  await app.close();
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

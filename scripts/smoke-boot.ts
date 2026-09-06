import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';
import { connectRedis } from '../src/lib/redis';

async function main() {
  await connectDatabase();
  console.info('DB_OK');
  await connectRedis();
  console.info('REDIS_OK');

  const app = createApp();
  const server = app.listen(5055, async () => {
    console.info('LISTEN_OK');
    try {
      const res = await fetch('http://127.0.0.1:5055/api/v1/health');
      const json = await res.json();
      console.info('HEALTH', JSON.stringify(json));
    } catch (error) {
      console.error('HEALTH_FAIL', error);
    } finally {
      server.close(() => process.exit(0));
    }
  });
}

main().catch((error) => {
  console.error('BOOT_FAIL', error);
  process.exit(1);
});

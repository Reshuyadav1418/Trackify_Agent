import { createApp } from './app';
import { connectDB } from './db/connect';
import { config } from './config/env';

const app = createApp();

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(config.port, '0.0.0.0', () => {
        console.log(`[API] Trackify API server running at http://localhost:${config.port}`);
      });
    })
    .catch((err) => {
      console.error('[API] Failed to start server:', err);
      process.exit(1);
    });
}

export default app;

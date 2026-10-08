/**
 * One-time migration: rename @teamlogger.com seed accounts to @trackify.com
 * Run once with: npx tsx src/migrate-emails.ts
 */
import { connectDB, disconnectDB } from './db/connect';
import { UserModel } from './models';

const EMAIL_MAP: Record<string, string> = {
  'admin@teamlogger.com':    'admin@trackify.com',
  'manager@teamlogger.com':  'manager@trackify.com',
  'employee@teamlogger.com': 'employee@trackify.com',
};

async function run() {
  await connectDB();

  for (const [oldEmail, newEmail] of Object.entries(EMAIL_MAP)) {
    const user = await UserModel.findOne({ email: oldEmail });
    if (user) {
      user.email = newEmail;
      await user.save();
      console.log(`Updated: ${oldEmail} -> ${newEmail}`);
    } else {
      console.log(`Not found (skipping): ${oldEmail}`);
    }
  }

  await disconnectDB();
  console.log('\nMigration complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

import { connectDB, disconnectDB } from './db/connect';
import { UserModel, PolicyModel } from './models';
import { hashPassword } from './services/auth.service';

export const seedAdmin = async (): Promise<void> => {
  await connectDB();

  // 1. Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@trackify.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  const existingAdmin = await UserModel.findOne({ email: adminEmail.toLowerCase() });
  if (existingAdmin) {
    console.log(`[Seed] Admin user already exists: ${adminEmail}`);
  } else {
    const hashedPassword = await hashPassword(adminPassword);
    await UserModel.create({
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      name: adminName,
      role: 'admin',
    });
    console.log(`[Seed] Admin user created successfully: ${adminEmail}`);
  }

  // 2. Manager
  const existingManager = await UserModel.findOne({ email: 'manager@trackify.com' });
  if (!existingManager) {
    const hashedPass = await hashPassword('Pass123!');
    await UserModel.create({
      email: 'manager@trackify.com',
      password: hashedPass,
      name: 'Engineering Manager',
      role: 'manager',
    });
    console.log('[Seed] Manager user created: manager@trackify.com');
  }

  // 3. Employee
  const existingEmp = await UserModel.findOne({ email: 'employee@trackify.com' });
  if (!existingEmp) {
    const hashedPass = await hashPassword('Pass123!');
    await UserModel.create({
      email: 'employee@trackify.com',
      password: hashedPass,
      name: 'John Developer',
      role: 'employee',
    });
    console.log('[Seed] Employee user created: employee@trackify.com');
  }

  // Default Policy
  const existingPolicy = await PolicyModel.findOne({ version: 1 });
  if (!existingPolicy) {
    await PolicyModel.create({
      version: 1,
      screenshotIntervalMinutes: 10,
      isBlurEnabled: false,
      retentionDays: 30,
      consentText: 'By tracking time with Trackify, you agree to policy v1 terms.',
      isActive: true,
    });
    console.log('[Seed] Default policy v1 created');
  }

  await disconnectDB();
};


if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error seeding admin:', err);
      process.exit(1);
    });
}

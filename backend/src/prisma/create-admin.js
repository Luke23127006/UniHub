'use strict';

const { promisify } = require('util');
const crypto = require('crypto');
const prisma = require('../config/db');

const scrypt = promisify(crypto.scrypt);

// Format: scrypt:<salt_hex>:<hash_hex>  (N=16384, r=8, p=1, keylen=64)
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

async function main() {
  const email = 'admin@unihub.com';
  const password = '123456';
  const fullName = 'Admin';

  // 1. Ensure the Admin role exists
  const role = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'System administrator' },
  });
  console.log(`Role: Admin (id=${role.id})`);

  // 2. Create or update the admin user
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password_hash: passwordHash, full_name: fullName, is_active: true },
    create: { email, password_hash: passwordHash, full_name: fullName, is_active: true },
  });
  console.log(`User: ${user.email} (id=${user.id})`);

  // 3. Assign the Admin role (ignore if already assigned)
  await prisma.userRole.upsert({
    where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
    update: {},
    create: { user_id: user.id, role_id: role.id },
  });
  console.log(`Assigned Admin role to ${user.email}`);
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

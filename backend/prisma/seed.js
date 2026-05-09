const prisma = require('../src/config/db');

async function main() {
  console.log('Starting seed...');

  // 1. Create a mock admin user (creator)
  let creator = await prisma.user.findFirst({ where: { email: 'admin@unihub.com' } });
  if (!creator) {
    creator = await prisma.user.create({
      data: {
        email: 'admin@unihub.com',
        full_name: 'Admin User',
        is_active: true,
      },
    });
  }

  // 2. Create a mock room
  let room = await prisma.room.findFirst({ where: { room_code: 'ROOM-1' } });
  if (!room) {
    room = await prisma.room.create({
      data: {
        room_code: 'ROOM-1',
        name: 'Grand Hall',
        capacity: 20000,
        is_active: true,
      },
    });
  }

  // 3. Create the mock workshop (ID 1 as expected by load test)
  let workshop = await prisma.workshop.findUnique({ where: { id: 1 } });
  if (!workshop) {
    // Note: We might need to handle identity insert or just create and ensure it has the correct ID
    // If the database has no workshops, the first one will be ID 1.
    workshop = await prisma.workshop.create({
      data: {
        title: 'High-load Architecture Workshop',
        description: 'Mock workshop for load testing',
        room_id: room.id,
        event_day: new Date(),
        start_time: new Date(),
        end_time: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // +2 hours
        capacity: 12000,
        available_seats: 12000,
        is_paid: false,
        status: 'published',
        created_by: creator.id,
      },
    });
    console.log(`Created Workshop with ID: ${workshop.id}`);
  }

  // 4. Create 100,000 Users and Students for the load test
  console.log('Seeding 100,000 users and students. This might take a minute...');
  
  const totalUsers = 100000;
  const batchSize = 5000;

  for (let i = 0; i < totalUsers; i += batchSize) {
    const usersBatch = [];
    const studentsBatch = [];
    
    // Check if user already exists to avoid unique constraint errors on re-runs
    const existingUser = await prisma.user.findUnique({ where: { id: i + 1 } });
    if (existingUser) {
      console.log(`Batch ${i} to ${i + batchSize} already exists, skipping...`);
      continue;
    }

    for (let j = 1; j <= batchSize; j++) {
      const userId = i + j;
      usersBatch.push({
        id: userId,
        email: `student${userId}@unihub.local`,
        full_name: `Test Student ${userId}`,
        is_active: true,
      });
      
      studentsBatch.push({
        user_id: userId,
        student_code: `STD${userId.toString().padStart(6, '0')}`,
        full_name: `Test Student ${userId}`,
        email: `student${userId}@unihub.local`,
        is_active: true,
      });
    }

    // Prisma doesn't support forcing IDs in createMany if it's auto-incrementing in Postgres
    // However, since we are seeding an empty DB, the IDs will generally align, or we can use raw SQL
    // to ensure IDs are exactly 1 to 100,000 as expected by load test.
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO "users" (id, email, full_name, is_active, created_at, updated_at) 
      VALUES ${usersBatch.map(u => `(${u.id}, '${u.email}', '${u.full_name}', true, NOW(), NOW())`).join(', ')}
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "students" (user_id, student_code, full_name, email, is_active, created_at, updated_at) 
      VALUES ${studentsBatch.map(s => `(${s.user_id}, '${s.student_code}', '${s.full_name}', '${s.email}', true, NOW(), NOW())`).join(', ')}
      ON CONFLICT (student_code) DO NOTHING;
    `);

    console.log(`Seeded batch ${i} to ${i + batchSize}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

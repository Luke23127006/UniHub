const { Prisma } = require('@prisma/client');
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

  // 3. Create the mock workshop (expected ID 1 by load test)
  let workshop = await prisma.workshop.findUnique({ where: { id: BigInt(1) } });
  if (!workshop) {
    workshop = await prisma.workshop.create({
      data: {
        title: 'High-load Architecture Workshop',
        description: 'Mock workshop for load testing',
        room_id: room.id,
        event_day: new Date(),
        start_time: new Date(),
        end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
        capacity: 60,
        available_seats: 60,
        is_paid: false,
        status: 'published',
        created_by: creator.id,
      },
    });
    console.log(`Created Workshop with ID: ${workshop.id}`);
  }

  // 4. Seed 100,000 Users and Students using parameterised $executeRaw.
  //    $executeRawUnsafe with string interpolation was replaced here because:
  //    - it breaks on values containing single quotes or backslashes, and
  //    - Prisma.sql ensures all values are bound as parameters, not interpolated text.
  console.log('Seeding 100,000 users and students. This might take a minute...');

  const totalUsers = 100_000;
  const batchSize = 5_000;

  for (let i = 0; i < totalUsers; i += batchSize) {
    const userValues = [];
    const studentValues = [];

    for (let j = 1; j <= batchSize; j++) {
      const uid = i + j;
      const email = `student${uid}@unihub.local`;
      const fullName = `Test Student ${uid}`;
      const studentCode = `STD${uid.toString().padStart(6, '0')}`;

      userValues.push(
        Prisma.sql`(${BigInt(uid)}, ${email}, ${fullName}, true, NOW(), NOW())`
      );
      studentValues.push(
        Prisma.sql`(${BigInt(uid)}, ${studentCode}, ${fullName}, ${email}, true, NOW(), NOW())`
      );
    }

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "users" (id, email, full_name, is_active, created_at, updated_at)
        VALUES ${Prisma.join(userValues)}
        ON CONFLICT (id) DO NOTHING
      `
    );

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "students" (user_id, student_code, full_name, email, is_active, created_at, updated_at)
        VALUES ${Prisma.join(studentValues)}
        ON CONFLICT (student_code) DO NOTHING
      `
    );

    console.log(`Seeded batch ${i + 1}–${i + batchSize}`);
  }

  // 5. Advance the auto-increment sequences so organic inserts after seeding
  //    don't collide with the explicitly-set IDs (1–100,000).
  //    When explicit IDs are inserted via raw SQL, Postgres's sequence is not
  //    automatically updated and will restart from its last auto-generated value.
  await prisma.$executeRaw`
    SELECT setval(
      pg_get_serial_sequence('"users"', 'id'),
      (SELECT MAX(id) FROM "users")
    )
  `;
  await prisma.$executeRaw`
    SELECT setval(
      pg_get_serial_sequence('"students"', 'id'),
      (SELECT MAX(id) FROM "students")
    )
  `;

  console.log('Sequences reset. Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

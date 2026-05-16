const { Prisma } = require('../generated/prisma');
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Starting seed...');

  // 1. Create a mock admin user (creator)
  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash('password123', salt);

  let creator = await prisma.user.findFirst({ where: { email: 'admin@unihub.com' } });
  if (!creator) {
    creator = await prisma.user.create({
      data: {
        email: 'admin@unihub.com',
        password_hash: defaultHash,
        full_name: 'Admin User',
        is_active: true,
      },
    });
  }

  // 2. Create a standard test student user
  let testStudent = await prisma.user.findUnique({ where: { email: 'test@unihub.com' } });
  if (!testStudent) {
    testStudent = await prisma.user.create({
      data: {
        email: 'test@unihub.com',
        password_hash: defaultHash,
        full_name: 'Test Student',
        is_active: true,
      },
    });

    // Assign Student role
    let studentRole = await prisma.role.findUnique({ where: { name: 'Student' } });
    if (!studentRole) {
      studentRole = await prisma.role.create({ data: { name: 'Student' } });
    }

    await prisma.userRole.create({
      data: {
        user_id: testStudent.id,
        role_id: studentRole.id
      }
    });

    // Create student record
    await prisma.student.create({
      data: {
        user_id: testStudent.id,
        student_code: 'STD000000',
        full_name: 'Test Student',
        email: 'test@unihub.com',
        is_active: true
      }
    });
    console.log('Test student user created: test@unihub.com / password123');
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

  // 2.5. Create 5 Mock Speakers
  const speakersData = [
    { name: 'GS. Alan Turing', title: 'Cha đẻ ngành Khoa học Máy tính', org: 'Stanford University' },
    { name: 'TS. Grace Hopper', title: 'Chuyên gia Hệ thống Phân tán', org: 'MIT' },
    { name: 'Linus Torvalds', title: 'Kiến trúc sư trưởng Linux', org: 'Linux Foundation' },
    { name: 'Vitalik Buterin', title: 'Người sáng lập Ethereum', org: 'Ethereum Foundation' },
    { name: 'Don Norman', title: 'Tác giả The Design of Everyday Things', org: 'Nielsen Norman Group' }
  ];

  const createdSpeakers = [];
  for (const s of speakersData) {
    let speaker = await prisma.speaker.findFirst({ where: { full_name: s.name } });
    if (!speaker) {
      speaker = await prisma.speaker.create({
        data: {
          full_name: s.name,
          title: s.title,
          organization: s.org,
          bio: `Chuyên gia hàng đầu trong lĩnh vực ${s.title}.`,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`
        }
      });
    }
    createdSpeakers.push(speaker);
  }

  // 3. Create 10 Diversified Workshops
  const workshopsData = [
    { title: 'Hệ thống Phân tán Quy mô lớn', desc: 'Kiến trúc và các bài toán thực tế.', capacity: 100 },
    { title: 'AI & Generative Models 2024', desc: 'Ứng dụng LLM trong doanh nghiệp.', capacity: 150 },
    { title: 'Web3 & Blockchain Security', desc: 'Bảo mật hợp đồng thông minh.', capacity: 80 },
    { title: 'UX/UI Design for Luxury Tech', desc: 'Thiết kế giao diện cao cấp.', capacity: 60 },
    { title: 'Cloud Native & Kubernetes', desc: 'Triển khai hạ tầng hiện đại.', capacity: 120 },
    { title: 'React Native Performance Tuning', desc: 'Tối ưu hóa ứng dụng di động.', capacity: 90 },
    { title: 'Backend Mastery với Go & Rust', desc: 'Lập trình hiệu năng cao.', capacity: 110 },
    { title: 'Data Engineering at Scale', desc: 'Xử lý dữ liệu hàng tỷ bản ghi.', capacity: 130 },
    { title: 'Cyber Security & Zero Trust', desc: 'Bảo mật mạng thế hệ mới.', capacity: 70 },
    { title: 'Product Management 101', desc: 'Từ ý tưởng đến sản phẩm triệu đô.', capacity: 100 }
  ];

  for (let i = 0; i < workshopsData.length; i++) {
    const ws = workshopsData[i];
    const existingWs = await prisma.workshop.findFirst({ where: { title: ws.title } });
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + (i + 1));
    const startTime = new Date(eventDate.setHours(9, 0, 0, 0));
    const endTime = new Date(eventDate.setHours(12, 0, 0, 0));

    const workshopParams = {
      title: ws.title,
      description: ws.desc,
      room_id: room.id,
      event_day: eventDate,
      start_time: startTime,
      end_time: endTime,
      capacity: ws.capacity,
      available_seats: ws.capacity,
      is_paid: i % 3 === 0,
      price: i % 3 === 0 ? new Prisma.Decimal(500000) : null,
      status: 'published',
      created_by: creator.id,
    };

    let workshop;
    if (existingWs) {
      workshop = await prisma.workshop.update({
        where: { id: existingWs.id },
        data: workshopParams,
      });
      console.log(`Updated Workshop: ${ws.title}`);
    } else {
      workshop = await prisma.workshop.create({
        data: workshopParams,
      });
      console.log(`Created Workshop: ${ws.title}`);
    }

    // Assign a speaker to this workshop
    const speaker = createdSpeakers[i % createdSpeakers.length];
    const existingWSpeaker = await prisma.workshopSpeaker.findUnique({
      where: { workshop_id_speaker_id: { workshop_id: workshop.id, speaker_id: speaker.id } }
    });

    if (!existingWSpeaker) {
      await prisma.workshopSpeaker.create({
        data: {
          workshop_id: workshop.id,
          speaker_id: speaker.id,
          is_main_speaker: true,
          display_order: 1
        }
      });
    }
  }

  // 4. Seed 100,000 Users and Students using parameterised $executeRaw.
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 90000) {
    console.log(`Database already has ${existingUserCount} users. Skipping large scale seeding.`);
  } else {
    console.log('Seeding 100,000 users and students. This might take a minute...');
    const totalUsers = 100000;
    const batchSize = 5000;

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
          ON CONFLICT (user_id) DO NOTHING
        `
      );

      console.log(`Seeded batch ${i + 1}–${i + batchSize}`);
    }
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

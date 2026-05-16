const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Registration and Checkin Data ---');
  
  try {
    const registrations = await prisma.registration.findMany({
      take: 10,
      include: {
        student: { select: { full_name: true, student_code: true } },
        workshop: { select: { title: true } }
      }
    });

    console.log(`Registrations (Found ${registrations.length}):`);
    registrations.forEach(r => {
      console.log(`- ID: ${r.id}, Student: ${r.student.full_name}, Status: ${r.status}`);
    });

    const checkinCount = await prisma.checkin.count();
    console.log('\nTotal Checkins:', checkinCount);
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

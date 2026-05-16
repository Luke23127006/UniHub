const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.workshop.count();
  console.log(`Total workshops: ${count}`);
  
  const workshops = await prisma.workshop.findMany({
    take: 10,
    select: { id: true, title: true }
  });
  
  console.log('Workshops:');
  console.dir(workshops.map(w => ({ id: w.id.toString(), title: w.title })), { depth: null });
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

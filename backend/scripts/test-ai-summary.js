const WorkshopService = require('../src/services/workshop.service');
const { connectRabbitMQ } = require('../src/config/rabbitmq');
require('dotenv').config();

async function test() {
  console.log('--- AI Summary Manual Test ---');
  
  try {
    // 1. Initialize RabbitMQ
    console.log('Connecting to RabbitMQ...');
    await connectRabbitMQ();
    
    // 2. Trigger Summary
    const workshopId = process.argv[2] || '1';
    const filePath = process.argv[3] || './data/sample.pdf';
    
    console.log(`Triggering AI Summary for Workshop ID: ${workshopId}`);
    console.log(`Using file path: ${filePath}`);
    
    const result = await WorkshopService.addDocumentAndTriggerSummary({
      workshopId: workshopId,
      fileName: 'test_workshop.pdf',
      storagePath: filePath,
      fileSize: 1024,
      userId: '1' // Admin user ID
    });
    
    console.log('Success! Task sent to RabbitMQ.');
    console.log('Summary ID:', result.summary.id.toString());
    console.log('Check unihub_ai_worker logs for processing...');
    
    // Close connection after a short delay
    setTimeout(() => {
      process.exit(0);
    }, 1000);
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();

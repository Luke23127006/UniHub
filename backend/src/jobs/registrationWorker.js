const { getChannel } = require('../config/rabbitmq');
const RedisLock = require('../utils/redisLock');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function processRegistrationMessage(msg, channel) {
  if (!msg) return;

  let payload;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch (error) {
    console.error('Failed to parse message content:', error);
    // Reject message and do not requeue because it's malformed
    channel.nack(msg, false, false);
    return;
  }

  const { workshopId, userId } = payload;
  const lockKey = `lock:workshop:${workshopId}`;

  // Attempt to acquire Redis Lock for 5 seconds
  const lockAcquired = await RedisLock.acquireLock(lockKey, 5000);

  if (!lockAcquired) {
    console.log(`Could not acquire lock for workshop ${workshopId}. Requeueing message.`);
    // Requeue the message to try again later
    channel.nack(msg, false, true);
    return;
  }

  try {
    // Start DB Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Check available_seats of the workshop
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopId },
        select: { id: true, available_seats: true, capacity: true }
      });

      if (!workshop) {
        throw new Error(`Workshop ${workshopId} not found`);
      }

      // 2. Find the Student associated with the userId
      const student = await tx.student.findUnique({
        where: { user_id: userId },
        select: { id: true }
      });

      if (!student) {
        throw new Error(`Student record not found for user ${userId}`);
      }

      // 3. Check if user already registered
      const existingRegistration = await tx.registration.findUnique({
        where: {
          student_id_workshop_id: {
            student_id: student.id,
            workshop_id: workshop.id
          }
        }
      });

      if (existingRegistration) {
        throw new Error(`User ${userId} already registered for workshop ${workshopId}`);
      }

      if (workshop.available_seats > 0) {
        // Decrement available_seats
        await tx.workshop.update({
          where: { id: workshopId },
          data: { available_seats: { decrement: 1 } }
        });

        // Insert new Registration record
        await tx.registration.create({
          data: {
            student_id: student.id,
            workshop_id: workshop.id,
            status: 'pending_payment'
          }
        });

        console.log(`Successfully registered user ${userId} for workshop ${workshopId}`);
      } else {
        // Seats <= 0
        console.log(`Workshop ${workshopId} is sold out. Skipping registration for user ${userId}.`);
        // Transaction completes successfully without doing anything, acting as a skip/rollback of any logic
      }
    });

    // Acknowledge the message if transaction succeeded
    channel.ack(msg);
  } catch (error) {
    console.error('Error processing registration:', error.message);
    // NACK and do not requeue for business errors (e.g., student not found, already registered)
    // In a real system, we might push to a Dead Letter Queue (DLQ)
    channel.nack(msg, false, false);
  } finally {
    // Always release the lock
    await RedisLock.releaseLock(lockKey);
  }
}

async function startRegistrationWorker() {
  try {
    const channel = getChannel();
    const queueName = 'workshop_registration_queue';

    // Ensure queue exists
    await channel.assertQueue(queueName, { durable: true });
    
    // Set prefetch count to handle 1 message at a time per worker instance
    channel.prefetch(1);

    console.log(`[*] Waiting for messages in ${queueName}. To exit press CTRL+C`);

    channel.consume(queueName, async (msg) => {
      await processRegistrationMessage(msg, channel);
    }, { noAck: false }); // Requires explicit acknowledgment
  } catch (error) {
    console.error('Failed to start registration worker:', error);
  }
}

module.exports = { startRegistrationWorker };

/**
 * CLI Script to send call email notifications
 * Usage: ts-node scripts/send-call-notifications.ts [--user-id USER_ID] [--limit LIMIT]
 */

import { prisma } from '../lib/db';
import { callNotificationService } from '../lib/call-notification-service';

interface CLIArgs {
  userId?: string;
  limit?: number;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--user-id' && process.argv[i + 1]) {
      args.userId = process.argv[i + 1];
      i++;
    } else if (process.argv[i] === '--limit' && process.argv[i + 1]) {
      args.limit = parseInt(process.argv[i + 1], 10);
      i++;
    }
  }
  
  return args;
}

async function main() {
  console.log('📧 Call Notification Service - CLI');
  console.log('==================================\n');
  
  const args = parseArgs();
  
  try {
    // Get statistics before sending
    console.log('📊 Fetching notification statistics...');
    const statsBefore = await callNotificationService.getNotificationStats(args.userId);
    console.log('\n📈 Current Status:');
    console.log(`   Pending notifications: ${statsBefore.pendingCount}`);
    console.log(`   Emails sent: ${statsBefore.emailsSent}`);
    console.log(`   Total completed calls: ${statsBefore.totalCompleted}`);
    console.log(`   Completion rate: ${statsBefore.percentage}%\n`);
    
    if (statsBefore.pendingCount === 0) {
      console.log('✅ No pending notifications to send!');
      process.exit(0);
    }
    
    // Confirm before sending
    console.log(`🚀 About to send notifications for ${statsBefore.pendingCount} call(s)...`);
    if (args.userId) {
      console.log(`   Filtered by user ID: ${args.userId}`);
    }
    if (args.limit) {
      console.log(`   Limited to: ${args.limit} notifications`);
    }
    console.log('');
    
    // Send notifications
    console.log('📨 Sending notifications...\n');
    const results = await callNotificationService.sendPendingNotifications(
      args.userId,
      args.limit
    );
    
    // Display results
    console.log('\n📊 Results:');
    console.log(`   ✅ Success: ${results.success}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((error) => {
        console.log(`   - ${error.callId}: ${error.error}`);
      });
    }
    
    // Get final statistics
    const statsAfter = await callNotificationService.getNotificationStats(args.userId);
    console.log('\n📈 Final Status:');
    console.log(`   Pending notifications: ${statsAfter.pendingCount}`);
    console.log(`   Emails sent: ${statsAfter.emailsSent}`);
    console.log(`   Total completed calls: ${statsAfter.totalCompleted}`);
    console.log(`   Completion rate: ${statsAfter.percentage}%\n`);
    
    console.log('✨ Done!\n');
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();

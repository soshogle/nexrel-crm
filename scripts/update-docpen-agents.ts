/**
 * Script to update all Docpen agents with latest function configurations
 * 
 * Usage: npx tsx scripts/update-docpen-agents.ts
 */

import { prisma } from '../lib/db';
import { docpenAgentProvisioning } from '../lib/docpen/agent-provisioning';

async function updateAllAgents() {
  try {
    console.log('🔄 Starting agent update process...\n');

    // Get all active agents
    const agents = await prisma.docpenVoiceAgent.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (agents.length === 0) {
      console.log('✅ No agents found to update.');
      return;
    }

    console.log(`📋 Found ${agents.length} active agents to update:\n`);

    let updated = 0;
    let failed = 0;

    for (const agent of agents) {
      console.log(`🔄 Updating: ${agent.profession}${agent.customProfession ? ` - ${agent.customProfession}` : ''} (${agent.elevenLabsAgentId})`);
      console.log(`   User: ${agent.user.email}`);
      
      try {
        const success = await docpenAgentProvisioning.updateAgentFunctions(
          agent.elevenLabsAgentId,
          agent.userId
        );
        
        if (success) {
          console.log(`   ✅ Updated successfully\n`);
          updated++;
        } else {
          console.log(`   ❌ Update failed\n`);
          failed++;
        }
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`);
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📋 Total: ${agents.length}`);

    if (updated === agents.length) {
      console.log('\n🎉 All agents updated successfully!');
    } else if (updated > 0) {
      console.log('\n⚠️  Some agents failed to update. Check errors above.');
    } else {
      console.log('\n❌ No agents were updated. Check errors above.');
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllAgents();

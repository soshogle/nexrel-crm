import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting knowledge base files migration...');
  
  // Get all knowledge base files that had a voiceAgentId
  const files = await prisma.$queryRaw<Array<{ id: string; voiceAgentId: string | null }>>` 
    SELECT id, "voiceAgentId" 
    FROM "KnowledgeBaseFile" 
    WHERE "voiceAgentId" IS NOT NULL
  `;
  
  console.log(`Found ${files.length} knowledge base files with voice agent associations`);
  
  // Create junction table entries for each
  for (const file of files) {
    if (file.voiceAgentId) {
      try {
        await prisma.voiceAgentKnowledgeBaseFile.create({
          data: {
            voiceAgentId: file.voiceAgentId,
            knowledgeBaseFileId: file.id,
          },
        });
        console.log(`✓ Migrated file ${file.id} → agent ${file.voiceAgentId}`);
      } catch (error: any) {
        // Skip if already exists (unique constraint)
        if (error.code === 'P2002') {
          console.log(`⊙ Association already exists: file ${file.id} → agent ${file.voiceAgentId}`);
        } else {
          console.error(`✗ Error migrating file ${file.id}:`, error.message);
        }
      }
    }
  }
  
  console.log('Migration completed!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

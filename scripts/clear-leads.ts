import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing database...')
  
  await prisma.note.deleteMany({})
  console.log('Deleted all notes')
  
  await prisma.message.deleteMany({})
  console.log('Deleted all messages')
  
  await prisma.lead.deleteMany({})
  console.log('Deleted all leads')
  
  console.log('Database cleared!')
}

main()
  .catch((e) => {
    console.error('Error during clearing:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

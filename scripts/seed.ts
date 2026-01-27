
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  const hashedPassword = await bcrypt.hash('johndoe123', 12)

  // Create an agency
  const agency = await prisma.agency.upsert({
    where: { email: 'agency@example.com' },
    update: {},
    create: {
      name: 'Example Marketing Agency',
      email: 'agency@example.com',
      phone: '+1 (555) 000-0000',
      website: 'https://example-agency.com',
      isActive: true,
    },
  })

  console.log('Created agency:', agency.name)

  // Create an agency admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'soshogle@gmail.com' },
    update: {
      role: 'AGENCY_ADMIN',
      agencyId: agency.id,
      name: 'Soshogle Agency Admin',
    },
    create: {
      email: 'soshogle@gmail.com',
      password: hashedPassword,
      name: 'Soshogle Agency Admin',
      role: 'AGENCY_ADMIN',
      agencyId: agency.id,
    },
  })

  console.log('Created agency admin:', adminUser.email)
  
  // Create test sub-account user (john@doe.com with password johndoe123)
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: hashedPassword,
      name: 'John Doe',
      role: 'USER',
      agencyId: agency.id,
    },
  })

  console.log('Created test sub-account user:', testUser.email)

  // Create sample leads
  const sampleLeads = [
    {
      businessName: 'Sunshine Bakery',
      contactPerson: 'Maria Rodriguez',
      email: 'maria@sunshinebakery.com',
      phone: '(555) 123-4567',
      website: 'https://www.google.com',
      address: '123 Main Street',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      country: 'USA',
      businessCategory: 'restaurant',
      rating: 4.5,
      status: 'NEW' as const,
      source: 'manual',
    },
    {
      businessName: 'TechFlow Solutions',
      contactPerson: 'David Kim',
      email: 'david@techflowsolutions.com',
      phone: '(555) 234-5678',
      website: 'https://www.microsoft.com',
      address: '456 Innovation Drive',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
      businessCategory: 'technology',
      rating: 4.8,
      status: 'CONTACTED' as const,
      source: 'google_places',
    },
    {
      businessName: 'Green Garden Landscaping',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@greengarden.com',
      phone: '(555) 345-6789',
      website: 'https://www.amazon.com',
      address: '789 Oak Avenue',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      country: 'USA',
      businessCategory: 'landscaping',
      rating: 4.3,
      status: 'QUALIFIED' as const,
      source: 'manual',
    },
    {
      businessName: 'Downtown Dental Care',
      contactPerson: 'Dr. Michael Chen',
      email: 'info@downtowndentalcare.com',
      phone: '(555) 456-7890',
      website: 'https://www.apple.com',
      address: '321 First Street',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA',
      businessCategory: 'healthcare',
      rating: 4.7,
      status: 'RESPONDED' as const,
      source: 'google_places',
    },
    {
      businessName: 'Elite Fitness Gym',
      contactPerson: 'Jennifer Adams',
      email: 'jennifer@elitefitness.com',
      phone: '(555) 567-8901',
      website: 'https://www.github.com',
      address: '654 Fitness Boulevard',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
      businessCategory: 'fitness',
      rating: 4.6,
      status: 'CONVERTED' as const,
      source: 'manual',
    },
    {
      businessName: 'Creative Design Studio',
      contactPerson: 'Alex Thompson',
      email: 'alex@creativedesign.com',
      phone: '(555) 678-9012',
      website: 'https://www.wikipedia.org',
      address: '987 Creative Lane',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201',
      country: 'USA',
      businessCategory: 'design',
      rating: 4.4,
      status: 'LOST' as const,
      source: 'google_places',
    }
  ]

  for (const leadData of sampleLeads) {
    const lead = await prisma.lead.create({
      data: {
        ...leadData,
        userId: testUser.id,
      },
    })

    console.log(`Created lead: ${lead.businessName}`)

    // Add sample notes for each lead
    const sampleNotes = [
      'Initial research completed. Company looks promising.',
      'Spoke with contact person. They seem interested in our services.',
      'Need to follow up next week with a detailed proposal.',
    ]

    if (Math.random() > 0.3) { // 70% chance of having notes
      const noteCount = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < noteCount; i++) {
        const note = await prisma.note.create({
          data: {
            content: sampleNotes[i % sampleNotes.length],
            leadId: lead.id,
            userId: testUser.id,
          },
        })
        console.log(`  Added note to ${lead.businessName}`)
      }
    }

    // Add sample AI messages for some leads
    if (Math.random() > 0.4) { // 60% chance of having messages
      const sampleMessage = `Hi ${leadData.contactPerson || 'there'},

I came across ${leadData.businessName} and was impressed by your ${leadData.businessCategory} business. With your ${leadData.rating}/5 star rating, it's clear you're providing excellent service to your customers.

I wanted to reach out because we help businesses like yours streamline their operations and increase efficiency. Many of our clients in the ${leadData.businessCategory} industry have seen significant improvements in their workflow and customer satisfaction.

Would you be open to a brief 15-minute conversation to explore how we might be able to help ${leadData.businessName} grow even further?

Best regards,
John Doe`

      const message = await prisma.message.create({
        data: {
          content: sampleMessage,
          messageType: 'ai_generated',
          isUsed: Math.random() > 0.5, // 50% chance of being used
          leadId: lead.id,
          userId: testUser.id,
        },
      })
      console.log(`  Added AI message to ${lead.businessName}`)
    }
  }

  // Seed messaging system data
  console.log('\nSeeding messaging channels and conversations...')
  
  // Create demo channel connections
  const smsChannel = await prisma.channelConnection.create({
    data: {
      userId: testUser.id,
      channelType: 'SMS',
      channelIdentifier: '+1234567890',
      displayName: 'Business SMS',
      status: 'CONNECTED',
      providerType: 'demo',
      isDefault: true,
    },
  })
  console.log('  Created SMS channel')

  const emailChannel = await prisma.channelConnection.create({
    data: {
      userId: testUser.id,
      channelType: 'EMAIL',
      channelIdentifier: 'business@example.com',
      displayName: 'Business Email',
      status: 'CONNECTED',
      providerType: 'demo',
      isDefault: true,
    },
  })
  console.log('  Created Email channel')

  const whatsappChannel = await prisma.channelConnection.create({
    data: {
      userId: testUser.id,
      channelType: 'WHATSAPP',
      channelIdentifier: '+1234567890',
      displayName: 'WhatsApp Business',
      status: 'CONNECTED',
      providerType: 'demo',
      isDefault: true,
    },
  })
  console.log('  Created WhatsApp channel')

  // Create demo conversations with messages
  const demoContacts = [
    {
      name: 'Sarah Johnson',
      identifier: '+1555123456',
      channel: smsChannel,
      messages: [
        { direction: 'INBOUND', content: 'Hi! I saw your ad and I\'m interested in your services.', delay: 3 },
        { direction: 'OUTBOUND', content: 'Thank you for reaching out! I\'d be happy to discuss how we can help. What specific services are you interested in?', delay: 2 },
        { direction: 'INBOUND', content: 'I\'m looking for help with local SEO and Google My Business optimization.', delay: 1 },
        { direction: 'OUTBOUND', content: 'Perfect! We specialize in that. Would you be available for a quick 15-minute call tomorrow to discuss your needs?', delay: 0 },
      ],
    },
    {
      name: 'Mike\'s Pizza',
      identifier: 'mike@mikespizza.com',
      channel: emailChannel,
      messages: [
        { direction: 'INBOUND', content: 'Hello, we\'re a local pizzeria looking to improve our online presence. Can you help?', delay: 5 },
        { direction: 'OUTBOUND', content: 'Absolutely! We\'ve helped many restaurants increase their online visibility. Let me schedule a consultation with you.', delay: 0 },
      ],
    },
    {
      name: 'David Chen',
      identifier: '+1555789012',
      channel: whatsappChannel,
      messages: [
        { direction: 'OUTBOUND', content: 'Hi David! Following up on your inquiry about our marketing services. Are you still interested?', delay: 2 },
        { direction: 'INBOUND', content: 'Yes! Sorry for the delay. When can we talk?', delay: 0 },
      ],
    },
    {
      name: 'Lisa Martinez',
      identifier: '+1555345678',
      channel: smsChannel,
      messages: [
        { direction: 'INBOUND', content: 'Do you offer social media management?', delay: 1 },
      ],
    },
    {
      name: 'Tech Solutions Inc',
      identifier: 'contact@techsolutions.com',
      channel: emailChannel,
      messages: [
        { direction: 'INBOUND', content: 'We\'re expanding our business and need a comprehensive CRM solution. What do you offer?', delay: 6 },
        { direction: 'OUTBOUND', content: 'Great to hear about your expansion! Our CRM platform is perfect for growing businesses. It includes lead management, automated campaigns, and integrated messaging across multiple channels.', delay: 5 },
        { direction: 'INBOUND', content: 'Sounds promising. Can you send me a demo?', delay: 4 },
        { direction: 'OUTBOUND', content: 'Of course! I\'ll send you a personalized demo link. What time works best for a walkthrough call?', delay: 0 },
      ],
    },
  ]

  for (const contact of demoContacts) {
    const conversation = await prisma.conversation.create({
      data: {
        userId: testUser.id,
        channelConnectionId: contact.channel.id,
        contactName: contact.name,
        contactIdentifier: contact.identifier,
        status: 'ACTIVE',
        unreadCount: contact.messages.filter(m => m.direction === 'INBOUND' && m.delay === 0).length,
      },
    })

    for (const msg of contact.messages) {
      const sentAt = new Date()
      sentAt.setHours(sentAt.getHours() - msg.delay)

      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          userId: testUser.id,
          direction: msg.direction as 'INBOUND' | 'OUTBOUND',
          content: msg.content,
          status: msg.direction === 'OUTBOUND' ? 'DELIVERED' : 'READ',
          sentAt: sentAt,
          deliveredAt: msg.direction === 'OUTBOUND' ? sentAt : undefined,
          readAt: msg.direction === 'INBOUND' && msg.delay > 0 ? sentAt : undefined,
        },
      })
    }

    // Update conversation with last message info
    const lastMessage = contact.messages[contact.messages.length - 1]
    const lastMessageTime = new Date()
    lastMessageTime.setHours(lastMessageTime.getHours() - lastMessage.delay)

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: lastMessageTime,
        lastMessagePreview: lastMessage.content.substring(0, 100),
      },
    })

    console.log(`  Created conversation with ${contact.name}`)
  }

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

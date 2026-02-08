import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Creating Real Estate Agent profile for Theodora Stavropoulos...\n')

  const email = 'theodora.stavropoulos@remax-quebec.com'
  const password = 'TheodoraRE@2026!' // Secure password
  const name = 'Theodora Stavropoulos'

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log('❌ User account already exists with email:', email)
    console.log('   If you need to reset the password, please delete this user first.')
    return
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Extract information from PDFs
  // From "theodora answers.pdf" and "Agency Brokerage Name_ RE_MAX 3000SECTION 1_ theodora.pdf"
  
  // Basic Profile Information
  const phone = '438 496 5510'
  const brokerageName = 'RE/MAX 3000'
  const licenseNumber = 'J4672'
  const agencyAddress = '9280 boul. L\'Acadie, Montréal, Quebec H4N 3C5'
  const website = '' // Not provided in PDFs
  
  // Business Information
  const yearsInBusiness = '1 year'
  const totalVolumeSold = '5+ million (sold and purchased)'
  const familiesHelped = '50+'
  const serviceAreas = 'Bois-Franc, Nouveau Saint-Laurent, greater ville saint-laurent'
  
  // Business Description / "Why"
  const businessDescription = 'Growing up in a family of real estates investors, the industry has always been part of my world and naturally grew into a passion of mine. Helping people is one of my greatest joys, so becoming a broker allowed me to combine both passion with purpose, guiding clients through one of the most important decisions of their lives and succeeding in a career I genuinely care about.'
  
  // Specialized fields
  const specializedFields = [
    'Luxury/High-End Properties',
    'Commercial Real Estate',
    'First-Time Home Buyers',
    'Investment Properties/Flipping',
    'Rental/Leasing Services'
  ]

  // AI Voice Agent Preferences (from "theodora answers.pdf")
  const voiceAgentPreferences = {
    preferredVibe: 'THE CONSULTANT', // Calm, analytical, focused on data, long-term value
    operationalLanguageStack: [],
    emergencyDefinition: 'Any new lead looking to buy over $1M',
    agentFilter: 'The AI books it automatically (via Centris/Calendly/Google calendar)',
    goldCriteria: {
      location: 'Looking to buy or sell in bois-franc',
      minPrice: 'Anything over 500 000',
      timeline: '60 days'
    },
    tireKickerProtocol: 'Drop them into the \'Long-Term Nurture\' email bucket and end the call politely',
    pitchStyle: 'The Storyteller', // Focus on emotion: 'Imagine your morning coffee on this terrace.'
    compLogicRadius: '1km radius',
    theodoraWords: ['Absolutely', '100%', 'Let\'s make it happen', 'To be honest with you...', 'Correct'],
    forbiddenWords: ['maybe', 'if you want to', 'would you want to'],
    greetingStyle: 'Formal: \'Good morning, this is Theodora\'s office.\'',
    interruptingClients: 'The Listener: Let them finish completely (High Empathy)',
    pacing: 'Thoughtful pauses to let the client think (Consultative)',
    stupidQuestionTest: 'The Educator: Give a detailed, patient explanation of market realities and suggest alternatives',
    whenToTransferCall: [
      'Gold Lead matches all \'Gold\' criteria',
      'Client requests to speak to a human agent',
      'Urgent operational issue (e.g., closing paperwork concern)'
    ],
    formalCommunicationScale: 3, // 1-5 scale
    clientInteractionSummaryDetail: 'Concise paragraph summary',
    automatedFollowUp: {
      monday: ['9 AM - 12 PM', '12 PM - 5 PM', '5 PM - 9 PM'],
      tuesday: ['9 AM - 12 PM', '12 PM - 5 PM', '5 PM - 9 PM'],
      wednesday: ['9 AM - 12 PM', '12 PM - 5 PM', '5 PM - 9 PM'],
      thursday: ['9 AM - 12 PM', '12 PM - 5 PM', '5 PM - 9 PM'],
      friday: ['9 AM - 12 PM', '12 PM - 5 PM'],
      saturday: ['12 PM - 5 PM'],
      sunday: ['12 PM - 5 PM']
    },
    preferredBufferTime: '15:00:00',
    stagingAdviceDetail: 'Offer 3-5 specific, actionable tips (e.g., \'Focus on curb appeal, clean all surfaces\')',
    centrisCredentials: {
      username: '136959',
      password: '3275Jeangascon!'
    },
    otherPlatformCredentials: {
      telecasting: {
        url: 'https://app.telelisting.net/phonebook',
        username: 'theo62002@icloud.com',
        password: 'vagas',
        purpose: 'Access the do not call list'
      }
    },
    calendarIntegration: 'Google Calendar',
    aiBookingEnabled: true
  }

  // Website & Branding Preferences
  const brandingPreferences = {
    primaryBrandColors: {
      red: { hex: '#DC1C2E', rgb: '220,28,46' },
      blue: { hex: '#003DA5', rgb: '0, 61, 165' },
      white: { hex: '#FFFFFF', rgb: '255, 255, 255' }
    },
    secondaryAccentColor: { hex: '#FFD700' },
    mostActiveSocialMedia: 'Facebook',
    primaryCTA: 'Book a Consultation/Call',
    desiredAesthetic: 'Bold and Innovative',
    servicesToHighlight: [
      'Buyer Services',
      'Seller Services',
      'Investment Properties',
      'Commercial Real Estate'
    ],
    importanceOfVideoContent: 2, // 1-5 scale
    hasActiveListings: true,
    hasJustSoldGallery: true,
    hasPocketListings: false
  }

  // Create comprehensive onboarding progress JSON
  const onboardingProgress = {
    completed: true,
    completedAt: new Date().toISOString(),
    realEstateProfile: {
      brokerageName,
      licenseNumber,
      agencyAddress,
      yearsInBusiness,
      totalVolumeSold,
      familiesHelped,
      serviceAreas,
      specializedFields,
      superpower: 'I will offer free services clients could choose from (staging, inspection, cleaning, etc)',
      awardsRecognitions: [],
      businessDescription,
      top3FarmingAreas: [
        'Bois-Franc',
        'Nouveau Saint-Laurent',
        'greater ville saint-laurent'
      ],
      hasActiveListings: true,
      activeListingUrls: [], // URLs not provided in PDF
      hasJustSoldGallery: true,
      hasPocketListings: false,
      googleReviewsLink: null,
      facebookReviewsLink: null,
      hasVideoTestimonials: false,
      privacyOfficerEmail: email
    },
    voiceAgentPreferences,
    brandingPreferences,
    credentials: {
      centris: voiceAgentPreferences.centrisCredentials,
      telecasting: voiceAgentPreferences.otherPlatformCredentials.telecasting
    }
  }

  // Create the real estate agent user
  const theodoraAgent = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone,
      address: agencyAddress,
      role: 'BUSINESS_OWNER',
      industry: 'REAL_ESTATE',
      onboardingCompleted: true,
      onboardingProgress: onboardingProgress as any, // Prisma Json type accepts objects directly
      // Basic onboarding fields
      businessDescription,
      businessLanguage: 'English', // Default, can be updated
      currency: 'CAD', // Canadian dollars for Quebec
      operatingLocation: serviceAreas,
    },
  })

  console.log('✅ Real Estate Agent profile created successfully!')
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  console.log('👤 Name:', name)
  console.log('📞 Phone:', phone)
  console.log('🏢 Brokerage:', brokerageName)
  console.log('📜 License:', licenseNumber)
  console.log('📍 Address:', agencyAddress)
  console.log('🏢 Industry: REAL_ESTATE')
  console.log('👤 Role: BUSINESS_OWNER')
  console.log('═══════════════════════════════════════════════')
  console.log('')
  console.log('📋 Profile Details:')
  console.log('   • Years in Business:', yearsInBusiness)
  console.log('   • Total Volume:', totalVolumeSold)
  console.log('   • Families Helped:', familiesHelped)
  console.log('   • Service Areas:', serviceAreas)
  console.log('   • Specialized Fields:', specializedFields.join(', '))
  console.log('')
  console.log('🤖 AI Voice Agent Configuration:')
  console.log('   • Preferred Vibe:', voiceAgentPreferences.preferredVibe)
  console.log('   • Pitch Style:', voiceAgentPreferences.pitchStyle)
  console.log('   • Greeting Style:', voiceAgentPreferences.greetingStyle)
  console.log('   • Calendar Integration:', voiceAgentPreferences.calendarIntegration)
  console.log('   • AI Booking Enabled:', voiceAgentPreferences.aiBookingEnabled ? 'Yes' : 'No')
  console.log('')
  console.log('🎨 Branding:')
  console.log('   • Primary Colors: Red (#DC1C2E), Blue (#003DA5), White (#FFFFFF)')
  console.log('   • Accent Color: Gold (#FFD700)')
  console.log('   • Aesthetic:', brandingPreferences.desiredAesthetic)
  console.log('   • Primary CTA:', brandingPreferences.primaryCTA)
  console.log('')
  console.log('⚠️  IMPORTANT SECURITY NOTE:')
  console.log('   1. Please change this password immediately after first login')
  console.log('   2. This account has access to Real Estate features')
  console.log('   3. Access the dashboard at: /dashboard/real-estate')
  console.log('   4. Credentials for Centris and Telecasting are stored in onboardingProgress')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error creating Real Estate Agent profile:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

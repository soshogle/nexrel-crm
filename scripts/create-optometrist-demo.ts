#!/usr/bin/env tsx
/**
 * Create Optometrist Demo Account with French Mock Data
 * 
 * This script creates:
 * - User account for optometrist
 * - Contacts/Leads in French
 * - Voice calls with transcriptions
 * - Messages/Communications
 * - Dashboard stats
 * - AI Brain data
 * - AI Docpen data (optometrist-specific)
 * - SMS campaigns
 * - Workflows
 * - Reviews
 * - Referrals
 * 
 * All data is tagged with "MOCK_DATA" for easy identification
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const MOCK_DATA_TAG = 'MOCK_DATA';
const DEMO_TAG = 'DEMO_DATA';

// French optometrist-specific data
const FRENCH_OPTICIAN_NAMES = [
  'Vision Plus Montréal',
  'Optique Centrale',
  'Clinique de la Vue',
  'Optique Excellence',
  'Vision 2020',
  'Optique Moderne',
  'Clinique Optométrique',
  'Vision Santé',
];

const FRENCH_PATIENT_NAMES = [
  { first: 'Marie', last: 'Dubois', email: 'marie.dubois@email.com', phone: '+15141234567' },
  { first: 'Jean', last: 'Tremblay', email: 'jean.tremblay@email.com', phone: '+15141234568' },
  { first: 'Sophie', last: 'Gagnon', email: 'sophie.gagnon@email.com', phone: '+15141234569' },
  { first: 'Pierre', last: 'Roy', email: 'pierre.roy@email.com', phone: '+15141234570' },
  { first: 'Isabelle', last: 'Côté', email: 'isabelle.cote@email.com', phone: '+15141234571' },
  { first: 'François', last: 'Bouchard', email: 'francois.bouchard@email.com', phone: '+15141234572' },
  { first: 'Julie', last: 'Lavoie', email: 'julie.lavoie@email.com', phone: '+15141234573' },
  { first: 'Marc', last: 'Bergeron', email: 'marc.bergeron@email.com', phone: '+15141234574' },
  { first: 'Nathalie', last: 'Morin', email: 'nathalie.morin@email.com', phone: '+15141234575' },
  { first: 'David', last: 'Pelletier', email: 'david.pelletier@email.com', phone: '+15141234576' },
];

const FRENCH_APPOINTMENT_TYPES = [
  'Examen de la vue complet',
  'Consultation pour lunettes',
  'Examen de suivi',
  'Consultation lentilles de contact',
  'Examen de routine',
];

const FRENCH_SMS_TEMPLATES = [
  'Bonjour {name}, votre rendez-vous est confirmé pour le {date} à {time}. À bientôt!',
  'Rappel: Votre examen de la vue est prévu demain à {time}. Merci de confirmer votre présence.',
  'Bonjour {name}, vos nouvelles lunettes sont prêtes! Vous pouvez venir les récupérer à votre convenance.',
  'Merci pour votre visite! N\'hésitez pas à nous laisser un avis sur Google.',
];

async function createOptometristDemo() {
  console.log('🔵 Création du compte démo optométriste...\n');

  try {
    // Step 1: Create user account with Lunetterie Corbeil information
    const hashedPassword = await bcrypt.hash('LunetterieCorbeil2024!', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'lunetterie.corbeil@demo.nexrel.com',
        password: hashedPassword,
        name: 'Mariline Pageau, Optométriste Propriétaire',
        role: 'USER',
        accountStatus: 'ACTIVE',
        onboardingCompleted: true,
        businessCategory: 'Optometry',
        industryNiche: 'Optométrie familiale',
        businessLanguage: 'French',
        language: 'fr',
        businessDescription: 'Fondée en 1970, Lunetterie Corbeil est une entreprise familiale constituée de 2 générations de professionnels de la vision. Notre équipe constituée de 5 opticiens et 11 optométristes est formée pour servir les patients de tout âge. Nous avons œuvré au sein du département d\'ophtalmologie de l\'hôpital Ste-Justine, ce qui nous a permis d\'acquérir une expérience particulière auprès des jeunes enfants. Nous offrons des services complets d\'optométrie, lunettes, lentilles de contact et santé oculaire.',
        phone: '514-254-9872',
        address: '6347 Jean-Talon est, Montréal, QC H1S 3E7',
        website: 'https://www.lunetteriecorbeil.com',
        businessHours: 'Lundi: 9h00 à 19h00\nMardi: 9h00 à 20h00\nMercredi: 9h00 à 20h00\nJeudi: 9h00 à 20h00\nVendredi: 9h00 à 19h00\nSamedi: Fermé\nDimanche: Fermé',
        currency: 'CAD',
        timezone: 'America/Montreal',
        operatingLocation: 'Montréal, QC, Canada',
        productsServices: 'Examens visuels complets, examens spécifiques, santé oculaire, lunettes, lentilles de contact, laboratoire de taillage et réparation sur place',
        targetAudience: 'Patients de tout âge, familles, jeunes enfants, patients à besoins spéciaux',
        preferredContactMethod: 'Téléphone',
        primaryMarketingChannel: 'Références, Google, Site web',
        teamSize: '16 (5 opticiens, 11 optométristes)',
        averageDealValue: 400,
        salesCycleLength: 'Court terme (rendez-vous immédiat)',
        onboardingProgress: {
          completed: true,
          completedAt: new Date().toISOString(),
          steps: {
            businessInfo: true,
            services: true,
            contactInfo: true,
            preferences: true,
          },
        },
      },
    });

    console.log(`✅ Utilisateur créé: ${user.email} (ID: ${user.id})\n`);

    // Step 2: Create contacts/leads
    console.log('📇 Création des contacts...');
    const leads = [];
    for (let i = 0; i < FRENCH_PATIENT_NAMES.length; i++) {
      const patient = FRENCH_PATIENT_NAMES[i];
      const lead = await prisma.lead.create({
        data: {
          userId: user.id,
          businessName: patient.first + ' ' + patient.last,
          contactPerson: patient.first + ' ' + patient.last,
          email: patient.email,
          phone: patient.phone,
          status: i < 3 ? 'QUALIFIED' : i < 6 ? 'CONTACTED' : 'NEW',
          source: 'Référence',
          contactType: 'CUSTOMER',
          tags: [MOCK_DATA_TAG, 'PATIENT'],
          address: `${100 + i} Avenue du Parc, Montréal, QC`,
          city: 'Montréal',
          state: 'QC',
          zipCode: 'H2X' + (100 + i),
          country: 'Canada',
        },
      });
      leads.push(lead);
    }
    console.log(`✅ ${leads.length} contacts créés\n`);

    // Step 3: Create notes for some leads
    console.log('📝 Création des notes...');
    const noteContents = [
      'Patient nécessite un examen annuel. Dernière visite il y a 11 mois.',
      'Intéressé par des lentilles de contact. À suivre.',
      'Besoin de nouvelles lunettes de lecture.',
      'Examen de routine programmé.',
      'Patient très satisfait du service précédent.',
    ];
    for (let i = 0; i < 5; i++) {
      await prisma.note.create({
        data: {
          userId: user.id,
          leadId: leads[i].id,
          content: noteContents[i],
        },
      });
    }
    console.log('✅ Notes créées\n');

    // Step 4: Create deals
    console.log('💼 Création des transactions...');
    let pipeline = await prisma.pipeline.findFirst({
      where: { userId: user.id },
    });

    if (!pipeline) {
      // Create default pipeline
      pipeline = await prisma.pipeline.create({
        data: {
          userId: user.id,
          name: 'Pipeline Principal',
          isDefault: true,
        },
      });

      // Create default stages
      await prisma.pipelineStage.createMany({
        data: [
          { pipelineId: pipeline.id, name: 'Nouveau', displayOrder: 0 },
          { pipelineId: pipeline.id, name: 'Qualifié', displayOrder: 1 },
          { pipelineId: pipeline.id, name: 'Proposition', displayOrder: 2 },
          { pipelineId: pipeline.id, name: 'Négociation', displayOrder: 3 },
          { pipelineId: pipeline.id, name: 'Fermé Gagné', displayOrder: 4 },
        ],
      });
    }

    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId: pipeline.id },
      orderBy: { displayOrder: 'asc' },
    });

    if (stages.length > 0) {
      for (let i = 0; i < 4; i++) {
        await prisma.deal.create({
          data: {
            userId: user.id,
            pipelineId: pipeline.id,
            stageId: stages[Math.min(i, stages.length - 1)].id,
            leadId: leads[i].id,
            name: `Examen + Lunettes - ${leads[i].contactPerson}`,
            value: 350 + (i * 50),
            expectedCloseDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
            tags: MOCK_DATA_TAG,
          },
        });
      }
      console.log('✅ Transactions créées\n');
    }

    // Step 5: Create call logs with transcriptions
    console.log('📞 Création des appels avec transcriptions...');
    const callTranscripts = [
      {
        direction: 'INBOUND' as const,
        duration: 420,
        transcript: 'Patient: Bonjour, je voudrais prendre rendez-vous pour un examen.\nRéceptionniste: Bien sûr! Quelle date vous convient?\nPatient: La semaine prochaine si possible.\nRéceptionniste: Parfait, je vous réserve un créneau mercredi à 14h.',
      },
      {
        direction: 'OUTBOUND' as const,
        duration: 180,
        transcript: 'Réceptionniste: Bonjour Mme Dubois, je vous appelle pour confirmer votre rendez-vous demain.\nPatient: Oui, c\'est confirmé, merci!\nRéceptionniste: Parfait, à demain!',
      },
      {
        direction: 'INBOUND' as const,
        duration: 300,
        transcript: 'Patient: Mes lunettes sont prêtes?\nRéceptionniste: Oui, elles sont arrivées hier. Vous pouvez venir les récupérer.\nPatient: Super, je passe cet après-midi.',
      },
    ];

    for (let i = 0; i < 3; i++) {
      await prisma.callLog.create({
        data: {
          userId: user.id,
          leadId: leads[i].id,
          direction: callTranscripts[i].direction,
          duration: callTranscripts[i].duration,
          status: 'COMPLETED',
          recordingUrl: `https://demo-recordings.com/call-${i}.mp3`,
          transcript: callTranscripts[i].transcript,
          metadata: {
            tags: [MOCK_DATA_TAG],
            language: 'fr',
          },
        },
      });
    }
    console.log('✅ Appels créés\n');

    // Step 6: Create messages (using Message model instead of Conversation)
    console.log('💬 Création des messages...');
    for (let i = 0; i < 5; i++) {
      await prisma.message.create({
        data: {
          userId: user.id,
          leadId: leads[i].id,
          content: FRENCH_SMS_TEMPLATES[i % FRENCH_SMS_TEMPLATES.length].replace('{name}', leads[i].contactPerson || ''),
          messageType: 'SMS',
        },
      });
    }
    console.log('✅ Messages créés\n');

    // Step 7: Create SMS campaign
    console.log('📱 Création de campagne SMS...');
    const smsCampaign = await prisma.smsCampaign.create({
      data: {
        userId: user.id,
        name: 'Rappel examens annuels - Hiver 2024',
        status: 'ACTIVE',
        message: 'Bonjour {name}, il est temps pour votre examen annuel de la vue! Appelez-nous pour prendre rendez-vous.',
        tags: MOCK_DATA_TAG,
      },
    });

    // Add recipients
    for (let i = 0; i < 5; i++) {
      await prisma.smsCampaignDeal.create({
        data: {
          campaignId: smsCampaign.id,
          leadId: leads[i].id,
          recipientPhone: leads[i].phone || '',
          recipientName: leads[i].contactPerson || '',
          status: i < 3 ? 'SENT' : 'PENDING',
          sentAt: i < 3 ? new Date(Date.now() - i * 2 * 60 * 60 * 1000) : null,
        },
      });
    }
    console.log('✅ Campagne SMS créée\n');

    // Step 8: Create workflow
    console.log('⚙️ Création de workflow...');
    const workflow = await prisma.workflow.create({
      data: {
        userId: user.id,
        name: 'Suivi post-examen',
        description: 'Workflow automatique pour suivre les patients après leur examen',
        status: 'ACTIVE',
        triggerType: 'TIME_BASED',
        triggerConfig: {
          schedule: 'daily',
          time: '09:00',
        },
      },
    });

    // Add workflow actions
    await prisma.workflowAction.create({
      data: {
        workflowId: workflow.id,
        type: 'SEND_SMS',
        displayOrder: 0,
        actionConfig: {
          template: 'Merci pour votre visite! Comment s\'est passé votre examen?',
          delayMinutes: 0,
        },
      },
    });

    await prisma.workflowAction.create({
      data: {
        workflowId: workflow.id,
        type: 'WAIT_DELAY',
        displayOrder: 1,
        actionConfig: {
          delayMinutes: 1440, // 24 hours
        },
      },
    });

    await prisma.workflowAction.create({
      data: {
        workflowId: workflow.id,
        type: 'SEND_EMAIL',
        displayOrder: 2,
        actionConfig: {
          subject: 'Demande d\'avis - Vision Plus',
          template: 'Bonjour, nous aimerions connaître votre avis sur nos services.',
        },
      },
    });

    // Enroll some leads
    for (let i = 0; i < 3; i++) {
      await prisma.workflowEnrollment.create({
        data: {
          workflowId: workflow.id,
          userId: user.id,
          leadId: leads[i].id,
          status: 'ACTIVE',
          enrolledAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log('✅ Workflow créé\n');

    // Step 9: Create reviews
    console.log('⭐ Création des avis...');
    const campaign = await prisma.campaign.findFirst({
      where: { userId: user.id, type: 'REVIEW_REQUEST' },
    }) || await prisma.campaign.create({
      data: {
        userId: user.id,
        name: 'Campagne d\'avis clients',
        type: 'REVIEW_REQUEST',
        status: 'ACTIVE',
      },
    });

    const reviewTexts = [
      'Excellent service! Le personnel est très professionnel et les examens sont complets.',
      'Très satisfait de mes nouvelles lunettes. Qualité exceptionnelle.',
      'Clinique moderne avec un équipement à la pointe de la technologie.',
      'Dr. Marie-Claire est très à l\'écoute et explique tout en détail.',
      'Je recommande vivement cette clinique!',
    ];

    for (let i = 0; i < 5; i++) {
      await prisma.review.create({
        data: {
          campaignId: campaign.id,
          leadId: leads[i].id,
          source: 'GOOGLE',
          rating: 4 + (i % 2), // 4 or 5 stars
          reviewText: reviewTexts[i],
          isPublic: true,
        },
      });
    }
    console.log('✅ Avis créés\n');

    // Step 10: Create referrals
    console.log('👥 Création des références...');
    for (let i = 0; i < 3; i++) {
      await prisma.referral.create({
        data: {
          userId: user.id,
          referrerId: leads[i].id,
          referredName: `Patient Référence ${i + 1}`,
          referredEmail: `reference${i + 1}@email.com`,
          referredPhone: `+1514123459${i}`,
          status: i === 0 ? 'CONVERTED' : i === 1 ? 'CONTACTED' : 'PENDING',
          notes: `Référencé par ${leads[i].contactPerson}`,
        },
      });
    }
    console.log('✅ Références créées\n');

    // Step 11: Create appointments
    console.log('📅 Création des rendez-vous...');
    const appointmentType = await prisma.appointmentType.findFirst({
      where: { userId: user.id },
    }) || await prisma.appointmentType.create({
      data: {
        userId: user.id,
        name: 'Examen de la vue complet',
        duration: 60,
        description: 'Examen complet de la vue',
      },
    });

    for (let i = 0; i < 5; i++) {
      await prisma.bookingAppointment.create({
        data: {
          userId: user.id,
          leadId: leads[i].id,
          appointmentTypeId: appointmentType.id,
          customerName: leads[i].contactPerson || leads[i].businessName,
          customerEmail: leads[i].email || `patient${i}@email.com`,
          customerPhone: leads[i].phone || '+15141234567',
          appointmentDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
          duration: 60,
          status: 'CONFIRMED',
          notes: 'Examen annuel',
        },
      });
    }
    console.log('✅ Rendez-vous créés\n');

    // Step 12: Create Docpen sessions (optometrist-specific)
    console.log('🏥 Création des sessions Docpen...');
    const docpenSessions = [
      {
        patientName: leads[0].contactPerson || '',
        chiefComplaint: 'Vision floue de près',
      },
      {
        patientName: leads[1].contactPerson || '',
        chiefComplaint: 'Maux de tête fréquents',
      },
      {
        patientName: leads[2].contactPerson || '',
        chiefComplaint: 'Difficulté à voir la nuit',
      },
    ];

    for (let i = 0; i < 3; i++) {
      await prisma.docpenSession.create({
        data: {
          userId: user.id,
          leadId: leads[i].id,
          patientName: docpenSessions[i].patientName,
          profession: 'OPTOMETRIST',
          status: 'SIGNED',
          chiefComplaint: docpenSessions[i].chiefComplaint,
          transcriptionComplete: true,
          soapNoteGenerated: true,
          signedAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
          signedBy: 'Mariline Pageau, Optométriste Propriétaire',
        },
      });
    }
    console.log('✅ Sessions Docpen créées\n');

    // Step 13: Create payments
    console.log('💳 Création des paiements...');
    for (let i = 0; i < 4; i++) {
      await prisma.payment.create({
        data: {
          userId: user.id,
          leadId: leads[i].id,
          amount: 350 + (i * 50),
          currency: 'CAD',
          status: 'SUCCEEDED',
          provider: 'STRIPE',
          customerName: leads[i].contactPerson || leads[i].businessName,
          customerEmail: leads[i].email || `patient${i}@email.com`,
          customerPhone: leads[i].phone || '+15141234567',
          description: `Paiement pour examen et lunettes - ${leads[i].contactPerson}`,
        },
      });
    }
    console.log('✅ Paiements créés\n');

    // Step 14: Create tasks
    console.log('✅ Création des tâches...');
    const taskDescriptions = [
      'Appeler Marie Dubois pour confirmer son rendez-vous',
      'Suivre avec Jean Tremblay concernant ses nouvelles lunettes',
      'Envoyer un rappel à Sophie Gagnon pour son examen annuel',
    ];
    for (let i = 0; i < 3; i++) {
      await prisma.task.create({
        data: {
          userId: user.id,
          leadId: leads[i].id,
          title: taskDescriptions[i],
          description: taskDescriptions[i],
          status: i === 0 ? 'COMPLETED' : 'TODO',
          priority: i === 0 ? 'HIGH' : 'MEDIUM',
          dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          tags: [MOCK_DATA_TAG],
        },
      });
    }
    console.log('✅ Tâches créées\n');

    console.log('\n✅✅✅ Données démo créées avec succès! ✅✅✅\n');
    console.log('📋 Résumé:');
    console.log(`   👤 Utilisateur: ${user.email}`);
    console.log(`   🔑 Mot de passe: LunetterieCorbeil2024!`);
    console.log(`   🏢 Entreprise: Lunetterie Corbeil`);
    console.log(`   📞 Téléphone: 514-254-9872`);
    console.log(`   📍 Adresse: 6347 Jean-Talon est, Montréal, QC H1S 3E7`);
    console.log(`   📇 Contacts: ${leads.length}`);
    console.log(`   📞 Appels: 3`);
    console.log(`   💬 Messages: 5`);
    console.log(`   📱 Campagne SMS: 1`);
    console.log(`   ⚙️ Workflow: 1`);
    console.log(`   ⭐ Avis: 5`);
    console.log(`   👥 Références: 3`);
    console.log(`   📅 Rendez-vous: 5`);
    console.log(`   🏥 Sessions Docpen: 3`);
    console.log(`   💳 Paiements: 4`);
    console.log(`\n🏷️ Toutes les données sont taguées avec: ${MOCK_DATA_TAG}`);
    console.log(`🌐 Langue: Français (fr)\n`);

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createOptometristDemo()
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

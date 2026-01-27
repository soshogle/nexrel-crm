
/**
 * Comprehensive Test Data Seed Script
 * Seeds all systems: Kitchen, Inventory, POS, Recipes, etc.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive data seeding...\n');

  // Get the first user (merchant)
  const user = await prisma.user.findFirst();

  if (!user) {
    throw new Error('No user found in database. Please sign up first.');
  }

  console.log(`✅ Found user: ${user.name} (${user.email})\n`);

  // ===================
  // KITCHEN STATIONS
  // ===================
  console.log('🍳 Creating Kitchen Stations...');
  
  const grill = await prisma.kitchenStation.upsert({
    where: { id: 'station-grill' },
    update: {},
    create: {
      id: 'station-grill',
      userId: user.id,
      name: 'Grill',
      displayName: 'Grill Station',
      priority: 1,
      color: '#FF5733',
      isActive: true,
    },
  });

  const fryer = await prisma.kitchenStation.upsert({
    where: { id: 'station-fryer' },
    update: {},
    create: {
      id: 'station-fryer',
      userId: user.id,
      name: 'Fryer',
      displayName: 'Fryer Station',
      priority: 2,
      color: '#FFC300',
      isActive: true,
    },
  });

  const saladBar = await prisma.kitchenStation.upsert({
    where: { id: 'station-salad' },
    update: {},
    create: {
      id: 'station-salad',
      userId: user.id,
      name: 'Salad Bar',
      displayName: 'Salad Bar',
      priority: 3,
      color: '#28B463',
      isActive: true,
    },
  });

  const dessert = await prisma.kitchenStation.upsert({
    where: { id: 'station-dessert' },
    update: {},
    create: {
      id: 'station-dessert',
      userId: user.id,
      name: 'Dessert',
      displayName: 'Dessert Station',
      priority: 4,
      color: '#F39C12',
      isActive: true,
    },
  });

  console.log(`  ✅ Grill`);
  console.log(`  ✅ Fryer`);
  console.log(`  ✅ Salad Bar`);
  console.log(`  ✅ Dessert\n`);

  // ===================
  // INVENTORY ITEMS (Ingredients)
  // ===================
  console.log('📦 Creating Inventory Items (Ingredients)...');

  const groundBeef = await prisma.inventoryItem.upsert({
    where: { sku: 'BEEF-001' },
    update: {},
    create: {
      userId: user.id,
      name: 'Ground Beef',
      sku: 'BEEF-001',
      description: 'Premium ground beef for burgers',
      category: 'INGREDIENT',
      unit: 'LBS',
      currentStock: 50,
      minimumStock: 10,
      reorderQuantity: 20,
      costPerUnit: 5.99,
      sellingPrice: null, // Ingredient, not sold directly
      isActive: true,
    },
  });

  const burgerBuns = await prisma.inventoryItem.upsert({
    where: { sku: 'BUN-001' },
    update: {},
    create: {
      userId: user.id,
      name: 'Burger Buns',
      sku: 'BUN-001',
      description: 'Fresh burger buns',
      category: 'INGREDIENT',
      unit: 'PIECE',
      currentStock: 100,
      minimumStock: 20,
      reorderQuantity: 50,
      costPerUnit: 0.50,
      sellingPrice: null,
      isActive: true,
    },
  });

  const lettuce = await prisma.inventoryItem.upsert({
    where: { sku: 'VEG-001' },
    update: {},
    create: {
      userId: user.id,
      name: 'Lettuce',
      sku: 'VEG-001',
      description: 'Fresh iceberg lettuce',
      category: 'INGREDIENT',
      unit: 'OZ',
      currentStock: 200,
      minimumStock: 50,
      reorderQuantity: 100,
      costPerUnit: 0.15,
      sellingPrice: null,
      isActive: true,
    },
  });

  const tomatoes = await prisma.inventoryItem.upsert({
    where: { sku: 'VEG-002' },
    update: {},
    create: {
      userId: user.id,
      name: 'Tomatoes',
      sku: 'VEG-002',
      description: 'Fresh tomatoes',
      category: 'INGREDIENT',
      unit: 'OZ',
      currentStock: 150,
      minimumStock: 40,
      reorderQuantity: 80,
      costPerUnit: 0.20,
      sellingPrice: null,
      isActive: true,
    },
  });

  const cheese = await prisma.inventoryItem.upsert({
    where: { sku: 'DAIRY-001' },
    update: {},
    create: {
      userId: user.id,
      name: 'Cheddar Cheese',
      sku: 'DAIRY-001',
      description: 'Sliced cheddar cheese',
      category: 'INGREDIENT',
      unit: 'OZ',
      currentStock: 80,
      minimumStock: 20,
      reorderQuantity: 40,
      costPerUnit: 0.35,
      sellingPrice: null,
      isActive: true,
    },
  });

  const potatoes = await prisma.inventoryItem.upsert({
    where: { sku: 'VEG-003' },
    update: {},
    create: {
      userId: user.id,
      name: 'Potatoes',
      sku: 'VEG-003',
      description: 'Russet potatoes for fries',
      category: 'INGREDIENT',
      unit: 'LBS',
      currentStock: 100,
      minimumStock: 25,
      reorderQuantity: 50,
      costPerUnit: 1.20,
      sellingPrice: null,
      isActive: true,
    },
  });

  const chickenBreast = await prisma.inventoryItem.upsert({
    where: { sku: 'CHICKEN-001' },
    update: {},
    create: {
      userId: user.id,
      name: 'Chicken Breast',
      sku: 'CHICKEN-001',
      description: 'Fresh chicken breast',
      category: 'INGREDIENT',
      unit: 'LBS',
      currentStock: 40,
      minimumStock: 10,
      reorderQuantity: 20,
      costPerUnit: 4.50,
      sellingPrice: null,
      isActive: true,
    },
  });

  console.log(`  ✅ Ground Beef (50 lbs)`);
  console.log(`  ✅ Burger Buns (100 pieces)`);
  console.log(`  ✅ Lettuce (200 oz)`);
  console.log(`  ✅ Tomatoes (150 oz)`);
  console.log(`  ✅ Cheddar Cheese (80 oz)`);
  console.log(`  ✅ Potatoes (100 lbs)`);
  console.log(`  ✅ Chicken Breast (40 lbs)\n`);

  // ===================
  // POS PRODUCTS (Sellable Items)
  // ===================
  console.log('🍔 Creating POS Products...');

  const classicBurger = await prisma.inventoryItem.upsert({
    where: { sku: 'PROD-BURGER' },
    update: {},
    create: {
      userId: user.id,
      name: 'Classic Burger',
      sku: 'PROD-BURGER',
      description: 'Juicy beef burger with lettuce, tomato, and cheese',
      category: 'INGREDIENT',
      unit: 'PIECE',
      currentStock: 0, // Virtual product, stock managed via ingredients
      minimumStock: 0,
      reorderQuantity: 0,
      costPerUnit: 3.50,
      sellingPrice: 12.99,
      isActive: true,
    },
  });

  const frenchFries = await prisma.inventoryItem.upsert({
    where: { sku: 'PROD-FRIES' },
    update: {},
    create: {
      userId: user.id,
      name: 'French Fries',
      sku: 'PROD-FRIES',
      description: 'Crispy golden french fries',
      category: 'INGREDIENT',
      unit: 'PIECE',
      currentStock: 0,
      minimumStock: 0,
      reorderQuantity: 0,
      costPerUnit: 1.00,
      sellingPrice: 4.99,
      isActive: true,
    },
  });

  const caesarSalad = await prisma.inventoryItem.upsert({
    where: { sku: 'PROD-SALAD' },
    update: {},
    create: {
      userId: user.id,
      name: 'Caesar Salad',
      sku: 'PROD-SALAD',
      description: 'Fresh Caesar salad with grilled chicken',
      category: 'INGREDIENT',
      unit: 'PIECE',
      currentStock: 0,
      minimumStock: 0,
      reorderQuantity: 0,
      costPerUnit: 2.50,
      sellingPrice: 9.99,
      isActive: true,
    },
  });

  const grilledChicken = await prisma.inventoryItem.upsert({
    where: { sku: 'PROD-CHICKEN' },
    update: {},
    create: {
      userId: user.id,
      name: 'Grilled Chicken Sandwich',
      sku: 'PROD-CHICKEN',
      description: 'Tender grilled chicken with lettuce and tomato',
      category: 'INGREDIENT',
      unit: 'PIECE',
      currentStock: 0,
      minimumStock: 0,
      reorderQuantity: 0,
      costPerUnit: 3.00,
      sellingPrice: 11.99,
      isActive: true,
    },
  });

  console.log(`  ✅ Classic Burger ($12.99)`);
  console.log(`  ✅ French Fries ($4.99)`);
  console.log(`  ✅ Caesar Salad ($9.99)`);
  console.log(`  ✅ Grilled Chicken Sandwich ($11.99)\n`);

  // ===================
  // RECIPES (For Auto-Deduction)
  // ===================
  console.log('📋 Creating Recipes (for inventory auto-deduction)...');

  const burgerRecipe = await prisma.recipe.upsert({
    where: { id: 'recipe-burger' },
    update: {},
    create: {
      id: 'recipe-burger',
      userId: user.id,
      name: 'Classic Burger',
      description: 'Recipe for our signature burger',
      category: 'Main Course',
      servingSize: 1,
      prepTime: 5,
      cookTime: 10,
      totalCost: 2.70, // Sum of ingredient costs
      costPerServing: 2.70, // For 1 serving
      isActive: true,
      ingredients: {
        create: [
          {
            inventoryItemId: groundBeef.id,
            quantity: 0.25, // 1/4 lb per burger
            unit: 'LBS',
            cost: 1.50, // 0.25 * 5.99
          },
          {
            inventoryItemId: burgerBuns.id,
            quantity: 1,
            unit: 'PIECE',
            cost: 0.50,
          },
          {
            inventoryItemId: lettuce.id,
            quantity: 1,
            unit: 'OZ',
            cost: 0.15,
          },
          {
            inventoryItemId: tomatoes.id,
            quantity: 1,
            unit: 'OZ',
            cost: 0.20,
          },
          {
            inventoryItemId: cheese.id,
            quantity: 1,
            unit: 'OZ',
            cost: 0.35,
          },
        ],
      },
    },
  });

  const friesRecipe = await prisma.recipe.upsert({
    where: { id: 'recipe-fries' },
    update: {},
    create: {
      id: 'recipe-fries',
      userId: user.id,
      name: 'French Fries',
      description: 'Recipe for crispy fries',
      category: 'Side',
      servingSize: 1,
      prepTime: 3,
      cookTime: 5,
      totalCost: 0.60,
      costPerServing: 0.60,
      isActive: true,
      ingredients: {
        create: [
          {
            inventoryItemId: potatoes.id,
            quantity: 0.5, // Half pound of potatoes
            unit: 'LBS',
            cost: 0.60, // 0.5 * 1.20
          },
        ],
      },
    },
  });

  const chickenSandwichRecipe = await prisma.recipe.upsert({
    where: { id: 'recipe-chicken' },
    update: {},
    create: {
      id: 'recipe-chicken',
      userId: user.id,
      name: 'Grilled Chicken Sandwich',
      description: 'Recipe for grilled chicken sandwich',
      category: 'Main Course',
      servingSize: 1,
      prepTime: 5,
      cookTime: 12,
      totalCost: 2.20, // 1.35 + 0.50 + 0.15 + 0.20
      costPerServing: 2.20,
      isActive: true,
      ingredients: {
        create: [
          {
            inventoryItemId: chickenBreast.id,
            quantity: 0.3, // ~5 oz of chicken
            unit: 'LBS',
            cost: 1.35, // 0.3 * 4.50
          },
          {
            inventoryItemId: burgerBuns.id,
            quantity: 1,
            unit: 'PIECE',
            cost: 0.50,
          },
          {
            inventoryItemId: lettuce.id,
            quantity: 1,
            unit: 'OZ',
            cost: 0.15,
          },
          {
            inventoryItemId: tomatoes.id,
            quantity: 1,
            unit: 'OZ',
            cost: 0.20,
          },
        ],
      },
    },
  });

  const saladRecipe = await prisma.recipe.upsert({
    where: { id: 'recipe-salad' },
    update: {},
    create: {
      id: 'recipe-salad',
      userId: user.id,
      name: 'Caesar Salad',
      description: 'Recipe for Caesar salad with grilled chicken',
      category: 'Salad',
      servingSize: 1,
      prepTime: 5,
      cookTime: 8,
      totalCost: 1.68, // 0.60 + 0.90 + 0.18
      costPerServing: 1.68,
      isActive: true,
      ingredients: {
        create: [
          {
            inventoryItemId: lettuce.id,
            quantity: 4,
            unit: 'OZ',
            cost: 0.60, // 4 * 0.15
          },
          {
            inventoryItemId: chickenBreast.id,
            quantity: 0.2, // ~3 oz
            unit: 'LBS',
            cost: 0.90, // 0.2 * 4.50
          },
          {
            inventoryItemId: cheese.id,
            quantity: 0.5,
            unit: 'OZ',
            cost: 0.18, // 0.5 * 0.35
          },
        ],
      },
    },
  });

  console.log(`  ✅ Classic Burger Recipe`);
  console.log(`     - 0.25 lbs Ground Beef`);
  console.log(`     - 1 Burger Bun`);
  console.log(`     - 1 oz Lettuce`);
  console.log(`     - 1 oz Tomato`);
  console.log(`     - 1 oz Cheese`);
  console.log(`  ✅ French Fries Recipe`);
  console.log(`     - 0.5 lbs Potatoes`);
  console.log(`  ✅ Grilled Chicken Sandwich Recipe`);
  console.log(`     - 0.3 lbs Chicken Breast`);
  console.log(`     - 1 Burger Bun`);
  console.log(`     - 1 oz Lettuce`);
  console.log(`     - 1 oz Tomato`);
  console.log(`  ✅ Caesar Salad Recipe`);
  console.log(`     - 4 oz Lettuce`);
  console.log(`     - 0.2 lbs Chicken Breast`);
  console.log(`     - 0.5 oz Cheese\n`);

  // ===================
  // RESERVATION TABLES
  // ===================
  console.log('🪑 Creating Reservation Tables...');

  const tables = [];
  for (let i = 1; i <= 10; i++) {
    const table = await prisma.restaurantTable.upsert({
      where: { id: `table-${i}` },
      update: {},
      create: {
        id: `table-${i}`,
        userId: user.id,
        tableName: `Table ${i}`,
        capacity: i <= 5 ? 2 : i <= 8 ? 4 : 6,
        section: i <= 5 ? 'Main' : 'Patio',
        features: i > 8 ? ['Window View'] : [],
        isPremium: i > 8,
        isActive: true,
      },
    });
    tables.push(table);
    console.log(`  ✅ Table ${i} (${table.capacity} seats, ${table.section})`);
  }
  console.log('');

  // ===================
  // SUMMARY
  // ===================

  // ===================
  // CLUBOS: SPORTS CLUB MANAGEMENT
  // ===================
  console.log('⚽ Creating ClubOS Data...\n');

  // 1. VENUES
  console.log('🏟️  Creating Venues...');
  
  const mainField = await prisma.clubOSVenue.upsert({
    where: { id: 'venue-main-field' },
    update: {},
    create: {
      id: 'venue-main-field',
      userId: user.id,
      name: 'Main Soccer Field',
      address: '123 Sports Complex Dr',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201',
      venueType: 'FIELD',
      capacity: 200,
      hasLighting: true,
      hasParking: true,
      hasRestrooms: true,
      notes: 'Full-size soccer field with bleachers and concessions. Ideal for youth leagues.',
      isActive: true,
    },
  });

  const court1 = await prisma.clubOSVenue.upsert({
    where: { id: 'venue-basketball-court-1' },
    update: {},
    create: {
      id: 'venue-basketball-court-1',
      userId: user.id,
      name: 'Basketball Court #1',
      address: '456 Gymnasium Ave',
      city: 'Portland',
      state: 'OR',
      zipCode: '97202',
      venueType: 'COURT',
      capacity: 150,
      hasLighting: true,
      hasParking: true,
      hasRestrooms: true,
      notes: 'Indoor basketball court with lockers, water fountains, and scoreboard.',
      isActive: true,
    },
  });

  const diamond1 = await prisma.clubOSVenue.upsert({
    where: { id: 'venue-baseball-diamond' },
    update: {},
    create: {
      id: 'venue-baseball-diamond',
      userId: user.id,
      name: 'Diamond #1',
      address: '789 Baseball Way',
      city: 'Portland',
      state: 'OR',
      zipCode: '97203',
      venueType: 'FIELD',
      capacity: 250,
      hasLighting: true,
      hasParking: true,
      hasRestrooms: true,
      notes: 'Professional baseball diamond with dugouts, bleachers, and scoreboard.',
      isActive: true,
    },
  });

  console.log(`  ✅ Main Soccer Field`);
  console.log(`  ✅ Basketball Court #1`);
  console.log(`  ✅ Diamond #1\n`);

  // 2. PROGRAMS
  console.log('🏆 Creating Programs...');

  const soccerProgram = await prisma.clubOSProgram.upsert({
    where: { id: 'program-spring-soccer-2025' },
    update: {},
    create: {
      id: 'program-spring-soccer-2025',
      userId: user.id,
      name: 'Spring Soccer League 2025',
      description: 'Youth soccer league for ages 6-14. Develop skills, teamwork, and love for the game!',
      programType: 'LEAGUE',
      tags: ['soccer', 'youth', 'recreational'],
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-05-31'),
      registrationOpenDate: new Date('2025-01-15'),
      registrationCloseDate: new Date('2025-02-28'),
      earlyBirdDeadline: new Date('2025-02-15'),
      ageMin: 6,
      ageMax: 14,
      status: 'OPEN',
      maxParticipants: 120,
      baseFee: 17500, // $175.00
      familyDiscount: 2500, // $25.00 off for 2nd+ child
      earlyBirdDiscount: 1500, // $15.00 early bird discount
    },
  });

  const basketballProgram = await prisma.clubOSProgram.upsert({
    where: { id: 'program-summer-basketball-2025' },
    update: {},
    create: {
      id: 'program-summer-basketball-2025',
      userId: user.id,
      name: 'Summer Basketball Camp 2025',
      description: 'Intensive basketball skills camp. All skill levels welcome!',
      programType: 'CAMP',
      tags: ['basketball', 'camp', 'skills'],
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-08-15'),
      registrationOpenDate: new Date('2025-03-01'),
      registrationCloseDate: new Date('2025-06-10'),
      earlyBirdDeadline: new Date('2025-05-15'),
      ageMin: 8,
      ageMax: 16,
      status: 'OPEN',
      maxParticipants: 80,
      baseFee: 27500, // $275.00
      familyDiscount: 3500, // $35.00 off for 2nd+ child
      earlyBirdDiscount: 2500, // $25.00 early bird discount
    },
  });

  const fallSoccerProgram = await prisma.clubOSProgram.upsert({
    where: { id: 'program-fall-soccer-2025' },
    update: {},
    create: {
      id: 'program-fall-soccer-2025',
      userId: user.id,
      name: 'Fall Soccer League 2025',
      description: 'Competitive fall soccer season for all ages. Focus on skill development and sportsmanship.',
      programType: 'LEAGUE',
      tags: ['soccer', 'youth', 'competitive'],
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-11-30'),
      registrationOpenDate: new Date('2025-06-01'),
      registrationCloseDate: new Date('2025-08-31'),
      earlyBirdDeadline: new Date('2025-07-31'),
      ageMin: 5,
      ageMax: 16,
      status: 'OPEN',
      maxParticipants: 150,
      baseFee: 18500, // $185.00
      familyDiscount: 2500,
      earlyBirdDiscount: 2000,
    },
  });

  const baseballProgram = await prisma.clubOSProgram.upsert({
    where: { id: 'program-spring-baseball-2025' },
    update: {},
    create: {
      id: 'program-spring-baseball-2025',
      userId: user.id,
      name: 'Spring Baseball League 2025',
      description: 'Learn America\'s favorite pastime! Batting, pitching, and fielding skills for all levels.',
      programType: 'LEAGUE',
      tags: ['baseball', 'youth', 'recreational'],
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-06-30'),
      registrationOpenDate: new Date('2025-01-15'),
      registrationCloseDate: new Date('2025-03-31'),
      earlyBirdDeadline: new Date('2025-03-01'),
      ageMin: 7,
      ageMax: 14,
      status: 'OPEN',
      maxParticipants: 90,
      baseFee: 19500, // $195.00
      familyDiscount: 3000,
      earlyBirdDiscount: 2000,
    },
  });

  const tennisProgram = await prisma.clubOSProgram.upsert({
    where: { id: 'program-summer-tennis-2025' },
    update: {},
    create: {
      id: 'program-summer-tennis-2025',
      userId: user.id,
      name: 'Summer Tennis Clinic 2025',
      description: 'Professional tennis coaching for beginners through advanced players.',
      programType: 'CLINIC',
      tags: ['tennis', 'individual', 'skills'],
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-08-31'),
      registrationOpenDate: new Date('2025-03-01'),
      registrationCloseDate: new Date('2025-05-31'),
      earlyBirdDeadline: new Date('2025-04-30'),
      ageMin: 8,
      ageMax: 18,
      status: 'OPEN',
      maxParticipants: 40,
      baseFee: 32500, // $325.00
      familyDiscount: 5000,
      earlyBirdDiscount: 3500,
    },
  });

  console.log(`  ✅ Spring Soccer League 2025`);
  console.log(`  ✅ Summer Basketball Camp 2025`);
  console.log(`  ✅ Fall Soccer League 2025`);
  console.log(`  ✅ Spring Baseball League 2025`);
  console.log(`  ✅ Summer Tennis Clinic 2025\n`);

  // 3. DIVISIONS
  console.log('📊 Creating Divisions...');

  const u8BoySoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u8-boys-soccer' },
    update: {},
    create: {
      id: 'div-u8-boys-soccer',
      programId: soccerProgram.id,
      name: 'U8 Boys',
      gender: 'MALE',
      ageMin: 6,
      ageMax: 8,
      skillLevel: 'Beginner',
      maxTeams: 2,
      maxPlayersPerTeam: 10,
      practiceDay: 'Monday',
      practiceTime: '4:00 PM - 5:00 PM',
    },
  });

  const u8GirlSoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u8-girls-soccer' },
    update: {},
    create: {
      id: 'div-u8-girls-soccer',
      programId: soccerProgram.id,
      name: 'U8 Girls',
      gender: 'FEMALE',
      ageMin: 6,
      ageMax: 8,
      skillLevel: 'Beginner',
      maxTeams: 2,
      maxPlayersPerTeam: 10,
      practiceDay: 'Tuesday',
      practiceTime: '4:00 PM - 5:00 PM',
    },
  });

  const u10BoySoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u10-boys-soccer' },
    update: {},
    create: {
      id: 'div-u10-boys-soccer',
      programId: soccerProgram.id,
      name: 'U10 Boys',
      gender: 'MALE',
      ageMin: 9,
      ageMax: 10,
      skillLevel: 'Intermediate',
      maxTeams: 2,
      maxPlayersPerTeam: 12,
      practiceDay: 'Wednesday',
      practiceTime: '5:00 PM - 6:00 PM',
    },
  });

  const u10GirlSoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u10-girls-soccer' },
    update: {},
    create: {
      id: 'div-u10-girls-soccer',
      programId: soccerProgram.id,
      name: 'U10 Girls',
      gender: 'FEMALE',
      ageMin: 9,
      ageMax: 10,
      skillLevel: 'Intermediate',
      maxTeams: 2,
      maxPlayersPerTeam: 12,
      practiceDay: 'Thursday',
      practiceTime: '5:00 PM - 6:00 PM',
    },
  });

  const u12BoySoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u12-boys-soccer' },
    update: {},
    create: {
      id: 'div-u12-boys-soccer',
      programId: soccerProgram.id,
      name: 'U12 Boys',
      gender: 'MALE',
      ageMin: 11,
      ageMax: 12,
      skillLevel: 'Intermediate',
      maxTeams: 2,
      maxPlayersPerTeam: 14,
      practiceDay: 'Monday',
      practiceTime: '5:30 PM - 6:30 PM',
    },
  });

  const u12GirlSoccer = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u12-girls-soccer' },
    update: {},
    create: {
      id: 'div-u12-girls-soccer',
      programId: soccerProgram.id,
      name: 'U12 Girls',
      gender: 'FEMALE',
      ageMin: 11,
      ageMax: 12,
      skillLevel: 'Intermediate',
      maxTeams: 2,
      maxPlayersPerTeam: 14,
      practiceDay: 'Tuesday',
      practiceTime: '5:30 PM - 6:30 PM',
    },
  });

  // Basketball divisions (Co-Ed, so no gender specified)
  const u10Basketball = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u10-basketball' },
    update: {},
    create: {
      id: 'div-u10-basketball',
      programId: basketballProgram.id,
      name: 'U10 Co-Ed',
      // gender: null (optional, left out for co-ed)
      ageMin: 8,
      ageMax: 10,
      skillLevel: 'Beginner',
      maxTeams: 3,
      maxPlayersPerTeam: 8,
      practiceDay: 'Wednesday',
      practiceTime: '3:00 PM - 4:30 PM',
    },
  });

  const u14Basketball = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u14-basketball' },
    update: {},
    create: {
      id: 'div-u14-basketball',
      programId: basketballProgram.id,
      name: 'U14 Co-Ed',
      // gender: null (optional, left out for co-ed)
      ageMin: 11,
      ageMax: 14,
      skillLevel: 'Intermediate',
      maxTeams: 3,
      maxPlayersPerTeam: 10,
      practiceDay: 'Friday',
      practiceTime: '4:00 PM - 5:30 PM',
    },
  });

  // Baseball divisions
  const u8Baseball = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u8-baseball' },
    update: {},
    create: {
      id: 'div-u8-baseball',
      programId: baseballProgram.id,
      name: 'U8 Co-Ed',
      ageMin: 7,
      ageMax: 8,
      skillLevel: 'Beginner',
      maxTeams: 2,
      maxPlayersPerTeam: 12,
      practiceDay: 'Tuesday',
      practiceTime: '4:30 PM - 5:30 PM',
    },
  });

  const u10Baseball = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u10-baseball' },
    update: {},
    create: {
      id: 'div-u10-baseball',
      programId: baseballProgram.id,
      name: 'U10 Co-Ed',
      ageMin: 9,
      ageMax: 10,
      skillLevel: 'Intermediate',
      maxTeams: 2,
      maxPlayersPerTeam: 12,
      practiceDay: 'Thursday',
      practiceTime: '4:30 PM - 5:30 PM',
    },
  });

  const u12Baseball = await prisma.clubOSDivision.upsert({
    where: { id: 'div-u12-baseball' },
    update: {},
    create: {
      id: 'div-u12-baseball',
      programId: baseballProgram.id,
      name: 'U12 Co-Ed',
      ageMin: 11,
      ageMax: 12,
      skillLevel: 'Advanced',
      maxTeams: 2,
      maxPlayersPerTeam: 14,
      practiceDay: 'Friday',
      practiceTime: '5:00 PM - 6:00 PM',
    },
  });

  // Tennis divisions (skill-based, not age-based)
  const tennisBeginner = await prisma.clubOSDivision.upsert({
    where: { id: 'div-tennis-beginner' },
    update: {},
    create: {
      id: 'div-tennis-beginner',
      programId: tennisProgram.id,
      name: 'Beginner Group',
      ageMin: 8,
      ageMax: 18,
      skillLevel: 'Beginner',
      maxTeams: 1,
      maxPlayersPerTeam: 10,
      practiceDay: 'Monday/Wednesday',
      practiceTime: '3:00 PM - 4:30 PM',
    },
  });

  const tennisIntermediate = await prisma.clubOSDivision.upsert({
    where: { id: 'div-tennis-intermediate' },
    update: {},
    create: {
      id: 'div-tennis-intermediate',
      programId: tennisProgram.id,
      name: 'Intermediate Group',
      ageMin: 8,
      ageMax: 18,
      skillLevel: 'Intermediate',
      maxTeams: 1,
      maxPlayersPerTeam: 10,
      practiceDay: 'Tuesday/Thursday',
      practiceTime: '3:00 PM - 4:30 PM',
    },
  });

  console.log(`  ✅ 6 Soccer Divisions (U8/U10/U12 Boys & Girls)`);
  console.log(`  ✅ 2 Basketball Divisions (U10/U14 Co-Ed)`);
  console.log(`  ✅ 3 Baseball Divisions (U8/U10/U12 Co-Ed)`);
  console.log(`  ✅ 2 Tennis Divisions (Beginner/Intermediate)\n`);

  // 4. HOUSEHOLD (Family Account)
  // Note: In ClubOS, each household has a unique userId (parent creates account to register children)
  // For seed data, we'll use the existing admin user as a household
  console.log('👨‍👩‍👧‍👦 Creating Household...');

  const household = await prisma.clubOSHousehold.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      primaryContactName: 'John Smith (Admin)',
      primaryContactEmail: user.email || 'admin@agency.com',
      primaryContactPhone: '+15551234567',
      address: '123 Main St',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201',
      emergencyContact: 'Jane Smith',
      emergencyPhone: '+15559876543',
      notes: 'Demo household for testing ClubOS system',
    },
  });

  console.log(`  ✅ 1 Household created (linked to admin user)\n`);

  // 5. MEMBERS (Players in the household)
  console.log('👦👧 Creating Members (Players)...');

  const members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'MALE' | 'FEMALE';
    memberType: 'PLAYER';
  }> = [
    // Mix of ages and genders for testing different divisions
    { id: 'member-ethan', firstName: 'Ethan', lastName: 'Smith', dateOfBirth: new Date('2017-05-15'), gender: 'MALE', memberType: 'PLAYER' },
    { id: 'member-olivia', firstName: 'Olivia', lastName: 'Smith', dateOfBirth: new Date('2015-08-20'), gender: 'FEMALE', memberType: 'PLAYER' },
    { id: 'member-liam', firstName: 'Liam', lastName: 'Smith', dateOfBirth: new Date('2016-03-10'), gender: 'MALE', memberType: 'PLAYER' },
    { id: 'member-emma', firstName: 'Emma', lastName: 'Smith', dateOfBirth: new Date('2014-11-12'), gender: 'FEMALE', memberType: 'PLAYER' },
    { id: 'member-noah', firstName: 'Noah', lastName: 'Smith', dateOfBirth: new Date('2018-01-05'), gender: 'MALE', memberType: 'PLAYER' },
    { id: 'member-ava', firstName: 'Ava', lastName: 'Smith', dateOfBirth: new Date('2013-07-22'), gender: 'FEMALE', memberType: 'PLAYER' },
  ];

  for (const m of members) {
    await prisma.clubOSMember.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        householdId: household.id,
        firstName: m.firstName,
        lastName: m.lastName,
        dateOfBirth: m.dateOfBirth,
        gender: m.gender,
        memberType: m.memberType,
        medicalNotes: 'None',
        waiverSigned: true,
        waiverSignedDate: new Date(),
      },
    });
  }

  console.log(`  ✅ 6 Players created in household\n`);

  // 6. REGISTRATIONS
  console.log('📝 Creating Registrations...');

  const registrations: Array<{
    id: string;
    memberId: string;
    programId: string;
    divisionId: string;
    status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'WAITLIST' | 'CANCELLED' | 'COMPLETED';
  }> = [
    // Soccer registrations (mix of statuses for testing)
    { id: 'reg-ethan-soccer', memberId: 'member-ethan', programId: soccerProgram.id, divisionId: u8BoySoccer.id, status: 'APPROVED' },
    { id: 'reg-olivia-soccer', memberId: 'member-olivia', programId: soccerProgram.id, divisionId: u10GirlSoccer.id, status: 'ACTIVE' },
    { id: 'reg-liam-soccer', memberId: 'member-liam', programId: soccerProgram.id, divisionId: u10BoySoccer.id, status: 'PENDING' },
    { id: 'reg-emma-soccer', memberId: 'member-emma', programId: soccerProgram.id, divisionId: u12GirlSoccer.id, status: 'APPROVED' },
    
    // Basketball registrations
    { id: 'reg-noah-basketball', memberId: 'member-noah', programId: basketballProgram.id, divisionId: u10Basketball.id, status: 'ACTIVE' },
    { id: 'reg-ava-basketball', memberId: 'member-ava', programId: basketballProgram.id, divisionId: u14Basketball.id, status: 'PENDING' },
  ];

  for (const r of registrations) {
    await prisma.clubOSRegistration.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        householdId: household.id,
        memberId: r.memberId,
        programId: r.programId,
        divisionId: r.divisionId,
        status: r.status,
        registrationDate: new Date(),
        totalAmount: soccerProgram.baseFee, // Use program's base fee
        amountPaid: r.status === 'ACTIVE' ? soccerProgram.baseFee : 0, // Paid if active
        balanceDue: r.status === 'ACTIVE' ? 0 : soccerProgram.baseFee,
        waiverSignedDate: new Date(),
        specialRequests: 'Mock registration for testing ClubOS system',
      },
    });
  }

  console.log(`  ✅ 6 Registrations created (4 soccer, 2 basketball)`);
  console.log(`    • 2 Approved`);
  console.log(`    • 2 Active`);
  console.log(`    • 2 Pending\n`);

  // 7. TEAMS (assign registered players to teams)
  console.log('⚽ Creating Teams...');

  const u8BoysTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u8-boys-lions' },
    update: {},
    create: {
      id: 'team-u8-boys-lions',
      divisionId: u8BoySoccer.id,
      name: 'Lions',
      colorPrimary: '#FFA500',
      status: 'ACTIVE',
    },
  });

  const u10GirlsTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u10-girls-tigers' },
    update: {},
    create: {
      id: 'team-u10-girls-tigers',
      divisionId: u10GirlSoccer.id,
      name: 'Tigers',
      colorPrimary: '#FF6347',
      status: 'ACTIVE',
    },
  });

  const u10BoysTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u10-boys-eagles' },
    update: {},
    create: {
      id: 'team-u10-boys-eagles',
      divisionId: u10BoySoccer.id,
      name: 'Eagles',
      colorPrimary: '#1E90FF',
      status: 'ACTIVE',
    },
  });

  const u12GirlsTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u12-girls-panthers' },
    update: {},
    create: {
      id: 'team-u12-girls-panthers',
      divisionId: u12GirlSoccer.id,
      name: 'Panthers',
      colorPrimary: '#800080',
      status: 'ACTIVE',
    },
  });

  const u10BasketballTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u10-basketball-rockets' },
    update: {},
    create: {
      id: 'team-u10-basketball-rockets',
      divisionId: u10Basketball.id,
      name: 'Rockets',
      colorPrimary: '#FF4500',
      status: 'ACTIVE',
    },
  });

  const u14BasketballTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u14-basketball-thunder' },
    update: {},
    create: {
      id: 'team-u14-basketball-thunder',
      divisionId: u14Basketball.id,
      name: 'Thunder',
      colorPrimary: '#0000FF',
      status: 'ACTIVE',
    },
  });

  // Baseball teams
  const u8BaseballTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u8-baseball-cubs' },
    update: {},
    create: {
      id: 'team-u8-baseball-cubs',
      divisionId: u8Baseball.id,
      name: 'Cubs',
      colorPrimary: '#0E3386',
      status: 'ACTIVE',
    },
  });

  const u8BaseballTeam2 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u8-baseball-redbirds' },
    update: {},
    create: {
      id: 'team-u8-baseball-redbirds',
      divisionId: u8Baseball.id,
      name: 'Redbirds',
      colorPrimary: '#C41E3A',
      status: 'ACTIVE',
    },
  });

  const u10BaseballTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u10-baseball-yankees' },
    update: {},
    create: {
      id: 'team-u10-baseball-yankees',
      divisionId: u10Baseball.id,
      name: 'Yankees',
      colorPrimary: '#003087',
      status: 'ACTIVE',
    },
  });

  const u12BaseballTeam1 = await prisma.clubOSTeam.upsert({
    where: { id: 'team-u12-baseball-giants' },
    update: {},
    create: {
      id: 'team-u12-baseball-giants',
      divisionId: u12Baseball.id,
      name: 'Giants',
      colorPrimary: '#FD5A1E',
      status: 'ACTIVE',
    },
  });

  // Tennis groups (skill-based)
  const tennisBeginnersGroup = await prisma.clubOSTeam.upsert({
    where: { id: 'team-tennis-beginners' },
    update: {},
    create: {
      id: 'team-tennis-beginners',
      divisionId: tennisBeginner.id,
      name: 'Beginners Group A',
      colorPrimary: '#90EE90',
      status: 'ACTIVE',
    },
  });

  const tennisIntermediateGroup = await prisma.clubOSTeam.upsert({
    where: { id: 'team-tennis-intermediate' },
    update: {},
    create: {
      id: 'team-tennis-intermediate',
      divisionId: tennisIntermediate.id,
      name: 'Intermediate Group A',
      colorPrimary: '#FFD700',
      status: 'ACTIVE',
    },
  });

  // Additional soccer teams for fall program
  const u12FallBoysTeam = await prisma.clubOSTeam.upsert({
    where: { id: 'team-fall-u12-boys-hawks' },
    update: {},
    create: {
      id: 'team-fall-u12-boys-hawks',
      divisionId: u12BoySoccer.id,
      name: 'Hawks',
      colorPrimary: '#8B0000',
      status: 'FORMING',
    },
  });

  console.log(`  ✅ 13 Teams created (Soccer, Basketball, Baseball, Tennis)\n`);

  // 8. TEAM MEMBERS (assign players to teams)
  console.log('👥 Assigning players to teams...');

  const teamMemberships = [
    { teamId: u8BoysTeam1.id, memberId: 'member-ethan', jerseyNumber: '7' },
    { teamId: u10GirlsTeam1.id, memberId: 'member-olivia', jerseyNumber: '10' },
    { teamId: u10BoysTeam1.id, memberId: 'member-liam', jerseyNumber: '5' },
    { teamId: u12GirlsTeam1.id, memberId: 'member-emma', jerseyNumber: '12' },
    { teamId: u10BasketballTeam1.id, memberId: 'member-noah', jerseyNumber: '23' },
    { teamId: u14BasketballTeam1.id, memberId: 'member-ava', jerseyNumber: '3' },
  ];

  for (const tm of teamMemberships) {
    await prisma.clubOSTeamMember.upsert({
      where: {
        teamId_memberId: {
          teamId: tm.teamId,
          memberId: tm.memberId,
        },
      },
      update: {},
      create: {
        teamId: tm.teamId,
        memberId: tm.memberId,
        jerseyNumber: tm.jerseyNumber,
        role: 'PLAYER',
      },
    });
  }

  console.log(`  ✅ 6 team memberships created\n`);

  // 9. SCHEDULES (games and practices)
  console.log('📅 Creating Schedules...');

  const schedules = [
    // Soccer practices
    {
      id: 'schedule-u8-boys-practice-1',
      eventType: 'PRACTICE',
      title: 'Lions Practice',
      startTime: new Date('2025-03-03T16:00:00'),
      endTime: new Date('2025-03-03T17:00:00'),
      venueId: mainField.id,
      practiceTeamId: u8BoysTeam1.id,
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-u10-girls-practice-1',
      eventType: 'PRACTICE',
      title: 'Tigers Practice',
      startTime: new Date('2025-03-04T16:00:00'),
      endTime: new Date('2025-03-04T17:00:00'),
      venueId: mainField.id,
      practiceTeamId: u10GirlsTeam1.id,
      status: 'SCHEDULED',
    },
    // Soccer game
    {
      id: 'schedule-u8-boys-game-1',
      eventType: 'GAME',
      title: 'Lions vs Eagles',
      startTime: new Date('2025-03-10T10:00:00'),
      endTime: new Date('2025-03-10T11:00:00'),
      venueId: mainField.id,
      homeTeamId: u8BoysTeam1.id,
      awayTeamId: u10BoysTeam1.id,
      status: 'SCHEDULED',
    },
    // Basketball practices
    {
      id: 'schedule-u10-basketball-practice-1',
      eventType: 'PRACTICE',
      title: 'Rockets Practice',
      startTime: new Date('2025-06-16T15:00:00'),
      endTime: new Date('2025-06-16T16:30:00'),
      venueId: court1.id,
      practiceTeamId: u10BasketballTeam1.id,
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-u14-basketball-practice-1',
      eventType: 'PRACTICE',
      title: 'Thunder Practice',
      startTime: new Date('2025-06-17T16:00:00'),
      endTime: new Date('2025-06-17T17:30:00'),
      venueId: court1.id,
      practiceTeamId: u14BasketballTeam1.id,
      status: 'SCHEDULED',
    },
    // More upcoming events
    {
      id: 'schedule-u10-girls-game-1',
      eventType: 'GAME',
      title: 'Tigers Season Opener',
      startTime: new Date('2025-03-15T11:00:00'),
      endTime: new Date('2025-03-15T12:00:00'),
      venueId: mainField.id,
      homeTeamId: u10GirlsTeam1.id,
      status: 'SCHEDULED',
    },
    {
      id: 'schedule-tournament-1',
      eventType: 'TOURNAMENT',
      title: 'Spring Soccer Tournament',
      startTime: new Date('2025-04-20T09:00:00'),
      endTime: new Date('2025-04-20T17:00:00'),
      venueId: mainField.id,
      status: 'SCHEDULED',
    },
  ];

  for (const s of schedules) {
    await prisma.clubOSSchedule.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: user.id,
        eventType: s.eventType as any,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        venueId: s.venueId,
        homeTeamId: s.homeTeamId,
        awayTeamId: s.awayTeamId,
        practiceTeamId: s.practiceTeamId,
        status: s.status as any,
      },
    });
  }

  console.log(`  ✅ 7 Schedules created (practices, games, tournament)\n`);

  // 10. PAYMENTS (realistic payment data)
  console.log('💳 Creating Payment Records...');

  const payments = [
    // Full payment for Olivia (ACTIVE status)
    {
      id: 'payment-olivia-soccer-full',
      householdId: household.id,
      registrationId: 'reg-olivia-soccer',
      amount: soccerProgram.baseFee, // $175.00
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      description: 'Registration fee - Olivia Smith - Spring Soccer League 2025',
      paidAt: new Date('2025-02-01T10:30:00'),
    },
    // Full payment for Noah (ACTIVE status)
    {
      id: 'payment-noah-basketball-full',
      householdId: household.id,
      registrationId: 'reg-noah-basketball',
      amount: basketballProgram.baseFee, // $275.00
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      description: 'Registration fee - Noah Smith - Summer Basketball Camp 2025',
      paidAt: new Date('2025-05-01T14:15:00'),
    },
    // Partial payment for Ethan (APPROVED, balance due)
    {
      id: 'payment-ethan-soccer-partial',
      householdId: household.id,
      registrationId: 'reg-ethan-soccer',
      amount: 10000, // $100.00 partial payment
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      description: 'Partial payment - Ethan Smith - Spring Soccer League 2025',
      paidAt: new Date('2025-02-10T09:00:00'),
    },
    // Partial payment for Emma (APPROVED, balance due)
    {
      id: 'payment-emma-soccer-partial',
      householdId: household.id,
      registrationId: 'reg-emma-soccer',
      amount: 8000, // $80.00 partial payment
      paymentMethod: 'DEBIT_CARD',
      status: 'PAID',
      description: 'Partial payment - Emma Smith - Spring Soccer League 2025',
      paidAt: new Date('2025-02-12T11:20:00'),
    },
  ];

  for (const p of payments) {
    await prisma.clubOSPayment.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        householdId: p.householdId,
        registrationId: p.registrationId,
        amount: p.amount,
        paymentMethod: p.paymentMethod as any,
        status: p.status as any,
        description: p.description,
        paidAt: p.paidAt,
        createdAt: p.paidAt,
      },
    });
  }

  // Update registration balances to reflect payments
  await prisma.clubOSRegistration.update({
    where: { id: 'reg-ethan-soccer' },
    data: {
      amountPaid: 10000,
      balanceDue: soccerProgram.baseFee - 10000, // $75 remaining
    },
  });

  await prisma.clubOSRegistration.update({
    where: { id: 'reg-emma-soccer' },
    data: {
      amountPaid: 8000,
      balanceDue: soccerProgram.baseFee - 8000, // $95 remaining
    },
  });

  console.log(`  ✅ 4 Payment records created\n`);
  console.log(`    • 2 Full payments (Olivia, Noah)`);
  console.log(`    • 2 Partial payments (Ethan $100, Emma $80)`);
  console.log(`    • Total balance due: $170.00\n`);

  console.log('✅ ClubOS Data Complete!\n');
  console.log('✨ Seeding Complete!\n');
  console.log('📊 Summary:');
  console.log(`  • 4 Kitchen Stations`);
  console.log(`  • 7 Inventory Items (ingredients)`);
  console.log(`  • 4 POS Products (sellable)`);
  console.log(`  • 4 Recipes (for auto-deduction)`);
  console.log(`  • 10 Reservation Tables`);
  console.log(`\n  ClubOS System:`);
  console.log(`  • 3 ClubOS Venues`);
  console.log(`  • 5 ClubOS Programs (Soccer, Basketball, Baseball, Tennis)`);
  console.log(`  • 13 ClubOS Divisions`);
  console.log(`  • 1 ClubOS Household`);
  console.log(`  • 6 ClubOS Members (Players)`);
  console.log(`  • 6 ClubOS Registrations`);
  console.log(`  • 13 ClubOS Teams`);
  console.log(`  • 6 Team Memberships`);
  console.log(`  • 7 ClubOS Schedules (games & practices)`);
  console.log(`  • 4 ClubOS Payments ($450 paid, $170 balance due)`);
  console.log('\n🎯 Next Steps:');
  console.log('  1. Visit /dashboard/clubos/admin to review registrations');
  console.log('  2. Visit /dashboard/clubos/register to test parent portal');
  console.log('  3. Approve pending registrations');
  console.log('  4. Create POS orders and test kitchen workflow');
  console.log('  5. Check reports dashboard for analytics\n');
  
  console.log('📝 Example ClubOS Test Flow:');
  console.log('  1. Go to: /dashboard/clubos/admin');
  console.log('  2. Filter by "Spring Soccer League 2025"');
  console.log('  3. Approve/Activate registrations');
  console.log('  4. Test parent portal: /dashboard/clubos/register');
  console.log('  5. Register new players and test age-based division assignment\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
/**
 * Orthodontist Demo - Phase 4: Inventory & E-Commerce
 * Creates: GeneralInventory (categories, suppliers, locations, items), Products, Orders
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const USER_EMAIL = 'orthodontist@nexrel.com';

// General Inventory - Orthodontist supplies
const INVENTORY_CATEGORIES = [
  { name: 'Brackets & Bands', description: 'Metal and ceramic brackets, bands' },
  { name: 'Wires & Archwires', description: 'Nickel-titanium, stainless steel wires' },
  { name: 'Retainers', description: 'Hawley, clear, fixed retainers' },
  { name: 'Aligners', description: 'Clear aligner materials' },
  { name: 'Elastics & Accessories', description: 'Elastics, ligatures, wax' },
  { name: 'Adhesives & Bonding', description: 'Bonding agents, primers' },
];

const INVENTORY_SUPPLIERS = [
  { name: 'Dentsply Sirona', contactName: 'Sales Rep', email: 'sales@dentsply.com', phone: '1-800-555-0100' },
  { name: '3M Oral Care', contactName: 'Ortho Division', email: 'ortho@3m.com', phone: '1-800-555-0200' },
  { name: 'Ormco Corporation', contactName: 'Account Manager', email: 'orders@ormco.com', phone: '1-800-555-0300' },
  { name: 'Align Technology', contactName: 'Invisalign Support', email: 'support@aligntech.com', phone: '1-800-555-0400' },
];

const INVENTORY_ITEMS = [
  { sku: 'BRK-MET-001', name: 'Metal Brackets 0.022', category: 'Brackets & Bands', qty: 500, reorder: 100, cost: 2.5, sell: 4.5, unit: 'pack' },
  { sku: 'BRK-CER-001', name: 'Ceramic Brackets 0.022', category: 'Brackets & Bands', qty: 200, reorder: 50, cost: 8, sell: 14, unit: 'pack' },
  { sku: 'WIR-NITI-018', name: 'NiTi Archwire 0.018', category: 'Wires & Archwires', qty: 100, reorder: 25, cost: 3, sell: 6, unit: 'each' },
  { sku: 'WIR-SS-020', name: 'Stainless Steel 0.020', category: 'Wires & Archwires', qty: 80, reorder: 20, cost: 2, sell: 4, unit: 'each' },
  { sku: 'RET-HAW-001', name: 'Hawley Retainer Upper', category: 'Retainers', qty: 30, reorder: 10, cost: 45, sell: 120, unit: 'each' },
  { sku: 'RET-CLR-001', name: 'Clear Retainer Set', category: 'Retainers', qty: 25, reorder: 8, cost: 80, sell: 200, unit: 'set' },
  { sku: 'ELC-1-4', name: 'Elastics 1/4" Heavy', category: 'Elastics & Accessories', qty: 200, reorder: 50, cost: 0.15, sell: 0.35, unit: 'bag' },
  { sku: 'ELC-3-16', name: 'Elastics 3/16" Medium', category: 'Elastics & Accessories', qty: 200, reorder: 50, cost: 0.15, sell: 0.35, unit: 'bag' },
  { sku: 'WAX-001', name: 'Orthodontic Wax', category: 'Elastics & Accessories', qty: 150, reorder: 30, cost: 1.5, sell: 4, unit: 'box' },
  { sku: 'BND-001', name: 'Bonding Primer', category: 'Adhesives & Bonding', qty: 20, reorder: 5, cost: 25, sell: 55, unit: 'bottle' },
  { sku: 'BND-002', name: 'Composite Adhesive', category: 'Adhesives & Bonding', qty: 15, reorder: 5, cost: 35, sell: 75, unit: 'tube' },
  { sku: 'BND-003', name: 'Etchant Gel', category: 'Adhesives & Bonding', qty: 12, reorder: 4, cost: 18, sell: 40, unit: 'bottle' },
  { sku: 'LIG-001', name: 'Ligature Ties Assorted', category: 'Elastics & Accessories', qty: 300, reorder: 75, cost: 0.05, sell: 0.15, unit: 'pack' },
  { sku: 'BND-004', name: 'Band Cement', category: 'Adhesives & Bonding', qty: 10, reorder: 3, cost: 42, sell: 90, unit: 'tube' },
  { sku: 'WIR-NITI-016', name: 'NiTi Archwire 0.016', category: 'Wires & Archwires', qty: 90, reorder: 25, cost: 2.8, sell: 5.5, unit: 'each' },
];

// E-commerce Products (retail)
const PRODUCT_CATEGORIES = [
  { name: 'Retainers', slug: 'retainers' },
  { name: 'Care Kits', slug: 'care-kits' },
  { name: 'Aligners', slug: 'aligners' },
  { name: 'Accessories', slug: 'accessories' },
];

const PRODUCTS = [
  { sku: 'PROD-RET-001', name: 'Essix Retainer Replacement', price: 19900, desc: 'Clear Essix-style retainer replacement. Single arch.', category: 'retainers', inventory: 50 },
  { sku: 'PROD-RET-002', name: 'Hawley Retainer', price: 24900, desc: 'Custom Hawley retainer. Durable and adjustable.', category: 'retainers', inventory: 30 },
  { sku: 'PROD-CARE-001', name: 'Braces Care Kit', price: 2999, desc: 'Travel kit: brush, floss threaders, wax, mirror.', category: 'care-kits', inventory: 100 },
  { sku: 'PROD-CARE-002', name: 'Invisalign Cleaning Kit', price: 2499, desc: 'Cleaning crystals, brush, case.', category: 'care-kits', inventory: 80 },
  { sku: 'PROD-CARE-003', name: 'Orthodontic Wax Pack', price: 599, desc: '6-pack orthodontic relief wax.', category: 'accessories', inventory: 200 },
  { sku: 'PROD-ACC-001', name: 'Water Flosser Tip', price: 1499, desc: 'Orthodontic tip for water flosser.', category: 'accessories', inventory: 60 },
  { sku: 'PROD-ACC-002', name: 'Interproximal Brushes Set', price: 999, desc: 'Set of 6 interdental brushes.', category: 'accessories', inventory: 150 },
  { sku: 'PROD-ACC-003', name: 'Retainer Case', price: 799, desc: 'Hard case for retainer storage.', category: 'accessories', inventory: 120 },
  { sku: 'PROD-ALN-001', name: 'Aligner Chewies Pack', price: 1299, desc: 'Silicone chewies for aligner seating.', category: 'aligners', inventory: 90 },
  { sku: 'PROD-ALN-002', name: 'Aligner Removal Tool', price: 999, desc: 'Easy aligner removal tool.', category: 'aligners', inventory: 70 },
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 4: Inventory & E-Commerce\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  if (leads.length === 0) {
    console.error('❌ No leads found. Run Phase 2 first.');
    process.exit(1);
  }

  console.log(`✅ Found ${leads.length} leads\n`);

  // Clean Phase 4 data
  console.log('🧹 Cleaning existing inventory, products, orders...');
  await prisma.orderItem.deleteMany({ where: { order: { userId: user.id } } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.product.deleteMany({ where: { userId: user.id } });
  await prisma.productCategory.deleteMany({ where: { userId: user.id } });
  await prisma.generalInventoryItem.deleteMany({ where: { userId: user.id } });
  await prisma.generalInventoryCategory.deleteMany({ where: { userId: user.id } });
  await prisma.generalInventorySupplier.deleteMany({ where: { userId: user.id } });
  await prisma.generalInventoryLocation.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. General Inventory: Categories, Suppliers, Locations ─────────────────
  console.log('📦 Creating general inventory...');

  const invCategories: Record<string, string> = {};
  for (const c of INVENTORY_CATEGORIES) {
    const cat = await prisma.generalInventoryCategory.create({
      data: {
        userId: user.id,
        name: c.name,
        description: c.description,
      },
    });
    invCategories[c.name] = cat.id;
  }

  const suppliers: { id: string }[] = [];
  for (const s of INVENTORY_SUPPLIERS) {
    const sup = await prisma.generalInventorySupplier.create({
      data: {
        userId: user.id,
        name: s.name,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        address: '123 Supplier Ave, Montreal, QC',
      },
    });
    suppliers.push(sup);
  }

  const mainLoc = await prisma.generalInventoryLocation.create({
    data: {
      userId: user.id,
      name: 'Main Clinic Storage',
      address: '1234 Rue Saint-Denis, Montreal, QC',
      type: 'storage',
      isDefault: true,
    },
  });

  const labLoc = await prisma.generalInventoryLocation.create({
    data: {
      userId: user.id,
      name: 'Lab Area',
      type: 'lab',
      isDefault: false,
    },
  });

  for (const item of INVENTORY_ITEMS) {
    const catId = invCategories[item.category] || null;
    const sup = randomElement(suppliers);
    const loc = Math.random() > 0.3 ? mainLoc.id : labLoc.id;
    await prisma.generalInventoryItem.create({
      data: {
        userId: user.id,
        sku: item.sku,
        name: item.name,
        description: `${item.name} - ${item.unit}`,
        categoryId: catId,
        supplierId: sup.id,
        locationId: loc,
        quantity: item.qty,
        reorderLevel: item.reorder,
        reorderQuantity: item.reorder,
        unit: item.unit,
        costPrice: item.cost,
        sellingPrice: item.sell,
        isActive: true,
      },
    });
  }
  console.log(`   ✓ ${INVENTORY_CATEGORIES.length} categories, ${INVENTORY_SUPPLIERS.length} suppliers, 2 locations, ${INVENTORY_ITEMS.length} items\n`);

  // ─── 2. E-commerce: Product Categories, Products ─────────────────────────────
  console.log('🛒 Creating e-commerce products...');

  const prodCategories: Record<string, string> = {};
  for (const c of PRODUCT_CATEGORIES) {
    const cat = await prisma.productCategory.create({
      data: {
        userId: user.id,
        name: c.name,
        slug: `ortho-demo-${c.slug}-${Date.now().toString(36)}`,
      },
    });
    prodCategories[c.slug] = cat.id;
  }

  const products: { id: string; sku: string; name: string; price: number }[] = [];
  for (const p of PRODUCTS) {
    const catId = prodCategories[p.category] || null;
    const prod = await prisma.product.create({
      data: {
        userId: user.id,
        sku: p.sku,
        name: p.name,
        description: p.desc,
        price: p.price,
        inventory: p.inventory,
        categoryId: catId,
        tags: [p.category, 'orthodontist'],
        active: true,
        productType: 'PHYSICAL',
      },
    });
    products.push(prod);
  }
  console.log(`   ✓ ${PRODUCT_CATEGORIES.length} categories, ${products.length} products\n`);

  // ─── 3. Orders ──────────────────────────────────────────────────────────────
  console.log('📋 Creating orders...');

  const orderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'DELIVERED'] as const;
  const paymentStatuses = ['PENDING', 'SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED'] as const;

  for (let i = 0; i < 12; i++) {
    const lead = leads[i % leads.length];
    const status = randomElement(orderStatuses);
    const paymentStatus = status === 'DELIVERED' || status === 'SHIPPED' ? 'SUCCEEDED' : randomElement(paymentStatuses);
    const orderNum = `ORD-2024-${String(5000 + i).padStart(4, '0')}`;

    const orderProducts = [
      randomElement(products),
      ...(Math.random() > 0.5 ? [randomElement(products)] : []),
    ];
    const items: { productId: string; productName: string; productSku: string; quantity: number; price: number; total: number }[] = [];
    let subtotal = 0;
    for (const prod of orderProducts) {
      const qty = randomInt(1, 3);
      const total = prod.price * qty;
      subtotal += total;
      items.push({
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku,
        quantity: qty,
        price: prod.price,
        total,
      });
    }
    const tax = Math.round(subtotal * 0.05);
    const shipping = subtotal >= 5000 ? 0 : 999;
    const total = subtotal + tax + shipping;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderNumber: orderNum,
        customerName: lead.contactPerson || lead.businessName,
        customerEmail: lead.email || 'customer@example.com',
        customerPhone: lead.phone || null,
        status,
        paymentStatus,
        paymentMethod: paymentStatus === 'SUCCEEDED' ? 'card' : null,
        subtotal,
        tax,
        shipping,
        discount: 0,
        total,
        shippingAddress: {
          address: lead.address || '123 Main St',
          city: lead.city || 'Montreal',
          state: lead.state || 'QC',
          zipCode: lead.zipCode || 'H1A 1A1',
          country: 'Canada',
        },
      },
    });

    for (const it of items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: it.productId,
          productName: it.productName,
          productSku: it.productSku,
          quantity: it.quantity,
          price: it.price,
          total: it.total,
        },
      });
    }
  }
  const orderCount = await prisma.order.count({ where: { userId: user.id } });
  console.log(`   ✓ Created ${orderCount} orders with items\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 4 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • General Inventory: ${INVENTORY_ITEMS.length} items, ${INVENTORY_CATEGORIES.length} categories`);
  console.log(`   • E-commerce: ${products.length} products, ${orderCount} orders`);
  console.log('\n🎉 Run Phase 5 next for clinical & admin dashboards.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), 'data');

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Load extracted data from project data/ directory
  const productsPath = path.join(DATA_DIR, 'products.json');
  const variationsPath = path.join(DATA_DIR, 'variations.json');

  if (!fs.existsSync(productsPath)) {
    console.error(`Products file not found: ${productsPath}`);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  console.log(`Loaded ${products.length} products`);

  // Extract unique categories
  const categoryMap = new Map();
  for (const p of products) {
    for (const c of (p.categories || [])) {
      if (!categoryMap.has(c.nicename)) {
        categoryMap.set(c.nicename, {
          name: c.name,
          slug: c.nicename,
          description: '',
          imageUrl: null,
          parentId: null,
          sortOrder: 0
        });
      }
    }
  }

  // Insert categories
  console.log(`Inserting ${categoryMap.size} categories...`);
  const catIdMap = new Map();
  let catOrder = 0;
  for (const [slug, cat] of categoryMap) {
    try {
      const result = await client.query(
        `INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cat.name, cat.slug, cat.description, cat.imageUrl, cat.parentId, catOrder++]
      );
      catIdMap.set(slug, result.rows[0].id);
    } catch (e) {
      const result = await client.query('SELECT id FROM categories WHERE slug = $1', [slug]);
      if (result.rows.length > 0) catIdMap.set(slug, result.rows[0].id);
      else console.error(`Error inserting category "${slug}": ${e.message}`);
    }
  }
  console.log(`Categories inserted: ${catIdMap.size}`);

  // Insert products and build wpId -> ourId map for variations
  console.log(`Inserting ${products.length} products...`);
  let inserted = 0;
  let skipped = 0;
  const productIdMap = new Map(); // wp product id -> our database id

  for (const p of products) {
    const price = p.price ? parseFloat(String(p.price).replace(/[^0-9.]/g, '')) : 0;
    const salePrice = p.sale_price ? parseFloat(String(p.sale_price).replace(/[^0-9.]/g, '')) : null;
    const categoryNames = (p.categories || []).map(c => c.name);
    const primaryCatSlug = (p.categories && p.categories[0]) ? p.categories[0].nicename : null;
    const primaryCatId = primaryCatSlug ? (catIdMap.get(primaryCatSlug) || null) : null;

    let galleryImages = [];
    if (p.gallery_urls) {
      if (typeof p.gallery_urls === 'string') {
        galleryImages = p.gallery_urls.split(',').map(u => u.trim()).filter(Boolean);
      } else if (Array.isArray(p.gallery_urls)) {
        galleryImages = p.gallery_urls;
      }
    }

    const content = p.content || '';
    const steelType = extractSpec(content, 'steel') || extractSpec(content, 'Steel Type') || '';
    const overallLength = extractSpec(content, 'Overall Length') || extractSpec(content, 'overall length') || '';
    const bladeLength = extractSpec(content, 'Blade Length') || extractSpec(content, 'blade length') || '';
    const handleLength = extractSpec(content, 'Handle Length') || extractSpec(content, 'handle length') || '';
    let weight = p.weight || extractSpec(content, 'Weight') || extractSpec(content, 'weight') || '';
    if (weight && (weight.includes('<') || weight.includes('&') || weight.length > 50)) weight = '';

    try {
      const result = await client.query(
        `INSERT INTO products (name, slug, description, short_description, price, sale_price, sku, stock_quantity, stock_status, image_url, gallery_images, category_id, categories, weight, steel_type, overall_length, blade_length, handle_length, featured, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::stock_status, $10, $11::jsonb, $12, $13::jsonb, $14, $15, $16, $17, $18, $19, $20::product_status)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image_url = EXCLUDED.image_url
         RETURNING id`,
        [
          p.title || 'Untitled',
          p.slug || `product-${inserted}`,
          p.content || '',
          p.excerpt || '',
          price || 0,
          salePrice,
          p.sku || null,
          10,
          (p.stock_status === 'sold' ? 'outofstock' : p.stock_status) || 'instock',
          p.thumbnail_url || null,
          JSON.stringify(galleryImages),
          primaryCatId,
          JSON.stringify(categoryNames),
          weight,
          steelType,
          overallLength,
          bladeLength,
          handleLength,
          0,
          'publish'
        ]
      );
      productIdMap.set(String(p.id), result.rows[0].id);
      inserted++;
    } catch (e) {
      console.error(`Error inserting product "${p.title}": ${e.message}`);
      skipped++;
    }
  }

  console.log(`Products inserted: ${inserted}, skipped: ${skipped}`);

  // Seed variations from variations.json (1,150+ variations)
  let varCount = 0;
  if (fs.existsSync(variationsPath)) {
    console.log('Loading variations from variations.json...');
    const variationsData = JSON.parse(fs.readFileSync(variationsPath, 'utf-8'));

    for (const [parentId, variations] of Object.entries(variationsData)) {
      const ourProductId = productIdMap.get(parentId);
      if (!ourProductId) continue;

      for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const price = v.price ? parseFloat(String(v.price).replace(/[^0-9.]/g, '')) : null;
        const regularPrice = v.regular_price ? parseFloat(String(v.regular_price).replace(/[^0-9.]/g, '')) : price;
        const salePrice = v.sale_price ? parseFloat(String(v.sale_price).replace(/[^0-9.]/g, '')) : null;
        const stockStatus = v.stock_status || 'instock';

        let optionName = 'Package';
        let optionValue = '';
        let variationType = 'package';

        if (v.attr_package) {
          optionName = 'Package';
          optionValue = v.attr_package;
          variationType = 'package';
        } else if (v.attr_size) {
          optionName = 'Size';
          optionValue = v.attr_size;
          variationType = 'size';
        } else if (v.attr_model) {
          optionName = 'Model';
          optionValue = v.attr_model;
          variationType = 'model';
        } else if (v.attr_color) {
          optionName = 'Color';
          optionValue = v.attr_color;
          variationType = 'color';
        } else if (v.attr_type) {
          optionName = 'Options';
          optionValue = v.attr_type;
          variationType = 'options';
        } else {
          optionValue = v.title || `Option ${i + 1}`;
        }

        try {
          await client.query(
            `INSERT INTO product_variations (product_id, name, variation_type, option_name, option_value, price, regular_price, sale_price, stock_status, wp_variation_id, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::stock_status, $10, $11)`,
            [ourProductId, optionValue, variationType, optionName, optionValue, price, regularPrice, salePrice, stockStatus, v.id || null, i + 1]
          );
          varCount++;
        } catch (e) {
          // Skip on error (e.g. duplicate run)
        }
      }
    }
    console.log(`Product variations added: ${varCount}`);
  } else {
    // Fallback: add default variations for sword products
    console.log('variations.json not found, adding default product variations...');
    const swordResult = await client.query(
      "SELECT id, name FROM products WHERE categories::text ILIKE '%Swords%' OR categories::text ILIKE '%Sword%'"
    );
    for (const prod of swordResult.rows) {
      const variations = [
        { optionName: 'Package', optionValue: 'Sword Only', priceModifier: '0.00', sortOrder: 1 },
        { optionName: 'Package', optionValue: 'Sword + Scabbard', priceModifier: '150.00', sortOrder: 2 },
        { optionName: 'Package', optionValue: 'Sword + Scabbard + Sword Belt', priceModifier: '250.00', sortOrder: 3 },
      ];
      for (const v of variations) {
        try {
          await client.query(
            `INSERT INTO product_variations (product_id, name, option_name, option_value, price_modifier, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [prod.id, v.optionValue, v.optionName, v.optionValue, v.priceModifier, v.sortOrder]
          );
          varCount++;
        } catch (e) { /* skip duplicates */ }
      }
    }
    console.log(`Product variations added: ${varCount}`);
  }

  // Seed product attributes (Grip, Scabbard, Blade Finish, Guard & Pommel Finish) for sword products
  console.log('Adding product attributes...');
  const swordProductsResult = await client.query(
    "SELECT id FROM products WHERE categories::text ILIKE '%Swords%' OR categories::text ILIKE '%Sword%' OR categories::text ILIKE '%Katana%' OR categories::text ILIKE '%Dagger%'"
  );

  const gripOptions = [
    { value: 'Black', colorHex: '#1A1A1A', isDefault: true },
    { value: 'Brown', colorHex: '#6B3A2A' },
    { value: 'Dark Brown', colorHex: '#3B1E0E' },
    { value: 'Burgundy', colorHex: '#5C1A1A' },
    { value: 'Red', colorHex: '#8B1A1A' },
    { value: 'Tan', colorHex: '#C4A46C' },
  ];
  const scabbardOptions = [{ value: 'Black', colorHex: '#1A1A1A', isDefault: true }];
  const bladeFinishOptions = [
    { value: 'High polish', isDefault: true },
    { value: 'Satin finish' },
  ];
  const guardPommelOptions = [
    { value: 'Highly polished', isDefault: true },
    { value: 'Satin Finish' },
  ];

  let attrCount = 0;
  for (const prod of swordProductsResult.rows) {
    const attrs = [
      { attributeKey: 'grip', attributeName: 'Grip', displayType: 'color_swatch', options: gripOptions },
      { attributeKey: 'scabbard', attributeName: 'Scabbard', displayType: 'color_swatch', options: scabbardOptions },
      { attributeKey: 'blade-finish', attributeName: 'Blade Finish', displayType: 'dropdown', options: bladeFinishOptions },
      { attributeKey: 'guard-pommel-finish', attributeName: 'Guard & Pommel Finish', displayType: 'dropdown', options: guardPommelOptions },
    ];
    for (let i = 0; i < attrs.length; i++) {
      try {
        await client.query(
          `INSERT INTO product_attributes (product_id, attribute_key, attribute_name, display_type, options, sort_order)
           VALUES ($1, $2, $3, $4::display_type, $5::jsonb, $6)`,
          [prod.id, attrs[i].attributeKey, attrs[i].attributeName, attrs[i].displayType, JSON.stringify(attrs[i].options), i + 1]
        );
        attrCount++;
      } catch (e) {
        // Skip on error (e.g. duplicate run)
      }
    }
  }
  console.log(`Product attributes added: ${attrCount}`);

  await client.end();
  console.log('Seed complete!');
}

function extractSpec(content, label) {
  const regex = new RegExp(`${label}[:\\s]*([^\\n<]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim().substring(0, 100) : '';
}

main().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
});

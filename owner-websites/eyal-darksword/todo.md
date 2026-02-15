# Darksword Armory Full-Stack Upgrade TODO

## Phase 1: Full-Stack Upgrade
- [x] Upgrade project to full-stack with database, server, and user management
- [x] Build e-commerce database schema (products, categories, variations, orders, cart, etc.)
- [x] Seed database with all 367 products and 62 categories
- [x] Seed 1150 product variations from XML (Package, Size, Model, Color, Options, etc.)
- [x] Build backend tRPC API routes for products, cart, orders, admin
- [x] Build CartContext provider for global cart state
- [x] Build CartDrawer slide-out component
- [x] Update ProductPage with database-powered variations and cart integration
- [x] Update Shop page to use database queries
- [x] Update CategoryPage to use database queries
- [x] Write vitest tests for product and cart APIs (24 tests passing)

## Phase 2: Hero Video
- [x] Add original blacksmith forging video to hero section
- [x] Auto-transition to image carousel after video ends
- [x] Skip button and sound toggle

## Phase 3: Checkout & Payment
- [x] Build CheckoutPage with full checkout form
- [x] Build OrderConfirmation page
- [ ] Integrate Elavon Lightbox payment gateway (waiting for credentials)
- [ ] Connect QuickBooks API for automatic invoice creation (waiting for credentials)

## Phase 4: Admin Dashboard
- [x] Build AdminDashboard page with order management
- [x] Product management tab
- [x] Sales overview with stats

## Phase 5: Remaining Pages
- [x] SearchPage with database search
- [x] CartPage
- [x] AccountPage
- [x] WishlistPage
- [x] BlogPage and BlogPostPage
- [x] AboutPage, ContactPage, FAQPage
- [x] VideosPage, ReviewsPage
- [x] ShippingPage, PrivacyPage, TermsPage

## Phase 6: Polish
- [ ] Connect Elavon payment credentials
- [ ] Connect QuickBooks credentials
- [ ] Final testing and QA

## Bug Fixes
- [x] Fix broken product images (missing/invalid URLs showing alt text)
- [x] Fix $0.00 price products showing in "You may also like" and product grids
- [x] Ensure image fallback works properly for all product cards

## Variation & Price Data Fix
- [x] Investigate why some products have $0.00 prices (WooCommerce variable product structure)
- [x] Extract correct prices from WooCommerce variation data in original XML
- [x] Ensure ALL product variations (blade finishes, scabbard options, colors) are imported from XML
- [x] Match variation selectors to original darkswordarmory.com behavior exactly
- [x] Re-seed database with corrected prices and complete variation data
- [x] Update frontend variation UI to show all options as on original site

## Data Quality Fixes
- [x] Fix 36 products with description text incorrectly stored in weight field
- [x] Fix 18 products with HTML entities (&amp;nbsp;) in weight field
- [x] Fix short description rendering raw HTML instead of rendered content
- [x] Fix category sidebar showing (0) counts - now shows actual product counts
- [x] Fix 8 zero-price variable products by extracting prices from WooCommerce variations
- [x] Update cart logic to use absolute variation prices instead of price modifiers

## Product Reveal Behavior Fix
- [x] Investigate how products are revealed on the original darkswordarmory.com
- [x] Document the exact reveal/display behavior (hover effects, image transitions, animations)
- [x] Replicate the original product reveal behavior on the clone site
- [x] Test and verify the reveal matches the original site

## Product Card Rewrite (matching original site)
- [x] Rewrite ProductCard component to match original Flatsome WooCommerce layout
- [x] Product info displayed below image (not overlaid)
- [x] Image hover swap: second gallery image fades in on hover
- [x] Image zoom effect (scale-110) on hover
- [x] "SELECT OPTIONS" button for variable products
- [x] "ADD TO CART" button for simple products
- [x] "READ MORE" button for out-of-stock products
- [x] Price range display for variable products (e.g., USD$605.00 – USD$735.00)
- [x] Sale badge and strikethrough pricing for discounted items
- [x] "OUT OF STOCK" badge for unavailable products
- [x] Category label above product name
- [x] Updated ProductCarousel to use new ProductCard component
- [x] Updated CategoryShowcase to use real product images from database
- [x] Added enrichWithVariationInfo helper for getFeaturedProducts and getRelatedProducts
- [x] Added 4 new tests for product card data enrichment (24 total tests passing)

## Category Page Fixes
- [x] Fix "Samurai Swords" category showing "Category Not Found" (slug mismatch)
- [x] Fix "Medieval Daggers" showing 0 products despite 24 products existing
- [x] Audit all nav category links against database slugs
- [x] Fix all empty category pages to show correct products

## Product Attributes (Grip, Scabbard, Blade Finish, Guard & Pommel Finish)
- [x] Extract all WooCommerce product attributes from original XML (pa_grip, pa_scabbard, pa_blade-finish, pa_guard-pommel-finish)
- [x] Create productAttributes database table for attribute types and values
- [x] Seed all attribute data per product from XML
- [x] Build color swatch UI for Grip and Scabbard attributes (matching original site)
- [x] Build dropdown selectors for Blade Finish and Guard & Pommel Finish
- [x] Display attributes on product page matching original site layout exactly

## Product Reveal Regression Fix
- [x] Investigate why product card hover reveal (image swap, zoom) stopped working
- [x] Fix the hover reveal effect to match the previously working behavior

## PostgreSQL (Neon) Database Conversion
- [x] Convert schema.ts from MySQL to PostgreSQL dialect (mysqlTable→pgTable, pgEnum, serial, integer, jsonb, ilike)
- [x] Update drizzle.config.ts from mysql to postgresql dialect
- [x] Update server/db.ts: replace mysql2 driver with drizzle-orm/node-postgres, fix onDuplicateKeyUpdate→onConflictDoUpdate, fix insertId→returning()
- [x] Update seed-db.mjs from mysql2 to pg driver with PostgreSQL parameterized queries
- [x] Install pg + @types/pg dependencies, remove mysql2
- [x] Remove old MySQL migration files and regenerate for PostgreSQL
- [x] Verified schema generates correctly (12 tables, 0 errors) and migrations apply to local PostgreSQL
- [ ] Next agent: Test seed script with real Neon database and verify data integrity
- [ ] Next agent: Run all 24 tests against PostgreSQL and fix any failures
- [ ] Next agent: Test application end-to-end in browser with Neon

## Deliverable Package
- [ ] Write comprehensive agent replication guide with Neon testing instructions
- [ ] Write conversation summary
- [ ] Package zip with source code, docs, XML data, and conversation transcript

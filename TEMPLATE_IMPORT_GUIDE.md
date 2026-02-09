# Website Template Import Guide

## Overview

You can now import websites from URLs and use them as templates for users to choose from when creating new websites.

## How It Works

1. **Import Templates**: Provide URLs for SERVICE and PRODUCT templates
2. **System Scrapes**: Extracts structure, styles, components, images, etc.
3. **Saves as Templates**: Stores in database for users to select
4. **Users Choose**: When creating a website, users can pick from available templates
5. **Customization**: User's business info replaces template placeholders

## Quick Start

### Option 1: Using the Script (Easiest)

```bash
cd /Users/cyclerun/Desktop/nexrel-crm
npx tsx scripts/import-website-templates.ts <service_url> <product_url>
```

**Example:**
```bash
npx tsx scripts/import-website-templates.ts https://example-service.com https://example-product.com
```

This will:
- ✅ Scrape both websites
- ✅ Create SERVICE template from first URL
- ✅ Create PRODUCT template from second URL
- ✅ Set both as default templates

### Option 2: Using the API Endpoint

```bash
# Import Service Template
curl -X POST http://localhost:3000/api/admin/website-templates/import \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example-service.com",
    "type": "SERVICE",
    "name": "Service Template",
    "description": "Professional service website template",
    "category": "Business"
  }'

# Import Product Template
curl -X POST http://localhost:3000/api/admin/website-templates/import \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example-product.com",
    "type": "PRODUCT",
    "name": "Product Template",
    "description": "E-commerce product website template",
    "category": "E-commerce"
  }'
```

## What Gets Extracted

When importing a template, the system extracts:

- ✅ **Structure**: Pages, sections, components
- ✅ **Styles**: Colors, fonts, layouts
- ✅ **Content**: Text, headings, descriptions
- ✅ **Images**: Logos, hero images, gallery
- ✅ **Forms**: Contact forms, signup forms
- ✅ **Navigation**: Menu structure
- ✅ **Footer**: Footer content and links
- ✅ **SEO**: Meta tags, descriptions

## Template Customization

When users create a website from a template:

1. **Business Name** replaces `{{businessName}}`
2. **Business Description** replaces `{{businessDescription}}`
3. **Contact Info** replaces `{{contactEmail}}` and `{{contactPhone}}`
4. **Services/Products** populate feature lists
5. **Brand Colors** customize the color scheme

## Managing Templates

### View All Templates

```bash
curl http://localhost:3000/api/admin/website-templates
```

### View Templates by Type

```bash
curl http://localhost:3000/api/admin/website-templates?type=SERVICE
curl http://localhost:3000/api/admin/website-templates?type=PRODUCT
```

### Set Default Template

```bash
curl -X POST http://localhost:3000/api/admin/website-templates \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_default",
    "templateId": "template_id_here"
  }'
```

## User Experience

When users create a new website:

1. They choose "Build New Website"
2. Select SERVICE or PRODUCT type
3. **See available templates** with previews
4. Select a template (default is auto-selected)
5. Fill in business information
6. System builds website using selected template + their data

## Files Created

- ✅ `lib/website-builder/template-importer.ts` - Template import service
- ✅ `app/api/admin/website-templates/import/route.ts` - Import API
- ✅ `app/api/admin/website-templates/route.ts` - Template management API
- ✅ `scripts/import-website-templates.ts` - Import script
- ✅ Updated `lib/website-builder/builder.ts` - Uses templates
- ✅ Updated `app/dashboard/websites/new/page.tsx` - Template selector UI

## Next Steps

1. **Provide URLs**: Give me the two URLs (SERVICE and PRODUCT)
2. **Run Import**: I'll import them as templates
3. **Test**: Create a test website to verify templates work
4. **Customize**: Templates will be customized with user's business info

---

**Ready to import templates?** Just provide the two URLs!

# Real Estate Workflow Integrations

## ✅ Integrated Features

The Real Estate Workflow Automation system now integrates with the following Real Estate Hub features:

### 1. **CMA Generation** (`cma_generation`)
- **Function**: `generateCMA()` in `workflow-task-executor.ts`
- **Library**: Uses `lib/real-estate/cma.ts` directly
- **What it does**: 
  - Generates Comparative Market Analysis reports
  - Creates `RECMAReport` records in database
  - Calculates suggested pricing based on comparables
  - Stores report ID in workflow instance metadata
- **Required Data**: Property address (from lead or task config)
- **Optional Data**: beds, baths, sqft, yearBuilt, city, state, zip

### 2. **Presentation Generation** (`presentation_generation`)
- **Function**: `generatePresentation()` in `workflow-task-executor.ts`
- **Model**: Creates `REListingPresentation` records
- **What it does**:
  - Creates presentation draft records
  - Links to workflow instance
  - Stores property and agent data
  - Can be completed in Real Estate Hub UI
- **Required Data**: Property address and city
- **Optional Data**: All property details, agent info, presentation type

### 3. **Market Research** (`market_research`)
- **Function**: `generateMarketResearch()` in `workflow-task-executor.ts`
- **API**: Calls `/api/real-estate/attraction/buyer-report` or `/seller-report`
- **What it does**:
  - Generates buyer or seller market opportunity reports
  - Creates AI-powered market insights
  - Stores report ID in workflow instance metadata
- **Required Data**: Region/location
- **Optional Data**: Price range, property type, buyer/seller profile, features

## 🎯 How to Use

### In Workflow Builder:

1. **Select a Task** in the circular workflow canvas
2. **Open Task Editor Panel** (right sidebar)
3. **Scroll to "Task Actions" section**
4. **Select Actions** you want this task to execute:
   - ✅ Generate CMA
   - ✅ Generate Presentation  
   - ✅ Market Research
   - Plus: Voice Call, SMS, Email, Calendar, Task, Document

### Action Configuration:

Each action can be configured with:
- **CMA**: Property address, beds, baths, sqft, yearBuilt
- **Presentation**: Property details, agent info, presentation type
- **Market Research**: Region, report type (buyer/seller), filters

### Data Sources:

The workflow executor automatically pulls data from:
1. **Task actionConfig** (if specified)
2. **Lead record** (address, city, state, phone, email)
3. **Deal record** (if linked)
4. **User profile** (for agent info)

## 📋 Example Workflow Tasks

### Seller Pipeline - "Prepare CMA"
- **Task Type**: `CMA_GENERATION`
- **Actions**: `['cma_generation']`
- **Agent**: Mark (Property Valuation Expert)
- **Delay**: 0 minutes
- **HITL**: Optional (for review before sending)

### Buyer Pipeline - "Generate Market Report"
- **Task Type**: `CUSTOM`
- **Actions**: `['market_research']`
- **Agent**: Michael (Market Analysis Expert)
- **Delay**: 1 day after lead qualification
- **Config**: `{ reportType: 'buyer', region: '{lead.city}' }`

### Listing Prep - "Create Presentation"
- **Task Type**: `LISTING_PREP`
- **Actions**: `['presentation_generation']`
- **Agent**: Chris (Listing Marketing Manager)
- **Delay**: 2 hours after photo scheduling
- **Config**: `{ presentationType: 'listing' }`

## 🔗 Integration Points

### Database Models Used:
- `RECMAReport` - Stores CMA reports
- `REListingPresentation` - Stores presentation drafts
- `REMarketReport` - Stores market research reports (via API)
- `REWorkflowInstance.metadata` - Stores generated report IDs

### API Endpoints Called:
- `/api/real-estate/cma` (internal library function)
- `/api/real-estate/presentation/generate` (creates draft record)
- `/api/real-estate/attraction/buyer-report` (market research)
- `/api/real-estate/attraction/seller-report` (market research)

## ⚙️ Configuration

Actions are stored in `REWorkflowTask.actionConfig` as JSON:
```json
{
  "actions": ["cma_generation", "email"],
  "address": "123 Main St",
  "beds": 3,
  "baths": 2,
  "sqft": 1500,
  "reportType": "buyer",
  "presentationType": "listing"
}
```

## 🚀 Next Steps

1. **Test workflows** with these new actions
2. **Configure action parameters** in task editor
3. **Link generated reports** to leads/deals
4. **Add email/SMS actions** to send reports to clients

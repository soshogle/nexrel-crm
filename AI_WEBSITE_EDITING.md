# AI-Powered Conversational Website Editing

## Overview

The website builder now includes full AI-powered conversational editing capabilities using OpenAI GPT-4o. Users can modify their websites through natural language commands, including:

- **Color Changes**: "Change background to white", "Make header blue"
- **Text Modifications**: "Change button text to 'Get Started'", "Update heading to 'Welcome'"
- **Button Customization**: "Change button color to red", "Make button link to /contact"
- **Image Swapping**: "Swap the image of the girl in red top", "Replace that picture"
- **Component Management**: "Add a contact form", "Remove the hero section"

## Architecture

### Core Components

1. **`lib/website-builder/ai-modification-service.ts`**
   - Main service for AI interpretation
   - Uses OpenAI GPT-4o to analyze user requests
   - Generates structured change operations
   - Handles image swapping workflow

2. **`app/api/website-builder/modify/route.ts`**
   - API endpoint for processing chat messages
   - Handles image uploads for swapping
   - Creates approval requests

3. **`app/api/website-builder/upload-image-swap/route.ts`**
   - Dedicated endpoint for image uploads
   - Stores images in cloud storage (Vercel Blob/S3/R2)
   - Returns new image URL for replacement

4. **`app/dashboard/websites/[id]/page.tsx`**
   - Frontend chat interface
   - Image upload UI when AI requests replacement
   - Displays AI explanations and change previews

## How It Works

### 1. User Sends Chat Message

User types a natural language request:
```
"Change background to white"
```

### 2. AI Interpretation

The system sends the message to OpenAI GPT-4o with:
- Current website structure (JSON)
- Available images list
- System prompt with operation examples

OpenAI returns structured JSON:
```json
{
  "changes": [{
    "type": "update",
    "path": "globalStyles.colors.background",
    "data": "#FFFFFF",
    "description": "Change background color to white"
  }],
  "explanation": "Changed the website background color to white"
}
```

### 3. Image Swapping Flow

When user requests image swap:
```
"Swap the image of the girl in red top"
```

1. AI identifies the image and returns:
```json
{
  "requiresImageUpload": {
    "description": "girl in red top",
    "currentImagePath": "pages[0].components[2].props.imageUrl",
    "currentImageUrl": "https://example.com/girl-red-top.jpg"
  }
}
```

2. Frontend shows image upload prompt
3. User uploads replacement image
4. Image is stored in cloud storage
5. Original request is resubmitted with new image URL
6. AI generates final changes with updated image path

### 4. Change Approval

All AI-generated changes go through approval workflow:
- Preview is generated showing before/after
- User reviews changes
- User approves or rejects
- Approved changes are applied to website

## Supported Operations

### Colors
- Background colors: `globalStyles.colors.background`
- Text colors: `globalStyles.colors.text`
- Primary/secondary: `globalStyles.colors.primary`
- Component-specific colors: `pages[X].components[Y].props.backgroundColor`

### Text
- Page titles: `pages[X].seo.title`
- Component text: `pages[X].components[Y].props.text`
- Headings: `pages[X].components[Y].props.heading`
- Button text: `pages[X].components[Y].props.label`

### Buttons
- Text: `pages[X].components[Y].props.label`
- Link: `pages[X].components[Y].props.href`
- Style: `pages[X].components[Y].props.variant`
- Color: `pages[X].components[Y].props.backgroundColor`

### Images
- URL: `pages[X].components[Y].props.imageUrl`
- Alt text: `pages[X].components[Y].props.alt`
- Swapping via upload workflow

### Components
- Add: New component to `pages[X].components` array
- Delete: Remove from `pages[X].components` array

## Example Commands

### Simple Changes
```
"Change background to white"
"Make header blue"
"Change button text to 'Get Started'"
"Update heading to 'Welcome'"
```

### Complex Changes
```
"Make the heading bigger and change it to blue"
"Change button color to red and link to /contact"
"Add a contact form below the hero section"
```

### Image Swapping
```
"Swap the image of the girl in red top"
"Replace that picture"
"Change the first image"
```

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=sk-...  # Required for AI interpretation
IMAGE_STORAGE_PROVIDER=vercel  # or 's3' or 'r2'
BLOB_READ_WRITE_TOKEN=...  # For Vercel Blob
ENABLE_IMAGE_DOWNLOAD=true  # Enable image downloading/storage
```

### OpenAI Model

Currently using `gpt-4o` for best accuracy. Can be changed in:
- `lib/website-builder/ai-modification-service.ts` → `generateChanges()` method

## Error Handling

### Fallback Pattern Matching

If OpenAI API fails or returns invalid JSON, the system falls back to pattern matching:
- Simple keyword detection
- Basic color/text extraction
- Generic change generation

### Image Upload Errors

- Invalid file type → Error message
- Upload failure → Retry prompt
- Storage quota exceeded → Error notification

## Future Enhancements

1. **Multi-step Conversations**
   - "Make it bigger" (referring to previous change)
   - Context-aware follow-ups

2. **Visual Element Selection**
   - Click on element → "Change this to blue"
   - Visual editor integration

3. **Batch Operations**
   - "Change all buttons to red"
   - "Update all headings"

4. **Style Presets**
   - "Apply modern theme"
   - "Make it minimalist"

5. **Voice Commands**
   - Integration with voice AI assistant
   - "Hey AI, change background to white"

## Testing

### Manual Testing

1. Navigate to website editor
2. Go to "AI Chat" tab
3. Try various commands:
   - Color changes
   - Text modifications
   - Image swaps
   - Component additions

### API Testing

```bash
# Test modification endpoint
curl -X POST http://localhost:3000/api/website-builder/modify \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "website-id",
    "message": "Change background to white"
  }'
```

## Troubleshooting

### AI Not Understanding Request

- **Solution**: Be more specific
- **Example**: Instead of "change it", say "change background color to white"

### Image Swap Not Working

- **Check**: Image storage provider configured
- **Check**: `BLOB_READ_WRITE_TOKEN` is set
- **Check**: File is valid image format

### Changes Not Applying

- **Check**: Approval workflow completed
- **Check**: Changes were approved (not rejected)
- **Check**: Website structure is valid JSON

## Security

- All requests require authentication
- Users can only modify their own websites
- Image uploads are validated (type, size)
- Multi-tenant isolation maintained (images stored per user/website)

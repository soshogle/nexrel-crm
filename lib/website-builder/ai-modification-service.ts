/**
 * AI Website Modification Service
 * Uses OpenAI to interpret natural language and generate website changes
 */

import { chatCompletion } from '@/lib/openai-client';
import { WebsiteImageStorage } from './image-storage';

export interface ModificationRequest {
  message: string;
  websiteStructure: any;
  userId: string;
  websiteId: string;
  extractedData?: any; // Scraped images/data for reference
}

export interface ModificationChange {
  type: 'add' | 'update' | 'delete';
  path: string; // JSON path like 'pages[0].components[2].props.backgroundColor'
  data: any;
  description?: string; // Human-readable description of the change
}

export interface ModificationResult {
  changes: ModificationChange[];
  requiresImageUpload?: {
    description: string; // e.g., "girl in red top"
    currentImagePath: string;
    currentImageUrl?: string;
  };
  explanation?: string; // AI explanation of what will change
}

export class AIModificationService {
  /**
   * Generate website changes from natural language request
   */
  async generateChanges(request: ModificationRequest): Promise<ModificationResult> {
    try {
      // Build system prompt with website structure context
      const systemPrompt = this.buildSystemPrompt(request.websiteStructure, request.extractedData);
      
      // Call OpenAI to interpret the request
      const response = await chatCompletion({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: request.message,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent, structured output
        max_tokens: 2000,
      });

      const aiResponse = response.choices?.[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      // Parse AI response (should be JSON)
      let changes: ModificationChange[];
      let requiresImageUpload: ModificationResult['requiresImageUpload'];
      let explanation: string;

      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(aiResponse);
        changes = parsed.changes || [];
        requiresImageUpload = parsed.requiresImageUpload;
        explanation = parsed.explanation || '';
      } catch {
        // If not JSON, try to extract JSON from markdown code blocks
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                         aiResponse.match(/```\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          changes = parsed.changes || [];
          requiresImageUpload = parsed.requiresImageUpload;
          explanation = parsed.explanation || '';
        } else {
          // Fallback: try to extract structured data from text
          changes = this.fallbackParseChanges(aiResponse, request.websiteStructure);
          explanation = aiResponse;
        }
      }

      // Validate and enhance changes
      changes = this.validateAndEnhanceChanges(changes, request.websiteStructure);

      return {
        changes,
        requiresImageUpload,
        explanation,
      };
    } catch (error: any) {
      console.error('AI modification error:', error);
      // Fallback to pattern matching if AI fails
      return this.fallbackPatternMatching(request.message, request.websiteStructure);
    }
  }

  /**
   * Build system prompt for OpenAI
   */
  private buildSystemPrompt(structure: any, extractedData?: any): string {
    // Extract image information for reference
    const images = extractedData?.images || [];
    const imageDescriptions = images
      .slice(0, 20) // Limit to first 20 images
      .map((img: any, idx: number) => {
        const alt = img.alt || `Image ${idx + 1}`;
        const url = img.url || '';
        return `- Image ${idx + 1}: ${alt} (URL: ${url})`;
      })
      .join('\n');

    return `You are an expert website editor AI. Your job is to interpret user requests and generate precise website modifications.

WEBSITE STRUCTURE:
${JSON.stringify(structure, null, 2).substring(0, 4000)} // Limit size

${imageDescriptions ? `AVAILABLE IMAGES:\n${imageDescriptions}\n` : ''}

USER REQUEST ANALYSIS:
Analyze the user's request and determine what changes need to be made to the website structure.

AVAILABLE OPERATIONS:
1. UPDATE COLORS:
   - Background colors: "globalStyles.colors.background" or component-specific "pages[0].components[X].props.backgroundColor"
   - Text colors: "globalStyles.colors.text" or component-specific
   - Primary/secondary colors: "globalStyles.colors.primary", "globalStyles.colors.secondary"
   - Header colors: "globalStyles.colors.primary" or navigation component colors

2. UPDATE TEXT:
   - Page titles: "pages[X].seo.title"
   - Component text: "pages[X].components[Y].props.text" or "pages[X].components[Y].props.content"
   - Headings: "pages[X].components[Y].props.heading"
   - Button text: "pages[X].components[Y].props.label" or "pages[X].components[Y].props.text"

3. UPDATE BUTTONS:
   - Button text: "pages[X].components[Y].props.label"
   - Button link: "pages[X].components[Y].props.href" or "pages[X].components[Y].props.link"
   - Button style: "pages[X].components[Y].props.variant" (e.g., "primary", "secondary", "outline")
   - Button color: "pages[X].components[Y].props.backgroundColor"

4. UPDATE IMAGES:
   - Image URL: "pages[X].components[Y].props.imageUrl" or "pages[X].components[Y].props.src"
   - Image alt text: "pages[X].components[Y].props.alt"
   - If user wants to swap an image, set "requiresImageUpload" with description

5. ADD COMPONENTS:
   - Add new component to: "pages[X].components" array
   - Common component types: "HeroSection", "ContactForm", "CTASection", "TextSection", "ImageSection"

6. DELETE COMPONENTS:
   - Remove component from: "pages[X].components" array

COLOR FORMAT:
- Always use hex format: "#FFFFFF" for white, "#000000" for black
- Common colors: white="#FFFFFF", black="#000000", blue="#3B82F6", red="#EF4444", green="#10B981"

PATH FORMAT:
- Use dot notation: "pages[0].components[2].props.backgroundColor"
- Array indices start at 0
- Always specify full path from root

RESPONSE FORMAT (JSON only):
{
  "changes": [
    {
      "type": "update" | "add" | "delete",
      "path": "full.path.to.property",
      "data": "new value or object",
      "description": "Human-readable description"
    }
  ],
  "requiresImageUpload": {
    "description": "Description of image to replace (e.g., 'girl in red top')",
    "currentImagePath": "pages[0].components[2].props.imageUrl",
    "currentImageUrl": "https://example.com/image.jpg"
  } | null,
  "explanation": "Brief explanation of changes"
}

EXAMPLES:

User: "Change background to white"
Response: {
  "changes": [{
    "type": "update",
    "path": "globalStyles.colors.background",
    "data": "#FFFFFF",
    "description": "Change background color to white"
  }],
  "explanation": "Changed the website background color to white"
}

User: "Change the button text to 'Get Started'"
Response: {
  "changes": [{
    "type": "update",
    "path": "pages[0].components[1].props.label",
    "data": "Get Started",
    "description": "Update button text to 'Get Started'"
  }],
  "explanation": "Updated the button text to 'Get Started'"
}

User: "Change the picture of the girl in red top"
Response: {
  "changes": [],
  "requiresImageUpload": {
    "description": "girl in red top",
    "currentImagePath": "pages[0].components[2].props.imageUrl",
    "currentImageUrl": "https://example.com/girl-red-top.jpg"
  },
  "explanation": "Identified image to replace. Please upload a new image."
}

User: "Make the heading bigger and change it to blue"
Response: {
  "changes": [
    {
      "type": "update",
      "path": "pages[0].components[0].props.fontSize",
      "data": "3xl",
      "description": "Increase heading font size"
    },
    {
      "type": "update",
      "path": "pages[0].components[0].props.color",
      "data": "#3B82F6",
      "description": "Change heading color to blue"
    }
  ],
  "explanation": "Made the heading larger and changed color to blue"
}

CRITICAL RULES:
1. Always return valid JSON
2. Use exact paths from the structure
3. For colors, always use hex format (#RRGGBB)
4. If image swap is needed, set requiresImageUpload
5. Be precise with component indices
6. If path doesn't exist, create it (type: "add")
7. For multiple changes, include all in changes array
8. Always provide explanation

Now analyze the user's request and generate the appropriate changes.`;
  }

  /**
   * Validate and enhance changes
   */
  private validateAndEnhanceChanges(
    changes: ModificationChange[],
    structure: any
  ): ModificationChange[] {
    return changes.map(change => {
      // Ensure data is properly formatted
      if (change.type === 'update' && typeof change.data === 'string') {
        // If it's a color name, convert to hex
        if (change.path.includes('color') || change.path.includes('Color')) {
          change.data = this.convertColorToHex(change.data);
        }
      }

      // Add description if missing
      if (!change.description) {
        change.description = `${change.type} ${change.path}`;
      }

      return change;
    });
  }

  /**
   * Convert color name or value to hex
   */
  private convertColorToHex(color: string): string {
    // If already hex, return as-is
    if (color.startsWith('#')) {
      return color.toUpperCase();
    }

    // Color name mapping
    const colorMap: Record<string, string> = {
      white: '#FFFFFF',
      black: '#000000',
      blue: '#3B82F6',
      red: '#EF4444',
      green: '#10B981',
      yellow: '#F59E0B',
      purple: '#8B5CF6',
      pink: '#EC4899',
      orange: '#F97316',
      gray: '#6B7280',
      grey: '#6B7280',
      lightgray: '#E5E7EB',
      lightgrey: '#E5E7EB',
      darkgray: '#374151',
      darkgrey: '#374151',
    };

    const lowerColor = color.toLowerCase().trim();
    return colorMap[lowerColor] || color; // Return original if not found
  }

  /**
   * Fallback pattern matching (if AI fails)
   */
  private fallbackPatternMatching(
    message: string,
    structure: any
  ): ModificationResult {
    const changes: ModificationChange[] = [];
    const lowerMessage = message.toLowerCase();

    // Background color
    if (lowerMessage.includes('background') && (lowerMessage.includes('color') || lowerMessage.includes('white') || lowerMessage.includes('black'))) {
      const colorMatch = message.match(/(?:to\s+)?(white|black|blue|red|green|yellow|purple|pink|orange|gray|grey)/i);
      const color = colorMatch ? colorMatch[1] : 'white';
      
      changes.push({
        type: 'update',
        path: 'globalStyles.colors.background',
        data: this.convertColorToHex(color),
        description: `Change background color to ${color}`,
      });
    }

    // Header color
    if (lowerMessage.includes('header') && lowerMessage.includes('color')) {
      const colorMatch = message.match(/(?:color|colour)\s+(?:to\s+)?([a-z]+)/i);
      const color = colorMatch ? colorMatch[1] : 'blue';
      
      changes.push({
        type: 'update',
        path: 'globalStyles.colors.primary',
        data: this.convertColorToHex(color),
        description: `Change header color to ${color}`,
      });
    }

    // Button text
    if ((lowerMessage.includes('button') || lowerMessage.includes('btn')) && lowerMessage.includes('text')) {
      const textMatch = message.match(/text\s+(?:to\s+)?["']?([^"']+)["']?/i);
      const newText = textMatch ? textMatch[1] : 'Click Here';
      
      // Try to find first button component
      if (structure.pages?.[0]?.components) {
        const buttonIndex = structure.pages[0].components.findIndex((c: any) => 
          c.type === 'Button' || c.type === 'CTASection' || c.props?.label
        );
        
        if (buttonIndex >= 0) {
          changes.push({
            type: 'update',
            path: `pages[0].components[${buttonIndex}].props.label`,
            data: newText,
            description: `Change button text to "${newText}"`,
          });
        }
      }
    }

    // Title change
    if (lowerMessage.includes('title') && lowerMessage.includes('change')) {
      const titleMatch = message.match(/title\s+(?:to\s+)?["']?([^"']+)["']?/i);
      const newTitle = titleMatch ? titleMatch[1] : 'New Title';
      
      changes.push({
        type: 'update',
        path: 'pages[0].seo.title',
        data: newTitle,
        description: `Change title to "${newTitle}"`,
      });
    }

    // Add form
    if (lowerMessage.includes('add') && lowerMessage.includes('form')) {
      changes.push({
        type: 'add',
        path: 'pages[0].components',
        data: {
          id: `form-${Date.now()}`,
          type: 'ContactForm',
          props: {
            fields: [
              { name: 'name', type: 'text', label: 'Name', required: true },
              { name: 'email', type: 'email', label: 'Email', required: true },
              { name: 'message', type: 'textarea', label: 'Message', required: true },
            ],
          },
        },
        description: 'Add contact form',
      });
    }

    return {
      changes: changes.length > 0 ? changes : [{
        type: 'update',
        path: 'pages[0].components[0].props',
        data: { note: 'AI modification requested', originalMessage: message },
        description: 'Generic update',
      }],
      explanation: `Applied ${changes.length} change(s) based on pattern matching`,
    };
  }

  /**
   * Fallback parse changes from text (if JSON parsing fails)
   */
  private fallbackParseChanges(text: string, structure: any): ModificationChange[] {
    // Try to extract structured information from text
    const changes: ModificationChange[] = [];
    
    // Look for color mentions
    const colorMatches = text.match(/(?:color|colour)\s+(?:to\s+)?(white|black|blue|red|green|yellow|purple|pink|orange|gray|grey)/gi);
    if (colorMatches) {
      const color = colorMatches[0].split(/\s+/).pop()?.toLowerCase();
      if (color) {
        changes.push({
          type: 'update',
          path: 'globalStyles.colors.primary',
          data: this.convertColorToHex(color),
          description: `Change color to ${color}`,
        });
      }
    }

    return changes.length > 0 ? changes : [];
  }

  /**
   * Swap image after user uploads replacement
   */
  async swapImage(
    imagePath: string,
    newImageBuffer: Buffer,
    contentType: string,
    userId: string,
    websiteId: string
  ): Promise<{ url: string; path: string }> {
    const provider = (process.env.IMAGE_STORAGE_PROVIDER || 'vercel') as 'vercel' | 's3' | 'r2';
    
    // Generate unique filename
    const extension = contentType.split('/')[1] || 'jpg';
    const filename = `swap-${Date.now()}.${extension}`;
    const basePath = `website-images/${userId}/${websiteId}/swapped`;
    const originalPath = `${basePath}/${filename}`;

    // Upload directly using Vercel Blob or S3
    if (provider === 'vercel') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN is not set. Please configure Vercel Blob storage.');
      }
      
      const { put } = await import('@vercel/blob');
      const blob = await put(originalPath, newImageBuffer, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      });
      return {
        url: blob.url,
        path: blob.pathname,
      };
    } else {
      // S3 or R2
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Config: any = {
        region: process.env.AWS_REGION || 'us-east-1',
      };

      // Add credentials if provided (for S3)
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        s3Config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
      }

      // For Cloudflare R2, use endpoint
      if (provider === 'r2' && process.env.R2_ENDPOINT) {
        s3Config.endpoint = process.env.R2_ENDPOINT;
      }

      const s3Client = new S3Client(s3Config);
      const bucket = process.env.AWS_S3_BUCKET || process.env.R2_BUCKET || '';

      if (!bucket) {
        throw new Error(`Bucket name not configured for ${provider} storage`);
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: originalPath,
          Body: newImageBuffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000',
        })
      );

      // Generate URL based on provider
      let baseUrl: string;
      if (provider === 'r2' && process.env.R2_PUBLIC_URL) {
        baseUrl = process.env.R2_PUBLIC_URL;
      } else {
        baseUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
      }

      return {
        url: `${baseUrl}/${originalPath}`,
        path: originalPath,
      };
    }
  }
}

export const aiModificationService = new AIModificationService();

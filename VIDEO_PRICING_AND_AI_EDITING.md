# 💰 Video Upload Pricing & 🤖 AI Editing Capabilities

## 🎥 Video Upload Premium Pricing

### Recommended Pricing Strategy

Based on your current pricing tiers and video storage costs:

#### Option 1: Add-On Feature (Recommended) ⭐

**Pricing:** **$9-19/month per website** or **$49-99/month unlimited**

**Why this range:**
- Covers storage costs (~$0.15/GB/month)
- Covers bandwidth costs (~$0.40/GB)
- Provides profit margin
- Competitive with other platforms

**Tiered Pricing:**

| Plan | Price | What's Included |
|------|-------|-----------------|
| **Per Website** | $9/month | Up to 10 videos, 1GB storage |
| **Per Website** | $19/month | Up to 50 videos, 5GB storage |
| **Unlimited** | $49/month | Unlimited videos, 20GB storage |
| **Unlimited** | $99/month | Unlimited videos, 100GB storage |

**Alternative: Include in Existing Plans**

Add to your current pricing tiers:

**Starter ($497/month):**
- ✅ YouTube/Vimeo embeds (free)
- ❌ Direct video upload

**Professional ($997/month?):**
- ✅ YouTube/Vimeo embeds
- ✅ Direct video upload (up to 20 videos/month)

**Enterprise ($299+):**
- ✅ YouTube/Vimeo embeds
- ✅ Unlimited direct video upload
- ✅ Professional hosting (Mux/Cloudflare Stream)

---

## 🤖 AI Conversational Editing - Current Status

### ✅ **YES, It Exists But Needs Enhancement**

### Current Implementation:

**What Works:**
- ✅ Chat interface in website editor (`/dashboard/websites/[id]`)
- ✅ Basic pattern matching for simple commands
- ✅ Approval workflow (changes require approval)
- ✅ Preview before applying

**What's Currently Supported (Basic):**

1. **Change Header Color:**
   ```
   "Change header color to blue"
   → Updates globalStyles.colors.primary
   ```

2. **Add Contact Form:**
   ```
   "Add a contact form"
   → Adds ContactForm component
   ```

3. **Change Title:**
   ```
   "Change title to 'My New Website'"
   → Updates page SEO title
   ```

**What's NOT Fully Implemented:**

- ❌ **Full AI interpretation** (currently uses pattern matching)
- ❌ **Image swapping** ("change the first picture of the girl in red top")
- ❌ **Background color changes** ("change background to white")
- ❌ **Complex edits** (multiple changes in one command)
- ❌ **Visual understanding** (identifying specific images/components)

### Current Code Status:

**File:** `app/api/website-builder/modify/route.ts`

```typescript
// TODO: Use AI to interpret the message and generate changes
// For now, create a placeholder change structure
const changes = await generateChangesFromMessage(message, website.structure as any);
```

**Current Implementation:**
- Uses simple pattern matching (string includes checks)
- Not using OpenAI/Claude for interpretation
- Limited to basic commands

---

## 🚀 What Needs to Be Enhanced

### To Support Full Conversational Editing:

#### 1. **Integrate OpenAI/Claude for Interpretation**

**Current:** Pattern matching
```typescript
if (lowerMessage.includes('header') && lowerMessage.includes('color')) {
  // Simple pattern match
}
```

**Needed:** AI-powered interpretation
```typescript
const aiResponse = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{
    role: 'system',
    content: 'You are a website editor. Interpret user requests and generate JSON changes...'
  }, {
    role: 'user',
    content: message
  }]
});
```

#### 2. **Add Image Identification & Swapping**

**Needed Features:**
- Identify images by description ("girl in red top")
- Find image in website structure
- Allow user to upload replacement
- Swap images automatically

**Implementation:**
```typescript
// User: "Change the first picture of the girl in red top"
// AI identifies: pages[0].components[2].props.imageUrl
// User uploads new image
// System replaces imageUrl with new stored image
```

#### 3. **Add Background Color Changes**

**Current:** Only header color
**Needed:** Background, sections, components

```typescript
// "Change background to white"
// → Updates: globalStyles.colors.background = '#FFFFFF'
// → Or: pages[0].components[0].props.backgroundColor = '#FFFFFF'
```

#### 4. **Visual Component Understanding**

**Needed:**
- AI understands website structure
- Can identify components by visual description
- Can make targeted changes

---

## 💡 Recommended Implementation Plan

### Phase 1: Enhance AI Interpretation (High Priority)

**Add OpenAI integration:**
```typescript
async function generateChangesFromMessage(
  message: string,
  currentStructure: any
): Promise<any[]> {
  // Use OpenAI to interpret the message
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: `You are a website editor. Analyze the user's request and the current website structure. 
      Generate JSON changes that modify the website. Available operations:
      - Update colors (background, header, text, etc.)
      - Update text content
      - Add/remove components
      - Update images
      - Modify layout
      
      Current structure: ${JSON.stringify(currentStructure)}
      User request: ${message}
      
      Return JSON array of changes.`
    }]
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Phase 2: Add Image Swapping (Medium Priority)

**Create image swap component:**
1. User says: "Change the picture of the girl in red top"
2. AI identifies image in structure
3. Show image preview
4. User uploads replacement
5. System stores new image
6. Updates structure with new image URL

### Phase 3: Enhanced Visual Editing (Lower Priority)

- Visual component selection
- Drag-and-drop editing
- Real-time preview

---

## 💰 Pricing Recommendations

### Video Upload Pricing:

**Option A: Add-On (Recommended)**
- **$9/month** - Per website, up to 10 videos
- **$19/month** - Per website, up to 50 videos
- **$49/month** - Unlimited videos, 20GB storage
- **$99/month** - Unlimited videos, 100GB storage

**Option B: Include in Plans**
- **Starter ($497):** YouTube/Vimeo only
- **Professional ($997):** + Direct upload (20 videos/month)
- **Enterprise ($299+):** + Unlimited upload + Professional hosting

**Recommendation:** **Option A** - Keep as add-on so users only pay if they need it.

---

## 🤖 AI Editing Pricing

### Current Status:
- ✅ Basic AI editing included (pattern matching)
- ⚠️ Full AI editing needs enhancement

### Recommended Pricing:

**Basic AI Editing:** Included in all plans
- Simple commands (change color, add form)
- Pattern matching

**Advanced AI Editing:** Premium feature
- Full OpenAI-powered interpretation
- Image swapping
- Complex multi-step edits
- Visual understanding

**Pricing:**
- **Add-on:** $29/month for advanced AI editing
- **Or include in Professional+ plans**

---

## 📊 Feature Comparison

| Feature | Current | Enhanced |
|---------|---------|----------|
| **Change Colors** | ✅ Basic | ✅ Full (all colors) |
| **Add Components** | ✅ Forms only | ✅ All components |
| **Change Text** | ✅ Titles only | ✅ All text |
| **Image Swapping** | ❌ No | ⚠️ Needs implementation |
| **Background Colors** | ❌ No | ⚠️ Needs implementation |
| **Visual Understanding** | ❌ No | ⚠️ Needs implementation |
| **Complex Edits** | ❌ No | ⚠️ Needs AI integration |

---

## 🎯 Summary

### Video Upload Pricing:
**Recommended:** **$9-19/month per website** or **$49-99/month unlimited**

### AI Editing Status:
**Current:** ✅ Basic conversational editing exists
- Simple commands work (change color, add form)
- Uses pattern matching (not full AI)

**Needs Enhancement:**
- ❌ Full AI interpretation (OpenAI integration)
- ❌ Image swapping ("change picture of girl in red top")
- ❌ Background color changes ("change background to white")
- ❌ Visual component understanding

**To Enable Full AI Editing:**
1. Integrate OpenAI GPT-4 for interpretation
2. Add image identification and swapping
3. Enhance change generation to handle complex requests
4. Add visual understanding capabilities

---

## 🚀 Next Steps

1. **Enhance AI editing** with OpenAI integration
2. **Add image swapping** functionality
3. **Set video upload pricing** ($9-19/month recommended)
4. **Test conversational editing** with real user requests

Want me to implement the enhanced AI editing with OpenAI integration?

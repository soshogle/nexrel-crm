# Update Docpen Agents - Quick Instructions

## Method 1: Browser Console (Easiest - Recommended)

1. **Open your CRM** in the browser: https://www.nexrel.soshogle.com
2. **Open Browser Console** (F12 or Cmd+Option+I on Mac)
3. **Go to Console tab**
4. **Paste and run this:**

```javascript
fetch('/api/docpen/agents/update-functions', { 
  method: 'POST',
  credentials: 'include'
})
  .then(r => r.json())
  .then(result => {
    console.log('✅ Update Result:', result);
    if (result.success) {
      console.log(`✅ Updated ${result.updated} of ${result.total} agents`);
      if (result.errors && result.errors.length > 0) {
        console.warn('⚠️ Some errors:', result.errors);
      }
    } else {
      console.error('❌ Update failed:', result.error);
    }
  })
  .catch(err => console.error('❌ Error:', err));
```

5. **Check the console output** - you should see how many agents were updated

## Method 2: Direct API Call (If you have API access)

```bash
curl -X POST https://www.nexrel.soshogle.com/api/docpen/agents/update-functions \
  -H "Cookie: your-session-cookie"
```

## What This Does

- Updates all your existing Docpen agents
- Sets correct function server URLs (`/api/docpen/voice-agent/functions`)
- Ensures agents can call your API endpoints properly
- Fixes agents created before the OpenAI migration

## Expected Result

You should see:
```json
{
  "success": true,
  "message": "Updated X of Y agents",
  "updated": 3,
  "failed": 0,
  "total": 3
}
```

## After Updating

1. **Hard refresh your browser** (Cmd+Shift+R)
2. **Test Docpen again** - it should work now!

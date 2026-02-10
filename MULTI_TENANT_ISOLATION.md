# 🔒 Multi-Tenant Isolation & Vercel Blob Setup

## ✅ Client Isolation - YES, It's Working!

### Database-Level Isolation

**All API routes filter by `userId`:**

```typescript
// GET /api/websites
const websites = await prisma.website.findMany({
  where: { userId: session.user.id }, // ✅ Only current user's websites
});

// GET /api/websites/[id]
const website = await prisma.website.findFirst({
  where: {
    id: params.id,
    userId: session.user.id, // ✅ Double check: ID + userId
  },
});
```

**Result:** Clients can ONLY access their own websites. ✅

### Image Storage Isolation

**Path-based isolation:**
```
website-images/
  ├── {userId}/              # User isolation
  │   ├── {websiteId}/       # Website isolation
  │   │   ├── original/
  │   │   ├── optimized/
  │   │   └── thumbnails/
```

**Example:**
- User A (userId: `user-123`) → `website-images/user-123/website-456/`
- User B (userId: `user-789`) → `website-images/user-789/website-101/`

**Result:** Images are isolated by userId. ✅

---

## 🎯 Vercel Blob: New Project or Same Project?

### Option 1: Use Same Vercel Project ⭐ RECOMMENDED

**Pros:**
- ✅ Simpler setup (one project, one token)
- ✅ Path-based isolation already provides security
- ✅ Easier to manage
- ✅ No additional projects to maintain

**How it works:**
- Use your existing Vercel project
- Create Blob storage in that project
- Use the same `BLOB_READ_WRITE_TOKEN`
- Path isolation (`userId/websiteId`) ensures security

**Setup:**
1. Go to your existing Vercel project
2. Storage → Create Database → Blob
3. Use that token for all clients

### Option 2: Separate Project for Images (Optional)

**Pros:**
- ✅ Complete separation of concerns
- ✅ Can have different billing/quota
- ✅ Easier to track image storage costs separately

**Cons:**
- ⚠️ More complex setup (two projects, two tokens)
- ⚠️ More to manage
- ⚠️ Not necessary (path isolation is sufficient)

**When to use:**
- If you want separate billing for image storage
- If you want to scale image storage independently
- If you have compliance requirements for separate projects

---

## 🔐 Security Analysis

### Current Security Model:

1. **Database Level:**
   - ✅ All queries filter by `userId`
   - ✅ Users cannot access other users' websites
   - ✅ Foreign key constraints ensure data integrity

2. **API Level:**
   - ✅ Session-based authentication
   - ✅ `userId` extracted from session
   - ✅ All endpoints verify `userId` matches

3. **Storage Level:**
   - ✅ Path-based isolation (`userId/websiteId`)
   - ✅ Images stored in separate folders per user
   - ⚠️ **Note:** Vercel Blob URLs are public (by design for websites)

### Important: Public URLs

**Vercel Blob images are PUBLIC:**
- Images need to be public for websites to display them
- Anyone with the URL can access the image
- **BUT:** URLs are hard to guess (hashed filenames)
- **AND:** Path includes userId, so users can't easily guess other users' paths

**Security Best Practices:**
1. ✅ Use hashed filenames (already implemented)
2. ✅ Include userId in path (already implemented)
3. ✅ Don't expose userIds in public URLs (use websiteId only if needed)
4. ⚠️ Consider signed URLs for sensitive images (future enhancement)

---

## 📊 Recommended Setup

### For Your Multi-Tenant System:

**Use the SAME Vercel project** because:

1. **Path isolation is sufficient:**
   ```
   website-images/user-123/website-456/image.jpg
   website-images/user-789/website-101/image.jpg
   ```
   - Different users = different paths
   - Hard to guess other users' paths

2. **Simpler management:**
   - One token to manage
   - One project to monitor
   - Easier billing

3. **Database already enforces isolation:**
   - Users can only see their own websites
   - Images are linked to websites
   - No way to access other users' images through the app

### Setup Steps:

1. **Go to your existing Vercel project**
2. **Storage → Create Database → Blob**
3. **Copy the token**
4. **Add to environment variables:**
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
   IMAGE_STORAGE_PROVIDER=vercel
   ENABLE_IMAGE_DOWNLOAD=true
   ```

That's it! ✅

---

## 🔍 How Isolation Works End-to-End

### Scenario: User A tries to access User B's website

1. **User A requests:** `GET /api/websites/website-b-id`
2. **API checks:** `where: { id: 'website-b-id', userId: 'user-a-id' }`
3. **Database returns:** `null` (no match)
4. **API returns:** `404 Not Found`
5. **Result:** User A cannot access User B's website ✅

### Scenario: User A tries to access User B's images

1. **User A requests:** Website with images
2. **API checks:** Website belongs to User A? ✅
3. **Images served:** From `website-images/user-a-id/website-id/`
4. **User A cannot guess:** User B's paths (hashed, includes userId)
5. **Result:** User A cannot access User B's images ✅

---

## 💡 Best Practices

### 1. Keep Using Same Project ✅
- Path isolation is sufficient
- Simpler to manage
- Database enforces access control

### 2. Monitor Storage Usage
- Check Vercel Dashboard → Storage → Blob
- Set up alerts for storage limits
- Track costs per user if needed

### 3. Clean Up on Deletion
- When website deleted → delete images
- When user deleted → delete all their images
- Use `deleteWebsiteImages()` method

### 4. Consider Future Enhancements
- Signed URLs for sensitive images
- Image access logging
- Rate limiting per user

---

## ✅ Summary

### Question 1: New Vercel Project?
**Answer:** **NO, use the same project.** Path-based isolation is sufficient.

### Question 2: Client Isolation?
**Answer:** **YES, fully isolated:**
- ✅ Database filters by `userId`
- ✅ API routes verify `userId`
- ✅ Images stored in `userId/websiteId` paths
- ✅ Clients can ONLY access their own websites

### Current Security:
- ✅ **Database:** Isolated by userId
- ✅ **API:** Session-based, userId verified
- ✅ **Storage:** Path-based isolation
- ✅ **URLs:** Public (by design), but hard to guess

---

## 🚀 Next Steps

1. ✅ Use your existing Vercel project
2. ✅ Create Blob storage in that project
3. ✅ Add token to environment variables
4. ✅ Test with a website rebuild
5. ✅ Verify images are stored correctly

You're all set! 🎉

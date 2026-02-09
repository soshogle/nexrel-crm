# Automated Workflow Guide - No Local Builds, Easy Previews

## ✅ What's Automated

### 1. Prevent Local Builds (Automated)
**Status:** ✅ Installed

**What it does:**
- `npm run build` now warns you and asks for confirmation
- Prevents accidental local builds that use ~4.2GB
- Redirects you to better alternatives

**How it works:**
- Modified `package.json` to use prevention script
- If you really need to build locally, use `npm run build:force`

---

### 2. Easy Preview Deployments (Automated)
**Status:** ✅ Installed

**What it does:**
- One command creates feature branch and pushes for preview
- Automatically handles commits and branch creation
- Gets you a Vercel preview URL instantly

**Commands created:**
- `./scripts/preview.sh` - Create preview deployment
- `./scripts/merge.sh` - Merge preview to production

---

## 🚀 New Workflow (Automated)

### Daily Development

```bash
# 1. Develop locally (no build needed)
npm run dev

# 2. Create preview deployment (one command)
./scripts/preview.sh my-feature-name

# 3. Check Vercel Dashboard for preview URL
# 4. Test preview
# 5. Merge to production (one command)
./scripts/merge.sh feature/my-feature-name
```

---

## 📋 Commands Reference

### Create Preview Deployment

**Simple (auto-generates branch name):**
```bash
./scripts/preview.sh
```

**With custom branch name:**
```bash
./scripts/preview.sh my-changes
# Creates: feature/my-changes
```

**What it does:**
- ✅ Creates feature branch
- ✅ Commits uncommitted changes (if any)
- ✅ Pushes to GitHub
- ✅ Vercel automatically creates preview

---

### Merge Preview to Production

**After testing preview:**
```bash
./scripts/merge.sh feature/my-changes
```

**What it does:**
- ✅ Switches to master branch
- ✅ Merges feature branch
- ✅ Pushes to production
- ✅ Vercel automatically deploys

---

### Prevent Local Builds

**If you try to build locally:**
```bash
npm run build
# ⚠️  WARNING: Building locally uses ~4.2GB disk space!
# 💡 Instead, use:
#   1. Test locally: npm run dev
#   2. Deploy to preview: git push origin feature/your-branch
#   3. Deploy to production: git push origin master
# Do you really want to build locally? (yes/no)
```

**If you really need to build locally:**
```bash
npm run build:force  # Bypasses the warning
# Remember to run ./cleanup.sh after!
```

---

## 🎯 Complete Automated Workflow

### Step 1: Develop Locally
```bash
npm run dev  # Test in browser
```

### Step 2: Create Preview (One Command)
```bash
./scripts/preview.sh my-feature
```

**Output:**
```
🚀 Creating preview deployment...
📝 Creating feature branch: feature/my-feature
📤 Pushing to GitHub...
✅ Preview deployment created!
🔗 Check Vercel Dashboard for preview URL
```

### Step 3: Test Preview
- Go to Vercel Dashboard
- Find preview deployment
- Test the preview URL

### Step 4: Merge to Production (One Command)
```bash
./scripts/merge.sh feature/my-feature
```

**Output:**
```
🔄 Merging preview branch to production...
📥 Merging feature/my-feature into master...
🚀 Deploying to production...
✅ Deployed to production!
```

---

## 📊 Before vs After

### Before (Manual)
```bash
# Create branch
git checkout -b feature/my-changes

# Commit changes
git add .
git commit -m "My changes"

# Push
git push -u origin feature/my-changes

# Check Vercel for preview
# Test preview
# Switch to master
git checkout master

# Merge
git merge feature/my-changes

# Push to production
git push origin master
```

### After (Automated)
```bash
# Create preview (one command)
./scripts/preview.sh my-changes

# Test preview in Vercel Dashboard

# Merge to production (one command)
./scripts/merge.sh feature/my-changes
```

**Much simpler!** 🎉

---

## 🛡️ Safety Features

### Build Prevention
- ✅ Warns before building locally
- ✅ Suggests better alternatives
- ✅ Can be bypassed if really needed (`npm run build:force`)

### Preview Workflow
- ✅ Automatically creates feature branches
- ✅ Handles uncommitted changes
- ✅ Prevents accidental production deploys
- ✅ Easy to test before merging

---

## 🔧 Advanced Usage

### Custom Branch Names
```bash
# Auto-generated: feature/preview-20260208-151234
./scripts/preview.sh

# Custom: feature/my-awesome-feature
./scripts/preview.sh my-awesome-feature
```

### With Uncommitted Changes
```bash
# Script automatically stages and commits
./scripts/preview.sh my-changes
# Prompts for commit message if needed
```

### Merge with Branch Cleanup
```bash
# After merging, delete feature branch
./scripts/merge.sh feature/my-changes
git branch -d feature/my-changes
git push origin --delete feature/my-changes
```

---

## ✅ Summary

**Automated:**
- ✅ Local build prevention (warns before building)
- ✅ Preview deployment creation (one command)
- ✅ Production merge (one command)
- ✅ Weekly cleanup (already set up)

**Your workflow:**
1. Develop: `npm run dev`
2. Preview: `./scripts/preview.sh my-feature`
3. Test: Check Vercel preview
4. Deploy: `./scripts/merge.sh feature/my-feature`

**No more:**
- ❌ Accidental local builds
- ❌ Manual branch creation
- ❌ Manual merge process
- ❌ Disk space worries

**Everything is automated!** 🎉

# Script Documentation - What Each Script Does

## 📋 Overview

This document explains exactly what each script does, step-by-step, so you can review before running.

---

## 1. `scripts/prevent-local-build.sh`

**Purpose:** Prevents accidental local builds that use ~4.2GB disk space

**What it does:**

1. **Displays a warning message:**
   - Shows: "⚠️ WARNING: Building locally uses ~4.2GB disk space!"
   - Suggests alternatives:
     - Test locally: `npm run dev`
     - Deploy to preview: `git push origin feature/your-branch`
     - Deploy to production: `git push origin master` (Vercel builds automatically)

2. **Asks for confirmation:**
   - Prompts: "Do you really want to build locally? (yes/no)"
   - Waits for your input

3. **If you type "yes":**
   - Proceeds with the build
   - Runs: `npm run build` (the actual build command)
   - Reminds you to run `./cleanup.sh` after

4. **If you type anything else (or "no"):**
   - Cancels the build
   - Shows: "✅ Build cancelled. Use 'npm run dev' for local testing instead."
   - Exits without building

**Safety:** ✅ Safe - Only warns and asks for confirmation. Doesn't delete anything.

---

## 2. `scripts/create-preview-deployment.sh`

**Purpose:** Automatically creates a feature branch and pushes it for preview deployment

**What it does:**

1. **Determines branch name:**
   - If you provide a name: Creates `feature/your-name`
   - If no name provided: Auto-generates `feature/preview-YYYYMMDD-HHMMSS`

2. **Checks current branch:**
   - If you're on `master` or `main`:
     - Creates a new feature branch
     - Switches to that branch
   - If you're already on a feature branch:
     - Uses that branch name
     - Doesn't create a new branch

3. **Handles uncommitted changes:**
   - Checks if you have uncommitted changes
   - If yes:
     - Stages all changes (`git add .`)
     - Asks for commit message (or uses default)
     - Commits the changes
   - If no:
     - Skips this step

4. **Pushes to GitHub:**
   - Pushes the branch to GitHub (`git push -u origin branch-name`)
   - Sets up tracking between local and remote branch

5. **Shows next steps:**
   - Tells you to check Vercel Dashboard for preview URL
   - Suggests how to merge when ready

**Safety:** ✅ Safe - Only creates branches and commits. Doesn't delete anything or force push.

**What it modifies:**
- Creates a new Git branch (if on master)
- Commits uncommitted changes (if any)
- Pushes to GitHub

---

## 3. `scripts/merge-preview.sh`

**Purpose:** Merges a preview branch to master and deploys to production

**What it does:**

1. **Checks for branch name:**
   - Requires you to provide a branch name
   - If missing: Shows usage instructions and exits

2. **Switches to master branch:**
   - Checks what branch you're currently on
   - If not on `master` or `main`:
     - Switches to `master` (or `main`)
   - If already on master:
     - Stays on master

3. **Merges the branch:**
   - Runs: `git merge branch-name`
   - Merges the feature branch into master

4. **Checks for merge conflicts:**
   - If merge succeeds:
     - Continues to next step
   - If merge fails (conflicts):
     - Shows error message
     - Exits without pushing
     - You need to resolve conflicts manually

5. **Pushes to production:**
   - Runs: `git push origin master` (or `main`)
   - Deploys to production
   - Vercel automatically builds and deploys

6. **Shows optional cleanup:**
   - Suggests deleting the feature branch (optional)
   - Shows commands to delete local and remote branch

**Safety:** ⚠️ **Important** - This pushes to production! Make sure you've tested the preview first.

**What it modifies:**
- Merges branches in Git
- Pushes to production (triggers Vercel deployment)

---

## 4. `scripts/preview.sh`

**Purpose:** Short alias for `create-preview-deployment.sh`

**What it does:**
- Simply calls `scripts/create-preview-deployment.sh` with any arguments you provide
- No additional logic - just a convenience shortcut

**Usage:**
- `./scripts/preview.sh` → Creates preview with auto-generated name
- `./scripts/preview.sh my-feature` → Creates `feature/my-feature`

**Safety:** ✅ Same as `create-preview-deployment.sh`

---

## 5. `scripts/merge.sh`

**Purpose:** Short alias for `merge-preview.sh`

**What it does:**
- Simply calls `scripts/merge-preview.sh` with any arguments you provide
- No additional logic - just a convenience shortcut

**Usage:**
- `./scripts/merge.sh feature/my-feature` → Merges and deploys to production

**Safety:** ⚠️ Same as `merge-preview.sh` - pushes to production!

---

## 6. `cleanup.sh`

**Purpose:** Cleans up build artifacts to free disk space

**What it does:**

1. **Checks for `.next` folder:**
   - If `.next` folder exists:
     - Calculates its size
     - Deletes the entire `.next` folder (`rm -rf .next`)
     - Shows how much space was freed
   - If `.next` folder doesn't exist:
     - Shows message that it doesn't exist
     - Skips deletion

2. **Clears npm cache:**
   - Runs: `npm cache clean --force`
   - Clears all cached npm packages
   - Shows confirmation message

3. **Shows current space usage:**
   - Displays size of `node_modules` folder
   - Displays size of `.git` folder
   - Shows remaining disk usage

4. **Shows completion message:**
   - Reminds you that `.next` will regenerate when you run `npm run dev`

**Safety:** ✅ Safe - Only deletes build cache and npm cache. Doesn't touch your code.

**What it deletes:**
- `.next` folder (build cache - regenerates automatically)
- npm cache (re-downloads when needed)

**What it doesn't delete:**
- Your source code
- `node_modules` folder
- Git history
- Any of your files

---

## 7. `package.json` Changes

**What changed:**

**Before:**
```json
"build": "node scripts/run-next-build.js"
```

**After:**
```json
"build": "bash scripts/prevent-local-build.sh",
"build:force": "node scripts/run-next-build.js"
```

**What this means:**

1. **When you run `npm run build`:**
   - Now runs the prevention script instead
   - Shows warning and asks for confirmation
   - Only builds if you confirm "yes"

2. **When you run `npm run build:force`:**
   - Bypasses the warning
   - Runs the actual build directly
   - Use this if you really need to build locally

**Safety:** ✅ Safe - Only adds a warning layer. Doesn't change build behavior.

---

## 📊 Summary Table

| Script | What It Does | Safety | Modifies |
|--------|--------------|--------|----------|
| `prevent-local-build.sh` | Warns before building locally | ✅ Safe | Nothing (just warns) |
| `create-preview-deployment.sh` | Creates feature branch and pushes | ✅ Safe | Creates branch, commits, pushes |
| `merge-preview.sh` | Merges to master and deploys | ⚠️ Production | Merges branches, pushes to production |
| `preview.sh` | Alias for create-preview | ✅ Safe | Same as create-preview |
| `merge.sh` | Alias for merge-preview | ⚠️ Production | Same as merge-preview |
| `cleanup.sh` | Deletes build cache | ✅ Safe | Deletes `.next` and npm cache |

---

## 🎯 Decision Guide

### ✅ Safe to Run Anytime:
- `npm run build` (now warns first)
- `./scripts/preview.sh` (creates preview branch)
- `./scripts/create-preview-deployment.sh` (same as above)

### ⚠️ Run After Testing Preview:
- `./scripts/merge.sh` (deploys to production)
- `./scripts/merge-preview.sh` (same as above)

### 🔧 Only If Needed:
- `npm run build:force` (bypasses warning, builds locally)

---

## 🔍 What Gets Modified

### `create-preview-deployment.sh`:
- ✅ Creates new Git branch (if on master)
- ✅ Commits uncommitted changes (if any)
- ✅ Pushes to GitHub
- ❌ Doesn't delete anything
- ❌ Doesn't modify existing code

### `merge-preview.sh`:
- ✅ Merges Git branches
- ✅ Pushes to production
- ⚠️ Triggers Vercel production deployment
- ❌ Doesn't delete code
- ❌ Doesn't force push

---

## 💡 Best Practices

1. **Always test preview first:**
   - Run `./scripts/preview.sh`
   - Test in Vercel preview
   - Then run `./scripts/merge.sh`

2. **Review changes before merging:**
   - Check what's in the feature branch
   - Verify preview works correctly
   - Then merge to production

3. **Use build prevention:**
   - Let `npm run build` warn you
   - Use `npm run build:force` only if really needed
   - Run `./cleanup.sh` after building locally

---

## ✅ All Scripts Are Safe

- None of the scripts delete your code
- None of the scripts force push
- All scripts show clear messages about what they're doing
- Merge script checks for conflicts before pushing
- Preview script asks for confirmation before committing

**You can review each script's code before running!**

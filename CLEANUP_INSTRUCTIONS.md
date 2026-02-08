# Weekly Cleanup Instructions

## ✅ What the Cleanup Script Does

The `cleanup.sh` script safely removes:
1. **`.next` folder** (~4.2GB) - Next.js build cache (regenerates automatically)
2. **npm cache** (~1.5GB) - Cached npm packages (re-downloads when needed)

**Total space freed: ~5.7GB**

---

## 🚀 How to Run

### Option 1: Run Manually (Weekly)
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
./cleanup.sh
```

### Option 2: Set Up Weekly Reminder
You can set a calendar reminder or use macOS automation to run it weekly.

---

## ✅ Is It Safe?

**YES! Both operations are completely safe:**

1. **Deleting `.next` folder:**
   - ✅ Just build cache - regenerates when you run `npm run dev` or `npm run build`
   - ✅ Your source code is untouched
   - ✅ No data loss

2. **Clearing npm cache:**
   - ✅ Just cached packages - npm will re-download them when you run `npm install`
   - ✅ Your `node_modules` folder stays intact (not deleted)
   - ✅ Your `package.json` and `package-lock.json` are untouched
   - ✅ First `npm install` after cleanup might take a bit longer (re-downloading)

---

## 📋 What Happens After Cleanup?

1. **Next time you run `npm run dev`:**
   - `.next` folder will be regenerated automatically
   - Takes ~30-60 seconds on first run

2. **Next time you run `npm install`:**
   - npm will re-download packages from the registry
   - Takes a bit longer than usual (but still fast)

3. **Your code:**
   - ✅ Completely untouched
   - ✅ All files safe
   - ✅ Git history intact

---

## 🎯 Recommended Schedule

Run the cleanup script:
- **Weekly** - Every Sunday or Monday
- **Or when** - You notice disk space getting low
- **Or before** - Large operations that need space

---

## 📊 Space Recovery Summary

| Item | Size | Safe to Delete? | Regenerates? |
|------|------|----------------|--------------|
| `.next/` | ~4.2GB | ✅ Yes | ✅ Yes (on `npm run dev`) |
| npm cache | ~1.5GB | ✅ Yes | ✅ Yes (on `npm install`) |
| `node_modules/` | ~1.8GB | ⚠️ Only if needed | ✅ Yes (on `npm install`) |
| `.git/` | ~53MB | ❌ No | ❌ No (version history) |
| Source code | ~70MB | ❌ No | ❌ No (your actual code) |

---

## 🔍 Check Current Space Usage

To see how much space you're using:
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
du -sh .next node_modules .git 2>/dev/null
```

---

## 💡 Pro Tips

1. **Run cleanup before large operations** (like installing new packages)
2. **Don't worry about regenerating** - it's automatic and fast
3. **Keep the script handy** - Run it whenever you need space
4. **Monitor disk space** - macOS will warn you when space gets low

---

## 🆘 If Something Goes Wrong

If you accidentally delete something important:
1. **`.next` folder** - Just run `npm run dev` (regenerates automatically)
2. **npm cache** - Just run `npm install` (re-downloads packages)
3. **`node_modules`** - Run `npm install` (reinstalls everything)
4. **Source code** - Restore from Git: `git checkout .`

**Note:** The cleanup script only deletes `.next` and npm cache - it never touches your source code or `node_modules`.

---

## ✅ You're All Set!

Your cleanup script is ready to use. Run it weekly to keep your disk space healthy!

```bash
./cleanup.sh
```

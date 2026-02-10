# 📝 How to Edit .env.local File

## ✅ Method 1: Using Your Code Editor (Easiest)

Since you have Cursor open:
1. **Click on `.env.local`** in the file explorer (left sidebar)
2. **Edit directly** in the editor
3. **Replace the empty token** with your actual token:
   ```env
   BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx"
   ```
4. **Save** (Cmd+S)

---

## ✅ Method 2: Using Terminal (Command Line)

### View the file:
```bash
cat .env.local
```

### Edit with nano (simple editor):
```bash
nano .env.local
```
- Use arrow keys to navigate
- Edit the `BLOB_READ_WRITE_TOKEN=""` line
- Press `Ctrl+X` to exit
- Press `Y` to save
- Press `Enter` to confirm

### Edit with vim (advanced):
```bash
vim .env.local
```
- Press `i` to enter insert mode
- Edit the token line
- Press `Esc` then type `:wq` and press `Enter` to save and quit

### Edit with VS Code from terminal:
```bash
code .env.local
```

---

## ✅ Method 3: Using TextEdit (Mac GUI)

```bash
open -a TextEdit .env.local
```

---

## 📍 Current File Location

Your `.env.local` file is at:
```
/Users/cyclerun/Desktop/nexrel-crm/.env.local
```

---

## 🔍 What to Edit

Find this line:
```env
BLOB_READ_WRITE_TOKEN=""
```

Replace with your actual token:
```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxx"
```

---

## ✅ Quick Commands

### View file contents:
```bash
cat .env.local
```

### Check if token is set:
```bash
grep BLOB_READ_WRITE_TOKEN .env.local
```

### Open in default editor:
```bash
open .env.local
```

---

## ⚠️ Common Mistakes

❌ **Don't run it as a command:**
```bash
.env.local  # ❌ Wrong - this tries to execute it
```

✅ **Do edit it:**
```bash
nano .env.local  # ✅ Correct - opens editor
code .env.local   # ✅ Correct - opens in VS Code
```

---

## 🎯 Recommended: Use Cursor Editor

Since you're already in Cursor:
1. **Click `.env.local`** in the file tree (left sidebar)
2. **Edit line 12** where it says `BLOB_READ_WRITE_TOKEN=""`
3. **Add your token** between the quotes
4. **Save** (Cmd+S)

That's it! 🎉

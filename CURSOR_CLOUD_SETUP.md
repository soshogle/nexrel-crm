# 🚀 Cursor Cloud Development Setup Guide

## Overview

Since your local space is running out, here are the best ways to code in the cloud with Cursor:

---

## Option 1: Cursor Cloud Agents (For Background Tasks) ⭐

**Best for:** Running AI agents in the cloud while you work locally

### How It Works:
- Cloud agents run in isolated cloud environments
- They can edit code, run commands, and make commits
- You can manage multiple agents simultaneously
- Agents run autonomously without your laptop staying connected

### Setup:

1. **Access Cloud Agents:**
   - In Cursor editor: Select **"Cloud"** from the dropdown under the agent input
   - Or visit: https://cursor.com/agents

2. **Start a Cloud Agent:**
   ```
   # In Cursor, type your request and select "Cloud" mode
   # Example: "Add dark mode toggle to settings page"
   ```

3. **Monitor Agents:**
   - View all agents at: https://cursor.com/agents
   - Check status, logs, and take over work if needed

### Use Cases:
- ✅ Fix bugs in the background
- ✅ Handle quick todos
- ✅ Execute complex features (use plan mode locally, execute in cloud)

**Note:** This still requires your code to be synced to GitHub. For full cloud development, use Option 2.

---

## Option 2: GitHub Codespaces + Cursor (⭐ RECOMMENDED)

**Best for:** Full cloud development with zero local disk usage

### How It Works:
- Code lives entirely in GitHub
- Codespaces creates a cloud Linux VM
- All builds (`.next`, `node_modules`) happen in cloud
- Connect Cursor via Remote SSH or browser
- **Zero local disk space used**

### Setup Steps:

#### Step 1: Create Codespace

1. Go to your GitHub repo: https://github.com/soshogle/nexrel-crm
2. Click **"Code"** button (green button)
3. Click **"Codespaces"** tab
4. Click **"Create codespace on main"**
5. Wait 2-3 minutes for setup

#### Step 2: Connect Cursor to Codespace

**Method A: Via Remote SSH (Recommended)**

1. **Get SSH Connection String:**
   - In Codespace, click the "..." menu (top right)
   - Select **"Copy SSH Command"**

2. **In Cursor:**
   - Install **"Remote - SSH"** extension (if not already installed)
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - Type: `Remote-SSH: Connect to Host`
   - Paste your SSH connection string
   - Enter password if prompted

3. **Open Project:**
   - Once connected, open folder: `/workspaces/nexrel-crm`
   - All your code is now accessible in Cursor!

**Method B: Via Browser (Simpler)**

1. Just use Codespaces in your browser
2. Install Cursor extension in Codespaces
3. Develop directly in browser

#### Step 3: Set Environment Variables

In Codespace terminal:
```bash
# Create .env.local file
cat > .env.local << EOF
DATABASE_URL="your-neon-connection-string"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="your-url"
# ... other env vars
EOF
```

#### Step 4: Install Dependencies

```bash
npm install
```

#### Step 5: Develop!

- All builds happen in cloud (no local `.next` folder)
- All `node_modules` in cloud
- Zero local disk usage
- Deploy via `git push` (auto-deploys to Vercel)

### Pricing:
- **Free:** 60 hours/month (2 hours/day)
- **Paid:** $0.18/hour (~$13/month for regular use)

### Space Saved: ~6GB+ (all builds in cloud)

---

## Option 3: GitPod (More Free Hours)

**Best for:** More generous free tier

### Setup:

1. **Connect GitHub:**
   - Go to: https://gitpod.io
   - Connect your GitHub account

2. **Start Workspace:**
   - Prefix your repo URL: `https://gitpod.io/#https://github.com/soshogle/nexrel-crm`
   - Or use GitPod browser extension

3. **Connect Cursor:**
   - Install "Remote - SSH" extension
   - Connect via SSH (similar to Codespaces)

### Pricing:
- **Free:** 50 hours/month
- **Paid:** $25/month unlimited

---

## Option 4: Hybrid Approach (Keep Cursor Local, Builds in Cloud)

**Best for:** Use Cursor locally but offload heavy operations

### How It Works:
- Keep Cursor on your Mac (source code only ~70MB)
- Never run `npm run build` locally
- Only use `npm run dev` for quick testing
- Deploy via Vercel (builds happen on Vercel servers)
- Delete `.next` folder after dev sessions

### Setup:

1. **Never Build Locally:**
   ```bash
   # ✅ DO THIS - Quick local testing only
   npm run dev
   
   # ❌ DON'T DO THIS - Let Vercel build
   # npm run build
   ```

2. **Deploy via Git Push:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin master  # Vercel builds automatically
   ```

3. **Cleanup After Dev:**
   ```bash
   # Delete build cache
   rm -rf .next
   
   # Optional: Delete node_modules (reinstall when needed)
   # rm -rf node_modules
   ```

### Space Saved: ~4.2GB (no `.next` folder)

---

## 🎯 Recommended Workflow

### For Maximum Space Savings:

1. **Use GitHub Codespaces** (Option 2)
   - Full cloud development
   - Zero local disk usage
   - Works perfectly with Neon, Vercel, GitHub

2. **Or Use Hybrid Approach** (Option 4)
   - Keep Cursor local
   - Never build locally
   - Deploy via Vercel

### Quick Start Commands:

```bash
# If using Codespaces:
# 1. Create codespace on GitHub
# 2. Connect Cursor via Remote SSH
# 3. Develop in cloud!

# If using Hybrid:
npm run dev  # Only for testing
git push origin master  # Deploy (builds on Vercel)
rm -rf .next  # Cleanup after
```

---

## 🔧 Troubleshooting

### Codespaces Connection Issues:
- Make sure SSH keys are set up in GitHub
- Check Codespace is running (they auto-sleep after 30 min inactivity)
- Restart Codespace if connection fails

### Environment Variables:
- Set in Codespace settings → Secrets
- Or create `.env.local` file in Codespace

### Database Connection:
- Neon works perfectly from cloud (just use `DATABASE_URL`)
- No changes needed to connection string

---

## 💡 Pro Tips

1. **Codespaces Auto-Sleep:** Codespaces sleep after 30 min inactivity. They wake up automatically when you connect.

2. **Persistent Storage:** Your code is always on GitHub, so you can recreate Codespaces anytime.

3. **Multiple Codespaces:** Create different Codespaces for different branches/features.

4. **Cost Management:** Use free tier (60 hrs/month) or pay only for active hours.

5. **Local Backup:** Keep a lightweight local copy (without `node_modules` or `.next`) for quick reference.

---

## 📊 Comparison

| Option | Local Space | Cost | Setup Time | Best For |
|-------|-------------|------|------------|----------|
| **Cloud Agents** | ~70MB | Free | 0 min | Background tasks |
| **Codespaces** | 0GB | $0-13/mo | 5 min | Full cloud dev |
| **GitPod** | 0GB | $0-25/mo | 5 min | More free hours |
| **Hybrid** | ~2GB | $0 | 0 min | Local + cloud builds |

---

## ✅ Next Steps

1. **Try Codespaces first** (easiest, most integrated)
2. **Or use Hybrid approach** (if you prefer local Cursor)
3. **Use Cloud Agents** for background tasks

Your Neon database, Vercel deployment, and GitHub workflow all work perfectly with any of these options!

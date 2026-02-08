# Automated Weekly Cleanup Setup

## ✅ What This Does

Sets up an automated task that runs `cleanup.sh` every **Sunday at 5:00 AM** to free up disk space automatically.

---

## 🚀 Installation Steps

### Quick Install (Run this in Terminal):

```bash
cd /Users/cyclerun/Desktop/nexrel-crm

# Copy the plist file to LaunchAgents directory
cp com.nexrel.cleanup.weekly.plist ~/Library/LaunchAgents/

# Load the agent (starts the scheduled task)
launchctl load ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist

# Verify it's loaded
launchctl list | grep com.nexrel.cleanup.weekly
```

**Or use the install script:**
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
./install-weekly-cleanup.sh
```

### Manual Steps:

1. **Open Terminal**
2. **Navigate to your project:**
   ```bash
   cd /Users/cyclerun/Desktop/nexrel-crm
   ```

3. **Copy the plist file:**
   ```bash
   cp com.nexrel.cleanup.weekly.plist ~/Library/LaunchAgents/
   ```

4. **Load the scheduled task:**
   ```bash
   launchctl load ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
   ```

5. **Verify it's installed:**
   ```bash
   launchctl list | grep com.nexrel.cleanup.weekly
   ```

---

## 📅 Schedule Details

- **Frequency:** Every Sunday
- **Time:** 5:00 AM
- **What it does:** Runs `cleanup.sh` to free ~5.7GB

**Note:** The task runs even if your Mac is sleeping (it will wake up to run it, then go back to sleep).

---

## 📋 Management Commands

### Check if it's running:
```bash
launchctl list | grep com.nexrel.cleanup.weekly
```

### Unload (disable) the task:
```bash
launchctl unload ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
```

### Reload (re-enable) the task:
```bash
launchctl load ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
```

### Remove completely:
```bash
launchctl unload ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
rm ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
```

---

## 📝 Log Files

The cleanup script output will be saved to:
- **Success logs:** `/Users/cyclerun/Desktop/nexrel-crm/cleanup.log`
- **Error logs:** `/Users/cyclerun/Desktop/nexrel-crm/cleanup.error.log`

Check these files to see when cleanup ran and what happened.

---

## 🧪 Test It Manually

To test if it works without waiting until Sunday:

```bash
# Run the cleanup script manually
cd /Users/cyclerun/Desktop/nexrel-crm
./cleanup.sh
```

---

## ⚙️ Customize the Schedule

If you want to change the day or time, edit the plist file:

```bash
# Edit the plist file
nano ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
```

**Weekday values:**
- `0` = Sunday
- `1` = Monday
- `2` = Tuesday
- `3` = Wednesday
- `4` = Thursday
- `5` = Friday
- `6` = Saturday

**Time values:**
- `Hour`: 0-23 (24-hour format)
- `Minute`: 0-59

After editing, reload:
```bash
launchctl unload ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
launchctl load ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
```

---

## ✅ Verification

After installation, you can verify it's set up correctly:

1. **Check the plist file exists:**
   ```bash
   ls -la ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist
   ```

2. **Check it's loaded:**
   ```bash
   launchctl list | grep com.nexrel.cleanup.weekly
   ```

3. **Check the logs (after first run):**
   ```bash
   cat /Users/cyclerun/Desktop/nexrel-crm/cleanup.log
   ```

---

## 🆘 Troubleshooting

### Task not running?
1. Check if it's loaded: `launchctl list | grep com.nexrel.cleanup.weekly`
2. Check error logs: `cat /Users/cyclerun/Desktop/nexrel-crm/cleanup.error.log`
3. Make sure the script is executable: `chmod +x /Users/cyclerun/Desktop/nexrel-crm/cleanup.sh`

### Want to run it now instead of waiting?
```bash
cd /Users/cyclerun/Desktop/nexrel-crm
./cleanup.sh
```

---

## 📊 What Gets Cleaned

Every Sunday at 5 AM, the script will:
1. ✅ Delete `.next` folder (~4.2GB)
2. ✅ Clear npm cache (~1.5GB)
3. ✅ Show current space usage

**Total space freed: ~5.7GB weekly**

---

## 🎯 You're All Set!

Once installed, the cleanup will run automatically every Sunday at 5 AM. You don't need to do anything else!

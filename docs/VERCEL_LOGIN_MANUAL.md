# Vercel Login - Manual Browser Opening

## If Browser Didn't Open Automatically

The `vercel login` command should show a URL in your terminal. Look for something like:

```
> Visit https://vercel.com/login?next=/cli/login?token=...
```

### Step 1: Copy the URL

Look in your terminal for a URL that starts with:
- `https://vercel.com/login?next=/cli/login?token=...`
- Or similar Vercel authentication URL

### Step 2: Open URL Manually

1. **Copy the entire URL** from the terminal
2. **Open your browser** (Chrome, Safari, etc.)
3. **Paste the URL** in the address bar
4. **Press Enter**

### Step 3: Authorize

1. You'll see a Vercel login page
2. **Click "Authorize"** or **"Continue"**
3. This will complete the authentication

### Step 4: Return to Terminal

After authorizing, go back to your terminal. You should see:
```
Success! Logged in as [your-email]
```

---

## Alternative: Check Terminal Output

The terminal should show something like:

```
Vercel CLI 50.x.x
> Visit https://vercel.com/login?next=/cli/login?token=ABC123XYZ
> Press [Enter] to open in the browser...
```

**If you see this:**
1. Copy the URL
2. Open it in your browser manually
3. Authorize
4. Return to terminal

---

## If No URL Appears

Try running the command again:

```bash
npx vercel login
```

Or check if there's any error message in the terminal.

---

## After Successful Login

Once you see "Success! Logged in", proceed with:

```bash
npx vercel link
npx vercel --prod
```

**Check your terminal output - there should be a URL to visit!**

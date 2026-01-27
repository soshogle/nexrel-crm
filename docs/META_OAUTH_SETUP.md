# Meta (Instagram/Facebook/WhatsApp) OAuth Integration Guide

This guide will walk you through setting up direct OAuth integration with Meta platforms (Instagram, Facebook Pages, and WhatsApp Business) in your CRM.

## Overview

The Meta OAuth integration allows you to:
- Connect Instagram Business accounts for DM management
- Connect Facebook Pages for messaging and comments
- Connect WhatsApp Business for messaging
- Manage all conversations in a unified inbox

## Prerequisites

1. A Facebook Developer account
2. A Meta App configured with the right permissions
3. A Facebook Page (required for Instagram Business and messaging)
4. Instagram Business Account connected to your Facebook Page
5. WhatsApp Business Account (optional)

## Step 1: Create a Meta App

### 1.1 Go to Meta for Developers

1. Visit [Meta for Developers](https://developers.facebook.com/)
2. Log in with your Facebook account
3. Click on "My Apps" in the top right
4. Click "Create App"

### 1.2 Choose App Type

1. Select **"Business"** as your app type
2. Click "Next"

### 1.3 Provide App Details

1. **App Name**: Choose a name for your app (e.g., "My CRM Integration")
2. **App Contact Email**: Enter your business email
3. **Business Account**: Select or create a Meta Business account
4. Click "Create App"

## Step 2: Configure Your App

### 2.1 Add Products

You need to add the following products to your app:

#### Facebook Login
1. In your app dashboard, find "Facebook Login" and click "Set Up"
2. Choose "Web" as the platform
3. Enter your website URL (e.g., `https://yourdomain.com`)
4. Click "Save" and "Continue"

#### Instagram API (for Instagram DMs)
1. Find "Instagram" in the products list
2. Click "Set Up"
3. Follow the setup wizard

#### Messenger API (for Facebook Page messages)
1. Find "Messenger" in the products list
2. Click "Set Up"
3. Follow the setup wizard

#### WhatsApp Business API (optional, for WhatsApp messages)
1. Find "WhatsApp" in the products list
2. Click "Set Up"
3. Follow the setup wizard to connect your WhatsApp Business account

### 2.2 Configure OAuth Settings

1. Go to **Facebook Login** → **Settings**
2. Add the following to **Valid OAuth Redirect URIs**:
   ```
   https://yourdomain.com/api/meta/oauth/callback
   ```
   Replace `yourdomain.com` with your actual domain.

3. For local development, also add:
   ```
   http://localhost:3000/api/meta/oauth/callback
   ```

4. Click "Save Changes"

### 2.3 Get Your App Credentials

1. Go to **Settings** → **Basic** in your app dashboard
2. You'll see:
   - **App ID**: A numeric ID (e.g., `123456789012345`)
   - **App Secret**: Click "Show" to reveal it (e.g., `abcdef123456...`)
3. **IMPORTANT**: Keep your App Secret confidential!

## Step 3: Request Permissions

Your app needs specific permissions to access Instagram, Facebook, and WhatsApp.

### 3.1 Standard Permissions (Available Immediately)

These permissions are available in Development mode:
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_metadata`
- `pages_messaging`

### 3.2 Advanced Permissions (Require App Review)

For production use, you'll need to submit your app for review to get:

#### Instagram Permissions
- `instagram_basic`
- `instagram_manage_messages`
- `instagram_manage_comments`

#### WhatsApp Permissions
- `whatsapp_business_management`
- `whatsapp_business_messaging`

### 3.3 How to Request Permissions

1. Go to **App Review** → **Permissions and Features**
2. Find the permissions listed above
3. Click "Request Advanced Access" for each
4. Follow the submission process (you'll need to explain how you use each permission)

**Note**: Your app will work in Development mode with test users before approval.

## Step 4: Configure Your CRM

### 4.1 Add Your Credentials

1. Log into your CRM
2. Go to **Settings** → **Meta (Instagram/Facebook)**
3. Click on "Setup Credentials" or "Update Credentials"
4. Enter:
   - **App ID**: Paste the App ID from Step 2.3
   - **App Secret**: Paste the App Secret from Step 2.3
5. Click "Save Credentials"

### 4.2 Connect Your Meta Account

1. After saving credentials, click **"Connect with Meta"**
2. A popup will open asking you to:
   - Log in to Facebook (if not already)
   - Select a Facebook Page to connect
   - Grant permissions to your app
3. Click "Continue" through the authorization flow
4. The popup will close and you'll see a success message

### 4.3 Verify Connection

Once connected, you should see:
- ✅ Meta Connected status
- Your connected Facebook Page name
- Instagram Business Account status (if connected)
- WhatsApp status (if configured)

## Step 5: Test Your Integration

### 5.1 Test Instagram DMs

1. Send a DM to your Instagram Business account from another account
2. Check your CRM's Messages/Inbox section
3. You should see the Instagram message appear
4. Try replying from the CRM

### 5.2 Test Facebook Page Messages

1. Send a message to your Facebook Page
2. Check your CRM's Messages/Inbox section
3. The message should appear in the unified inbox
4. Reply from the CRM

### 5.3 Test WhatsApp (if configured)

1. Send a WhatsApp message to your business number
2. Check the unified inbox
3. Reply from the CRM

## Troubleshooting

### Error: "Meta App credentials not configured"

**Solution**: Make sure you've entered both App ID and App Secret in the settings page.

### Error: "Invalid App ID format"

**Solution**: The App ID should be a numeric value. Double-check you copied it correctly from the Meta Developer dashboard.

### Error: "Token exchange failed"

**Possible causes**:
1. **Incorrect App Secret**: Verify you copied the App Secret correctly
2. **Invalid Redirect URI**: Make sure you added the correct redirect URI in Facebook Login settings
3. **App not in Development mode**: Your app might be in Development mode and you're trying to connect with a non-test user

### Connection Works But No Messages Appear

**Possible causes**:
1. **Missing Permissions**: Check if your app has the required permissions
2. **Webhook Not Configured**: For real-time messages, you may need to set up webhooks (see Advanced Configuration below)
3. **Page Not Connected**: Make sure the Instagram/Facebook Page is properly connected to the app

### Instagram Business Account Not Detected

**Solution**: 
1. Make sure your Instagram account is a Business account (not Personal)
2. Verify the Instagram Business account is connected to your Facebook Page
3. Go to Facebook Page Settings → Instagram → Check Connection

## Advanced Configuration

### Webhooks for Real-Time Messages

For real-time message notifications, you need to set up webhooks:

1. Go to your Meta App dashboard
2. Navigate to **Webhooks** section
3. Add callback URL: `https://yourdomain.com/api/meta/webhook`
4. Add verify token: Generate a random string and save it in your CRM settings
5. Subscribe to fields:
   - `messages` (for Messenger and Instagram)
   - `messaging_postbacks`
   - `messaging_optins`
   - `message_deliveries`
   - `message_reads`

### Token Refresh

Meta access tokens expire after ~60 days. The CRM automatically handles token refresh, but you can manually reconnect if needed:

1. Go to Settings → Meta (Instagram/Facebook)
2. Click "Disconnect"
3. Click "Connect with Meta" again

## Production Checklist

Before going live:

- [ ] App reviewed and approved by Meta
- [ ] All required permissions granted
- [ ] Webhooks configured and tested
- [ ] Valid OAuth redirect URI added for production domain
- [ ] App switched to "Live" mode (not Development)
- [ ] Privacy Policy URL added to app settings
- [ ] Terms of Service URL added to app settings
- [ ] Data deletion callback URL configured

## Security Best Practices

1. **Never expose App Secret**: Keep it secure in your `.env` file
2. **Use HTTPS**: Always use HTTPS for your redirect URIs
3. **Validate webhook signatures**: Verify that webhook calls are from Meta
4. **Rotate secrets regularly**: Change your App Secret periodically
5. **Monitor access**: Regularly check connected accounts in your CRM

## Support Resources

- [Meta for Developers Documentation](https://developers.facebook.com/docs/)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Help Center](https://www.facebook.com/business/help)

## Additional Notes

### Development vs Production Mode

- **Development Mode**: Only admins, developers, and testers can authorize your app
- **Live Mode**: Anyone can authorize, but requires app review

### Test Users

For testing in Development mode:
1. Go to **Roles** → **Test Users** in your app dashboard
2. Add test users
3. Use these accounts to test the OAuth flow

### Rate Limits

Meta has rate limits on API calls:
- Message sending: Varies by tier (Standard, Basic, Advanced)
- Message reading: Generally higher limits
- Check Meta documentation for current limits

---

## Quick Reference

| Setting | Value |
|---------|-------|
| OAuth URL | `https://www.facebook.com/v18.0/dialog/oauth` |
| Token Exchange URL | `https://graph.facebook.com/v18.0/oauth/access_token` |
| Graph API Base | `https://graph.facebook.com/v18.0/` |
| Redirect URI | `https://yourdomain.com/api/meta/oauth/callback` |

### Required Scopes
```
pages_show_list
pages_read_engagement
pages_manage_metadata
pages_messaging
instagram_basic
instagram_manage_messages
instagram_manage_comments
whatsapp_business_management
whatsapp_business_messaging
```

---

If you encounter any issues not covered in this guide, please contact support or refer to the Meta Developer documentation.

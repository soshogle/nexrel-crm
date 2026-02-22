-- Add vercelDeployHookUrl for Model B: auto-deploy on save
-- Owners can paste deploy hook URL from Vercel → triggers redeploy on POST (no token needed)
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "vercelDeployHookUrl" TEXT;

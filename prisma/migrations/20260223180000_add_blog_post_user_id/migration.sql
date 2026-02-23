-- Add userId to BlogPost: null = platform/landing page, non-null = user's post
-- Existing rows get null (platform posts from blog generator)
ALTER TABLE "BlogPost" ADD COLUMN "userId" TEXT;

-- Add foreign key and index
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "BlogPost_userId_idx" ON "BlogPost"("userId");

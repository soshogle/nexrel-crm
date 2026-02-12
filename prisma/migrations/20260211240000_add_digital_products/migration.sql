-- Add digital product fields to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productType" TEXT NOT NULL DEFAULT 'PHYSICAL';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "accessCodeTemplate" TEXT;

-- Create ProductAccessCode for digital product access codes
CREATE TABLE IF NOT EXISTS "ProductAccessCode" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAccessCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductAccessCode_code_key" ON "ProductAccessCode"("code");
CREATE INDEX IF NOT EXISTS "ProductAccessCode_productId_idx" ON "ProductAccessCode"("productId");
CREATE INDEX IF NOT EXISTS "ProductAccessCode_code_idx" ON "ProductAccessCode"("code");

ALTER TABLE "ProductAccessCode" ADD CONSTRAINT "ProductAccessCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

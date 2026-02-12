-- AlterTable
ALTER TABLE "DocpenSOAPNote" ADD COLUMN "linkedXrayIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

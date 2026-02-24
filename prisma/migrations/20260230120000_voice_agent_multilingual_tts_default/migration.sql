-- AlterTable: VoiceAgent ttsModel default to eleven_multilingual_v2 for accent-free multilingual speech (matches landing page)
ALTER TABLE "VoiceAgent" ALTER COLUMN "ttsModel" SET DEFAULT 'eleven_multilingual_v2';

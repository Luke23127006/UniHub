-- AlterTable: Increase code length to support JWT
ALTER TABLE "qr_codes" ALTER COLUMN "code" SET DATA TYPE TEXT;

-- AlterTable: Make qr_code_id optional in checkins table
ALTER TABLE "checkins" ALTER COLUMN "qr_code_id" DROP NOT NULL;

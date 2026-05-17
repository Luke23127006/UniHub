-- DropForeignKey
ALTER TABLE "checkins" DROP CONSTRAINT "checkins_qr_code_id_fkey";

-- AlterTable
ALTER TABLE "ai_summaries" ADD COLUMN     "speaker_name" VARCHAR(255),
ADD COLUMN     "suggested_title" VARCHAR(500);

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

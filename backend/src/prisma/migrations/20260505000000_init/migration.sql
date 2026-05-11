-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LoginStatus" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "CsvSyncStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('uploaded', 'processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "AiSummaryStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'waitlisted');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('app', 'email', 'telegram');

-- CreateEnum
CREATE TYPE "NotificationEventStatus" AS ENUM ('queued', 'processing', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "NotificationLogStatus" AS ENUM ('sent', 'failed', 'bounced');

-- CreateEnum
CREATE TYPE "OfflineSyncStatus" AS ENUM ('pending', 'processing', 'completed', 'partial_failed');

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" BIGINT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(512) NOT NULL,
    "device_info" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "ip_address" VARCHAR(45),
    "status" "LoginStatus" NOT NULL,
    "failure_reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "student_code" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "faculty" VARCHAR(255),
    "major" VARCHAR(255),
    "enrollment_year" SMALLINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_sync_logs" (
    "id" BIGSERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "status" "CsvSyncStatus" NOT NULL DEFAULT 'pending',
    "total_rows" INTEGER,
    "processed_rows" INTEGER,
    "skipped_rows" INTEGER,
    "error_rows" INTEGER,
    "error_details" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csv_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" BIGSERIAL NOT NULL,
    "room_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "building" VARCHAR(100),
    "floor" SMALLINT,
    "layout_image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speakers" (
    "id" BIGSERIAL NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "organization" VARCHAR(255),
    "bio" TEXT,
    "avatar_url" VARCHAR(500),

    CONSTRAINT "speakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "room_id" BIGINT NOT NULL,
    "event_day" DATE NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "available_seats" INTEGER NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(12,2),
    "status" "WorkshopStatus" NOT NULL DEFAULT 'draft',
    "cancelled_reason" VARCHAR(500),
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workshops_available_seats_check" CHECK ("available_seats" >= 0)
);

-- CreateTable
CREATE TABLE "workshop_speakers" (
    "workshop_id" BIGINT NOT NULL,
    "speaker_id" BIGINT NOT NULL,
    "is_main_speaker" BOOLEAN NOT NULL DEFAULT false,
    "display_order" SMALLINT,

    CONSTRAINT "workshop_speakers_pkey" PRIMARY KEY ("workshop_id","speaker_id")
);

-- CreateTable
CREATE TABLE "workshop_documents" (
    "id" BIGSERIAL NOT NULL,
    "workshop_id" BIGINT NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "file_size_bytes" BIGINT,
    "mime_type" VARCHAR(100),
    "upload_status" "UploadStatus" NOT NULL DEFAULT 'uploaded',
    "uploaded_by" BIGINT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workshop_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_summaries" (
    "id" BIGSERIAL NOT NULL,
    "workshop_id" BIGINT NOT NULL,
    "document_id" BIGINT NOT NULL,
    "raw_text" TEXT,
    "summary_text" TEXT,
    "ai_model" VARCHAR(100),
    "status" "AiSummaryStatus" NOT NULL DEFAULT 'pending',
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "workshop_id" BIGINT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'pending_payment',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" VARCHAR(500),

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "registration_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "gateway" VARCHAR(100),
    "gateway_txn_id" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payload_request" TEXT,
    "payload_response" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" BIGSERIAL NOT NULL,
    "key_hash" VARCHAR(128) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" BIGINT,
    "response_status" SMALLINT,
    "response_body" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" BIGSERIAL NOT NULL,
    "registration_id" BIGINT NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "qr_image_url" VARCHAR(500),
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" BIGSERIAL NOT NULL,
    "registration_id" BIGINT NOT NULL,
    "scanned_by_user_id" BIGINT NOT NULL,
    "qr_code_id" BIGINT NOT NULL,
    "is_offline" BOOLEAN NOT NULL DEFAULT false,
    "device_id" VARCHAR(255),
    "client_timestamp" TIMESTAMP(3),
    "server_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_sync_batches" (
    "id" BIGSERIAL NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "staff_user_id" BIGINT NOT NULL,
    "batch_data" TEXT NOT NULL,
    "total_records" INTEGER,
    "synced_records" INTEGER,
    "failed_records" INTEGER,
    "sync_status" "OfflineSyncStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "offline_sync_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" BIGSERIAL NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject_template" VARCHAR(500),
    "body_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" BIGSERIAL NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "recipient_user_id" BIGINT NOT NULL,
    "related_entity_type" VARCHAR(100),
    "related_entity_id" BIGINT,
    "payload" TEXT,
    "status" "NotificationEventStatus" NOT NULL DEFAULT 'queued',
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" BIGSERIAL NOT NULL,
    "event_id" BIGINT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient_address" VARCHAR(500) NOT NULL,
    "status" "NotificationLogStatus" NOT NULL,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshop_stats_cache" (
    "id" BIGSERIAL NOT NULL,
    "workshop_id" BIGINT NOT NULL,
    "total_registrations" INTEGER NOT NULL DEFAULT 0,
    "confirmed_registrations" INTEGER NOT NULL DEFAULT 0,
    "checked_in_count" INTEGER NOT NULL DEFAULT 0,
    "available_seats" INTEGER NOT NULL DEFAULT 0,
    "fill_rate" DECIMAL(5,2),
    "total_revenue" DECIMAL(12,2),
    "last_refreshed_at" TIMESTAMP(3),

    CONSTRAINT "workshop_stats_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_code_key" ON "rooms"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_student_id_workshop_id_key" ON "registrations"("student_id", "workshop_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_registration_id_key" ON "payments"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_hash_key" ON "idempotency_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_registration_id_key" ON "qr_codes"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_code_key" ON "qr_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "checkins_registration_id_key" ON "checkins"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "workshop_stats_cache_workshop_id_key" ON "workshop_stats_cache"("workshop_id");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_logs" ADD CONSTRAINT "login_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_speakers" ADD CONSTRAINT "workshop_speakers_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_speakers" ADD CONSTRAINT "workshop_speakers_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "speakers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_documents" ADD CONSTRAINT "workshop_documents_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_documents" ADD CONSTRAINT "workshop_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_summaries" ADD CONSTRAINT "ai_summaries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "workshop_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_scanned_by_user_id_fkey" FOREIGN KEY ("scanned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_sync_batches" ADD CONSTRAINT "offline_sync_batches_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "notification_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshop_stats_cache" ADD CONSTRAINT "workshop_stats_cache_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

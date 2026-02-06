-- CreateTable
CREATE TABLE "system_status" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'operational',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_status_pkey" PRIMARY KEY ("id")
);

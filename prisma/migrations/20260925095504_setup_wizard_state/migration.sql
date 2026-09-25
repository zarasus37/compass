-- CreateTable
CREATE TABLE "SetupState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedStep" INTEGER NOT NULL DEFAULT 0,
    "draftJson" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetupState_userId_key" ON "SetupState"("userId");

-- CreateTable
CREATE TABLE "EnvelopeSink" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCents" INTEGER NOT NULL,
    "cadence" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvelopeSink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnvelopeSink_envelopeId_idx" ON "EnvelopeSink"("envelopeId");

-- CreateIndex
CREATE INDEX "EnvelopeSink_userId_idx" ON "EnvelopeSink"("userId");

-- CreateIndex
CREATE INDEX "EnvelopeSink_userId_isArchived_idx" ON "EnvelopeSink"("userId", "isArchived");

-- AddForeignKey
ALTER TABLE "EnvelopeSink" ADD CONSTRAINT "EnvelopeSink_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeSink" ADD CONSTRAINT "EnvelopeSink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

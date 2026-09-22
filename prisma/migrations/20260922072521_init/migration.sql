-- CreateEnum
CREATE TYPE "GoalKind" AS ENUM ('TRANSFER', 'MILESTONE');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('EMERGENCY', 'INVEST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "aiTier" INTEGER NOT NULL DEFAULT 1,
    "routingLevel" INTEGER NOT NULL DEFAULT 1,
    "defaultViewId" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentBalance" INTEGER NOT NULL DEFAULT 0,
    "institution" TEXT,
    "mask" TEXT,
    "routingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envelope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "targetBalance" INTEGER NOT NULL DEFAULT 0,
    "currentBalance" INTEGER NOT NULL DEFAULT 0,
    "planet" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "destinationAccountId" TEXT,
    "enforceHardCap" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "envelopeId" TEXT,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "payee" TEXT NOT NULL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "isPrimaMateria" BOOLEAN NOT NULL DEFAULT false,
    "fromPlanId" TEXT,
    "fromPaycheckId" TEXT,
    "cleared" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaySchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "cadence" TEXT NOT NULL,
    "dueDay" INTEGER,
    "autopay" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'seed',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "envelopeId" TEXT,
    "accountId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "envelopeId" TEXT,
    "planet" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "kind" "GoalKind" NOT NULL DEFAULT 'MILESTONE',
    "goalType" "GoalType",
    "source" TEXT NOT NULL DEFAULT 'seed',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL DEFAULT 'envelope',
    "isArmed" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "pct" INTEGER NOT NULL DEFAULT 0,
    "fixedCents" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "aiTierAtTime" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogDailyRollup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLogDailyRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'GLOBAL_CONFIG',
    "activeEngineLvl" TEXT NOT NULL DEFAULT 'L1',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayPeriod" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ageRange" TEXT,
    "employmentStatus" TEXT,
    "location" TEXT,
    "timeHorizonYears" INTEGER,
    "riskTolerance" TEXT,
    "riskNotes" TEXT,
    "aiTierPref" TEXT,
    "riskComfort" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "auditIdentity" TEXT,
    "auditFindings" TEXT,
    "auditPlan" TEXT,
    "auditFirstStep" TEXT,
    "auditTeaching" TEXT,
    "auditBuiltAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastProvider" TEXT,
    "lastFellBack" BOOLEAN NOT NULL DEFAULT false,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityIncome" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cadence" TEXT,
    "amountDollars" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityExpense" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountDollars" INTEGER NOT NULL,
    "cadence" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityDebt" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "balanceDollars" INTEGER NOT NULL DEFAULT 0,
    "aprPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minPaymentDollars" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityDebt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityAsset" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "balanceDollars" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employerMatchPercent" DOUBLE PRECISION,
    "vestingYears" INTEGER,
    "fundChoices" TEXT,
    "expenseRatioPct" DOUBLE PRECISION,

    CONSTRAINT "IdentityAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityGoal" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetDollars" INTEGER NOT NULL,
    "targetDate" TIMESTAMP(3),
    "perPaycheckDollars" INTEGER,
    "kind" TEXT NOT NULL,
    "goalType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityEvent" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "estimatedCostDollars" INTEGER NOT NULL DEFAULT 0,
    "isFlexible" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentitySpendingHabit" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "habit" TEXT NOT NULL,
    "frequency" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentitySpendingHabit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityHouseholdMember" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "financiallyEntwined" BOOLEAN NOT NULL DEFAULT false,
    "ageRange" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityHouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingMessage" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCallId" TEXT,
    "toolCallsJson" TEXT,
    "seq" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 1,
    "smartAccountAddress" TEXT NOT NULL,
    "signerAddress" TEXT,
    "baseAsset" TEXT NOT NULL DEFAULT 'USDC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "availableBalance" INTEGER NOT NULL DEFAULT 0,
    "settlementReserve" INTEGER NOT NULL DEFAULT 0,
    "deployedToYield" INTEGER NOT NULL DEFAULT 0,
    "accruedYield" INTEGER NOT NULL DEFAULT 0,
    "simulatedApy" DOUBLE PRECISION NOT NULL DEFAULT 0.0352,
    "onChainUsdcBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "onChainBalanceRefreshedAt" TIMESTAMP(3),
    "onChainAUsdcBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "aUsdcBalanceRefreshedAt" TIMESTAMP(3),
    "aUsdcTokenAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultEnvelope" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "compassEnvelopeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "principalAllocated" INTEGER NOT NULL DEFAULT 0,
    "accruedYield" INTEGER NOT NULL DEFAULT 0,
    "reservedForBills" INTEGER NOT NULL DEFAULT 0,
    "availableToReallocate" INTEGER NOT NULL DEFAULT 0,
    "isPolicyLocked" BOOLEAN NOT NULL DEFAULT true,
    "nextObligationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CALM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledBill" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "billerName" TEXT NOT NULL,
    "billerId" TEXT NOT NULL,
    "maskedAccountNumber" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "maxAuthorizedAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "frequency" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "executionWindowStart" TIMESTAMP(3) NOT NULL,
    "executionWindowEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "providerPreference" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "settlementReference" TEXT,
    "appliedYieldCents" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YieldEvent" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "envelopeId" TEXT,
    "asset" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "annualizedRate" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YieldEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestAmount" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "transactionId" TEXT,
    "warningMessage" TEXT,
    "errorMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yieldRoutingStrategy" TEXT NOT NULL DEFAULT 'COMPOUND',
    "riskAcknowledgedAt" TIMESTAMP(3),
    "offRampProvider" TEXT NOT NULL DEFAULT 'MOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT NOT NULL DEFAULT '0 9 * * *',
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "lookAheadDays" INTEGER NOT NULL DEFAULT 1,
    "minReserveCents" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "lastRunError" TEXT,
    "lastRunBillsAffected" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_source_idx" ON "Account"("userId", "source");

-- CreateIndex
CREATE INDEX "Envelope_userId_idx" ON "Envelope"("userId");

-- CreateIndex
CREATE INDEX "Envelope_userId_source_idx" ON "Envelope"("userId", "source");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_envelopeId_idx" ON "Transaction"("envelopeId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "PaySchedule_userId_idx" ON "PaySchedule"("userId");

-- CreateIndex
CREATE INDEX "PaySchedule_isActive_idx" ON "PaySchedule"("isActive");

-- CreateIndex
CREATE INDEX "Bill_userId_idx" ON "Bill"("userId");

-- CreateIndex
CREATE INDEX "Bill_source_idx" ON "Bill"("source");

-- CreateIndex
CREATE INDEX "Bill_userId_source_idx" ON "Bill"("userId", "source");

-- CreateIndex
CREATE INDEX "Bill_userId_sortOrder_idx" ON "Bill"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_isPrimary_idx" ON "Goal"("isPrimary");

-- CreateIndex
CREATE INDEX "Goal_userId_source_idx" ON "Goal"("userId", "source");

-- CreateIndex
CREATE INDEX "AllocationPlan_userId_idx" ON "AllocationPlan"("userId");

-- CreateIndex
CREATE INDEX "AllocationPlan_userId_source_idx" ON "AllocationPlan"("userId", "source");

-- CreateIndex
CREATE INDEX "AllocationRule_planId_idx" ON "AllocationRule"("planId");

-- CreateIndex
CREATE INDEX "AllocationRule_envelopeId_idx" ON "AllocationRule"("envelopeId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLogDailyRollup_userId_dateKey_idx" ON "AuditLogDailyRollup"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "AuditLogDailyRollup_userId_actionType_idx" ON "AuditLogDailyRollup"("userId", "actionType");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLogDailyRollup_userId_dateKey_actionType_key" ON "AuditLogDailyRollup"("userId", "dateKey", "actionType");

-- CreateIndex
CREATE INDEX "PayPeriod_isActive_idx" ON "PayPeriod"("isActive");

-- CreateIndex
CREATE INDEX "PayPeriod_startDate_endDate_idx" ON "PayPeriod"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialIdentity_userId_key" ON "FinancialIdentity"("userId");

-- CreateIndex
CREATE INDEX "FinancialIdentity_userId_idx" ON "FinancialIdentity"("userId");

-- CreateIndex
CREATE INDEX "FinancialIdentity_completedAt_idx" ON "FinancialIdentity"("completedAt");

-- CreateIndex
CREATE INDEX "IdentityIncome_identityId_idx" ON "IdentityIncome"("identityId");

-- CreateIndex
CREATE INDEX "IdentityExpense_identityId_idx" ON "IdentityExpense"("identityId");

-- CreateIndex
CREATE INDEX "IdentityDebt_identityId_idx" ON "IdentityDebt"("identityId");

-- CreateIndex
CREATE INDEX "IdentityAsset_identityId_idx" ON "IdentityAsset"("identityId");

-- CreateIndex
CREATE INDEX "IdentityGoal_identityId_idx" ON "IdentityGoal"("identityId");

-- CreateIndex
CREATE INDEX "IdentityEvent_identityId_idx" ON "IdentityEvent"("identityId");

-- CreateIndex
CREATE INDEX "IdentitySpendingHabit_identityId_idx" ON "IdentitySpendingHabit"("identityId");

-- CreateIndex
CREATE INDEX "IdentityHouseholdMember_identityId_idx" ON "IdentityHouseholdMember"("identityId");

-- CreateIndex
CREATE INDEX "OnboardingMessage_identityId_seq_idx" ON "OnboardingMessage"("identityId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "VaultAccount_userId_key" ON "VaultAccount"("userId");

-- CreateIndex
CREATE INDEX "VaultAccount_status_idx" ON "VaultAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VaultEnvelope_compassEnvelopeId_key" ON "VaultEnvelope"("compassEnvelopeId");

-- CreateIndex
CREATE INDEX "VaultEnvelope_vaultId_idx" ON "VaultEnvelope"("vaultId");

-- CreateIndex
CREATE INDEX "VaultEnvelope_category_idx" ON "VaultEnvelope"("category");

-- CreateIndex
CREATE INDEX "VaultEnvelope_status_idx" ON "VaultEnvelope"("status");

-- CreateIndex
CREATE INDEX "ScheduledBill_vaultId_dueDate_idx" ON "ScheduledBill"("vaultId", "dueDate");

-- CreateIndex
CREATE INDEX "ScheduledBill_vaultId_status_idx" ON "ScheduledBill"("vaultId", "status");

-- CreateIndex
CREATE INDEX "ScheduledBill_envelopeId_idx" ON "ScheduledBill"("envelopeId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledBill_vaultId_billerId_key" ON "ScheduledBill"("vaultId", "billerId");

-- CreateIndex
CREATE INDEX "YieldEvent_vaultId_occurredAt_idx" ON "YieldEvent"("vaultId", "occurredAt");

-- CreateIndex
CREATE INDEX "YieldEvent_envelopeId_occurredAt_idx" ON "YieldEvent"("envelopeId", "occurredAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_billId_idx" ON "PaymentAttempt"("billId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_result_idx" ON "PaymentAttempt"("result");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_providerName_idempotencyKey_key" ON "PaymentAttempt"("providerName", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderEvent_attemptId_occurredAt_idx" ON "ProviderEvent"("attemptId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProviderEvent_providerName_occurredAt_idx" ON "ProviderEvent"("providerName", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "VaultPreferences_userId_key" ON "VaultPreferences"("userId");

-- CreateIndex
CREATE INDEX "VaultPreferences_userId_idx" ON "VaultPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultSchedule_userId_key" ON "VaultSchedule"("userId");

-- CreateIndex
CREATE INDEX "VaultSchedule_userId_idx" ON "VaultSchedule"("userId");

-- CreateIndex
CREATE INDEX "VaultSchedule_enabled_nextRunAt_idx" ON "VaultSchedule"("enabled", "nextRunAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaySchedule" ADD CONSTRAINT "PaySchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaySchedule" ADD CONSTRAINT "PaySchedule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationPlan" ADD CONSTRAINT "AllocationPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRule" ADD CONSTRAINT "AllocationRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AllocationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRule" ADD CONSTRAINT "AllocationRule_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogDailyRollup" ADD CONSTRAINT "AuditLogDailyRollup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialIdentity" ADD CONSTRAINT "FinancialIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityIncome" ADD CONSTRAINT "IdentityIncome_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityExpense" ADD CONSTRAINT "IdentityExpense_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityDebt" ADD CONSTRAINT "IdentityDebt_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityAsset" ADD CONSTRAINT "IdentityAsset_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityGoal" ADD CONSTRAINT "IdentityGoal_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityEvent" ADD CONSTRAINT "IdentityEvent_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentitySpendingHabit" ADD CONSTRAINT "IdentitySpendingHabit_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityHouseholdMember" ADD CONSTRAINT "IdentityHouseholdMember_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingMessage" ADD CONSTRAINT "OnboardingMessage_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "FinancialIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccount" ADD CONSTRAINT "VaultAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultEnvelope" ADD CONSTRAINT "VaultEnvelope_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "VaultAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultEnvelope" ADD CONSTRAINT "VaultEnvelope_compassEnvelopeId_fkey" FOREIGN KEY ("compassEnvelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledBill" ADD CONSTRAINT "ScheduledBill_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "VaultAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledBill" ADD CONSTRAINT "ScheduledBill_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "VaultEnvelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldEvent" ADD CONSTRAINT "YieldEvent_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "VaultAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldEvent" ADD CONSTRAINT "YieldEvent_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "VaultEnvelope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_billId_fkey" FOREIGN KEY ("billId") REFERENCES "ScheduledBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEvent" ADD CONSTRAINT "ProviderEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultPreferences" ADD CONSTRAINT "VaultPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultSchedule" ADD CONSTRAINT "VaultSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

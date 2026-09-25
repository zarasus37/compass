"use server";
/**
 * Setup wizard server actions (Cluster 7.36).
 *
 * Each step has its own action. They validate input, write to Prisma,
 * mark the step as completed, and redirect to the next step.
 *
 * Auth: every action calls requireUser(). The (app) middleware also
 * enforces auth, so this is defense-in-depth.
 *
 * Validation errors throw — the form catches them with error.tsx.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/user";
import { prisma } from "@/server/db";
import { markStepCompleted, activateSetup, type WizardStep } from "@/lib/setup/state";

// ── helpers ─────────────────────────────────────────────────────────

function parseDollars(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const n = Number.parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

function parseInt10(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

// ── STEP 1: pay schedule ───────────────────────────────────────────

export async function savePayScheduleAction(formData: FormData) {
  const user = await requireUser();

  const cadence = String(formData.get("cadence") ?? "");
  const amountDollars = parseDollars(formData.get("amount"));
  const sourceLabel = String(formData.get("sourceLabel") ?? "Primary").trim();
  const directDeposit = formData.get("directDeposit") === "yes";
  const startDateRaw = String(formData.get("startDate") ?? "");

  const validCadences = ["weekly", "biweekly", "semi_monthly", "monthly", "irregular"];
  if (!validCadences.includes(cadence)) {
    throw new Error("Pick a cadence.");
  }
  if (amountDollars == null || amountDollars < 0) {
    throw new Error("Take-home must be $0 or more.");
  }
  if (sourceLabel.length === 0) {
    throw new Error("Give the source a name.");
  }
  if (!startDateRaw) {
    throw new Error("Pick an anchor date.");
  }
  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Anchor date is invalid.");
  }

  // Make sure the user has a primary checking account (step 2 may add more).
  let primary = await prisma.account.findFirst({
    where: { userId: user.id, type: "checking" },
  });
  if (!primary) {
    primary = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Primary Checking",
        type: "checking",
        currentBalance: 0,
        source: "user",
      },
    });
  }

  const existing = await prisma.paySchedule.findFirst({ where: { userId: user.id } });
  const amountCents = Math.round(amountDollars * 100);
  if (existing) {
    await prisma.paySchedule.update({
      where: { id: existing.id },
      data: { cadence, amount: amountCents, accountId: primary.id, startDate },
    });
  } else {
    await prisma.paySchedule.create({
      data: {
        userId: user.id,
        cadence,
        amount: amountCents,
        accountId: primary.id,
        startDate,
      },
    });
  }

  const state = await prisma.setupState.findUnique({ where: { userId: user.id } });
  const draft = state?.draftJson ? JSON.parse(state.draftJson) : {};
  draft.paySchedule = {
    cadence,
    amountCents,
    sourceLabel,
    directDeposit,
  };
  await prisma.setupState.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      completedStep: 1,
      draftJson: JSON.stringify(draft),
    },
    update: {
      completedStep: 1,
      draftJson: JSON.stringify(draft),
    },
  });

  await markStepCompleted(user.id, 1 as WizardStep);
  revalidatePath("/setup");
  redirect("/setup/accounts");
}

// ── STEP 2: accounts ────────────────────────────────────────────────

export async function saveAccountsAction(formData: FormData) {
  const user = await requireUser();

  // Make sure the primary checking account exists.
  let primary = await prisma.account.findFirst({
    where: { userId: user.id, type: "checking" },
  });
  if (!primary) {
    primary = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Primary Checking",
        type: "checking",
        currentBalance: 0,
        source: "user",
      },
    });
  }

  // Read the user's accounts + apply edits.
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { type: "asc" },
  });

  for (const acc of accounts) {
    const raw = formData.get(`balance_${acc.id}`);
    if (raw == null) continue;
    const dollars = parseDollars(raw);
    if (dollars == null || dollars < 0) continue;
    await prisma.account.update({
      where: { id: acc.id },
      data: { currentBalance: Math.round(dollars * 100) },
    });
  }

  await markStepCompleted(user.id, 2 as WizardStep);
  revalidatePath("/setup");
  redirect("/setup/envelopes");
}

// ── STEP 3: envelopes ───────────────────────────────────────────────

export async function saveEnvelopesAction(formData: FormData) {
  const user = await requireUser();
  const { ensureUserEnvelopesSeeded } = await import("@/lib/store");
  await ensureUserEnvelopesSeeded(user.id);

  const envs = await prisma.envelope.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
  });

  for (const env of envs) {
    const name = String(formData.get(`name_${env.id}`) ?? env.name).trim();
    const targetDollars = parseDollars(formData.get(`target_${env.id}`));
    const currentDollars = parseDollars(formData.get(`current_${env.id}`));
    const data: { name?: string; targetBalance?: number; currentBalance?: number } = {};
    if (name.length > 0 && name !== env.name) data.name = name;
    if (targetDollars != null && targetDollars >= 0) {
      data.targetBalance = Math.round(targetDollars * 100);
    }
    if (currentDollars != null && currentDollars >= 0) {
      data.currentBalance = Math.round(currentDollars * 100);
    }
    if (Object.keys(data).length > 0) {
      await prisma.envelope.update({ where: { id: env.id }, data });
    }
  }

  await markStepCompleted(user.id, 3 as WizardStep);
  revalidatePath("/setup");
  redirect("/setup/bills");
}

// ── STEP 4: bills ───────────────────────────────────────────────────

export async function saveBillsAction(formData: FormData) {
  const user = await requireUser();

  const billIds = formData.getAll("billId").map(String).filter(Boolean);
  for (const billId of billIds) {
    const remove = formData.get(`remove_${billId}`) === "1";
    if (remove) {
      await prisma.bill.delete({ where: { id: billId } }).catch(() => null);
      continue;
    }
    const amount = parseDollars(formData.get(`amount_${billId}`));
    const dueDay = parseInt10(formData.get(`dueDay_${billId}`));
    const data: { amountCents?: number; dueDay?: number | null } = {};
    if (amount != null && amount >= 0) data.amountCents = Math.round(amount * 100);
    if (dueDay != null && dueDay >= 1 && dueDay <= 31) data.dueDay = dueDay;
    if (Object.keys(data).length > 0) {
      await prisma.bill.update({ where: { id: billId }, data }).catch(() => null);
    }
  }

  await markStepCompleted(user.id, 4 as WizardStep);
  revalidatePath("/setup");
  redirect("/setup/goals");
}

// ── STEP 5: goals ───────────────────────────────────────────────────

export async function saveGoalsAction(formData: FormData) {
  const user = await requireUser();

  const goalIds = formData.getAll("goalId").map(String).filter(Boolean);
  for (const goalId of goalIds) {
    const name = String(formData.get(`name_${goalId}`) ?? "").trim();
    const target = parseDollars(formData.get(`target_${goalId}`));
    const data: { name?: string; targetAmount?: number } = {};
    if (name.length > 0) data.name = name;
    if (target != null && target >= 0) data.targetAmount = Math.round(target * 100);
    if (Object.keys(data).length > 0) {
      await prisma.goal.update({ where: { id: goalId }, data }).catch(() => null);
    }
  }

  await markStepCompleted(user.id, 5 as WizardStep);
  revalidatePath("/setup");
  redirect("/setup");
}

// ── activate plan ───────────────────────────────────────────────────

export async function activatePlanAction() {
  const user = await requireUser();
  await activateSetup(user.id);
  revalidatePath("/setup");
  redirect("/");
}

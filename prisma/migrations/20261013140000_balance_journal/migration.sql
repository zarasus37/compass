-- FIN-02-A. Additive, atomic cutover; never recompute or rewrite a balance.
-- User lock also drains erasure before opening rows acquire user foreign keys.
BEGIN;
SET LOCAL lock_timeout = '10s';
LOCK TABLE public."User", public."Account", public."Envelope" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS public."LedgerEvent" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "sourceType" TEXT, "sourceId" TEXT, "reason" TEXT NOT NULL, "actor" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public."LedgerPosition" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "entityKind" TEXT NOT NULL,
 "entityId" TEXT NOT NULL, "openingCents" BIGINT NOT NULL,
 "legacyActivityCount" BIGINT NOT NULL DEFAULT 0, "lastSequence" BIGINT NOT NULL DEFAULT 0,
 "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "removedAt" TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS public."LedgerEntry" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "positionId" TEXT NOT NULL,
 "eventId" TEXT NOT NULL, "sequence" BIGINT NOT NULL, "kind" TEXT NOT NULL,
 "deltaCents" BIGINT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEvent_id_userId_key" ON public."LedgerEvent"("id","userId");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEvent_userId_sourceType_sourceId_key" ON public."LedgerEvent"("userId","sourceType","sourceId");
CREATE INDEX IF NOT EXISTS "LedgerEvent_userId_createdAt_idx" ON public."LedgerEvent"("userId","createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerPosition_id_userId_key" ON public."LedgerPosition"("id","userId");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerPosition_userId_entityKind_entityId_key" ON public."LedgerPosition"("userId","entityKind","entityId");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_positionId_sequence_key" ON public."LedgerEntry"("positionId","sequence");
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_eventId_idx" ON public."LedgerEntry"("userId","eventId");
DO $$ BEGIN
 ALTER TABLE public."LedgerEvent" ADD CONSTRAINT "LedgerEvent_userId_fkey" FOREIGN KEY("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE public."LedgerPosition" ADD CONSTRAINT "LedgerPosition_userId_fkey" FOREIGN KEY("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE public."LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE public."LedgerEntry" ADD CONSTRAINT "LedgerEntry_positionId_userId_fkey" FOREIGN KEY("positionId","userId") REFERENCES public."LedgerPosition"("id","userId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
 ALTER TABLE public."LedgerEntry" ADD CONSTRAINT "LedgerEntry_eventId_userId_fkey" FOREIGN KEY("eventId","userId") REFERENCES public."LedgerEvent"("id","userId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only the initial installation anchors history. Reapplying never overwrites
-- an opening or "repairs" missing entries. Existing db-push tables are supported.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname='compass_account_ledger_insert' AND tgrelid='public."Account"'::regclass) THEN
  INSERT INTO public."LedgerPosition"("id","userId","entityKind","entityId","openingCents","legacyActivityCount","openedAt")
  SELECT gen_random_uuid()::text,a."userId",'account',a."id",a."currentBalance"::bigint,
   (SELECT count(*) FROM public."Transaction" t WHERE t."userId"=a."userId" AND t."accountId"=a."id"),clock_timestamp()
  FROM public."Account" a;
  INSERT INTO public."LedgerPosition"("id","userId","entityKind","entityId","openingCents","legacyActivityCount","openedAt")
  SELECT gen_random_uuid()::text,e."userId",'envelope',e."id",e."currentBalance"::bigint,
   (SELECT count(*) FROM public."Transaction" t WHERE t."userId"=e."userId" AND t."envelopeId"=e."id"),clock_timestamp()
  FROM public."Envelope" e;
  INSERT INTO public."LedgerEvent"("id","userId","kind","sourceType","sourceId","reason","actor")
  SELECT gen_random_uuid()::text,p."userId",'opening_unverified','opening:'||p."entityKind",p."entityId",'Existing stored balance; history and settlement unverified','migration'
  FROM public."LedgerPosition" p;
  INSERT INTO public."LedgerEntry"("id","userId","positionId","eventId","sequence","kind","deltaCents")
  SELECT gen_random_uuid()::text,p."userId",p."id",e."id",0,'opening',p."openingCents"
  FROM public."LedgerPosition" p JOIN public."LedgerEvent" e ON e."userId"=p."userId" AND e."sourceType"='opening:'||p."entityKind" AND e."sourceId"=p."entityId";
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.compass_ledger_append(entity_kind text, entity_id text, owner_id text, old_cents bigint, new_cents bigint, operation text) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
 pos public."LedgerPosition"%ROWTYPE;
 event_id text; context_id text; entry_kind text; seq bigint;
BEGIN
 -- During whole-user erasure the parent is already invisible to this session.
 -- Cascades erase journal rows too; do not insert a closing row against that FK.
 IF NOT EXISTS (SELECT 1 FROM public."User" WHERE "id"=owner_id) THEN RETURN; END IF;
 SELECT * INTO pos FROM public."LedgerPosition" WHERE "userId"=owner_id AND "entityKind"=entity_kind AND "entityId"=entity_id FOR UPDATE;
 context_id:=nullif(current_setting('compass.event_id',true),'');
 IF context_id IS NOT NULL THEN
  SELECT "id" INTO event_id FROM public."LedgerEvent" WHERE "id"=context_id AND "userId"=owner_id;
  IF event_id IS NULL THEN RAISE EXCEPTION 'Ledger event context does not belong to entity owner'; END IF;
 ELSE
  event_id:=gen_random_uuid()::text;
  INSERT INTO public."LedgerEvent"("id","userId","kind","reason","actor")
  VALUES(event_id,owner_id,'uncorrelated','Balance changed without application event context','database');
 END IF;
 IF operation='INSERT' AND pos."id" IS NULL THEN
  INSERT INTO public."LedgerPosition"("id","userId","entityKind","entityId","openingCents","openedAt")
  VALUES(gen_random_uuid()::text,owner_id,entity_kind,entity_id,new_cents,clock_timestamp()) RETURNING * INTO pos;
  seq:=0; entry_kind:='opening';
 ELSIF pos."id" IS NULL THEN
  RAISE EXCEPTION 'Ledger opening is missing; balance mutation refused';
 ELSE
  IF operation='INSERT' AND pos."removedAt" IS NULL THEN RAISE EXCEPTION 'Ledger entity already exists'; END IF;
  IF operation<>'INSERT' AND pos."removedAt" IS NOT NULL THEN RAISE EXCEPTION 'Ledger entity is marked removed'; END IF;
  UPDATE public."LedgerPosition" SET "lastSequence"="lastSequence"+1,
   "removedAt"=CASE WHEN operation='DELETE' THEN clock_timestamp() ELSE NULL END
   WHERE "id"=pos."id" RETURNING "lastSequence" INTO seq;
  entry_kind:=CASE operation WHEN 'DELETE' THEN 'close' WHEN 'INSERT' THEN 'reopen' ELSE 'change' END;
 END IF;
 INSERT INTO public."LedgerEntry"("id","userId","positionId","eventId","sequence","kind","deltaCents")
 VALUES(gen_random_uuid()::text,owner_id,pos."id",event_id,seq,entry_kind,new_cents-old_cents);
 RETURN;
END $$;

CREATE OR REPLACE FUNCTION public.compass_ledger_capture() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  PERFORM public.compass_ledger_append(TG_ARGV[0],NEW."id",NEW."userId",0,NEW."currentBalance"::bigint,'INSERT');
 ELSIF TG_OP='DELETE' THEN
  PERFORM public.compass_ledger_append(TG_ARGV[0],OLD."id",OLD."userId",OLD."currentBalance"::bigint,0,'DELETE');
 ELSIF OLD."userId" IS DISTINCT FROM NEW."userId" THEN
  -- Administrative reassignment closes the old owner's tracking position and
  -- opens/reopens the new owner's. It is not evidence of an external payment.
  PERFORM public.compass_ledger_append(TG_ARGV[0],OLD."id",OLD."userId",OLD."currentBalance"::bigint,0,'DELETE');
  PERFORM public.compass_ledger_append(TG_ARGV[0],NEW."id",NEW."userId",0,NEW."currentBalance"::bigint,'INSERT');
 ELSE
  PERFORM public.compass_ledger_append(TG_ARGV[0],NEW."id",NEW."userId",OLD."currentBalance"::bigint,NEW."currentBalance"::bigint,'UPDATE');
 END IF;
 RETURN NULL;
END $$;

-- Protect anchors, history and headers from ordinary application SQL. These
-- guards are operational integrity, not a defence against a privileged DB owner
-- who can alter triggers. Availability checks and reconciliation detect bypass.
CREATE OR REPLACE FUNCTION public.compass_ledger_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE owner_id text;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Ledger history cannot be truncated'; END IF;
 IF TG_OP='DELETE' THEN
  owner_id:=OLD."userId";
  IF NOT EXISTS(SELECT 1 FROM public."User" WHERE "id"=owner_id) THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Ledger history is append-only; only whole-user erasure may delete';
 END IF;
 IF TG_TABLE_NAME='LedgerEvent' THEN RAISE EXCEPTION 'Ledger event is immutable'; END IF;
 IF pg_trigger_depth()<2 THEN RAISE EXCEPTION 'Ledger changes require a balance capture trigger'; END IF;
 IF TG_TABLE_NAME='LedgerEntry' AND TG_OP='UPDATE' THEN RAISE EXCEPTION 'Ledger entries are immutable'; END IF;
 IF TG_TABLE_NAME='LedgerPosition' THEN
  IF TG_OP='UPDATE' THEN
   IF (OLD."id",OLD."userId",OLD."entityKind",OLD."entityId",OLD."openingCents",OLD."openedAt",OLD."legacyActivityCount") IS DISTINCT FROM
      (NEW."id",NEW."userId",NEW."entityKind",NEW."entityId",NEW."openingCents",NEW."openedAt",NEW."legacyActivityCount") THEN
    RAISE EXCEPTION 'Ledger opening is immutable';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.compass_ledger_identity_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'Journalled tables require row deletion or whole-user erasure'; END IF;
 IF OLD."id" IS DISTINCT FROM NEW."id" THEN RAISE EXCEPTION 'Journalled entity identity is immutable'; END IF;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS compass_account_ledger_insert ON public."Account";
CREATE TRIGGER compass_account_ledger_insert AFTER INSERT ON public."Account" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_capture('account');
DROP TRIGGER IF EXISTS compass_account_ledger_update ON public."Account";
CREATE TRIGGER compass_account_ledger_update AFTER UPDATE ON public."Account" FOR EACH ROW WHEN (OLD."currentBalance" IS DISTINCT FROM NEW."currentBalance" OR OLD."userId" IS DISTINCT FROM NEW."userId") EXECUTE FUNCTION public.compass_ledger_capture('account');
DROP TRIGGER IF EXISTS compass_account_ledger_delete ON public."Account";
CREATE TRIGGER compass_account_ledger_delete AFTER DELETE ON public."Account" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_capture('account');
DROP TRIGGER IF EXISTS compass_envelope_ledger_insert ON public."Envelope";
CREATE TRIGGER compass_envelope_ledger_insert AFTER INSERT ON public."Envelope" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_capture('envelope');
DROP TRIGGER IF EXISTS compass_envelope_ledger_update ON public."Envelope";
CREATE TRIGGER compass_envelope_ledger_update AFTER UPDATE ON public."Envelope" FOR EACH ROW WHEN (OLD."currentBalance" IS DISTINCT FROM NEW."currentBalance" OR OLD."userId" IS DISTINCT FROM NEW."userId") EXECUTE FUNCTION public.compass_ledger_capture('envelope');
DROP TRIGGER IF EXISTS compass_envelope_ledger_delete ON public."Envelope";
CREATE TRIGGER compass_envelope_ledger_delete AFTER DELETE ON public."Envelope" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_capture('envelope');
DROP TRIGGER IF EXISTS compass_ledger_event_guard ON public."LedgerEvent";
CREATE TRIGGER compass_ledger_event_guard BEFORE UPDATE OR DELETE ON public."LedgerEvent" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_guard();
DROP TRIGGER IF EXISTS compass_ledger_position_guard ON public."LedgerPosition";
CREATE TRIGGER compass_ledger_position_guard BEFORE INSERT OR UPDATE OR DELETE ON public."LedgerPosition" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_guard();
DROP TRIGGER IF EXISTS compass_ledger_entry_guard ON public."LedgerEntry";
CREATE TRIGGER compass_ledger_entry_guard BEFORE INSERT OR UPDATE OR DELETE ON public."LedgerEntry" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_guard();
DROP TRIGGER IF EXISTS compass_ledger_event_truncate ON public."LedgerEvent";
CREATE TRIGGER compass_ledger_event_truncate BEFORE TRUNCATE ON public."LedgerEvent" EXECUTE FUNCTION public.compass_ledger_guard();
DROP TRIGGER IF EXISTS compass_ledger_position_truncate ON public."LedgerPosition";
CREATE TRIGGER compass_ledger_position_truncate BEFORE TRUNCATE ON public."LedgerPosition" EXECUTE FUNCTION public.compass_ledger_guard();
DROP TRIGGER IF EXISTS compass_ledger_entry_truncate ON public."LedgerEntry";
CREATE TRIGGER compass_ledger_entry_truncate BEFORE TRUNCATE ON public."LedgerEntry" EXECUTE FUNCTION public.compass_ledger_guard();
DROP TRIGGER IF EXISTS compass_account_ledger_identity ON public."Account";
CREATE TRIGGER compass_account_ledger_identity BEFORE UPDATE OF "id" ON public."Account" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_identity_guard();
DROP TRIGGER IF EXISTS compass_envelope_ledger_identity ON public."Envelope";
CREATE TRIGGER compass_envelope_ledger_identity BEFORE UPDATE OF "id" ON public."Envelope" FOR EACH ROW EXECUTE FUNCTION public.compass_ledger_identity_guard();
DROP TRIGGER IF EXISTS compass_account_ledger_truncate ON public."Account";
CREATE TRIGGER compass_account_ledger_truncate BEFORE TRUNCATE ON public."Account" EXECUTE FUNCTION public.compass_ledger_identity_guard();
DROP TRIGGER IF EXISTS compass_envelope_ledger_truncate ON public."Envelope";
CREATE TRIGGER compass_envelope_ledger_truncate BEFORE TRUNCATE ON public."Envelope" EXECUTE FUNCTION public.compass_ledger_identity_guard();
DROP TRIGGER IF EXISTS compass_user_ledger_truncate ON public."User";
CREATE TRIGGER compass_user_ledger_truncate BEFORE TRUNCATE ON public."User" EXECUTE FUNCTION public.compass_ledger_identity_guard();
COMMIT;

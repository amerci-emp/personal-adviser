-- Security Policies for Personal Adviser Application
-- Run this script in your Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Statement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoogleSheetConfig" ENABLE ROW LEVEL SECURITY;

-- User table policies
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

-- Account table policies (NextAuth)
CREATE POLICY "Users can view own accounts" ON "Account"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own accounts" ON "Account"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own accounts" ON "Account"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own accounts" ON "Account"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Session table policies (NextAuth)
CREATE POLICY "Users can view own sessions" ON "Session"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own sessions" ON "Session"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own sessions" ON "Session"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own sessions" ON "Session"
  FOR DELETE USING (auth.uid()::text = "userId");

-- BankAccount table policies
CREATE POLICY "Users can view own bank accounts" ON "BankAccount"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own bank accounts" ON "BankAccount"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own bank accounts" ON "BankAccount"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own bank accounts" ON "BankAccount"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Statement table policies
CREATE POLICY "Users can view own statements" ON "Statement"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own statements" ON "Statement"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own statements" ON "Statement"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own statements" ON "Statement"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Transaction table policies
CREATE POLICY "Users can view own transactions" ON "Transaction"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Statement" 
      WHERE "Statement".id = "Transaction"."statementId" 
      AND "Statement"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own transactions" ON "Transaction"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Statement" 
      WHERE "Statement".id = "Transaction"."statementId" 
      AND "Statement"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own transactions" ON "Transaction"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Statement" 
      WHERE "Statement".id = "Transaction"."statementId" 
      AND "Statement"."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own transactions" ON "Transaction"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "Statement" 
      WHERE "Statement".id = "Transaction"."statementId" 
      AND "Statement"."userId" = auth.uid()::text
    )
  );

-- Category table policies
CREATE POLICY "Users can view own categories" ON "Category"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own categories" ON "Category"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own categories" ON "Category"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own categories" ON "Category"
  FOR DELETE USING (auth.uid()::text = "userId");

-- GoogleSheetConfig table policies
CREATE POLICY "Users can view own google config" ON "GoogleSheetConfig"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own google config" ON "GoogleSheetConfig"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own google config" ON "GoogleSheetConfig"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own google config" ON "GoogleSheetConfig"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Storage policies for statements bucket
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'statements' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'statements' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'statements' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'statements' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  ); 
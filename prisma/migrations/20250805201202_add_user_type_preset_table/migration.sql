-- CreateTable
CREATE TABLE "public"."UserTypePreset" (
    "id" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTypePreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTypePreset_userType_idx" ON "public"."UserTypePreset"("userType");

-- CreateIndex
CREATE INDEX "UserTypePreset_userType_isDefault_idx" ON "public"."UserTypePreset"("userType", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "UserTypePreset_userType_categoryId_key" ON "public"."UserTypePreset"("userType", "categoryId");

-- AddForeignKey
ALTER TABLE "public"."UserTypePreset" ADD CONSTRAINT "UserTypePreset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

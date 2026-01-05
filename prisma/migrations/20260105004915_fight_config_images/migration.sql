-- CreateTable
CREATE TABLE "FightConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "headerImageUrl" TEXT NOT NULL DEFAULT '',
    "headerImageUrl2" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FightConfig_pkey" PRIMARY KEY ("id")
);

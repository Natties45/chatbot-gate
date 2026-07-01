-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "model" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "provider" TEXT;

-- CreateTable
CREATE TABLE "ToolCallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "messageId" TEXT,
    "serverName" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "inputJson" TEXT,
    "outputText" TEXT,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ToolCallLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LlmCallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LlmCallLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

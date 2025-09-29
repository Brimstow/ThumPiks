-- CreateTable
CREATE TABLE "SocialShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "thumbnailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "shareUrl" TEXT,
    "shareId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sharedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "engagement" JSONB,
    CONSTRAINT "SocialShare_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Thumbnail" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SocialShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "room" TEXT,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "brandModel" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" DATE,
    "purchaseLocation" TEXT,
    "originalCost" DECIMAL(12,2),
    "estimatedCurrentValue" DECIMAL(12,2),
    "receiptPhotoFileName" TEXT,
    "condition" TEXT,
    "notes" TEXT,
    "sourceFile" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_room_idx" ON "inventory_items"("room");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sourceFile_sourceRow_key" ON "inventory_items"("sourceFile", "sourceRow");

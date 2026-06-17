import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { parse } from "csv-parse";

type CsvRow = {
  Room?: string;
  "Category (Furniture, Electronics, Jewelry, etc.)"?: string;
  "Item Description"?: string;
  "Brand/Model"?: string;
  "Serial Number"?: string;
  "Purchase Date"?: string;
  "Purchase Location"?: string;
  "Original Cost ($)"?: string;
  "Estimated Current Value ($)"?: string;
  "Receipt/Photo File Name"?: string;
  Condition?: string;
  Notes?: string;
};

const prisma = new PrismaClient();

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function money(value: string | undefined): Decimal | undefined {
  const normalized = value?.replace(/[$,\s]/g, "");
  if (!normalized || Number.isNaN(Number(normalized))) {
    return undefined;
  }

  return new Decimal(normalized);
}

function purchaseDate(value: string | undefined): Date | undefined {
  const normalized = optional(value);
  if (!normalized) {
    return undefined;
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(normalized);
  if (!match) {
    return undefined;
  }

  const month = match[1];
  const day = match[2];
  const rawYear = match[3];
  if (!month || !day || !rawYear) {
    return undefined;
  }

  const numericYear = Number(rawYear);
  const year = rawYear.length === 2 ? 2000 + numericYear : numericYear;
  const parsed = new Date(Date.UTC(year, Number(month) - 1, Number(day)));

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function main(): Promise<void> {
  const dryRun = process.env.SEED_DRY_RUN === "true";
  const csvPath = path.resolve(
    process.env.SEED_CSV_PATH ??
      "packages/database/data/home-inventory.csv"
  );

  await access(csvPath);

  const sourceFile = path.basename(csvPath);
  const parser = createReadStream(csvPath).pipe(
    parse({
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
  );

  let sourceRow = 1;
  let imported = 0;
  let skipped = 0;

  for await (const row of parser as AsyncIterable<CsvRow>) {
    sourceRow += 1;

    const room = optional(row.Room);
    const category = optional(
      row["Category (Furniture, Electronics, Jewelry, etc.)"]
    );
    const description = optional(row["Item Description"]);

    if (!description) {
      skipped += 1;
      continue;
    }

    const data = {
      room,
      category,
      description,
      brandModel: optional(row["Brand/Model"]),
      serialNumber: optional(row["Serial Number"]),
      purchaseDate: purchaseDate(row["Purchase Date"]),
      purchaseLocation: optional(row["Purchase Location"]),
      originalCost: money(row["Original Cost ($)"]),
      estimatedCurrentValue: money(row["Estimated Current Value ($)"]),
      receiptPhotoFileName: optional(row["Receipt/Photo File Name"]),
      condition: optional(row.Condition),
      notes: optional(row.Notes)
    };

    if (!dryRun) {
      await prisma.inventoryItem.upsert({
        where: {
          sourceFile_sourceRow: {
            sourceFile,
            sourceRow
          }
        },
        create: {
          ...data,
          sourceFile,
          sourceRow
        },
        update: data
      });
    }

    imported += 1;
  }

  console.log(
    `${dryRun ? "Validated" : "Seeded"} ${imported} inventory items from ` +
      `${sourceFile}; skipped ${skipped}.`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

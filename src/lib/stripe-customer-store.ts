import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type CustomerRecord = {
  stripeCustomerId: string;
  updatedAt: string;
};

type StoreShape = {
  byUserId: Record<string, CustomerRecord>;
};

function storePath(): string {
  return path.join(process.cwd(), ".data", "stripe-customers.json");
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || typeof parsed !== "object" || !parsed.byUserId) {
      return { byUserId: {} };
    }
    return parsed;
  } catch {
    return { byUserId: {} };
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  const dir = path.dirname(storePath());
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function getStripeCustomerIdForUser(
  userId: string,
): Promise<string | null> {
  const store = await readStore();
  const id = store.byUserId[userId]?.stripeCustomerId?.trim();
  return id && /^cus_[A-Za-z0-9]+$/.test(id) ? id : null;
}

export async function setStripeCustomerIdForUser(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const id = stripeCustomerId.trim();
  if (!/^cus_[A-Za-z0-9]+$/.test(id)) {
    throw new Error("Invalid stripeCustomerId");
  }
  const store = await readStore();
  store.byUserId[userId] = {
    stripeCustomerId: id,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
}

export async function clearStripeCustomerIdForUser(
  userId: string,
): Promise<void> {
  const store = await readStore();
  delete store.byUserId[userId];
  await writeStore(store);
}

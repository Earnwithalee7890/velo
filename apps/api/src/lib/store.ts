/**
 * In-memory store for pending/settled cash requests.
 *
 * TODO (production): replace with a real database. This resets on every
 * server restart and does not scale past a single process — it exists
 * only to prove the lock -> release flow end-to-end over HTTP.
 */
export interface CashRequestRecord {
    id: string; // trade id, hex
    contractId: string;
    seller: string;
    buyer: string;
    amountStroops: string; // bigint as string, JSON-safe
    secretHex: string; // TODO: don't store server-side long-term — see note below
    secretHashHex: string;
    status: "locked" | "released" | "refunded";
    createdAt: string;
}

export interface ProviderRecord {
    id: string;
    name: string;
    lat: number;
    lng: number;
    tier: string;
    rate: string;
    status: "available" | "unavailable";
    createdAt: string;
}

const store = new Map<string, CashRequestRecord>();
const providersStore = new Map<string, ProviderRecord>();

export function saveCashRequest(record: CashRequestRecord) {
    store.set(record.id, record);
}

export function saveProvider(record: ProviderRecord) {
    providersStore.set(record.id, record);
}

export function getProviders(): ProviderRecord[] {
    return Array.from(providersStore.values());
}

export function getCashRequest(id: string): CashRequestRecord | undefined {
    return store.get(id);
}

export function updateStatus(id: string, status: CashRequestRecord["status"]) {
    const record = store.get(id);
    if (record) record.status = status;
}

export function getProviderTrades(sellerAddress: string): CashRequestRecord[] {
    return Array.from(store.values()).filter(
        record => record.seller === sellerAddress
    );
}

export interface RecentActivityItem {
    id: string;
    status: CashRequestRecord["status"];
    createdAt: string;
}

/**
 * Sanitized feed of the most recent trades for the public status page.
 *
 * Deliberately omits seller/buyer addresses, amounts, and secret material —
 * only the trade id (already public via /claim/:id links), its status, and
 * its timestamp. This gives a rough sense of on-chain activity without
 * letting anyone enumerate counterparty addresses or trade sizes.
 */
export function getRecentActivity(limit = 10): RecentActivityItem[] {
    return Array.from(store.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
        .map(({ id, status, createdAt }) => ({ id, status, createdAt }));
}

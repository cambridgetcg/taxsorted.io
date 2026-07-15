// Kept separate from the full server config so database-only operator tools do
// not load unrelated API datasets.
export const databaseUrl = process.env.DATABASE_URL || "";

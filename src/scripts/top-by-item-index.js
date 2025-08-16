// File path: src/scripts/hasura/top-by-item-index.js
// Usage: pnpm top-by-item -- <index> [--limit 10] [--batch 1000] [--min 0]
// Example: pnpm top-by-item -- 42 --limit 20

const HASURA_GRAPHQL_ENDPOINT = 'https://graph.onchainsuperheroes.xyz/v1/graphql';
const HASURA_ADMIN_SECRET = 'hasura_admin_JTlvlXn4qkkdmVwpTIpgzqkiTj2w7reRaIl';

const DEFAULT_LIMIT = 10;
const DEFAULT_BATCH = 1000;

function parseArgs(argv) {
  const args = { index: undefined, limit: DEFAULT_LIMIT, batch: DEFAULT_BATCH, min: '0' };
  const positional = [];

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') {
      args.limit = parseInt(argv[++i] ?? `${DEFAULT_LIMIT}`, 10);
      continue;
    }
    if (a === '--batch') {
      args.batch = parseInt(argv[++i] ?? `${DEFAULT_BATCH}`, 10);
      continue;
    }
    if (a === '--min') {
      args.min = String(argv[++i] ?? '0');
      continue;
    }
    positional.push(a);
  }

  if (positional.length === 0) {
    throw new Error('Missing required <index> argument');
  }
  const idx = Number(positional[0]);
  if (!Number.isInteger(idx) || idx < 0) {
    throw new Error('Index must be a non-negative integer');
  }
  args.index = idx;
  return args;
}

async function postGraphQL(query, variables) {
  const res = await fetch(HASURA_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
}

const LIST_PLAYERS = `
  query ListPlayers($limit: Int!, $offset: Int!) {
    Player(limit: $limit, offset: $offset, order_by: { id: asc }) {
      id
      itemsBalances
    }
  }
`;

async function fetchAllPlayers(batchSize) {
  const result = [];
  let offset = 0;
  for (;;) {
    const data = await postGraphQL(LIST_PLAYERS, { limit: batchSize, offset });
    const rows = data.Player ?? [];
    if (rows.length === 0) break;
    result.push(...rows);
    offset += rows.length;
    if (rows.length < batchSize) break;
  }
  // Deduplicate by id (defensive in case of unstable pagination or duplicates)
  const seen = new Set();
  const unique = [];
  for (const p of result) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    unique.push(p);
  }
  return unique;
}

function getItemAtIndex(itemsBalances, index) {
  if (!Array.isArray(itemsBalances)) return '0';
  if (index < 0 || index >= itemsBalances.length) return '0';
  const v = itemsBalances[index];
  if (v == null) return '0';
  return typeof v === 'string' ? v : String(v);
}

function compareBigIntDesc(a, b) {
  const ai = BigInt(a.amount);
  const bi = BigInt(b.amount);
  if (ai === bi) return 0;
  return ai > bi ? -1 : 1;
}

(async () => {
  try {
    const { index, limit, batch, min } = parseArgs(process.argv);

    console.error(`Fetching players in batches of ${batch} from Hasura...`);
    const players = await fetchAllPlayers(batch);
    console.error(`Fetched ${players.length} unique players. Computing rankings for itemsBalances[${index}] ...`);

    // Total amount across all players
    const totalAmount = players.reduce((acc, p) => {
      const v = getItemAtIndex(p.itemsBalances, index);
      return acc + BigInt(v);
    }, 0n);

    const rows = players.map((p) => ({
      id: p.id,
      amount: getItemAtIndex(p.itemsBalances, index),
    })).filter((r) => BigInt(r.amount) >= BigInt(min));

    rows.sort(compareBigIntDesc);
    const top = rows.slice(0, limit);

    // Pretty print
    console.log(JSON.stringify({
      index,
      limit,
      min,
      totalPlayers: players.length,
      totalAmount: totalAmount.toString(),
      top: top.map((r, i) => ({ rank: i + 1, playerId: r.id, amount: r.amount })),
    }, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Usage: pnpm top-by-item -- <index> [--limit 10] [--batch 1000] [--min 0]');
    process.exit(1);
  }
})();



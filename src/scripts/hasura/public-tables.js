const ROLE_NAME = process.env.HASURA_ROLE || 'public';
const CHUNK_SIZE = 10;

const endpointCandidates = [
  process.env.HASURA_ENDPOINT,
  process.env.HASURA_METADATA_ENDPOINT,
  process.env.HASURA_GRAPHQL_URL
    ? process.env.HASURA_GRAPHQL_URL.replace(/\/v1\/graphql\/?$/, '/v1/metadata')
    : undefined,
  'http://127.0.0.1:8080/v1/metadata',
].filter(Boolean);

const HASURA_ENDPOINT = endpointCandidates[0];
const HASURA_ADMIN_SECRET =
  process.env.HASURA_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET;

if (!HASURA_ENDPOINT) {
  console.error('Missing HASURA endpoint. Set HASURA_ENDPOINT.');
  process.exit(1);
}

if (!HASURA_ADMIN_SECRET) {
  console.error(
    'Missing HASURA admin secret. Set HASURA_ADMIN_SECRET (or HASURA_GRAPHQL_ADMIN_SECRET).'
  );
  process.exit(1);
}

const fetchJson = async (body) => {
  const res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`HTTP ${res.status}: ${error}`);
  }

  return res.json();
};

const chunkArray = (arr, size) =>
  arr.reduce((chunks, item, idx) => {
    const chunkIndex = Math.floor(idx / size);
    if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
    chunks[chunkIndex].push(item);
    return chunks;
  }, []);

const isSameTable = (a, b) =>
  a.name === b.name && a.schema === b.schema;

(async () => {
  try {
    // Step 1: Get metadata
    const metadata = await fetchJson({ type: 'export_metadata', args: {} });

    const source = metadata.sources?.[0];
    if (!source) throw new Error('No source found in metadata');

    const sourceName = source.name;
    const trackedTables = source.tables;
    const permissions = source.tables
      .flatMap(({ table, select_permissions = [] }) =>
        select_permissions.map((perm) => ({
          table,
          role: perm.role,
        }))
      );

    // Step 2: Filter tables that don't have 'select' permission for ROLE_NAME
    const tablesToUpdate = trackedTables.filter(({ table }) => {
      return !permissions.some(
        (perm) =>
          perm.role === ROLE_NAME && isSameTable(perm.table, table)
      );
    });

    if (!tablesToUpdate.length) {
      console.log('✅ All tables already have public select permission.');
      return;
    }

    const chunks = chunkArray(tablesToUpdate, CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const bulk = chunks[i].map(({ table }) => ({
        type: 'pg_create_select_permission',
        args: {
          source: sourceName,
          table,
          role: ROLE_NAME,
          permission: {
            columns: '*',
            filter: {},
          },
        },
      }));

      console.log(`⏳ Processing chunk ${i + 1}/${chunks.length}...`);
      try {
        const result = await fetchJson({ type: 'bulk', args: bulk });
        console.log(`✅ Chunk ${i + 1} applied`);
      } catch (err) {
        console.error(`❌ Error in chunk ${i + 1}:`, err.message);
      }
    }

    console.log('🎉 Done: public permissions applied where missing.');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
})();

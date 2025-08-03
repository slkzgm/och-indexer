// File: scripts/fetch-item-names.ts
async function fetchItems() {
  const result: Record<number, string> = {};
  const baseUrl = 'https://api.onchainheroes.xyz/item/';

  for (let id = 1; id <= 100; id++) {
    try {
      const res = await fetch(`${baseUrl}${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      result[id] = data.name;
    } catch (err) {
      console.error(`Failed to fetch item ${id}:`, err.message);
    }
  }

  console.log(result);
}

fetchItems();


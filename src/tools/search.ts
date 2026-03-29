import type { MetadataService } from "../metadata.js";

export interface SearchDatasetsInput {
  query: string;
}

export async function handleSearchDatasets(
  metadata: MetadataService,
  input: SearchDatasetsInput,
): Promise<string> {
  const results = await metadata.searchDataflows(input.query);

  if (results.length === 0) {
    return `No datasets found matching "${input.query}". Try a broader search term, or use common keywords like "exchange", "interest", "inflation", "yield", "money", "balance", "payment".`;
  }

  const header = `${results.length} dataset${results.length === 1 ? "" : "s"} found matching "${input.query}" (source: ECB)`;
  const lines = results.map((f) => `${f.id} — ${f.name}`);

  return `${header}\n\n${lines.join("\n")}`;
}

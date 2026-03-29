import type { MetadataService } from "../metadata.js";

export interface ExplainDatasetInput {
  dataset_id: string;
}

export async function handleExplainDataset(
  metadata: MetadataService,
  input: ExplainDatasetInput,
): Promise<string> {
  const structure = await metadata.getStructure(input.dataset_id);

  const lines: string[] = [];
  lines.push(
    `Dataset: ${structure.dataflowId} — ${structure.name} (source: ECB)`,
  );
  lines.push("");
  lines.push(`Dimensions (${structure.dimensions.length}):`);

  for (const dim of structure.dimensions) {
    const valueCount = dim.values.length;
    lines.push(`  ${dim.position}. ${dim.id} (${valueCount} values)`);

    // Show up to 10 values
    const shown = dim.values.slice(0, 10);
    for (const v of shown) {
      lines.push(`     ${v.id} — ${v.name}`);
    }
    if (valueCount > 10) {
      lines.push(`     ... and ${valueCount - 10} more`);
    }
  }

  // Generate an example series key
  lines.push("");
  lines.push("Example series key:");
  const exampleParts = structure.dimensions.map((dim) =>
    dim.values.length > 0 ? dim.values[0].id : "*",
  );
  lines.push(`  ${structure.dataflowId}/${exampleParts.join(".")}`);

  return lines.join("\n");
}

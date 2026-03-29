/** A single observation from an ECB SDMX CSV response. */
export interface EcbObservation {
  date: string;
  value: number;
  [key: string]: string | number;
}

/** Parsed result from a data query. */
export interface EcbDataResult {
  description: string;
  frequency: string;
  observations: EcbObservation[];
}

/** Dataflow info extracted from the ECB metadata API. */
export interface DataflowInfo {
  id: string;
  name: string;
  description: string;
}

/** A dimension within an SDMX data structure definition. */
export interface DimensionInfo {
  id: string;
  name: string;
  position: number;
  values: CodelistValue[];
}

/** A value within a codelist (used by dimensions). */
export interface CodelistValue {
  id: string;
  name: string;
}

/** Full structure info for a dataset, returned by explain_dataset. */
export interface StructureInfo {
  dataflowId: string;
  name: string;
  description: string;
  dimensions: DimensionInfo[];
}

/** Configuration for the ECB client. */
export interface EcbClientConfig {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

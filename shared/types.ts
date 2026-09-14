export type SourceKind = "pdf" | "image" | "message" | "text";
export type SourceStatus = "ready" | "reading" | "unreadable" | "pending";
export interface Source {
  id: string;
  title: string;
  filename: string;
  kind: SourceKind;
  mime: string;
  status: SourceStatus;
  size: number;
  pageCount: number;
  addedAt: string;
  date?: string;
  dateOrigin?: string;
  party: string;
  description: string;
  pages: string[];
  hash: string;
  synthetic: boolean;
  error?: string;
  extractionVersion: string;
  extractionMethod?: "native" | "transcription" | "observation" | "user";
}
export interface Citation {
  sourceId: string;
  page: number;
  quote: string;
  label?: string;
  method?: "native" | "transcription" | "observation" | "user";
}
export interface EvidenceItem {
  id: string;
  role: "supports" | "challenges" | "qualifies" | "context";
  title: string;
  text: string;
  citation: Citation;
}
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  citation?: Citation;
}
export interface Gap {
  id: string;
  title: string;
  reason: string;
}
export interface Finding {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: "conflict" | "incomplete" | "qualified" | "supported";
  statusLabel: string;
  summary: string;
  claim: string;
  claimant: string;
  claimCitation: Citation;
  evidence: EvidenceItem[];
  conclusion: string;
  limitations: string[];
  gaps: Gap[];
  timeline: TimelineEvent[];
}
export interface ReviewChange {
  findingId: string;
  kind: "changed" | "added" | "withdrawn";
  title: string;
  before: string;
  after: string;
  reason: string;
  sourceIds: string[];
  unchanged: string[];
}
export interface Revision {
  id: string;
  number: number;
  createdAt: string;
  generation: number;
  sourceIds: string[];
  sourceSnapshots: Source[];
  findings: Finding[];
  changes: ReviewChange[];
  coverage: { total: number; reviewed: number; unreadable: number };
  mode: "example" | "gemini";
  model: string;
  inputHash: string;
  financials?: {
    deposit: number | null;
    refund: number | null;
    depositCitation?: Citation;
    refundCitation?: Citation;
  };
  audit?: {
    instruction: string;
    input: string;
    response: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    checkedCitations: number;
    warnings: string[];
  };
}
export interface Annotation {
  id: string;
  sourceId: string;
  text: string;
  kind: "correction" | "context";
  createdAt: string;
}
export interface TraceCase {
  ownerId?: string;
  id: string;
  title: string;
  property: string;
  tenant: string;
  landlord: string;
  deposit: number;
  refund: number;
  currency: string;
  isExample: boolean;
  createdAt: string;
  expiresAt: string;
  generation: number;
  sources: Source[];
  revisions: Revision[];
  latestRevisionId: string | null;
  annotations: Annotation[];
  activeJobId: string | null;
  needsConfirmation?: boolean;
  unconfirmedAmbiguities?: string[];
  userContext?: {
    property?: string;
    tenant?: string;
    landlord?: string;
    deposit?: number;
    refund?: number;
  };
}
export type JobStatus =
  | "queued"
  | "reading"
  | "comparing"
  | "checking"
  | "completed"
  | "failed"
  | "needs_input"
  | "superseded";
export interface Job {
  id: string;
  caseId: string;
  generation: number;
  status: JobStatus;
  progress: number;
  stage: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  revisionId?: string;
}
export interface Capabilities {
  liveAI: boolean;
  model: string;
  storage: "local" | "cloud";
  maxFiles: number;
  maxFileMB: number;
}
export interface AppState {
  case: TraceCase | null;
  capabilities: Capabilities;
}
export interface CaseListItem {
  id: string;
  title: string;
  property: string;
  isExample: boolean;
  updatedAt: string;
}
export const money = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
export const TERMINAL_JOBS: JobStatus[] = [
  "completed",
  "failed",
  "needs_input",
  "superseded",
];

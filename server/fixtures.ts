import { Finding, Source, TraceCase, Revision } from "../shared/types.js";

export const INITIAL_SOURCES: Source[] = [
  {
    id: "src-1",
    title: "Residential Tenancy Agreement",
    filename: "lease_agreement.pdf",
    kind: "pdf",
    mime: "application/pdf",
    status: "ready",
    size: 245000,
    pageCount: 3,
    addedAt: "2026-08-08T10:00:00Z",
    date: "2025-08-01",
    dateOrigin: "Document Header Date",
    party: "Landlord (R. Sharma) & Tenant (A. Verma)",
    description:
      "Standard 11-month tenancy agreement for Flat 402. Specifies ₹60,000 deposit and condition expectations.",
    pages: [
      "RESIDENTIAL TENANCY AGREEMENT\nDate of Execution: 01 August 2025\nParties: Ramesh Sharma (Lessor) and Aman Verma (Lessee).\nPremises: Flat 402, Green Glen Layout, Bellandur, Bengaluru 560103.\nTerm: 11 months commencing 01-Aug-2025 to 30-Jun-2026 (extended to 31-Jul-2026 by mutual consent).\nClause 4 [Security Deposit]: Lessee has paid an interest-free refundable deposit of INR 60,000 (Rupees Sixty Thousand only). The deposit shall be returned within 7 days of peaceful vacating, subject to deductions for unpaid utilities or actual physical damages beyond normal wear and tear.",
      "Clause 8 [Maintenance]: Lessee agrees to keep the premises in clean condition. Routine repainting upon vacating is not deductible unless walls are defaced or damaged beyond fair wear and tear.\nClause 9 [Handover]: A joint inspection report executed at occupancy shall record the starting condition of the apartment.",
    ],
    hash: "sha256-a1b2c3d4e5f6",
    synthetic: true,
    extractionVersion: "v1.0",
  },
  {
    id: "src-2",
    title: "Bank Transfer - Deposit Receipt",
    filename: "deposit_receipt.pdf",
    kind: "pdf",
    mime: "application/pdf",
    status: "ready",
    size: 98000,
    pageCount: 1,
    addedAt: "2026-08-08T10:00:00Z",
    date: "2025-07-28",
    dateOrigin: "Transaction Timestamp",
    party: "Tenant (A. Verma)",
    description:
      "Bank payment receipt verifying initial security deposit transfer of ₹60,000.",
    pages: [
      "HDFC BANK ELECTRONIC FUNDS TRANSFER ADVICE\nDate: 28-Jul-2025 11:32:15 IST\nTxn ID: HDFC00928371624\nSender: Aman Verma (A/C ...4819)\nBeneficiary: Ramesh Sharma (A/C ...8831)\nAmount: INR 60,000.00\nDescription / Narration: Security Deposit Flat 402 Green Glen\nStatus: SUCCESSFUL / SETTLED",
    ],
    hash: "sha256-b2c3d4e5f6a1",
    synthetic: true,
    extractionVersion: "v1.0",
  },
  {
    id: "src-3",
    title: "Move-In Inspection & Inventory Report",
    filename: "check_in_inventory.pdf",
    kind: "pdf",
    mime: "application/pdf",
    status: "ready",
    size: 320000,
    pageCount: 2,
    addedAt: "2026-08-08T10:00:00Z",
    date: "2025-08-02",
    dateOrigin: "Joint Inspection Sign-off",
    party: "Joint Inspection (Tenant & Property Manager)",
    description:
      "Signed move-in checklist recording pre-existing conditions and wall marks.",
    pages: [
      "MOVE-IN CONDITION INVENTORY\nDate: 02 August 2025 | Inspector: S. Rao (Property Manager) | Tenant Present: Aman Verma\nLiving Room: Clean, electrical switchplates intact.\nKitchen: Modular cabinets verified, hob working.\nMaster Bedroom:\n- Flooring: Vitrified tiles, no cracks.\n- Woodwork: Wardrobe drawers slide smoothly.\n- Wall condition: Dark scuff on bedroom wall beside wardrobe noted at move-in.\n- Fan & lighting: Functional.\nSignatures: S. Rao (Manager), Aman Verma (Tenant).",
    ],
    hash: "sha256-c3d4e5f6a1b2",
    synthetic: true,
    extractionVersion: "v1.0",
  },
  {
    id: "src-4",
    title: "Move-In Photograph - Bedroom Wall",
    filename: "bedroom_movein_photo.png",
    kind: "image",
    mime: "image/png",
    status: "ready",
    size: 850000,
    pageCount: 1,
    addedAt: "2026-08-08T10:00:00Z",
    date: "2025-08-02",
    dateOrigin: "Image Metadata / Tenant Submission",
    party: "Tenant (A. Verma)",
    description:
      "Photograph of master bedroom wall area adjacent to the wooden wardrobe.",
    pages: [
      "[Visual Observation]: An off-white interior wall surface is depicted next to the wooden frame of a fitted wardrobe. A dark grey vertical scuff mark approximately 15 cm in length is visible at approximate mid-height beside the wardrobe edge. [Limitation]: Image alone does not establish capture date, cause, or whether it is the condition covered by the deduction.",
    ],
    hash: "sha256-d4e5f6a1b2c3",
    synthetic: true,
    extractionVersion: "v1.0",
  },
  {
    id: "src-5",
    title: "Landlord Deduction Notice (WhatsApp)",
    filename: "landlord_deduction_notice.txt",
    kind: "message",
    mime: "text/plain",
    status: "ready",
    size: 1200,
    pageCount: 1,
    addedAt: "2026-08-08T10:00:00Z",
    date: "2026-08-05",
    dateOrigin: "Visible Message Timestamp",
    party: "Landlord (R. Sharma)",
    description:
      "Itemized deduction breakdown sent by landlord stating repainting and cleaning fees.",
    pages: [
      "[05/08/2026, 11:14:22 AM] Ramesh Sharma: Dear Aman, we have inspected Flat 402 after your handover yesterday. The bedroom walls were unmarked when you moved in, but now require repainting due to wall damage. Total painting cost is Rs 12,000. Also deep cleaning charges Rs 3,000. Total deduction Rs 15,000. From your 60,000 deposit, refund of Rs 45,000 will be transferred today.",
    ],
    hash: "sha256-e5f6a1b2c3d4",
    synthetic: true,
    extractionVersion: "v1.0",
  },
  {
    id: "src-6",
    title: "Urban Clad Services Contractor Invoice",
    filename: "contractor_invoice.pdf",
    kind: "pdf",
    mime: "application/pdf",
    status: "ready",
    size: 175000,
    pageCount: 1,
    addedAt: "2026-08-08T10:00:00Z",
    date: "2026-08-04",
    dateOrigin: "Invoice Issue Date",
    party: "Urban Clad Home Services",
    description:
      "Invoice issued to Ramesh Sharma for painting and cleaning works at Flat 402.",
    pages: [
      "URBAN CLAD MAINTENANCE & HOME SERVICES PVT LTD\nGSTIN: 29AABCU9821L1Z4\nInvoice No: UC-2026-08-782 | Date: 04-Aug-2026\nCustomer: Ramesh Sharma | Address: Flat 402, Green Glen Layout, Bengaluru\nLine Items:\n1. Master Bedroom Full Wall Repainting (Labor + Asian Paints Premium Emulsion): INR 12,000\n2. Apartment Post-Handover Deep Cleaning & Sanitisation: INR 3,000\nSubtotal: INR 15,000 | Tax (Inclusive): INR 0 | Total Due: INR 15,000\nPayment Terms: Due upon receipt. Work Scheduled: 05-Aug-2026.",
    ],
    hash: "sha256-f6a1b2c3d4e5",
    synthetic: true,
    extractionVersion: "v1.0",
  },
  {
    id: "src-7",
    title: "Bank Transfer - Partial Refund Advice",
    filename: "refund_transfer_receipt.png",
    kind: "image",
    mime: "image/png",
    status: "ready",
    size: 450000,
    pageCount: 1,
    addedAt: "2026-08-08T10:00:00Z",
    date: "2026-08-07",
    dateOrigin: "Transaction Receipt Timestamp",
    party: "Landlord (R. Sharma)",
    description: "NEFT confirmation slip showing ₹45,000 returned to tenant.",
    pages: [
      "STATE BANK OF INDIA - NEFT ACKNOWLEDGEMENT\nDate: 07-Aug-2026 14:22:08 IST\nReference No: SBIN0082736192\nSender: Ramesh Sharma (A/C ...8831)\nBeneficiary: Aman Verma (A/C ...4819)\nAmount: INR 45,000.00\nRemarks: Deposit refund Flat 402 balance after Rs 15,000 deductions\nStatus: Transaction Successful",
    ],
    hash: "sha256-a2b3c4d5e6f1",
    synthetic: true,
    extractionVersion: "v1.0",
  },
];

export const LIVE_ADDITION_SOURCE: Source = {
  id: "src-8",
  title: "Tenant Packing Message (29 July 2026)",
  filename: "tenant_packing_message.txt",
  kind: "message",
  mime: "text/plain",
  status: "ready",
  size: 640,
  pageCount: 1,
  addedAt: "2026-08-08T10:05:00Z",
  date: "2026-07-29",
  dateOrigin: "Visible Message Timestamp",
  party: "Tenant (A. Verma)",
  description:
    "WhatsApp chat export from tenant mentioning accidental paint splash during departure packing.",
  pages: [
    "[29/07/2026, 09:40:12 PM] Aman Verma: Bro I was packing the last carton and accidentally knocked over an open tin, I splashed blue paint on the bedroom wall beside the door while packing. Tried to wipe it but made a smudge.",
  ],
  hash: "sha256-b3c4d5e6f1a2",
  synthetic: true,
  extractionVersion: "v1.0",
};

export const INITIAL_FINDINGS: Finding[] = [
  {
    id: "fnd-repainting",
    title: "Master Bedroom Repainting",
    amount: 12000,
    currency: "INR",
    status: "conflict",
    statusLabel: "Accounts differ on move-in condition",
    claim:
      "The bedroom walls were unmarked when you moved in, but now require repainting due to wall damage.",
    claimant: "Landlord (R. Sharma)",
    claimCitation: {
      sourceId: "src-5",
      page: 1,
      quote:
        "The bedroom walls were unmarked when you moved in, but now require repainting due to wall damage. Total painting cost is Rs 12,000.",
      label: "Landlord Notice",
      method: "native",
    },
    summary:
      "Accounts differ about the bedroom’s starting condition. The check-in inventory records an existing dark scuff beside the wardrobe, directly contradicting the landlord’s assertion that walls were unmarked at move-in.",
    evidence: [
      {
        id: "ev-1",
        role: "challenges",
        title: "Move-in inspection notes pre-existing mark",
        text: 'The signed check-in inspection explicitly notes: "Dark scuff on bedroom wall beside wardrobe noted at move-in."',
        citation: {
          sourceId: "src-3",
          page: 1,
          quote: "Dark scuff on bedroom wall beside wardrobe noted at move-in.",
          label: "Check-In Inventory",
          method: "native",
        },
      },
      {
        id: "ev-2",
        role: "qualifies",
        title: "Photograph shows visible scuff near wardrobe",
        text: "Visual observation identifies a dark mark on the wall beside the wardrobe. The photo confirms a mark existed, but does not independently prove its date, cause, or whether it constitutes the damage billed.",
        citation: {
          sourceId: "src-4",
          page: 1,
          quote:
            "A dark grey vertical scuff mark approximately 15 cm in length is visible at approximate mid-height beside the wardrobe edge.",
          label: "Move-in Photo",
          method: "observation",
        },
      },
      {
        id: "ev-3",
        role: "supports",
        title: "Invoice bills ₹12,000 for full room repainting",
        text: 'Contractor invoice line item 1 bills ₹12,000 for "Master Bedroom Full Wall Repainting".',
        citation: {
          sourceId: "src-6",
          page: 1,
          quote:
            "1. Master Bedroom Full Wall Repainting (Labor + Asian Paints Premium Emulsion): INR 12,000",
          label: "Contractor Invoice",
          method: "native",
        },
      },
    ],
    conclusion:
      "The check-in inventory and the landlord’s message disagree about the starting condition. However, the available records do not establish whether the ₹12,000 repainting charge concerns that earlier mark, another mark, or full-room wear.",
    limitations: [
      'The check-in inventory scuff location is described as "beside wardrobe". The contractor invoice does not specify which walls were painted.',
      "The photo lacks cryptographic timestamp metadata; its date attribution relies on tenant submission.",
      "Invoice establishes an amount was quoted/billed, but does not prove whether repainting the entire room was necessary for localized scuff marks.",
    ],
    gaps: [
      {
        id: "gap-1",
        title: "Move-out inspection / checkout condition report",
        reason:
          "A signed checkout report would verify what new marks were present at handover versus move-in.",
      },
    ],
    timeline: [
      {
        id: "tl-1",
        date: "2025-08-01",
        title: "Tenancy commences",
        description:
          "Tenancy agreement signed specifying ₹60,000 deposit and wear & tear standards.",
        citation: {
          sourceId: "src-1",
          page: 1,
          quote:
            "Date of Execution: 01 August 2025... Clause 4 [Security Deposit]: INR 60,000",
        },
      },
      {
        id: "tl-2",
        date: "2025-08-02",
        title: "Move-in inspection notes scuff",
        description:
          'Joint checklist records "Dark scuff on bedroom wall beside wardrobe".',
        citation: {
          sourceId: "src-3",
          page: 1,
          quote: "Dark scuff on bedroom wall beside wardrobe noted at move-in.",
        },
      },
      {
        id: "tl-3",
        date: "2026-08-04",
        title: "Contractor invoice issued",
        description: "Urban Clad bills ₹12,000 for master bedroom repainting.",
        citation: {
          sourceId: "src-6",
          page: 1,
          quote: "Invoice No: UC-2026-08-782 | Date: 04-Aug-2026",
        },
      },
      {
        id: "tl-4",
        date: "2026-08-05",
        title: "Landlord asserts walls unmarked",
        description:
          "WhatsApp notice claims walls were unmarked at move-in and withholds ₹12,000.",
        citation: {
          sourceId: "src-5",
          page: 1,
          quote:
            "The bedroom walls were unmarked when you moved in, but now require repainting",
        },
      },
    ],
  },
  {
    id: "fnd-cleaning",
    title: "Apartment Deep Cleaning Fee",
    amount: 3000,
    currency: "INR",
    status: "incomplete",
    statusLabel: "Billed on invoice; no checkout condition record",
    claim: "Also deep cleaning charges Rs 3,000.",
    claimant: "Landlord (R. Sharma)",
    claimCitation: {
      sourceId: "src-5",
      page: 1,
      quote: "Also deep cleaning charges Rs 3,000.",
      label: "Landlord Notice",
      method: "native",
    },
    summary:
      "The contractor invoice establishes that ₹3,000 was billed for deep cleaning. However, no move-out condition report, inspection photographs, or completion logs exist in the reviewed collection to substantiate uncleanliness.",
    evidence: [
      {
        id: "ev-c1",
        role: "supports",
        title: "Contractor invoice includes deep cleaning line item",
        text: 'Urban Clad invoice line item 2 lists "Apartment Post-Handover Deep Cleaning & Sanitisation: INR 3,000".',
        citation: {
          sourceId: "src-6",
          page: 1,
          quote:
            "2. Apartment Post-Handover Deep Cleaning & Sanitisation: INR 3,000",
          label: "Contractor Invoice",
          method: "native",
        },
      },
    ],
    conclusion:
      "The invoice verifies that ₹3,000 was billed. The current 7-file collection contains no record establishing the apartment’s hygiene state at checkout or proving what cleaning work was performed.",
    limitations: [
      "An invoice proves a charge was billed to the landlord, but does not establish whether the tenant left the premises in breach of cleanliness clauses.",
    ],
    gaps: [
      {
        id: "gap-c1",
        title: "Checkout condition record or exit photographs",
        reason:
          "Photos or handover notes taken upon vacating are needed to determine whether professional cleaning was justified beyond normal vacating condition.",
      },
    ],
    timeline: [
      {
        id: "tl-c1",
        date: "2026-08-04",
        title: "Cleaning billed on contractor invoice",
        description: "Urban Clad lists ₹3,000 deep cleaning line item.",
        citation: {
          sourceId: "src-6",
          page: 1,
          quote:
            "2. Apartment Post-Handover Deep Cleaning & Sanitisation: INR 3,000",
        },
      },
      {
        id: "tl-c2",
        date: "2026-08-05",
        title: "Landlord deduction notice includes cleaning",
        description:
          "Landlord states ₹3,000 cleaning deduction in WhatsApp message.",
        citation: {
          sourceId: "src-5",
          page: 1,
          quote: "Also deep cleaning charges Rs 3,000.",
        },
      },
    ],
  },
];

export const REVISED_FINDINGS: Finding[] = [
  {
    id: "fnd-repainting",
    title: "Master Bedroom Repainting",
    amount: 12000,
    currency: "INR",
    status: "qualified",
    statusLabel: "Move-in scuff verified; tenant admits later paint splash",
    claim:
      "The bedroom walls were unmarked when you moved in, but now require repainting due to wall damage.",
    claimant: "Landlord (R. Sharma)",
    claimCitation: {
      sourceId: "src-5",
      page: 1,
      quote:
        "The bedroom walls were unmarked when you moved in, but now require repainting due to wall damage. Total painting cost is Rs 12,000.",
      label: "Landlord Notice",
      method: "native",
    },
    summary:
      "The condition history now includes a later reported incident. While the check-in inventory records an existing scuff by the wardrobe, a newly provided tenant message acknowledges spilling blue paint on the wall beside the door on 29 July 2026. The initial mark no longer establishes that all wall damage predated the tenancy.",
    evidence: [
      {
        id: "ev-1",
        role: "challenges",
        title: "Move-in inspection records pre-existing scuff",
        text: "The check-in inspection notes a pre-existing dark scuff beside the wardrobe, confirming walls were not unmarked.",
        citation: {
          sourceId: "src-3",
          page: 1,
          quote: "Dark scuff on bedroom wall beside wardrobe noted at move-in.",
          label: "Check-In Inventory",
          method: "native",
        },
      },
      {
        id: "ev-rev-new",
        role: "qualifies",
        title: "Tenant message acknowledges paint spill before departure",
        text: 'On 29 July 2026, the tenant stated: "I splashed blue paint on the bedroom wall beside the door while packing. Tried to wipe it but made a smudge."',
        citation: {
          sourceId: "src-8",
          page: 1,
          quote:
            "I splashed blue paint on the bedroom wall beside the door while packing. Tried to wipe it but made a smudge.",
          label: "Tenant Message (29 Jul 2026)",
          method: "native",
        },
      },
      {
        id: "ev-2",
        role: "qualifies",
        title: "Move-in photo documents wardrobe area scuff",
        text: "Photo observation shows the initial scuff near the wardrobe, distinct in location from the door area mentioned in the packing message.",
        citation: {
          sourceId: "src-4",
          page: 1,
          quote:
            "A dark grey vertical scuff mark approximately 15 cm in length is visible at approximate mid-height beside the wardrobe edge.",
          label: "Move-in Photo",
          method: "observation",
        },
      },
      {
        id: "ev-3",
        role: "supports",
        title: "Invoice bills ₹12,000 for full room repainting",
        text: "Urban Clad invoice charges ₹12,000 for repainting the entire master bedroom.",
        citation: {
          sourceId: "src-6",
          page: 1,
          quote:
            "1. Master Bedroom Full Wall Repainting (Labor + Asian Paints Premium Emulsion): INR 12,000",
          label: "Contractor Invoice",
          method: "native",
        },
      },
    ],
    conclusion:
      "The earlier disagreement about the check-in condition remains valid. However, the newly added tenant message acknowledges a subsequent paint spill during packing. The records do not establish whether full-room repainting was necessary or how that work relates to the ₹12,000 charge.",
    limitations: [
      "The check-in scuff was beside the wardrobe; the tenant’s 29 July paint splash was beside the door. The records do not prove whether both required separate repair or full-room repainting.",
      "No contractor scope of work or itemized breakdown separating labor between walls exists.",
    ],
    gaps: [
      {
        id: "gap-rev-1",
        title: "Checkout inspection or photographic log of door area",
        reason:
          "Photographs of the door area splash would clarify the extent and color of the smudge versus the move-in wardrobe scuff.",
      },
    ],
    timeline: [
      {
        id: "tl-1",
        date: "2025-08-01",
        title: "Tenancy commences",
        description: "Tenancy agreement executed with ₹60,000 deposit.",
        citation: {
          sourceId: "src-1",
          page: 1,
          quote: "Clause 4 [Security Deposit]: INR 60,000",
        },
      },
      {
        id: "tl-2",
        date: "2025-08-02",
        title: "Move-in inventory records wardrobe scuff",
        description: "Move-in checklist documents dark scuff beside wardrobe.",
        citation: {
          sourceId: "src-3",
          page: 1,
          quote: "Dark scuff on bedroom wall beside wardrobe noted at move-in.",
        },
      },
      {
        id: "tl-rev-new",
        date: "2026-07-29",
        title: "Tenant paint spill incident during packing",
        description:
          "Tenant message describes accidental blue paint splash beside bedroom door.",
        citation: {
          sourceId: "src-8",
          page: 1,
          quote:
            "I splashed blue paint on the bedroom wall beside the door while packing.",
        },
      },
      {
        id: "tl-3",
        date: "2026-08-04",
        title: "Contractor invoice issued",
        description: "Urban Clad bills ₹12,000 for full wall repainting.",
        citation: {
          sourceId: "src-6",
          page: 1,
          quote: "1. Master Bedroom Full Wall Repainting: INR 12,000",
        },
      },
      {
        id: "tl-4",
        date: "2026-08-05",
        title: "Landlord deduction notice asserts unmarked move-in",
        description:
          "Landlord message states bedroom walls were unmarked at move-in.",
        citation: {
          sourceId: "src-5",
          page: 1,
          quote:
            "The bedroom walls were unmarked when you moved in, but now require repainting",
        },
      },
    ],
  },
  INITIAL_FINDINGS[1], // Cleaning deduction is completely stable and unchanged!
];

export const INITIAL_REVISION: Revision = {
  id: "rev-1",
  number: 1,
  createdAt: "2026-08-08T10:01:00Z",
  generation: 1,
  sourceIds: INITIAL_SOURCES.map((s) => s.id),
  sourceSnapshots: INITIAL_SOURCES,
  findings: INITIAL_FINDINGS,
  changes: [],
  coverage: {
    total: 7,
    reviewed: 7,
    unreadable: 0,
  },
  mode: "example",
  model: "gemini-3.8-flash",
  inputHash: "hash-initial-7-sources",
};

export const REVISED_CHANGES = [
  {
    findingId: "fnd-repainting",
    kind: "changed" as const,
    title: "Master Bedroom Repainting",
    before:
      "Accounts differ about move-in condition. Pre-existing scuff recorded in check-in inventory challenged the landlord’s claim of unmarked walls.",
    after:
      "Condition history now includes a later reported incident. The tenant’s 29 July message acknowledges a paint spill beside the bedroom door during packing. Disagreement on move-in condition remains valid, but initial scuff does not explain all damage.",
    reason:
      "Newly uploaded tenant packing message (src-8) acknowledges an accidental blue paint splash prior to move-out.",
    sourceIds: ["src-8", "src-3", "src-5"],
    unchanged: [
      "Apartment Deep Cleaning Fee (₹3,000) assessment remains identical and valid.",
    ],
  },
];

export const REVISED_REVISION: Revision = {
  id: "rev-2",
  number: 2,
  createdAt: "2026-08-08T10:06:00Z",
  generation: 2,
  sourceIds: [...INITIAL_SOURCES.map((s) => s.id), "src-8"],
  sourceSnapshots: [...INITIAL_SOURCES, LIVE_ADDITION_SOURCE],
  findings: REVISED_FINDINGS,
  changes: REVISED_CHANGES,
  coverage: {
    total: 8,
    reviewed: 8,
    unreadable: 0,
  },
  mode: "example",
  model: "gemini-3.8-flash",
  inputHash: "hash-8-sources-with-addition",
};

export function createInitialDemoCase(): TraceCase {
  return JSON.parse(
    JSON.stringify({
      id: "case-demo-synthetic",
      title: "Flat 402 Green Glen Layout - Deposit Review",
      property: "Flat 402, Green Glen Layout, Bellandur, Bengaluru",
      tenant: "Aman Verma",
      landlord: "Ramesh Sharma",
      deposit: 60000,
      refund: 45000,
      currency: "INR",
      isExample: true,
      createdAt: "2026-08-08T10:00:00Z",
      expiresAt: "2026-08-09T10:00:00Z",
      generation: 1,
      sources: INITIAL_SOURCES,
      revisions: [INITIAL_REVISION],
      latestRevisionId: "rev-1",
      annotations: [],
      activeJobId: null,
    }),
  );
}

export const DEMO_CASE: TraceCase = createInitialDemoCase();

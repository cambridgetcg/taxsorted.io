import materialLedgerJson from "../../../research/uk/tax-history/window-tax/materials.json";

type MaterialRights = {
  status: string;
  statementUrl: string;
  licence: { name: string; url: string } | null;
  creditLine: string;
  conditions: string[];
  conditionCheck?: {
    checkedOn: string;
    nrsCrownCopyrightImagesOnTaxSorted: number;
    websiteImageLimit: number;
    reproducedUnchanged: boolean;
    contextReviewedAsNonMisleading: boolean;
  };
  finalCheckRequired: boolean;
};

type MaterialTechnical = {
  localPath: string | null;
  sha256: string | null;
  sourceWidth?: number;
  sourceHeight?: number;
  sourceBytes?: number;
  sourceSha256?: string;
  renditionWidth?: number;
  renditionHeight?: number;
  renditionBytes?: number;
  modifications?: string;
};

type MaterialRecord = {
  id: string;
  title: string;
  source: {
    publisher: string;
    pageUrl: string;
    directAssetUrl: string | null;
    creator: string;
    created: string | null;
    locator: string;
  };
  evidence: {
    claimStrength: string;
    supports: string[];
    doesNotProve: string[];
    corroboratingUrl?: string;
  };
  rights: MaterialRights;
  technical: MaterialTechnical;
};

type MaterialLedger = {
  materials: MaterialRecord[];
};

export type PublishedWindowTaxMaterial = MaterialRecord & {
  publicUrl: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  changeNote: string;
};

const ledger = materialLedgerJson as unknown as MaterialLedger;
const publicPathPrefix = "frontend/public";
const publishableRights = new Set(["confirmed", "conditional"]);

function requirePublishedMaterial(id: string): PublishedWindowTaxMaterial {
  const material = ledger.materials.find((candidate) => candidate.id === id);
  if (!material) {
    throw new Error(`Window Tax material is missing from the ledger: ${id}`);
  }
  if (!publishableRights.has(material.rights.status)) {
    throw new Error(`Window Tax material is not reusable: ${id}`);
  }
  if (material.rights.finalCheckRequired) {
    throw new Error(`Window Tax material still needs a final rights check: ${id}`);
  }
  if (material.rights.status === "conditional") {
    const check = material.rights.conditionCheck;
    if (
      !check?.checkedOn ||
      check.nrsCrownCopyrightImagesOnTaxSorted > check.websiteImageLimit ||
      !check.reproducedUnchanged ||
      !check.contextReviewedAsNonMisleading
    ) {
      throw new Error(`Window Tax material has an incomplete conditional-rights check: ${id}`);
    }
  }

  const {
    localPath,
    sha256,
    sourceWidth,
    sourceHeight,
    sourceBytes,
    sourceSha256,
    renditionWidth,
    renditionHeight,
    renditionBytes,
    modifications,
  } = material.technical;
  if (!material.source.directAssetUrl) {
    throw new Error(`Window Tax material has no exact source asset URL: ${id}`);
  }
  if (
    !sourceWidth ||
    !sourceHeight ||
    !sourceBytes ||
    !sourceSha256 ||
    !/^[0-9a-f]{64}$/.test(sourceSha256)
  ) {
    throw new Error(`Window Tax material has incomplete source metadata: ${id}`);
  }
  if (!localPath?.startsWith(`${publicPathPrefix}/`)) {
    throw new Error(`Window Tax material has no public local path: ${id}`);
  }
  if (!sha256 || !/^[0-9a-f]{64}$/.test(sha256)) {
    throw new Error(`Window Tax material has no valid SHA-256: ${id}`);
  }
  if (!renditionWidth || !renditionHeight || !renditionBytes || !modifications) {
    throw new Error(`Window Tax material has incomplete rendition metadata: ${id}`);
  }

  return {
    ...material,
    publicUrl: localPath.slice(publicPathPrefix.length),
    width: renditionWidth,
    height: renditionHeight,
    bytes: renditionBytes,
    sha256,
    changeNote: modifications,
  };
}

export const windowTaxMaterials = {
  repealCartoon: requirePublishedMaterial("heidelberg-punch-repeal-cartoon-1850"),
  dumfriesshireRoll: requirePublishedMaterial("nrs-dumfriesshire-closed-windows-1754"),
  edgarStreet: requirePublishedMaterial("edgar-street-worcester-photograph"),
} as const;

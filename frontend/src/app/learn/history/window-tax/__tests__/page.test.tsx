// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WindowTaxPage from "../page";
import { windowTaxMaterials } from "@/lib/window-tax-materials";
import mediaManifestJson from "../../../../../../public/media/window-tax/manifest.json";

type MediaManifest = {
  schema: string;
  nrsCrownCopyrightImageCount: { used: number; limit: number };
  materials: Array<{
    id: string;
    path: string;
    width: number;
    height: number;
    bytes: number;
    sha256: string;
    source: {
      assetUrl: string;
      sha256: string;
      width: number;
      height: number;
      bytes: number;
    };
  }>;
};

const manifest = mediaManifestJson as MediaManifest;
const publicDirectory = resolve(process.cwd(), "public");

describe("Window Tax history guide", () => {
  it("tells the bounded legal story in plain words", () => {
    render(<WindowTaxPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Window Tax" })).toBeInTheDocument();
    expect(screen.getByText(/not simply a charge on every window/i)).toBeInTheDocument();
    expect(screen.getByText("2s")).toBeInTheDocument();
    expect(screen.getByText("6s total")).toBeInTheDocument();
    expect(screen.getByText("10s total")).toBeInTheDocument();
    expect(screen.getByText("77-80")).toBeInTheDocument();
    expect(screen.getAllByText(/annual rental value/i).length).toBeGreaterThan(0);
  });

  it("publishes exactly the three approved figures with visible uncertainty", () => {
    const { container } = render(<WindowTaxPage />);
    const ids = Array.from(container.querySelectorAll("figure[data-material-id]")).map(
      (figure) => figure.getAttribute("data-material-id"),
    );

    expect(ids).toEqual([
      "nrs-dumfriesshire-closed-windows-1754",
      "edgar-street-worcester-photograph",
      "heidelberg-punch-repeal-cartoon-1850",
    ]);
    expect(screen.getAllByText(/what this does not prove/i)).toHaveLength(3);
    expect(screen.getAllByText(/presumably/i).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/M0012506|QAB 1\/13\/27/);
  });

  it("links the original evidence and the machine-readable media manifest", () => {
    render(<WindowTaxPage />);
    const links = screen.getAllByRole("link") as HTMLAnchorElement[];
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain(
      "https://www.scotlandspeople.gov.uk/news-and-articles/historical-tax-rolls-window-past",
    );
    expect(hrefs).toContain(
      "https://historicengland.org.uk/listing/the-list/list-entry/1389776",
    );
    expect(hrefs).toContain(
      "https://digi.ub.uni-heidelberg.de/diglit/punch1850/0173",
    );
    expect(hrefs).toContain("/media/window-tax/manifest.json");
  });

  it("keeps the deployed bytes equal to the public integrity manifest", () => {
    expect(manifest.schema).toBe("taxsorted.window-tax-media/1");
    expect(manifest.nrsCrownCopyrightImageCount).toEqual({ used: 1, limit: 20 });
    expect(manifest.materials).toHaveLength(3);

    for (const material of Object.values(windowTaxMaterials)) {
      const deployed = manifest.materials.find((candidate) => candidate.id === material.id);
      expect(deployed, material.id).toMatchObject({
        path: material.publicUrl,
        width: material.width,
        height: material.height,
        bytes: material.bytes,
        sha256: material.sha256,
        source: {
          assetUrl: material.source.directAssetUrl,
          sha256: material.technical.sourceSha256,
          width: material.technical.sourceWidth,
          height: material.technical.sourceHeight,
          bytes: material.technical.sourceBytes,
        },
      });

      const filePath = `${publicDirectory}${material.publicUrl}`;
      const bytes = readFileSync(filePath);
      expect(statSync(filePath).size, material.id).toBe(material.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), material.id).toBe(
        material.sha256,
      );
    }
  });
});

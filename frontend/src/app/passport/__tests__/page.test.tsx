// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  createPassportStore,
  type PassportStore,
  type PassportStoreBackend,
  type PassportStoreChange,
} from "@/lib/passport-store";
import { PassportClient } from "../passport-client";

async function openClient(
  backend: PassportStoreBackend = new Map<string, unknown>(),
) {
  const store = createPassportStore(backend);
  render(<PassportClient store={store} />);
  await screen.findByRole("heading", {
    name: /which income sources belong in this picture/i,
  });
  return { store, backend };
}

function choose(source: string, answer: "Yes" | "No" | "Not sure") {
  const legend = screen
    .getAllByText(new RegExp(source, "i"))
    .find((element) => element.tagName === "LEGEND");
  const fieldset = legend?.closest("fieldset");
  if (!fieldset) throw new Error(`Missing fieldset for ${source}`);
  fireEvent.click(
    Array.from(fieldset.querySelectorAll<HTMLInputElement>("input[type=radio]"))
      .find((input) => input.parentElement?.textContent?.trim() === answer)!,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Tax Position Passport", () => {
  it("opens without creating a Passport record or asking for identifiers", async () => {
    const backend = new Map<string, unknown>();
    await openClient(backend);

    expect(backend.size).toBe(0);
    expect(screen.getAllByRole("radio")).toHaveLength(15);
    expect(screen.queryByLabelText(/^name$/i)).toBeNull();
    expect(screen.queryByLabelText(/unique taxpayer reference|UTR/i)).toBeNull();
    expect(screen.queryByLabelText(/^national insurance number$/i)).toBeNull();
    expect(
      screen
        .getAllByRole("radio")
        .every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
    expect(
      screen.getByText(/complete the income-source map first/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", {
        name: /evidence state for p45, p60, p11d/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", {
        name: /evidence state for rent, expense and supporting foreign property records/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/0 held · 0 needed · 8 not checked · 0 not expected/i),
    ).toBeInTheDocument();
  });

  it("treats a deliberate Not sure as an explicit source answer", async () => {
    await openClient();

    choose("Employment or PAYE income", "Not sure");
    choose("Self-employment as a sole trader", "Not sure");
    choose("UK property income", "Not sure");
    choose("Foreign property income", "Not sure");
    choose("Another source or a complex situation", "Not sure");

    expect(
      screen.getByRole("button", { name: /check my position/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /I reviewed the source map/i }),
    ).toBeEnabled();
  });

  it("keeps an employment-only Passport separate from MTD and PAYE calculation", async () => {
    await openClient();

    choose("Employment or PAYE income", "Yes");
    choose("Self-employment as a sole trader", "No");
    choose("UK property income", "No");
    choose("Foreign property income", "No");
    choose("Another source or a complex situation", "No");

    expect(
      screen.getByText(/MTD Income Tax is not indicated by the reported sources/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not a full Self Assessment or PAYE calculation/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /check my position/i }),
    ).toBeNull();
  });

  it("writes only when Save this Passport is pressed", async () => {
    const backend = new Map<string, unknown>();
    await openClient(backend);
    choose("Employment or PAYE income", "Yes");
    expect(backend.size).toBe(0);

    fireEvent.click(
      screen.getByRole("button", { name: /save this passport/i }),
    );

    await screen.findByText(/local revision 1/i);
    expect(backend.size).toBe(1);
    expect(screen.getByText(/local revision 1/i)).toBeInTheDocument();
  });

  it("keeps edits made during a slow save as unsaved work", async () => {
    const values = new Map<string, unknown>();
    let releaseWrite: (() => void) | null = null;
    let markWriteStarted: (() => void) | null = null;
    const writeStarted = new Promise<void>((resolve) => {
      markWriteStarted = resolve;
    });
    const backend: PassportStoreBackend = {
      get: (key) => values.get(key),
      delete: (key) => values.delete(key),
      set: (key, value) => {
        markWriteStarted?.();
        return new Promise<void>((resolve) => {
          releaseWrite = () => {
            values.set(key, value);
            resolve();
          };
        });
      },
    };
    await openClient(backend);
    choose("Employment or PAYE income", "Yes");

    fireEvent.click(
      screen.getByRole("button", { name: /save this passport/i }),
    );
    await writeStarted;
    choose("Employment or PAYE income", "No");
    await act(async () => {
      releaseWrite?.();
    });

    await screen.findByText(/newer edits remain unsaved/i);
    expect(screen.getByText(/^Unsaved changes$/i)).toBeInTheDocument();
    expect(screen.getByText(/working copy changed/i)).toBeInTheDocument();
    const employment = screen
      .getAllByText(/Employment or PAYE income/i)
      .find((element) => element.tagName === "LEGEND")
      ?.closest("fieldset");
    expect(
      Array.from(
        employment!.querySelectorAll<HTMLInputElement>("input[type=radio]"),
      ).find((input) => input.parentElement?.textContent?.trim() === "No"),
    ).toBeChecked();
  });

  it("exports reviewed current facts as portable JSON without a network call", async () => {
    await openClient();
    choose("Employment or PAYE income", "Yes");
    choose("Self-employment as a sole trader", "No");
    choose("UK property income", "No");
    choose("Foreign property income", "No");
    choose("Another source or a complex situation", "No");

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:passport");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    let downloadedName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedName = this.download;
    });

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /I reviewed the source map/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /download passport JSON/i }),
    );

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:passport");
    expect(downloadedName).toMatch(/^taxsorted-tax-position-\d{4}-\d{2}-\d{2}\.json$/);
    expect(fetchSpy).not.toHaveBeenCalled();

    const blob = createObjectUrl.mock.calls[0][0] as Blob;
    const body = JSON.parse(await blob.text());
    expect(body).toMatchObject({
      schema: "taxsorted.uk.tax-position-passport/1",
      assurance: {
        identityVerified: false,
        professionallyReviewed: false,
        filed: false,
      },
      dataHandling: {
        generationMode: "browser-local",
        sentToTaxSorted: false,
        rawDocumentsIncluded: false,
      },
      positions: [],
    });
  });

  it("uses a two-step delete and leaves other browser data alone", async () => {
    const backend = new Map<string, unknown>();
    backend.set("taxsorted-local-books-v2", { records: 3 });
    await openClient(backend);
    fireEvent.click(
      screen.getByRole("button", { name: /save this passport/i }),
    );
    await screen.findByText(/local revision 1/i);

    fireEvent.click(
      screen.getByRole("button", { name: /prepare to delete/i }),
    );
    expect(
      screen.getByRole("button", { name: /delete this passport now/i }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /delete this passport now/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Starter Books and other browser tools were not changed/i),
      ).toBeInTheDocument(),
    );
    expect(backend.get("taxsorted-local-books-v2")).toEqual({ records: 3 });
  });

  it("blocks handoff when an attached MTD check conflicts with a later no-source map", async () => {
    await openClient();
    choose("Employment or PAYE income", "No");
    choose("Self-employment as a sole trader", "Yes");
    choose("UK property income", "No");
    choose("Foreign property income", "No");
    choose("Another source or a complex situation", "No");

    fireEvent.click(
      screen.getByRole("button", { name: /check my position/i }),
    );
    await screen.findByText(/result status:/i);
    choose("Self-employment as a sole trader", "No");

    expect(
      screen.getByText(/An MTD check is attached even though the source map now says no/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /I reviewed the source map/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /download passport JSON/i }),
    ).toBeDisabled();
  });

  it("blocks stale handoff when another tab changes the stored Passport", async () => {
    const base = createPassportStore(new Map<string, unknown>());
    let emitExternal: ((change: PassportStoreChange) => void) | null = null;
    const store: PassportStore = {
      ...base,
      subscribe: (listener) => {
        emitExternal = listener;
        return () => undefined;
      },
    };
    render(<PassportClient store={store} />);
    await screen.findByRole("heading", {
      name: /which income sources belong in this picture/i,
    });
    choose("Employment or PAYE income", "Yes");
    choose("Self-employment as a sole trader", "No");
    choose("UK property income", "No");
    choose("Foreign property income", "No");
    choose("Another source or a complex situation", "No");
    fireEvent.click(
      screen.getByRole("checkbox", { name: /I reviewed the source map/i }),
    );
    expect(
      screen.getByRole("button", { name: /download passport JSON/i }),
    ).toBeEnabled();

    act(() => {
      emitExternal?.({ source: "external", kind: "saved", revision: 2 });
    });

    expect(screen.getByText(/Another tab changed this Passport/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download passport JSON/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /reload before saving/i }),
    ).toBeDisabled();
  });
});

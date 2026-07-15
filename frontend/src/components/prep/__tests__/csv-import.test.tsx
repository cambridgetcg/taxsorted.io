// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CsvImport } from "../csv-import";

function csvFile(name: string, read: () => Promise<string>): File {
  return { name, text: read } as File;
}

describe("CSV import screen", () => {
  it("keeps the newest file when an older read finishes late", async () => {
    let finishFirst!: (text: string) => void;
    const firstText = new Promise<string>((resolve) => {
      finishFirst = resolve;
    });
    const first = csvFile("first.csv", () => firstText);
    const second = csvFile(
      "second.csv",
      async () => "Date,Description,Amount\n13/05/2026,SECOND PAYMENT,10.00"
    );
    render(
      <CsvImport
        onImport={vi.fn().mockResolvedValue({ added: [], duplicateCount: 0, conflicts: [] })}
      />
    );

    const input = screen.getByLabelText(/CSV file/i);
    fireEvent.change(input, { target: { files: [first] } });
    fireEvent.change(input, { target: { files: [second] } });

    expect(await screen.findByText(/Selected: second\.csv/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("radio", { name: /Self-employment/i }));
    expect(await screen.findByText("SECOND PAYMENT")).toBeInTheDocument();

    finishFirst("Date,Description,Amount\n13/05/2026,FIRST PAYMENT,99.00");
    await waitFor(() => {
      expect(screen.getByText(/Selected: second\.csv/i)).toBeInTheDocument();
      expect(screen.getByText("SECOND PAYMENT")).toBeInTheDocument();
      expect(screen.queryByText("FIRST PAYMENT")).not.toBeInTheDocument();
    });
  });

  it("hides the old file's rows while a new file is still being read", async () => {
    let finishSecond!: (text: string) => void;
    const secondText = new Promise<string>((resolve) => {
      finishSecond = resolve;
    });
    const first = csvFile(
      "first.csv",
      async () => "Date,Description,Amount\n13/05/2026,FIRST PAYMENT,10.00"
    );
    const second = csvFile("second.csv", () => secondText);
    render(
      <CsvImport
        onImport={vi.fn().mockResolvedValue({ added: [], duplicateCount: 0, conflicts: [] })}
      />
    );

    const input = screen.getByLabelText(/CSV file/i);
    fireEvent.change(input, { target: { files: [first] } });
    fireEvent.click(await screen.findByRole("radio", { name: /Self-employment/i }));
    expect(await screen.findByText("FIRST PAYMENT")).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [second] } });
    expect(screen.getByText(/Selected: second\.csv/i)).toBeInTheDocument();
    expect(screen.queryByText("FIRST PAYMENT")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add .*Money Inbox/i })).not.toBeInTheDocument();

    finishSecond("Date,Description,Amount\n13/05/2026,SECOND PAYMENT,20.00");
    fireEvent.click(await screen.findByRole("radio", { name: /Self-employment/i }));
    expect(await screen.findByText("SECOND PAYMENT")).toBeInTheDocument();
  });

  it("shows the physical CSV line number, counting the header", async () => {
    const file = csvFile(
      "warning.csv",
      async () => "Date,Description,Amount\n01/05/2026,AMBIGUOUS DATE,10.00"
    );
    render(
      <CsvImport
        onImport={vi.fn().mockResolvedValue({ added: [], duplicateCount: 0, conflicts: [] })}
      />
    );

    fireEvent.change(screen.getByLabelText(/CSV file/i), { target: { files: [file] } });
    fireEvent.click(await screen.findByRole("radio", { name: /Self-employment/i }));

    expect(await screen.findByText("Row 2")).toBeInTheDocument();
  });
});

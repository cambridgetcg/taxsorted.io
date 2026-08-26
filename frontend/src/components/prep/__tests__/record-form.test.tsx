// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordForm } from "../record-form";

describe("RecordForm", () => {
  it("announces a plain save failure and keeps technical detail optional", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("internal category invariant"));
    render(<RecordForm onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText("How much?"), {
      target: { value: "12.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to check" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn’t add this item. Nothing was saved. Try again.",
    );
    await waitFor(() => expect(onAdd).toHaveBeenCalledOnce());

    const details = screen.getByText("Technical detail").closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Technical detail"));
    expect(screen.getByText("internal category invariant")).toBeVisible();
  });
});

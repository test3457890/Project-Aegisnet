import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithMockState } from "../../../test/renderWithMockState";
import { MessageComposer } from "./MessageComposer";

describe("MessageComposer", () => {
  it("sends with Enter and clears the input", async () => {
    const sendMessage = vi.fn(() => "msg_test");
    const user = userEvent.setup();
    renderWithMockState(<MessageComposer targetId="chat_sarah" />, { sendMessage });

    const input = screen.getByRole("textbox", { name: "Message" });
    await user.type(input, "On my way{enter}");

    expect(sendMessage).toHaveBeenCalledWith("chat_sarah", "On my way", undefined);
    expect(input).toHaveValue("");
  });

  it("keeps Shift+Enter as a new line until Send is clicked", async () => {
    const sendMessage = vi.fn(() => "msg_test");
    const user = userEvent.setup();
    renderWithMockState(<MessageComposer targetId="chat_family" />, { sendMessage });

    const input = screen.getByRole("textbox", { name: "Message" });
    await user.type(input, "Line one{shift>}{enter}{/shift}Line two");
    expect(sendMessage).not.toHaveBeenCalled();
    expect(input).toHaveValue("Line one\nLine two");

    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(sendMessage).toHaveBeenCalledWith("chat_family", "Line one\nLine two", undefined);
  });

  it("shows a friendly validation error for unsupported files", async () => {
    const { container } = renderWithMockState(<MessageComposer targetId="chat_sarah" />);
    const fileInput = container.querySelector('input[type="file"][accept*=".pdf"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [new File(["x"], "unsafe.exe")] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("not supported");
  });

  it("previews and removes a supported local file", async () => {
    const { container } = renderWithMockState(<MessageComposer targetId="chat_sarah" />);
    const fileInput = container.querySelector('input[type="file"][accept*=".pdf"]') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: { files: [new File(["notes"], "family-notes.txt", { type: "text/plain" })] },
    });

    expect(await screen.findByText("family-notes.txt")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    await waitFor(() => expect(screen.queryByText("family-notes.txt")).not.toBeInTheDocument());
  });

  it("opens and closes the image preview lightbox", async () => {
    const { container } = renderWithMockState(<MessageComposer targetId="chat_sarah" />);
    const imageInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // We can't really read File blob as Data URL synchronously in jsdom without mocking FileReader,
    // but we can test the behavior.
    fireEvent.change(imageInput, {
      target: { files: [new File(["dummy"], "photo.png", { type: "image/png" })] },
    });

    // Wait for the thumbnail preview button to appear
    const previewImg = await screen.findByAltText(/Attachment preview/i);
    await userEvent.click(previewImg);

    // Lightbox should be open
    expect(await screen.findByRole("dialog", { name: "Media Lightbox" })).toBeInTheDocument();

    // Close with escape
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Media Lightbox" })).not.toBeInTheDocument());
  });
});

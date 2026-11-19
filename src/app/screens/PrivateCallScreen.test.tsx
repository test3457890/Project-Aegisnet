import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockAppStateProvider } from "../state/MockAppStateContext";
import { PrivateCallScreen } from "./PrivateCallScreen";

describe("PrivateCallScreen controls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline test")));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("toggles local controls and steps through reconnect states", () => {
    render(
      <MockAppStateProvider>
        <MemoryRouter initialEntries={["/app/private/dm/chat_sarah/call/video"]}>
          <Routes>
            <Route path="/app/private/dm/:chatId/call/:callType" element={<PrivateCallScreen />} />
          </Routes>
        </MemoryRouter>
      </MockAppStateProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reconnect simulation/i }));
    expect(screen.getByText("Unstable")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(900));
    expect(screen.getByText("Reconnecting")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(900));
    expect(screen.getByText("Unstable")).toBeInTheDocument();
  });
});

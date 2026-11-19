import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MockAppStateProvider } from "./MockAppStateContext";
import { useMockAppState } from "./mockAppState";

function PreferenceProbe() {
  const state = useMockAppState();
  return (
    <div>
      <span data-testid="low-bandwidth">{String(state.preferences.lowBandwidthMode)}</span>
      <button onClick={() => state.updatePreference("lowBandwidthMode", true)}>Enable Low Bandwidth</button>
      <button onClick={() => state.clearLocalData()}>Clear Data</button>
    </div>
  );
}

describe("MockAppState preferences and data hygiene", () => {
  it("updates preferences and clears local data", async () => {
    localStorage.clear();
    
    render(
      <MockAppStateProvider>
        <PreferenceProbe />
      </MockAppStateProvider>
    );

    // Initial state should be false
    expect(screen.getByTestId("low-bandwidth")).toHaveTextContent("false");

    // Enable it
    fireEvent.click(screen.getByRole("button", { name: "Enable Low Bandwidth" }));
    expect(screen.getByTestId("low-bandwidth")).toHaveTextContent("true");

    // Clear data
    fireEvent.click(screen.getByRole("button", { name: "Clear Data" }));
    
    // Check if localStorage is cleared. Preferences effect writes initial state back.
    await waitFor(() => {
      const prefs = JSON.parse(localStorage.getItem("aegisnet_preferences") || "{}");
      expect(prefs.lowBandwidthMode).toBe(false);
    });
  });
});

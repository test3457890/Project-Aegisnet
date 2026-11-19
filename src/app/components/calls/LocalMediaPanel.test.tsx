import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { LocalMediaPanel } from "./LocalMediaPanel";

describe("LocalMediaPanel", () => {
  it("waits for explicit permission and stops local tracks", async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    });
    const enumerateDevices = vi.fn().mockResolvedValue([
      { deviceId: "camera-1", kind: "videoinput", label: "Front camera" },
      { deviceId: "mic-1", kind: "audioinput", label: "Built-in mic" },
    ]);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia, enumerateDevices },
    });

    const user = userEvent.setup();
    render(<LocalMediaPanel />);

    expect(getUserMedia).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Show device preview/i }));
    expect(getUserMedia).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Enable preview" }));
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
    expect(await screen.findByText(/Nothing is sent/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop preview" }));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByText("Local camera preview stopped.")).toBeInTheDocument();
  });

  it("persists a selected device and clears it when the device disappears", async () => {
    localStorage.setItem("aegisnet_media_videoDeviceId", "old-camera");
    const enumerateDevices = vi.fn()
      .mockResolvedValueOnce([{ deviceId: "new-camera", kind: "videoinput", label: "New camera" }])
      .mockResolvedValue([{ deviceId: "new-camera", kind: "videoinput", label: "New camera" }]);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(), enumerateDevices },
    });

    const user = userEvent.setup();
    render(<LocalMediaPanel />);
    await user.click(screen.getByRole("button", { name: /Show device preview/i }));

    expect(await screen.findByText(/saved camera preference is unavailable/)).toBeInTheDocument();
    expect(localStorage.getItem("aegisnet_media_videoDeviceId")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Camera"), "new-camera");
    expect(localStorage.getItem("aegisnet_media_videoDeviceId")).toBe("new-camera");
  });
});

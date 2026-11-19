import { getFileExtension } from "./files";

const colors: Record<string, string> = {
  pdf: "#dc2626",
  doc: "#2563eb",
  docx: "#2563eb",
  xlsx: "#15803d",
  zip: "#a16207",
  txt: "#475569",
};

export async function createDocumentThumbnail(file: File) {
  const extension = getFileExtension(file.name);
  if (!["pdf", "doc", "docx", "xlsx", "zip", "txt"].includes(extension)) return undefined;

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 200;
  const context = canvas.getContext("2d");
  if (!context) return undefined;

  context.fillStyle = colors[extension] || "#475569";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.14)";
  context.fillRect(24, 22, 272, 156);
  context.fillStyle = "#ffffff";
  context.font = "700 42px Arial";
  context.textAlign = "center";
  context.fillText(extension.toUpperCase(), 160, 94);
  context.font = "600 16px Arial";
  context.fillText(file.name.slice(0, 28), 160, 130);

  if (extension === "txt") {
    try {
      const preview = (await file.text()).replace(/\s+/g, " ").slice(0, 42);
      context.font = "13px Arial";
      context.fillStyle = "rgba(255,255,255,.8)";
      context.fillText(preview, 160, 158);
    } catch {
      // The type label is still useful when a text preview cannot be read.
    }
  }

  return canvas.toDataURL("image/webp", 0.72);
}

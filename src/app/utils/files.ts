import { MockMessage } from "../data/mockChats";

export const SUPPORTED_EXTENSIONS = [
  "pdf", "docx", "txt",
  "png", "jpg", "jpeg", "webp", "gif",
] as const;

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"] as const;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function validatePrototypeFile(file: File, imageOnly = false) {
  const extension = getFileExtension(file.name);
  const supported = SUPPORTED_EXTENSIONS.includes(extension as typeof SUPPORTED_EXTENSIONS[number]);
  const isImage = IMAGE_EXTENSIONS.includes(extension as typeof IMAGE_EXTENSIONS[number]);

  if (!supported || (imageOnly && !isImage)) {
    return imageOnly
      ? "Choose a PNG, JPG, JPEG, WEBP, or GIF image."
      : "That file type is not supported. Try a PDF, DOCX, text file, or image.";
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `That file is too large for this prototype. Choose a file under ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return `Image previews are limited to ${formatBytes(MAX_IMAGE_BYTES)} in this local prototype.`;
  }

  return null;
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The file preview could not be created."));
    reader.readAsDataURL(file);
  });
}

export function createMockGifAttachment(label: string, _color: string): NonNullable<MockMessage["attachment"]> {
  return {
    type: "gif",
    // Tiny inert GIF data keeps the mock picker local without previewing SVG/HTML content.
    url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    name: `${label}.gif`,
    mimeType: "image/gif",
  };
}

export function getRoomConversationId(networkId: string, roomId: string) {
  return `network:${networkId}:room:${roomId}`;
}

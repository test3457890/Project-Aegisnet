import { useEffect, useRef } from "react";

/**
 * Stable screen-share preview.
 *
 * Fix for the "screen share flashes black / pops in and out" bug: the previous
 * implementation assigned `video.srcObject` through an inline callback ref.
 * Inline callback refs are detached and re-attached on EVERY render, and the
 * call screens re-render every second (call timer), so the <video> element was
 * reloading its stream once per second — a rhythmic black flash.
 *
 * This component keeps one stable <video> ref and only assigns `srcObject`
 * when the actual MediaStream instance changes.
 */
export function ScreenSharePreview({ stream, className }: { stream: MediaStream; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.srcObject !== stream) {
      video.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      data-testid="screen-share-preview"
      className={className}
    />
  );
}

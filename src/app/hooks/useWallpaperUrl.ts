import { useState, useEffect } from "react";
import { getPrototypeFile } from "../storage/prototypeFileStore";

const urlCache = new Map<string, string>();

export function useWallpaperUrl(hash?: string) {
  const [url, setUrl] = useState<string | undefined>(hash ? urlCache.get(hash) : undefined);

  useEffect(() => {
    if (!hash) {
      setUrl(undefined);
      return;
    }
    
    if (urlCache.has(hash)) {
      setUrl(urlCache.get(hash));
      return;
    }

    let isMounted = true;
    getPrototypeFile(hash).then((file) => {
      if (file && file.blob && isMounted) {
        const objectUrl = URL.createObjectURL(file.blob);
        urlCache.set(hash, objectUrl);
        setUrl(objectUrl);
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [hash]);

  return url;
}

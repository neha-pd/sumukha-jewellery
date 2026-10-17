import { useEffect, useState } from "react";

const databaseName = "sumukha-local-preview";
const storeName = "category-images";
const changeEvent = "sumukha:category-images-changed";
const maxImageSize = 8 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type CategoryImageRecord = {
  slug: string;
  image: Blob;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: "slug" });
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open the local image store."));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("The local image store is blocked by another open page. Close other Sumukha preview tabs and try again."));
    };
  });
}

function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    let result: T;
    let settled = false;
    const fail = (error: DOMException | null, fallback: string) => {
      if (settled) return;
      settled = true;
      reject(error ?? new Error(fallback));
    };

    try {
      const transaction = database.transaction(storeName, mode);
      const request = action(transaction.objectStore(storeName));
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => fail(request.error, "Could not access the local image store.");
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      transaction.onerror = () => fail(transaction.error, "Could not save the collection image.");
      transaction.onabort = () => fail(transaction.error, "The local image update was cancelled.");
    } catch (error) {
      settled = true;
      reject(error);
    } finally {
      database.close();
    }
  }));
}

export async function listCategoryImages(): Promise<CategoryImageRecord[]> {
  return withStore("readonly", (store) => store.getAll());
}

export async function saveCategoryImage(slug: string, image: File): Promise<void> {
  if (!supportedImageTypes.has(image.type)) {
    throw new Error("Choose a JPG, PNG, WebP, or GIF image.");
  }
  if (image.size === 0 || image.size > maxImageSize) {
    throw new Error("Choose an image smaller than 8 MB.");
  }
  await withStore("readwrite", (store) => store.put({ slug, image }));
  window.dispatchEvent(new Event(changeEvent));
}

export async function removeCategoryImage(slug: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(slug));
  window.dispatchEvent(new Event(changeEvent));
}

export function useLocalCategoryImages() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    let generation = 0;
    let currentUrls: string[] = [];

    const load = async () => {
      const requestGeneration = ++generation;
      try {
        const records = await listCategoryImages();
        const nextImages: Record<string, string> = {};
        const nextUrls = records.map(({ slug, image }) => {
          const url = URL.createObjectURL(image);
          nextImages[slug] = url;
          return url;
        });
        if (!active || requestGeneration !== generation) {
          nextUrls.forEach(URL.revokeObjectURL);
          return;
        }
        currentUrls.forEach(URL.revokeObjectURL);
        currentUrls = nextUrls;
        setImages(nextImages);
        setError("");
      } catch (reason) {
        if (active && requestGeneration === generation) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      }
    };

    void load();
    window.addEventListener(changeEvent, load);
    return () => {
      active = false;
      window.removeEventListener(changeEvent, load);
      currentUrls.forEach(URL.revokeObjectURL);
    };
  }, []);

  return { images, error };
}

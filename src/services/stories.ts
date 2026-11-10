export interface LocalStory {
  id: string;
  caption: string;
  media: Blob;
  mediaType: "image" | "video";
  mediaName: string;
  createdAt: number;
}

const DATABASE_NAME = "nexus.media";
const DATABASE_VERSION = 2;
const STORE_NAME = "stories";

function openStoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Tämä selain ei tue tarinoiden paikallista mediatallennusta."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("creator-videos")) {
        database.createObjectStore("creator-videos", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Tarinatietokantaa ei voitu avata."));
    request.onblocked = () => reject(new Error("Tarinatietokannan päivitys estyi. Sulje muut NEXUS-välilehdet ja yritä uudelleen."));
  });
}

export async function getLocalStories(): Promise<LocalStory[]> {
  const database = await openStoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as LocalStory[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Tallennettuja tarinoita ei voitu lukea."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Tallennettuja tarinoita ei voitu lukea."));
    };
  });
}

export async function saveLocalStory(story: LocalStory): Promise<void> {
  const database = await openStoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(story);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Tarinan tallennus epäonnistui."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Tarinan tallennus keskeytyi."));
    };
  });
}

export async function deleteLocalStory(id: string): Promise<void> {
  const database = await openStoryDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Tarinan poistaminen epäonnistui."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Tarinan poistaminen keskeytyi."));
    };
  });
}

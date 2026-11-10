const DATABASE_NAME = "nexus.media";
const DATABASE_VERSION = 2;
const STORE_NAME = "creator-videos";

function openCreatorVideoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Tämä selain ei tue videoiden paikallista tallennusta."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("stories")) {
        database.createObjectStore("stories", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Videotietokantaa ei voitu avata."));
    request.onblocked = () => reject(new Error("Videotietokannan päivitys estyi. Sulje muut NEXUS-välilehdet ja yritä uudelleen."));
  });
}

export async function saveCreatorVideo(id: string, media: Blob): Promise<void> {
  const database = await openCreatorVideoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ id, media });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Videon tallennus epäonnistui."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Videon tallennus keskeytyi."));
    };
  });
}

export async function getCreatorVideo(id: string): Promise<Blob | null> {
  const database = await openCreatorVideoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.media instanceof Blob ? request.result.media : null);
    request.onerror = () => reject(request.error ?? new Error("Tallennettua videota ei voitu lukea."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Tallennettua videota ei voitu lukea."));
    };
  });
}

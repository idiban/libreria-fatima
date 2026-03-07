
// Cache global en memoria para reducir lecturas de Firestore
export let booksCache: any[] | null = null;
export let clientsCache: any[] | null = null;

export const setBooksCache = (data: any[]) => {
  booksCache = data;
};

export const setClientsCache = (data: any[]) => {
  clientsCache = data;
};

export const invalidateBooksCache = () => {
  booksCache = null;
};

export const invalidateClientsCache = () => {
  clientsCache = null;
};

export const invalidateAllCache = () => {
  booksCache = null;
  clientsCache = null;
};


// Cache global en memoria para reducir lecturas de Firestore
export let booksCache: any[] | null = null;
export let clientsCache: any[] | null = null;
export let usersCache: any[] | null = null;

let booksCacheTime = 0;
let clientsCacheTime = 0;
let usersCacheTime = 0;

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

export const getBooksCache = () => {
  if (booksCache && (Date.now() - booksCacheTime < CACHE_TTL)) return booksCache;
  return null;
};

export const getClientsCache = () => {
  if (clientsCache && (Date.now() - clientsCacheTime < CACHE_TTL)) return clientsCache;
  return null;
};

export const getUsersCache = () => {
  if (usersCache && (Date.now() - usersCacheTime < CACHE_TTL)) return usersCache;
  return null;
};

export const setBooksCache = (data: any[]) => {
  booksCache = data;
  booksCacheTime = Date.now();
};

export const setClientsCache = (data: any[]) => {
  clientsCache = data;
  clientsCacheTime = Date.now();
};

export const setUsersCache = (data: any[]) => {
  usersCache = data;
  usersCacheTime = Date.now();
};

export const updateBookInCache = (bookId: string, updates: any) => {
  if (!booksCache) return;
  booksCache = booksCache.map(b => b.id === bookId ? { ...b, ...updates } : b);
};

export const updateClientInCache = (clientId: string, updates: any) => {
  if (!clientsCache) return;
  clientsCache = clientsCache.map(c => c.id === clientId ? { ...c, ...updates } : c);
};

export const invalidateBooksCache = () => {
  booksCache = null;
  booksCacheTime = 0;
};

export const invalidateClientsCache = () => {
  clientsCache = null;
  clientsCacheTime = 0;
};

export const invalidateUsersCache = () => {
  usersCache = null;
  usersCacheTime = 0;
};

export const invalidateAllCache = () => {
  invalidateBooksCache();
  invalidateClientsCache();
  invalidateUsersCache();
};

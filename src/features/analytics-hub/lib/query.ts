import { type QueryFunction } from "@tanstack/react-query";

const throwIfResNotOk = async (res: Response) => {
  if (res.ok) return;
  const text = (await res.text()) || res.statusText;
  throw new Error(`${res.status}: ${text}`);
};

export const getQueryFn = <T>(): QueryFunction<T> => {
  return async ({ queryKey }) => {
    const [rawUrl] = queryKey;
    const url = String(rawUrl || "");
    const res = await fetch(url, { credentials: "include" });
    await throwIfResNotOk(res);
    return res.json() as Promise<T>;
  };
};

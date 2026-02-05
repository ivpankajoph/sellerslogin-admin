

// Immutably update nested state
export function updateFieldImmutable(obj: any, path: string[], value: any) {
  const clone = structuredClone(obj);
  if (!path.length) return clone;

  const isIndex = (key: string) => /^\d+$/.test(key);

  let current: any = clone;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const nextKey = path[i + 1];
    const shouldBeArray = isIndex(nextKey);

    if (Array.isArray(current)) {
      const index = isIndex(key) ? Number(key) : Number.NaN;
      if (!Number.isFinite(index)) return clone;
      if (current[index] === undefined || current[index] === null) {
        current[index] = shouldBeArray ? [] : {};
      }
      current = current[index];
      continue;
    }

    if (current[key] === undefined || current[key] === null) {
      current[key] = shouldBeArray ? [] : {};
    }
    current = current[key];
  }

  const lastKey = path[path.length - 1];
  if (Array.isArray(current) && isIndex(lastKey)) {
    current[Number(lastKey)] = value;
  } else {
    current[lastKey] = value;
  }

  return clone;
}

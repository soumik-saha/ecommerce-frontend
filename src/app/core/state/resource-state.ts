export interface ResourceState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
}

export function createResourceState<T>(initialData: T): ResourceState<T> {
  return {
    data: initialData,
    loading: false,
    error: null,
    lastUpdatedAt: null
  };
}

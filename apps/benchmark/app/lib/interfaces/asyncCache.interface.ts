export interface AsyncCache<V> {
  getOrLoad(key: string, loader: () => Promise<V>): Promise<V>;
}

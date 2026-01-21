/**
 * Chain configuration interface
 */
export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  blockExplorer: {
    name: string;
    url: string;
  };
}

export const SESSION_VERSION = Symbol('SESSION_VERSION');
export interface SessionVersions {
  getVersion(userId: number): Promise<number | null>;
}

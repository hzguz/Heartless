let cachedPlatform: NodeJS.Platform | null = null;

export async function getPlatform(): Promise<NodeJS.Platform> {
  if (cachedPlatform) return cachedPlatform;
  cachedPlatform = await window.heartless.platform();
  return cachedPlatform;
}

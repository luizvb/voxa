export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[], nodeEnv: string | undefined): boolean {
  if (!origin || allowedOrigins.includes(origin)) return true;
  return nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

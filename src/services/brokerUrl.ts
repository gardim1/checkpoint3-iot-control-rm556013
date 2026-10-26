export function validateBrokerUrl(value: string): string {
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    if (!['ws:', 'wss:'].includes(parsed.protocol) || !parsed.hostname) throw new Error();
    return trimmed;
  } catch {
    throw new Error('URL inválida. Use ws:// ou wss:// com um endereço válido.');
  }
}

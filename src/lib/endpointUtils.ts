// Replaces :param placeholders in a URL string with matching values from a row data record
export function substituteEndpointParams(endpoint: string, rowData: Record<string, unknown>): string {
  return endpoint.replace(/:(\w+)/g, (match, key: string) => {
    const value = rowData[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

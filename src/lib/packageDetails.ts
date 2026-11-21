export function serializePackageTypes(types: readonly string[], customType: string): string {
  return [...new Set(types.map(type => type === 'Other' ? customType.trim() || 'Other' : type))].join(', ');
}
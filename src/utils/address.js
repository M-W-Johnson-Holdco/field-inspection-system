export function formatPropertyAddress(parts) {
  const addressLine = [parts.address1, parts.address2].filter(Boolean).join(', ')
  const cityLine = `${parts.city}, ${parts.state} ${parts.zipcode}`
  return `${addressLine}, ${cityLine}`
}

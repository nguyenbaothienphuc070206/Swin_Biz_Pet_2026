export function isValidVietnamClinicPin(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude !== 0 && longitude !== 0
    && latitude >= 8.18 && latitude <= 23.39
    && longitude >= 102.14 && longitude <= 109.47;
}

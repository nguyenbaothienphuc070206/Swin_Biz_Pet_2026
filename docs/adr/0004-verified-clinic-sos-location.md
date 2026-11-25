# ADR 0004: Require admin-verified clinic locations for SOS

- Status: Accepted, 2026-10-27

## Context

The SOS matcher requires a trusted clinic point. A clinic-provided address or pin alone is not enough to establish location or 24/7 emergency coverage.

## Decision

Reuse the Google Maps JavaScript key and server-side Google Geocoding API v4 adapter. Add a click/drag pin picker, address search and reverse-geocode country validation (`VN`). The database rejects `0,0` and points outside the Vietnam coordinate bounds. A clinic admin requests 24/7 SOS eligibility; a step-up-authenticated platform admin checks the pin and coverage before the database sets `supports_24h` and `location_verified_at`. The matcher and fallback list require the verification timestamp.

## Consequences

- Geocoding requires Google Cloud billing and quotas. User-entered addresses are sent to Google and this is disclosed.
- The Vietnam bounding rectangle is only a guard; reverse-geocoded country data and human admin review provide the country/clinic validation.
- Legal review of address transfer and the geocoding provider's terms remains open.

## Official references

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)
- [Google Geocoding API v4](https://developers.google.com/maps/documentation/geocoding/geocoding)
- [Reverse geocoding](https://developers.google.com/maps/documentation/geocoding/reverse-geocoding)
- [Geocoding usage and billing](https://developers.google.com/maps/documentation/geocoding/usage-and-billing)

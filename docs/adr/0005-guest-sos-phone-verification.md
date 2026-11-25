# ADR 0005: Verify guest SOS callbacks with Twilio Verify

- Status: Accepted, 2026-10-27
- Vendor approval: User approved Twilio Verify for this task.

## Context

Guest SOS requires a verified callback phone while preserving an emergency fallback when SMS verification is down. The app needs limits by phone, device and IP, and a daily spend control.

## Decision

Use Twilio Verify behind the server-only `GuestOtpAdapter`. The app reserves a configured global daily estimated spend amount and per-phone/device/IP send quotas before calling Twilio. Verified proof is single-use and expires after ten minutes. If sending is unavailable or the cap is reached, allow a callback-only SOS under a one-per-day unverified limit per phone/device/IP.

The spend cap is an internal estimate, not a provider-enforced hard ceiling. Operators must set the unit estimate from current destination pricing and configure provider billing controls. Twilio documents $0.05 per successful verification plus channel delivery fees; its current Vietnam SMS page lists $0.2852 per outbound segment, and carrier fees can apply.

## Consequences

- OTP credentials are server-only and may be absent in non-production; in that state guest callback fallback remains available.
- Test an outage explicitly. Daily budget reservations are not refunded after provider failures, which favors conservative spending.
- SMS destination price can change; config and account-level billing controls require operational review.

## Official references

- [Twilio Verify API](https://www.twilio.com/docs/verify/api/verification)
- [Twilio Verify pricing](https://www.twilio.com/en-us/verify/pricing)
- [Twilio Vietnam SMS pricing](https://www.twilio.com/en-us/sms/pricing/vn)

export interface PhoneOtpAdapter {
  requestCode(phone: string): Promise<{ok: boolean; error?: string}>;
  verifyCode(phone: string, code: string): Promise<{ok: boolean; error?: string}>;
}

// Provider wiring belongs here once a verified SMS vendor and project policy are supplied.
export const phoneOtpAdapter: PhoneOtpAdapter = {
  async requestCode() { return {ok: false, error: "not_configured"}; },
  async verifyCode() { return {ok: false, error: "not_configured"}; },
};

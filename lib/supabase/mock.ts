export function createDevMockSupabaseClient(userId = "dev-user-id") {
  const samplePets: any[] = [];

  const createQuery = (tableName: string) => {
    const resultData: any = tableName === "pets" ? samplePets : [];
    const query: any = {
      select: () => query,
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => query,
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => query,
      eq: () => query,
      is: () => query,
      order: () => Promise.resolve({ data: resultData, error: null }),
      limit: () => Promise.resolve({ data: resultData, error: null }),
      single: () => Promise.resolve({ data: resultData[0] || null, error: null }),
      maybeSingle: () => Promise.resolve({ data: resultData[0] || null, error: null }),
      then: (resolve: any) => resolve({ data: resultData, error: null }),
    };
    return query;
  };

  return {
    from: (tableName: string) => createQuery(tableName),
    rpc: async (functionName: string, args?: any) => {
      if (functionName === "clinic_sos_inbox") {
        return {
          data: [
            {
              request_id: "c1000000-0000-4000-8000-000000000001",
              dispatch_id: "d1000000-0000-4000-8000-000000000001",
              clinic_id: "petcare-d1-0000-4000-8000-000000000001",
              species: "cat",
              symptom_chips: ["breathing", "trauma"],
              urgency: "emergency",
              distance_band: "within_2_km",
              round_radius_m: 5000,
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        };
      }
      if (functionName === "clinic_sos_settings") {
        return {
          data: [
            {
              clinic_id: "petcare-d1-0000-4000-8000-000000000001",
              clinic_name: "Phòng Khám Thú Y PetCare · Quận 1",
              supports_24h: true,
              supports_24h_requested: false,
              emergency_status: "online",
              address: "124-126 Pasteur, Bến Nghé, Quận 1, TP. Hồ Chí Minh",
              latitude: 10.7769,
              longitude: 106.7009,
              location_verified_at: new Date().toISOString(),
              is_admin: true,
            },
          ],
          error: null,
        };
      }
      if (functionName === "accept_sos_v2") {
        return { data: true, error: null };
      }
      if (functionName === "accepted_sos_details") {
        return {
          data: [
            {
              latitude: 10.7780,
              longitude: 106.6990,
              owner_phone: "0912 345 678",
            },
          ],
          error: null,
        };
      }
      if (functionName === "accepted_sos_photo") {
        return { data: null, error: null };
      }
      if (functionName === "update_clinic_sos_settings") {
        return { data: true, error: null };
      }
      return { data: null, error: null };
    },
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: userId,
            email: "",
            user_metadata: {},
          },
        },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal2" }, error: null }),
      },
    },
  };
}

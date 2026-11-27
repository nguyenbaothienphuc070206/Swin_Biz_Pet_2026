import {
  getPortalDatabase,
  persistPortalDatabase,
  resolveOwnerAccount,
  syncOwnerPetsToBackend,
} from "@/lib/portal-store/server-store";

export function createDevMockSupabaseClient(userId = "owner-premium-01") {
  const getTableRows = (tableName: string): any[] => {
    const db = getPortalDatabase();
    const ownerAcc = resolveOwnerAccount(userId);
    switch (tableName) {
      case "pets":
        return Object.values(db.ownerPets).map((p) => ({
          id: p.id,
          owner_id: p.ownerId,
          name: p.name,
          species: p.species,
          breed: p.breed,
          birth_date: p.birthDate,
          microchip: p.microchip,
          weight_kg: p.weightKg,
        }));
      case "profiles":
        return Object.values(db.ownerAccounts).map((acc) => ({
          id: acc.id,
          role: acc.role,
          full_name: acc.profile.fullName,
          phone: acc.profile.phone,
          email: acc.email,
          preferred_locale: "vi",
          suspended_at: null,
        }));
      case "appointments":
        return db.appointments;
      case "clinics":
        return Object.values(db.clinicAccounts).map((c) => ({
          id: c.clinicId,
          name: c.profile.name,
          address: `${c.profile.address}, ${c.profile.city}`,
          phone: c.profile.phone,
          status: "verified",
          verified: true,
        }));
      case "billing_subscriptions":
        return [
          {
            owner_id: ownerAcc.id,
            plan_code: ownerAcc.plan,
            pending_plan_code: null,
            status: "active",
            period_ends_at: new Date(Date.now() + 365 * 86400000).toISOString(),
            grace_ends_at: null,
          },
        ];
      default:
        return [];
    }
  };

  const createQuery = (tableName: string) => {
    let filters: Array<(row: any) => boolean> = [];
    let pendingUpdate: Record<string, any> | null = null;

    const resolveRows = () => {
      const rows = getTableRows(tableName);
      return filters.reduce((acc, fn) => acc.filter(fn), rows);
    };

    const applyPendingMutation = () => {
      if (!pendingUpdate) return;
      const db = getPortalDatabase();
      if (tableName === "profiles") {
        const ownerAcc = resolveOwnerAccount(userId);
        if (pendingUpdate.full_name) ownerAcc.profile.fullName = String(pendingUpdate.full_name);
        if (pendingUpdate.phone) ownerAcc.profile.phone = String(pendingUpdate.phone);
        persistPortalDatabase(db);
      }
      pendingUpdate = null;
    };

    const query: any = {
      select: () => query,
      insert: (payload: any) => {
        const db = getPortalDatabase();
        const item = Array.isArray(payload) ? payload[0] : payload;
        if (tableName === "pets" && item?.name) {
          const ownerAcc = resolveOwnerAccount(item.owner_id || userId);
          const existing = ownerAcc.petIds
            .map((pid) => db.ownerPets[pid])
            .filter(Boolean);
          syncOwnerPetsToBackend(ownerAcc.id, [
            ...existing,
            {
              id: item.id || `pet-${Date.now()}`,
              name: item.name,
              species: item.species || "dog",
              birthDate: item.birth_date || "2024-01-01",
            },
          ]);
        }
        return Promise.resolve({ data: item || null, error: null });
      },
      update: (payload: Record<string, any>) => {
        pendingUpdate = payload;
        return query;
      },
      upsert: (payload: any) => {
        const db = getPortalDatabase();
        const item = Array.isArray(payload) ? payload[0] : payload;
        if (tableName === "clinics" && item?.name) {
          const clinicAcc = db.clinicAccounts["dev-clinic-id"];
          if (clinicAcc) {
            clinicAcc.name = item.name;
            clinicAcc.profile.name = item.name;
            if (item.phone) clinicAcc.profile.phone = item.phone;
            persistPortalDatabase(db);
          }
        }
        return Promise.resolve({ data: item || null, error: null });
      },
      delete: () => query,
      eq: (col: string, val: any) => {
        filters.push((row) => String(row?.[col]) === String(val));
        applyPendingMutation();
        return query;
      },
      in: (col: string, vals: any[]) => {
        filters.push((row) => Array.isArray(vals) && vals.includes(row?.[col]));
        return query;
      },
      is: () => query,
      gt: () => query,
      order: () => Promise.resolve({ data: resolveRows(), error: null }),
      limit: () => Promise.resolve({ data: resolveRows(), error: null }),
      single: () => {
        applyPendingMutation();
        const rows = resolveRows();
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      maybeSingle: () => {
        applyPendingMutation();
        const rows = resolveRows();
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      then: (resolve: any) => {
        applyPendingMutation();
        return resolve({ data: resolveRows(), error: null });
      },
    };
    return query;
  };

  return {
    from: (tableName: string) => createQuery(tableName),
    rpc: async (functionName: string, _args?: any) => {
      if (functionName === "clinic_sos_inbox") {
        const db = getPortalDatabase();
        const activeLead = db.activeSosLead;
        return {
          data: [
            {
              request_id: activeLead?.id || "c1000000-0000-4000-8000-000000000001",
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
        const db = getPortalDatabase();
        const clinic = db.clinicAccounts["dev-clinic-id"]?.profile;
        return {
          data: [
            {
              clinic_id: "petcare-d1-0000-4000-8000-000000000001",
              clinic_name: clinic?.name || "Phòng Khám Thú Y PetCare · Quận 1",
              supports_24h: clinic?.is247 ?? true,
              supports_24h_requested: false,
              emergency_status: "online",
              address: clinic?.address || "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP. Hồ Chí Minh",
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
        const db = getPortalDatabase();
        if (db.activeSosLead) {
          db.activeSosLead.status = "accepted";
          persistPortalDatabase(db);
        }
        return { data: true, error: null };
      }
      if (functionName === "accepted_sos_details") {
        const db = getPortalDatabase();
        return {
          data: [
            {
              latitude: 10.778,
              longitude: 106.699,
              owner_phone: db.activeSosLead?.ownerPhone || "0987 654 321",
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
      getUser: async () => {
        const ownerAcc = resolveOwnerAccount(userId);
        return {
          data: {
            user: {
              id: ownerAcc.id,
              email: ownerAcc.email,
              user_metadata: { full_name: ownerAcc.profile.fullName },
            },
          },
          error: null,
        };
      },
      signOut: async () => ({ error: null }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: "aal2" },
          error: null,
        }),
      },
    },
  };
}

import { createServerFn } from "@tanstack/react-start";
import type { OpsSnapshot } from "@/lib/ops/opsSnapshot.types";

export type { OpsSnapshot } from "@/lib/ops/opsSnapshot.types";

export const getOpsSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<OpsSnapshot> => {
    const { requireSessionUser } = await import("./session");
    const user = await requireSessionUser();
    const { fetchOpsSnapshotForUser } = await import("@/lib/server/ops-snapshot");
    return fetchOpsSnapshotForUser(user, data.tenantId);
  });
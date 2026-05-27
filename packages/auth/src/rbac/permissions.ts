import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

const billing = ["create", "read", "update", "delete"] as const;

export const ac = createAccessControl({
  ...defaultStatements,
  billing,
});

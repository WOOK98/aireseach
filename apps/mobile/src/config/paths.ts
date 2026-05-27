const STEPS_PREFIX = "/steps";
const DASHBOARD_PREFIX = "/dashboard";
const ORGANIZATION_DASHBOARD_PREFIX = "/dashboard/organization";

const AUTH_PREFIX = `/auth`;

const pathsConfig = {
  index: "/",
  setup: {
    welcome: "/welcome",
    auth: {
      login: `${AUTH_PREFIX}/login`,
      register: `${AUTH_PREFIX}/register`,
      forgotPassword: `${AUTH_PREFIX}/password/forgot`,
      updatePassword: `${AUTH_PREFIX}/password/update`,
      error: `${AUTH_PREFIX}/error`,
      join: `${AUTH_PREFIX}/join`,
    },
    steps: {
      start: `${STEPS_PREFIX}/start`,
      required: `${STEPS_PREFIX}/required`,
      paywall: `${STEPS_PREFIX}/paywall`,
    },
  },
  dashboard: {
    user: {
      index: DASHBOARD_PREFIX,
      ai: `${DASHBOARD_PREFIX}/ai`,
      settings: {
        index: `${DASHBOARD_PREFIX}/settings`,
        general: {
          index: `${DASHBOARD_PREFIX}/settings/general`,
          notifications: `${DASHBOARD_PREFIX}/settings/general/notifications`,
        },
        account: {
          index: `${DASHBOARD_PREFIX}/settings/account`,
          name: `${DASHBOARD_PREFIX}/settings/account/name`,
          email: `${DASHBOARD_PREFIX}/settings/account/email`,
          password: `${DASHBOARD_PREFIX}/settings/account/password`,
          accounts: `${DASHBOARD_PREFIX}/settings/account/accounts`,
          twoFactor: `${DASHBOARD_PREFIX}/settings/account/two-factor`,
          sessions: `${DASHBOARD_PREFIX}/settings/account/sessions`,
        },
        billing: `${DASHBOARD_PREFIX}/settings/billing`,
      },
    },
    organization: {
      index: ORGANIZATION_DASHBOARD_PREFIX,
      settings: {
        index: `${ORGANIZATION_DASHBOARD_PREFIX}/settings`,
        organization: {
          index: `${ORGANIZATION_DASHBOARD_PREFIX}/settings/organization`,
          name: `${ORGANIZATION_DASHBOARD_PREFIX}/settings/organization/name`,
          billing: `${ORGANIZATION_DASHBOARD_PREFIX}/settings/organization/billing`,
        },
      },
      members: `${ORGANIZATION_DASHBOARD_PREFIX}/members`,
    },
  },
} as const;

export { pathsConfig, AUTH_PREFIX, STEPS_PREFIX, DASHBOARD_PREFIX };

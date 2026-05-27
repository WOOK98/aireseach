export interface CommonEmailProps {
  readonly locale?: string;
}

const AuthEmailTemplate = {
  RESET_PASSWORD: "reset-password",
  MAGIC_LINK: "magic-link",
  SIGN_IN_OTP: "sign-in-otp",
  CONFIRM_EMAIL: "confirm-email",
  DELETE_ACCOUNT: "delete-account",
  CHANGE_EMAIL: "change-email",
  ORGANIZATION_INVITATION: "organization-invitation",
} as const;

type AuthEmailTemplate =
  (typeof AuthEmailTemplate)[keyof typeof AuthEmailTemplate];

type AuthEmailVariables = Record<
  Exclude<
    AuthEmailTemplate,
    | typeof AuthEmailTemplate.ORGANIZATION_INVITATION
    | typeof AuthEmailTemplate.SIGN_IN_OTP
  >,
  { url: string }
> & {
  [AuthEmailTemplate.SIGN_IN_OTP]: { url: string; otp: string };
  [AuthEmailTemplate.CHANGE_EMAIL]: {
    url: string;
    newEmail: string;
  };
  [AuthEmailTemplate.ORGANIZATION_INVITATION]: {
    url: string;
    inviter: string;
    organization: string;
  };
};

export const EmailTemplate = {
  ...AuthEmailTemplate,
  CONTACT_FORM: "contact-form",
} as const;

export type EmailTemplate = (typeof EmailTemplate)[keyof typeof EmailTemplate];

export type EmailVariables = AuthEmailVariables & {
  [EmailTemplate.CONTACT_FORM]: {
    name: string;
    email: string;
    message: string;
  };
};

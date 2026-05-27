const TECHNICAL_AND_INTERACTION_DATA = "technicalAndInteraction";

interface PermissionsWithDataCollection extends chrome.permissions.Permissions {
  data_collection?: string[];
}

export const hasTechnicalAndInteractionConsent = async () => {
  const permissions =
    (await chrome.permissions.getAll()) as PermissionsWithDataCollection;

  if (!("data_collection" in permissions)) {
    return true;
  }

  return (
    permissions.data_collection?.includes(TECHNICAL_AND_INTERACTION_DATA) ??
    false
  );
};

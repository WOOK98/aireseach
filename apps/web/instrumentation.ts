import { initialize } from "@workspace/monitoring-web/server";

export function register() {
  initialize();
}

export { onRequestError } from "@workspace/monitoring-web/server";

import { strategy } from "./providers/server";

export const { captureException, initialize, onRequestError } = strategy;

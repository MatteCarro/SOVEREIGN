import { ACTIONS, ACTION_LIST, CATEGORY_LABELS } from "@/lib/engine/actions";

/**
 * Client-side view of the action catalog. The rules engine is pure and
 * deterministic, so sharing it lets the UI pre-validate and show exact
 * costs — the server always re-validates.
 */
export const ACTION_META = ACTIONS;
export const ACTION_META_LIST = ACTION_LIST;
export { CATEGORY_LABELS };

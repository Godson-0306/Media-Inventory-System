export const CATEGORIES = [
  { value: "AUDIO", label: "Audio" },
  { value: "CABLES", label: "Cables" },
  { value: "CAMERAS", label: "Cameras" },
  { value: "COMPUTING", label: "Computing" },
  { value: "DISPLAYS", label: "Displays" },
  { value: "LIGHTING", label: "Lighting" },
  { value: "OTHERS", label: "Others" },
] as const;

export const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "SIGNED_OUT", label: "Signed out" },
  { value: "SIGNED_IN", label: "Signed in" },
  { value: "FAULTY", label: "Faulty" },
] as const;

export const HOME_LOCATION = {
  label: "Storage / cage",
  address: "",
} as const;

export const CLEAR_LIVE_LOCATION = {
  signedOutByUserId: null,
  liveLatitude: null,
  liveLongitude: null,
  liveAccuracy: null,
  liveUpdatedAt: null,
} as const;

export const LIVE_PING_MIN_INTERVAL_MS = 5000;
export const LIVE_PING_TRAIL_LIMIT = 200;
export const LIVE_LOCATION_FRESH_MS = 60_000;
export const LIVE_LOCATION_STALE_MS = 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "aop_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const TRIAL_DAYS = 14;
export const INVITE_MAX_AGE_DAYS = 7;
/** One-shot: orgs whose trial ended before this date get a fresh 14 days. */
export const STALE_TRIAL_RESET_BEFORE = new Date("2026-10-06T00:00:00.000Z");

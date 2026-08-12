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
  { value: "AVAILABLE", label: "Available" },
  { value: "IN_USE", label: "In-use" },
  { value: "FAULTY", label: "Faulty" },
  { value: "RENTED_OUT", label: "Rented out" },
] as const;

export const SESSION_COOKIE = "aop_session";
export const ADMIN_COOKIE = "aop_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const ADMIN_UNLOCK_MAX_AGE = 60 * 15;

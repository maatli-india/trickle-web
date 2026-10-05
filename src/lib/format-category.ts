// Parcel category/type values (parcelCategory, parcelType, parcelSubcategory)
// are internal snake_case slugs returned by the backend (e.g. "home_decor")
// — never meant to be shown to a user raw. Converts them to a readable
// label. Never pass parcelDescription through this — that's free text the
// sender typed themselves and should be shown as-is.
export const formatCategory = (value?: string | null): string =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

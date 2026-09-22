import bundledLocations from "../../../trickle/src/assets/localLocations.json";

export type LocalLocation = {
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aliases?: string[];
  lat?: number;
  lng?: number;
};

const locations = bundledLocations as LocalLocation[];

const normalize = (value: unknown) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("en-IN")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const editDistance = (left: string, right: string) => {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= right.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
  }
  return rows[left.length][right.length];
};

const tokenMatches = (token: string, words: string[]) => words.some((word) =>
  word.includes(token) || (token.length >= 5 && word.length >= 5 && editDistance(token, word) <= 1));

const distanceKm = (origin: { lat: number; lng: number } | undefined, location: LocalLocation) => {
  if (!origin || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return Infinity;
  const radians = (value: number) => value * Math.PI / 180;
  const latDelta = radians(Number(location.lat) - origin.lat);
  const lngDelta = radians(Number(location.lng) - origin.lng);
  const arc = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(origin.lat)) * Math.cos(radians(Number(location.lat))) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
};

const identity = (location: LocalLocation) => [location.area, location.city, location.state].map(normalize).join("|");

const qualifierMatches = (token: string, location: LocalLocation) =>
  [location.city, location.state].map(normalize).join(" ").split(" ").some((word) =>
    word === token || (token.length >= 4 && word.startsWith(token)));

export const formatLocalLocation = (location: LocalLocation) =>
  [location.area, location.city, location.state].filter(Boolean).join(", ");

export const searchLocalLocations = (
  query: string,
  { limit = 10, origin }: { limit?: number; origin?: { lat: number; lng: number } } = {},
) => {
  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery.split(" ").filter((token) => token.length > 1);
  if (!queryTokens.length) return [];
  const qualifierTokens = queryTokens.filter((token) => locations.some((location) => qualifierMatches(token, location)));

  return locations
    .filter((location) => !qualifierTokens.length || qualifierTokens.every((token) => qualifierMatches(token, location)))
    .map((location) => {
      const fields = [location.area, location.city, location.state, location.pincode, ...(location.aliases || [])].map(normalize);
      const words = fields.join(" ").split(" ").filter(Boolean);
      const matchedTokens = queryTokens.filter((token) => tokenMatches(token, words));
      if (matchedTokens.length !== queryTokens.length) return null;
      const area = normalize(location.area);
      const areaMatch = queryTokens.some((token) => tokenMatches(token, area.split(" ")));
      const firstWordMatch = queryTokens[0] && area.split(" ")[0]?.startsWith(queryTokens[0]);
      return {
        location,
        score: matchedTokens.length * 10 + (areaMatch ? 100 : 0) + (firstWordMatch ? 10000 : 0) + (area === normalizedQuery ? 1000 : 0),
        distance: distanceKm(origin, location),
      };
    })
    .filter((entry): entry is { location: LocalLocation; score: number; distance: number } => Boolean(entry))
    .sort((left, right) => right.score - left.score || left.distance - right.distance)
    .reduce<{ keys: Set<string>; results: LocalLocation[] }>((result, entry) => {
      const key = identity(entry.location);
      if (!result.keys.has(key)) {
        result.keys.add(key);
        result.results.push(entry.location);
      }
      return result;
    }, { keys: new Set(), results: [] })
    .results
    .slice(0, limit);
};
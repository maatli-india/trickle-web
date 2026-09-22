type RouteLocation = { address?: string };

type RecentRoute = {
  from?: RouteLocation;
  to?: RouteLocation;
  pickupDate?: string;
};

export const recentSearchesStorageKey = (userId?: string | null) =>
  userId ? `trickle.web.recentParcelSearches.${encodeURIComponent(userId)}` : null;

const normalize = (value?: string) => String(value || "").trim().toLocaleLowerCase("en-IN");

export const recentRouteKey = (search: RecentRoute) => [
  normalize(search.from?.address),
  normalize(search.to?.address),
  normalize(search.pickupDate),
].join("|");

export const dedupeRecentSearches = <T extends RecentRoute>(searches: T[], limit: number) => {
  const seen = new Set<string>();
  return searches.filter((search) => {
    const key = recentRouteKey(search);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
};

// iOS Universal Links: lets https://<this host>/track/<token> open the
// Trickle app when it's installed. Only /track/* is claimed — /t/* (shared
// trips) does its own trickle:// handoff and must keep opening in the browser.
//
// Read at request time (not build time) so one Docker image serves every
// env: APPLE_TEAM_ID / IOS_BUNDLE_ID are plain runtime env vars.
export const dynamic = "force-dynamic";

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim() || "LUY43YPR5U";
  const bundleId = process.env.IOS_BUNDLE_ID?.trim() || "com.trickle.maatli";
  return Response.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [`${teamId}.${bundleId}`],
            components: [{ "/": "/track/*" }],
            paths: ["/track/*"],
          },
        ],
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

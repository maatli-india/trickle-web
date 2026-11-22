// Android App Links: lets https://<this host>/track/<token> open the Trickle
// app when it's installed (the app's intent filter must claim /track/ with
// android:autoVerify="true").
//
// Read at request time (not build time) so one Docker image serves every
// env. ANDROID_SHA256_CERT_FINGERPRINTS is a comma-separated list of signing
// cert SHA-256 fingerprints (AA:BB:…) — include the Play App Signing key from
// Play Console, not just the upload key. Unset → [] (no app links claimed).
export const dynamic = "force-dynamic";

export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim() || "com.trickle.maatli";
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}

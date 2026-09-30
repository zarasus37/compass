/**
 * Global 404 for URLs that match no route at all.
 *
 * `(app)/not-found.tsx` covers `notFound()` calls from pages inside the
 * group (e.g. `/envelopes/does-not-exist`), but route groups are
 * URL-transparent, so a wholly-unknown path such as
 * `/some-route-that-does-not-exist` resolves at the app root — where
 * there was no not-found.tsx, and Next served its bare built-in 404
 * instead of Compass's calm one. Measured, not assumed: the built-in
 * page rendered ~4 KB with neither the "[404] not found" eyebrow nor
 * the back-to-dashboard CTA.
 *
 * Re-exporting the group's component keeps one copy of the 404 UI.
 */
export { default } from "./(app)/not-found";

/** Minimal safe embed entrypoint for the independent Cascade demo.
 * Embed by iframe to /demo on the Cascade host; this file only exposes the canonical route.
 * The live game uses X-Frame-Options: DENY for security, so embedding requires a controlled
 * opt-in CSP frame-ancestors override for the demo route only; default is link-out.
 */
export const cascadeDemoPath='/demo';
export const cascadeMode='cascade-v0.2-P';

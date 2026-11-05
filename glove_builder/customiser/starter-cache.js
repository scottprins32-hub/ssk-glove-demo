// Bump when rendering changes without a catalogue/data change. Keep the key
// independent of host URL rewriting and thumbnail paths in the static package.
export const STARTER_RENDER_REVISION = 'wrist-placement-r16';

export function starterRenderKey(data, starters) {
  const s = JSON.stringify([
    STARTER_RENDER_REVISION, data.w, data.h, data.presets,
    data.materialFinish, data.materialResponse, data.bulletBox,
    starters.map(st => [st.id, st.colors, st.bullet, st.flag, st.flagPosition]),
    data.bullets.map(b => [b.name, b.asset, b.sourceBox,
      b.mountSize, b.mountOffset, b.artAngleDegrees, b.tint, b.material])
  ]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + '-' + s.length.toString(36);
}

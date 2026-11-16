// Presentation only: choose a neutral backdrop without touching glove pixels.
const luminance = hex => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return null;
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
    .map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
};
const contrast = (a,b) => (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
// `dark` asks for the darkest neutral that still clears 3:1 (the studio
// setting); the default stays the lightest, as it always was.
export function stageBackground(colours, dark = false) {
  const values = [...new Set(colours)].map(luminance).filter(v => v !== null);
  if (!values.length) return dark ? '#2a2a2a' : '#a0a0a0';
  if (dark) {
    let best = '#2a2a2a', score = -1;
    for (let v = 16; v <= 120; v += 4) {
      const hex = '#' + v.toString(16).padStart(2, '0').repeat(3), l = luminance(hex);
      const candidate = Math.min(...values.map(value => contrast(l, value)));
      if (candidate >= 3) return hex;
      if (candidate > score) { best = hex; score = candidate; }
    }
    return best;
  }
  // Prefer the lightest neutral with 3:1 material contrast. When a mixed
  // palette cannot reach that, maximize its weakest material contrast.
  // This is presentation guidance, not a guarantee for shaded image pixels.
  let best = '#a0a0a0', score = -1, qualified = null;
  for (let v=64; v<=236; v+=4) {
    const hex = '#' + v.toString(16).repeat(3), l = luminance(hex);
    const candidate = Math.min(...values.map(value => contrast(l,value)));
    if (candidate >= 3) qualified = hex;
    if (candidate > score) { best = hex; score = candidate; }
  }
  return qualified || best;
}

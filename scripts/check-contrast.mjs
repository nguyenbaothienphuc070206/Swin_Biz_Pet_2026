const pairs = {
  light: [
    ["foreground/background", "#20332e", "#f7f5ef"],
    ["card text/card", "#20332e", "#fffdf8"],
    ["primary text/primary", "#ffffff", "#1e594c"],
    ["secondary text/secondary", "#254d40", "#e4eee8"],
    ["muted text/muted", "#4b6059", "#edf0ea"],
    ["accent text/accent", "#ffffff", "#a9422e"],
    ["destructive text/destructive", "#ffffff", "#a52424"],
    ["warning/warning surface", "#704500", "#fff1cf"],
    ["info/info surface", "#174f72", "#e3f1f8"],
    ["input border/card", "#6e7b71", "#fffdf8"],
  ],
  dark: [
    ["foreground/background", "#e7eee9", "#111b18"],
    ["card text/card", "#e7eee9", "#192521"],
    ["primary text/primary", "#10231b", "#89d5b5"],
    ["secondary text/secondary", "#d9ece0", "#273b32"],
    ["muted text/muted", "#b4c5bc", "#24312c"],
    ["accent text/accent", "#32150f", "#f2a18d"],
    ["destructive text/destructive", "#3d0807", "#ffb4a9"],
    ["warning/warning surface", "#ffcf7c", "#382a14"],
    ["info/info surface", "#9bd8fa", "#152c3a"],
    ["input border/card", "#738379", "#192521"],
  ],
};

function linear(value) {
  const channel = parseInt(value, 16) / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(linear);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

let failed = false;
for (const [theme, items] of Object.entries(pairs)) {
  for (const [name, foreground, background] of items) {
    const ratio = contrast(foreground, background);
    const minimum = name === "input border/card" ? 3 : 4.5;
    const ok = ratio >= minimum;
    console.log(`${ok ? "PASS" : "FAIL"} ${theme} ${name}: ${ratio.toFixed(2)}:1 (min ${minimum}:1)`);
    if (!ok) failed = true;
  }
}
if (failed) process.exitCode = 1;

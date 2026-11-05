// Runs before hydration (inlined in <head>): resolve the stored preference or the system setting.
// Kept out of the "use client" ThemeToggle module on purpose: a server component that imports a value from a client
// module receives a client-chunk reference, not the string, so <head> could suspend during hydration (React #418).
// The key must equal KEY in ThemeToggle.tsx (tests/tooling/theme-boot-script.test.mjs checks this).
const KEY = "atlas-theme";
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

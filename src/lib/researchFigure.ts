/** Clone an already rendered chart, including its external legend, in a neutral print palette. */
export function currentChartSvg(scope: HTMLElement): string | undefined {
  const figure = scope.querySelector("figure.research-chart");
  const svg = figure?.querySelector<SVGSVGElement>('svg[data-chart="research-time-series"]');
  if (!svg) return undefined;
  const palette: Record<string, string> = { "--surface": "#ffffff", "--foreground": "#18222d", "--muted": "#52616b", "--line": "#d8d1c6", "--accent": "#a6453c", "--chart-accent": "#a6453c", "--chart-muted": "#52616b", "--chart-sors": "#3e7d70" };
  const resolve = (value: string) => value.replace(/var\((--[a-z-]+)\)/g, (_, key: string) => palette[key] ?? "#52616b");
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const box = (svg.getAttribute("viewBox") ?? "0 0 760 280").split(/\s+/).map(Number);
  const caption = figure?.querySelector("figcaption");
  const legendEntries = caption ? [...caption.children] : [];
  const extra = 36 + legendEntries.length * 24;
  const height = box[3] + extra;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("viewBox", `0 0 ${box[2]} ${height}`);
  clone.setAttribute("width", String(box[2])); clone.setAttribute("height", String(height));
  clone.setAttribute("font-family", "'Noto Sans SC','PingFang SC',Arial,sans-serif");
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("width", "100%"); background.setAttribute("height", "100%"); background.setAttribute("fill", "#ffffff");
  clone.prepend(background);
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "66"); title.setAttribute("y", String(box[3] + 20)); title.setAttribute("font-size", "13");
  title.textContent = svg.querySelector("title")?.textContent ?? ""; clone.append(title);
  legendEntries.forEach((entry, index) => {
    const y = box[3] + 42 + index * 24;
    const mark = entry.querySelector("svg")?.cloneNode(true) as SVGSVGElement | undefined;
    if (mark) { mark.setAttribute("x", "66"); mark.setAttribute("y", String(y - 9)); clone.append(mark); }
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", "102"); text.setAttribute("y", String(y)); text.setAttribute("font-size", "12");
    text.textContent = entry.textContent; clone.append(text);
  });
  [clone, ...clone.querySelectorAll("*")].forEach((node) => {
    for (const attr of [...node.attributes]) if (attr.value.includes("var(")) node.setAttribute(attr.name, resolve(attr.value));
    node.removeAttribute("class"); node.removeAttribute("tabindex");
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
}

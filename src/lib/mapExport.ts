// Export the regional map as a self-contained figure (SVG or PNG) for papers and slides: title, the map pane(s)
// currently on screen, legend (incl. the no-data hatch) and a source / boundary attribution line.
// Always rendered with the light print palette, whatever theme the reader is using. Browser-only.
export type LegendItem = { color: string; label: string };
export type MapExportSpec = { title: string; subtitle: string; legend: LegendItem[]; noDataLabel: string; source: string; fileName: string };

const LIGHT: Record<string, string> = { "--map-border": "#ffffff", "--map-neutral": "#f7f5ef", "--map-country": "#cbc8bf", "--map-nodata": "#e6e7e2", "--map-hatch": "#b9bcb2", "--foreground": "#18222d", "--muted": "#52616b", "--line": "#d8d1c6", "--accent": "#a6453c" };
const resolve = (value: string) => value.replace(/var\((--[a-z-]+)\)/g, (_, name: string) => LIGHT[name] ?? "#000000");
const escapeXml = (text: string) => text.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c);

export function buildMapSvg(spec: MapExportSpec): string {
  const panes = [...document.querySelectorAll<SVGSVGElement>("svg[data-map-export]")];
  const width = 1200, margin = 40, header = 104, gap = 24;
  const paneWidth = panes.length ? (width - margin * 2 - gap * (panes.length - 1)) / panes.length : 0;
  const boxes = panes.map((svg) => { const [, , w, h] = (svg.getAttribute("viewBox") ?? "0 0 1 1").split(/\s+/).map(Number); return { svg, w, h, scale: paneWidth / w }; });
  const mapHeight = Math.max(0, ...boxes.map((b) => b.h * b.scale));
  const legendTop = header + mapHeight + 24;
  const perRow = 4, rowHeight = 26;
  const legendRows = Math.ceil((spec.legend.length + 1) / perRow);
  const footerTop = legendTop + legendRows * rowHeight + 18;
  // Wrap the attribution line (~140 CJK-width characters per line at 12px across the 1120px text width).
  const sourceLines = (spec.source.match(/.{1,140}/gu) ?? [spec.source]);
  const height = footerTop + 36 + sourceLines.length * 18;

  const paneMarkup = boxes.map((box, index) => {
    const clone = box.svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("*").forEach((node) => {
      for (const attr of ["fill", "stroke", "style"]) { const value = node.getAttribute(attr); if (value?.includes("var(")) node.setAttribute(attr, resolve(value)); }
      node.removeAttribute("class"); node.removeAttribute("tabindex"); node.removeAttribute("role");
    });
    const x = margin + index * (paneWidth + gap);
    return `<svg x="${x}" y="${header}" width="${paneWidth}" height="${box.h * box.scale}" viewBox="0 0 ${box.w} ${box.h}">${clone.innerHTML}</svg>`;
  }).join("");

  const items = [...spec.legend.map((item) => ({ ...item, hatch: false })), { color: LIGHT["--map-nodata"], label: spec.noDataLabel, hatch: true }];
  const legendMarkup = items.map((item, index) => {
    const col = index % perRow, row = Math.floor(index / perRow);
    const x = margin + col * ((width - margin * 2) / perRow), y = legendTop + row * rowHeight;
    const fill = item.hatch ? "url(#export-hatch)" : resolve(item.color);
    return `<rect x="${x}" y="${y}" width="28" height="14" rx="2" fill="${fill}" stroke="#00000022"/><text x="${x + 36}" y="${y + 12}" font-size="14" fill="#18222d">${escapeXml(item.label)}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="'PingFang SC','Noto Sans SC','Microsoft YaHei',Arial,sans-serif">
<defs><pattern id="export-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${LIGHT["--map-nodata"]}"/><line x1="0" y1="0" x2="0" y2="6" stroke="${LIGHT["--map-hatch"]}" stroke-width="2"/></pattern></defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="${margin}" y="52" font-size="28" font-weight="700" font-family="Georgia,'Songti SC','Noto Serif SC',serif" fill="#18222d">${escapeXml(spec.title)}</text>
<text x="${margin}" y="82" font-size="15" fill="#52616b">${escapeXml(spec.subtitle)}</text>
${paneMarkup}
${legendMarkup}
<line x1="${margin}" x2="${width - margin}" y1="${footerTop}" y2="${footerTop}" stroke="#d8d1c6"/>
${sourceLines.map((line, index) => `<text x="${margin}" y="${footerTop + 24 + index * 18}" font-size="12" fill="#52616b">${escapeXml(line)}</text>`).join("")}
</svg>`;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = fileName; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportMap(spec: MapExportSpec, format: "svg" | "png") {
  const svg = buildMapSvg(spec);
  if (format === "svg") { download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${spec.fileName}.svg`); return; }
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  await new Promise<void>((resolveLoad, reject) => { image.onload = () => resolveLoad(); image.onerror = () => reject(new Error("map image failed to load")); image.src = url; });
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale; canvas.height = image.height * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.scale(scale, scale); context.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob | null>((resolveBlob) => canvas.toBlob(resolveBlob, "image/png"));
  if (blob) download(blob, `${spec.fileName}.png`);
}

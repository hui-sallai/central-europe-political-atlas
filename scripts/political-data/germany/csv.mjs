// Delimiter-aware parser: quoted newlines are data, not record boundaries.
export function parseCsv(text, delimiter = ";") {
  const rows = []; let row = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c==='"') { if (quoted && text[i+1]==='"') {cell+='"';i++;} else if (quoted || cell.length===0) quoted=!quoted; else throw Error("Unexpected CSV quote"); }
    else if (!quoted && c===delimiter) {row.push(cell);cell="";}
    else if (!quoted && (c==='\n' || c==='\r')) {if(c==='\r' && text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  if(quoted)throw Error("Unterminated CSV quote");
  if(cell || row.length){row.push(cell);rows.push(row);}
  return rows;
}
export function officialNumber(text) {
  const value=text.trim();
  if(!value || /^[–—-]$/.test(value))return null;
  if(!/^\d[\d.]*([,]\d+)?$/.test(value))throw Error(`Unrecognized official number ${value}`);
  return Number(value.replaceAll(".", "").replace(",", "."));
}

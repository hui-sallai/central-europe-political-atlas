#!/usr/bin/env python3
"""Independent standard-library replication of the pinned author MATLAB shock construction."""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/identified-shocks"

def sample_std(values):
    values = [value for value in values if value is not None and math.isfinite(value)]
    mean = sum(values) / len(values)
    return math.sqrt(sum((value - mean) ** 2 for value in values) / (len(values) - 1))

def first_eigenvector(matrix):
    n = len(matrix); a = [row[:] for row in matrix]
    vectors = [[float(i == j) for j in range(n)] for i in range(n)]
    for _ in range(200):
        p, q = 0, 1
        for i in range(n):
            for j in range(i + 1, n):
                if abs(a[i][j]) > abs(a[p][q]): p, q = i, j
        if abs(a[p][q]) < 1e-15: break
        phi = .5 * math.atan2(2 * a[p][q], a[q][q] - a[p][p]); c, s = math.cos(phi), math.sin(phi)
        app = c*c*a[p][p] - 2*s*c*a[p][q] + s*s*a[q][q]
        aqq = s*s*a[p][p] + 2*s*c*a[p][q] + c*c*a[q][q]
        for k in range(n):
            if k not in (p, q):
                kp, kq = a[k][p], a[k][q]
                a[k][p] = a[p][k] = c*kp - s*kq
                a[k][q] = a[q][k] = s*kp + c*kq
        a[p][p], a[q][q], a[p][q], a[q][p] = app, aqq, 0, 0
        for k in range(n):
            vp, vq = vectors[k][p], vectors[k][q]
            vectors[k][p], vectors[k][q] = c*vp - s*vq, s*vp + c*vq
    index = max(range(n), key=lambda i: a[i][i])
    vector = [row[index] for row in vectors]
    largest = max(range(n), key=lambda i: abs(vector[i]))
    return [-value for value in vector] if vector[largest] < 0 else vector

payload = json.loads((DATA / "jk_event_level_shocks.json").read_text())
rows = payload["records"]
fields = ["OIS_1M", "OIS_3M", "OIS_6M", "OIS_1Y"]
raw = [[row["input_fields"].get(field) for field in fields] for row in rows]
filled = [[0 if value is None else value for value in row] for row in raw]
stds = [sample_std([row[j] for row in filled]) for j in range(4)]
x = [[row[j] / stds[j] for j in range(4)] for row in filled]
cross = [[sum(row[i] * row[j] for row in x) for j in range(4)] for i in range(4)]
loading = first_eigenvector(cross)
score = [sum(row[j] * loading[j] for j in range(4)) for row in x]
scale = sample_std([row[3] for row in raw]) / sample_std(score) / 100
pc1 = [round(value * scale, 8) for value in score]

stock = [row["STOXX50"] for row in rows]
r11 = math.sqrt(sum(value * value for value in pc1)); q1 = [value / r11 for value in pc1]
r12 = sum(q1[i] * stock[i] for i in range(len(rows)))
residual = [stock[i] - q1[i] * r12 for i in range(len(rows))]
r22 = math.sqrt(sum(value * value for value in residual)); q2 = [value / r22 for value in residual]
angle = .5 * math.atan(-r22 / r12) if r12 <= 0 else .5 * math.atan(r12 / r22) + .5 * math.pi / 2
c, s = math.cos(angle), math.sin(angle); d1, d2 = r11*c, r11*s
mp = [round((q1[i]*c - q2[i]*s)*d1, 8) for i in range(len(rows))]
cbi = [round((q1[i]*s + q2[i]*c)*d2, 8) for i in range(len(rows))]

pc_diff = max(abs(pc1[i] - rows[i]["pc1"]) for i in range(len(rows)))
mp_diff = max(abs(mp[i] - rows[i]["MP_median"]) for i in range(len(rows)))
cbi_diff = max(abs(cbi[i] - rows[i]["CBI_median"]) for i in range(len(rows)))
result = {
    "schema_version": "jk-cross-language-validation-v1.62", "generated_at": "2026-09-01",
    "status": "passed" if max(pc_diff, mp_diff, cbi_diff) <= 1e-8 else "failed",
    "implementations": ["Python standard-library reference", "JavaScript production", "pinned MATLAB author output"],
    "matched_row_count": len(rows), "failed_row_count": 0 if max(pc_diff, mp_diff, cbi_diff) <= 1e-8 else len(rows),
    "maximum_differences": {"pc1": pc_diff, "MP_median": mp_diff, "CBI_median": cbi_diff},
    "rotation_angle_radians": angle, "absolute_tolerance": 1e-8, "relative_tolerance": 1e-8,
}
(DATA / "jk_cross_language_validation.json").write_text(json.dumps(result, indent=2) + "\n")
print(f"JK Python reference: rows={len(rows)}; maxdiff={max(pc_diff, mp_diff, cbi_diff):.3g}; status={result['status']}.")
raise SystemExit(0 if result["status"] == "passed" else 1)

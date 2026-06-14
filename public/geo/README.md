# Boundary Data

This folder stores first-level administrative boundary GeoJSON files used by the prototype map.

Source: geoBoundaries current API, `gbOpen`, `ADM1`.

Downloaded files:

- `adm1/poland.geojson` from `POL/ADM1`
- `adm1/hungary.geojson` from `HUN/ADM1`
- `adm1/czechia.geojson` from `CZE/ADM1`
- `adm1/slovakia.geojson` from `SVK/ADM1`
- `adm1/germany.geojson` from `DEU/ADM1`
- `adm1/romania.geojson` from `ROU/ADM1`
- `adm1/slovenia.geojson` from `SVN/ADM1`
- `adm1/serbia.geojson` from `SRB/ADM1`
- `adm1/austria.geojson` from `AUT/ADM1`
- `adm1/croatia.geojson` from `HRV/ADM1`

Notes:

- The files use the geoBoundaries simplified GeoJSON links returned by the API.
- The Hungary ADM1 simplified file contains 19 county polygons and does not include Budapest as a polygon in this layer. The app adds Budapest as a supplemental point marker until a better authoritative ADM1 geometry source is integrated.
- Slovenia ADM1 in geoBoundaries is represented as two cohesion regions. The 12 statistical regions can be reintroduced later as a separate statistical geography layer rather than the current ADM1 map layer.
- Attribution is required when using geoBoundaries data.

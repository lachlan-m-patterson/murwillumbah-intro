# Murwillumbah · A flood town

A compact Three.js opening map for an ArcGIS StoryMap about the 2022 South Murwillumbah floods.

Live: https://lachlan-m-patterson.github.io/murwillumbah-intro/

Three scenes locate the coast, the valley and the town. Click chapter buttons or the next button; drag to orbit; reset to return to the authored view. Mousewheel zoom is intentionally disabled so the surrounding StoryMap remains scrollable. Reduced motion preferences are respected. Rendering pauses offscreen. WebGL failure shows a text alternative.

## Embed

Paste the live URL into an ArcGIS StoryMaps embed block. Choose the wide/full-width interactive presentation, ideally 650–800 px tall. The embed itself is a single viewport with no scroll-driven camera hijacking.

```html
<iframe src="https://lachlan-m-patterson.github.io/murwillumbah-intro/"
  title="Explore Murwillumbah and the Tweed Valley"
  width="100%" height="720" style="border:0"
  loading="lazy" allow="fullscreen" allowfullscreen></iframe>
```

## Development

Node 22+ recommended. `npm ci`, then `npm run dev`. `npm run build` writes `dist/` with relative paths. GitHub Pages serves the checked-in `docs/` folder on `main`. After changing source, build and copy the exact build into `docs/` before committing and pushing. No API keys or backend required. Google Fonts are optional cosmetic network requests; system fallbacks are provided.

## Data and interpretation

- Elevation: Mapzen/AWS Terrain Tiles (SRTM and other upstream sources), downloaded 18 November 2026. https://registry.opendata.aws/terrain-tiles/ and https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- Grid: 513 × 513 signed little-endian 16-bit elevations in metres; geographic bounds in `assets/terrain.json`. Horizontal coordinates use a local equirectangular approximation, units in kilometres. Height exaggeration: 3.2×.
- Waterways and coastline: © NSW Spatial Services, CC BY 4.0. NamedWatercourse and Coastline from https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Water_Theme/MapServer . Three named rivers retained; geometry simplified by the service at 0.00008 degrees. Sea mask uses coastal linework, with the DEM's sea edge beyond the northern extent of that linework.
- Geographic context: https://www.water.dpie.nsw.gov.au/about-us/learn-about-water/basins-and-catchments/catchment-snapshots/tweed and https://museum.tweed.nsw.gov.au/explore/natural-heritage/geology/geological-history
- Place labels are indicative point locations. Rings are locator symbols. No flood boundary, water level, inundation or hydrodynamic flow is represented.
- Three.js: MIT license, included in the npm dependency. This map is an orientation graphic, not a survey or a flood model.

Regenerate source data with `python scripts/prepare-data.py` and `python scripts/nsw-water.py` (requires requests, Pillow, NumPy). Runtime data are bundled; viewers do not connect to the GIS services.

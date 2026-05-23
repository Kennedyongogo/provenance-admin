import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Stack,
  TextField,
  Autocomplete,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  MyLocation,
  Search,
  Map as MapIcon,
  SatelliteAlt,
  Terrain,
  Add as ZoomInIcon,
  Remove as ZoomOutIcon,
} from "@mui/icons-material";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import CircleGeom from "ol/geom/Circle";
import XYZ from "ol/source/XYZ";
import { fromLonLat, toLonLat } from "ol/proj";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import { defaults as defaultControls } from "ol/control";
import { normalizeCountyName } from "../../data/kenyaCounties";

const DEFAULT_CENTER = [36.8219, -1.2921]; // Nairobi coordinates
const DEFAULT_ZOOM = 7;
const TARGET_ZOOM = 12;
const SEARCH_DEBOUNCE_MS = 350;
const NOMINATIM_ENDPOINT =
  "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=15&polygon_geojson=0&q=";

const markerStyle = new Style({
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: "#D4AF37" }),
    stroke: new Stroke({ color: "#1a1a1a", width: 2 }),
  }),
});

const radiusStyle = new Style({
  stroke: new Stroke({ color: "rgba(212, 175, 55, 0.9)", width: 2 }),
  fill: new Fill({ color: "rgba(212, 175, 55, 0.15)" }),
});

const parseCoordinate = (value) => {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeCountyFromString = (value) => {
  if (typeof value !== "string") return null;
  const segments = value
    .split(/[,/|-]/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const segment of segments) {
    const cleaned = segment.replace(/\bcounty\b/gi, "").trim();
    const normalized =
      normalizeCountyName(cleaned) || normalizeCountyName(segment);
    if (normalized) {
      return normalized;
    }
  }
  const cleanedValue = value.replace(/\bcounty\b/gi, "").trim();
  return (
    normalizeCountyName(cleanedValue) || normalizeCountyName(value) || null
  );
};

const findBestCountyMatch = (address) => {
  if (!address) return null;

  const directCandidates = [
    address.county,
    address.state,
    address.state_district,
    address.region,
    address.province,
  ];
  for (const candidate of directCandidates) {
    const normalizedCandidate = normalizeCountyFromString(candidate);
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  const locationSegments = [
    address.city,
    address.town,
    address.village,
    address.hamlet,
    address.suburb,
  ];

  for (const segment of locationSegments) {
    const normalizedSegment = normalizeCountyFromString(segment);
    if (!normalizedSegment) continue;
    return normalizedSegment;
  }

  return null;
};

export default function GeoTargetPicker({
  latitude,
  longitude,
  radiusKm,
  onLocationChange,
  onRequestCurrentLocation,
  locating,
  locationError,
  onCountySuggested,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerFeatureRef = useRef(null);
  const radiusFeatureRef = useRef(null);
  const vectorSourceRef = useRef(null);
  const searchAbortRef = useRef();
  const shouldRecenterRef = useRef(false);
  const previousCoordsRef = useRef({ lat: null, lon: null });
  const baseLayerRefs = useRef({});

  const [baseLayer, setBaseLayer] = useState("osm");

  const [searchInput, setSearchInput] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const ensureFeatures = useCallback(
    (lon, lat) => {
      const markerFeature = markerFeatureRef.current;
      const radiusFeature = radiusFeatureRef.current;
      if (!markerFeature || !radiusFeature || lon === null || lat === null) {
        return;
      }
      const projected = fromLonLat([lon, lat]);
      const markerGeometry = markerFeature.getGeometry();
      const radiusGeometry = radiusFeature.getGeometry();
      if (markerGeometry) {
        markerGeometry.setCoordinates(projected);
      } else {
        markerFeature.setGeometry(new Point(projected));
      }
      if (radiusGeometry instanceof CircleGeom) {
        radiusGeometry.setCenter(projected);
      } else {
        radiusFeature.setGeometry(
          new CircleGeom(projected, (radiusKm || 1) * 1000)
        );
      }
      markerFeature.changed();
      radiusFeature.changed();
    },
    [radiusKm]
  );

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const initialLon =
      longitude !== null && longitude !== undefined
        ? longitude
        : DEFAULT_CENTER[0];
    const initialLat =
      latitude !== null && latitude !== undefined
        ? latitude
        : DEFAULT_CENTER[1];
    const initialRadiusMeters = (radiusKm || 1) * 1000;

    const markerFeature = new Feature({
      geometry: new Point(fromLonLat([initialLon, initialLat])),
    });
    markerFeatureRef.current = markerFeature;

    const radiusFeature = new Feature({
      geometry: new CircleGeom(
        fromLonLat([initialLon, initialLat]),
        initialRadiusMeters
      ),
    });
    radiusFeatureRef.current = radiusFeature;

    const vectorSource = new VectorSource({
      features: [radiusFeature, markerFeature],
    });
    vectorSourceRef.current = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => {
        const geometry = feature.getGeometry();
        if (geometry instanceof Point) {
          return markerStyle;
        }
        return radiusStyle;
      },
    });

    const osmLayer = new TileLayer({
      source: new OSM({
        preload: 4,
        crossOrigin: "anonymous",
      }),
      visible: true,
      opacity: 1,
      className: "geo-target-picker-osm",
      transition: 0,
      zIndex: 0,
    });

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        maxZoom: 20,
        attributions: "© Google Maps",
        preload: 4,
        crossOrigin: "anonymous",
      }),
      visible: false,
      opacity: 1,
      className: "geo-target-picker-satellite",
      transition: 0,
      zIndex: 0,
    });

    const terrainLayer = new TileLayer({
      source: new XYZ({
        url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
        maxZoom: 18,
        preload: 4,
        crossOrigin: "anonymous",
      }),
      visible: false,
      opacity: 1,
      className: "geo-target-picker-terrain",
      transition: 0,
      zIndex: 0,
    });

    const map = new Map({
      target: mapContainerRef.current,
      layers: [
        osmLayer,
        satelliteLayer,
        terrainLayer,
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([initialLon, initialLat]),
        zoom:
          latitude !== null && latitude !== undefined && longitude !== null
            ? TARGET_ZOOM
            : DEFAULT_ZOOM,
      }),
      controls: defaultControls({
        attribution: false,
        rotate: false,
        zoom: false,
      }),
    });

    map.on("click", (event) => {
      const [lon, lat] = toLonLat(event.coordinate);
      if (onLocationChange) {
        shouldRecenterRef.current = true;
        onLocationChange(Number(lat.toFixed(6)), Number(lon.toFixed(6)));
      }
    });

    mapRef.current = map;
    baseLayerRefs.current = {
      osm: osmLayer,
      satellite: satelliteLayer,
      terrain: terrainLayer,
    };

    return () => {
      map.setTarget(null);
      mapRef.current = null;
      vectorSourceRef.current = null;
      markerFeatureRef.current = null;
      radiusFeatureRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined
    ) {
      return;
    }
    ensureFeatures(longitude, latitude);

    const prev = previousCoordsRef.current;
    const shouldRecenter =
      shouldRecenterRef.current || prev.lat === null || prev.lon === null;

    previousCoordsRef.current = { lat: latitude, lon: longitude };

    if (shouldRecenter && mapRef.current) {
      const target = fromLonLat([longitude, latitude]);
      const view = mapRef.current.getView();
      view.setCenter(target);
      view.setZoom(TARGET_ZOOM);
    }

    shouldRecenterRef.current = false;
  }, [latitude, longitude, ensureFeatures]);

  useEffect(() => {
    const radiusFeature = radiusFeatureRef.current;
    if (!radiusFeature) return;
    const geometry = radiusFeature.getGeometry();
    if (geometry instanceof CircleGeom) {
      geometry.setRadius((radiusKm || 1) * 1000);
      radiusFeature.changed();
    }
  }, [radiusKm]);

  useEffect(() => {
    if (!searchInput || searchInput.trim().length < 2) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      setSearchOptions([]);
      setSearchLoading(false);

      const hasSelection = searchInput && searchInput.trim().length > 0;
      if (!hasSelection) {
        if (mapRef.current) {
          const view = mapRef.current.getView();
          view.setCenter(fromLonLat(DEFAULT_CENTER));
          view.setZoom(DEFAULT_ZOOM);
        }

        const defaultCoord = fromLonLat(DEFAULT_CENTER);
        if (markerFeatureRef.current && radiusFeatureRef.current) {
          const markerGeometry = markerFeatureRef.current.getGeometry();
          const radiusGeometry = radiusFeatureRef.current.getGeometry();
          if (markerGeometry instanceof Point) {
            markerGeometry.setCoordinates(defaultCoord);
          }
          if (radiusGeometry instanceof CircleGeom) {
            radiusGeometry.setCenter(defaultCoord);
          }
          markerFeatureRef.current.changed();
          radiusFeatureRef.current.changed();
        }

        if (onCountySuggested) {
          onCountySuggested("");
        }
        if (onLocationChange) {
          onLocationChange(null, null);
        }
      }

      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    const handle = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await fetch(
          `${NOMINATIM_ENDPOINT}${encodeURIComponent(searchInput)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Accept-Language": "en",
            },
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error("Failed to search locations");
        }
        const results = await response.json();
        setSearchOptions(
          Array.isArray(results)
            ? results.map((item) => ({
                ...item,
                lat: parseCoordinate(item.lat),
                lon: parseCoordinate(item.lon),
              }))
            : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Location search error:", err);
        }
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [searchInput]);

  const handleSearchSelect = (_event, option) => {
    if (!option || typeof option !== "object") return;
    const { lat, lon, address } = option;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    ensureFeatures(lon, lat);
    if (mapRef.current) {
      mapRef.current.getView().animate({
        center: fromLonLat([lon, lat]),
        zoom: TARGET_ZOOM,
        duration: 400,
      });
    }
    shouldRecenterRef.current = true;
    if (onLocationChange) {
      onLocationChange(Number(lat.toFixed(6)), Number(lon.toFixed(6)));
    }

    const locationLabel =
      (typeof option?.display_name === "string" && option.display_name.trim()) ||
      (typeof option?.name === "string" && option.name.trim()) ||
      "";
    const normalizedCounty =
      findBestCountyMatch(address) ||
      normalizeCountyFromString(option?.display_name) ||
      normalizeCountyFromString(option?.name) ||
      "";
    const suggestion = locationLabel || normalizedCounty || "";
    onCountySuggested?.(suggestion);
  };

  const handleUseCurrentLocation = () => {
    shouldRecenterRef.current = true;
    onRequestCurrentLocation?.();
  };

  const handleBaseLayerChange = (layerKey) => {
    setBaseLayer(layerKey);
    const refs = baseLayerRefs.current;
    Object.entries(refs).forEach(([key, layer]) => {
      if (layer) {
        layer.setVisible(key === layerKey);
      }
    });
  };

  const handleZoom = (direction) => {
    if (!mapRef.current) return;
    const view = mapRef.current.getView();
    const currentZoom = view.getZoom() ?? TARGET_ZOOM;
    const delta = direction === "in" ? 1 : -1;
    view.setZoom(currentZoom + delta);
  };

  return (
    <Stack spacing={1.5}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, color: "#1a1a1a", mb: 0.5 }}
      >
        Choose target area
      </Typography>
      <Autocomplete
        freeSolo
        options={searchOptions}
        getOptionLabel={(option) =>
          typeof option === "string"
            ? option
            : option?.display_name || option?.name || ""
        }
        loading={searchLoading}
        onInputChange={(_event, value) => {
          setSearchInput(value);
          const trimmed = typeof value === "string" ? value.trim() : "";
          onCountySuggested?.(trimmed);
        }}
        onChange={handleSearchSelect}
        filterOptions={(options) => options}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search any city, town, or landmark"
            placeholder="Type any location worldwide"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <Search sx={{ mr: 1, color: "rgba(26, 26, 26, 0.5)" }} />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {searchLoading ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Button
          variant="outlined"
          startIcon={<MyLocation />}
          onClick={handleUseCurrentLocation}
          disabled={Boolean(locating)}
          sx={{
            minWidth: { xs: "100%", sm: 200 },
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {locating ? "Locating..." : "Use Current Location"}
        </Button>
        <Box
          sx={{
            flexGrow: 1,
            p: 1.5,
            borderRadius: 2,
            border: "1px solid rgba(212, 175, 55, 0.35)",
            bgcolor: "rgba(212, 175, 55, 0.08)",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#1a1a1a", mb: 0.5 }}
          >
            Selected point
          </Typography>
          {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
            <Typography variant="body2" sx={{ color: "rgba(26, 26, 26, 0.75)" }}>
              Lat {latitude.toFixed(5)}, Lng {longitude.toFixed(5)}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "rgba(26, 26, 26, 0.65)" }}>
              Tap on the map or search to select your boost location.
            </Typography>
          )}
          {locationError ? (
            <Typography
              variant="caption"
              sx={{ color: "#d32f2f", display: "block", mt: 0.5 }}
            >
              {locationError}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              sx={{ color: "rgba(26, 26, 26, 0.55)", display: "block" }}
            >
              People within your radius will see the boost first.
            </Typography>
          )}
        </Box>
      </Stack>
      <Box
        ref={mapContainerRef}
        sx={{
          width: "100%",
          height: { xs: 260, sm: 300 },
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          position: "relative",
          "& .ol-viewport": {
            borderRadius: 2,
          },
          "& .ol-layer": {
            transition: "none !important",
          },
          "& .ol-layer canvas": {
            transition: "none !important",
          },
          "& .ol-tile": {
            transition: "none !important",
          },
          "& .ol-zoom, & .ol-rotate, & .ol-attribution": {
            display: "none",
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            zIndex: 2,
          }}
        >
          <Tooltip title="Map view" placement="right">
            <span>
              <IconButton
                size="small"
                onClick={() => handleBaseLayerChange("osm")}
                sx={{
                  backgroundColor:
                    baseLayer === "osm"
                      ? "rgba(212, 175, 55, 0.25)"
                      : "rgba(0,0,0,0.05)",
                  color: baseLayer === "osm" ? "#B28B22" : "#555",
                }}
              >
                <MapIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Satellite view" placement="right">
            <span>
              <IconButton
                size="small"
                onClick={() => handleBaseLayerChange("satellite")}
                sx={{
                  backgroundColor:
                    baseLayer === "satellite"
                      ? "rgba(212, 175, 55, 0.25)"
                      : "rgba(0,0,0,0.05)",
                  color: baseLayer === "satellite" ? "#B28B22" : "#555",
                }}
              >
                <SatelliteAlt fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Terrain view" placement="right">
            <span>
              <IconButton
                size="small"
                onClick={() => handleBaseLayerChange("terrain")}
                sx={{
                  backgroundColor:
                    baseLayer === "terrain"
                      ? "rgba(212, 175, 55, 0.25)"
                      : "rgba(0,0,0,0.05)",
                  color: baseLayer === "terrain" ? "#B28B22" : "#555",
                }}
              >
                <Terrain fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            zIndex: 2,
          }}
        >
          <Tooltip title="Zoom in" placement="left">
            <span>
              <IconButton
                size="small"
                onClick={() => handleZoom("in")}
                sx={{ backgroundColor: "rgba(0,0,0,0.05)" }}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Zoom out" placement="left">
            <span>
              <IconButton
                size="small"
                onClick={() => handleZoom("out")}
                sx={{ backgroundColor: "rgba(0,0,0,0.05)" }}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Stack>
  );
}


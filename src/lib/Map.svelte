<script>
  import { onMount } from "svelte";
  import mapboxgl from "mapbox-gl";
  import * as d3 from 'd3';
  import { legendColor } from 'd3-svg-legend';
  import * as turf from '@turf/turf';
  import '../../node_modules/mapbox-gl/dist/mapbox-gl.css';

  export let mapData = [];
  export let indicator;
  export let region = 'HRPs'; // Set default region

  mapboxgl.baseApiUrl = 'https://data.humdata.org/mapbox';
  mapboxgl.accessToken = 'cacheToken';

  const colorRanges = {
    pin: ['#ffcdb2', '#f2b8aa', '#e4989c', '#b87e8b', '#925b7a'],
    pinPer: ['#ffcdb2', '#f2b8aa', '#e4989c', '#b87e8b', '#925b7a'],
    severity: ['#BDCBDC', '#91ABC4', '#688DB0', '#46719B', '#2C5984']//['#ea9800', '#e57146', '#c35c65', '#8f556d', '#5c4d5c']
  };
  const numFormat = d3.format(',');
  const shortFormat = d3.format('.2s');
  const percentFormat = d3.format('.0%');
  const DEFAULT_COLOR = '#CCC';
  const INDICATOR_LAYER = 'indicator-layer';
  const GLOBAL_FILL_LAYER = 'global-fill';
  const GLOBAL_LINE_LAYER = 'global-line';

  const defaultFilter = ['!=', ['get', 'adm0_pcode'], 'NE']; // exclude Niger for now

  let map, mapLegend, regionBoundaryData, tooltip;
  let isLoaded = false;

  let indicatorValues = {
    pin: [],
    pinPer: [],
    severity: [1, 2, 3, 4, 5]
  };

  indicatorValues.pin    = mapData
    .map(r => r['Final PiN'])
    .filter(v => v != null);
  indicatorValues.pinPer = mapData
    .map(r => Math.min(r['PiN_percentage'], 1))
    .filter(v => v != null);

  // Update the layer and legend when indicator changes
  $: if (map && map.getLayer(INDICATOR_LAYER) && indicator) {
    // map.setPaintProperty(INDICATOR_LAYER, 'fill-color', getFillColorExpression(indicator));
    // d3.select('.legend-body').selectAll('*').remove();
    // createMapLegend();
  }

  // Update region when selected region changes. TODO: update map features and scales  
  $: if (map && region) {
    selectRegion();
  }

  // TODO: set up responsive view
  export const isMobile = () => {
    const userAgentCheck = /Mobi|Android/i.test(navigator.userAgent);
    const screenSizeCheck = window.matchMedia("(max-width: 767px)").matches;
    return userAgentCheck || screenSizeCheck;
  }

  
  // Initialize the map and add tileset layers
  async function initializeMap() {
    const fillExpression = ["match", ["get", "country_code"]];

    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/humdata/cl3lpk27k001k15msafr9714b',
      center: [0, 0],
      minZoom: 1,
      maxZoom: 12,
      zoom: 1
    });

    map.addControl(new mapboxgl.NavigationControl({showCompass: false}))
       .addControl(new mapboxgl.AttributionControl(), 'bottom-left');

    tooltip = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'map-tooltip'
    });

    map.on('load', async () => {
      const zoomInBtn  = document.querySelector('.mapboxgl-ctrl-zoom-in');
      const zoomOutBtn = document.querySelector('.mapboxgl-ctrl-zoom-out');
      [zoomInBtn, zoomOutBtn].forEach(btn => {
        btn.addEventListener('click', () => {
          // wait for *this* zoom to finish, then run only once
          map.once('zoomend', handleZoomFromControl);
        });
      });

      map.addSource('globalTileset', {
        type: 'vector',
        url: 'mapbox://humdata.bviogwzx'
      });

      // Add global fill layer 
      map.addLayer({
        id: GLOBAL_FILL_LAYER,
        type: 'fill',  
        source: 'globalTileset',
        'source-layer': 'hrp22_polbnda_int_fieldmaps',
        paint: {
          'fill-color': '#fce0de',
        }
      }, 'Countries 2-4');

      // Add global outline layer
      map.addLayer({
        id: GLOBAL_LINE_LAYER,
        type: 'line',
        source: 'globalTileset',
        'source-layer': 'hrp22_polbnda_int_fieldmaps', 
        paint: {
          'line-color': '#888', 
          'line-width': 1          
        }
      }, 'Countries 2-4');

      

      // Country tileset
      map.addSource('countryTileset', {
        type: 'vector',
        url: 'mapbox://humdata.bhueco0o',
        promoteId: { 'hrp22_polbnda_subnational_fieldmaps': 'join_pcode' }
      });

      // Add country fill layer
      map.addLayer({
        id: INDICATOR_LAYER,
        type: 'fill',
        source: 'countryTileset',
        'source-layer': 'hrp22_polbnda_subnational_fieldmaps',
        minzoom: 2,
        layout: {
          'visibility': 'none'
        },
        filter: defaultFilter,
        paint: {
          'fill-color': getFillColorExpression(indicator),
          'fill-outline-color': '#FFF'
        }
      }, 'Countries 2-4');
    
      // Zoom to global features once tileset is loaded
      map.once('sourcedata', (e) => {
        if (e.sourceId === 'globalTileset' && e.isSourceLoaded) {
          const source = map.getSource('globalTileset');
          const [minX, minY, maxX, maxY] = source.bounds ||
            (source.tileJSON && source.tileJSON.bounds);

          map.fitBounds(
            [
              [minX, minY],
              [maxX, maxY]
            ],
            { padding: 20, duration: 700 }
          );
        }
      });

      attachMouseEvents();
      createMapLegend();
    });


    // Attach data to features once country tileset is loaded
    map.on('sourcedata', (e) => {
      // Todo: fix this is called more than once
      if (e.sourceId === 'countryTileset' && e.isSourceLoaded) {
        joinDataToFeatures();
      }
    });


    // Get region boundary data
    regionBoundaryData = await fetch('geojson/ocha-regions-bbox.geojson').then(res => res.json());
  }

  function handleZoomFromControl() {
    const z = map.getZoom();
    const visibility = z >= 4 ? 'none' : 'visible';

    // toggle your layers
    d3.select('.map-legend').style('opacity', z >= 4 ? 1 : 0);
    map.setLayoutProperty(GLOBAL_FILL_LAYER, 'visibility', visibility);
    map.setLayoutProperty(GLOBAL_LINE_LAYER, 'visibility', visibility);
    map.setLayoutProperty(INDICATOR_LAYER, 'visibility', z >= 4 ? 'visible' : 'none');

    // reset the filter
    map.setFilter(INDICATOR_LAYER, defaultFilter);
  }


  // Returns a Mapbox fill-color expression
  function getFillColorExpression(indicator) {
    if (indicator === 'severity') {
      // Build map expression for severity layer
      const ordinalScale = d3.scaleOrdinal()
        .domain(indicatorValues.severity)
        .range(colorRanges.severity);

      const expr = ['match', ['feature-state', 'severity']];
      indicatorValues.severity.forEach(val => {
        expr.push(val, ordinalScale(val));
      });
      
      // Fallback color if no match is found
      expr.push(DEFAULT_COLOR); 
      return expr;
    } 
    else {
      // quantile thresholds (precomputed in indicatorValues[indicator])
      const thresholds = d3.scaleQuantile()
          .domain(indicatorValues[indicator])
          .quantiles();

      const stepExpr = ['step', ['feature-state', indicator], colorRanges[indicator][0]];
      thresholds.forEach((t, i) => {
        stepExpr.push(t, colorRanges[indicator][i + 1]);
      });

      return [
        'case',
          ['any',
            ['==', ['feature-state', indicator], null],
            ['==', ['feature-state', indicator], undefined]
          ],
          DEFAULT_COLOR,
          stepExpr
      ];
    }
  }


  // Lookup helper that returns admin3 record if available, otherwise admin2
  function dataLookup() {
    const lookup = {};
    (mapData || []).forEach(record => {
      const code = record['Admin 3 P-Code'] || record['Admin 2 P-Code'];
      lookup[code] = record;
    });
    return lookup;
  }


  // Join tabular data to map features
  function joinDataToFeatures() {
    const lookup = dataLookup();

    // get the loaded features
    const features = map.querySourceFeatures('countryTileset', {
      sourceLayer: 'hrp22_polbnda_subnational_fieldmaps'
    });

    features.forEach(f => {
      const pcode = f.properties.join_pcode;
      const record = lookup[pcode];

      map.setFeatureState(
        { source: 'countryTileset', sourceLayer: 'hrp22_polbnda_subnational_fieldmaps', id: f.id },
        {
          pin:       record?.['Final PiN'] ?? null,
          pinPer:    record ? Math.min(record['PiN_percentage'], 1) : null,
          severity:  record?.['Final Severity'] ?? null,
          population: record?.['Population'] ?? null
        }
      );
    });

    map.setPaintProperty(
      INDICATOR_LAYER,
      'fill-color',
      getFillColorExpression(indicator)
    );
  }


  // Get color scale based on indicator
  function getColorScale(indicatorKey) {
    const colorRange = colorRanges[indicatorKey];
    let colorScale;
    if (indicatorKey=='severity') {
      colorScale = d3.scaleOrdinal()
        .domain(indicatorValues.severity)
        .range(colorRange);
    }
    else {
      colorScale = d3.scaleQuantile()
        .domain(indicatorValues[indicatorKey])
        .range(colorRange);
    }
    return colorScale;
  }


  // Create map legend
  function createMapLegend() {
    let legendTitle, legendFormat;
    // TODO: create indicator object that is passed into map
    if (indicator==='pin') {
      legendFormat = shortFormat;
      legendTitle = 'Number of People in Need';
    }
    else if (indicator==='pinPer') {
      legendFormat = percentFormat;
      legendTitle = 'Percentage of Population in Need';
    }
    else if (indicator==='severity') {
      legendFormat = numFormat;
      legendTitle = 'Needs Severity Level';
    }
    else {
      legendFormat = numFormat;
      legendTitle = 'Map Legend';
    }

    d3.select('.legend-title').text(legendTitle);

    const colorScale = getColorScale(indicator);
    const svg = d3.select(mapLegend);
    const colorLegend = legendColor()
      .labelFormat(legendFormat)
      .scale(colorScale);
     d3.select('.legend-body').call(colorLegend);

    // Append no data key
    svg.selectAll('.no-data-key').remove();
    const nodata = svg.append('svg').attr('class', 'no-data-key');
    nodata.append('rect').attr('width', 15).attr('height', 15);
    nodata.append('text').attr('class', 'label').text('No Data');
  }


  // Zoom into selected region. TODO: update features and scales with map extent
  function selectRegion() {
    if (regionBoundaryData===undefined) return;
    let regionFeature = regionBoundaryData.features.filter(d => d.properties.tbl_regcov_2020_ocha_Field3 == region);
    let offset = 20;

    if (region==='HRPs') {      
      map.once('moveend', () => {
        d3.select('.map-legend').style('opacity', 0);
        map.setLayoutProperty(INDICATOR_LAYER, 'visibility', 'none');
        map.setLayoutProperty(GLOBAL_FILL_LAYER, 'visibility', 'visible');
        map.setLayoutProperty(GLOBAL_LINE_LAYER, 'visibility', 'visible');
      });
    }
    else {
      map.once('moveend', () => {
        d3.select('.map-legend').style('opacity', 1);
        map.setLayoutProperty(INDICATOR_LAYER, 'visibility', 'visible');
        map.setLayoutProperty(GLOBAL_FILL_LAYER, 'visibility', 'none');
        map.setLayoutProperty(GLOBAL_LINE_LAYER, 'visibility', 'none');
      });
    }

    map.fitBounds(regionFeature[0].bbox, {
      padding: offset,
      linear: true
    });
  }

  // Mouse events for global and country layers
  function attachMouseEvents() {
    // Global layer mouse events
    map.on('click', GLOBAL_FILL_LAYER, (e) => {
      const feature = e.features[0];
      const bbox = turf.bbox(feature);

      map.once('moveend', () => {
        // Todo: fix tileset for CAF and COD
        if (feature.properties.adm0_pcode === 'CF') {
          map.setFilter(
            INDICATOR_LAYER,
            ['==', ['get', 'adm0_name'], 'Central African Republic']
          );
        }
        else if (feature.properties.adm0_pcode === 'CD') {
          map.setFilter(
            INDICATOR_LAYER,
            ['==', ['get', 'adm0_name'], 'Democratic Republic of the Congo']
          );
        }
        else {
          // Show features for selected country
          map.setFilter(
            INDICATOR_LAYER,
            ['==', ['get', 'adm0_pcode'], feature.properties.adm0_pcode]
          );
        }
        d3.select('.map-legend').style('opacity', 1);
        map.setLayoutProperty(INDICATOR_LAYER, 'visibility', 'visible');
        map.setLayoutProperty(GLOBAL_FILL_LAYER, 'visibility', 'none');
        map.setLayoutProperty(GLOBAL_LINE_LAYER, 'visibility', 'none');
      });

      map.fitBounds(bbox, {
        padding: 100,      
        duration: 700    
      });
    });
    map.on('mouseenter', GLOBAL_FILL_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', GLOBAL_FILL_LAYER, () => {
      map.getCanvas().style.cursor = '';
    });

    // Country layer mouse events
    map.on('mouseenter', INDICATOR_LAYER, onMouseEnter);
    map.on('mouseleave', INDICATOR_LAYER, onMouseLeave);
    map.on('mousemove', INDICATOR_LAYER, onMouseMove);

    // Home button event
    d3.select('.home-btn').on('click', () => {
      region = 'HRPs';
      selectRegion();
    });
  }

  
  function onMouseEnter(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  }

  function onMouseLeave(e) {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  }

  function onMouseMove(e) {
    const feature = e.features[0];
    const id      = feature.id;
    const state = map.getFeatureState({
      source:      'countryTileset',
      sourceLayer: 'hrp22_polbnda_subnational_fieldmaps',
      id
    });

    const adminName = feature.properties.adm3_name 
                    || feature.properties.adm2_name;
    let content = `<h2>${adminName}, ${feature.properties.adm0_name}</h2>`;

    if (state[indicator] == null) {
      content += `<div class="stat">No data</div>`;
    } else {
      if (indicator === 'severity') {
        content += '<div class="stats-container">';
        content += `<div><span>Needs Severity:</span><div class="stat">${state.severity}</div></div>`;
        content += `<div><span>People in Need:</span><div class="stat">${shortFormat(state.pin)}</div></div>`;
        content += '</div>';
      }

      content += `<br>Population: ${state.population !== null ? shortFormat(state.population) : 'No data'}`;
      if (state.population !== null)
        content += `<br>Percentage of Population in Need: ${percentFormat(state.pinPer)}`;
    }

    tooltip
      .setHTML(content)
      .setLngLat(e.lngLat)
      .addTo(map);
  }

  onMount(() => {
    initializeMap();
  });
</script>

<style>
  #map {
    width: 100%;
    height: 100vh;
  }
</style>

<div id='map'></div>
<div class='home-btn'><i class='humanitarianicons-House'></i></div>
<div class='map-legend' bind:this={mapLegend}>
  <h4 class='legend-title'>Map Legend</h4>
  <svg>
    <g class='legend-body'></g>
  </svg>
</div>

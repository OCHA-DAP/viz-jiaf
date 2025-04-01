<script>
  import { onMount } from "svelte";
  import mapboxgl from "mapbox-gl";
  import * as d3 from 'd3';
  import { legendColor } from 'd3-svg-legend';
  import * as turf from '@turf/turf';
  import '../../node_modules/mapbox-gl/dist/mapbox-gl.css';

  export let mapData = [];
  export let indicator;

  mapboxgl.baseApiUrl = 'https://data.humdata.org/mapbox';
  mapboxgl.accessToken = 'cacheToken';

  const countries = [
    { name: 'Afghanistan', code: 'AFG', url: 'geojson/adm2/afg-adm2.geojson' },
    { name: 'Burkina Faso', code: 'BFA', url: 'geojson/adm3/bfa-adm3.geojson' },
    { name: 'Central African Republic', code: 'CAF', url: 'geojson/adm2/caf-adm2.geojson' },
    { name: 'Chad', code: 'TCD', url: 'geojson/adm2/tcd-adm2.geojson' },
    //{ name: 'Colombia', code: 'COL', url: 'geojson/adm2/col-adm2.geojson' },
    { name: 'Democratic Republic of the Congo', code: 'COD', url: 'geojson/adm2/cod-adm2.geojson' },
    { name: 'El Salvador', code: 'SLV', url: 'geojson/adm2/slv-adm2.geojson' },
    { name: 'Guatemala', code: 'GTM', url: 'geojson/adm2/gtm-adm2.geojson' },
    { name: 'Haiti', code: 'HTI', url: 'geojson/adm2/hti-adm2.geojson' },
    { name: 'Honduras', code: 'HND', url: 'geojson/adm2/hnd-adm2.geojson' },
    { name: 'Mali', code: 'MLI', url: 'geojson/adm2/mli-adm2.geojson' },
    { name: 'Mozambique', code: 'MOZ', url: 'geojson/adm2/moz-adm2.geojson' },
    { name: 'Myanmar', code: 'MMR', url: 'geojson/adm3/mmr-adm3.geojson' },
    { name: 'Somalia', code: 'SOM', url: 'geojson/adm2/som-adm2.geojson' },
    { name: 'South Sudan', code: 'SSD', url: 'geojson/adm2/ssd-adm2.geojson' },
    { name: 'Sudan', code: 'SDN', url: 'geojson/adm2/sdn-adm2.geojson' },
    { name: 'Syria', code: 'SYR', url: 'geojson/adm3/syr-adm3.geojson' },
    { name: 'Ukraine', code: 'UKR', url: 'geojson/adm2/ukr-adm2.geojson' },
    { name: 'Venezuela', code: 'VEN', url: 'geojson/adm2/ven-adm2.geojson' },
    { name: 'Yemen', code: 'YEM', url: 'geojson/adm2/yem-adm2.geojson' }
  ]

  const colorRanges = {
    pin: ['#ffcdb2', '#f2b8aa', '#e4989c', '#b87e8b', '#925b7a'],
    severity: ['#ea9800', '#e57146', '#c35c65', '#8f556d', '#5c4d5c']
  };

  let indicatorValues = {
    pin: [],
    severity: [1, 2, 3, 4, 5]
  };

  let map, combinedGeojson, currentFeatures, mapLegend;
  let tooltip;
  const numFormat = d3.format(',');
  const shortFormat = d3.format('.2s');
  const DEFAULT_COLOR = '#CCC';
  const INDICATOR_LAYER = 'indicator-layer';

  // Reactive update: When indicator changes and the map is loaded, update the layer and legend
  $: if (map && map.getLayer(INDICATOR_LAYER) && indicator) {
    map.setPaintProperty(INDICATOR_LAYER, 'fill-color', getFillColorExpression(indicator));
    d3.select('.legend-body').selectAll('*').remove();
    createMapLegend();
  }

  export const isMobile = () => {
    const userAgentCheck = /Mobi|Android/i.test(navigator.userAgent);
    const screenSizeCheck = window.matchMedia("(max-width: 767px)").matches;
    return userAgentCheck || screenSizeCheck;
  }

  // Returns a Mapbox fill-color expression based on the indicator
  function getFillColorExpression(indicator) {
    if (indicator === 'severity') {
      // Build map expression for severity layer
      const ordinalScale = d3.scaleOrdinal()
        .domain(indicatorValues.severity)
        .range(colorRanges.severity);

      const expr = ['match', ['get', 'severity']];
      indicatorValues.severity.forEach(val => {
        expr.push(val, ordinalScale(val));
      });
      
      // Fallback color if no match is found
      expr.push(DEFAULT_COLOR); 
      return expr;
    } 
    else {
      // Build map expression for PiN layer
      const quantileScale = d3.scaleQuantile()
        .domain(indicatorValues.pin)
        .range(colorRanges.pin);

      const thresholds = quantileScale.quantiles();
      const stepExpr = ['step', ['get', 'pin'], quantileScale.range()[0]];
      thresholds.forEach((threshold, i) => {
        stepExpr.push(threshold, quantileScale.range()[i + 1]);
      });

      // Fallback color for empty string values
      return [
        "case",
        ["==", ["get", "pin"], ""],
        DEFAULT_COLOR,
        stepExpr
      ];
    }
  }

  // Build a lookup table from the CSV data for a given indicator
  function dataLookup(indicatorKey) {
    const lookup = {};
    (mapData[indicatorKey] || []).forEach(record => {
      const code = record['Admin 3 P-Code'] || record['Admin 2 P-Code'];
      lookup[code] = record;
    });
    return lookup;
  }

  // Fetch and combine all GeoJSON files into one FeatureCollection.
  async function fetchAndCombineData() {
    // Get unique pin values
    indicatorValues.pin = [...new Set(mapData.pin.map(row => convertToNum(row['Final PiN'])))];

    // Fetch geojson data
    const geojsons = await Promise.all(
      countries.map(({ url }) => fetch(url).then(res => res.json()))
    );

    // Combine features from all geojsons
    let combinedFeatures = geojsons.reduce((features, geojson) => {
      return geojson && geojson.features ? features.concat(geojson.features) : features;
    }, []);

    // Create CSV lookups 
    const pinLookup = dataLookup('pin');
    const severityLookup = dataLookup('severity');

    // Get color scale to assign color to features
    const colorScale = getColorScale(indicator);

    // Merge CSV data into GeoJSON features
    combinedFeatures = combinedFeatures.map(feature => {
      const code = feature.properties.adm3_pcode || feature.properties.adm2_pcode;
      const csvRecord = pinLookup[code];

      if (csvRecord) {
        const pinVal = convertToNum(csvRecord['Final PiN']);
        const severityVal = severityLookup[code]
          ? convertToNum(severityLookup[code]['Final Severity'])
          : '';
        feature.properties.pin = pinVal;
        feature.properties.severity = severityVal;
        feature.properties.population = convertToNum(csvRecord['Population']);
        feature.properties.color = pinVal === '' ? DEFAULT_COLOR : colorScale(pinVal);
      }
      else {
        feature.properties.pin = '';
        feature.properties.severity = '';
        feature.properties.color = DEFAULT_COLOR;
      }
      return feature;
    });

    // Create a combined FeatureCollection
    combinedGeojson = {
      type: 'FeatureCollection',
      features: combinedFeatures
    };

    return combinedGeojson;
  }


  // Initialize the map and add the combined GeoJSON source/layer
  async function initializeMap() {
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/humdata/cl3lpk27k001k15msafr9714b',
      center: [0, 20],
      zoom: 2
    });

    map.addControl(new mapboxgl.NavigationControl({showCompass: false}))
       .addControl(new mapboxgl.AttributionControl(), 'bottom-left');

    tooltip = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'map-tooltip'
    });

    map.on('load', async () => {
      //map.setPaintProperty('background', 'background-color', '#B7E4EF');
      const data = await fetchAndCombineData();

      // Add the combined GeoJSON as a source
      map.addSource('combined-geojson', {
        type: 'geojson',
        data: data
      });

      currentFeatures = data;

      // Add a layer that uses a data-driven style for the fill color.
      map.addLayer({
        id: INDICATOR_LAYER,
        type: 'fill',
        source: 'combined-geojson',
        layout: {},
        paint: {
          'fill-color': getFillColorExpression(indicator),
          'fill-outline-color': '#FFF'
        }
      }, 'Countries 2-4');

      attachMouseEvents();
      createMapLegend();
      zoomToBounds();
    });
  }

  // Convert string to number
  function convertToNum(str) {
    return str ? Number(str.replace(/,/g, "")) : 0;
  }

  // Return the appropriate D3 color scale based on the indicator
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
        .domain(indicatorValues.pin)
        .range(colorRange);
    }
    return colorScale;
  }

  function createMapLegend() {
    const legendTitle = (indicator==='pin') ? 'Number of People in Need' : 'Needs Severity Level';
    d3.select('.legend-title').text(legendTitle);

    const colorScale = getColorScale(indicator);
    const svg = d3.select(mapLegend);
    const colorLegend = legendColor()
      .labelFormat(d3.format('.2s'))
      .scale(colorScale);
     d3.select('.legend-body').call(colorLegend);

    // Append no data key
    svg.selectAll('.no-data-key').remove();
    const nodata = svg.append('svg').attr('class', 'no-data-key');
    nodata.append('rect').attr('width', 15).attr('height', 15);
    nodata.append('text').attr('class', 'label').text('No Data');
  }

  function selectRegion() {
    var regionFeature = regionBoundaryData.filter(d => d.properties.tbl_regcov_2020_ocha_Field3 == currentRegion);
    var offset = 20;
    map.fitBounds(regionFeature[0].bbox, {
      padding: offset,
      linear: true
    });

    // vizTrack(currentRegion, currentIndicator.name);
    // updateGlobalLayer();
  }

  function zoomToBounds() {
    //zoom map to bounds
    const pad = isMobile() ? {top: 20, right: 20, bottom: 20, left: 20} : {top: 20, right: 20, bottom: 20, left: 20};
    if (currentFeatures) {
      const bbox = turf.bbox(currentFeatures);
      map.fitBounds(bbox, {padding: pad, duration: 100});
    }
  }

  function attachMouseEvents() {
    map.on('mouseenter', INDICATOR_LAYER, onMouseEnter);
    map.on('mouseleave', INDICATOR_LAYER, onMouseLeave);
    map.on('mousemove', INDICATOR_LAYER, onMouseMove);
  }

  //mouse event/leave events
  function onMouseEnter(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  }

  function onMouseLeave(e) {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  }

  function onMouseMove(e) {
    const prop = e.features[0].properties;
    const adminName = prop.adm3_name || prop.adm2_name;
    let content = `<h2>${adminName}, ${prop.adm0_name}</h2>`;

    if (prop[indicator] === '') {
      content += `<span>People in need:</span><div class="stat">No data</div>`;
    } 
    else {
      if (indicator=='pin') {
        content += `<span>People in Need:</span><div class="stat">${prop.pin !== '' ? shortFormat(prop.pin) : 'No data'}</div>`;
      }
      else {
        content += `<span>Needs Severity:</span><div class="stat">${prop.severity !== '' ? prop.severity : 'No data'}</div>`;
      }

      content += `<br>Population: ${prop.population ? shortFormat(prop.population) : 'No data'}`;

      //content += `<hr><ul class="sector-list"><li><i class="${humIcons['Water Sanitation Hygiene']}"></i> WASH organizations present: ${prop.numOrgs}</li></ul>`;
    }

    tooltip.setHTML(content).addTo(map).setLngLat(e.lngLat);
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

<div id="map"></div>
<div class='map-legend' bind:this={mapLegend}>
  <h4 class='legend-title'>Map Legend</h4>
  <svg>
    <g class='legend-body'></g>
  </svg>
</div>

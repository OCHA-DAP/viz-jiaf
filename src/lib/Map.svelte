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
    { name: 'Afghanistan', url: 'geojson/afg-adm2.geojson' },
    { name: 'Burkina Faso', url: 'geojson/bfa-adm2.geojson' },
    { name: 'Central African Republic', url: 'geojson/caf-adm2.geojson' },
    { name: 'Chad', url: 'geojson/tcd-adm2.geojson' },
    //{ name: 'Colombia', url: 'geojson/col-adm2.geojson' },
    { name: 'Democratic Republic of the Congo', url: 'geojson/cod-adm2.geojson' },
    { name: 'El Salvador', url: 'geojson/slv-adm2.geojson' },
    { name: 'Guatemala', url: 'geojson/gtm-adm2.geojson' },
    { name: 'Haiti', url: 'geojson/hti-adm2.geojson' },
    { name: 'Honduras', url: 'geojson/hnd-adm2.geojson' },
    { name: 'Mali', url: 'geojson/mli-adm2.geojson' },
    { name: 'Mozambique', url: 'geojson/moz-adm2.geojson' },
    { name: 'Myanmar', url: 'geojson/mmr-adm2.geojson' },
    { name: 'Somalia', url: 'geojson/som-adm2.geojson' },
    { name: 'South Sudan', url: 'geojson/ssd-adm2.geojson' },
    { name: 'Sudan', url: 'geojson/sdn-adm2.geojson' },
    { name: 'Syria', url: 'geojson/syr-adm2.geojson' },
    { name: 'Ukraine', url: 'geojson/ukr-adm2.geojson' },
    { name: 'Venezuela', url: 'geojson/ven-adm2.geojson' },
    { name: 'Yemen', url: 'geojson/yem-adm2.geojson' }
  ]

  const colorRanges = {
    pin: ['#ffcdb2', '#f2b8aa', '#e4989c', '#b87e8b', '#925b7a'],
    severity: ['#ea9800', '#e57146', '#c35c65', '#8f556d', '#5c4d5c']
  };

  let map;
  let combinedGeojson; 
  let currentFeatures;
  let colorScale;
  let mapLegend;
  let pinValues = [];
  let tooltip = d3.select('.tooltip');
  let numFormat = d3.format(',');
  let shortFormat = d3.format('.2s');

  // If the indicator parameter changes and the map is loaded,
  // update the fill-color paint property for the layer.
  $: if (map && map.getLayer("indicator-layer") && indicator) {
    //updateFeatureColors();
    map.setPaintProperty("indicator-layer", "fill-color", getFillColorExpression(indicator));

    // update legend
    d3.select('.legend-body').selectAll('*').remove();
    createMapLegend();
  }

  export const isMobile = () => {
    const userAgentCheck = /Mobi|Android/i.test(navigator.userAgent);
    const screenSizeCheck = window.matchMedia("(max-width: 767px)").matches;
    return userAgentCheck || screenSizeCheck;
  }

  // This function returns a Mapbox fill-color expression based on the indicator.
  function getFillColorExpression(indicator) {
    if (indicator === "severity") {
      // Build map expression for severity layer
      const ordinalScale = d3.scaleOrdinal()
        .domain([1, 2, 3, 4, 5])
        .range(colorRanges.severity);

      let expr = ["match", ["get", "severity"]];
      [1, 2, 3, 4, 5].forEach(val => {
        expr.push(val, ordinalScale(val));
      });
      // Fallback color if no match is found
      expr.push("#CCC");
      return expr;
    } else {
      // Build map expression for PiN layer
      const quantileScale = d3.scaleQuantile()
        .domain(pinValues)
        .range(colorRanges.pin);

      const thresholds = quantileScale.quantiles();
      let expr = ["step", ["get", "pin"], quantileScale.range()[0]];
      thresholds.forEach((threshold, i) => {
        expr.push(threshold, quantileScale.range()[i + 1]);
      });

      // Handle empty string values.
      return [
        "case",
        ["==", ["get", "pin"], ""],
        "#CCC",
        expr
      ];
    }
  }

  function dataLookup(indicator) {
    const csvLookup = {};
    mapData[indicator].forEach(record => {
      let val = (indicator==='pin') ? record["Final PiN"] : record["Final Severity"];
      val = (val === '') ? 0 : convertToNum(val);
      csvLookup[record["Admin 2 P-Code"]] = record;
    });
    return csvLookup;
  }

  // Fetch and combine all GeoJSON files into one FeatureCollection.
  async function fetchAndCombineData() {
    const fetchPromises = countries.map(file =>
      fetch(file.url).then(response => response.json())
    );
    const geojsons = await Promise.all(fetchPromises);

    // Combine features from all files
    let combinedFeatures = geojsons.reduce((features, geojson) => {
      if (geojson && geojson.features) {
        return features.concat(geojson.features);
      }
      return features;
    }, []);

    const csvLookup = {};
    const values = []
    mapData[indicator].forEach(record => {
      let val = (indicator==='pin') ? record["Final PiN"] : record["Final Severity"];
      val = (val === '') ? 0 : convertToNum(val) 
      values.push(val);

      //test 
      if (indicator==='pin') pinValues = values;

      csvLookup[record["Admin 2 P-Code"]] = record;
    });

    colorScale = d3.scaleQuantile()
      .domain(values)
      .range(colorRanges[indicator]);

    // Merge CSV data into GeoJSON features.
    combinedFeatures = combinedFeatures.map(feature => {
      const code = feature.properties.adm2_pcode;
      if (csvLookup[code]) {
        // Add new attributes "pin" and "severity" from the CSV.
        let pinVal = convertToNum(csvLookup[code]["Final PiN"]);
        let severityVal = convertToNum(dataLookup('severity')[code]["Final Severity"]);
        feature.properties.pin = pinVal;
        feature.properties.severity = severityVal;
        feature.properties.population = convertToNum(csvLookup[code]["Population"]);
        feature.properties.color = (pinVal === '') ? '#CCC' : colorScale(pinVal);
      }
      else {
        feature.properties.pin = '';
        feature.properties.severity = '';
        feature.properties.color = '#CCC';
      }
      return feature;
    });

    // Create a combined FeatureCollection
    combinedGeojson = {
      type: "FeatureCollection",
      features: combinedFeatures
    };

    return combinedGeojson;
  }


  // Initialize the map and add the combined GeoJSON source/layer
  async function initializeMap() {
    map = new mapboxgl.Map({
      container: "map",
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

    map.on("load", async () => {
      //map.setPaintProperty('background', 'background-color', '#B7E4EF');
      const data = await fetchAndCombineData();

      // Add the combined GeoJSON as a single source.
      map.addSource("combined-geojson", {
        type: "geojson",
        data: data
      });

      currentFeatures = data;

      // Add a layer that uses a data-driven style for the fill color.
      map.addLayer({
        id: "indicator-layer",
        type: "fill",
        source: "combined-geojson",
        layout: {},
        paint: {
          "fill-color": getFillColorExpression(indicator),
          "fill-outline-color": "#FFF"
        }
      }, 'Countries 2-4');

      attachMouseEvents();
      createMapLegend();
      zoomToBounds();
    });
  }

  function convertToNum(str) {
    if (str=='' || str==undefined)
      return 0
    else
      return Number(str.replace(/,/g, ''));
  }

  function createMapLegend() {
    const legendTitle = (indicator=='pin') ? 'Number of People in Need' : 'Needs Severity Level';
    d3.select('.legend-title').text(legendTitle);

    const svg = d3.select(mapLegend);

    let colorRange = colorRanges[indicator];
    let colorScale;
    if (indicator=='severity') {
      colorScale = d3.scaleOrdinal()
        .domain([1, 2, 3, 4, 5])
        .range(colorRange);
    }
    else {
      colorScale = d3.scaleQuantile()
        .domain(pinValues)
        .range(colorRange);
    }

    const colorLegend = legendColor()
      .labelFormat(d3.format('.2s'))
      .scale(colorScale);

     d3.select('.legend-body').call(colorLegend);

    //no data key
    svg.selectAll('.no-data-key').remove();
    const nodata = svg.append('svg').attr('class', 'no-data-key');
    nodata.append('rect').attr('width', 15).attr('height', 15);
    nodata.append('text').attr('class', 'label').text('No Data');
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
    map.on('mouseenter', 'indicator-layer', onMouseEnter);
    map.on('mouseleave', 'indicator-layer', onMouseLeave);
    map.on('mousemove', 'indicator-layer', onMouseMove);
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
    let content = `<h2>${prop.adm2_name}, ${prop.adm0_name}</h2>`;

    if (prop[indicator] === '') {
      content += `<span>People in need:</span><div class="stat">No data</div>`;
    } 
    else {
      if (indicator=='pin') {
        content += `<span>People in Need:</span><div class="stat">${prop.pin ? shortFormat(prop.pin) : 'No data'}</div>`;
      }
      else {
        content += `<span>Needs Severity:</span><div class="stat">${prop.severity ? prop.severity : 'No data'}</div>`;
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

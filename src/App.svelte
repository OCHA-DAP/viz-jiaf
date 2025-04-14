<script>
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import * as d3 from 'd3';
  import Map from './lib/Map.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  

  let dataLoading = true;
  let currentIndicator, currentRegion;
  let dataDict = {};
  let data;

  const layers = [
    {name: 'Needs Severity', id: 'severity'},
    {name: 'People in Need', id: 'pin'},
    // {name: 'Percentage of Populaton in Need', id: 'pinPer'},
  ];

  const data_url = 'https://raw.githubusercontent.com/baripembo/hdx-scraper-jiaf/refs/heads/main/output/output.json';


  function dataLoaded() {
    dataLoading = false;

    const countries = new Set(data.map(row => row["Admin 0"]));
    console.log(countries)
  }

  function onLayerSelect(event) {
    const layerID = event.detail.message
    currentIndicator = layers[layerID].id;
  }

  function onRegionSelect(event) {
    currentRegion = event.detail.message;
  }

  function initTracking() {
    //initialize mixpanel
    var MIXPANEL_TOKEN = window.location.hostname=='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  onMount(async () => {
    Promise.all([
      d3.json(data_url)
    ]).then(function(result) {
      data = result[0];

      currentIndicator = 'severity';
      dataLoaded();
    });

    //initTracking();
  });
</script>


<main>

  <div class='grid-container'>
    <div class='panel-content col-2'>
      <Sidebar on:onLayerSelect={onLayerSelect} on:onRegionSelect={onRegionSelect} layers={layers} />
    </div>
    <div class='main-content col-10'>
      {#if dataLoading}
        <p class='no-data-msg'>Loading...</p>
      {:else}
        <Map mapData={data} indicator={currentIndicator} region={currentRegion} />
      {/if}
    </div>
  </div>

</main>


<style lang='scss'>
  .panel-content {
    position: relative;
  }
</style>

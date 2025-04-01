<script>
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import * as d3 from 'd3';
  import Map from './lib/Map.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  

  let dataLoading = true;
  let currentIndicator;
  let dataDict = {};

  const layers = [
    {name: 'People in Need', id: 'pin'},
    {name: 'Needs Severity', id: 'severity'}
  ];

  const pin_data_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR86p0qWe2rXg2UL93HaUUQP6M2CZ1ntBY-4dOxlRfJ-_xtAUuUkp2g96dzuuRGaA/pub?gid=1614078524&single=true&output=csv';
  
  const severity_data_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR86p0qWe2rXg2UL93HaUUQP6M2CZ1ntBY-4dOxlRfJ-_xtAUuUkp2g96dzuuRGaA/pub?gid=646087587&single=true&output=csv';


  Promise.all([loadCSV(pin_data_url), loadCSV(severity_data_url)])
    .then(([pin, severity]) => {
      dataDict['pin'] = cleanData(pin);
      dataDict['severity'] = cleanData(severity);


      dataLoaded();
    })
    .catch(error => {
      console.error('Error loading files:', error);
    });

  function cleanData(data) {
    return data.map(obj =>
      Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
          // Clean the key.
          const cleanedKey = key.trim().replace(/^"+|"+$/g, '');
          // Clean the value if it's a string.
          let cleanedValue = value;
          if (typeof value === 'string') {
            cleanedValue = value.trim().replace(/^"+|"+$/g, '');
          }
          return [cleanedKey, cleanedValue];
        })
      )
    );
  }

  function loadCSV(filePath) {
    return new Promise((resolve, reject) => {
      Papa.parse(filePath, {
        download: true,
        header: true,
        complete: function(results) {
          resolve(results.data);
        },
        error: function(error) {
          reject(error);
        }
      });
    });
  }

  function dataLoaded() {
    dataLoading = false;

    const countries = new Set(dataDict.pin.map(row => row["Admin 0"]));
    console.log(countries)
  }

  function onLayerSelect(event) {
    const layerID = event.detail.message
    currentIndicator = layers[layerID].id;
    console.log('currentIndicator:', currentIndicator);
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
    currentIndicator = 'pin';
    //initTracking();
  });
</script>


<main>
<!--   <header>
  </header>
  
  <h2 class='header'></h2> -->
  <div class='grid-container'>
    <div class='panel-content col-2'>
      <Sidebar on:customEvent={onLayerSelect} layers={layers} />
    </div>
    <div class='main-content col-10'>
      {#if dataLoading}
        <p class='no-data-msg'>Loading...</p>
      {:else}
        <Map mapData={dataDict} indicator={currentIndicator} />
      {/if}
    </div>
  </div>

</main>


<style lang='scss'>
  header {
    display: flex;
    flex-flow: row;
    margin-top: 20px;
  }
  header img {
    height: 30px;
    margin-right: 30px;
  }
  header p {
    margin-top: 0;
    width: 60%;
  }

  @media (max-width: 768px) {
    header {
      flex-flow: column;
      img {
        height: 20px;
      }
      p {
        width: 100%;
      }
    }
    .select-wrapper {
      margin-left: 20px;
    }
  }
</style>

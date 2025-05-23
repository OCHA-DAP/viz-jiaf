<script>
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import * as d3 from 'd3';
  import Map from './lib/Map.svelte'
  import Sidebar from './lib/Sidebar.svelte'

  let dataLoading = true;
  let currentIndicator;
  let dataDict = {};
  let data;
  let countryList;
  let selectValue = '';
  let totals = { totalPiN: 0, totalPopulation: 0 };
  let currentFilter = {type: 'region', value: 'HRPs'}
  let currentData = [];
  let isMobile = false;
  let collapsed = false;
  let mapRef;

  $: if (data && currentFilter) {
    totals = calculateTotals();
  }

  const layers = [
    {name: 'Needs Severity', id: 'severity'},
    //{name: 'People in Need', id: 'pin'},
    // {name: 'Percentage of Populaton in Need', id: 'pinPer'},
  ];

  const regionList = [
    {id: 'ROAP', name: 'Asia and the Pacific'},
    {id: 'ROCCA', name: 'Eastern Europe'},
    {id: 'ROLAC', name: 'Latin America and the Caribbean'},
    {id: 'ROMENA', name: 'Middle East and North Africa'},
    {id: 'ROSEA', name: 'Southern and Eastern Africa'},
    {id: 'ROWCA', name: 'West and Central Africa'}
  ];

  const data_url = 'local-data2.json';//https://raw.githubusercontent.com/baripembo/hdx-scraper-jiaf/refs/heads/main/output/jiaf.json';


  function dataLoaded() {
    dataLoading = false;
    countryList = getCountries(data);
    totals = calculateTotals();
  }

  function getCountries(data) {
    const countries = new Set();
    const countryList = [];
    const excludeList = new Set(["CMR", "NER", "ETH"]);  

    data.forEach(item => {
      const iso3 = item["ISO3"];
      const admin0 = item["Admin 0"];

      // SKIP if on the exclusion list
      if (excludeList.has(iso3)) {
        return; 
      }

      if (!countries.has(iso3)) {
        countries.add(iso3);
        countryList.push({ code: iso3, name: admin0 });
      }
    });
    return countryList;
  }

  function handleSelectValue(event) {
    selectValue = event.detail;
    currentFilter = event.detail==='' ? {type: 'region', value: 'HRPs'} : {type: 'country', value: selectValue};
  }

  function onLayerSelect(event) {
    const layerID = event.detail.message
    currentIndicator = layers[layerID].id;
  }

  function onFilterSelect(event) {
    currentFilter = event.detail.message;
  }

  function calculateTotals() {
    const filter = currentFilter.type === 'country' ? 'ISO3' : 'Region';
    currentData = currentFilter.value === 'HRPs' ? data : data.filter(item => item[filter] === currentFilter.value);
    const countries = new Set(currentData.map(item => item.ISO3));
    const numCountries = countries.size===24 ? 21 : countries.size; // FIX: 3 countries excluded

    const { totalPiN, totalPopulation } = currentData.reduce(
      (acc, item) => {
        acc.totalPiN        += Number(item['Final PiN'])    || 0;
        acc.totalPopulation += Number(item['Population'])  || 0;
        return acc;
      },
      { totalPiN: 0, totalPopulation: 0 }
    );

    return {
      totalPiN,
      totalPopulation,
      numCountries
    };
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

  function toggle() {
    if (isMobile) {
      collapsed = !collapsed;
      mapRef.closeTooltip();
    }
  }


  onMount(async () => {
    Promise.all([
      d3.json(data_url)
    ]).then(function(result) {
      data = result[0];
      console.log(data)
      currentIndicator = 'severity';
      dataLoaded();
    });

    // Detect mobile
    isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    //initTracking();
  });
</script>


<main>

  <div class='container'>
    <div class='panel-content' class:collapsed={collapsed}>
      <div class='panel-inner'>
        {#if countryList}
          <Sidebar 
            bind:selectValue
            on:onLayerSelect={onLayerSelect} 
            on:onFilterSelect={onFilterSelect} 
            {layers} 
            {countryList}
            {regionList}
            {totals}
            {currentData}
            {isMobile}
            selectedFilter={currentFilter}
          />
        {/if}
      </div>
      <div class='panel-button' on:click={toggle}>
        <i class={collapsed
          ? 'humanitarianicons-Double-arrow-right'
          : 'humanitarianicons-Double-arrow-left'}>
        </i></div>
    </div>
    <div class='main-content'>
      {#if dataLoading}
        <p class='no-data-msg'>Loading...</p>
      {:else}
        <Map
          bind:this={mapRef}
          mapData={data} 
          indicator={currentIndicator} 
          filter={currentFilter}
          {isMobile}
          on:sendValue={handleSelectValue} />
      {/if}
    </div>
  </div>

</main>


<style lang='scss'>
  .container {
    display: flex;
    height: 100vh;
    flex-flow: row;
  }
  .panel-content {
    height: 100vh;
    transition: max-width 0.3s ease;
    width: 30%;
    &.collapsed {
      max-width: 30px;
      .panel-inner {
        display: none;
      }

    }    
    .panel-inner {
      height: 100%;
      padding: 0 20px;
      overflow-y: auto;
    }
    .panel-button {
      //background-color: yellow;
      display: none;
      height: 100%;
      padding-right: 3px;
      position: absolute;
      right: 0;
      top: 0;
      width: 20px;
      i {
        position: absolute;
        transform: translateY(-50%);
        top: 50%;
      }
    }
  }
  .main-content {
    width: 70%;
  }

  @media (max-width: 600px) {
    .container {
     display: block;
     position: relative;
    }
    .panel-content {
      background-color: rgba(255, 255, 255, 0.85);
      position: absolute;
      left: 0;
      top: 0;
      width: 75%;
      z-index: 3;
      .panel-button {
        display: block;
      }
      .panel-inner {
        padding-right: 40px;
      }
    }
    .main-content {
      width: 100%;
      z-index: 1;
    }
  }
</style>

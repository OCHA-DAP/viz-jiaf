<script>
	import * as d3 from 'd3';
  import Select from 'svelte-select';
	import { createEventDispatcher, onMount } from 'svelte';
  import Bar from './Bar.svelte'

  export let layers;
  export let countryList;
  export let regionList;
  export let selectValue = '';
  export let totals = { totalPiN: 0, totalPopulation: 0 };
  export let currentData;

  let selectedFilter = {type: "region", value: "HRPs"};

  const shortFormat = d3.format('.2s');
  const percentFormat = d3.format('.0%');
  const dispatch = createEventDispatcher();

  let items = [];
  let groupBy;
  let selectedLayer = 0;


  function selectLayer(index) {
    selectedLayer = index;
    dispatch('onLayerSelect', { message: selectedLayer });
  }

  function createFilterSelect(regions, countries) {
    const regionItems = regions.map(({ id, name }) => ({
      value: id,
      label: name,
      group: 'region'
    }));

    const countryItems = countries.map(({ code, name }) => ({
      value: code,
      label: name,
      group: 'country'
    }));

    return [...regionItems, ...countryItems];
  }

  function onFilterSelect(event) {
    selectedFilter = { type: event.detail.group, value: event.detail.value };
    dispatch('onFilterSelect', { message: selectedFilter });
  }

  function onClearSelect(event) {
    selectedFilter = {type: "region", value: "HRPs"};
    dispatch('onFilterSelect', { message: selectedFilter });
  }

 	onMount(() => {
    items = createFilterSelect(regionList, countryList);
    groupBy = (item) => item.group;
	})
</script>

<div class='org-logo'>
  <a href='https://www.unocha.org' target='_blank' rel='noopener'>
    <img width='100' src='assets/logo-ocha-blue.png' alt='OCHA logo'>
  </a>
  <a href='https://data.humdata.org' target='_blank' rel='noopener'>
    <img width='60' src='assets/logo-hdx-accr-blk.svg' alt='HDX logo'>
  </a>
</div>

<h2>Intersectoral Needs Severity Dashboard</h2>

<div class='select-wrapper'>
  <label>Select a region or country:</label>
  <div class='select-group'>
    <Select 
      items={items} 
      bind:value={selectValue}
      {groupBy}
      placeholder='Select'
      on:change={onFilterSelect}
      on:clear={onClearSelect}
    />
  </div>
</div>


<div class="key-figure-container grid-container">
  <div class="key-figure col-6">
    <div class="inner">
      <h3>Number of Countries</h3>
      <div class="num">
        {#if totals.numCountries}
          {totals.numCountries}
        {:else}
          –
        {/if}
      </div>
    </div>
  </div>

  <div class="key-figure col-6">
    <div class="inner">
      <h3>Total Population</h3>
      <div class="num pop">
        {#if totals.totalPopulation}
          {shortFormat(totals.totalPopulation)}
        {:else}
          –
        {/if}
      </div>
    </div>
  </div>

  <div class="key-figure col-6">
    <div class="inner">
      <h3>Total Number of People in Need</h3>
      <div class="num pin">
        {#if totals.totalPiN}
          {shortFormat(totals.totalPiN)}
        {:else}
          –
        {/if}
      </div>
    </div>
  </div>

  <div class="key-figure col-6">
    <div class="inner">
      <h3>Percentage of People in Need</h3>
      <div class="num pop">
        {#if totals.totalPopulation}
          {percentFormat(totals.totalPiN/totals.totalPopulation)}
        {:else}
          –
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- <div class="bar-container">
  <Bar data={currentData} />
</div> -->



<!-- <ul class='menu'>
  {#each layers as {name, id}, index}
    <li class:active={selectedLayer === index} on:click={() => selectLayer(index)}>{name}</li>
  {/each}
</ul> -->

<!-- <div class='logos'>
  <a href='https://centre.humdata.org' target='_blank' rel='noopener'>
    <img src='assets/logo-centre-gray.png' alt='Centre for Humanitarian Data logo'>
  </a>
  <a href='https://www.unocha.org' target='_blank' rel='noopener'>
    <img src='assets/logo-ocha-gray.png' alt='Office for the Coordination of Humanitarian Affairs logo'>
  </a>
</div> -->

<style lang='scss'>
  .menu li {
    cursor: pointer;
  }
  .menu li:hover,
  .menu li.active {
    //background-color: #F1F1F1;
    color: #007ce0;
  }
  .org-logo {
    align-items: center;
    display: flex;
    margin-bottom: 30px;
    a:first-child {
      margin-right: 20px;
    }
  }
</style>

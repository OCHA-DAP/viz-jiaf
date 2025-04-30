<script>
	import * as d3 from 'd3';
  import Select from 'svelte-select';
	import { createEventDispatcher, onMount } from 'svelte';

  export let layers;
  export let countryList;
  export let regionList;
  export let selectValue = '';

  let selectedFilter = "";
  //let selectValue = "AFG";

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
<!-- <label for='regionSelect' class='visuallyhidden'>Select a region: </label>
<select id='regionSelect' class='region-select' on:change={onSelectRegion}>
  <option value=''>All Regions</option>
</select> -->

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

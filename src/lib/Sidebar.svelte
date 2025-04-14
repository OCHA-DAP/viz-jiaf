<script>
	import * as d3 from 'd3';
	import { createEventDispatcher, onMount } from 'svelte';

  export let layers;

  let selectedRegion = '';

  const dispatch = createEventDispatcher();

  //regional id/name list
  const regionalList = [
    {id: 'HRPs', name: 'All Regions'},
    {id: 'ROAP', name: 'Asia and the Pacific'},
    {id: 'ROCCA', name: 'Eastern Europe'},
    {id: 'ROLAC', name: 'Latin America and the Caribbean'},
    {id: 'ROMENA', name: 'Middle East and North Africa'},
    {id: 'ROSEA', name: 'Southern and Eastern Africa'},
    {id: 'ROWCA', name: 'West and Central Africa'}
  ];

  let selectedLayer = 0;

  function selectLayer(index) {
    selectedLayer = index;
    dispatch('onLayerSelect', { message: selectedLayer });
  }

  function createRegionSelect() {
    // Clear select contents
    const select = d3.select('.region-select');
    select.html('');

    // Bind data and create options from regionalList
    select.selectAll('option')
      .data(regionalList)
      .enter()
      .append('option')
        .text(function(d) { return d.name; })
        .attr('value', function(d) { return d.id; });

    // Set the select's value to the default option value
    select.property('value', select.select('option').node().value);
  }

  function onSelectRegion(event) {
    selectedRegion = event.target.value;
    dispatch('onRegionSelect', { message: selectedRegion });
  }

 	onMount(() => {
    createRegionSelect();
	})
</script>

<div class='org-logo'>
  <a href='https://www.unocha.org' target='_blank' rel='noopener'>
    <img width='100' src='assets/logo-ocha-blue.png' alt='OCHA logo'>
  </a>
  <a href='https://data.humdata.org' target='_blank' rel='noopener'>
    <img width='100' src='assets/logo-hdx.svg' alt='HDX logo'>
  </a>
</div>

<h2>Intersectoral Needs Severity Dashboard</h2>
<label for='regionSelect' class='visuallyhidden'>Select a region: </label>
<select id='regionSelect' class='region-select' on:change={onSelectRegion}>
  <option value=''>All Regions</option>
</select>

<ul class='menu'>
  {#each layers as {name, id}, index}
    <li class:active={selectedLayer === index} on:click={() => selectLayer(index)}>{name}</li>
  {/each}
</ul>

<div class='logos'>
  <a href='https://centre.humdata.org' target='_blank' rel='noopener'>
    <img src='assets/logo-centre-gray.png' alt='Centre for Humanitarian Data logo'>
  </a>
  <a href='https://www.unocha.org' target='_blank' rel='noopener'>
    <img src='assets/logo-ocha-gray.png' alt='Office for the Coordination of Humanitarian Affairs logo'>
  </a>
</div>

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
    display: flex;
    margin-bottom: 30px;
    a:first-child {
      margin-right: 20px;
    }
  }
</style>

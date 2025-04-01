<script>
	import * as d3 from 'd3';
	import { createEventDispatcher, onMount } from 'svelte';

  export let layers;

  const dispatch = createEventDispatcher();

  //regional id/name list
  const regionalList = [
    {id: 'HRPs', name: 'Humanitarian Response Plan Countries'},
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
    dispatch('customEvent', { message: selectedLayer });
  }

  function createRegionSelect() {
    // Select the element and clear its content
    var select = d3.select('.region-select');
    select.html('');

    // Bind data and create options from regionalList
    select.selectAll('option')
      .data(regionalList)
      .enter()
      .append('option')
        .text(function(d) { return d.name; })
        .attr('value', function(d) { return d.id; });

    // Insert the default option at the beginning
    select.insert('option', ':first-child')
      .attr('value', '')
      .text('All Regions');

    // Set the select's value to the default option value
    select.property('value', select.select('option').node().value);
  }


 	onMount(() => {
    //createRegionSelect();
	})
</script>


<h2>People in Need Dashboard</h2>
<!-- <label for='regionSelect' class='visuallyhidden'>Select a region: </label>
<select id='regionSelect' class='region-select'>
  <option value=''>All Regions</option>
</select> -->

<ul class='menu'>
  {#each layers as {name, id}, index}
    <li class:active={selectedLayer === index} on:click={() => selectLayer(index)}>{name}</li>
  {/each}
</ul>

<style lang='scss'>
  .menu li {
    cursor: pointer;
  }
  .menu li:hover,
  .menu li.active {
    //background-color: #F1F1F1;
    color: #007ce0;
  }
</style>

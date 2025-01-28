<script>
	import * as d3 from 'd3';
	import { createEventDispatcher, onMount } from 'svelte';

  export let layers;

  const dispatch = createEventDispatcher();

  let selectedLayer = 0;

  function selectLayer(index) {
    selectedLayer = index;
    dispatch('customEvent', { message: selectedLayer });
  }

 	onMount(() => {

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

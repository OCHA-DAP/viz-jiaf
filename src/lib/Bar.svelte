<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';

  export let data = [];
  export let title = '';
  export let valueFormat = d3.format('.2s');
  export let width = 312;
  export let barHeight = 16;
  export let barPadding = 8;
  export let nameWidth = 150;
  export let labelWidth = 50;
  const severityColorScale = ['', '#C6E5F1', '#70BEDD', '#0A9DD9', '#066F9A', '#044B66'];


  $: chartData = [...data]
    .sort((a, b) => {
      const sa = +a['Final Severity'], sb = +b['Final Severity'];
      if (sb !== sa) return sb - sa;
      return (+b['Final PiN']) - (+a['Final PiN']);
    })
    .slice(0, 10)
    .map(d => {
      const name = d['Admin 3'] ?? d['Admin 2'];
      const sev = +d['Final Severity'] || 0;
      return { ...d, name, color: severityColorScale[sev] };
    });

  $: chartWidth = width - nameWidth - labelWidth;
  $: height = chartData.length * (barHeight + barPadding);

  $: xScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => +d['Final PiN'])])
      .range([0, chartWidth]);

  $: yScale = d3.scaleBand()
      .domain(chartData.map(d => d.name))
      .range([0, height])
      .paddingInner(barPadding / (barHeight + barPadding));
</script>

{#if title}
  <h3>{title}</h3>
{/if}

<div class='bar-container'>
  <svg viewBox={`0 0 ${width} ${height}`} {width} {height} preserveAspectRatio='none'>
    <g>
      {#each chartData as d}
        <text
          class='name'
          x={nameWidth - 8}
          y={yScale(d.name)}
        >{d.name.toLowerCase()}</text>

        <rect
          class='bar'
          fill={d.color}
          x={nameWidth}
          y={yScale(d.name)}
          width={xScale(+d['Final PiN'])}
          height={barHeight}
        />

        <text
          class='label'
          x={nameWidth + xScale(+d['Final PiN']) + 8}
          y={yScale(d.name)}
        >{valueFormat(+d['Final PiN'])}</text>
      {/each}
    </g>
  </svg>
</div>

<style lang='scss'>
  .label, .name {
    alignment-baseline: hanging;
    font-size: 14px;
    text-transform: capitalize;
  }
  .name { text-anchor: end; }
</style>

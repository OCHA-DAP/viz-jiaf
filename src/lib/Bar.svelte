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
  export let margin = { top: 10, right: 45, bottom: 10, left: 135 };
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

  $: groupedData = Array.from(
    d3.group(chartData, d => +d['Final Severity']),
    ([severity, items]) => ({ severity, items })
  ).sort((a, b) => b.severity - a.severity);

  $: maxPiN = d3.max(chartData, d => d['Final PiN']) || 0;
  $: innerWidth = width - margin.left - margin.right;
  $: xScale = d3.scaleLinear()
    .domain([0, maxPiN])
    .range([0, innerWidth]);
  // $: chartWidth = width - nameWidth - labelWidth;
  // $: height = chartData.length * (barHeight + barPadding);

  // $: xScale = d3.scaleLinear()
  //     .domain([0, d3.max(chartData, d => +d['Final PiN'])])
  //     .range([0, chartWidth]);

  // $: yScale = d3.scaleBand()
  //     .domain(chartData.map(d => d.name))
  //     .range([0, height])
  //     .paddingInner(barPadding / (barHeight + barPadding));
</script>

{#if title}
  <h3>{title}</h3>
{/if}

<!-- <div class='bar-container'>
  <svg viewBox={`0 0 ${width} ${height}`} {width} {height} preserveAspectRatio='none'>
    <g> -->
      <!-- {#each chartData as d}
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
      {/each} -->
      {#each groupedData as group}
			  <div class="chart-group">
			    <p>Severity {group.severity}</p>
			    <svg
			      {width}
			      height={margin.top
			        + group.items.length * (barHeight + barPadding)
			        - barPadding
			        + margin.bottom}
			    >
			      <g transform={`translate(${margin.left},${margin.top})`}>
			        {#each group.items as d, i}
			          <rect
			          	class="bar"
			            x={0}
			            y={i * (barHeight + barPadding)}
			            width={xScale(d["Final PiN"])}
			            height={barHeight}
			            fill={d.color}
			          />
			          <text
			            class="name"
			            x={-5}
			            y={i * (barHeight + barPadding) + barHeight/2}
			            dy="-.35em"
			          >
			            {d.name.toLowerCase()}
			          </text>
			          <text
			            class="label"
			            x={xScale(d['Final PiN']) + 5}
			            y={i * (barHeight + barPadding) + barHeight/2}
			            dy="-.35em"
			          >
			            {valueFormat(+d['Final PiN'])}
			          </text>
			        {/each}
			      </g>
			    </svg>
			  </div>
			{/each}

<!--     </g>
  </svg>
</div> -->

<style lang='scss'>
	p {
		font-size: 14px;
		margin: 0;
		text-align: center;
		border-bottom: 1px solid #CCC;
    width: 70%;
    margin: 0 auto;
	}
  .label, .name {
    alignment-baseline: hanging;
    font-size: 14px;
    text-transform: capitalize;
  }
  .name { text-anchor: end; }
</style>
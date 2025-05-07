<script>
	import * as d3 from 'd3';
	import { onMount } from 'svelte';

	export let data = [];
	export let title = null;
	export let valueFormat = d3.format('.2s');
	export let width = 100;
	export let barHeight = 16;
	export let barPadding = 8;
	export let nameWidth = 200;
	export let labelWidth = 50;
	export let textPadding = 8;

	let chartWidth, height, xScale, yScale;
	$: chartData = data.slice(0,10);//data.sort((a, b) => b.value - a.value).slice(0,10);

	console.log(chartData)
	//$: width = map.isMobile() ? width - 40 : width;


	const xAccessor = (d) => d['Final PiN'];
	const yAccessor = (d) => d['Admin 3']!==null ? d['Admin 3'] : d['Admin 2'];

	$: chartData && init()

	function isMobile() {
    const userAgentCheck = /Mobi|Android/i.test(navigator.userAgent);
    const screenSizeCheck = window.matchMedia("(max-width: 767px)").matches;
    return userAgentCheck || screenSizeCheck;
	}

	function init() {
		//remove any empty rows
		//chartData = chartData.filter(row => row.name !== '');

		chartWidth = width - nameWidth - labelWidth;
		if (isMobile()) chartWidth = chartWidth - 20;
		
		height = chartData.length * (barHeight+barPadding);

		xScale = d3.scaleLinear()
	  	.domain([0, d3.max(chartData, xAccessor)])
			.range([0, chartWidth]);

	  yScale = d3.scaleBand()
			.domain(chartData.map(yAccessor))
	  	.range([0, height]);
	}
</script>


{#if title}
	<h3>{title}</h3>
{/if}

<div class='bar-container'>
	<svg viewBox='0 0 {width} {height}' preserveAspectRatio='none' {width} {height}>
		<g>
			{#each chartData as d, i}
				<text class='name' x={nameWidth - textPadding} y={yScale(d.name)}>{d.name}</text>
				<rect 
					class='bar'
					x={nameWidth}
					y={yScale(d['Admin 3']!==null ? d['Admin 3'] : d['Admin 2'])}
					height={barHeight}
					width={xScale(d['Final PiN'])}
				/>
				<text class='label' x={nameWidth + xScale(d['Final PiN']) + textPadding} y={yScale(d['Admin 3']!==null ? d['Admin 3'] : d['Admin 2'])}>{valueFormat(d['Final PiN'])}</text>
			{/each}
		</g>
	</svg>
</div>

<style lang='scss'>
	.bar-container {
		fill: #007CE0;
	}
	.axis path {
		color: #007CE0;
	}
	.label,
	.name {
		alignment-baseline: hanging;
	}
	.name {
		text-anchor: end;
	}
</style>

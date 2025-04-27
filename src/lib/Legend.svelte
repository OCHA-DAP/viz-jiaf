<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  // Props to customize colors, values, and dimensions
  export let colors = ['#BDCBDC', '#91ABC4', '#688DB0', '#46719B', '#2C5984'];
  export let values = [1, 2, 3, 4, 5];
  export let width = 100;
  export let height = 50;
  let svg;

  onMount(() => {
    const numBuckets = values.length;
    const rectWidth = width / numBuckets;

    // Create a color scale
    const colorScale = d3.scaleOrdinal()
      .domain(values)
      .range(colors);

    // Bind data and draw legend items
    const legend = d3.select(svg)
      .selectAll('g')
      .data(values)
      .join('g')
      .attr('transform', (_d, i) => `translate(${i * rectWidth}, 0)`);

    // Draw colored rectangles
    legend.append('rect')
      .attr('width', rectWidth - 2)
      .attr('height', 10)
      .attr('fill', d => colorScale(d));

    // Add labels below rectangles
    legend.append('text')
      .attr('x', (rectWidth - 2) / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .text(d => d);
  });
</script>

<svg bind:this={svg} {width} {height}></svg>

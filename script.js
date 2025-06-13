document.addEventListener('DOMContentLoaded', function () {
    let allData = [];
    const defaultSelectedVariables = ['date', 'location', 'total_cases', 'new_cases', 'total_deaths', 'new_deaths', 'total_vaccinations'];
    let initialDataLimit = 1000;

    d3.csv('owid-covid-data-procesado.csv').then(function (data) {
        allData = data.map(d => {
            d.date = new Date(d.date);
            d.date.setDate(d.date.getDate() + 1);
            return d;
        });

        const variables = Object.keys(data[0]);
        const variableTags = d3.select('#variable-tags');

        variableTags.selectAll('span')
            .data(variables)
            .enter()
            .append('span')
            .text(d => d)
            .attr('class', 'tag')
            .classed('default-selected', d => defaultSelectedVariables.includes(d))
            .on('click', function (event, d) {
                if (!defaultSelectedVariables.includes(d)) {
                    d3.select(this).classed('selected', !d3.select(this).classed('selected'));
                    updateSelectedVariables();
                }
            });

        function calculateMedian(values) {
            values.sort((a, b) => a - b);
            const half = Math.floor(values.length / 2);
            return values.length % 2 ? values[half] : (values[half - 1] + values[half]) / 2;
        }

        function calculateStandardDeviation(values) {
            const avg = d3.mean(values);
            const squareDiffs = values.map(value => Math.pow(value - avg, 2));
            return Math.sqrt(d3.mean(squareDiffs));
        }

        function updateSelectedVariables() {
            const selectedVariableTags = d3.selectAll('#variable-tags .tag.selected:not(.default-selected)').data();
            const orderedSelectedVariables = [
                ...selectedVariableTags.reverse(),
                ...defaultSelectedVariables
            ];

            d3.selectAll('.chart-container').remove();

            orderedSelectedVariables.forEach((variable, index) => {
                const columnId = index % 2 === 0 ? '#column1' : '#column2';
                const column = d3.select(columnId);

                const chartContainer = column.append('div')
                    .attr('class', 'chart-container')
                    .style('height', '450px')
                    .style('width', '100%');

                createChart(chartContainer, variable, allData);
            });
        }

        function createChart(container, variable, data) {
            const width = container.node().getBoundingClientRect().width;
            const height = 300;

            const initialData = data.slice(0, initialDataLimit);

            const boxContainer = container.append('div')
                .style('border', '1px solid #ccc')
                .style('border-radius', '5px')
                .style('padding', '10px')
                .style('margin-bottom', '20px');

            boxContainer.append("div")
                .style("text-align", "center")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text(variable);

            switch(variable) {
                case 'continent':
                    createContinentBarChart(boxContainer, initialData, variable, width, height);
                    break;
                case 'location':
                    createLocationGeoChart(boxContainer, initialData, variable, width, height);
                    break;
                case 'date':
                case 'total_cases':
                case 'new_cases':
                case 'new_cases_smoothed':
                case 'total_deaths':
                case 'new_deaths':
                case 'new_deaths_smoothed':
                case 'total_vaccinations':
                case 'people_vaccinated':
                case 'people_fully_vaccinated':
                case 'stringency_index':
                    createLineChart(boxContainer, initialData, variable, width, height);
                    break;
                case 'population':
                case 'median_age':
                case 'aged_65_older':
                case 'aged_70_older':
                case 'gdp_per_capita':
                case 'extreme_poverty':
                case 'cardiovasc_death_rate':
                case 'diabetes_prevalence':
                    createPieChart(boxContainer, initialData, variable, width, height);
                    break;
                default:
                    createLineChart(boxContainer, initialData, variable, width, height);
            }

            addStatisticalAnalysis(boxContainer, initialData, variable);
        }

        function addStatisticalAnalysis(container, data, variable) {
            const values = data.map(d => +d[variable]).filter(d => !isNaN(d));

            if (values.length === 0) {
                return;
            }

            const median = calculateMedian(values);
            const stdDev = calculateStandardDeviation(values);
            const maxValue = d3.max(values);
            const minValue = d3.min(values);

            const statsContainer = container.append('div')
                .style('margin-top', '10px')
                .style('padding', '10px')
                .style('background-color', '#f8f8f8')
                .style('border-radius', '5px');

            statsContainer.append('div')
                .style('font-weight', 'bold')
                .text(`Análisis estadístico de la variable: ${variable}`);

            statsContainer.append('div').text(`Mediana: ${median.toFixed(2)}`);
            statsContainer.append('div').text(`Desviación estándar: ${stdDev.toFixed(2)}`);
            statsContainer.append('div').text(`Valor máximo: ${maxValue}`);
            statsContainer.append('div').text(`Valor mínimo: ${minValue}`);
        }

        function createContinentBarChart(container, data, variable, width, height) {
            const margin = { top: 20, right: 20, bottom: 50, left: 50 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const continentCounts = d3.rollup(data, v => v.length, d => d[variable]);
            const sortedContinentCounts = Array.from(continentCounts).sort((a, b) => b[1] - a[1]);

            const x = d3.scaleBand()
                .domain(sortedContinentCounts.map(d => d[0]))
                .range([0, innerWidth])
                .padding(0.1);

            const y = d3.scaleLinear()
                .domain([0, d3.max(sortedContinentCounts, d => d[1])])
                .range([innerHeight, 0]);

            svg.selectAll(".bar")
                .data(sortedContinentCounts)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d[0]))
                .attr("y", d => y(d[1]))
                .attr("width", x.bandwidth())
                .attr("height", d => innerHeight - y(d[1]));

            svg.append("g")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(d3.axisBottom(x));

            svg.append("g")
                .call(d3.axisLeft(y));
        }

        function createLocationGeoChart(container, data, variable, width, height) {
            const locationCounts = d3.rollup(data, v => v.length, d => d[variable]);
            const sortedLocationCounts = Array.from(locationCounts).sort((a, b) => b[1] - a[1]);

            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height);

            svg.selectAll("circle")
                .data(sortedLocationCounts)
                .enter()
                .append("circle")
                .attr("cx", (d, i) => (i % 10) * (width / 10) + width / 20)
                .attr("cy", (d, i) => Math.floor(i / 10) * (height / Math.ceil(sortedLocationCounts.length / 10)) + height / 20)
                .attr("r", d => Math.sqrt(d[1]) / 2)
                .attr("fill", "steelblue");

            svg.selectAll("text")
                .data(sortedLocationCounts)
                .enter()
                .append("text")
                .attr("x", (d, i) => (i % 10) * (width / 10) + width / 20)
                .attr("y", (d, i) => Math.floor(i / 10) * (height / Math.ceil(sortedLocationCounts.length / 10)) + height / 10)
                .text(d => d[0])
                .attr("text-anchor", "middle")
                .attr("font-size", "10px");
        }

        function createLineChart(container, data, variable, width, height) {
            const margin = { top: 20, right: 20, bottom: 50, left: 50 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const x = d3.scaleTime()
                .domain(d3.extent(data, d => d.date))
                .range([0, innerWidth]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => +d[variable])])
                .range([innerHeight, 0]);

            const line = d3.line()
                .x(d => x(d.date))
                .y(d => y(+d[variable]));

            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("d", line);

            const values = data.map(d => +d[variable]).filter(d => !isNaN(d));
            const median = calculateMedian(values);
            const stdDev = calculateStandardDeviation(values);

            svg.append("line")
                .attr("x1", 0)
                .attr("y1", y(median))
                .attr("x2", innerWidth)
                .attr("y2", y(median))
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");

            svg.append("line")
                .attr("x1", 0)
                .attr("y1", y(median + stdDev))
                .attr("x2", innerWidth)
                .attr("y2", y(median + stdDev))
                .attr("stroke", "green")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");

            svg.append("line")
                .attr("x1", 0)
                .attr("y1", y(median - stdDev))
                .attr("x2", innerWidth)
                .attr("y2", y(median - stdDev))
                .attr("stroke", "green")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");

            const legend = svg.append("g")
                .attr("transform", `translate(${innerWidth - 100}, 20)`);

            legend.append("text")
                .attr("x", 0)
                .attr("y", 0)
                .text("Median")
                .attr("fill", "red");

            legend.append("line")
                .attr("x1", -10)
                .attr("y1", -5)
                .attr("x2", 10)
                .attr("y2", -5)
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");

            legend.append("text")
                .attr("x", 0)
                .attr("y", 20)
                .text("Std Dev")
                .attr("fill", "green");

            legend.append("line")
                .attr("x1", -10)
                .attr("y1", 15)
                .attr("x2", 10)
                .attr("y2", 15)
                .attr("stroke", "green")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");

            svg.append("g")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(d3.axisBottom(x));

            svg.append("g")
                .call(d3.axisLeft(y));
        }

        function createPieChart(container, data, variable, width, height) {
            const radius = Math.min(width, height) / 2;

            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${width / 2}, ${height / 2})`);

            const counts = d3.rollup(data, v => v.length, d => d[variable]);
            const pieData = Array.from(counts, ([key, value]) => ({ key, value }));

            const pie = d3.pie()
                .value(d => d.value)
                .sort(null);

            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            const arcs = svg.selectAll(".arc")
                .data(pie(pieData))
                .enter()
                .append("g")
                .attr("class", "arc");

            arcs.append("path")
                .attr("d", arc)
                .attr("fill", (d, i) => d3.schemeCategory10[i]);

            arcs.append("text")
                .attr("transform", d => `translate(${arc.centroid(d)})`)
                .attr("text-anchor", "middle")
                .text(d => d.data.key);
        }

        d3.select('#reset-button').on('click', function () {
            d3.selectAll('.tag').classed('selected', function(d) {
                return defaultSelectedVariables.includes(d);
            });
            updateSelectedVariables();
        });

        updateSelectedVariables();
    }).catch(function (error) {
        console.error('Error loading the CSV file:', error);
    });
});

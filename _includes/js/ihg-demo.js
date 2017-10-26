
var width = 960,
height = 20;



$( document ).ready(function() {
	var nbChartsStart = 2;
	var marginCharts = 2;
					
	createCharts(nbChartsStart);
	
	
	function createCharts(nbCharts){

		d3.select("#chartsDiv").remove();
		d3.select("#horizon-chart").append("div").attr("id", "chartsDiv");
					

		var charts = Array();

		var svgs = Array();

		for(var n=0;n<nbCharts;n++){
			var chart = d3.horizon()
				.width(width)
				.height(height)
				.bands(1)
				.mode("mirror");
				//.interpolate("basis"); see https://github.com/mbostock/d3/wiki/SVG-Shapes for more interpolation
							
							
			var svg = d3.select("#chartsDiv").append("svg")
					.attr("width", width)
					.attr("height", height)
					.style("margin-top", marginCharts);
							
			charts.push(chart);
			svgs.push(svg);
		}



		d3.json("/data/financeData-ihg.json", function(dataOrig) {

			for(var dc=0;dc<nbCharts;dc++){
				(function(dc){
					var data = dataOrig;
					var curData = data.data[dc];
					//console.log("for data "+curData);
								
								
								
								
					var offset = 0;
					var orig_data = curData;
					var mean = curData.reduce(function(p, v) { return p + v; }, offset) / curData.length;

					data = curData.map(function(val, i) {
						return [Date.UTC(data.year[i], data.month[i] - 1, data.day[i]), val - mean];
					});

					svgs[dc].data([data]).call(charts[dc]);
								
					function drag(d,i) {
						if(d3.event.sourceEvent.which==1) { // left button
							var ny = -d3.event.dy;
									
							for(var ch in charts){
								if(charts[ch].bands()>0){
									svgs[ch].call(charts[ch].duration(0).bands(Math.min(5, Math.max(1, charts[ch].bands() + ny/10))).height(height));
								}
							}
						}

						else if(d3.event.sourceEvent.which==3) { // right button
							offset+=d3.event.dy*5;
										
							for(var ch in charts){
								mean = dataOrig.data[ch].reduce(function(p, v) { return p + v; }, offset) / dataOrig.data[ch].length;
								data = dataOrig.data[ch].map(function(val, i) {
									return [Date.UTC(dataOrig.year[i], dataOrig.month[i] - 1, dataOrig.day[i]), val - mean];
								});
								svgs[ch].data([data]).call(charts[ch]);
							}
						}
					}

					var dragBehav = d3.behavior.drag()
						.on('drag', drag)
									
					svgs[dc].call( dragBehav ); 

					// buttons: to change the nb of charts
					d3.selectAll("#horizon-controls input[name=nbCharts]").on("change", function() {
						createCharts(this.value);
					});
								
				})(dc);
			}
		});
	}
	
});






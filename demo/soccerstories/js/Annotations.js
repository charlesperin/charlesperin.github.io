Annotations = function(data,dy,height){
    this.data = data;
    this.h = height;
    this.init(dy);
};

Annotations.prototype.init = function(dy){
    var div = d3.select("#testSequences")
        .append("div")
        .attr("class","annotations")
        .style("position","absolute")
        .style("margin-top",dy+"px");

    div.html("ANNOTATIONS");
};
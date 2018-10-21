LiveCoverVis = function(data,svg, x, y, w, h){
    this.svg = svg;
    this.data = data;
    this.posX = x;
    this.posY = y;
    this.w = w;
    this.h = h;

    this.init();

};

LiveCoverVis.prototype.init = function(){

    var infos = this.data.matchInfos;

    this.visSVG = this.svg.append("g")
        .attr("id", "liveCoverVis")
        .attr("transform","translate("+this.posX+","+this.posY+")");


    this.visSVG.append("rect")
        .style("fill","white")
        .style("stroke-width",.5)
        .style("stroke","black")
        .attr("width", this.w)
        .attr("height", this.h);


    this.visSVG.append("text")
        .attr("class", "teamName")
        .attr("x",this.w/2-100)
        .attr("y",this.h/2)
        .style("text-anchor","end")
        .style("text-decoration", infos.home ? "underline" : "")
        .text(infos.home_name);

    this.visSVG.append("text")
        .attr("class", "teamName")
        .attr("x",this.w/2+100)
        .attr("y",this.h/2)
        .style("text-anchor","start")
        .style("text-decoration", !infos.home ? "underline" : "")
        .text(infos.away_name);

    this.visSVG.append("text")
        .attr("class", "teamName")
        .style("font-weight", "bold")
        .attr("x",this.w/2)
        .attr("y",this.h/2)
        .style("text-anchor","middle")
        .text(infos.score_home+" - "+infos.score_away);

    this.visSVG.append("text")
        .attr("class", "matchDetails")
        .attr("x", this.w/2)
        .attr("y",this.h-7)
        .attr("text-anchor","middle")
        .text(infos.comp_name+" : "+infos.date);


};

SequenceInfos = function(_data, svg, x, y, w, h){
    this.data = _data;
    this.posX=x;
    this.posY=y;
    this.w=w;
    this.h=h;
    this.svg=svg;
    this.event_width = 3;

    this.init();
};

SequenceInfos.prototype.init = function(){
    var margin = 10,
        labelH = 20;

    this.fade_in_out_duration = 500;
    this.axisH = 10;

    var $this = this;

    this.max_duration = d3.max($this.data.sequences, function(sequence){
        var end = timeToSec(sequence.endTime);
        var start = timeToSec(sequence.actions[0].time);
        return end-start;
    });

    //go to the upper minute
    this.max_duration = Math.ceil(this.max_duration/60)*60;

    var tickStep = 30;//in seconds
    var tMin = 0;
    var tMax = this.max_duration;
    this.x_scale = d3.scale.linear().domain([tMin,tMax]).range([margin,this.w-margin]);

    this.visSVG = this.svg.insert("g",".timeline")
        .attr("class", "timeline")
        .attr("transform","translate("+this.posX+","+this.posY+")");

    //the axis
    this.axis = this.visSVG
        .append("g")
        .attr("transform", "translate("+this.x_scale(0)+","+labelH+")")
        .attr("class", "timelineAxis unselectable");

    this.axis.append("rect")
        .attr("width", this.x_scale.range()[1]-this.x_scale.range()[0])
        .attr("height", this.axisH);


    //the tick values
    var tickValues = [];
    for(var m=0;m<=tMax;m+=tickStep){
        tickValues.push(m);
    }

    var timeTicks = this.visSVG.append("g")
        .attr("class", "timeTicks unselectable")
        .attr("transform", "translate("+0+","+(labelH+this.axisH)+")")
        .call(
        d3.svg.axis()
            .orient("top")
            .scale(this.x_scale)
            .tickSize(this.axisH+5)
            .tickFormat(function(d){return Math.floor(d/60)+":"+d%60})
            .tickValues(tickValues)
    );
};

SequenceInfos.prototype.showSeq = function(sid){
    //console.log("show infos");
    this.createSequence(sid);
};

SequenceInfos.prototype.hideSeq = function(sid){
    //console.log("hide infos");
    d3.select("#svg1").select(".eventsGroup").selectAll(".timelineInfosEvents")
        .each(function(d){
            d.vid = undefined;
        });
    d3.select("#svg1").select(".eventsGroup").remove();
    this.triangleSVG.remove();
};

SequenceInfos.prototype.createSequence = function(sid){
    var $this = this;
    var sequence = this.data.sequences[sid];

    //console.log("sequence",sequence);

    //triangle: top: the last event on timeline. Basis: all the events points of the sequence
    this.triangle = {top: null, left: null, right: null};

    //get the top point of the triangle, i.e. the transform of the last event of sequence on timeline
    d3.select("#svg1").select(".lastEvent[sid='"+sid+"']")
        .each(function(d){
            $this.triangle.top = d3.transform(d3.select(this).attr("transform")).translate;
        });

    var events_data = [],
        sequence_duration = timeToSec(sequence.endTime)-timeToSec(sequence.actions[0].time);

    var eventsGroup = this.visSVG.append("g")
        .attr("class", "eventsGroup")
        .attr("transform",function(){
            var axisT = d3.transform($this.axis.attr("transform"));
            return "translate("+axisT.translate[0]+","+(parseInt(axisT.translate[1])+$this.axisH/2)+")"
        });

    d3.selectAll(".thumb_node[sid='"+sid+"']")
        .each(function(event,i){
            events_data[i] = event;
        });

    var seq_end_seconds = timeToSec(sequence.endTime);

    var trVis = d3.transform(this.visSVG.attr("transform")).translate;
    var trEventsGroup = d3.transform(d3.select("#svg1").select(".eventsGroup").attr("transform")).translate;

    var eventsSVG = eventsGroup.selectAll(".timelineInfosEvents")
        .data(events_data)
        .enter()
        .append("g")
        .attr("class", "timelineInfosEvents")
        .attr("sid", function(d){return d.sid})
        .style("opacity",0)
        .attr("transform", function(d){
            var tr = "translate("+$this.x_scale(sequence_duration-(seq_end_seconds-timeToSec(d.time)))+","+0+")";
            if(d.index==0) {
                var tr = d3.transform(tr).translate;
                $this.triangle.right = [tr[0]+trEventsGroup[0]+trVis[0],tr[1]+trEventsGroup[1]+trVis[1]-$this.axisH/2];
                $this.triangle.left = $this.triangle.right;
            }
            return tr;
        });

    eventsSVG
        .append("rect")
        .attr("x",-this.event_width/2)
        .attr("y",-this.axisH/2)
        .attr("width",this.event_width)
        .attr("height",this.axisH)
        .attr("class", function(d){return getEventName(d.eid)});

    this.triangleSVG = d3.select("#svg1")
        .insert("path",".timeline")
        .attr("class", "timelineTriangle")
        .attr("d", $this.getTriangle(
            [
                $this.triangle.top,
                $this.triangle.left,
                $this.triangle.right
            ])
        );


};

SequenceInfos.prototype.showEvent = function(event,duration){
    var $this = this;
    var trVis = d3.transform(this.visSVG.attr("transform")).translate;
    var trEventsGroup = d3.transform(d3.select("#svg1").select(".eventsGroup").attr("transform")).translate;
    d3.select("#svg1").selectAll(".timelineInfosEvents[sid='"+ event.sid+"']")
        .filter(function(d){
            if(event.index == d.index){
                var tr = d3.transform(d3.select(this).attr("transform")).translate;
                $this.triangle.right = [tr[0]+trEventsGroup[0]+trVis[0],tr[1]+trEventsGroup[1]+trVis[1]-$this.axisH/2];
                $this.updateTriangle(duration);
                return true;
            }
        })
        .transition()
        .duration(duration)
        .style("opacity",1);
};

SequenceInfos.prototype.hideEvent = function(event,duration){
    var $this = this;
    var trVis = d3.transform(this.visSVG.attr("transform")).translate;
    var trEventsGroup = d3.transform(d3.select("#svg1").select(".eventsGroup").attr("transform")).translate;
    d3.select("#svg1").selectAll(".timelineInfosEvents[sid='"+ event.sid+"']")
        .filter(function(d){
            if(event.index+1 == d.index){
                var tr = d3.transform(d3.select(this).attr("transform")).translate;
                $this.triangle.left = [tr[0]+trEventsGroup[0]+trVis[0],tr[1]+trEventsGroup[1]+trVis[1]-$this.axisH/2];
                $this.updateTriangle(duration);
            }
            return event.index == d.index;
        })
        .transition()
        .duration(duration)
        .style("opacity",0);
};


SequenceInfos.prototype.updateTriangle = function(duration){
    //console.log("updateTriangle",this.triangle);
    var $this = this;
    if(this.triangle.top == null || this.triangle.left == null || this.triangle.right == null) return "";

    this.triangleSVG
        .transition()
        .duration(duration)
        .attr("d", function(){
            return $this.getTriangle(
                [
                    $this.triangle.top,
                    $this.triangle.left,
                    $this.triangle.right
                ]);
        });
};


SequenceInfos.prototype.getTriangle = function(pts){
    //console.log("getTriangle",JSON.stringify(pts));
    if(pts.length!=3) throw "triangle must have 3 pts: "+pts;
    return "M"+pts[0][0]+","+pts[0][1]+" "
        +"L"+pts[1][0]+","+pts[1][1]+" "
        +"L"+pts[2][0]+","+pts[2][1]+" "
        +"Z";
};

SequenceInfos.prototype.createCluster = function(nodes,vid,type,duration){
    //console.log("create",nodes,vid,type);

    var xPts = [];
    d3.select("#svg1").select(".eventsGroup").selectAll(".timelineInfosEvents")
        .filter(function(d){
            return nodes.indexOf(d.index)!=-1;
        })
        .each(function(d){
            d.vid = vid;
            xPts.push(d3.transform(d3.select(this).attr("transform")).translate[0]);
        });

    var xMax = d3.max(xPts),
        xMin = d3.min(xPts);

    //console.log("create",xPts,xMin,xMax);

    d3.select(".eventsGroup")
        .append("rect")
        .attr("x",xMin)
        .attr("y",this.axisH/2)
        .attr("width",xMax-xMin)
        .attr("height",this.axisH)
        .style("fill", getColorFromSubChainType(type))
        .attr("class","cluster")
        .style("opacity",.5)
        .attr("vid",vid)
        .on("click", function(d){clickCluster(d)});

    function clickCluster(d){
        catchEvent();
        console.log("click cluster",d);
    }
};




//var THUMBNAIL_MODE = "line";
var THUMBNAIL_MODE = "scaled";


TimelineVis = function(_data, svg, x, y, w, h, thumb_height_max){
    this.data = _data;
    this.posX=x;
    this.posY=y;
    this.w=w;
    this.h=h;
    this.svg=svg;
    this.thumb_height_max = thumb_height_max;

    this.thumbnailMode = THUMBNAIL_MODE;

    this.init();

    if(SHOW_SEQUENCE_INFOS)this.seq_infos = new SequenceInfos(_data, svg, x, y+h/2, w, h/2);
};

TimelineVis.prototype.init = function(){
    var margin = 10,
        labelH = 20;

    this.fade_in_out_duration = 500;
    this.last_event_duration = 30;
    this.last_event_radius = 5;
    this.axisH = 10;

    var tickStep = 15;//in minutes
    this.halfPeriodInSec = tickStep*60;
    var tMin = 0;
    var tMax = timeToSec(this.data.matchInfos.endTime);
    this.x_scale = d3.scale.linear().domain([tMin,tMax+this.halfPeriodInSec]).range([margin,this.w-margin]);

    this.visSVG = this.svg.append("g")
        .attr("class", "timeline")
        .attr("transform","translate("+this.posX+","+this.posY+")");

    //the axis
    this.axis = this.visSVG
        .append("g")
        .attr("transform", "translate("+this.x_scale(0)+","+labelH+")")
        .attr("class", "timelineAxis unselectable");

    this.axis.append("rect")
        .attr("width", this.x_scale(tMax+this.halfPeriodInSec)-this.x_scale(0))
        .attr("height", this.axisH);


    //the tick values
    var tickValues = [];
    for(var m=0;m<=tickStep+tMax/60;m+=tickStep){
        tickValues.push(m*60);
        var val = (tickStep+m)*60;
        if(val <= tMax) tickValues.push(val);
    }

    var timeTicks = this.visSVG.append("g")
        .attr("class", "timeTicks unselectable")
        .attr("transform", "translate("+0+","+(labelH+this.axisH)+")")
        .call(
        d3.svg.axis()
            .orient("top")
            .scale(this.x_scale)
            .tickSize(this.axisH+5)
            .tickFormat(function(d){return (d<=45*60) ? parseInt(d/60) : parseInt(d/60-tickStep)})
            .tickValues(tickValues)
    );
};

TimelineVis.prototype.convertTimeToAxisScale = function(time){
    var t = time.sec + time.min * 60;
    if(time.period == 2){
        t+=this.halfPeriodInSec;
    }
    return t;
};

TimelineVis.prototype.createSequences = function(){
    var $this = this;
    var sequences = this.data.sequences;

    var thumbMargin = 15,
        thumbWidth,
        y_scale_thumb,
        thumb_node_data = [];

    var sequencesGroup = this.visSVG.append("g")
        .attr("class", "sequencesGroup")
        .attr("transform",function(){
            var axisT = d3.transform($this.axis.attr("transform"));
            return "translate("+axisT.translate[0]+","+(parseInt(axisT.translate[1])+$this.axisH/2)+")"
        });

    var seq_data = sequences.map(function(s,i){
        var duration = timeToSec(s.endTime)-timeToSec(s.actions[0].time);
        return {
            sid: i,
            time: $this.convertTimeToAxisScale(s.endTime),
            duration: duration,
            endTime: timeToSec(s.endTime)
        }
    });

    var sequencesSVG = sequencesGroup.selectAll(".timelineSequence")
        .data(seq_data)
        .enter()
        .append("g")
        .attr("class", "timelineSequence")
        .attr("sid", function(d){return d.sid})
        .attr("transform", function(d){
            return "translate("+$this.x_scale(d.time)+","+0+")";
        });

    var tVisSVG = d3.transform(this.visSVG.attr("transform")).translate;
    var tSequencesGroup = d3.transform(sequencesGroup.attr("transform")).translate;

    var last_events = d3.select("#svg1").selectAll(".lastEvent")
        .data(seq_data)
        .enter()
        .append("g")
        .attr("class", "lastEvent")
        .attr("sid", function(d){return d.sid})
        .attr("transform", function(d){
            var tSequence = undefined;
            d3.select(".timelineSequence[sid='"+ d.sid +"']").each(function(){
                tSequence = d3.transform(d3.select(this).attr("transform")).translate;
            });
            var tx = tVisSVG[0]+tSequencesGroup[0]+tSequence[0];
            var ty = tVisSVG[1]+tSequencesGroup[1]+tSequence[1];
            return "translate("+tx+","+ty+")";
        })
        .on("mouseover", function(d){$this.overSequence(d.sid)})
        .on("mouseout", function(d){$this.exitSequence(d.sid)})
        .on("click", function(d){$this.clickSequence(d.sid)});

    last_events
        .append("circle")
        .attr("r",this.last_event_radius)
        .style("fill", function(d){
            return getColorFromShotEvent($this.data.sequences[d.sid].outcome);
        });


    /*-----------------------------------------------
     Line Thumbnails
     -----------------------------------------------*/
    if(this.thumbnailMode == "line"){
        thumbWidth = 10;

        var longestSequenceSec = d3.max(sequences, function(sequence){
            var end = timeToSec(sequence.endTime);
            var start = timeToSec(sequence.actions[0].time);
            return end-start;
        });

        y_scale_thumb = d3.scale.linear().domain([0,longestSequenceSec]).range([0,this.thumb_height_max]);


        var thumbnailsLine = sequencesSVG.append("g")
            .style("opacity",0)
            .attr("class", "thumbnail")
            .attr("sid", function(d){return d.sid})
            .attr("transform", "translate(0,"+($this.axisH/2+thumbMargin)+")");


        thumbnailsLine.append("rect")
            .attr("width", thumbWidth)
            .attr("x", -thumbWidth/2)
            .attr("height", function(d){
                return y_scale_thumb(d.duration);
            });

        sequences.forEach(function(sequence){
            //console.log(sequence);
            var endTime = timeToSec(sequence.endTime);
            sequence.nodes.forEach(function(node){

                var trThumbnail;
                var timeDiff = endTime - timeToSec(node.time);

                var tSequence = undefined, tThumbnail = undefined;
                d3.select(".timelineSequence[sid='"+ sequence.sid +"']").each(function(){
                    tSequence = d3.transform(d3.select(this).attr("transform")).translate;
                    tThumbnail = d3.transform(d3.select(this).select(".thumbnail").attr("transform")).translate;
                });
                var tx = tVisSVG[0]+tSequencesGroup[0]+tSequence[0]+tThumbnail[0];
                var ty = tVisSVG[1]+tSequencesGroup[1]+tSequence[1]+tThumbnail[1];
                var transform = "translate("+tx+","+(ty+y_scale_thumb(timeDiff))+")";
                trThumbnail = d3.transform(transform);

                thumb_node_data.push({
                    index: node.index,
                    sid: sequence.sid,
                    unique_id: node.unique_id,
                    timeDiff: timeDiff,
                    eid: node.eid,
                    trThumbnail: trThumbnail
                });
            });
        });
    }

    /*-----------------------------------------------
     Scaled Thumbnails
     -----------------------------------------------*/
    else if(this.thumbnailMode == "scaled"){

        var svgWidth = parseInt(d3.select("#svg1").attr("width"));
        thumbWidth = 150;
        var thumbHeight = thumbWidth/1.5;

        var x_scale_thumb = d3.scale.linear().domain([0,100]).range([0,thumbWidth]).clamp(true);
        y_scale_thumb = d3.scale.linear().domain([0,100]).range([thumbHeight,0]).clamp(true);

        var thumbnailsScaled = sequencesSVG.append("g")
            .style("opacity",0)
            .attr("class", "thumbnail field")
            .attr("sid", function(d){return d.sid})
            .attr("transform", function(d){
                //check if need to move the thumbnail for it to stay in the svg
                var xSequence = undefined;
                d3.select(".timelineSequence[sid='"+ d.sid +"']").each(function(){
                    xSequence = d3.transform(d3.select(this).attr("transform")).translate[0];
                });
                var x = tVisSVG[0]+tSequencesGroup[0]+xSequence;
                var dx = 0;
                if(x-thumbWidth/2<0) dx = -(x-thumbWidth/2);
                if(x+thumbWidth/2>svgWidth) dx = svgWidth-(x+thumbWidth/2);

                return "translate("+(-thumbWidth/2+dx)+","+($this.axisH/2+thumbMargin)+")";
            });

        thumbnailsScaled.append("rect")
            .attr("width", thumbWidth)
            .attr("height", thumbHeight);

        function drawField(thumbnail){
            var thumbSVG = d3.select(thumbnail);

            //the field rect
            drawFieldRect(0, 0, 1, 1, true);
            //central circle
            drawFieldCircle(0.5, 0.5, 0.18);
            //central point
            drawFieldCircle(0.5, 0.5, 0.01, true);
            //central line
            drawFieldLine(0.5, 0, 0.5, 1);
            //right circle
            drawFieldCircle(0.9, 0.5, 0.14);
            //left circle
            drawFieldCircle(0.1, 0.5, 0.14);
            //right big rect
            drawFieldRect(0.848, 0.191, 0.15, 0.615, true);
            //left big rect
            drawFieldRect(0.002, 0.191, 0.15, 0.615, true);
            //right small rect
            drawFieldRect(0.95, 0.36, 0.05, 0.28);
            //left small rect
            drawFieldRect(0, 0.36, 0.05, 0.28);
            //right penalty point
            drawFieldCircle(0.9, 0.5, 0.004, true);
            //left penalty point
            drawFieldCircle(0.1, 0.5, 0.004, true);


            function drawFieldRect(x, y, width, height, isFilled){
                var c = isFilled ? "fieldRect" : "fieldLines";
                thumbSVG.append("rect")
                    .attr("class", c)
                    .attr("x", distXOnField(x))
                    .attr("y", distYOnField(y))
                    .attr("width", distXOnField(width))
                    .attr("height", distYOnField(height));
            }
            //noinspection JSUnusedLocalSymbols
            function drawFieldHalfCircle(x, y, r, isFilled){
                var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
                thumbSVG.append("svg:path")
                    .attr("class", c)
                    .attr("d",
                    "M "+distXOnField(x)+" "+distYOnField(y)+" "+
                        "m 0 "+distXOnField(r)+" "+
                        "a "+distXOnField(r)+","+distXOnField(r)+" 0 1,0 "+(0)+","+(-distXOnField(r)*2)
                );
            }
            function drawFieldCircle(x, y, r, isFilled){
                var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
                thumbSVG.append("circle")
                    .attr("class", c)
                    .attr("cx", distXOnField(x))
                    .attr("cy", distYOnField(y))
                    .attr("r", distYOnField(r));
            }
            function drawFieldLine(x1, y1, x2, y2){
                thumbSVG.append("line")
                    .attr("class", "fieldLines")
                    .attr("x1", distXOnField(x1))
                    .attr("y1", distYOnField(y1))
                    .attr("x2", distXOnField(x2))
                    .attr("y2", distYOnField(y2));
            }
            function distYOnField(y){
                return y*thumbHeight;
            }
            function distXOnField(x){
                return x*thumbWidth;
            }
        }

        //draw field
        thumbnailsScaled.each(function(){
            drawField(this);
        });

        sequences.forEach(function(sequence){
            //console.log(sequence);
            sequence.nodes.forEach(function(node){
                var trThumbnail;
                var tSequence = undefined, tThumbnail = undefined;
                d3.select(".timelineSequence[sid='"+ sequence.sid +"']").each(function(){
                    tSequence = d3.transform(d3.select(this).attr("transform")).translate;
                    tThumbnail = d3.transform(d3.select(this).select(".thumbnail").attr("transform")).translate;
                });
                var tx = tVisSVG[0]+tSequencesGroup[0]+tSequence[0]+tThumbnail[0];
                var ty = tVisSVG[1]+tSequencesGroup[1]+tSequence[1]+tThumbnail[1];
                var transform = "translate("+(tx+x_scale_thumb(node.x))+","+(ty+y_scale_thumb(node.y))+")";
                trThumbnail = d3.transform(transform);

                thumb_node_data.push({
                    index: node.index,
                    sid: sequence.sid,
                    unique_id: node.unique_id,
                    eid: node.eid,
                    time: node.time,
                    pid: node.pid,
                    x: node.x,
                    y: node.y,
                    trThumbnail: trThumbnail
                });
            });
        });
    }
    else throw "invalid thumbnail mode "+this.thumbnailMode;






    //console.log(thumb_node_data);

    var thumb_nodes = d3.select("#svg1").selectAll(".thumb_node")
        .data(thumb_node_data)
        .enter()
        .append("g")
        .attr("class","thumb_node")
        .style("opacity",0)
        .attr("sid", function(d){return d.sid})
        .attr("transform", function(d){
            return d.trThumbnail.toString();
        });

    thumb_nodes
        .append("circle")
        .attr("class", function(d){
            return getEventName(d.eid);
        })
        .attr("r",2);

    /*
     Put the last events on the front of the svg
     */
    d3.select("#svg1").selectAll(".lastEvent").each(function(){
        var sel = d3.select(this);
        sel.moveToFront();
    });
};


TimelineVis.prototype.clickSequence = function(sid){
    catchEvent();
    d3.select(".lastEvent[sid='"+sid+"']")
        .each(function(d){
            d.animating = true;
        });
    this.data.selectSequence(sid);
};
TimelineVis.prototype.overSequence = function(sid){
    var $this = this;
    d3.select(".lastEvent[sid='"+sid+"']")
        .each(function(d){
            if(!d.animating){
                d3.select(this).select("circle")
                    .transition()
                    .duration($this.last_event_duration)
                    .attr("r",$this.last_event_radius*1.5);

                d3.select("#svg1").selectAll(".thumb_node[sid='"+ sid +"'],.thumbnail[sid='"+ sid +"'],.thumb_link[sid='"+ sid +"']")
                    .transition()
                    .duration($this.fade_in_out_duration)
                    .style("opacity",1);

                $this.data.sequencesVis.overSequence(sid);
            }
        });
};
TimelineVis.prototype.exitSequence = function(sid){
    var $this = this;
    d3.select(".lastEvent[sid='"+sid+"']")
        .each(function(d){
            if(!d.animating){
                d3.select(this).select("circle")
                    .transition()
                    .duration($this.last_event_duration)
                    .attr("r",$this.last_event_radius);

                d3.select("#svg1").selectAll(".thumb_node[sid='"+ sid +"'],.thumbnail[sid='"+ sid +"'],.thumb_link[sid='"+ sid +"']")
                    .transition()
                    .duration($this.fade_in_out_duration)
                    .style("opacity",0);

                $this.data.sequencesVis.exitSequence(sid);
            }
        });
};


TimelineVis.prototype.sequenceAnimationDone = function(sid){
    var $this = this;

    //console.log("animation done for "+sid);

    d3.select("#svg1").selectAll(".lastEvent[sid='"+sid+"'] circle")
        .transition()
        .duration($this.last_event_duration)
        .attr("r",$this.last_event_radius)
        .each(function(d){d.animating = false;});

    d3.select("#svg1").selectAll(".thumb_node[sid='"+ sid +"'],.thumbnail[sid='"+ sid +"']")
        .transition()
        .duration($this.fade_in_out_duration)
        .style("opacity",0);

    $this.data.sequencesVis.exitSequence(sid);
};


/*
 type can be "entry" or "exit"
 */
TimelineVis.prototype.connectNodeToLastEvent = function(node,type,animate_duration,callback){
    /*
     var $this = this;
     var sid = this.data.sequences.indexOf(this.data.selected_sequence);

     var tLastEvent,tNode;
     var tField = d3.transform(d3.select("g.field").attr("transform")).translate;
     d3.select(".lastEvent[sid='"+sid+"']").each(function(d){
     tLastEvent = d3.transform(d3.select(this).attr("transform")).translate;
     });


     d3.select(node).each(function(d){
     tNode = d3.transform(d3.select(this).attr("transform")).translate;
     });

     tNode[0] += tField[0];
     tNode[1] += tField[1];

     var link = d3.select("#svg1")
     .append("path")
     .attr("class","timelineLink")
     .attr("type",type)
     .attr("d", function(){
     switch(type){
     case "entry":
     return line($this.getDefaultLine(tLastEvent[0],tLastEvent[1]))
     case "exit":
     return line($this.getDefaultLine(tNode[0],tNode[1]))
     default: throw "invalid type "+type;
     }
     });

     link.transition()
     .duration(animate_duration)
     .attr("d", function(d){
     return line($this.getTimelineLinkCoords(tLastEvent,tNode,type));
     })
     .each("end", function(){callback.call()});
     */


    callback.call();
};

TimelineVis.prototype.unconnectNodeToLastEvent = function(type,animate_duration,callback){
    /*
     var $this = this;
     var sid = this.data.sequences.indexOf(this.data.selected_sequence);

     var tLastEvent;
     d3.select(".lastEvent[sid='"+sid+"']").each(function(){
     tLastEvent = d3.transform(d3.select(this).attr("transform")).translate;
     });

     d3.select("#svg1").select(".timelineLink[type='"+type+"']")
     .transition()
     .duration(animate_duration)
     .attr("d", function(){
     return line($this.getDefaultLine(tLastEvent[0],tLastEvent[1]));
     })
     .each("end", function(){callback.call()});;

     */
    callback.call();
};


/*
 type can be "entry" or "exit"
 */
//noinspection JSUnusedGlobalSymbols
TimelineVis.prototype.getTimelineLinkCoords = function(tNodeTimeline, tNode, type){

    var yDist = Math.abs(tNodeTimeline[1]-tNode[1])/ 2;
    var xDiff = undefined;
    switch(type){
        case "entry":
            xDiff = tNodeTimeline[0] - tNode[0];
            if(xDiff<0){//timeline node before node
                return [
                    {x: tNodeTimeline[0], y: tNodeTimeline[1]},
                    {x: tNodeTimeline[0], y: tNodeTimeline[1]+yDist},
                    {x: tNode[0]+xDiff, y: tNode[1]},
                    {x: tNode[0], y: tNode[1]}
                ];
            }

            return [
                {x: tNodeTimeline[0], y: tNodeTimeline[1]},
                {x: tNodeTimeline[0], y: tNodeTimeline[1]+yDist},
                {x: tNode[0], y: tNode[1]-yDist},
                {x: tNode[0], y: tNode[1]}
            ];

        case "exit":
            xDiff = tNodeTimeline[0] - tNode[0];
            if(xDiff>0){//timeline node after node
                return [
                    {x: tNode[0], y: tNode[1]},
                    {x: tNode[0]+xDiff, y: tNode[1]},
                    {x: tNodeTimeline[0], y: tNodeTimeline[1]+yDist},
                    {x: tNodeTimeline[0], y: tNodeTimeline[1]}
                ];
            }

            return [
                {x: tNode[0], y: tNode[1]},
                {x: tNode[0], y: tNode[1]-yDist},
                {x: tNodeTimeline[0], y: tNodeTimeline[1]+yDist},
                {x: tNodeTimeline[0], y: tNodeTimeline[1]}
            ];

        default: throw "invalid type "+type;
    }

};


//noinspection JSUnusedGlobalSymbols
TimelineVis.prototype.getDefaultLine = function(x,y){
    return [
        {x: x, y: y},
        {x: x, y: y},
        {x: x, y: y},
        {x: x, y: y}
    ];
};

























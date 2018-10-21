/*
 Sequences vis handler to visually browse and compare all the sequences of the game
 */

SequencesVis = function(_data,svg,x,y,w,h){
    this.data = _data;
    this.posX=x;
    this.posY=y;
    this.w=w;
    this.h=h;
    this.svg=svg;
    this.overedSequence = undefined;
    this.selectedSequence = undefined;
    this.init();
};


SequencesVis.prototype.init = function(){

    this.visSVG = this.svg.append("g")
        .attr("class", "sequencesVis")
        .attr("transform","translate("+this.posX+","+this.posY+")");

    this.visSVG.append("rect")
        .style("fill","white")
        .style("stroke-width",.5)
        .style("stroke","black")
        .attr("width", this.w)
        .attr("height", this.h);

};

SequencesVis.prototype.setDrawField = function(draw){
    this.drawField = draw;
    this.visSVG.selectAll(".fieldLines,.fieldRect,.fieldPoints")
        .style("opacity",this.drawField ? 1 : 0);
};

var SM_2D = ["Scaled","ScaledLinks","Signature","Worm"];
var SM_1D = ["TimeAlign","DistAlign"];
var SM_HISTO = ["XProj","YProj"];

SequencesVis.prototype.setThumbnailsMode = function(tm,duration,delay){
    //console.log("set thumbnail mode to "+tm);
    var $this = this;
    var oldTm = this.thumbnailsMode;
    this.thumbnailsMode = tm;

    //if same layout (1D or 2D for both)
    if(SM_2D.indexOf(oldTm) !=-1 && SM_2D.indexOf(tm) != -1
        || SM_HISTO.indexOf(oldTm) !=-1 && SM_HISTO.indexOf(tm) != -1
        || SM_2D.indexOf(oldTm) !=-1 && SM_HISTO.indexOf(tm) != -1
        || SM_HISTO.indexOf(oldTm) !=-1 && SM_2D.indexOf(tm) != -1
        || SM_1D.indexOf(oldTm) !=-1 && SM_1D.indexOf(tm) != -1){
        doOldModeHideContext(function(){
            doNewModeNodesTransition(function(){
                //then apply new style to nodes
                doNewNodeStyles(function(){
                    //finaly fade in the context of the visu (e.g., field for Scaled mode)
                    doNewModeShowContext(function(){
                        //console.log("---global transition done---");
                        //show selected the selected sequence, if exist
                        if($this.selectedSequence != undefined){
                            $this.selectSequence($this.selectedSequence,true);
                        }
                    });
                });
            });
        });
    }
    //if 1D vs 2D
    else{
        //1 - first, fadeout the context of the sequences
        doOldModeHideContext(function(){
            //then stylise the nodes for the temporary state
            doTemporaryNodeStyles(function(){
                //then Align the nodes in the temporary state
                doTemporaryTransition(function(){
                    //then do the transition for nodes
                    doNewModeNodesTransition(function(){
                        //then apply new style to nodes
                        doNewNodeStyles(function(){
                            //finaly fade in the context of the visu (e.g., field for Scaled mode)
                            doNewModeShowContext(function(){
                                //console.log("---global transition done---");
                                //show selected the selected sequence, if exist
                                if($this.selectedSequence != undefined){
                                    $this.selectSequence($this.selectedSequence,true);
                                }
                            });
                        });
                    });
                });
            });
        });
    }


    function doTemporaryNodeStyles(callback){
        var okNodes = getFalseArray($this.thumb_node_data);

        $this.visSVG.selectAll(".sequenceVisNode circle")
            .transition()
            .duration(duration)
            .delay(delay)
            .style("stroke-width",0)
            .style("fill",function(d){return getEventColor(d.eid)})
            .attr("r",$this.modesParams.Temporary.nodeRadius)
            .each("end", function(d,i){
                okNodes[i] = true;
                if(checkTrueArray(okNodes)) callback.call();
            });
    }

    function doNewNodeStyles(callback){
        var okNodes = getFalseArray($this.thumb_node_data);

        if(tm == "Signature"){
            //first group the grouped nodes at the position of the icon
            styleNodes(function(){
                groupNodesForWorm(function(){
                    growNodes(function(){
                        callback.call();
                    });
                });
            });

            function styleNodes(callback){
                var okNodes2 = getFalseArray($this.thumb_node_data);

                $this.visSVG.selectAll(".sequenceVisNode circle")
                    .transition()
                    .duration(duration)
                    .delay(function(d,i){return i*delay})
                    .style("fill", function(d){
                        return getVisColor(d.vis.type, d.eid);
                    })
                    //.style("stroke-width",.5)
                    //.style("stroke","black")
                    .each("end", function(d,i){
                        okNodes2[i] = true;
                        if(checkTrueArray(okNodes2)) callback.call();
                    });
            }

            //then grow the nodes depending on group size
            function growNodes(callback){
                var okNodes2 = getFalseArray($this.thumb_node_data);

                $this.visSVG.selectAll(".sequenceVisNode circle")
                    .transition()
                    .duration(duration)
                    .delay(function(d,i){return i*delay})
                    .attr("r", function(d){
                        return Math.log(d.vis.nodes.length*10);
                    })
                    .each("end", function(d,i){
                        okNodes2[i] = true;
                        if(checkTrueArray(okNodes2)) callback.call();
                    });
            }
        }
        else if(tm == "Worm"){
            groupNodesForWorm(function(){
                //fade out the nodes
                $this.visSVG.selectAll(".sequenceVisNode")
                    .transition()
                    .duration(duration)
                    .style("opacity", 0);
                callback.call();
            });
        }
        else if(tm == "ScaledLinks"){

            //show the links
            var data = $this.thumb_link_data.map(function(link){
                var source = undefined, target = undefined, sid = link.sid;
                for(var n in $this.thumb_node_data){
                    var node = $this.thumb_node_data[n];
                    if(node.sid == link.sid){
                        if(node.index == link.source){
                            source = node;
                        }
                        else if(node.index == link.target){
                            target = node;
                        }
                    }
                    if(source != undefined && target != undefined){
                        break;
                    }
                }

                if(source == undefined || target == undefined) return;
                return {
                    x1: source.translates[tm][0],
                    y1: source.translates[tm][1],
                    x2: target.translates[tm][0],
                    y2: target.translates[tm][1],
                    eid: link.eid
                };
            }).filter(function(link){
                    return link != undefined;
                });

            $this.visSVG.selectAll(".sequenceVisLink")
                .data(data)
                .enter()
                .append("line")
                .attr("class","sequenceVisLink")
                .style("stroke",function(d){
                    return getEventColor(d.eid);
                })
                .style("stroke-width",1)
                .style("opacity",1)
                .attr("x1",function(d){
                    return d.x1;
                })
                .attr("y1",function(d){
                    return d.y1;
                })
                .attr("x2",function(d){
                    return d.x2;
                })
                .attr("y2",function(d){
                    return d.y2;
                });


            //stylise the nodes and add the links
            $this.visSVG.selectAll(".sequenceVisNode circle")
                .transition()
                .duration(duration)
                .delay(delay)
                .style("stroke-width",0)
                .style("fill", function(d){
                    return getEventColor(d.eid);
                })
                .attr("r",$this.modesParams[tm].nodeRadius)
                .each("end", function(d,i){
                    okNodes[i] = true;
                    if(checkTrueArray(okNodes)) callback.call();
                });
        }
        else if(tm=="XProj"){
            callback.call();
        }
        else if(tm=="YProj"){
            callback.call();
        }

        else{
            $this.visSVG.selectAll(".sequenceVisNode circle")
                .transition()
                .duration(duration)
                .delay(delay)
                .style("stroke-width",0)
                .style("fill", function(d){
                    switch(tm){
                        case "TimeAlign":
                        case "DistanceAlign":
                        case "Scaled":
                        case "ScaledLinks":
                            return getEventColor(d.eid);
                        case "Donut":
                            return $this.modesParams[tm].sequenceColors(d.sid);
                            break;

                        default: throw "unknown thumbnailsMode "+tm;
                    }
                })
                .attr("r",$this.modesParams[tm].nodeRadius)
                .each("end", function(d,i){
                    okNodes[i] = true;
                    if(checkTrueArray(okNodes)) callback.call();
                });
        }
    }

    function groupNodesForWorm(callback){
        var okNodes2 = getFalseArray($this.thumb_node_data);

        $this.visSVG.selectAll(".sequenceVisNode")
            .transition()
            .duration(duration)
            .delay(function(d,i){return i*delay})
            .attr("transform", function(d){
                return "translate("+d.translates.Vis+")";
            })
            .each("end", function(d,i){
                okNodes2[i] = true;
                if(checkTrueArray(okNodes2)) callback.call();
            });
    }

    function doTemporaryTransition(callback){
        var okNodes = getFalseArray($this.thumb_node_data);

        $this.visSVG.selectAll(".sequenceVisNode")
            .transition()
            .duration(duration)
            .delay(function(d,i){return i*delay})
            .attr("transform", function(d){
                return "translate("+d.translates.Temporary+")";
            })
            .each("end", function(d,i){
                okNodes[i] = true;
                if(checkTrueArray(okNodes)) callback.call();
            });
    }


    function doNewModeNodesTransition(callback){
        var okNodes = getFalseArray($this.thumb_node_data);

        if(SM_HISTO.indexOf(tm) == -1){
            $this.visSVG.selectAll(".sequenceVisNode")
                .transition()
                .duration(duration)
                .delay(function(d,i){return i*delay})
                .attr("transform", function(d){
                    return "translate("+d.translates[tm]+")";
                })
                .each("end", function(d,i){
                    okNodes[i] = true;
                    if(checkTrueArray(okNodes)) callback.call();
                });
        }
        else{//if histo mode
            var okHistos = undefined;
            //move and fadeout the nodes
            $this.visSVG.selectAll(".sequenceVisNode")
                .transition()
                .duration(duration)
                .delay(function(d,i){return i*delay})
                .attr("transform", function(d){
                    return "translate("+d.translates[tm]+")";
                })
                .each("end", function(d,i){
                    okNodes[i] = true;
                    showHistos();
                });

            function showHistos(){
                if(checkTrueArray(okNodes)){
                    if(tm == "XProj"){
                        okHistos = getFalseArray($this.histos_data_x);
                        var x_scale = $this.modesParams.XProj.x_distrib_scale;
                        var y_scale = $this.modesParams.XProj.y_scale_bars;

                        //create the histos
                        var histoGroups = $this.visSVG.selectAll(".sequenceVisHisto")
                            .data($this.histos_data_x)
                            .enter()
                            .append("g")
                            .attr("transform",function(d,i){
                                return "translate("+$this.data.sequences[i].translatesSequenceVis[tm]+")";
                            });

                        var histoBars = histoGroups.selectAll(".sequenceVisHistoBar")
                            .data(function(d){
                                return d;
                            })
                            .enter()
                            .append("g")
                            .attr("class","sequenceVisHistoBar")
                            .attr("transform",function(d,i){
                                return "translate("+[x_scale(i),0]+")";
                            });

                        histoBars.append("rect")
                            .attr("x",x_scale.rangeBand() *.1)
                            .attr("width",x_scale.rangeBand() *.8)
                            .attr("height",function(d){
                                return y_scale(d);
                            })
                            .attr("rx",x_scale.rangeBand() *.2)
                            .attr("ry",x_scale.rangeBand() *.2)
                            .style("fill","none")
                            .style("fill","steelblue")
                            .style("fill-opacity",.3)
                            .style("stroke","steelblue");

                        histoBars.append("text")
                            .attr("x",x_scale.rangeBand() *.5)
                            .attr("text-anchor","middle")
                            .attr("y",10)
                            .text(function(d){return d});
                    }
                    else if(tm == "YProj"){
                        okHistos = getFalseArray($this.histos_data_y);
                        var y_scale = $this.modesParams.YProj.y_distrib_scale;
                        var x_scale = $this.modesParams.YProj.x_scale_bars;

                        //create the histos
                        var histoGroups = $this.visSVG.selectAll(".sequenceVisHisto")
                            .data($this.histos_data_y)
                            .enter()
                            .append("g")
                            .attr("transform",function(d,i){
                                return "translate("+$this.data.sequences[i].translatesSequenceVis[tm]+")";
                            });

                        var histoBars = histoGroups.selectAll(".sequenceVisHistoBar")
                            .data(function(d){
                                return d;
                            })
                            .enter()
                            .append("g")
                            .attr("class","sequenceVisHistoBar")
                            .attr("transform",function(d,i){
                                return "translate("+[0,y_scale(i)]+")";
                            });

                        histoBars.append("rect")
                            .attr("y",y_scale.rangeBand() *.1)
                            .attr("height",y_scale.rangeBand() *.8)
                            .attr("width",function(d){
                                return x_scale(d);
                            })
                            .attr("rx",y_scale.rangeBand() *.2)
                            .attr("ry",y_scale.rangeBand() *.2)
                            .style("fill","none")
                            .style("fill","steelblue")
                            .style("fill-opacity",.3)
                            .style("stroke","steelblue");
                    }
                    else throw "invalid tm: "+tm;

                    $this.visSVG.selectAll(".sequenceVisNode")
                        .transition()
                        .duration(duration)
                        .style("opacity",0);

                    callback.call();
                }
            }
        }
    }

    function doOldModeHideContext(callback){
        var okSequences = getFalseArray($this.data.sequences);
        $this.visSVG.selectAll(".sequenceVisLink,.sequenceVisHistoBar")
            .transition()
            .duration(duration)
            .style("opacity",0)
            .each("end",function(d){d3.select(this).remove()});

        //first fade out the context svg elements
        $this.visSVG.selectAll("g.sequenceVisSequence")
            .transition()
            .duration(duration)
            .delay(delay)
            .style("opacity",0)
            .each("end", function(d,i){
                d3.select(this).selectAll(".context").remove();
                okSequences[i] = true;
                if(checkTrueArray(okSequences)) callback.call();
            });

        $this.visSVG.selectAll(".sequenceVisNode")
            .transition()
            .duration(duration)
            .style("opacity",1);
    }

    function doNewModeShowContext(callback){
        var okSequences = getFalseArray($this.data.sequences);

        //first add the context svg elements
        var seqs = $this.visSVG.selectAll(".sequenceVisSequence");

        seqs.attr("transform", function(d){
            return "translate("+d.translatesSequenceVis[tm]+")";
        });

        switch(tm){
            case "Scaled":
            case "ScaledLinks":
            case "XProj":
            case "YProj":
                seqs.each(function(){
                    drawField(this);
                });
                seqs.append("rect")
                    .style("fill-opacity",0)
                    .style("fill","white")
                    .style("stroke-width",1)
                    .style("stroke","black")
                    .attr("class","context overlay")
                    .attr("width",$this.modesParams[tm].thumbWidth)
                    .attr("height",$this.modesParams[tm].thumbHeight);
                break;

            case "Signature":
            case "Worm":
                seqs.each(function(){
                    drawField(this);
                });

                var expe2 = false;
                var expe = false;
                //Params for expe SM
                var interpolations = [
                    "linear",
                    "step-before",
                    "cardinal"
                ];
                var colors = ["standard","outcome"];
                var sizes = [1,2,3,6];
                var indexes = [6,14,19];
                var indexes2 = [12,14,19];
                var color = colors[0],
                    interpolation = interpolations[2],
                    interpolation2 = "cardinal",
                    size = sizes[2],
                    size2 = 3;


                seqs.append("rect")
                    .style("fill-opacity",0)
                    .style("fill","white")
                    .style("stroke-width",1)
                    .style("stroke","black")
                    .attr("class","context overlay")
                    .attr("width",$this.modesParams[tm].thumbWidth)
                    .attr("height",$this.modesParams[tm].thumbHeight);

                //draw the globalflow
                seqs.append("path")
                    .attr("class", "context")
                    .style("fill","none")
                    .style("stroke",function(d,i){
                        if(!expe && !expe2) return "lightgray";
                        if(expe && indexes.indexOf(i)==-1) return "lightgray";
                        if(expe2){
                          if(indexes2.indexOf(i)==-1) return "lightgray";
                            return "black";
                        }
                        if(color=="standard") return "black";
                        return getColorFromShotEvent(d.outcome);
                    })
                    .style("stroke-width", function(){
                        if(expe) return size;
                        else if(expe2) return size2;
                        else return 8;
                    })
                    .attr("d", function(d){
                        var coords = [];
                        d.signatureGlobalFlow.forEach(function(pos,p){
                            coords[p] = {
                                x: $this.modesParams[tm].x_scale_thumb(pos.x),
                                y: $this.modesParams[tm].y_scale_thumb(pos.y)
                            }
                        });
                        if(expe) return getLine(interpolation)(coords);
                        else if(expe2) return getLine(interpolation2)(coords);
                            return getLine("cardinal")(coords);

                    });
                break;

            case "TimeAlign":
                seqs.append("rect")
                    .attr("class","context overlay")
                    .style("stroke-width",1)
                    .style("stroke","black")
                    .style("fill","white")
                    .attr("width",function(d){
                        return $this.modesParams[tm].x_scale_thumb(d.duration);
                    })
                    .attr("height",$this.modesParams[tm].thumbHeight);
                break;

            case "DistanceAlign":
                seqs.append("rect")
                    .attr("class","context overlay")
                    .style("stroke-width",1)
                    .style("stroke","black")
                    .style("fill","white")
                    .attr("x", function(d){
                        return $this.modesParams[tm].x_scale_thumb(d.totalDistance);
                    })
                    .attr("width",function(d){
                        return $this.modesParams[tm].thumbWidth - $this.modesParams[tm].x_scale_thumb(d.totalDistance);
                    })
                    .attr("height",$this.modesParams[tm].thumbHeight);
                break;

            case "Donut":
                seqs.each(function(seq){
                    var the_seq = this;
                    var trStart, trEnd, trCenter;
                    trCenter = $this.modesParams[tm].center;
                    $this.visSVG.selectAll(".sequenceVisNode").each(function(visNode){
                        if(seq.sid == visNode.sid){
                            if(visNode.index == 0){
                                trStart = visNode.translates[tm];
                                trOk();
                            }
                            else if(visNode.index == seq.nodes.length-2){
                                trEnd = visNode.translates[tm];
                                trOk();
                            }
                        }
                    });

                    function trOk(){
                        //console.log(trStart,trEnd);
                        if(trStart && trEnd){
                            d3.select(the_seq).append("path")
                                .attr("class","context overlay")
                                .style("stroke-width",1)
                                .style("stroke","black")
                                .style("fill","white")
                                .attr("d",function(){
                                    return getPie(trCenter, {x: trStart[0], y: trStart[1]}, {x: trEnd[0],y: trEnd[1]});
                                });
                        }
                    }
                });

                break;
            default: throw "unknown thumbnailsMode "+$this.thumbnailsMode;
        }

        seqs.transition()
            .duration(duration)
            .delay(delay)
            .style("opacity",1)
            .each("end", function(d,i){
                okSequences[i] = true;
                if(checkTrueArray(okSequences)) callback.call();
            });

        seqs.select(".overlay")
            .on("mouseover", function(d){
                $this.data.timeline.overSequence(d.sid);
            })
            .on("mouseout", function(d){
                $this.data.timeline.exitSequence(d.sid);
            })
            .on("click", function(d){
                $this.data.timeline.clickSequence(d.sid);
            });
    }


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
                .style("opacity",$this.drawField ? 1 : 0)
                .attr("class", c+" context")
                .attr("x", distXOnField(x))
                .attr("y", distYOnField(y))
                .attr("width", distXOnField(width))
                .attr("height", distYOnField(height));
        }
        function drawFieldCircle(x, y, r, isFilled){
            var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
            thumbSVG.append("circle")
                .style("opacity",$this.drawField ? 1 : 0)
                .attr("class", c+" context")
                .attr("cx", distXOnField(x))
                .attr("cy", distYOnField(y))
                .attr("r", distYOnField(r));
        }
        function drawFieldLine(x1, y1, x2, y2){
            thumbSVG.append("line")
                .style("opacity",$this.drawField ? 1 : 0)
                .attr("class", "fieldLines context")
                .attr("x1", distXOnField(x1))
                .attr("y1", distYOnField(y1))
                .attr("x2", distXOnField(x2))
                .attr("y2", distYOnField(y2));
        }
        function distYOnField(y){
            return y*$this.modesParams[tm].thumbHeight;
        }
        function distXOnField(x){
            return x*$this.modesParams[tm].thumbWidth;
        }
    }

    function getVisColor(vType,eid){
        switch(vType){
            case SUB_CHAIN_TYPE_SHOT:
                return getEventColor(eid);

            case SUB_CHAIN_TYPE_LONG_RUN:
                return "yellow";

            case SUB_CHAIN_TYPE_SIMPLE_NODE:
                return getEventColor(eid);

            case SUB_CHAIN_TYPE_PASS_CLUSTER:
            case SUB_CHAIN_TYPE_PASS_STANDARD:
            case SUB_CHAIN_TYPE_PASS_LONG:
            case SUB_CHAIN_TYPE_PASS_CENTRE:
            case SUB_CHAIN_TYPE_PASS_CORNER:
                return "black";

            case SUB_CHAIN_TYPE_PASS_HEAD:
                return "blue";

            case SUB_CHAIN_TYPE_PASS_FREEKICK:
                return "";

            default:
                throw "unknown vis type "+eid;
        }
    }

    function getPie(center, start, end){
        var dist = distance(center,start);
        return "M"+center.x+","+center.y+" "+
            "L"+start.x+","+start.y+" "+
            "A"+dist+","+dist+" 0 0,1 "+end.x+","+end.y+" "+
            "L"+center.x+","+center.y+" "+
            "Z";
    }
};


SequencesVis.prototype.createSequences = function(){
    var sequences = this.data.sequences;

    var NB_SLICES_X = 9,
        NB_SLICES_Y = 9;

    var tmp_x_distr_scale = d3.scale.linear().domain([0,100]).range([0,NB_SLICES_X]);
    var tmp_y_distr_scale = d3.scale.linear().domain([0,100]).range([0,NB_SLICES_Y]);

    function getXBand(posX){
        var band = parseInt(tmp_x_distr_scale(posX));
        return Math.min(band,NB_SLICES_X-1);
    }
    function getYBand(posY){
        var band = parseInt(tmp_y_distr_scale(posY));
        return Math.min(band,NB_SLICES_Y-1);
    }


    var longestRelativeTime= 0,
        longestRelativeDistance = 0;

    sequences.forEach(function(s){
        s.duration = timeToSec(s.endTime)-timeToSec(s.nodes[0].time);
        if(s.duration > longestRelativeTime) longestRelativeTime = s.duration;

        s.totalDistance = d3.sum(s.nodes, function(node, n){
            var nextNode = s.nodes[n+1];
            if(!nextNode) return 0;
            return (distance({x:node.x,y:node.y},{x:nextNode.x,y: nextNode.y}));
        });
        if(s.totalDistance > longestRelativeDistance) longestRelativeDistance = s.totalDistance;

        //compute distrib map for each sequence
        s.x_distrib_map = [];
        s.y_distrib_map = [];
        for(var i=0;i<NB_SLICES_X;i++) s.x_distrib_map[i] = 0;
        for(var i=0;i<NB_SLICES_Y;i++) s.y_distrib_map[i] = 0;
        s.nodes.forEach(function(node,n){
            if(n == s.nodes.length-1) return;//skip the last node (shot dest)
            s.x_distrib_map[getXBand(node.x)]+=1;
            s.y_distrib_map[getYBand(node.y)]+=1;
        });
    });

    //get the global (accross sequences) highest x and y bar
    var highest_x_bar = d3.max(sequences,function(seq){
        return d3.max(seq.x_distrib_map);
    });
    var highest_y_bar = d3.max(sequences,function(seq){
        return d3.max(seq.y_distrib_map);
    });

    var x_distrib_domain = [],y_distrib_domain = [];
    for(var i=0;i<NB_SLICES_X;i++) x_distrib_domain.push(i);
    for(var i=0;i<NB_SLICES_Y;i++) y_distrib_domain.push(i);

    var thumbMargin=5,thumbWidth,thumbHeight,nodeRadius;
    var modesParams = {};

    thumbWidth = (this.w - thumbMargin*2);
    thumbHeight = 20;
    nodeRadius = 3;
    modesParams.Temporary = {
        nodeRadius : nodeRadius,
        thumbMargin : thumbMargin,
        thumbWidth : thumbWidth,
        thumbHeight : thumbHeight,
        xStep : 5
    };

    thumbWidth = (this.w - thumbMargin*4)/3;
    thumbHeight = thumbWidth/1.5;
    nodeRadius = 2;
    modesParams.Scaled = {
        nodeRadius : nodeRadius,
        thumbMargin : thumbMargin,
        thumbWidth : thumbWidth,
        thumbHeight : thumbHeight,
        nbSeqByColumn : Math.floor( (this.h-thumbMargin-thumbHeight) / thumbHeight ),
        x_scale_thumb : d3.scale.linear().domain([0,100]).range([0,thumbWidth]).clamp(true),
        y_scale_thumb : d3.scale.linear().domain([0,100]).range([thumbHeight,0]).clamp(true)
    };
    modesParams.ScaledLinks = modesParams.Scaled;

    var x_distrib_scale = d3.scale.ordinal().domain(x_distrib_domain).rangeBands([0,thumbWidth]),
        y_distrib_scale = d3.scale.ordinal().domain(y_distrib_domain).rangeBands([thumbHeight,0]);
    modesParams.XProj = {
        nodeRadius : nodeRadius,
        thumbMargin : thumbMargin,
        thumbWidth : thumbWidth,
        thumbHeight : thumbHeight,
        nbSeqByColumn : Math.floor( (this.h-thumbMargin-thumbHeight) / thumbHeight ),
        x_distrib_scale : x_distrib_scale,
        y_scale_bars : d3.scale.linear().domain([0,highest_x_bar]).range([0,thumbHeight])
    };
    modesParams.YProj = {
        nodeRadius : nodeRadius,
        thumbMargin : thumbMargin,
        thumbWidth : thumbWidth,
        thumbHeight : thumbHeight,
        nbSeqByColumn : Math.floor( (this.h-thumbMargin-thumbHeight) / thumbHeight ),
        y_distrib_scale : y_distrib_scale,
        x_scale_bars : d3.scale.linear().domain([0,highest_y_bar]).range([0,thumbWidth])
    };


    thumbWidth = (this.w - thumbMargin*4)/3;
    thumbHeight = thumbWidth/1.5;
    nodeRadius = 2;
    modesParams.Signature = {
        nodeRadius : nodeRadius,
        thumbMargin : thumbMargin,
        thumbWidth : thumbWidth,
        thumbHeight : thumbHeight,
        nbSeqByColumn : Math.floor( (this.h-thumbMargin-thumbHeight) / thumbHeight ),
        x_scale_thumb : d3.scale.linear().domain([0,100]).range([0,thumbWidth]).clamp(true),
        y_scale_thumb : d3.scale.linear().domain([0,100]).range([thumbHeight,0]).clamp(true)
    };
    modesParams.Worm = modesParams.Signature;

    thumbWidth = (this.w - thumbMargin*2);
    thumbHeight = 20;
    nodeRadius = 4;
    modesParams.TimeAlign = {
        nodeRadius : nodeRadius,
        thumbMargin : thumbMargin,
        thumbWidth : thumbWidth,
        thumbHeight : thumbHeight,
        x_scale_thumb : d3.scale.linear().domain([0,longestRelativeTime]).range([0,thumbWidth])
    };

    thumbWidth = (this.w - thumbMargin*2);
    thumbHeight = 20;
    nodeRadius = 4;
    modesParams.DistanceAlign = {
        nodeRadius : nodeRadius,
        thumbMargin : thumbMargin,
        thumbWidth : thumbWidth,
        thumbHeight : thumbHeight,
        x_scale_thumb : d3.scale.linear().domain([0,longestRelativeDistance]).range([thumbWidth,0])
    };

    nodeRadius = 6;
    var donutRadius = (this.w - thumbMargin*2 - nodeRadius*2)/2;
    var donutCx = this.w/2,
        donutCy = this.h/2,
        nbNodes = d3.sum(sequences,function(seq){
            return seq.nodes.length;//skip the last node (shot dest)
        }),
        donutPos = createCircularPoints(nbNodes,donutRadius,donutCx,donutCy);
    modesParams.Donut = {
        center: {x: donutCx, y: donutCy},
        nodeRadius : nodeRadius,
        positions: donutPos,
        sequenceColors: d3.scale.category20().domain([0,sequences.length])
    };

    this.modesParams = modesParams;

    this.visSVG.selectAll(".sequenceVisSequence")
        .data(sequences)
        .enter()
        .append("g")
        .attr("class", "sequenceVisSequence")
        .attr("sid", function(d){return d.sid})
        .each(function(seq,s){
            var translates = {
                Temporary: undefined,
                Scaled: undefined,
                ScaledLinks: undefined,
                Signature: undefined,
                XProj: undefined,
                YProj: undefined,
                Worm: undefined,
                TimeAlign: undefined,
                DistanceAlign: undefined,
                Donut: undefined
            };

            //the transform for temporary mode
            translates.Temporary = d3.transform(
                "translate("+
                    (modesParams.Temporary.thumbMargin)+
                    ","+
                    (modesParams.Temporary.thumbMargin+s*(modesParams.Temporary.thumbMargin+modesParams.Temporary.thumbHeight))+
                    ")"
            ).translate;

            //the transform for Scaled mode
            translates.Scaled = d3.transform(
                "translate("+
                    (Math.floor(s/modesParams.Scaled.nbSeqByColumn)*(modesParams.Scaled.thumbWidth+modesParams.Scaled.thumbMargin)+modesParams.Scaled.thumbMargin)+
                    ","+
                    (modesParams.Scaled.thumbMargin+(s%modesParams.Scaled.nbSeqByColumn)*(modesParams.Scaled.thumbMargin+modesParams.Scaled.thumbHeight))+
                    ")"
            ).translate;
            translates.ScaledLinks = translates.Scaled;

            //the transform for Signature mode
            translates.Signature = d3.transform(
                "translate("+
                    (Math.floor(s/modesParams.Signature.nbSeqByColumn)*(modesParams.Signature.thumbWidth+modesParams.Signature.thumbMargin)+modesParams.Signature.thumbMargin)+
                    ","+
                    (modesParams.Signature.thumbMargin+(s%modesParams.Signature.nbSeqByColumn)*(modesParams.Signature.thumbMargin+modesParams.Signature.thumbHeight))+
                    ")"
            ).translate;
            translates.Worm = translates.Signature;
            translates.XProj = translates.Signature;
            translates.YProj = translates.Signature;

            //the transform for TimeAlign mode
            translates.TimeAlign = d3.transform(
                "translate("+
                    (modesParams.TimeAlign.thumbMargin)+
                    ","+
                    (modesParams.TimeAlign.thumbMargin+s*(modesParams.TimeAlign.thumbMargin+modesParams.TimeAlign.thumbHeight))+
                    ")"
            ).translate;

            //the transform for DistanceAlign mode
            translates.DistanceAlign = d3.transform(
                "translate("+
                    (modesParams.DistanceAlign.thumbMargin)+
                    ","+
                    (modesParams.DistanceAlign.thumbMargin+s*(modesParams.DistanceAlign.thumbMargin+modesParams.DistanceAlign.thumbHeight))+
                    ")"
            ).translate;

            //the transform for Donut mode - just go in the center of the donut
            translates.Donut = d3.transform(
                "translate("+
                    0+//(donutCx)+
                    ","+
                    0+//(donutCy)+
                    ")"
            ).translate;

            seq.translatesSequenceVis = translates;

        });

    var thumb_node_data = [],
        thumb_link_data = [];

    sequences.forEach(function(sequence,s){
        var startTime = timeToSec(sequence.nodes[0].time);
        sequence.links.forEach(function(link){
            link.sid = s;
        });
        thumb_link_data[s] = sequence.links;
        sequence.nodes.forEach(function(node,n){
            if(n == sequence.nodes.length-1) return;//skip the last node (shot dest)
            var relativeTime = timeToSec(node.time)-startTime;
            var vis = getVis(node.index);

            var relativeDistance = 0;
            var curNode, nextNode;
            curNode = node;
            for(var n2 = n; n < sequence.nodes.length-2; n2++){//skip the last node (shot dest)
                nextNode = sequence.nodes[n2];
                if(!nextNode) break;
                relativeDistance += distance({x:curNode.x,y:curNode.y},{x:nextNode.x,y:nextNode.y});
                curNode = nextNode;
            }

            var trSeq;
            var trTemporary = [],
                trScaled = [],
                trSignature = [],
                trVis = [],
                trXProj = [],
                trYProj = [],
                trTimeAlign = [],
                trDistanceAlign = [],
                trDonut = [];

            //the transform for temporary mode
            trSeq = sequence.translatesSequenceVis.Temporary;
            trTemporary[0] = trSeq[0]+modesParams.Temporary.xStep*n;
            trTemporary[1] = trSeq[1]+modesParams.Temporary.thumbHeight/2;

            //the transform for Scaled mode
            trSeq = sequence.translatesSequenceVis.Scaled;
            trScaled[0] = trSeq[0]+modesParams.Scaled.x_scale_thumb(node.x);
            trScaled[1] = trSeq[1]+modesParams.Scaled.y_scale_thumb(node.y);

            //the transform for Signature mode
            trSeq = sequence.translatesSequenceVis.Signature;
            trSignature[0] = trSeq[0]+modesParams.Signature.x_scale_thumb(node.x);
            trSignature[1] = trSeq[1]+modesParams.Signature.y_scale_thumb(node.y);
            //and the transform of the vis it belongs to
            trVis[0] = trSeq[0]+modesParams.Signature.x_scale_thumb(vis.position.x);
            trVis[1] = trSeq[1]+modesParams.Signature.y_scale_thumb(vis.position.y);

            //the transform for TimeAlign mode
            trSeq = sequence.translatesSequenceVis.TimeAlign;
            trTimeAlign[0] = trSeq[0]+modesParams.TimeAlign.x_scale_thumb(relativeTime);
            trTimeAlign[1] = trSeq[1]+modesParams.TimeAlign.thumbHeight/2;

            //the transform for DistanceAlign mode
            trSeq = sequence.translatesSequenceVis.DistanceAlign;
            trDistanceAlign[0] = trSeq[0]+modesParams.DistanceAlign.x_scale_thumb(relativeDistance);
            trDistanceAlign[1] = trSeq[1]+modesParams.DistanceAlign.thumbHeight/2;

            //the transform for Donut mode
            var nodeNumber = n + d3.sum(sequences, function(sequence2,s2){
                if(s2 < s) return sequence2.nodes.length;//do not skip the last node (shot dest), to let a hole between sequences
                return 0;
            });

            trDonut = modesParams.Donut.positions[nodeNumber];

            //the transform for XProj
            trSeq = sequence.translatesSequenceVis.XProj;
            trXProj[0] = trSeq[0]+modesParams.XProj.x_distrib_scale(getXBand(node.x))+modesParams.XProj.x_distrib_scale.rangeBand()/2;
            trXProj[1] = trSeq[1]+modesParams.XProj.y_scale_bars(0);

            //the transform for YProj
            trSeq = sequence.translatesSequenceVis.YProj;
            trYProj[0] = trSeq[0]+modesParams.YProj.x_scale_bars(0);
            trYProj[1] = trSeq[1]+modesParams.YProj.y_distrib_scale(getYBand(node.y))+modesParams.YProj.y_distrib_scale.rangeBand()/2;


            thumb_node_data.push({
                index: node.index,
                sid: sequence.sid,
                unique_id: node.unique_id,
                eid: node.eid,
                time: node.time,
                relativeTime: relativeTime,
                pid: node.pid,
                x: node.x,
                y: node.y,
                vis: vis,
                translates: {
                    Temporary: trTemporary,
                    Scaled: trScaled,
                    ScaledLinks: trScaled,
                    Vis: trVis,
                    XProj: trXProj,
                    YProj: trYProj,
                    Signature: trSignature,
                    Worm: trSignature,
                    TimeAlign: trTimeAlign,
                    DistanceAlign: trDistanceAlign,
                    Donut: trDonut
                }
            });
        });

        function getVis(nid){
            for(var si in sequence.signature){
                if(sequence.signature[si].nodes.indexOf(nid) != -1) return sequence.signature[si];
            }
            throw "no vis for node "+nid;
        }

    });

    var $this = this;


    //the histos data
    this.histos_data_x = [];
    this.histos_data_y = [];
    sequences.forEach(function(seq,s){
        $this.histos_data_x[s] = seq.x_distrib_map;
        $this.histos_data_y[s] = seq.y_distrib_map;
    });

    //the links data
    this.thumb_node_data = thumb_node_data;
    this.thumb_link_data = [];
    thumb_link_data.forEach(function(visLinks){
        $this.thumb_link_data.push.apply($this.thumb_link_data, visLinks);
    });

    var nodesSVG = this.visSVG.selectAll(".sequenceVisNode")
        .data(thumb_node_data)
        .enter()
        .append("g")
        .attr("class", "sequenceVisNode");

    nodesSVG.append("circle")
        .style("stroke","none")
        .style("fill",function(d){getEventColor(d.eid)})
        .attr("r",modesParams.Temporary.nodeRadius);


    function createCircularPoints(n,radius,cx,cy){
        var twopi  = Math.PI * 2,
            halfpi = Math.PI / 2,
            data = [];
        for (var i = 0; i < n; i++) {
            var x = cx + (radius * Math.cos(-halfpi+(i * twopi) / n)),
                y = cy + (radius * Math.sin(-halfpi+(i * twopi) / n));
            data.push([x, y]);
        }
        return data;
    }
};

SequencesVis.prototype.overSequence = function(sid){
    if(this.overedSequence == sid || this.selectedSequence == sid) return;
    //console.log("over",sid);
    this.overedSequence = sid;
    d3.select(".sequenceVisSequence[sid='"+sid+"'] .overlay")
        .style("fill",OVER_OBJECT_COLOR)
        .style("fill-opacity",.2);
};
SequencesVis.prototype.exitSequence = function(sid){
    if(this.overedSequence == undefined || this.selectedSequence == sid) return;
    //console.log("exit",sid);
    d3.select(".sequenceVisSequence[sid='"+sid+"'] .overlay")
        .style("fill","white")
        .style("fill-opacity",0);
    this.overedSequence = undefined;
};
SequencesVis.prototype.selectSequence = function(sid,refresh){
    if(!refresh && this.selectedSequence == sid) return;
    //console.log("select",sid);
    this.selectedSequence = sid;
    d3.select(".sequenceVisSequence[sid='"+sid+"'] .overlay")
        .style("fill",SELECTED_OBJECT_COLOR)
        .style("fill-opacity",.2);

    var logTime = false;
    if(logTime) console.log(this.data.sequences[sid].endTime);

};
SequencesVis.prototype.unselectSequence = function(sid){
    if(this.overedSequence == undefined) return;
    //console.log("unselect",sid);
    d3.select(".sequenceVisSequence[sid='"+sid+"'] .overlay")
        .style("fill","white")
        .style("fill-opacity",0);
    this.selectedSequence = undefined;
};
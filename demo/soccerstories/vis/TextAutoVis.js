TextAutoVis = function(data, x,y,w,h){
    this.w = w;
    this.x = x;
    this.h = h;
    this.y = y;
    this.data = data;

    this.init();
};

TextAutoVis.prototype.init = function(){
    var $this = this;

    var span = d3.select("#testSequences").append("span").attr("id","svg2-container");

    this.visSVG = span
        .append("svg")
        .attr("id", "svg2")
        .attr("x",this.x)
        .attr("y",this.y)
        .attr("height",this.h)
        .attr("width",this.w);

    this.visSVG.append("rect")
        .attr("width",this.w)
        .attr("height",this.h)
        .style("stroke","black")
        .style("stroke-width",.5)
        .style("fill","white");

    this.visSVG.on("click", function(){
        $this.data.clickOnBackground();
    });



};

TextAutoVis.prototype.selectSequence = function(sid){

};

TextAutoVis.prototype.unselectSequence = function(sid){
    this.visSVG.selectAll(".textData").remove();
};

TextAutoVis.prototype.selectVis = function(vid){
    this.visSVG.selectAll(".textData .overlay")
        .filter(function(d){
            return d.vid == vid;
        })
        .style("fill",SELECTED_OBJECT_COLOR)
        .style("opacity",.2);
};

TextAutoVis.prototype.unselectVis = function(vid){
    this.visSVG.selectAll(".textData .overlay")
        .filter(function(d){
            return d.vid == vid;
        })
        .style("fill","white")
        .style("opacity",0)
};

TextAutoVis.prototype.overVis = function(vid){
    this.visSVG.selectAll(".textData .overlay")
        .filter(function(d){
            return d.vid == vid;
        })
        .style("fill",OVER_OBJECT_COLOR)
        .style("opacity",.2);
};
TextAutoVis.prototype.exitVis = function(vid){
    this.visSVG.selectAll(".textData .overlay")
        .filter(function(d){
            return d.vid == vid;
        })
        .style("fill","white")
        .style("opacity",0)
};

TextAutoVis.prototype.sequenceIsClusterized = function(){
    var $this = this;
    this.visSVG.selectAll(".textData").remove();

    var data = [];

    this.data.selected_sequence.visList.forEach(function(vis,v){
        data.push({
            type: vis.type,
            nodes: vis.nodes,
            vid: vis.vid,
            lastEvent: getNodeEvent(vis.exit),
            text: $this.getText(vis)
        });
    });

    function getNodeEvent(nid){
        return $this.data.selected_sequence.nodes[nid].eid;
    }

    var textData = this.visSVG.selectAll(".textData")
        .data(data)
        .enter()
        .append("g")
        .attr("transform",function(d,i){
            return "translate("+[5,20+i*20]+")";
        })
        .attr("class","textData");

    textData.append("text")
        .text(function(d){
            return d.text;
        });

    textData.each(function(d){
        var bbox = d3.select(this).node().getBBox();

        d3.select(this).append("rect")
            .style("opacity",0)
            .style("fill","white")
            .attr("class","overlay")
            .attr("x",bbox.x)
            .attr("y",bbox.y)
            .attr("width",bbox.width)
            .attr("height",bbox.height);

    });

    textData.on("click", function(d){
        catchEvent();
        $this.data.selected_sequence.clickVis(d.vid);
    });
    textData.on("mouseover", function(d){
        if($this.data.selected_sequence.selectedVisId == d.vid) return;
        $this.data.selected_sequence.overVis(d.vid);
    });
    textData.on("mouseout", function(d){
        if($this.data.selected_sequence.selectedVisId == d.vid) return;
        $this.data.selected_sequence.exitVis(d.vid);
    });
};

TextAutoVis.prototype.getPlayerName = function(nid){
    var pid = this.data.selected_sequence.nodes[nid].pid;
    return (pid == -1) ? "" : this.data.formation.getPlayerInfos(pid).display_name;
};

TextAutoVis.prototype.getText = function(subchain){
    var $this = this;

    var t = undefined;

    var p1 = $this.getPlayerName(subchain.entry);
    var p2 = $this.getPlayerName(subchain.exit);
    switch(subchain.type){
        case SUB_CHAIN_TYPE_SHOT:
            switch(subchain.links[0].eid){
                case E_SHOT_MISS:
                    t = "makes a shot but misses the target";
                    break;
                case E_SHOT_POST:
                    t = "makes a shot and hits a post";
                    break;
                case E_SHOT_SAVED:
                    t = "makes a shot saved by the opposite team";
                    break;
                case E_SHOT_GOAL:
                    t = "makes a shot and scores a goal";
                    break;
                case E_SHOT_CHANCE_MISSED:
                    t = "has a good chance to score but misses his chance";
                    break;
                default:
                    throw "Unknown shot event type: "+subchain.links[0].eid;
            }
            return p1+" "+t;

        case SUB_CHAIN_TYPE_LONG_RUN:
            switch(subchain.side){
                case "left":
                    t = "runs on the left side of the field with the ball";
                    break;
                case "right":
                    t = "runs on the right side of the field with the ball";
                    break;
                case "center":
                    t = "runs on the middle of the field with the ball";
                    break;
                default:
                    throw "Unknown side type: "+subchain.side;
            }
            return p1+" "+t;

        case SUB_CHAIN_TYPE_PASS_CENTRE:
            if(subchain.fromRight){
                t = "makes a crossover to the box from the right side of the field";
            }
            else{
                t = "makes a crossover to the box from the left side of the field";
            }
            return p1+" "+t;

        case SUB_CHAIN_TYPE_PASS_CORNER:
            if(subchain.fromRight){
                t = "hits a corner kick from the right side of the field";
            }
            else{
                t = "hits a corner kick from the left side of the field";
            }
            return p1+" "+t;

        case SUB_CHAIN_TYPE_PASS_CLUSTER:
            t = "starts a series of passes ending with a "+getExitText(getNodeEvent(subchain.exit))+" from/by";
            return p1+" "+t+" "+p2;

        case SUB_CHAIN_TYPE_SIMPLE_NODE:
            var eid = $this.data.selected_sequence.nodes[subchain.entry].eid;

            var target = getTargetPlayerFromSourceNodeId(subchain.entry);
            switch(eid){
                case E_PASS:
                    t = "makes a pass";
                    break;
                case E_RUN:
                    t = "runs with the ball";
                    target = undefined;
                    break;
                case E_SPECIAL_TAKE_ON:
                case E_SPECIAL_GOOD_SKILL:
                    t = "dribbles an opponent";
                    target = undefined;
                    break;
                case E_DEF_TACKLE:
                    t = "makes a tackle";
                    break;
                case E_DEF_INTERCEPTION:
                    t = "intercepts the ball";
                    target = undefined;
                    break;
                case E_DUPLICATE:
                    return "";
                case E_AERIAL_DUEL:
                    t = "makes a head";
                    break;
                case E_FOUL:
                    t = "suffers a foul";
                    target = undefined;
                    break;
                default:
                    throw "unknown eid "+getEventName(eid);
            }
            if(target) return p1+" "+t+" to "+target;
            return p1+" "+t;

        default:
            throw "Unknown subChain type "+subchain.type;
    }

    function getNodeEvent(nid){
        return $this.data.selected_sequence.nodes[nid].eid;
    }

    function getTargetPlayerFromSourceNodeId(nid){
        for(var l in $this.data.selected_sequence.links){
            var link = $this.data.selected_sequence.links[l];
            if(link.source == nid){
                return $this.data.selected_sequence.nodes[link.target].pid != -1 ? $this.data.formation.getPlayerInfos($this.data.selected_sequence.nodes[link.target].pid).last_name : undefined;
            }
        }
    }

    function getExitText(eid){
        switch(eid){
            case E_PASS:
                return "pass";
            case E_RUN:
                return "run";
            case E_SHOT_MISS:
            case E_SHOT_POST:
            case E_SHOT_SAVED:
            case E_SHOT_GOAL:
            case E_SHOT_CHANCE_MISSED:
                return "shot";
            case E_CORNER:
                return "corner";
            case E_DUPLICATE:
                throw "invalid event "+getEventName(eid);
            case E_SPECIAL_TAKE_ON:
            case E_SPECIAL_GOOD_SKILL:
                return "dribble";
            case E_DEF_TACKLE:
                return "tackle";
            case E_DEF_INTERCEPTION:
                return "interception";
            case E_LONG_RUN:
                return "long run";
            case E_AERIAL_DUEL:
                return "aerial duel";
            case E_FOUL:
                return "foul";
            default:
                throw "unknown eid "+getEventName(eid);

        }
    }
};
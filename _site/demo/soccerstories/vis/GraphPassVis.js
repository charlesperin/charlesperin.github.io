
GraphPassVis = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.visType = "GraphPassVis";
    this.formation = this.sequence.data.formation;

    //called at the end of the constructor
    this.getContextData();
};

//inherits AbstractVis prototypes
GraphPassVis.prototype = Object.create(AbstractVis.prototype);

/*
 Overrides the AbstractVis method
 */
GraphPassVis.prototype.getContextData = function(){
    var pids = this.sequence.nodes.map(function(d){return d.pid});
    this.context_data = this.sequence.data.getContextGraphPass(
        this.context,
        pids
    );
};


/*
 Initialize the context
 */
GraphPassVis.prototype.drawContext = function(){
    var $this = this;

    var context_group = this.visSVG
        .append("svg:g");


};

GraphPassVis.prototype.create = function(centerX, centerY, callback) {
    //console.log("create abstractVis", this.vid, this.entry, this.exit, this.nodes, this.links, centerX, centerY);
    var $this = this;

    this.nodeRadius = 10;



    //console.log("formation",this.formation);

    var players = this.nodes.map(function(d){
        return $this.formation.getPlayerInfos($this.sequence.nodes[d].pid);
    });
    players = removeDuplicateValues(players);
    players = removeNullValues(players);

    //console.log("players",players);

    var max_x = d3.max(players, function(d){return d.x});
    var max_y = d3.max(players, function(d){return d.y});
    var min_x = d3.min(players, function(d){return d.x});
    var min_y = d3.min(players, function(d){return d.y});

    //console.log(min_x,max_x,min_y,max_y);

    var maxWidth = 150,
        maxHeight = maxWidth/1.69;

    var width_scale = d3.scale.linear().domain([0,1]).range([0,maxWidth]);
    var height_scale = d3.scale.linear().domain([0,1]).range([0,maxHeight]);

    this.w = width_scale(max_x)-width_scale(min_x)+2*this.nodeRadius;
    this.h = height_scale(max_y)-height_scale(min_y)+2*this.nodeRadius;

    this.x_scale = d3.scale.linear().domain([min_x,max_x]).range([this.nodeRadius,this.w-this.nodeRadius]);
    this.y_scale = d3.scale.linear().domain([min_y,max_y]).range([this.h-this.nodeRadius,this.nodeRadius]);


    this.createVisSVG(centerX,centerY, function(){
        $this.putDragSquareOnTop();
        callback.call();
    });



};


GraphPassVis.prototype.drawNode = function(){

    this.drawContext();

    var $this = this;

};

GraphPassVis.prototype.animateNodesLinks = function(duration, callback){
    var $this = this;
    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links),
        okHull = $this.selectionHull == undefined;

    //transform selected nodes
    this.nodes.forEach(function(node,n){
        d3.selectAll(".node").filter(function(d) {
            if(d.index==node) {
                var newTx,newTy;
                var playerInfos = $this.formation.getPlayerInfos($this.sequence.nodes[d.index].pid);
                d.infos = playerInfos;
                newTx = $this.posX + $this.x_scale(playerInfos.x);
                newTy = $this.posY + $this.y_scale(playerInfos.y);
                d.transform = d3.transform("translate("+newTx+","+newTy+")");
                return true;
            }
            return false;
        })
            .transition()
            .duration(duration)
            .attr("data-graphpassvis", function(d) { return "vid_" + d.vid;})
            .attr("transform", function(d){return "translate("+d.transform.translate[0]+","+ d.transform.translate[1]+")"})
            .call(function(){$this.sequence.updateBetweenVisLinksFromNodeInVis(node,duration)})
            .each("end", function(){okNodes[n]=true; transitionEnded();});
    });
    //transform selected links
    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            if(d.source==link.source && d.target == link.target) {
                d.newLine = $this.sequence.getArcLinkCoords(link);
                return true;
            }
            return false;
        })
            .selectAll("path")
            .transition()
            .duration(duration)
            .attr("data-graphpassvis", function(d) {return "vid_" + d.vid;})
            .attr("d", function(d){return line(d.newLine)})
            .each("end", function(){okLinks[l]=true; transitionEnded();});
    });

    if($this.selectionHull != undefined){
        //console.log("ANIMATE HULL");
        $this.selectionHull.animateWithNodesTransition(duration, function(){
            okHull = true;
            transitionEnded();
        });
    }

    function transitionEnded(){
        //if all nodes and links have ended their transition, call the callback
        if(checkTrueArray(okNodes) && checkTrueArray(okLinks) && okHull) {
            callback.call();
        }
    }
};

/*
 Change the aspect of the nodes in the visualization
 */
GraphPassVis.prototype.applyNodesLinksStyle = function(duration, callback){
    var $this = this;

    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links);

    //console.log("APPLYNODESLINKSSTYLE for graphpassvis");

    //no concern about circle nodes because in graphpass, there can't be some
    this.nodes.forEach(function(node,n){
        var the_nodes = d3.selectAll(".node").filter(function(d) {
            return (d.index==node);
        });
        the_nodes
            .selectAll("path.node-fg,path.node-bg")
            .transition()
            .duration(duration)
            .style("fill","white")
            .style("stroke-width",1)
            .style("opacity",1)
            .attr("d", function(d){
                if(d.index == $this.entry || d.index == $this.exit){
                    return $this.data.getNodePath($this.sequence.data.nodeRadius);
                }
                else{
                    return $this.data.getNodePath($this.sequence.data.nodeRadius/2);
                }
            })
            .each("end", function(){okNodes[n]=true; transitionEnded();});

        the_nodes.selectAll("text")
            .transition()
            .duration(duration)
            .style("font-size",8)
            .style("opacity",function(d){
                if(d.index == $this.entry || d.index == $this.exit){
                    return 1;
                }
                else{
                    return 0;
                }
            });

        //put in front of the svg the entry and exit nodes
        the_nodes.each(function(d){
            if(d.index == $this.entry || d.index == $this.exit){
                d3.select(this).moveToFront();
            }
        });
    });

    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            return (d.source==link.source && d.target == link.target);
        })
            .selectAll("path")
            .transition()
            .duration(duration)
            .attr("marker-end", "")
            .style("opacity",1)
            .style("stroke-width",.5)
            .each("end", function(){okLinks[l]=true; transitionEnded();});;
    });

    function transitionEnded(){
        if(checkTrueArray(okNodes) && checkTrueArray(okLinks)) {
            //console.error("APPLYNODESLINKSSTYLE OK");
            callback.call();
        }
    }
};


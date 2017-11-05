
HivePlotVis = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.visType = "HivePlotVis";
    this.formation = this.sequence.data.formation;

    //called at the end of the constructor
    this.getContextData();
};

//inherits AbstractVis prototypes
HivePlotVis.prototype = Object.create(AbstractVis.prototype);

/*
 Overrides the AbstractVis method
 */
HivePlotVis.prototype.getContextData = function(){
    var pids = this.sequence.nodes.map(function(d){return d.pid});
    this.context_data = this.sequence.data.getContextGraphPass(
        this.context,
        pids
    );
};


/*
 Initialize the context
 */
HivePlotVis.prototype.drawContext = function(){
    var $this = this;

    var context_group = this.visSVG
        .append("svg:g");


};

HivePlotVis.prototype.create = function(centerX, centerY, callback) {
    //console.log("create abstractVis", this.vid, this.entry, this.exit, this.nodes, this.links, centerX, centerY);
    var $this = this;

    this.nodeRadius = 10;

    this.axis = this.nodes.map(function(d){
        return $this.sequence.nodes[d].pid;
    });

    this.axis = removeDuplicateValues(this.axis);
    this.axis = removeNullValues(this.axis);
    this.nbAxis = this.axis.length+1;

    //associate to each node index the corresponding axis
    this.nodeToAxis = {};
    this.nodes.forEach(function(node,i){
        $this.nodeToAxis[node] = $this.axis.indexOf($this.sequence.nodes[node].pid);
    });

    this.w = 100;
    this.h = 100;
    var innerRadius = .1*this.w/2,
        outerRadius = .9*this.w/2;


    this.angle = d3.scale.ordinal().domain(d3.range(this.nbAxis)).rangePoints([0, 2 * Math.PI]);
    this.radius = d3.scale.linear().domain([0,this.nodes.length]).range([innerRadius, outerRadius]);

    this.createVisSVG(centerX,centerY, function(){
        $this.drawAxis();
        $this.putDragSquareOnTop();

        callback.call();
    });

};

HivePlotVis.prototype.drawAxis = function(){
    var $this = this;
    var a = this.visSVG.selectAll(".axis")
        .data(this.axis)
        .enter()
        .append("svg:g")
        .attr("transform", function(d) {
            return "translate("+($this.w/2)+","+($this.h/2)+")";
        })
        .attr("class", "axis");

    a.append("line")
        .attr("x1", function(d){return getX1(d)})
        .attr("y1", function(d){return getY1(d)})
        .attr("x2", function(d){return getX2(d)})
        .attr("y2", function(d){return getY2(d)})

    a.append("circle")
        .attr("cx", function(d){return getX2(d)})
        .attr("cy", function(d){return getY2(d)})
        .attr("r",10);

    a.append("text")
        .attr("x",function(d){return getX2(d)})
        .attr("y",function(d){return getY2(d)+4})
        .text(function(d){
            return $this.sequence.data.getPlayer(d).jersey;
        });

    function getX1(d){
        return $this.radius.range()[0] * Math.cos($this.angle(d));
    }
    function getX2(d){
        return $this.radius.range()[1] * Math.cos($this.angle(d));
    }
    function getY1(d){
        return $this.radius.range()[0] * Math.sin($this.angle(d));
    }
    function getY2(d){
        return $this.radius.range()[1] * Math.sin($this.angle(d));
    }
};


HivePlotVis.prototype.drawNode = function(){

    this.drawContext();

    var $this = this;

};

HivePlotVis.prototype.animateNodesLinks = function(duration, callback){
    var $this = this;
    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links),
        okHull = $this.selectionHull == undefined;

    //console.log("ANIMATENODESLINKS for hiveplotvis");

    var cx = $this.posX+this.w/2,
        cy = $this.posY+this.h/2;

    function getPos(node){
        var r = $this.radius($this.nodes.indexOf(node)),
            alpha = $this.angle($this.nodeToAxis[node]);
        return [
            cx + r * Math.cos(alpha),
            cy + r * Math.sin(alpha)
        ];
    }

    //transform selected nodes
    this.nodes.forEach(function(node,n){
        d3.selectAll(".node").filter(function(d) {
            if(d.index==node) {
                d.transform = d3.transform(
                    "translate("+getPos(node)+")"
                );
                return d;
            }
        })
            .transition()
            .duration(duration)
            .attr("data-hiveplotvis", function(d) { return "vid_" + d.vid;})
            .attr("transform", function(d){
                return "translate("+ d.transform.translate+")";
            })
            .call(function(){$this.sequence.updateBetweenVisLinksFromNodeInVis(node,duration)})
            .each("end", function(){okNodes[n]=true; transitionEnded();});
    });

    //transform selected links
    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            if(d.source==link.source && d.target == link.target) {
                d.newLine = $this.sequence.getArcLinkCoords(link);
                return d;
            }
        })
            .selectAll("path")
            .transition()
            .duration(duration)
            .attr("data-hiveplotvis", function(d) {return "vid_" + d.vid;})
            .attr("d", function(d){return line(d.newLine)})
            .each("end", function(){okLinks[l]=true; transitionEnded();});
    });


    if($this.selectionHull != undefined){
        //console.log("hiveplotvis - ANIMATE HULL");
        $this.selectionHull.animateWithNodesTransition(duration, function(){
            okHull = true;
            transitionEnded();
        });
    }

    function transitionEnded(){
        //console.log("transition ended",checkTrueArray(okNodes),checkTrueArray(okLinks),okHull);
        //if all nodes and links have ended their transition, call the callback
        if(checkTrueArray(okNodes) && checkTrueArray(okLinks) && okHull) {
            callback.call();
        }
    }
};

/*
 Change the aspect of the nodes in the visualization
 */
HivePlotVis.prototype.applyNodesLinksStyle = function(duration, callback){
    var $this = this;

    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links);

    //console.log("APPLYNODESLINKSSTYLE for hiveplotvis");

    this.nodes.forEach(function(node,n){
        var the_nodes = d3.selectAll(".node").filter(function(d) {
            if(d.index==node)
                return d;
        });

        the_nodes
            .selectAll("path.node-fg,path.node-bg")
            .transition()
            .duration(duration)
            .style("fill", "black")
            .style("opacity",1)
            .style("stroke-width",1)
            .attr("d", $this.data.getNodePath($this.sequence.data.nodeRadius/4))
            .each("end", function(){okNodes[n]=true; transitionEnded();});

        the_nodes.selectAll("text")
            .transition()
            .duration(duration)
            .style("opacity",0);
    });

    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            if(d.source==link.source && d.target == link.target) {
                return d;
            }
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
            callback.call();
        }
    }
};


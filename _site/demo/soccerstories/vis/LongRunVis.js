
LongRunVis = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.visType = "LongRunVis";

    if(this.links.length > 1) throw "LongRunVis can only contain one link, here "+this.links.length;

    //this.side can be left, right, center
    var y0 = this.sequence.nodes[this.nodes[0]].y,
        y1 = this.sequence.nodes[this.nodes[1]].y;

    this.side = getLongRunSideFromYCoords(y0,y1);

    //called at the end of the constructor
    this.getContextData();
};

//inherits AbstractVis prototypes
LongRunVis.prototype = Object.create(AbstractVis.prototype);

/*
 Overrides the AbstractVis method
 */
LongRunVis.prototype.getContextData = function(){
    this.context_data = this.sequence.data.getContextLongRuns(
        this.context,
        this.sequence.nodes[this.nodes[0]].pid
    );
};


/*
 Initialize the context
 */
LongRunVis.prototype.drawContext = function(){
    var $this = this;

    var arrow_max_height = this.h/6,
        arrow_width = this.w-2*this.x_margin;

    var scale_runs = d3.scale.linear()
        .domain([0,d3.max(this.context_data, function(d){return d.value})])
        .range([0,1]);

    var context_group = this.visSVG
        .append("svg:g")
        .attr("class","context");

    var the_groups = context_group
        .selectAll(".contextCentreVis")
        .data(this.context_data)
        .enter()
        .append("g")
        .attr("class","contextCentreVis")
        .attr("transform", function(d){
            return "translate("+$this.x_scale_arrow("start")+","+$this.y_scale_arrow(d.side)+")";
        });

    the_groups
        .append("path")
        .attr("d", function(d){
            return $this.getLongRunArrow(scale_runs(d.value)*arrow_max_height,arrow_width);
        })
        .style("fill", function(d){
            if(d.side == $this.side) return "gray";
            return "none";
        })
        .style("stroke", function(d){
            return "black";
        })
        .style("stroke-width", function(d){
            if(d.side == $this.side) return 2;
            return 1;
        });
};

/*
 factor in [0,1]
 */
LongRunVis.prototype.getLongRunArrow = function(height,width){
    var half_height = height/2;

    return "M 0 "+half_height
        +" h "+(width-height)
        +" v "+half_height
        +" L "+width+" "+0
        +" L "+(width-height)+" "+(-height)
        +" v "+(half_height)
        +" h "+(-(width-height))
        +" Z";
};


LongRunVis.prototype.create = function(centerX, centerY, callback) {
    //console.log("create longrunvis", this.vid, this.entry, this.exit, this.nodes, this.links, centerX, centerY);
    var $this = this;
    this.h = 130;
    this.w = this.h*.8;

    this.x_scale = d3.scale.linear().domain([50,100]).range([0,this.w]).clamp(true);
    this.y_scale = d3.scale.linear().domain([0,100]).range([this.h,0]).clamp(true);

    this.x_margin = 10;
    this.x_scale_arrow = d3.scale.ordinal().domain(["start","end"]).range([this.x_margin,this.w-this.x_margin]);
    this.y_scale_arrow = d3.scale.ordinal().domain(["left","center","right"]).range([3*this.h/16,8*this.h/16,13*this.h/16]);

    this.createVisSVG(centerX,centerY,function(){
        $this.drawField();
        $this.putDragSquareOnTop();

        callback.call();
    });

};


LongRunVis.prototype.drawNode = function(){
    var $this = this;

    //this.drawField();
    this.drawContext();

};

LongRunVis.prototype.animateNodesLinks = function(duration, callback){
    var $this = this;
    var nodes_done = [], links_done = [], hull_done = false;
    this.nodes.forEach(function(node,n){
        nodes_done[n] = false;
    });
    this.links.forEach(function(link,l){
        links_done[l] = false;
    });


    //transform selected nodes
    this.nodes.forEach(function(node,n){
        d3.selectAll(".node").filter(function(d) {
            if(d.index==node) {
                var newTx,newTy;

                if(n==0){//start node
                    newTx = $this.posX + $this.x_scale_arrow("start");
                }
                else if(n==1){//end node
                    newTx = $this.posX + $this.x_scale_arrow("end");
                }
                else throw "only 2 nodes in longrunvis !";

                newTy = $this.posY + $this.y_scale_arrow($this.side);

                d.transform = d3.transform("translate("+newTx+","+newTy+")");
                return d;
            }
        })
            .transition()
            .duration(duration)
            .attr("data-longrunvis", function(d) { return "vid_" + d.vid;})
            .attr("transform", function(d){return "translate("+d.transform.translate[0]+","+ d.transform.translate[1]+")"})
            .call(function(){$this.sequence.updateBetweenVisLinksFromNodeInVis(node,duration)})
            .each("end", function(){nodes_done[n]=true; transitionEnded();});
    });
    //transform selected links
    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            if(d.source==link.source && d.target == link.target) {
                d.newLine = $this.sequence.getStraightLinkCoords(link);
                return d;
            }
        })
            .selectAll("path")
            .transition()
            .duration(duration)
            .attr("data-longrunvis", function(d) {return "vid_" + d.vid;})
            .attr("d", function(d){return line(d.newLine)})
            .each("end", function(){links_done[l]=true; transitionEnded();});
    });


    $this.selectionHull.animateWithNodesTransition(duration, function(){
        hull_done = true;
        transitionEnded();
    });

    function transitionEnded(){
        //if all nodes and links have ended their transition, call the callback
        var okNodes = true, okLinks = true;
        nodes_done.forEach(function(d){
            if(d==false) okNodes = false;
        });
        links_done.forEach(function(d){
            if(d==false) okLinks = false;
        });
        if(okNodes && okLinks && hull_done){
            callback.call();
        }
    }


};

/*
 Change the aspect of the nodes in the visualization
 */
LongRunVis.prototype.applyNodesLinksStyle = function(duration, callback){
    var $this = this;

    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links);

    this.nodes.forEach(function(node,n){
        var the_nodes = d3.selectAll(".node").filter(function(d) {
            if(d.index==node)
                return d;
        });
        the_nodes.select(".node-fg")
            .transition()
            .duration(duration)
            .style("fill", "white")
            .attr("d", $this.data.getNodePath($this.data.nodeRadius))
            .each("end", function(){okNodes[n]=true; transitionEnded();});
        the_nodes.select(".node-bg")
            .transition()
            .duration(duration)
            .attr("d", $this.data.getNodePath($this.data.nodeRadius));
    });

    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            if(d.source==link.source && d.target == link.target) {
                return d;
            }
        })
            .selectAll("path,text")
            .transition()
            .duration(duration)
            .attr("marker-end", "")
            .style("opacity",1)
            .style("stroke-width",0)
            .each("end", function(){okLinks[l]=true; transitionEnded();});;
    });

    function transitionEnded(){
        if(checkTrueArray(okNodes) && checkTrueArray(okLinks)) {
            callback.call();
        }
    }
};


LongRunVis.prototype.drawField = function(){
    //the field rect
    this.drawFieldRect(0, 0, 1, 1, true);
    //central circle
    this.drawFieldHalfCircle(0, 0.5, 0.18);
    //central point
    this.drawFieldCircle(0, 0.5, 0.01, true);
    //right circle
    this.drawFieldCircle(0.8, 0.5, 0.14);
    //right big rect
    this.drawFieldRect(0.698, 0.191, 0.30, 0.615, true);
    //right small rect
    this.drawFieldRect(0.9, 0.36, 0.1, 0.28);
    //right goals
    this.drawFieldRect(0.98, 0.4445, 0.01, 0.11);
    //right penalty point
    this.drawFieldCircle(0.8, 0.5, 0.004, true);
};

LongRunVis.prototype.drawFieldHalfCircle = function(x, y, r, isFilled){
    var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
    this.visSVG.append("svg:path")
        .attr("class", c)
        .attr("d",
        "M "+this.distXOnField(x)+" "+this.distYOnField(y)+" "+
            "m 0 "+this.distXOnField(r)+" "+
            "a "+this.distXOnField(r)+","+this.distXOnField(r)+" 0 1,0 "+(0)+","+(-this.distXOnField(r)*2)
    );
};

/*
 x, y center of the circle
 r radius of the circle, as a fraction of X
 isFilled true if point
 */
LongRunVis.prototype.drawFieldCircle = function(x, y, r, isFilled){
    var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
    this.visSVG.append("circle")
        .attr("class", c)
        .attr("cx", this.distXOnField(x))
        .attr("cy", this.distYOnField(y))
        .attr("r", this.distXOnField(r));
};

/*
 x, width as fractions of X
 y, height as fractions on Y
 */
LongRunVis.prototype.drawFieldRect = function(x, y, width, height, isFilled){
    var c = isFilled ? "fieldRect" : "fieldLines";
    this.visSVG.append("rect")
        .attr("class", c)
        .attr("x", this.distXOnField(x))
        .attr("y", this.distYOnField(y))
        .attr("width", this.distXOnField(width))
        .attr("height", this.distYOnField(height));
};

/*
 x1, x2 as fractions of X
 y1, y2 as fractions of Y
 */
LongRunVis.prototype.drawFieldLine = function(x1, y1, x2, y2){
    this.visSVG.append("line")
        .attr("class", "fieldLines")
        .attr("x1", this.distXOnField(x1))
        .attr("y1", this.distYOnField(y1))
        .attr("x2", this.distXOnField(x2))
        .attr("y2", this.distYOnField(y2));
};

LongRunVis.prototype.distYOnField = function(y){
    return y*parseInt(this.h);
};

LongRunVis.prototype.distXOnField = function(x){
    return x*parseInt(this.w);
};
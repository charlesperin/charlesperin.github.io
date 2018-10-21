/*
 Abstract visualization, implementing needed methods

 params must contain following fields:
 sequence: the Sequence object
 data: Data containing informations on nodes and links
 type: type of visualization
 nodes: nodes in visualization
 links: links in visualization
 svg: the parent svg of the visualization
 entry: the entry node id of the visualization
 exit: the exit node id of the visualization
 vid: the visualization id
 centerX: x center coordinate of the visualization
 centerY: y center coordinate of the visualization
 padding: the padding between visualizations
 context: Integer specifying the context type
 */
AbstractVis = function(params) {
    this.sequence = params.sequence;
    this.type = params.type;
    this.data = params.data;
    this.svg = params.svg;
    this.nodes = params.nodes;
    this.links = params.links;
    this.entry = params.entry;
    this.exit = params.exit;
    this.vid = params.vid;
    this.padding = params.padding;
    this.context = params.context;
    this.visType = "AbstractVis";

    var $this = this;
    d3.selectAll(".node").each(function(d) {
        if($this.nodes.indexOf(d.index)!=-1) {
            d.vid = $this.vid;
        }
    });

    this.links.forEach(function(link){
        link.vid = $this.vid;
    });

    if(params.hull)this.createHull();
};

/*
 These methods are overriden by each visualization
 */
AbstractVis.prototype.getContextData = function(){

};
AbstractVis.prototype.drawContext = function(){

};

AbstractVis.prototype.drawNode = function(){

};
//template for prototype
AbstractVis.prototype.applyNodesLinksStyle = function(duration){
    /*
     var $this = this;

     if(duration==null)
     return;


     var nodes_done = [], links_done = [];

     this.nodes.forEach(function(node,n){
     nodes_done[n] = false;
     });
     this.links.forEach(function(link,l){
     links_done[l] = false;
     });


     this.nodes.forEach(function(node,n){
     //.each("end", function(){nodes_done[n]=true; transitionEnded();});
     });

     this.links.forEach(function(link,l){
     //.each("end", function(){links_done[l]=true; transitionEnded();});;
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
     if(okNodes && okLinks){
     callback.call();
     }
     }
     */
};
//template for prototype
AbstractVis.prototype.animateNodesLinks = function(duration, callback){
    /*
     var $this = this;
     var okNodes = getFalseArray(this.nodes),
     okLinks = getFalseArray(this.links),
     okHull = $this.selectionHull == undefined;

     //transform selected nodes
     this.nodes.forEach(function(node,n){
     //.each("end", function(){nodes_done[n]=true; transitionEnded();});
     });
     //transform selected links
     this.links.forEach(function(link,l){
     //.each("end", function(){links_done[l]=true; transitionEnded();});
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
     */
};

AbstractVis.prototype.showContext = function(show,duration){
    this.visSVG.selectAll("g.context")
        .transition()
        .duration(duration)
        .style("opacity", show ? 1 : 0);
};


AbstractVis.prototype.extendHullToVis = function(duration,callback){
    var bbox = this.getBBox();
    this.selectionHull.setToPts([
        [this.posX, this.posY],
        [this.posX, this.posY+bbox.height],
        [this.posX+bbox.width,this.posY+bbox.height],
        [this.posX+bbox.width,this.posY]
    ],duration, function(){
        callback.call();
    });
};

AbstractVis.prototype.fadeHullToVis = function(duration,callback){
    var vis_done = false, hull_done = false;
    var $this = this;

    this.setHullOpacity(0,duration,function(){hull_done = true; checkDone()});
    this.setOpacity(1,duration,function(){vis_done = true; checkDone()});

    function checkDone(){
        if(vis_done && hull_done){
            //remove the hull
            d3.select("#hulls-"+$this.vid)
                .remove();
            callback.call();
        }
    }
};

AbstractVis.prototype.setHullOpacity = function(opacity,duration,callback){
    this.selectionHull.setOpacity(opacity,duration,callback);
};

AbstractVis.prototype.setOpacity = function(opacity,duration,callback){
    if(duration == null) duration = 0;
    this.visSVG
        .transition()
        .duration(duration)
        .style("opacity",opacity)
        .each("end", function(){callback.call()});
};



AbstractVis.prototype.drag = function(dx,dy){
    //console.log("drag",dx,dy);
    this.moveTo(this.posX+dx,this.posY+dy,function(){});
};


AbstractVis.prototype.moveTo = function(x,y,callback,duration){
    this.posX = x;
    this.posY = y;

    if(duration){
        this.visSVG
            .transition()
            .duration(duration)
            .attr("transform", "translate(" + this.posX + "," + this.posY + ")");
        this.animateNodesLinks(duration,function(){
            callback.call();
        });
        this.sequence.updateGlobalFlow(duration);
    }
    else{
        this.visSVG
            .attr("transform", "translate(" + this.posX + "," + this.posY + ")");
        this.animateNodesLinks(0,function(){
            callback.call();
        });
        this.sequence.updateGlobalFlow();
    }
};


AbstractVis.prototype.create = function(centerX, centerY, callback) {
    //console.log("create abstractVis", this.vid, this.entry, this.exit, this.nodes, this.links, centerX, centerY);

    this.getContextData();

    var bbox = this.getBBox();
    this.posX = centerX-bbox.width/2;
    this.posY = centerY-bbox.height/2;

    callback.call();
};

AbstractVis.prototype.putInsideSvg = function(callback){
    //if goes out on the left
    this.posX = Math.max(this.posX, this.padding);
    //if goes out on the right
    this.posX = Math.min(this.posX, parseInt(this.svg.attr("width"))-this.getBBox().width-this.padding);
    //if goes out on the top
    this.posY = Math.max(this.posY, this.padding);
    //if goes out on the bottom
    this.posY = Math.min(this.posY, parseInt(this.svg.attr("height"))-this.getBBox().height-this.padding);

    callback.call();
};

AbstractVis.prototype.createVisSVG = function(centerX,centerY,callback){
    var $this = this;
    var squareSize = 10;

    var drag = d3.behavior.drag()
        .origin(Object)
        .on("drag", dragMove);

    this.visSVG = this.svg
        .selectAll(".subChainNode[id='vis"+this.vid+"']")
        .data([{x:0, y:0}]);

    this.visSVG
        .enter()
        .insert("svg:g", ".link")
        .attr("class", "subChainNode")
        .attr("id", "vis"+this.vid)
        .style("opacity", 0);

    //background of the visu
    this.visSVG
        .append("rect")
        .attr("class","background")
        .style("fill-opacity",1)
        .attr("width", this.w)
        .attr("height", this.h);

    var dragSquare = this.visSVG.selectAll(".dragSquare")
        .data([{x:0,y:0,width:$this.w,height:$this.h}])
        .enter()
        .append("g")
        .attr("class", "dragSquare")
        .attr("transform", function(d){return "translate("+[d.x, d.y]+")"})
        .style("fill-opacity",0)
        .style("stroke-opacity",0)
        .on("mouseover", function(d){
            d3.select(this).style("cursor", "move")
        })
        .call(drag);

    dragSquare.append("rect")
        .attr("width",function(d){return d.width})
        .attr("height",function(d){return d.height});

    this.visSVG
        .on("mouseover", function(d){
            d3.select(this).style("cursor", "move");
            if($this.isSelected) return;
            $this.sequence.overVis($this.vid);
        })
        .on("mouseout", function(d){
            if($this.isSelected) return;
            $this.sequence.exitVis($this.vid);
        })
        .on("click", function(){
            $this.sequence.clickVis($this.vid);
        });

    var bbox = this.getBBox();
    this.posX = centerX-bbox.width/2;
    this.posY = centerY-bbox.height/2;

    function dragMove(d){
        d.x = d3.event.x;
        d.y = d3.event.y;
        $this.drag(d.x, d.y);
    }

    function moveArrow(x,y,size){
        return "m"+[size/2,size]+" "+
            "l"+[-size/8,-size/8]+" "+
            [size/4,0]+" "+
            [-size/8,size/8]+" "+
            [0,-size]+" "+
            [size/8,size/8]+" "+
            [-size/4,0]+" "+
            [size/8,-size/8]+" "+//end of vertical arrow
            "m"+[-size/2,size/2]+" "+
            "l"+[size/8,size/8]+" "+
            [0,-size/4]+" "+
            [-size/8,size/8]+" "+
            [size,0]+" "+
            [-size/8,-size/8]+" "+
            [0,size/4]+" "+
            [size/8,-size/8];
    }

    callback.call();
};

AbstractVis.prototype.overVis = function(){
    this.visSVG.selectAll(".dragSquare")
        .style("stroke-opacity",1)
        .style("fill-opacity",.2)
        .select("rect")
        .style("stroke",OVER_OBJECT_COLOR)
        .style("fill",OVER_OBJECT_COLOR);
};
AbstractVis.prototype.exitVis = function(){
    this.visSVG.selectAll(".dragSquare")
        .style("stroke-opacity",0)
        .style("fill-opacity",0)
        .select("rect")
        .style("stroke","black")
        .style("fill","white");
};

AbstractVis.prototype.putDragSquareOnTop = function(){
    //reinsert the dragsquare group on top of the visu
    this.visSVG.selectAll(".dragSquare").each(function(){
        var sel = d3.select(this);
        sel.moveToFront();
    });
};

AbstractVis.prototype.setSelected = function(isSelected){
    //console.log(this.vid+" now "+isSelected);
    var $this = this;
    if(this.isSelected == isSelected) return;
    this.isSelected = isSelected;
    if(isSelected){
        this.visSVG.select(".dragSquare")
            .style("stroke-opacity",1)
            .style("fill-opacity",.2)
            .select("rect")
            .style("stroke",SELECTED_OBJECT_COLOR)
            .style("fill",SELECTED_OBJECT_COLOR);
    }
    else{
        this.visSVG.select(".dragSquare")
            .style("stroke-opacity",0)
            .style("fill-opacity",0)
            .select("rect")
            .style("stroke","black")
            .style("fill","white");
    }
};

AbstractVis.prototype.getBBox = function(){
    return this.visSVG.node().getBBox();
};

AbstractVis.prototype.getPosition = function(){
    return {x: this.posX, y: this.posY};
};

AbstractVis.prototype.createHull = function(){
    this.selectionHull = new SelectionHull(1);
    this.selectionHull.create(this.vid, this.nodes);
    this.selectionHull.setAttribute("type", this.type);
};

AbstractVis.prototype.removeHull = function(){
    layerHulls.select("#hulls-"+(this.vid+1)).remove();
};

AbstractVis.prototype.destroy = function() {
    //console.log("destroy vis "+this.vid);
    this.removeHull();
    this.visSVG.remove();
};

/*
 Set a new posX and posY, but does not change the actual position of the visu
 The effective change is done when applyNewPosition is called
 */
AbstractVis.prototype.setPosition = function(pos){
    this.posX = pos.x;
    this.posY = pos.y;
};

AbstractVis.prototype.applyNewPosition = function(duration,callback){
    var $this = this;
    //console.log("apply",this.posX, this.posY);
    this.visSVG
        .transition()
        .duration(duration)
        .attr("transform", "translate(" + this.posX + "," + this.posY + ")")
        .each("end", function(){callback.call()});
};


/*
 Set the visu at a fixed position or not (will impact the result of canMove)
 */
AbstractVis.prototype.fixPosition = function(isFixed){
    this.isFixed = true;
};

AbstractVis.prototype.setInFieldCorner = function(whichCorner){
    switch(whichCorner){
        case "top-left":
            this.posX = this.svg.attr("width") - this.getBBox().width;
            this.posY = 0;
            break;
        case "top-right":
            this.posX = this.svg.attr("width") - this.getBBox().width;
            this.posY = this.svg.attr("height") - this.getBBox().height;
            break;
        case "bottom-left":
            this.posX = 0;
            this.posY = 0;
            break;
        case "bottom-right":
            this.posX = 0;
            this.posY = this.svg.attr("height") - this.getBBox().height;
            break;
        default: throw "Illegal argument whichCorner="+whichCorner;
    }
};

AbstractVis.prototype.getCenter = function(){
    return {
        x: this.posX+this.getBBox().width/2,
        y: this.posY+this.getBBox().height/2
    };
};

AbstractVis.prototype.setCenter = function(center){
    this.posX = center.x - this.getBBox().width/2;
    this.posY = center.y - this.getBBox().height/2;
};

/*
 return true if this and vis overlap
 */
AbstractVis.prototype.overlap = function(vis){
    var this_bbox = this.getBBox();
    var vis_bbox = vis.getBBox();
    var this_center = this.getCenter();
    var vis_center = vis.getCenter();

    var distX = Math.abs(this_center.x - vis_center.x),//x difference
        distY = Math.abs(this_center.y - vis_center.y),//y difference
        neededDistX = this_bbox.width/2 + vis_bbox.width/2+this.padding,//needed x distance
        neededDistY = this_bbox.height/2 + vis_bbox.height/2+this.padding;//needed y distance
    //if overlap
    return (distX < neededDistX && distY < neededDistY);
};

AbstractVis.prototype.canMove = function(dMove){
    if(this.isFixed){
        return {left: false, right: false, up: false, down: false};
    }

    return {
        left: this.posX-dMove-this.padding >= 0,
        right: this.posX+dMove+this.getBBox().width+this.padding <= this.svg.attr("width"),
        up: this.posY-dMove-this.padding >= 0,
        down: this.posY+dMove+this.getBBox().height+this.padding <= this.svg.attr("height")
    };
};
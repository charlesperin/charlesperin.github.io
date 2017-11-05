
SimpleNodeVis = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.visType = "SimpleNodeVis";

    if(this.nodes.length > 1) throw "SimpleNodeVis can only contain one node, here "+this.nodes.length;
    if(this.links.length > 0) throw "SimpleNodeVis can not contain any link, here "+this.links.length;
};

//inherits AbstractVis prototypes
SimpleNodeVis.prototype = Object.create(AbstractVis.prototype);


SimpleNodeVis.prototype.create = function(centerX, centerY, callback) {
    //console.log("create SimpleNodeVis", this.vid, this.nodes, this.links, centerX, centerY);
    var $this = this;
    this.w = 30;
    this.h = 30;

    this.createVisSVG(centerX,centerY,function(){
        $this.visSVG.select(".background")
            .style("stroke","none");
        $this.putDragSquareOnTop();

        callback.call();
    });

};


SimpleNodeVis.prototype.drawNode = function(){

};

SimpleNodeVis.prototype.animateNodesLinks = function(duration, callback){
    var $this = this;
    var okNodes = getFalseArray(this.nodes),
        okHull = $this.selectionHull == undefined;

    var center = $this.getCenter();
    //transform selected nodes
    this.nodes.forEach(function(node,n){
        d3.selectAll(".node").filter(function(d) {
            if(d.index==node) {
                d.transform = d3.transform("translate("+center.x+","+center.y+")");
                return d;
            }
        })
            .transition()
            .duration(duration)
            .attr("data-simplenodevis", function(d) { return "vid_" + d.vid;})
            .attr("transform", function(d){return "translate("+d.transform.translate[0]+","+ d.transform.translate[1]+")"})
            .call(function(){$this.sequence.updateBetweenVisLinksFromNodeInVis(node,duration)})
            .each("end", function(){okNodes[n]=true; transitionEnded();});
    });

    $this.selectionHull.animateWithNodesTransition(duration, function(){
        okHull = true;
        transitionEnded();
    });

    function transitionEnded(){
        //if all nodes and links have ended their transition, call the callback
        if(checkTrueArray(okNodes) && okHull) {
            callback.call();
        }
    }


};

/*
 Change the aspect of the nodes in the visualization
 */
SimpleNodeVis.prototype.applyNodesLinksStyle = function(duration, callback){
    var $this = this;
    var okNodes = getFalseArray(this.nodes);
    var callbackCalled = false;

    this.nodes.forEach(function(node,n){
        var the_nodes = d3.selectAll(".node").filter(function(d) {
            if(d.index==node)
                return d;
        });
        the_nodes.selectAll("path.node-fg,path.node-bg")
            .transition()
            .duration(duration)
            .attr("d", $this.data.getNodePath($this.data.nodeRadius))
            .style("fill", "white")
            .each("end", function(){okNodes[n]=true; transitionEnded();});
    });

    function transitionEnded(){
        //console.log(callbackCalled,checkTrueArray(okNodes));
        if(!callbackCalled && checkTrueArray(okNodes)) {
            callbackCalled;
            callback.call();
        }
    }
};

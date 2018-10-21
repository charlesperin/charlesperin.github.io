
CloudPassVis = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.visType = "CloudPassVis";
    this.formation = this.sequence.data.formation;

    //called at the end of the constructor
    this.getContextData();
};

//inherits AbstractVis prototypes
CloudPassVis.prototype = Object.create(AbstractVis.prototype);

/*
 Overrides the AbstractVis method
 */
CloudPassVis.prototype.getContextData = function(){
    var pids = this.sequence.nodes.map(function(d){return d.pid});
    this.context_data = this.sequence.data.getContextGraphPass(
        this.context,
        pids
    );
};


/*
 Initialize the context
 */
CloudPassVis.prototype.drawContext = function(){
    var $this = this;


};

CloudPassVis.prototype.create = function(centerX, centerY, callback) {
    //console.log("create abstractVis", this.vid, this.entry, this.exit, this.nodes, this.links, centerX, centerY);
    var $this = this;

    var pids = this.nodes.map(function(nid){
        return $this.sequence.nodes[nid].pid;
    });
    pids = removeDuplicateValues(pids);
    pids = removeNullValues(pids);

    var players = pids.map(function(pid){
        var player = $this.formation.getPlayerInfos(pid);
        return {
            pid: player.pid,
            text: player.display_name,
            size: 0
        }
    });

    this.nodes.forEach(function(node){
        for(var p in players){
            if(players[p].pid == $this.sequence.nodes[node].pid){
                players[p].size++;
                break;
            }
        }
    });

    console.log("players",players);

    var size = Math.max(150,d3.sum(players,function(d){return d.size*10}));
    this.w = size;
    this.h = size;

    this.createVisSVG(centerX,centerY, function(){

        var size = d3.scale.linear().domain([1,d3.max(players, function(d){return d.size})]).range([10,20]);
        var fill = d3.scale.category20();

        d3.layout.cloud().size([$this.w, $this.h])
            .words(players)
            .rotate(function(d) { return 0 })
            .font("Impact")
            .fontSize(function(d) { return size(d.size); })
            .on("end", draw)
            .start();

        function draw(words) {
            $this.visSVG
                .append("g")
                .attr("transform", "translate("+[$this.w/2,$this.h/2]+")")
                .selectAll("text.word")
                .data(words)
                .enter()
                .append("text")
                .attr("class","word")
                .style("font-size", function(d) { return d.size + "px"; })
                .attr("pid",function(d){return d.pid})
                .style("font-family", "Impact")
                .style("fill", function(d, i) { return fill(i); })
                .attr("text-anchor", "middle")
                .attr("transform", function(d) {
                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                })
                .text(function(d) { return d.text; });
        }

        $this.putDragSquareOnTop();
        callback.call();
    });

};


CloudPassVis.prototype.drawNode = function(){

    //this.drawContext();



};

CloudPassVis.prototype.animateNodesLinks = function(duration, callback){
    var $this = this;
    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links),
        okHull = $this.selectionHull == undefined;

    //transform selected nodes
    this.nodes.forEach(function(node,n){
        d3.selectAll(".node").filter(function(d) {
            if(d.index==node) {
                var newTx,newTy;
                var the_word = undefined, tNode = undefined;
                d3.select("text.word[pid='"+$this.sequence.nodes[node].pid+"']").each(function(d){
                    the_word = this;
                    tNode = [d.x, d.y];
                });

                newTx = $this.getCenter().x + tNode[0];
                newTy = $this.getCenter().y + tNode[1];
                d.transform = d3.transform("translate("+newTx+","+newTy+")");
                return true;
            }
            return false;
        })
            .transition()
            .duration(duration)
            .attr("data-cloudpassvis", function(d) { return "vid_" + d.vid;})
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
            .attr("data-cloudpassvis", function(d) {return "vid_" + d.vid;})
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
        if(checkTrueArray(okNodes) && /*checkTrueArray(okLinks) &&*/ okHull) {
            callback.call();
        }
    }
};

/*
 Change the aspect of the nodes in the visualization
 */
CloudPassVis.prototype.applyNodesLinksStyle = function(duration, callback){

    var $this = this;

    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links);

    //console.log("APPLYNODESLINKSSTYLE for graphpassvis");

    //no concern about circle nodes because in graphpass, there can't be some
    this.nodes.forEach(function(node,n){
        var the_node = d3.selectAll(".node").filter(function(d) {
            return (d.index==node);
        });
        the_node
            .selectAll("path.node-fg,path.node-bg")
            .transition()
            .duration(duration)
            .style("fill","white")
            .style("stroke-width",1)
            .style("opacity",0)
            .attr("d", function(d){
                return $this.data.getNodePath($this.sequence.data.nodeRadius);
            })
            .each("end", function(){okNodes[n]=true; transitionEnded();});

        the_node.selectAll("text")
            .transition()
            .duration(duration)
            .style("opacity",0);
    });

    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            return (d.source==link.source && d.target == link.target);
        })
            .selectAll("path")
            .transition()
            .duration(duration)
            .attr("marker-end", "")
            .style("opacity",0)
            .style("stroke-width",.5)
            .each("end", function(){okLinks[l]=true; transitionEnded();});
    });

    function transitionEnded(){
        if(checkTrueArray(okNodes) && checkTrueArray(okLinks)) {
            //console.error("APPLYNODESLINKSSTYLE OK");
            callback.call();
        }
    }

};


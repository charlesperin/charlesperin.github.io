
MatrixPassVis = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.visType = "MatrixPassVis";
    this.formation = this.sequence.data.formation;

    this.context = CONTEXT_INVOLVED_PLAYERS;
    //called at the end of the constructor
    this.getContextData();
};

//inherits AbstractVis prototypes
MatrixPassVis.prototype = Object.create(AbstractVis.prototype);

/*
 Overrides the AbstractVis method
 */
MatrixPassVis.prototype.getContextData = function(){
    var $this = this;
    var pids = this.nodes.map(function(n){return $this.sequence.nodes[n].pid});
    pids = removeDuplicateValues(pids);
    pids = removeNullValues(pids);

    this.context_data = this.sequence.data.getContextMatrixPass(
        this.context,
        pids
    );
};

/*
 Initialize the context TODO
 */
MatrixPassVis.prototype.drawContext = function(){
    var $this = this;

    var nbPassMax = $this.data.nbPassMax;
    var opacity_scale = d3.scale.pow().domain([0,nbPassMax]).range([0,1]);
    var cell_width = this.x_scale.rangeBand();

    var context_group = this.visSVG
        .insert("svg:g", ".dragSquare")
        .attr("class","context");

    context_group.selectAll(".heatmap_square")
        //do not draw the val=0 squares
        .data(this.context_data)
        .enter()
        .append("svg:rect")
        .attr("class", "heatmap_square")
        .attr("x", function(d){
            return $this.x_scale($this.indexPlayers[d.source]);
        })
        .attr("y", function(d){
            return $this.x_scale($this.indexPlayers[d.target]);
        })
        .style("stroke-width", 0)
        .style("fill-opacity", function(d){
            return opacity_scale(d.nb);
        })
        .style("fill", function(){
            return "black";
        })
        .attr("width", cell_width)
        .attr("height", cell_width);
};


MatrixPassVis.prototype.create = function(centerX, centerY, callback){
    var $this = this;

    var players = this.nodes.map(function(d){
        return $this.formation.getPlayerInfos($this.sequence.nodes[d].pid);
    });
    players = removeDuplicateValues(players);
    players = removeNullValues(players);

    this.w = this.data.nodeRadius * players.length;
    this.h = this.w;

    this.x_scale = d3.scale.ordinal().rangeBands([0, this.w]);

    /*
     The stuff to display the matrix
     */

    //build the_nodes - only take the pass nodes
    this.the_nodes = [];
    this.nodes.forEach(function(nid,n){
        var pid = $this.sequence.nodes[nid].pid;
        var player = $this.data.getPlayer($this.sequence.nodes[nid].pid);

        var existing = undefined;
        for(var n in $this.the_nodes){
            if($this.the_nodes[n].pid == pid){
                existing = $this.the_nodes[n];
                break;
            }
        }
        if(existing){
            existing.nodeIndexes.push(n);
        }
        else{
            $this.the_nodes.push({
                pid: $this.sequence.nodes[nid].pid,
                last_name: player.last_name.split(" ")[0],
                pos_in_formation: player.pos_in_formation,
                jersey: player.jersey,
                position: player.position,
                positionGroup: 0,
                nodeIndexes: [n]
            });
        }
    });

    var matrix = [];

    var n = this.the_nodes.length;

    //the map associating to each index the pid
    var indexPlayers = {};
    this.indexPlayers = indexPlayers;
    var mapPlayers = {};
    this.the_nodes.forEach(function(node, i) {
        indexPlayers[node.pid] = i;
        mapPlayers[i] = node.pid;
    });
    this.indexPlayers = indexPlayers;

    // Compute index per node.
    this.the_nodes.forEach(function(node, i) {
        node.index = i;
        matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, nbPass: 0}; });
    });

    //At the beginning, empty matrix
    for(var i=0; i<matrix.length; i++)
        for(var j=0; j<matrix.length; j++)
            matrix[i][j] = 0;


    // Precompute the orders.
    this.orders = {
        last_name: d3.range(n).sort(function(a, b) { return d3.ascending($this.the_nodes[a].last_name, $this.the_nodes[b].last_name); }),
        pos_in_formation: d3.range(n).sort(function(a, b) { return $this.the_nodes[a].pos_in_formation - $this.the_nodes[b].pos_in_formation; }),
        jersey: d3.range(n).sort(function(a, b) { return $this.the_nodes[a].jersey - $this.the_nodes[b].jersey; }),
        position: d3.range(n).sort(function(a, b) { return d3.ascending($this.the_nodes[a].positionGroup, $this.the_nodes[b].positionGroup); }),
        incoming: null,
        outgoing: null,
        total: null
    };

    this.ordersArray = [];
    for(var o in this.orders) {
        this.ordersArray.push(o);
    }

    // The default sort order.
    this.x_scale.domain(this.orders.position);


    this.createVisSVG(centerX,centerY, function(){

        //$this.visSVG.style("opacity",1).style("fill-opacity",1).style("stroke-opacity",1);

        var row = $this.visSVG.selectAll(".rowVisuSquareMatrixPass")
            .data(matrix)
            .enter().append("g")
            .attr("class", "rowVisuSquareMatrixPass")
            .attr("transform", function(d, i) { return "translate(0," + $this.x_scale(i) + ")"; })
            .each(doRow);

        var column = $this.visSVG.selectAll(".columnVisuSquareMatrixPass")
            .data(matrix)
            .enter().append("g")
            .attr("class", "columnVisuSquareMatrixPass")
            .attr("transform", function(d, i) { return "translate(" + $this.x_scale(i) + ")rotate(-90)"; });

        column.append("text")
            .attr("x", 7)
            .attr("y", $this.x_scale.rangeBand() / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "start")
            .style("fill", "black")
            .text(function(d, i) { return $this.the_nodes[i].last_name; });

        //the grid
        column.append("line")
            .attr("class", "gridVisuSquareMatrixPass")
            .attr("x1", -$this.w);
        column.append("line")
            .attr("class", "gridVisuSquareMatrixPass")
            .attr("y1", $this.x_scale.rangeBand())
            .attr("y2", $this.x_scale.rangeBand())
            .attr("x1", -$this.w);
        row.append("line")
            .attr("class", "gridVisuSquareMatrixPass")
            .attr("x2", $this.w);
        row.append("line")
            .attr("class", "gridVisuSquareMatrixPass")
            .attr("x2", $this.w)
            .attr("y1", $this.x_scale.rangeBand())
            .attr("y2", $this.x_scale.rangeBand());


        $this.putDragSquareOnTop();
        callback.call();
    });


    function doRow(row) {
        var cell = d3.select(this).selectAll(".cellVisuSquareMatrixPass")
            .data(row)
            .enter()
            .append("g")
            .attr("transform", function(d){return "translate("+$this.x_scale(d.x)+",0)"})
            .attr("class", "cellVisuSquareMatrixPass");

        cell.append("rect")
            .attr("width", $this.x_scale.rangeBand())
            .attr("height", $this.x_scale.rangeBand())
            .style("fill-opacity", 0)
            .style("fill", "white");
    }

};


MatrixPassVis.prototype.drawNode = function(){
    this.drawContext();
    //this.drawOrders();
    //this.changeOrder(this.ordersArray[3]);
};


MatrixPassVis.prototype.animateNodesLinks = function(duration, callback){

    var $this = this;
    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links),
        okHull = $this.selectionHull == undefined;

    //transform selected nodes
    this.nodes.forEach(function(node,n){
        d3.selectAll(".node").filter(function(d) {
            if(d.index==node) {
                var newTx,newTy;
                var index = $this.indexPlayers[$this.sequence.nodes[d.index].pid];
                newTx = $this.posX + $this.x_scale(index) + $this.data.nodeRadius/2;
                newTy = $this.posY + $this.x_scale(index) + $this.data.nodeRadius/2;
                d.transform = d3.transform("translate("+newTx+","+newTy+")");
                return true;
            }
            return false;
        })
            .transition()
            .duration(duration)
            .attr("data-matrixpassvis", function(d) { return "vid_" + d.vid;})
            .attr("transform", function(d){return "translate("+d.transform.translate[0]+","+ d.transform.translate[1]+")"})
            .call(function(){$this.sequence.updateBetweenVisLinksFromNodeInVis(node,duration)})
            .each("end", function(){okNodes[n]=true; transitionEnded();});
    });
    //transform selected links
    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            if(d.source==link.source && d.target == link.target) {
                d.newLine = $this.sequence.getSquareLinkCoords(link);
                return true;
            }
            return false;
        })
            .selectAll("path")
            .transition()
            .duration(duration)
            .attr("data-matrixpassvis", function(d) {return "vid_" + d.vid;})
            .attr("d", function(d){return getLine("linear")(d.newLine)})
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


MatrixPassVis.prototype.applyNodesLinksStyle = function(duration,callback){

    var $this = this;

    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links);

    var rectPath = getRectPath($this.data.nodeRadius);

    //no concern about circle nodes because in graphpass, there can't be some
    this.nodes.forEach(function(node,n){
        var the_nodes = d3.selectAll(".node").filter(function(d) {
            return (d.index==node);
        });
        the_nodes
            .selectAll("path.node-fg,path.node-bg")
            .transition()
            .duration(duration)
            .style("fill", function(d){
                if(d.index == $this.entry || d.index == $this.exit){
                    return "green";
                }
                else{
                    return "white";
                }
            })
            .style("stroke-width",.5)
            .style("opacity",1)
            .attr("d", rectPath)
            .each("end", function(){okNodes[n]=true; transitionEnded();});

        the_nodes.selectAll("text")
            .transition()
            .duration(duration)
            .style("font-size",8)
            .style("opacity",1);

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
            .style("stroke-width",1)
            .each("end", function(){okLinks[l]=true; transitionEnded();});
    });


    function transitionEnded(){
        if(checkTrueArray(okNodes) && checkTrueArray(okLinks)) {
            //console.error("APPLYNODESLINKSSTYLE OK");
            callback.call();
        }
    }

    function getRectPath(w){
        return "m "+(0)+" "+(-w/2)+" "+
            "h "+(-w/2)+" "+
            "v "+(w)+" "+
            "h "+(w)+" "+
            "v "+(-w)+" "+
            "z ";
    }

};
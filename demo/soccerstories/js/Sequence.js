Sequence = function(sequence, _data, sid){
    for(var s in sequence){
        this[s] = sequence[s];
    }
    this.data = _data;
    this.sid = sid;
    this.visPadding = 10;
    this.visList = [];
};

Sequence.prototype.init = function(){
    this.computeNodeLinks();
    this.computeSignature();
};

Sequence.prototype.destroy = function(){
    this.visList.forEach(function(d){
        d.destroy();
    });
    this.visList = [];

    var group = this.data.field.fieldGroup;

    group.selectAll(".node").remove();
    group.selectAll(".link").remove();
    group.selectAll(".subChainNode").remove();
    group.selectAll(".subChainLink").remove();
    group.selectAll(".globalFlow").remove();
    layerHulls.selectAll(".hulls").remove();
    d3.select("#svg1").selectAll(".timelineLink").remove();
};

Sequence.prototype.clusterize = function(duration, delay){

    var $this = this;

    var x_scale = this.data.field.x_scale,
        y_scale = this.data.field.y_scale;

    this.autoCreateVisList(x_scale, y_scale, function(){
        d3.selectAll(".node,.link").style("opacity",1);

        console.log("----> subChains done: ("+$this.links.length+" links, "+$this.nodes.length+" nodes, "+$this.visList.length+" subchains");

        //layout the visualizations
        $this.autoLayout(duration, delay, "2D", true);
        $this.data.textAutoVis.sequenceIsClusterized();
    });
};



/*---------------------------------------
 STUFF ABOUT LAYOUT
 --------------------------------------*/




//layout algo to horizontally align the visus
Sequence.prototype.layoutHorizontal = function(callback){
    var $this = this;

    var MIN_ALPHA = 0;
    var MAX_ITER = 500;

    var alpha = Number.MAX_VALUE;
    var i = 0;

    var y_margin = 150;
    var alignHeight = d3.max($this.visList, function(d){return d.getBBox().height});

    var y_scale = d3.scale.linear().domain([0,parseInt($this.data.field.fieldGroup.attr("height"))]).range([y_margin,alignHeight+y_margin]);

    while(alpha > MIN_ALPHA && i < MAX_ITER){

        alpha = 0;
        i++;

        var x = 0;
        $this.visList.forEach(function(vis,i){
            vis.posX = x
            var newY = y_scale(vis.posY);
            if(newY+vis.getBBox().height > y_scale.range()[1]){
                newY = y_scale.range()[1]-vis.getBBox().height;
            }

            vis.posY = newY;
            x += vis.getBBox().width+10;
        });
        //console.log(alpha,i);
    }
    callback.call();
};

//Hand-made layout algo to fit on the field
Sequence.prototype.layout2D = function(callback){
    var $this = this;

    //restart the layout
    restart();

    function restart() {

        var MIN_ALPHA = 0;
        var MOVE_STEP = 1;
        var MAX_ITER = 500;

        doLayout();

        //layout the vis such as they don't overlap
        function doLayout(){

            //if a corner, put it in the corner of the field
            $this.visList.forEach(function(vis){
                if(vis.translate2D != undefined) vis.setPosition(vis.translate2D);
                if(vis.type == SUB_CHAIN_TYPE_PASS_CORNER){
                    if(vis.fromRight == undefined) throw "the visu must have a fromRight attribute ! "+this.fromRight;
                    if(vis.fromRight){
                        vis.setInFieldCorner("top-right");
                    }
                    else{
                        vis.setInFieldCorner("top-left");
                    }
                    vis.fixPosition(true);
                }
                if(vis.type == SUB_CHAIN_TYPE_SIMPLE_NODE){
                    vis.fixPosition(true);
                }
            });

            var alpha = Number.MAX_VALUE;
            var i = 0;
            while(alpha > MIN_ALPHA && i < MAX_ITER){

                alpha = 0;
                i++;

                $this.visList.forEach(function(vis){
                    var visCanMove = vis.canMove(MOVE_STEP);
                    var centerVis = vis.getCenter();

                    $this.visList.forEach(function(vis2){
                        if(vis==vis2) return;
                        var vis2CanMove = vis2.canMove(MOVE_STEP);
                        var centerVis2 = vis2.getCenter();

                        if(vis.overlap(vis2)){
                            if(centerVis.x<centerVis2.x){//vis moves left
                                if(visCanMove.left)
                                    centerVis.x -= MOVE_STEP;
                                if(vis2CanMove.right)
                                    centerVis2.x += MOVE_STEP;
                            }
                            else{//vis moves right
                                if(visCanMove.right)
                                    centerVis.x += MOVE_STEP;
                                if(vis2CanMove.left)
                                    centerVis2.x -= MOVE_STEP;
                            }
                            if(centerVis.y<centerVis2.y){//vis moves up
                                if(visCanMove.up)
                                    centerVis.y -= MOVE_STEP;
                                if(vis2CanMove.down)
                                    centerVis2.y += MOVE_STEP;
                            }
                            else{//vis moves down
                                if(visCanMove.down)
                                    centerVis.y += MOVE_STEP;
                                if(vis2CanMove.up)
                                    centerVis2.y -= MOVE_STEP;
                            }
                            vis.setCenter(centerVis);
                            vis2.setCenter(centerVis2);

                            if(vis.overlap(vis2)) alpha++;
                        }
                    });
                });
                //console.log(alpha,i);
            }
            callback.call();
        }
    }
};


Sequence.prototype.autoLayoutVisFirst = function(duration, delay){
    var $this = this;

    var okVis = [];
    this.visList.forEach(function(d,i){
        okVis[i] = false;
    });
    //when layouting done, update the vis and links positions
    $this.visList.forEach(function(vis,i){
        setTimeout(function(){
            vis.applyNewPosition(0, function(){
                //console.log("applynewposition done for "+i);
                //when new position done,
                //vis.drawNode(TRANSITION_DURATION);
                vis.translate2D = {x:$this.visList[i].posX, y:$this.visList[i].posY};
                if(vis.nodes.length>1 && SHOW_SEQUENCE_INFOS)
                    $this.data.timeline.seq_infos.createCluster(vis.nodes,vis.vid,vis.type,duration);
                vis.animateNodesLinks(duration, function(){
                    //console.log("animateNodesLinks done for "+i);
                    vis.drawNode();
                    vis.extendHullToVis(duration,function(){
                        //console.log("extendHullToVis done for "+i);
                        vis.applyNodesLinksStyle(duration, function(){
                            //console.log("applyNodesLinksStyle done for "+i);
                            vis.fadeHullToVis(duration, function(){
                                var indexes = [];
                                for(var j=0;j<=i;j++) indexes.push(j);
                                $this.updateGlobalFlow(500,indexes);
                                okVis[i] = true;
                                visDone();
                                //console.log("fadeHullToVis done for "+i);
                            });
                        });
                    });
                });
            });
        },i*delay)
    });

    function visDone(){
        var ok = true;
        for(var v in okVis){
            if(okVis[v]==false){
                ok = false;
                break;
            }
        }
        if(ok){
            $this.updateGlobalFlow();
        }
    }
};

Sequence.prototype.autoLayoutVis = function(duration,delay){
    var $this = this;

    var okVis = [];
    this.visList.forEach(function(d,i){
        okVis[i] = false;
    });
    //when layouting done, update the vis and links positions
    $this.visList.forEach(function(vis,i){
        setTimeout(function(){
            vis.moveTo(vis.posX, vis.posY, function(){
                $this.updateGlobalFlow(duration);
                okVis[i] = true;
                visDone();
            },duration);
        },i*delay)
    });

    function visDone(){
        var ok = true;
        for(var v in okVis){
            if(okVis[v]==false){
                ok = false;
                break;
            }
        }
        if(ok){
            $this.updateGlobalFlow();
        }
    }
};


Sequence.prototype.autoLayout = function(duration, delay, layout, isFirst){
    var $this = this;
    if(delay == undefined) delay = 0;


    switch(layout){
        case "2D":
            $this.layout2D(function(){
                layoutDone();
            });
            break;
        case "horizontal":
            $this.layoutHorizontal(function(){
                layoutDone();
            });
            break;
        default:
            throw "unknown sequenceLayout "+$this.data.sequenceLayout;
    }


    function layoutDone(){
        if(isFirst)$this.autoLayoutVisFirst(duration,delay);
        else $this.autoLayoutVis(duration,delay);
    }
};


var MIN_DIST_SHOW_RUN = 8;

function ignorePassRun(passDest, passOrig){
    return distance(passDest,passOrig) < MIN_DIST_SHOW_RUN;
}

Sequence.prototype.computeNodeLinks = function(){
    this.nodes = [];
    this.links = [];

    //console.log(this.actions);

    var nodeIndex = 0;
    for(var a = 0; a<this.actions.length; a++,nodeIndex++){
        var action = this.actions[a];

        //if a pass
        var previous_action = this.actions[a-1];
        if(action.eid == E_PASS && previous_action != undefined && previous_action.eid == E_PASS){
            //get the pass destination of the previous pass, i.e. the run start
            var passDest = getPassDestPosition(previous_action);
            var run_eid = (isLongRunAndPass(action, previous_action)) ? E_LONG_RUN : E_RUN;

            //if run too short to be considered, just add the pass
            if(run_eid == E_RUN && ignorePassRun(passDest,{x:action.x,y:action.y})){
                //add the node starting the pass
                this.nodes[nodeIndex] = {
                    index: nodeIndex,
                    unique_id: action.id,
                    additional: true,
                    after_run: true,
                    eid: action.eid,
                    pid: action.pid,
                    time: action.time,
                    x: action.x,
                    y: action.y
                };

                //add the pass link
                this.links.push({
                    source: nodeIndex,
                    target: nodeIndex+1,
                    eid: action.eid,
                    qualifiers: action.qualifiers,
                    time: action.time,
                    unique_id: action.id
                });
            }

            //if a long run or a pass and run then consider the run
            else{
                //add the node starting the run
                this.nodes[nodeIndex] = {
                    index: nodeIndex,
                    unique_id: action.id,
                    time: action.time,
                    eid: run_eid,
                    pid: action.pid,
                    x: passDest.x,
                    y: passDest.y
                };

                //add the run link
                this.links.push({
                    source: nodeIndex,
                    target: nodeIndex+1,
                    eid: run_eid,
                    qualifiers: action.qualifiers,
                    time: action.time,
                    unique_id: action.id
                });

                nodeIndex++;

                //add the node starting the pass
                this.nodes[nodeIndex] = {
                    index: nodeIndex,
                    unique_id: action.id,
                    additional: true,
                    after_run: true,
                    eid: action.eid,
                    pid: action.pid,
                    time: action.time,
                    x: action.x,
                    y: action.y
                };

                //add the pass link
                this.links.push({
                    source: nodeIndex,
                    target: nodeIndex+1,
                    eid: action.eid,
                    qualifiers: action.qualifiers,
                    time: action.time,
                    unique_id: action.id
                });
            }
        }

        //if not the last event and not a pass
        else if(a<this.actions.length-1){
            this.nodes[nodeIndex] = {
                index: nodeIndex,
                unique_id: action.id,
                time: action.time,
                eid: action.eid,
                pid: action.pid,
                x: action.x,
                y: action.y
            };

            this.links.push({
                source: nodeIndex,
                target: nodeIndex+1,
                eid: action.eid,
                qualifiers: action.qualifiers,
                time: action.time,
                unique_id: action.id
            });
        }

        //if last event, create the endShot node and the link between player doing the shot and the shot destination
        else{

            this.nodes[nodeIndex] = {
                index: nodeIndex,
                unique_id: action.id,
                pid: action.pid,
                eid: action.eid,
                time: action.time,
                x: action.x,
                y: action.y
            };

            //get the y destination of the shot
            var shotDest = getShotDestination(action);
            var shotX, shotY;
            switch(shotDest.type){
                case SHOT_DEST_TYPE_MOUTH:
                    shotX = 100;
                    shotY = shotDest.y;
                    break;
                case SHOT_DEST_TYPE_BLOCKED:
                    shotX = shotDest.x;
                    shotY = shotDest.y;
                    break;
                default: throw "unknows shot dest type in: "+shotDest;
            }

            this.nodes[nodeIndex+1] = {
                index: nodeIndex+1,
                unique_id: action.id,
                additional: true,
                time: action.time,
                eid: PID_SHOT_DEST,
                pid: PID_SHOT_DEST,
                x: shotX,
                y: shotY
            };
            this.links.push({
                source: nodeIndex,
                target: nodeIndex+1,
                eid: action.eid,
                qualifiers: action.qualifiers,
                time: action.time,
                unique_id: action.id
            });
            nodeIndex++;
        }
    }
};


/*
 create the visList automatically

 *First extract the last event: exit event (shot)
 *Then the entry event (first event in the sequence)
 *Then the last pass leading to the player doing the shot (assist)
 **There can be events between the assist and the shot, such as dribbles
 *

 Create a visualization for each subChain
 */
Sequence.prototype.autoCreateVisList = function(x_scale, y_scale, callback){
    var $this = this;

    this.getSubChains(this.nodes, this.links, function(){
        var subChains = this;

        /*----------------------------------------------
         Duplicate the nodes in two visualizations and
         change the associated visualizations entry/exit
         points
         ----------------------------------------------*/


        for(var s=0; s<subChains.length-1; s++){
            var cur = subChains[s];
            var next = subChains[s+1];

            if(cur.exit == next.entry){

                //duplicate the node and change it for the duplicated one in next
                var dupIndex = $this.nodes.length;

                //first add the node to the node list
                $this.nodes[dupIndex] = {
                    index: dupIndex,
                    unique_id: $this.nodes[cur.exit].unique_id,
                    additional: true,
                    time: $this.nodes[cur.exit].time,
                    pid: $this.nodes[cur.exit].pid,
                    x: $this.nodes[cur.exit].x,
                    y: $this.nodes[cur.exit].y
                };

                //then change the node reference in the next subchain
                next.entry = dupIndex;
                next.nodes[0] = dupIndex;

                var changed_link;
                //then update the link in this.links which has changed
                //console.log("nodes",$this.nodes,"links",$this.links);
                for(var l=0;l<$this.links.length;l++){
                    if($this.links[l].source == cur.exit){
                        changed_link = $this.links[l];
                        changed_link.source = dupIndex;
                        break;
                    }
                }

                //then add the new link between the node and its doppleganger
                var new_link = {
                    source: cur.exit,
                    target: dupIndex,
                    eid: E_DUPLICATE,
                    qualifiers: [],
                    time: changed_link.time,
                    unique_id: changed_link.unique_id
                };
                $this.links.push(new_link);
                //$this.links.splice($this.links.indexOf(changed_link),0, new_link);

            }
        }

        //create the intermediate points freshly created as well as the new links
        $this.drawNodeLink(function(){
            /*----------------------------------------------
             Create the visualization associated to each type
             ----------------------------------------------*/
            subChains.forEach(function(d,i){
                var params = {
                    sequence: $this,
                    data: $this.data,
                    type: d.type,
                    nodes: d.nodes,
                    links: d.links,
                    entry: d.entry,
                    exit: d.exit,
                    svg: $this.data.field.fieldGroup,
                    vid: i,
                    padding: $this.visPadding,
                    context: CONTEXT_ALL_PLAYERS,
                    hull: true
                };

                switch(d.type){
                    case SUB_CHAIN_TYPE_PASS_CENTRE:
                    case SUB_CHAIN_TYPE_PASS_CORNER:
                        $this.visList[i] = new CentreVis(params);
                        break;
                    case SUB_CHAIN_TYPE_SHOT:
                        $this.visList[i] = new ShotsVis(params);
                        break;
                    case SUB_CHAIN_TYPE_LONG_RUN:
                        $this.visList[i] = new LongRunVis(params);
                        break;
                    case SUB_CHAIN_TYPE_PASS_CLUSTER:
                        switch($this.data.passClusterStyle){
                            case "Node-link":
                                $this.visList[i] = new GraphPassVis(params);
                                break;
                            case "Node-link-all":
                                $this.visList[i] = new GraphPassVisComplete(params);
                                break;
                            case "HivePlot":
                                $this.visList[i] = new HivePlotVis(params);
                                break;
                            case "TagCloud":
                                $this.visList[i] = new CloudPassVis(params);
                                break;
                            case "Matrix":
                                $this.visList[i] = new MatrixPassVis(params);
                                break;
                            default: throw "unknown passClusterStyle "+$this.data.passClusterStyle;
                        }
                        break;
                    case SUB_CHAIN_TYPE_SIMPLE_NODE:
                        $this.visList[i] = new SimpleNodeVis(params);
                        break;
                    default:
                        throw "unknown type "+d.type;
                    //$this.visList[i] = new AbstractVis(params);
                }

                //create the visualization

                /*only take the centroid of entry and exit points
                 var cx = x_scale(d3.mean([d.entry, d.exit], function(n){return $this.nodes[n].x}));
                 var cy = y_scale(d3.mean([d.entry, d.exit], function(n){return $this.nodes[n].y}));
                 */
                //If take the centroid of all points
                var cx = x_scale(d3.mean(d.nodes, function(n){return $this.nodes[n].x}));
                var cy = y_scale(d3.mean(d.nodes, function(n){return $this.nodes[n].y}));


                $this.visList[i].create(parseInt(cx),parseInt(cy), function(){
                    $this.visList[i].putInsideSvg(function(){

                    });
                });
            });

            callback.call();
        });

    });
};


Sequence.prototype.getSubChains = function(nodes, links, callback){
    var $this = this;
    var subChains = [];
    //console.log(this);

    //Then the other events
    if(links.length==0) done();
    else{
        //clusterize all the events between entry point and the shot
        for (linkIndex = 0; linkIndex < links.length; linkIndex++) {
            var link = links[linkIndex];
            var passCat;

            //if the final shot
            if(linkIndex == links.length-1){
                if(C_SHOT.indexOf(links[linkIndex].eid)==-1){
                    alert("You are stuck...It's a known bug.\n Please refresh the page.");
                    throw "last link must be a shot: "+JSON.stringify(links[linkIndex]);
                }
                subChains.push({
                    type: SUB_CHAIN_TYPE_SHOT,
                    entry: link.source,
                    exit: link.target,
                    links: [link],
                    nodes: [link.source,link.target],
                    time: link.time
                });
            }

            //if a non-pass event
            if (link.eid != E_PASS) {
                //if a long run
                if(link.eid == E_LONG_RUN){
                    subChains.push({
                        type: SUB_CHAIN_TYPE_LONG_RUN,
                        entry: link.source,
                        exit: link.target,
                        links: [link],
                        nodes: [link.source,link.target],
                        time: link.time
                    });
                }
            }
            //if a centre or a corner
            else if ((passCat = getPassCategory(link, nodes[link.source])) != SUB_CHAIN_TYPE_PASS_STANDARD) {
                if(passCat == SUB_CHAIN_TYPE_PASS_CENTRE || passCat == SUB_CHAIN_TYPE_PASS_CORNER){
                    subChains.push({
                        type: passCat,
                        entry: link.source,
                        exit: link.target,
                        links: [link],
                        nodes: [link.source,link.target],
                        time: link.time
                    });
                }
            }

            //here, the event is a standard pass and not the first event
            //if standard pass, we cluster the passes
            else if(linkIndex>0){
                var the_links = [link];
                var the_nodes = [link.source, link.target];
                var entry = link.source;
                var exit = link.target;
                var time = link.time;

                var last_time = undefined;
                linkIndex++;
                while (linkIndex < links.length) {
                    link = links[linkIndex];

                    var isOkPass = (link.eid == E_PASS && !isLongPass(link,nodes[link.source]));
                    var isPassRun = (link.eid == E_RUN);
                    var nextLinkIsPass =
                        links[linkIndex+1] != undefined
                            && links[linkIndex+1].eid == E_PASS
                            && !isLongPass(links[linkIndex+1],nodes[links[linkIndex+1].source]);

                    if ( isOkPass || ( isPassRun && nextLinkIsPass) ) {
                        if(the_nodes[the_nodes.length-1] != link.source) throw "link source "+link.source+" must be equal to last elem of "+JSON.stringify(the_nodes);
                        the_links.push(link);
                        the_nodes.push(link.target);
                        exit = link.target;
                        last_time = link.time;
                        linkIndex++;
                    }
                    else {
                        linkIndex--;
                        break;
                    }
                }
                //console.log("the_links",the_links);
                //add the subchain if the_links.length > 2 (pass+run)
                if(the_links.length > 2){
                    //console.log("CLUSTER:",the_links,the_nodes);

                    //add the cluster
                    subChains.push({
                        type: SUB_CHAIN_TYPE_PASS_CLUSTER,
                        entry: entry,
                        exit: exit,
                        links: the_links,
                        nodes: the_nodes,
                        time: time
                    });

                    /*
                     //add a simplenode subchain for entry and exit point to force duplication
                     subChains.push({
                     type: SUB_CHAIN_TYPE_SIMPLE_NODE,
                     entry: entry,
                     exit: entry,
                     links: [],
                     nodes: [entry],
                     time: time,
                     order: "before"
                     });
                     */
                    /*
                     subChains.push({
                     type: SUB_CHAIN_TYPE_SIMPLE_NODE,
                     entry: exit,
                     exit: exit,
                     links: [],
                     nodes: [exit],
                     time: last_time,
                     order: "after"
                     });*/
                }
            }
        }

        /*
         //just to check that all links are done
         if(d3.sum(subChains, function(d){return d.links.length;}) != links.length)
         throw "Wrong number of links in Subchains ! In subchains: "+d3.sum(subChains, function(d){return d.links.length;})+", while "+$this.links.length+" links in sequence";
         */

        //here we add simplenodes for nodes which are not associated a visu
        nodes.forEach(function(node){
            var nodeOk = false;
            for(var s in subChains){
                for(var n in subChains[s].nodes){
                    if(subChains[s].nodes[n] == node.index){
                        //if(nodeOk) throw "node in 2 vis: "+JSON.stringify(node);
                        //else
                        nodeOk = true;
                        break;
                    }
                    if(nodeOk) break;
                }
            }
            if(!nodeOk){//if node in no vis, then add a simplenodevis for it
                //get the time of the event
                var time;
                for(var l in links){
                    if(links[l].source == node.index){
                        time = links[l].time;
                        break;
                    }
                }
                if(!time){
                    throw "no time for node"+JSON.stringify(node);
                }
                subChains.push({
                    type: SUB_CHAIN_TYPE_SIMPLE_NODE,
                    entry: node.index,
                    exit: node.index,
                    links: [],
                    nodes: [node.index],
                    time: time
                });
            }
        });

        done();
    }

    function done(){
        //sort the subchains
        subChains = subChains.sort(function(s1,s2){

            //if same time
            if(s1.time == s2.time || s1.time.period == s2.time.period && s1.time.sec == s2.time.sec && s1.time.min == s2.time.min){

                //if before / after cluster
                if(s1.type == SUB_CHAIN_TYPE_PASS_CLUSTER && s2.type == SUB_CHAIN_TYPE_SIMPLE_NODE){
                    if(s2.order == "after"){
                        return -1;
                    }
                    else if(s2.order == "before"){
                        return 1;
                    }
                }
                if(s1.type == SUB_CHAIN_TYPE_SIMPLE_NODE && s2.type == SUB_CHAIN_TYPE_PASS_CLUSTER){
                    if(s1.order == "after"){
                        return 1;
                    }
                    else if(s1.order == "before"){
                        return -1;
                    }
                }
                if(s1.type == SUB_CHAIN_TYPE_SHOT) return 1;
                if(s2.type == SUB_CHAIN_TYPE_SHOT) return -1;



                var s1AfterRun, s2AfterRun;
                for(var n in s1.nodes){
                    if(nodes[s1.nodes[n]].after_run){
                        s1AfterRun = true;
                        break;
                    }
                }
                for(n in s2.nodes){
                    if(nodes[s2.nodes[n]].after_run){
                        s2AfterRun = true;
                        break;
                    }
                }
                if(s1AfterRun && !s2AfterRun) return 1;
                if(s2AfterRun && !s1AfterRun) return -1;

                //if no pass and run comparison, then compare entry node indexes
                if(s1.entry < s2.entry) return -1;
                if(s1.entry > s2.entry) return -1;

            }
            if(s1.time.min<s2.time.min) return -1;
            if(s1.time.min>s2.time.min) return 1;
            if(s1.time.sec<s2.time.sec) return -1;
            if(s1.time.sec>s2.time.sec) return 1;
            return 0;
        });

        callback.call(subChains)

    }

};


Sequence.prototype.changeNodeStyle = function(style, duration){


    this.visList.forEach(function(vis){
        vis.applyNodesLinksStyle(duration, function(){

        });
    });
};


/*
 if from_timeline then animate from the timeline to the nodelink
 */
Sequence.prototype.drawNodeLink = function(callback){
    var $this = this;

    var group = this.data.field.fieldGroup,
        x_scale = this.data.field.x_scale,
        y_scale = this.data.field.y_scale;

    var nodes = this.nodes;
    var links = this.links;

    var nodesSVG = group.selectAll(".node")
        .data(nodes)
        .enter()
        .append("svg:g")
        .attr("id", function(d,i){return i})
        .attr("class", "node")
        .attr("sid", $this.sid)
        .style("opacity",0)
        .attr("transform", function(d){
            //initialize the transform field of the node data
            var tr = "translate("+x_scale(d.x)+","+y_scale(d.y)+")";
            d.transform = d3.transform(tr);
            return "translate("+ d.transform.translate[0]+","+ d.transform.translate[1]+")";
        })
        .on("mouseover", function(){d3.select(this).style("cursor", "pointer")})
        .on("click", function(d){$this.clickNode(d.pid)});

    var jerseyPath = this.data.getNodePath($this.data.nodeRadius);
    var circlePath = getCirclePath($this.data.nodeRadius);

    nodesSVG.append("svg:path")
        .attr("class", "node-bg")
        .attr("d", function(d){
            if(d.eid == PID_SHOT_DEST){
                return circlePath;
            }
            return jerseyPath;
        });

    nodesSVG.append("svg:path")
        .attr("class", "node-fg")
        .attr("d", function(d){
            if(d.eid == PID_SHOT_DEST){
                return circlePath;
            }
            return jerseyPath;
        });


    nodesSVG.append("svg:text")
        .attr("text-anchor", "middle")
        .attr("y", 4)
        .text(function(d){
            if(d.pid == PID_SHOT_DEST) return "";
            return $this.data.getPlayer(d.pid).jersey;
        });

    nodesSVG.append("svg:title")
        .text(function(d){
            return $this.data.getPlayerNodeTitle(d);
        });

    var linksSVG = group.selectAll(".link")
        .data(links);

    var gLink = linksSVG
        .enter()
        .insert("svg:g",".node")
        .attr("class", function(d){return "link "+getEventName(d.eid)})
        .attr("sid", $this.sid)
        .style("opacity",0);

    gLink.append("path")
        //.attr("marker-end", "url(#arrowHead)")
        .attr("class", function(d){
            var line_style = "";
            if(C_SHOT.indexOf(d.eid)!=-1) line_style = "plain";
            else if(nodes[d.source].pid == nodes[d.target].pid) {
                if(nodes[d.source].unique_id == nodes[d.target].unique_id) {
                    line_style = "dotted";
                }
                else line_style = "plain";
            }
            else line_style = "dashed";

            return line_style;
        })
        .each(function(d){
            if(d.eid == E_RUN || d.eid == E_LONG_RUN) {
				//d3.select(this).style("stroke-opacity",0); TODO - if can fix the squiggly lines, remove the remaining of this function
				
				d3.select(this).attr("class","plain");
				
				//draw a squiggly line
				var x_source = x_scale(nodes[d.source].x),
					y_source = y_scale(nodes[d.source].y),
					x_target = x_scale(nodes[d.target].x),
					y_target = y_scale(nodes[d.target].y);
				return line([
                    {x:x_source, y:y_source}, {x:x_source, y:y_source},
                    {x:x_target, y:y_target}, {x:x_target, y:y_target}]);
			}
        })
        .style("filter", function(d){
            if(isLongPass(d,$this.nodes[d.source])) return "url(#shadow-pass)";
            return "";
        })
        .attr("id",function(d,i){return "linkPath"+i})
        .attr("d", function(d){
            // source and target are duplicated for straight lines
            var x_source = x_scale(nodes[d.source].x),
                y_source = y_scale(nodes[d.source].y),
                x_target = x_scale(nodes[d.target].x),
                y_target = y_scale(nodes[d.target].y);

            if(isLongPass(d,$this.nodes[d.source])){
                return line(getArc(
                    x_source,
                    y_source,
                    x_target,
                    y_target,
                    10
                ));
            }
            else{
                return line([
                    {x:x_source, y:y_source}, {x:x_source, y:y_source},
                    {x:x_target, y:y_target}, {x:x_target, y:y_target}]);
            }
        });

		//TODO - squiggly lines bug - to fix. For now, just replaced with straight line
		/*
    var t = gLink.append("svg:text")
        .style("font-family","fontWaves")
        .style("font-size","20")
        .style("stroke-linecap","round")
        .style("stroke","black");
    t.append("svg:textPath")
        .attr("xlink:href", function(d,i){return "#linkPath"+i})
        .text(function(d){
            if(d.eid == E_RUN || d.eid == E_LONG_RUN) return "abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd";
            return "";
        });
		*/
	
	function drawSine(){
		
	}

	
	

    //Nice -> to ignore events on elements
    gLink.attr("pointer-events","none");

    linksSVG.exit().remove();

    group
        .insert("svg:path",".link")
        .attr("class", "globalFlow");

    callback.call();
};



Sequence.prototype.updateGlobalFlow = function(duration,visIndexes){
    //console.log("update global flow");

    var $this = this;

    if(visIndexes == undefined){
        visIndexes = [];
        for(var i=0;i<this.visList.length;i++){
            visIndexes.push(i);
        }
    }

    var data = [];
    visIndexes.forEach(function(i){
        data.push($this.visList[i].getCenter());
    });

    this.data.field.fieldGroup.selectAll(".globalFlow")
        .transition()
        .duration(duration)
        .style("stroke-width", $this.data.globalFlowSize)
        .attr("d", function(){
            var line = getLine($this.data.globalFlowInterpolate)(data);
            var logGlobalFlowPath = false;
            if(logGlobalFlowPath) console.log(line);
            return line;
        });
};



/*---------------------------------------
 STUFF ABOUT SEQUENCE/TIMELINE ANIMATIONS
 --------------------------------------*/

Sequence.prototype.unselectSelectedPlayer = function(){
    this.clickNode(this.selectedPlayerId);
    this.selectedPlayerId = undefined;
};
Sequence.prototype.unselectSelectedVis = function(){
    this.clickVis(this.selectedVisId);
    this.selectedVisId = undefined;
};

Sequence.prototype.showContextSelectedVis = function(show){
    if(this.selectedVisId){
        this.visList[this.selectedVisId].showContext(show,300);
    }
};

Sequence.prototype.switchSelectedVis = function(newVisType,duration){
    if(this.selectedVisId == undefined) return;
    var $this = this;

    var oldVis = this.visList[this.selectedVisId];
    switch(newVisType){
        case "Node-link":
            if(oldVis instanceof GraphPassVis) {
                console.log("node-link to node-link, DO NOTHING");
                return;
            }
            break;
        case "Node-link-all":
            if(oldVis instanceof GraphPassVisComplete) {
                console.log("node-link-all to node-link-all, DO NOTHING");
                return;
            }
            break;
        case "HivePlot":
            if(oldVis instanceof HivePlotVis) {
                console.log("HivePlot to HivePlot, DO NOTHING");
                return;
            }
            break;
        case "TagCloud":
            if(oldVis instanceof CloudPassVis) {
                console.log("TagCloud to TagCloud, DO NOTHING");
                return;
            }
            break;
        case "Matrix":
            if(oldVis instanceof MatrixPassVis) {
                console.log("Matrix to Matrix, DO NOTHING");
                return;
            }
            break;
        default:
            throw "unknown newVisType "+newVisType;
    }


    //do the change if went through the switch checkings

    //copy the current vis needed parameters
    var visParams = {
        sequence: oldVis.sequence,
        data: oldVis.data,
        type: oldVis.type,
        nodes: oldVis.nodes,
        links: oldVis.links,
        entry: oldVis.entry,
        exit: oldVis.exit,
        svg: oldVis.svg,
        vid: oldVis.vid,
        padding: oldVis.padding,
        context: oldVis.context
    };
    var visCenter = oldVis.getCenter();


    //TODO - do we really need a temporary state? Try without
    //fade out the old vis
    oldVis.setOpacity(0,duration,function(){
        //destroy the old vis
        oldVis.destroy();
        //apply to nodes/links the temporary style
        //doTemporaryNodesLinksStyle(function(){
        //apply temporary layout to the nodes/links
        //doTemporaryLayout(function(){
        //console.log("layout done");
        //create the new vis, which will layout the nodes, apply nodes/links style, and fade in the vis
        doCreateNewVis(function(){
            //reselect the vis !!!
            $this.clickVis(visParams.vid,true);
        });
        //});
        //});
    });

    function doCreateNewVis(callback){
        switch(newVisType){
            case "Node-link":
                $this.visList[visParams.vid] = new GraphPassVis(visParams);
                break;
            case "HivePlot":
                $this.visList[visParams.vid] = new HivePlotVis(visParams);
                break;
            case "Node-link-all":
                $this.visList[visParams.vid] = new GraphPassVisComplete(visParams);
                break;
            case "Matrix":
                $this.visList[visParams.vid] = new MatrixPassVis(visParams);
                break;
            case "TagCloud":
                $this.visList[visParams.vid] = new CloudPassVis(visParams);
                break;
            default:
                throw "unknown newVisType "+newVisType;
        }
        var the_vis = $this.visList[visParams.vid];
        the_vis.create(visCenter.x,visCenter.y, function(){
            //console.log("A");
            the_vis.putInsideSvg(function(){
                //console.log("B");
                the_vis.applyNewPosition(0, function(){
                    //console.log("C");
                    //console.log("pre-bug");
                    the_vis.translate2D = {x:the_vis.posX, y:the_vis.posY};
                    the_vis.animateNodesLinks(duration, function(){
                        //console.log("D");
                        //console.log("!!! post bug - SUCCESS !!!");
                        the_vis.drawNode();
                        //console.log("create 6");
                        the_vis.applyNodesLinksStyle(duration, function(){
                            //console.log("create 7");
                            the_vis.setOpacity(1,duration,function(){
                                //console.log("create 8");
                                $this.updateGlobalFlow();
                                //console.log("create 9");
                                callback.call();
                            });
                        });
                    });
                });
            });
        });
    }

    //noinspection JSUnusedLocalSymbols
    function doTemporaryLayout(callback){
        var okNodes = getFalseArray(visParams.nodes);
        //okLinks = getFalseArray(visParams.links);

        visParams.nodes.forEach(function(node,n){
            d3.selectAll(".node").filter(function(d) {
                if(d.index==node){
                    d.transform = d3.transform("translate("+getPos(n)+")");
                    updateLink(n);
                    return true;
                }
                return false;
            })
                .transition()
                .duration(duration)
                .attr("transform", function(d){return "translate("+d.transform.translate+")"})
                .each("end", function(){
                    okNodes[n]=true;
                    check();
                });
        });

        function updateLink(n){
            d3.selectAll(".link").filter(function(d) {
                if(d.source==n || d.target == n) {
                    d.newLine = line($this.getStraightLinkCoords(d));
                    return true;
                }
                return false;
            })
                .select("path")
                .transition()
                .duration(duration)
                .attr("d", function(d){return d.newLine});
        }

        function getPos(n){
            return [
                visCenter.x - (visParams.nodes.length/2 * $this.data.nodeRadius*2) + n * $this.data.nodeRadius*2,
                visCenter.y
            ];
        }

        function check(){
            console.log("layout check",checkTrueArray(okNodes));
            if(checkTrueArray(okNodes) /*&& checkTrueArray(okLinks)*/) callback.call();
        }
    }

    //noinspection JSUnusedLocalSymbols
    function doTemporaryNodesLinksStyle(callback){
        var okNodes = getFalseArray(visParams.nodes),
            okLinks = getFalseArray(visParams.links);

        var jerseyPath = $this.data.getNodePath($this.data.nodeRadius);

        visParams.nodes.forEach(function(node,n){
            var the_nodes = d3.selectAll(".node").filter(function(d) {
                return(d.index==node);
            });
            the_nodes
                .selectAll("path.node-fg,path.node-bg")
                .transition()
                .duration(duration)
                .style("fill", "white")
                .attr("d", function(){
                    return jerseyPath;
                })
                .each("end", function(){okNodes[n]=true; check();});

            the_nodes.selectAll("text")
                .transition()
                .duration(duration)
                .style("opacity",1);
        });

        visParams.links.forEach(function(link,l){
            d3.selectAll(".link").filter(function(d) {
                return (d.source==link.source && d.target == link.target);
            })
                .selectAll("path")
                .transition()
                .duration(duration)
                .style("opacity",1)
                .style("stroke-width",1)
                .each("end", function(){okLinks[l]=true; check();});
        });

        function check(){
            if(checkTrueArray(okNodes) && checkTrueArray(okLinks)) callback.call();
        }
    }

};

Sequence.prototype.clickNode = function(pid){
    catchEvent();
    var $this = this;
    if(pid == this.selectedPlayerId) this.selectedPlayerId = undefined;
    else this.selectedPlayerId = pid;

    d3.select("#svg1").selectAll(".node")
        .classed("selected",function(d){
            return d.pid == $this.selectedPlayerId;
        });

    //select also the events associated to pid in the timeline infos
    d3.select("#svg1").selectAll(".timelineInfosEvents")
        .classed("selected",function(d){
            return d.pid == $this.selectedPlayerId;
        });

    this.data.liveCoverInfos.clickPlayer(this.selectedPlayerId);

};

Sequence.prototype.clickVis = function(vid,refresh){
    catchEvent();
    var $this = this;
    if(vid == this.selectedVisId && !refresh){//unselect vis
        $this.unselectVis($this.selectedVisId);
    }
    else{
        //unselect previously selected vis, if exist
        if($this.selectedVisId != undefined){
            $this.unselectVis($this.selectedVisId);
        }

        //select new selected vis
        $this.selectVis(vid);
    }
};


Sequence.prototype.selectVis = function(vid){
    var $this = this;
    $this.selectedVisId = vid;
    $this.visList[vid].setSelected(true);
    $this.data.textAutoVis.selectVis($this.selectedVisId);
};

Sequence.prototype.unselectVis = function(vid){
    this.visList[vid].setSelected(false);
    this.data.textAutoVis.unselectVis(vid);
    this.selectedVisId = undefined;
};

Sequence.prototype.overVis = function(vid){
    this.visList[vid].overVis();
    this.data.textAutoVis.overVis(vid);
};

Sequence.prototype.exitVis = function(vid){
    this.visList[vid].exitVis();
    this.data.textAutoVis.exitVis(vid);
};

Sequence.prototype.showSequence = function(callback){
    var $this = this;
    if(SHOW_SEQUENCE_INFOS)this.data.timeline.seq_infos.showSeq(this.sid);

    this.drawNodeLink(function(){
        $this.animateFromTimelineToField(function(){
            d3.selectAll(".node, .link")
                .transition()
                .duration(500)
                .style("opacity",1);

            callback.call();
        });
    });
};

Sequence.prototype.hideSequence = function(callback){
    var $this = this;

    this.animateFromFieldToTimeline(function(){
        d3.selectAll(".node, .link")
            .transition()
            .duration(500)
            .style("opacity",0);

        if(SHOW_SEQUENCE_INFOS)$this.data.timeline.seq_infos.hideSeq(this.sid);
        callback.call();
    });
};


Sequence.prototype.animateFromTimelineToField = function(callback){
    var animate_duration = this.data.animateSequenceDuration;
    var $this = this;
    var tLayer = d3.transform(this.data.field.fieldGroup.attr("transform")).translate;
    var nodes_done = [];
    this.links.forEach(function(link){
        nodes_done[link.source] = false;
    });

    d3.selectAll("g.thumb_node[sid='"+$this.sid+"']")
        .each(function(node,n){
            //go to the node associated to the source of the link
            var the_node = undefined, tNode = undefined;
            d3.select(".node[id='"+node.index+"']").each(function(d){
                the_node = this;
                tNode = d.transform.translate;
            });
            tNode[0] = tNode[0] + tLayer[0];
            tNode[1] = tNode[1] + tLayer[1];

            //if first node, link to the timeline event
            if(node.index == 0){
                $this.data.timeline.connectNodeToLastEvent(the_node,"entry",animate_duration, function(){

                });
            }

            d3.select(this)
                .transition()
                .duration(animate_duration)
                .delay(function(d){
                    return animate_duration* d.index;
                })
                .attr("transform", "translate("+tNode[0]+","+tNode[1]+")")
                .each("end", function(d){
                    if(SHOW_SEQUENCE_INFOS)$this.data.timeline.seq_infos.showEvent(d,animate_duration);
                    d3.select(the_node)
                        .transition()
                        .duration(animate_duration)
                        .style("opacity",1)
                        .each("end", function(){
                            updateLinksAndAdditionalNodes(node.unique_id,function(){
                                nodes_done[n]=true;
                                transitionEnded();
                            });
                        });
                });
        });

    /*
     Set opacity=1 for the link linking nodes when animation of nodes done for source and target
     */
    function updateLinksAndAdditionalNodes(unique_id,callback){

        var additional_done = [];
        d3.select("#svg1").selectAll(".link,.node").each(function(d){
            if(d.unique_id == unique_id)additional_done[d.index] = false;
        });

        d3.select("#svg1").selectAll(".link,.node").each(function(d){
            var the_object = this;
            if(d.unique_id == unique_id){
                d3.select(this)
                    .transition()
                    .duration(animate_duration)
                    .style("opacity",1)
                    .each("end", function(){
                        //if last node, link to the timeline event
                        if(d.index == $this.nodes[$this.nodes.length-1].index){
                            $this.data.timeline.connectNodeToLastEvent(the_object,"exit",animate_duration, function(){
                                nodes_done[d.index] = true;
                                additional_done[d.index] = true;
                                done();
                            });
                        }
                        else {
                            additional_done[d.index] = true;
                            nodes_done[d.index] = true;
                            done();
                        }
                    });
            }
        });

        function done(){
            var okAdditional = true;
            additional_done.forEach(function(d){
                if(d===false) okAdditional = false;
            });
            if(okAdditional){
                callback.call();
            }
        }
    }

    function transitionEnded(){
        //if all nodes and links have ended their transition, call the callback
        var okNodes = true;
        //console.log(nodes_done);
        nodes_done.forEach(function(d){
            if(d==false) okNodes = false;
        });
        if(okNodes){
            //console.log("---done---");
            callback.call();
        }
    }
};


Sequence.prototype.animateFromFieldToTimeline = function(callback){
    var animate_duration = this.data.animateSequenceDuration;
    var $this = this;
    var nodes_done = [];
    this.links.forEach(function(link){
        nodes_done[link.source] = false;
    });

    d3.select("#svg1").selectAll(".thumb_node[sid='"+$this.sid+"']")
        .attr("opacity",1);//TODO - animation imbriquée

    d3.select("#svg1").selectAll(".thumb_node[sid='"+$this.sid+"']")
        .each(function(node,n){
            //go to the node associated to the source of the link
            var the_node;
            d3.select(".node[id='"+node.index+"']").each(function(){
                the_node = this;
            });

            //if first node, link to the timeline event
            if(node.index == 0){
                $this.data.timeline.unconnectNodeToLastEvent("entry",animate_duration, function(){

                });
            }

            d3.select(this)
                .transition()
                .duration(animate_duration)
                /*.delay(function(d){
                 return animate_duration* d.index;
                 })*/
                .attr("transform", function(d){
                    return d.trThumbnail.toString()
                })
                .each("end", function(d){
                    if(SHOW_SEQUENCE_INFOS)$this.data.timeline.seq_infos.hideEvent(d,animate_duration);
                    d3.select(the_node)
                        .transition()
                        .duration(animate_duration)
                        .style("opacity",0)
                        .each("end", function(){
                            updateLinksAndAdditionalNodes(node.unique_id,function(){
                                nodes_done[n]=true;
                                transitionEnded();
                            });
                        });
                });
        });

    /*
     Set opacity=1 for the link linking nodes when animation of nodes done for source and target
     */
    function updateLinksAndAdditionalNodes(unique_id,callback2){

        var additional_done = [];
        d3.select("#svg1").selectAll(".link,.node").each(function(d){
            if(d.unique_id == unique_id)additional_done[d.index] = false;
        });

        d3.select("#svg1").selectAll(".link,.node").each(function(d){
            if(d.unique_id == unique_id){
                d3.select(this)
                    .transition()
                    .duration(animate_duration)
                    .style("opacity",0)
                    .each("end", function(){
                        //if last node, link to the timeline event
                        if(d.index == $this.nodes[$this.nodes.length-1].index){
                            $this.data.timeline.unconnectNodeToLastEvent("exit",animate_duration, function(){
                                nodes_done[d.index] = true;
                                additional_done[d.index] = true;
                                done();
                            });
                        }
                        else {
                            additional_done[d.index] = true;
                            nodes_done[d.index] = true;
                            done();
                        }
                    });
            }
        });

        function done(){
            var okAdditional = true;
            additional_done.forEach(function(d){
                if(d===false) okAdditional = false;
            });
            if(okAdditional){
                callback2.call();
            }
        }
    }



    var ended = false;
    function transitionEnded(){
        //if all nodes and links have ended their transition, call the callback
        var okNodes = true;
        //console.log(nodes_done);
        nodes_done.forEach(function(d){
            if(d==false) okNodes = false;
        });
        if(okNodes && !ended){
            callback.call();
            ended = true;
        }
    }
};

Sequence.prototype.getVis = function(vis_id){
    for(var v in this.visList){
        if(this.visList[v].vid == vis_id) return this.visList[v];
    }
    return null;
};







/*---------------------------------------
 STUFF NEEDED BY SEQUENCESVIS
 --------------------------------------*/

Sequence.prototype.computeSignature = function(){
    var $this = this;

    var nodes = clone(this.nodes),
        links = clone(this.links);

    //console.log(nodes,links);

    this.getSubChains(nodes, links, function(){
        var subChains = this;
        /*----------------------------------------------
         Duplicate the nodes in two visualizations and
         change the associated visualizations entry/exit
         points
         ----------------------------------------------*/

        for(var s=0; s<subChains.length-1; s++){
            var cur = subChains[s];
            var next = subChains[s+1];

            if(cur.exit == next.entry){

                //duplicate the node and change it for the duplicated one in next
                var dupIndex = nodes.length;

                //first add the node to the node list
                nodes[dupIndex] = {
                    index: dupIndex,
                    unique_id: nodes[cur.exit].unique_id,
                    additional: true,
                    time: nodes[cur.exit].time,
                    pid: nodes[cur.exit].pid,
                    x: nodes[cur.exit].x,
                    y: nodes[cur.exit].y
                };

                //then change the node reference in the next subchain
                next.entry = dupIndex;
                next.nodes[0] = dupIndex;

                var changed_link;
                //then update the link in this.links which has changed
                for(var l=0;l<links.length;l++){
                    if(links[l].source == cur.exit){
                        changed_link = links[l];
                        changed_link.source = dupIndex;
                        break;
                    }
                }

                //then add the new link between the node and its doppleganger
                var new_link = {
                    source: cur.exit,
                    target: dupIndex,
                    eid: E_DUPLICATE,
                    qualifiers: [],
                    time: changed_link.time,
                    unique_id: changed_link.unique_id
                };
                links.push(new_link);
            }
        }

        //Compute the visualizations type / nodes / entry / exit / vid / position

        var signature = [],
            signatureGlobalFlow = [];

        //Create the visualization associated to each type
        subChains.forEach(function(d,i){
            signature[i] = {
                type: d.type,
                nodes: d.nodes,
                entry: d.entry,
                exit: d.exit,
                vid: i,
                position: {
                    x : d3.mean(d.nodes, function(n){return nodes[n].x}),
                    y : d3.mean(d.nodes, function(n){return nodes[n].y})
                }
            };
            signatureGlobalFlow[i] = signature[i].position;
        });

        $this.signature = signature;
        $this.signatureGlobalFlow = signatureGlobalFlow;


    });
};















/*---------------------------------------
 STUFF ABOUT LINKS
 --------------------------------------*/


/*
 Called when nodes have new transform attribute to update
 the links between visus
 */
Sequence.prototype.updateBetweenVisLinksFromNodeInVis = function(node,duration){
    var $this = this;

    d3.selectAll(".link").filter(function(d) {
        if(d.vid == null && (d.source == node || d.target == node)) {
            d.newLine = $this.getBetweenVisLink(d, d.source==node);
            return true;
        }
        return false;
    })
        .select("path")
        .transition()
        .duration(duration)
        .attr("marker-end", "")
        .attr("d", function(d){return line(d.newLine)});
};


Sequence.prototype.getBetweenVisLink = function(link, sourceChanged){
    //console.log("getBezierBetweenVisLinkCoords");
    if(sourceChanged == undefined) throw "need parameter sourceChanged";

    var $this = this;
    var transSourceNode = undefined,
        transTargetNode = undefined,
        bbSourceNode = undefined,
        bbTargetNode = undefined;
    var sourceVis = undefined,
        targetVis = undefined;

    d3.select(".node[id='"+ link.source +"']").each(function(d){
        if(d.vid == null) throw ("d.vid NULL"+JSON.stringify(d));
        sourceVis = $this.data.selected_sequence.getVis(d.vid);
        if(sourceChanged){//get the new transform attr of the source node
            transSourceNode = d.transform.translate;
        }
        else{//get the current transform attr of the source node
            transSourceNode = d3.transform(d3.select(this).attr("transform")).translate;
        }
        bbSourceNode = d3.select(this).node().getBBox();
    });

    d3.select(".node[id='"+ link.target +"']").each(function(d){
        if(d.vid == null) throw ("d.vid NULL"+JSON.stringify(d));
        targetVis = $this.data.selected_sequence.getVis(d.vid);
        if(!sourceChanged){//get the new transform attr of the target node
            transTargetNode = d.transform.translate;
        }
        else{//get the current transform attr of the target node
            transTargetNode = d3.transform(d3.select(this).attr("transform")).translate;
        }
        bbTargetNode = d3.select(this).node().getBBox();
    });

    var x_source = transSourceNode[0],
        y_source = transSourceNode[1],
        x_target = transTargetNode[0],
        y_target = transTargetNode[1];


    //if a long pass, return an arc
    if(isLongPass(link,$this.nodes[link.source])){
        return getArc(
            x_source,
            y_source,
            x_target,
            y_target,
            10
        );
    }


    var coords = {};

    coords.source_x = x_source;
    coords.source_y = y_source;
    coords.target_x = x_target;
    coords.target_y = y_target;

    //if source node is a SimpleNodeVis, then no pivot for him
    if(sourceVis instanceof SimpleNodeVis){
        coords.source_x_pivot = x_source;
        coords.source_y_pivot = y_source;
    }
    else{//pivot for source node
        var pivot_source = getPivot(x_source,y_source,sourceVis.getBBox(),sourceVis.getPosition(),x_target,y_target);
        coords.source_x_pivot = pivot_source[0];
        coords.source_y_pivot = pivot_source[1];
    }

    //if target node is a SimpleNodeVis, then no pivot for him
    if(targetVis instanceof SimpleNodeVis){
        coords.target_x_pivot = x_target;
        coords.target_y_pivot = y_target;
    }
    else{//pivot for target node
        var pivot_target = getPivot(x_target,y_target,targetVis.getBBox(),targetVis.getPosition(),x_source,y_source);
        coords.target_x_pivot = pivot_target[0];
        coords.target_y_pivot = pivot_target[1];
    }


    function getPivot(n1X,n1Y,bbVis,posVis,n2X,n2Y){

        var pivX = n1X + (n2X-n1X) / 2,
            pivY = n2Y + (n1Y-n2Y) / 2;

        //if n2X in vis x range
        if(n2X >= posVis.x && n2X <= posVis.x+bbVis.width){
            return [n1X, pivY];
        }
        //if n2Y in vis y range
        if(n2Y >= posVis.y && n2Y <= posVis.y+bbVis.height){
            return [pivX, n1Y];
        }

        //if target in diagonal, the pivot makes the link exit the visu through the closest side to the node
        //get the two possible sides
        if(n2X < posVis.x){//left
            var dLeft = Math.abs(n1X - posVis.x);
            if(n2Y < posVis.y){//top-left
                //noinspection JSDuplicatedDeclaration
                var dTop = Math.abs(n1Y - posVis.y);
                if(dTop < dLeft){//pivot on top
                    return [n1X, pivY];
                }
                else{//pivot on left
                    return [pivX, n1Y];
                }
            }
            else{//bottom-left
                //noinspection JSDuplicatedDeclaration
                var dBottom = Math.abs(y_source - (posVis.y+bbVis.height));
                if(dBottom < dLeft){//pivot on bottom
                    return [n1X, pivY];
                }
                else{//pivot on left
                    return [pivX, n1Y];
                }
            }
        }
        else{//right
            var dRight = Math.abs(n1X - (posVis.x+bbVis.width));
            if(n2Y < posVis.y){//top-right
                //noinspection JSDuplicatedDeclaration
                var dTop = Math.abs(n1Y - posVis.y);
                if(dTop < dRight){//pivot on top
                    return [n1X, pivY];
                }
                else{//pivot on right
                    return [pivX, n1Y];
                }
            }
            else{//bottom-right
                //noinspection JSDuplicatedDeclaration
                var dBottom = Math.abs(n1Y - (posVis.y+bbVis.height));
                if(dBottom < dRight){//pivot on bottom
                    return [n1X, pivY];
                }
                else{//pivot on right
                    return [pivX, n1Y];
                }
            }
        }
    }

    return [
        {x:coords.source_x, y:coords.source_y},
        {x:coords.source_x_pivot, y:coords.source_y_pivot},
        {x:coords.target_x_pivot, y:coords.target_y_pivot},
        {x:coords.target_x, y:coords.target_y}];
};


/*
 Return a straight Line for the link in parameter
 */
Sequence.prototype.getStraightLinkCoords = function(link){
    var transSource = undefined,
        transTarget = undefined;
    d3.select(".node[id='"+ link.source +"']").each(function(d){
        transSource = d.transform.translate;
    });
    d3.select(".node[id='"+ link.target +"']").each(function(d){
        transTarget = d.transform.translate;
    });

    var x_source = transSource[0],
        y_source = transSource[1],
        x_target = transTarget[0],
        y_target = transTarget[1];

    return [
        {x:x_source, y:y_source}, {x:x_source, y:y_source},
        {x:x_target, y:y_target}, {x:x_target, y:y_target}];
};


Sequence.prototype.getArcLinkCoords = function(link){
    var transSource = undefined,
        transTarget = undefined;
    d3.select(".node[id='"+ link.source +"']").each(function(d){
        transSource = d.transform.translate;
    });
    d3.select(".node[id='"+ link.target +"']").each(function(d){
        transTarget = d.transform.translate;
    });

    return getArc(
        transSource[0],
        transSource[1],
        transTarget[0],
        transTarget[1],
        4
    );
};

Sequence.prototype.getSquareLinkCoords = function(link){
    var transSource = undefined,
        transTarget = undefined;
    d3.select(".node[id='"+ link.source +"']").each(function(d){
        transSource = d.transform.translate;
    });
    d3.select(".node[id='"+ link.target +"']").each(function(d){
        transTarget = d.transform.translate;
    });

    var pivotX = transTarget[0], pivotY = transSource[1];
    return [
        {x:transSource[0], y:transSource[1]},
        {x:pivotX, y:pivotY},
        {x:pivotX, y:pivotY},
        {x:transTarget[0], y:transTarget[1]}];

};


var line = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate("basis");

function getLine(interpolation) {
    return d3.svg.line()
        .x(function(d) {return d.x})
        .y(function(d) {return d.y})
        .interpolate(interpolation);
}
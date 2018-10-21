
ShotsVis = function(params){
    this.__proto__.__proto__.constructor.apply(this, [params]);
    this.visType = "ShotsVis";
    if(this.links.length > 1) throw "ShotsVis can only contain one link, here "+this.links.length;
    this.shotId = this.links[0].unique_id;
    //called at the end of the constructor
    this.getContextData();

};

//inherits AbstractVis prototypes
ShotsVis.prototype = Object.create(AbstractVis.prototype);

/*
 Overrides the AbstractVis method
 */
ShotsVis.prototype.getContextData = function(){
    this.context_data = this.sequence.data.getContextShots(this.context, this.sequence.nodes[this.nodes[0]].pid);
    for(var s in this.context_data){
        this.context_data[s].shot_type = this.getShotType(this.context_data[s]);
    }
};

/*
 Initialize the context
 */
ShotsVis.prototype.drawContext = function(){
    this.drawShots();
    this.drawStats();
};

ShotsVis.prototype.create = function(centerX, centerY, callback) {
    var $this = this;
    this.w = 250;
    this.h = 200;
    this.fieldMargin=10;
    this.modesHeight = 20;
    this.fieldWidth = 2*this.w/3-this.fieldMargin;
    this.fieldHeight = this.h-2*this.modesHeight;
    this.goalWidth = this.w/3;
    this.goalHeight = this.fieldHeight;
    this.filterModesArray = [
        {name: "goal", selected:true},
        {name: "post", selected:true},
        {name: "saved", selected:true},
        {name: "missed", selected:true}
    ];

    this.visuModesArray = ["dots", "spray"];
    this.visuMode = undefined;
    this.brush = false;

    this.x_scale_field = d3.scale.linear().domain([50,100]).range([0,this.fieldWidth]).clamp(true);
    this.y_scale_field = d3.scale.linear().domain([0,100]).range([this.fieldHeight,0]).clamp(true);
    this.x_scale_goal = d3.scale.linear().domain([0,100]).range([0,this.goalWidth]).clamp(true);
    this.y_scale_goal = d3.scale.linear().domain([34.6,65.4]).range([this.goalHeight,0]).clamp(true);



    this.createVisSVG(centerX,centerY,function(){
        $this.visSVG
            .classed("ShotsVis",true)
            .attr("width", $this.w)
            .attr("height", $this.h);

        //background
        $this.visSVG.append("svg:rect")
            .attr("width", $this.w)
            .attr("height", $this.h)
            .style("fill-opacity",1)
            .style("fill","black");

        $this.fieldRect = $this.visSVG
            .append("svg:g")
            .attr("transform", "translate("+0+","+0+")")
            .attr("width", $this.fieldWidth)
            .attr("height", $this.fieldHeight);

        $this.goalRect = $this.visSVG
            .append("svg:g")
            .attr("transform", "translate("+($this.fieldWidth+$this.fieldMargin)+","+0+")")
            .attr("width", $this.goalWidth)
            .attr("height", $this.goalHeight);


        //brushing
        $this.xBrushField = d3.scale.linear().range([0, $this.fieldWidth]);
        $this.yBrushField = d3.scale.linear().range([$this.fieldHeight, 0]);
        $this.xBrushShotsField = d3.scale.linear().domain([50,100]).range([0,1]);
        $this.yBrushShotsField = d3.scale.linear().domain([0,100]).range([0,1]);

        $this.xBrushMouth = d3.scale.linear().range([0, $this.goalWidth]);
        $this.yBrushMouth = d3.scale.linear().range([$this.goalHeight, 0]);
        $this.xBrushShotsMouth = d3.scale.linear().domain([0,100]).range([0,1]);
        $this.yBrushShotsMouth = d3.scale.linear().domain([34.6,65.4]).range([0,1]);

        $this.brushedShotsField = null;
        $this.brushedShotsMouth = null;


        $this.putDragSquareOnTop();

        callback.call();
    });

};

ShotsVis.prototype.drawNode = function(){

    this.drawField();
    this.drawGoal();
    this.drawContext();
    this.drawModes();
    this.clickFilterMode();//to initialize the filter modes
    this.clickVisuMode(this.visuModesArray[0]);//to initialize the visu mode

};

ShotsVis.prototype.animateNodesLinks = function(duration, callback){
    var $this = this;

    var tField = d3.transform(this.fieldRect.attr("transform"));
    var tMouth = d3.transform(this.goalRect.attr("transform"));

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
                //if the shot origin
                if(d.pid != -1){
                    newTx = $this.posX + tField.translate[0] + $this.x_scale_field(d.x);
                    newTy = $this.posY + tField.translate[1] + $this.y_scale_field(d.y);
                }
                //if the shot destination
                else{
                    //get the link to get the shot destination
                    var the_link;
                    for(var l in $this.links){
                        if($this.sequence.nodes[$this.links[l].target].pid == -1){
                            the_link = $this.links[l];
                            break;
                        }
                    }
                    if(the_link == undefined) throw "no link associated to shot foundt !";
                    var shot_dest = getShotDestination(the_link);
                    if(shot_dest.type == SHOT_DEST_TYPE_MOUTH){
                        newTx = $this.posX + tMouth.translate[0] + $this.x_scale_goal(shot_dest.z);
                        newTy = $this.posY + tMouth.translate[1] + $this.y_scale_goal(shot_dest.y);
                    }
                    else{
                        newTx = $this.posX + tField.translate[0] + $this.x_scale_field(shot_dest.x);
                        newTy = $this.posY + tField.translate[1] + $this.y_scale_field(shot_dest.y);
                    }
                }

                d.transform = d3.transform("translate("+newTx+","+newTy+")");

                return true;
            }
            return false;
        })
            .transition()
            .duration(duration)
            .attr("data-shotsvis", function(d) { return "vid_" + d.vid;})
            .attr("transform", function(d){return "translate("+d.transform.translate[0]+","+ d.transform.translate[1]+")"})
            .call(function(){$this.sequence.updateBetweenVisLinksFromNodeInVis(node,duration)})
            .each("end", function(){nodes_done[n]=true; transitionEnded();});
    });

    //transform selected links
    this.links.forEach(function(link,l){
        d3.selectAll(".link").filter(function(d) {
            if(d.source==link.source && d.target == link.target) {
                d.newLine = $this.sequence.getStraightLinkCoords(link);
                return true;
            }
            return false;
        })
            .selectAll("path")
            .transition()
            .duration(duration)
            .attr("data-shotsvis", function(d) {return "vid_" + d.vid;})
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
ShotsVis.prototype.applyNodesLinksStyle = function(duration, callback){
    var $this = this;

    var okNodes = getFalseArray(this.nodes),
        okLinks = getFalseArray(this.links);

    this.nodes.forEach(function(node,n){
        var the_nodes = d3.selectAll(".node").filter(function(d) {
            return (d.index==node);
        });
        the_nodes.select(".node-fg")
            .transition()
            .duration(duration)
            .attr("d", function(d){
                if(d.eid == PID_SHOT_DEST){
                    return getCirclePath($this.data.nodeRadius);
                }
                return $this.data.getNodePath($this.data.nodeRadius);
            })
            .style("fill", getColorFromShotEvent($this.links[0].eid))
            .each("end", function(){okNodes[n]=true; transitionEnded();});
        the_nodes.select(".node-bg")
            .transition()
            .duration(duration)
            .attr("d", function(d){
                if(d.eid == PID_SHOT_DEST){
                    return getCirclePath($this.data.nodeRadius);
                }
                return $this.data.getNodePath($this.data.nodeRadius);
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
            .style("stroke-width",6)
            .style("stroke", getColorFromShotEvent(link.eid))
            .each("end", function(){okLinks[l]=true; transitionEnded();});
    });

    function transitionEnded(){
        if(checkTrueArray(okNodes) && checkTrueArray(okLinks)) {
            callback.call();
        }
    }
};

ShotsVis.prototype.drawGoal = function(){
    //background
    this.goalRect.append("svg:rect")
        .attr("class","fieldRect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", this.goalWidth)
        .attr("height", this.goalHeight);

    //goals
    this.goalRect.append("svg:path")
        .attr("class", "goalPost")
        .attr("d",
        "M"+this.x_scale_goal(0)+","+this.y_scale_goal(55.8)+
            "H"+this.x_scale_goal(43)+
            "V"+this.y_scale_goal(44.2)+
            "H"+this.x_scale_goal(0)+
            "V"+this.y_scale_goal(45.2)+
            "H"+this.x_scale_goal(38)+
            "V"+this.y_scale_goal(54.8)+
            "H"+this.x_scale_goal(0)+
            "Z"
    );
};

ShotsVis.prototype.getShotType = function(shot){
    switch(shot.eid){
        case E_SHOT_MISS:
            return "missed";
            break;
        case E_SHOT_POST:
            return "post";
            break;
        case E_SHOT_SAVED:
            return "saved";
            break;
        case E_SHOT_GOAL:
            return "goal";
            break;
        case E_SHOT_CHANCE_MISSED:
            return "chance_missed";
            break;
        default:
            throw "Unknown shot event type: "+shot.eid;
    }
};

ShotsVis.prototype.filterShots = function(){
    var $this = this;
    var selectedFilterModes = [];
    this.filterModesArray.forEach(function(mode){
        if(mode.selected == true) selectedFilterModes.push(mode.name);
    });

    //reset the stats
    this.stats.forEach(function(stat){
        stat.nb = 0;
    });

    //update the shots classes and also update the stats data
    d3.selectAll(".shots_shots").each(function(d){

        var theShot = d3.select(this);
        //remove the old class
        theShot.classed("shot_hidden", false);
        theShot.classed("shot_transparent", false);
        theShot.classed("shot_visible", false);

        if(d.time < $this.tMin || d.time > $this.tMax //if not in the interval
            || selectedFilterModes.indexOf(d.shot_type)==-1){ //if not the filtered type of shot{
            theShot.classed("shot_hidden", true);
        }
        else{
            var brushedField = $this.brushedShotsField != null;
            var brushedMouth = $this.brushedShotsMouth != null;
            if(brushedField && brushedMouth && ($this.brushedShotsField.indexOf(d)==-1 || $this.brushedShotsMouth.indexOf(d)==-1)//if not brushed by one of the brush
                || brushedField && $this.brushedShotsField.indexOf(d)==-1 //if not brushed in field
                || brushedMouth && $this.brushedShotsMouth.indexOf(d)==-1 //if not brushed in mouth
                ){
                theShot.classed("shot_transparent", true);
            }
            else{//shot selected, update also the stats
                incrementStat(d.shot_type);
                theShot.classed("shot_visible", true);
            }
        }
    });

    function incrementStat(type){
        for(var s in $this.stats){
            if($this.stats[s].type == type){
                $this.stats[s].nb++;
            }
        }
    }

    //update the stats
    this.statsBarScale = d3.scale.linear().domain([0, d3.max(this.stats, function(d){return d.nb})]).range([0, $this.modesHeight]);
    var totalShots = d3.sum(this.stats, function(d){return d.nb});
    this.statsGroups
        .select("rect")
        .transition().duration(600)
        .attr("y", function(d){return ($this.modesHeight-$this.statsBarScale(d.nb))})
        .attr("height", function(d){return $this.statsBarScale(d.nb);});

    this.statsGroups
        .select("text")
        .text(function(d){return d.nb + "("+ ( totalShots != 0 ? parseInt((d.nb/totalShots)*100) : 0 )+"%)"});

    this.totalShotsGroup
        .data([totalShots])
        .select("text")
        //.transition().duration(600)
        .text(function(d){return d});

};

ShotsVis.prototype.drawModes = function(){
    var $this = this;

    //The filter modes: goal/post/saved/missed
    this.filterModesPanel = this.visSVG.append("svg:g")
        .attr("class","context")
        .attr("transform", "translate("+0+","+(this.h-this.modesHeight)+")");

    this.filterModesPanel.append("svg:rect")
        .attr("width", this.fieldWidth)
        .attr("height", this.modesHeight)
        .style("stroke-width", 0)
        .style("fill", "black");

    this.filterModes = this.filterModesPanel.selectAll("g.visuShotsModes")
        .data(this.filterModesArray);

    this.filterModes
        .enter()
        .append("svg:g")
        .attr("class", "visuShotsFilterModes")
        .attr("transform", function(d,i){return "translate("+(40*i)+",5)";})
        .on("click", clickFilterMode)
        .on("mouseover", overFilterMode);

    this.filterModes
        .append("svg:rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10);

    this.filterModes
        .append("svg:text")
        .attr("class", "filters_text")
        .text(function(d){return d.name})
        .attr("text-anchor", "start")
        .attr("x", 12)
        .attr("y", 8);

    function clickFilterMode(d){
        catchEvent();
        d.selected = !d.selected;
        $this.clickFilterMode();
    }

    function overFilterMode(){
        d3.select(this).style("cursor", "pointer");
    }

    this.visuModesPanel = this.visSVG.append("svg:g")
        .attr("class","context")
        .attr("transform", "translate("+(this.w-85)+","+(this.h-2*this.modesHeight)+")");

    //The visus modes: dots, spray
    this.visuModes = this.visuModesPanel.selectAll("g.visuShotsVisuModes")
        .data(this.visuModesArray);

    this.visuModes
        .enter()
        .append("svg:g")
        .attr("class", "visuShotsVisuModes")
        .attr("transform", function(d,i){return "translate("+(45*i)+","+(5)+")";})
        .on("click", clickVisuMode)
        .on("mouseover", overVisuMode);

    this.visuModes
        .append("svg:rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10);

    this.visuModes
        .append("svg:text")
        .text(function(d){return d})
        .attr("class", "modes_text")
        .attr("text-anchor", "start")
        .attr("x", 12)
        .attr("y", 8);

    //add the slider for the spray
    var sliderParams = {
        width:30,
        height:10,
        padding:1,
        parent: this.visuModesPanel,
        sliderClass:"visuShotsSlider",
        x:55,
        y:25,
        rootSVG: $this.visSVG,
        parentVisu: this,
        slider_range: [0,50]
    };
    this.sliderSpray = new SimpleSlider(sliderParams);
    var min_spray_radius = 15;
    var max_spray_radius = 40;
    this.spray_radius_scale = d3.scale.linear().domain(this.sliderSpray.slider_range).range([min_spray_radius,max_spray_radius]);
    this.sprayRadius = this.spray_radius_scale(0);
    this.changeSprayRadius(0);


    function clickVisuMode(d){
        catchEvent();
        $this.clickVisuMode(d);
    }

    function overVisuMode(){
        d3.select(this).style("cursor", "pointer");
    }


    //the "brush" mode
    this.brushing = this.visuModesPanel
        .append("svg:g")
        .attr("transform", "translate("+(0)+","+25+")")
        .attr("class", "visuShotsBrushing")
        .on("click", clickBrushing)
        .on("mouseover", overBrushing);

    this.brushing
        .append("svg:rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10);

    this.brushing
        .append("svg:text")
        .text("Brush")
        .attr("class", "modes_text")
        .attr("text-anchor", "start")
        .attr("x", 17)
        .attr("y", 8);

    function clickBrushing(){
        catchEvent();
        $this.brush = !$this.brush;
        d3.select(this).select("rect").classed("modes_selected", function () {
            return $this.brush;
        });
        $this.clickBrushing();
    }

    function overBrushing(){
        d3.select(this).style("cursor", "pointer");
    }
};

ShotsVis.prototype.changeSprayRadius = function(val){
    if(this.visuMode == "spray"){
        this.sprayRadius = this.spray_radius_scale(val);
        this.shots.selectAll(".shotsCommonElement")
            .attr("r", this.sprayRadius);
    }
};

ShotsVis.prototype.drawStats = function(){
    var $this = this;

    this.stats = [
        {type:"goal", nb:0},
        {type:"post", nb:0},
        {type:"saved", nb:0},
        {type:"missed", nb:0}
    ];

    this.statsPanel = this.visSVG.append("svg:g")
        .attr("class","context")
        .attr("transform", "translate("+0+","+(this.h-2*this.modesHeight)+")");

    //the panel background
    this.statsPanel.append("svg:rect")
        .attr("width", this.fieldWidth)
        .attr("height", this.modesHeight)
        .style("stroke-width", 0)
        .style("fill", "black");

    this.statsGroups = this.statsPanel.selectAll(".visuShotsStats")
        .data(this.stats)
        .enter()
        .append("svg:g")
        .attr("class", "visuShotsStats")
        .attr("transform", function(d,i){return "translate("+(3+40*i)+",0)";});

    this.statsBarScale = d3.scale.linear().domain([0, d3.max(this.stats, function(d){return d.nb})]).range([0, $this.modesHeight]);
    var barWidth = 4;

    this.statsGroups.append("svg:rect")
        .attr("class", function(d){return "shot_"+d.type;})
        .attr("x", 0)
        .attr("y", function(d){return ($this.modesHeight-$this.statsBarScale(d.nb))})//this.modesHeight)
        .attr("width", barWidth)
        .attr("height", function(d){return $this.statsBarScale(d.nb);});

    var totalShots = d3.sum(this.stats, function(d){return d.nb});

    this.statsGroups.append("svg:text")
        .text(function(d){return d.nb + "("+ ( totalShots != 0 ? parseInt((d.nb/totalShots)*100) : 0 )+"%)"})
        .attr("text-anchor", "start")
        .attr("class", "stats_text")
        .attr("x", barWidth+3)
        .attr("y", 16);

    this.totalShotsGroup = this.visSVG.selectAll(".visuShotsTotalShots")
        .data([totalShots])
        .enter()
        .append("svg:g")
        .attr("transform", "translate("+($this.fieldWidth+this.fieldMargin/2-10)+",0)")
        .attr("class", ".visuShotsTotalShots");

    this.totalShotsGroup.append("svg:rect")
        .style("stroke", "black")
        .style("fill", "white")
        .attr("width", 20)
        .attr("height", 16);

    this.totalShotsGroup.append("svg:text")
        .text(function(d){return d})
        .attr("text-anchor", "middle")
        .attr("class","stats_text")
        .style("font-size", 10)
        .style("fill", "black")
        .attr("x", 20/2)
        .attr("y", 12);

};

ShotsVis.prototype.clickBrushing = function(){
    catchEvent();
    var $this = this;
    //activate the brushing
    if(this.brush){

        //brush on the field
        this.visSVG.append("svg:g")
            .attr("class", "brush")
            .attr("transform", $this.fieldRect.attr("transform"))
            .call(d3.svg.brush().x($this.xBrushField).y($this.yBrushField)
            .on("brush", brushmoveField)
            .on("brushend", brushendField));

        //brush on the mouth
        this.visSVG.append("svg:g")
            .attr("class", "brush")
            .attr("transform", $this.goalRect.attr("transform"))
            .call(d3.svg.brush().x($this.xBrushMouth).y($this.yBrushMouth)
            .on("brush", brushmoveMouth)
            .on("brushend", brushendMouth));


        function brushmoveField() {
            var e = d3.event.target.extent();
            $this.brushedShotsField = [];
            $this.shotsField.each(function(d){
                var shotx = $this.xBrushShotsField(d.x);
                var shoty = $this.yBrushShotsField(d.y);
                if( e[0][0] <= shotx && shotx <= e[1][0]
                    && e[0][1] <= shoty && shoty <= e[1][1]){
                    $this.brushedShotsField.push(d);
                }
            });
            $this.filterShots();
        }

        function brushmoveMouth() {
            var e = d3.event.target.extent();
            $this.brushedShotsMouth = [];
            $this.shotsField.each(function(d){
                var mouth = $this.getMouth(d);
                if(mouth == null) return;
                var mouthx = $this.xBrushShotsMouth(mouth[1]);
                var mouthy = $this.yBrushShotsMouth(mouth[0]);
                if( e[0][0] <= mouthx && mouthx <= e[1][0]
                    && e[0][1] <= mouthy && mouthy <= e[1][1]){
                    $this.brushedShotsMouth.push(d);
                }
            });
            $this.filterShots();
        }

        function brushendField() {
            if(d3.event.target.empty()) $this.brushedShotsField = null;
            $this.filterShots();
        }
        function brushendMouth() {
            if(d3.event.target.empty()) $this.brushedShotsMouth = null;
            $this.filterShots();
        }
    }
    //cancel the brushing
    else{
        //console.log("remove brush");
        this.visSVG.selectAll(".brush").remove();
        this.visSVG.style("cursor", "default");
        $this.brushedShotsField = null;
        $this.brushedShotsMouth = null;
        $this.filterShots();
    }
};

ShotsVis.prototype.clickFilterMode = function(){
    catchEvent();
    this.filterModes.selectAll("rect")
        .style("fill", function(d){
            if(d.selected == true){
                switch(d.name){
                    case "goal":
                        return "green";
                    case "post":
                        return "pink";
                    case "saved":
                        return "blue";
                    case "missed":
                        return "red";
                    default:
                        console.log("unknown name for shot: "+ d.name);
                        return "yellow";
                }
            }
            else return "white";
        });

    this.filterShots();
};

ShotsVis.prototype.clickVisuMode = function(mode){
    catchEvent();
    //if a new mode
    if(mode == this.visuMode) return;

    var $this = this;
    this.visuModes.selectAll("rect")
        .classed("modes_selected", function(d){
            if(d==mode){
                $this.visuMode = d;
                return true;
            }
            return false;
        });

    switch(this.visuMode){
        case "dots":
            this.shots.selectAll(".shotsDotsElement")
                .style("visibility", "visible");
            this.shots.selectAll(".shotsCommonElement")
                .attr("r", 2)
                .style("fill", "");
            d3.select(".visuShotsSlider")
                .style("visibility", "hidden");
            break;
        case "spray":
            this.shots.selectAll(".shotsDotsElement")
                .style("visibility", "hidden");
            this.shots.selectAll(".shotsCommonElement")
                .attr("r", $this.sprayRadius)
                .style("fill", "url(#radialGradientSpray)");
            d3.select(".visuShotsSlider")
                .style("visibility", "visible");
            break;
    }

    //update the current mode
    this.visuMode = mode;
};

ShotsVis.prototype.drawShots = function(){
    var $this = this;
    if(this.shots == undefined){
        //do not draw the actual shot of the sequence, which will be drawn separately
        this.shots = this.visSVG
            .append("g")
            .attr("class","context")
            .selectAll(".shots_shots")
            .data(this.context_data.filter(function(d){return d.unique_id != $this.shotId}))
            .enter()
            .append("svg:g")
            .attr("class", function(d){return "shots_shots shot_"+d.shot_type});
    }

    /*--------------------
     The dotted shots
     -------------------*/

    var tField = d3.transform($this.fieldRect.attr("transform"));
    var tMouth = d3.transform($this.goalRect.attr("transform"));

    //circle on the field
    this.shotsField = this.shots
        .append("svg:circle")
        .attr("class", "shotsCommonElement")
        .attr("transform", $this.fieldRect.attr("transform"))
        .attr("cx", function(d){return $this.x_scale_field(d.x)})
        .attr("cy", function(d){return $this.y_scale_field(d.y)})
        .attr("r", 2);

    this.shots.each(function(d){
        var mouth = $this.getMouth(d);

        //for shots having a mouth
        if(mouth != null){
            //add the circle on the mouth
            d3.select(this).append("svg:circle")
                .attr("class", "shotsCommonElement")
                .attr("transform", $this.goalRect.attr("transform"))
                .attr("cx", function(){return $this.x_scale_goal(mouth[1])})
                .attr("cy", function(){return $this.y_scale_goal(mouth[0])})
                .attr("r", 2);

            //add the line between the 2 circles
            d3.select(this).append("svg:line")
                .attr("class", "shotsDotsElement")
                .attr("stroke-width",.5)
                .attr("x1",function(d){return $this.x_scale_field(d.x)+tField.translate[0];})
                .attr("y1",function(d){return $this.y_scale_field(d.y)+tField.translate[1];})
                .attr("x2",function(){return $this.x_scale_goal(mouth[1])+tMouth.translate[0]})
                .attr("y2",function(){return $this.y_scale_goal(mouth[0])+tMouth.translate[1]});
        }
        else{
            var blocked = $this.getBlocked(d);
            if(blocked != null){
                //console.log("blocked");
                //console.log("TODO - blocked: "+JSON.stringify(d));
            }
            else{
                //console.log("not MOUTH nor BLOCKED for "+JSON.stringify(s));
            }
        }
    });
};

ShotsVis.prototype.getBlocked = function(d){
    var blockedX = undefined;
    var blockedY = undefined;
    for(var q in d.qualifiers){
        var qual = d.qualifiers[q];
        if(qual.qid == Q_SHOT_BLOCKED_X){
            blockedX = qual.value;
        }
        else if(qual.qid == Q_SHOT_BLOCKED_Y){
            blockedY = qual.value;
        }
    }
    if(blockedX != undefined && blockedY != undefined)return [blockedX, blockedY];
    else return null;
};

ShotsVis.prototype.getMouth = function(d){
    var mouthY = undefined;
    var mouthZ = undefined;
    for(var q in d.qualifiers){
        var qual = d.qualifiers[q];
        if(qual.qid == Q_SHOT_GOAL_MOUTH_Y){
            mouthY = qual.value;
        }
        else if(qual.qid == Q_SHOT_GOAL_MOUTH_Z){
            mouthZ = qual.value;
        }
    }
    if(mouthY != undefined && mouthZ != undefined)return [mouthY, mouthZ];
    else return null;
};

ShotsVis.prototype.drawField = function(){
    //the field rect
    this.drawFieldRect(0, 0, 1, 1, true);
    //central circle
    //this.drawFieldCircle(0, 0.5, 0.18);
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

ShotsVis.prototype.drawFieldHalfCircle = function(x, y, r, isFilled){
    var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
    this.fieldRect.append("svg:path")
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
ShotsVis.prototype.drawFieldCircle = function(x, y, r, isFilled){
    var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
    this.fieldRect.append("circle")
        .attr("class", c)
        .attr("cx", this.distXOnField(x))
        .attr("cy", this.distYOnField(y))
        .attr("r", this.distXOnField(r));
};

/*
 x, width as fractions of X
 y, height as fractions on Y
 */
ShotsVis.prototype.drawFieldRect = function(x, y, width, height, isFilled){
    var c = isFilled ? "fieldRect" : "fieldLines";
    this.fieldRect.append("rect")
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
ShotsVis.prototype.drawFieldLine = function(x1, y1, x2, y2){
    this.fieldRect.append("line")
        .attr("class", "fieldLines")
        .attr("x1", this.distXOnField(x1))
        .attr("y1", this.distYOnField(y1))
        .attr("x2", this.distXOnField(x2))
        .attr("y2", this.distYOnField(y2));
};

ShotsVis.prototype.distYOnField = function(y){
    return y*this.fieldHeight;
};

ShotsVis.prototype.distXOnField = function(x){
    return x*this.fieldWidth;
};










/*
 params:
 {width, height, padding, parent, sliderClass, x, y, rootSVG, parentVisu, slider_range}
 */
function SimpleSlider(params){
    this.init(params);
}

SimpleSlider.prototype.init = function(params){

    this.slider_range = params.slider_range;

    var slider = params.parent.append("g")
        .attr("class", params.sliderClass)
        .attr("transform", "translate("+params.x+","+params.y+")");

    var rect = slider.append("svg:rect")
        .attr("class", "layer")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", params.width)
        .attr("height", params.height);

    var _dragSliderLine;

    var sliderLine = this.sliderLine = slider.append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", -params.padding*2)
        .attr("y2", params.height + params.padding * 2)
        .on("mousedown", function(){
            d3.event.preventDefault();
            d3.event.stopPropagation();
            _dragSliderLine = this;
            this.style.cursor = "pointer";
            return false;
        });


    sliderLine.on("mouseup", function(){
        d3.event.preventDefault();
        d3.event.stopPropagation();
        if (_dragSliderLine != null){
            _dragSliderLine.style.cursor = "pointer";
            _dragSliderLine = null;
        }
    });

    rect.on("mousemove", function(){
        d3.event.preventDefault();
        d3.event.stopPropagation();

        if( _dragSliderLine != null ){
            var coordinateX = d3.mouse(this)[0];
            sliderLine.attr("x1", coordinateX).attr("x2", coordinateX);
            //$this.filterEdges();
            if(params.parentVisu instanceof ShotsVis){
                params.parentVisu.changeSprayRadius(sliderLine.attr("x1"));
            }

        }
    });
    rect.on("mouseup", function(){
        d3.event.stopPropagation();
    })
};
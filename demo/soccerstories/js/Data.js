var CONTEXT_ALL_PLAYERS = 0,
    CONTEXT_INVOLVED_PLAYERS = 1;

var SHOW_SEQUENCE_INFOS = false;

var OVER_OBJECT_COLOR = "steelblue",
    SELECTED_OBJECT_COLOR = "darkred";

var DEFAULT_SEQUENCE = 12,
    DEFAULT_ANIMATE_CLUSTERING_MODE = 1,
    DEFAULT_ANIMATE_CLUSTERING_DURATION = 1,
    DEFAULT_ANIMATE_SEQUENCE_DURATION = 1,
    DEFAULT_NODE_STYLE = 0,
    DEFAULT_PASS_CLUSTER_STYLE = 0,
    DEFAULT_GLOBAL_FLOW_INTERPOLATE = 5,
    DEFAULT_GLOBAL_FLOW_SIZE = 40,
    DEFAULT_SEQUENCE_LAYOUT = 1,
    DEFAULT_SEQUENCE_LAYOUT_DURATION = 3,
    DEFAULT_SEQUENCE_LAYOUT_DELAY = 3,
    DEFAULT_SEQUENCE_VIS_MODE = 3,
    DEFAULT_SEQUENCE_VIS_ANIMATION_DURATION = 0,
    DEFAULT_SEQUENCE_VIS_ANIMATION_DELAY = 0,
    DEFAULT_SWITCH_VIS_TYPE = 0,
    DEFAULT_SWITCH_VIS_DURATION = 8,
    DEFAULT_EXPORT_MODE = 0;

Data = function(_data) {
    var $this = this;
    console.log(_data);
    this.formation = new Formation(_data.formation, _data.players);
    this.players = _data.players;
    this.computePlayersStats();
    this.matchInfos = _data.matchInfos;
    this.matrixPass = _data.matrixPass;

    this.nbPassMax = d3.max(this.matrixPass, function(link){
        return link.nb;
    });


    //preprocess the sequences : eid 12 = clearance -> eid1 : pass
    _data.sequences.forEach(function(seq){
        seq.actions.forEach(function(action){
            if(action.eid == E_DEF_CLEARANCE) {
                console.log("converting Clearance to Pass");
                action.eid = E_PASS;
                var endX, endY;
                action.qualifiers.forEach(function(qual){
                    if(qual.qid == Q_PASS_END_X) endX = true;
                    if(qual.qid == Q_PASS_END_Y) endY = true;
                });
                if(!endX) {
                    console.log("adding missing qualifier endX");
                    action.qualifiers.push({qid: Q_PASS_END_X, value: action.x});
                }
                if(!endY){
                    console.log("adding missing qualifier endY");
                    action.qualifiers.push({qid: Q_PASS_END_Y, value: action.y});
                }
            }
        });
    });

    _data.sequences = _data.sequences.sort(function(s1,s2){
        if(s1.endTime.period<s2.endTime.period) return -1;
        else if(s1.endTime.period>s2.endTime.period) return 1;
        else if(s1.endTime.min<s2.endTime.min) return -1;
        else if(s1.endTime.min>s2.endTime.min) return 1;
        else if(s1.endTime.sec<s2.endTime.sec) return -1;
        else if(s1.endTime.sec>s2.endTime.sec) return 1;
        else return 0;
    });

    /*//display the start and end times of the sequences
    var times = [];
    _data.sequences.forEach(function(d,i){
        times[i] = ""+ d.endTime.min+":"+ d.endTime.sec;
    });
    console.log(times);
    */

    /*//display the number of actions in the sequences
     var actions = [];
     _data.sequences.forEach(function(d,i){
     actions[i] = d.actions.length;
     });
     console.log(actions);
*/




    this.sequences = [];

    this.nodeRadius = 10;




    var infosH = 50,
        tlH = 60,
        tlMargin = 10,
        seqVisMargin = 10,
        seqVisWidth = 300,
        fieldH = 600,
        fieldW = fieldH*1.5,
        w = fieldW+seqVisMargin+seqVisWidth,
        annotationsHeight = 200;

    var h = infosH+tlMargin+fieldH+tlH+tlMargin+tlMargin*4;

    var settingsLeft = 570;

    var lcInfosW = 190,
        lcInfosH = h,
        lcInfosMargin = 10;

    d3.select("body")
        .append("div")
        .attr("id","settings")
        .style("position","fixed")
        .style("top",(h+tlMargin*2)+"px")
        .style("left",(settingsLeft+lcInfosMargin)+"px")
        //.style("width",lcInfosW+"px");

    this.createSettingsButtons();


    this.liveCoverInfos = new LiveCoverInfos(this,lcInfosMargin,lcInfosMargin,lcInfosW,lcInfosH);






    //this.annotations = new Annotations($this,h+tlMargin*2,annotationsHeight);

    var div = d3.select("#testSequences")
        .append("canvas")
        .attr("id","export-canvas")
        .attr("y",h+tlMargin*2+annotationsHeight+"px")
        .attr("width",0)
        .attr("height",0)
        .style("position","absolute")
        .style("top",h+tlMargin*2+annotationsHeight+"px");


    var svg = d3.select('#testSequences')
        .append("span")
        .attr("id","svg1-container")
        .append("svg:svg")
        .attr("id","svg1")
        .attr("width", w)
        .attr("height", h);

    svg.append("rect")
        .style("fill","white")
        .attr("width", w)
        .attr("height", h);

    //add the arrow marker
    var defs = svg.append("svg:defs");
    defs.append("svg:marker")
        .attr("id", "arrowHead")
        .attr("orient", "auto")//the arrow follows the line direction
        .attr("markerWidth", 6)
        .attr("markerHeight", 8)
        .attr("refX", 5)
        .attr("refY", 4)
        .append("svg:path")
        .attr("d", "M0,0 V8 L6,4 Z")
        .attr("fill", "black");

    //the shadow for aerial passes
    var s = defs.append("svg:filter")
        .attr("id","shadow-pass");
    s.append("svg:feOffset")//Shadow Offset
        .attr("dx","0")
        .attr("dy","0");
    s.append("svg:feGaussianBlur")//Shadow Blur
        .attr("result","offset-blur")
        .attr("stdDeviation","2");
    s.append("svg:feFlood")//Color & Opacity
        .attr("flood-color","black")
        .attr("flood-opacity","1")
        .attr("result","color");
    s.append("svg:feComposite")//Clip color inside shadow
        .attr("operator","in")
        .attr("in","color")
        .attr("in2","offset-blur")
        .attr("result","shadow");
    s.append("svg:feComposite")//Clip color inside shadow
        .attr("operator","over")
        .attr("in","SourceGraphic")
        .attr("in2","shadow");

    /*
     <rect width="90" height="90" stroke="green" stroke-width="3"
     fill="yellow" filter="url(#f1)" />
     */

    //the "sine" path for waves along path
    var f = defs.append("svg:font")
        .attr("id", "fontWaves")
        .attr("horiz-adv-x", 100);
    f.append("svg:font-face")
        .attr("font-family", "fontWaves")
        .attr("units-per-em", 100);
    f.append("svg:missing-glyph")
        .attr("horiz-adv-x",100);
    f.append("svg:glyph")
        .attr("unicode", "a")
        .attr("horiz-adv-x",25)
        .attr("d","M 0 0 C10 10 15 15 26 15 ");
    f.append("svg:glyph")
        .attr("unicode", "b")
        .attr("horiz-adv-x",25)
        .attr("d","M 0 15 C10 15 15 10 26 0 ");
    f.append("svg:glyph")
        .attr("unicode", "c")
        .attr("horiz-adv-x",25)
        .attr("d","M 0 0 C10 -10 15 -15 26 -15 ");
    f.append("svg:glyph")
        .attr("unicode", "d")
        .attr("horiz-adv-x",25)
        .attr("d","M 0 -15 C10 -15 15 -10 26 0 ");

    /*
     <font id="myFont" horiz-adv-x="100">
     <font-face font-family="My Font" units-per-em="100"/>
     <missing-glyph horiz-adv-x="100"/>
     <glyph unicode="a" horiz-adv-x="25" d="M 0 0 C10 10 15 15 26 15 " />
     <glyph unicode="b" horiz-adv-x="25" d="M 0 15 C10 15 15 10 26 0 " />
     <glyph unicode="c" horiz-adv-x="25" d="M 0 0 C10 -10 15 -15 26 -15 " />
     <glyph unicode="d" horiz-adv-x="25" d="M 0 -15 C10 -15 15 -10 26 0 " />
     </font>*/
    /*  <path id="mySecondPath" fill="none" stroke="blue" stroke-width="2" d="M 100 100 C 300 300 300 -100 500 100"/>
     <text font-family="My Font" font-size="40" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" >
     <textPath xlink:href="#mySecondPath"> abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd</textPath>
     </text>*/

    //add the spray gradient definition
    //Define our color gradients
    var gradientValues = [
        {color:"#840000", offset:"0%", opacity:0.3},
        {color:"#840000", offset:"20%", opacity:0.2},
        {color:"#FF0000", offset:"50%", opacity:0.1},
        {color:"#FF0000", offset:"100%", opacity:0}
    ];
    var gradient = defs.append("svg:radialGradient")
        .attr("id", "radialGradientSpray")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");

    for(var v in gradientValues){
        gradient.append("svg:stop")
            .attr("offset", gradientValues[v].offset)
            .attr("stop-color", gradientValues[v].color)
            .attr("stop-opacity", gradientValues[v].opacity);
    }



    this.field = new Field(svg, 0, infosH+tlH+tlMargin*6, fieldW, fieldH);

    layerHulls = svg.append("g").attr("transform", d3.transform(this.field.fieldGroup.attr("transform")).toString());


    _data.sequences.forEach(function(sequence,i){
        $this.sequences[i] = new Sequence(sequence, $this, i);
        $this.sequences[i].init();
    });

    this.liveCover = new LiveCoverVis($this, svg, 0, 0, fieldW, infosH);

    $this.timeline = new TimelineVis($this, svg, 0, infosH, fieldW, tlH, 300);
    $this.timeline.createSequences();

    $this.sequencesVis = new SequencesVis($this, svg, fieldW + seqVisMargin, 0, seqVisWidth, h);
    $this.sequencesVis.createSequences();


    var textW = 350;
    this.textAutoVis = new TextAutoVis($this,fieldW+seqVisMargin+seqVisWidth,0,textW,h);

    svg.on("click",function(){
        $this.clickOnBackground();
    });
};


Data.prototype.computePlayersStats = function(){
    this.players.forEach(function(player){
        player.stats = computePlayerStat(player);
    });


    function computePlayerStat(player){

        var stats = [
            {event: player.first_name+" "+player.last_name},//0
            {event: "shots:goal", nb: 0},//1
            {event: "shots:saved", nb: 0},//2
            {event: "shots:missed", nb: 0},//3
            {event: "shots:chance missed", nb: 0},//4
            {event: "shots:post", nb: 0},//5
            {event: "corners:given", nb: 0},//6
            {event: "corners:obtained", nb: 0},//7
            {event: "passes:success", nb: 0},//8
            {event: "passes:failed", nb: 0},//9
            {event: "fouls:commited", nb: 0},//10
            {event: "fould:suffered", nb: 0},//11
            {event: "interceptions", nb: 0},//12
            {event: "tackles:success", nb: 0},//13
            {event: "tackles:failed", nb: 0},//14
            {event: "aerial duel:lost", nb: 0},//15
            {event: "aerial duel:won", nb: 0},//16
            {event: "lost ball", nb: 0},//17
            {event: "dribble:success", nb: 0},//18
            {event: "dribble:failed", nb: 0},//19
            {event: "cards:yellow", nb: 0},//20
            {event: "cards:red", nb: 0}//21
        ];

        function getStatFromName(name){
            for(var s in stats){
                if(stats[s].event == name) return stats[s];
            }
            throw "can't find stat with name "+name;
        }

        if(player.events){
            player.events.forEach(function(event){
                switch(event.eid){
                    case E_PASS:
                        if(event.outcome == 1) getStatFromName("passes:success").nb ++;
                        else getStatFromName("passes:failed").nb ++;
                        break;
                    case E_PASS_OFFSIDE:
                        getStatFromName("passes:failed").nb ++;
                        break;
                    case E_SHOT_GOAL:
                        getStatFromName("shots:goal").nb ++;
                        break;
                    case E_SHOT_MISS:
                        getStatFromName("shots:missed").nb ++;
                        break;
                    case E_SHOT_CHANCE_MISSED:
                        getStatFromName("shots:chance missed").nb ++;
                        break;
                    case E_SHOT_SAVED:
                        getStatFromName("shots:saved").nb ++;
                        break;
                    case E_SHOT_POST:
                        getStatFromName("shots:post").nb ++;
                        break;
                    case E_CORNER:
                        if(event.outcome == 1) getStatFromName("corners:given").nb ++;
                        else getStatFromName("corners:obtained").nb ++;
                        break;
                    case E_DEF_TACKLE:
                        getStatFromName("tackles:success").nb ++;
                        break;
                    case E_ERROR_CHALLENGE:
                        getStatFromName("tackles:failed").nb ++;
                        break;
                    case E_FOUL:
                        if(event.outcome == 1) getStatFromName("fould:suffered").nb ++;
                        else getStatFromName("fouls:commited").nb ++;
                        break;
                    case E_DEF_INTERCEPTION:
                        getStatFromName("interceptions").nb ++;
                        break;
                    case E_AERIAL_DUEL:
                        if(event.outcome == 1) getStatFromName("aerial duel:won").nb ++;
                        else getStatFromName("aerial duel:lost").nb ++;
                        break;
                    case E_ERROR_DISPOSSESSED:
                        getStatFromName("lost ball").nb ++;
                        break;
                    case E_SPECIAL_TAKE_ON:
                        if(event.outcome == 1) getStatFromName("dribble:success").nb ++;
                        else getStatFromName("dribble:failed").nb ++;
                        break;
                    case E_FOUL_CARD:
                        for(var q in event.qualifiers){
                            var qual = event.qualifiers[q];
                            if(qual.qid == Q_FOUL_YELLOW_CARD || qual.qid == Q_FOUL_YELLOW_CARD_SECOND){
                                getStatFromName("cards:yellow").nb ++;
                                break;
                            }
                            else if(qual.qid == Q_FOUL_RED_CARD){
                                getStatFromName("cards:red").nb ++;
                                break;
                            }
                        }

                        break;


                    //events to ignore
                    case E_BALL_OUT:
                    case 49://Ball recovery
                    case 61://ball touch
                    case 43://deleted event
                    case E_FORMATION_PLAYER_OFF:
                    case E_FORMATION_PLAYER_ON:
                    case E_GK_CLAIM:
                    case E_GK_PICK_UP:
                    case E_GK_SAVE:
                    case E_GK_PUNCH:
                    case E_GK_SWEEPER:
                    case E_GK_SMOTHER:
                    case E_DEF_CLEARANCE:
                    case E_SPECIAL_GOOD_SKILL:
                    case E_DEF_OFFSIDE_PROVOKED:
                    case E_ERROR_ERROR:
                    case 58://penalty faced
                        break;


                    default: console.log("warning, unknown eid "+event.eid+" when parsing stats for "+JSON.stringify(event));

                }
            });
        }

        return stats;
    }

};


/*
 Unselect the selected node if exist, and the selected vis if exist
 */
Data.prototype.clickOnBackground = function(){
    if(this.selected_sequence != undefined){
        if(this.selected_sequence.selectedPlayerId != undefined){
            this.selected_sequence.unselectSelectedPlayer();
        }
        if(this.selected_sequence.selectedVisId != undefined){
            this.selected_sequence.unselectSelectedVis();
        }
    }
};



Data.prototype.createSettingsButtons = function(){
    var $this = this;

    //the duration dropdown for the sequence animation to field
    var animateSequenceDuration = [];
    for(var i=0;i<11;i++){
        animateSequenceDuration.push(i*100);
    }
    var div1 = d3.select("#settings")
        .append("div");
    div1.append("label")
        .html("Sequence Animation");
    var sequenceDurationSelect = div1
        .append("select")
        .attr("class","sequenceDurationSelect")
        .on("change", function(){$this.selectAnimateSequenceDuration()});

    sequenceDurationSelect
        .selectAll(".sequenceDurationOption")
        .data(animateSequenceDuration)
        .enter()
        .append("option")
        .attr("name", "animateSequenceDuration")
        .attr("value", function(d){return d})
        .html(function(d){return d});


    var animateClusteringDuration = [];
    for(i=0;i<20;i++){
        animateClusteringDuration.push(i*100);
    }
    div1.append("label")
        .html("<br>Clustering Duration:");

    var clusteringDurationSelect = div1
        .append("select")
        .attr("class","clusteringDurationSelect")
        .on("change", function(){$this.selectAnimateClusteringDuration()});

    clusteringDurationSelect
        .selectAll(".clusteringDurationOption")
        .data(animateClusteringDuration)
        .enter()
        .append("option")
        .attr("name", "animateClusteringDuration")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div1.append("label")
        .html("<br>");

    //the clusterize button
    div1
        .append("button")
        .attr("id", "clusterizeButton")
        .html("clusterize")
        .on("click", function(){
            var selected_seq = $this.selected_sequence;
            if(selected_seq!=null){
                selected_seq.clusterize($this.animateClusteringDuration, $this.animateClusteringDuration*4);
            }
        });

    div1.append("label")
        .html("<br>Nodes Style:");

    var selNodesStyle = div1
        .append("select")
        .attr("class","nodesStyleSelect")
        .on("change", function(){$this.selectNodeStyle()});

    selNodesStyle
        .selectAll(".nodeStyleOption")
        .data(["circle","jersey"])
        .enter()
        .append("option")
        .attr("class","nodeStyleOption")
        .attr("name", "nodeStyleOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div1.append("label")
        .html("<br>Pass Cluster Style:");

    var selPassClusterStyle = div1
        .append("select")
        .attr("class","passClusterStyleSelect")
        .on("change", function(){$this.selectPassClusterStyle()});

    selPassClusterStyle
        .selectAll(".passClusterStyleOption")
        .data(["Node-link","Node-link-all","HivePlot","Matrix","TagCloud"])
        .enter()
        .append("option")
        .attr("class","passClusterStyleOption")
        .attr("name", "passClusterStyleOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});




    var div2 = d3.select("#settings")
        .append("div");

    div2.append("label")
        .html("<br>Selected vis:<br>");

    div2.append("label")
        .html("Context:");
    div2.append("input")
        .attr("checked", false)
        .attr("type", "checkbox")
        .attr("id","contextCheck")
        .on("change", function(){$this.selectContext()});

    div2.append("label")
        .html("<br>Change vis:");

    div2.append("label")
        .html("<br>Duration:");
    var switchVisDuration = [];
    for(i=0;i<=10;i++){
        switchVisDuration.push(i*100);
    }

    var switchVisDurationSelect = div2.append("select")
        .attr("class","switchVisDurationSelect")
        .on("change", function(){$this.selectSwitchVisDuration()});

    switchVisDurationSelect
        .selectAll(".switchVisDurationOption")
        .data(switchVisDuration)
        .enter()
        .append("option")
        .attr("class","switchVisDurationOption")
        .attr("name", "switchVisDurationOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    var switchVisType = [
        "HivePlot",
        "Node-link",
        "Node-link-all",
        "TagCloud",
        "Matrix"
    ];

    div2.append("label")
        .html("<br>Type:");
    var switchVisTypeSelect = div2.append("select")
        .attr("class","switchVisTypeSelect")
        .on("change", function(){$this.selectSwitchVisType()});

    switchVisTypeSelect.selectAll(".switchVisTypeOption")
        .data(switchVisType)
        .enter()
        .append("option")
        .attr("class", "switchVisTypeOption")
        .attr("name", "switchVisTypeOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    //the clusterize button
    div2.append("label")
        .html("<br>");
    div2
        .append("button")
        .attr("id", "changeVisButton")
        .html("change")
        .on("click", function(){$this.changeVisType()});


    var div3 = d3.select("#settings")
        .append("div");
    div3.append("label")
        .html("Field:");
    div3.append("input")
        .attr("checked", false)
        .attr("type", "checkbox")
        .attr("id","fieldCheck")
        .on("change", function(){$this.selectField()});

    div3.append("label")
        .html("Global flow:");
    div3.append("input")
        .attr("checked", false)
        .attr("type", "checkbox")
        .attr("id","globalFlowCheck")
        .on("change", function(){$this.selectGlobalFlow()});

    div3.append("p");
    div3.append("label")
        .html("Type:");
    var globalFlowSelect = div3.append("select")
        .attr("class","globalFlowInterpolateSelect")
        .on("change", function(){$this.selectGlobalFlowInterpolate()});

    globalFlowSelect.selectAll(".globalFlowInterpolateOption")
        .data([
        "linear",
        "step-before",
        "step-after",
        "basis",
        "basis-closed",
        "cardinal",
        "cardinal-closed"
    ])
        .enter()
        .append("option")
        .attr("name", "globalFlowInterpolateOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div3.append("label")
        .html("<br>Size:");

    this.globalFlowSize = DEFAULT_GLOBAL_FLOW_SIZE;
    div3.append("div").attr("id","globalFlowSize").style("width","90px");
    $("#globalFlowSize").slider({
        max: 100,
        min: 10,
        value: $this.globalFlowSize,
        slide: function(event,ui){$this.changeGlobalFlowSize(event,ui)}
    });


    var div4 = d3.select("#settings")
        .append("div");

    div4.append("label")
        .html("Sequence layout:");

    var sequenceLayoutSelect = div4.append("select")
        .attr("class","sequenceLayoutSelect")
        .on("change", function(){$this.selectSequenceLayout()});

    sequenceLayoutSelect.selectAll(".sequenceLayoutOption")
        .data([
        "2D",
        "horizontal"
    ])
        .enter()
        .append("option")
        .attr("name", "sequenceLayoutOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});


    div4.append("label")
        .html("<br>Duration:");

    var sequenceLayoutDuration = div4.append("select")
        .attr("class","sequenceLayoutDurationSelect")
        .on("change", function(){$this.selectSequenceLayoutDuration()});

    var dataSequenceLayoutDuration = [];
    for(i=0;i<=10;i++){
        dataSequenceLayoutDuration.push(i*100);
    }

    sequenceLayoutDuration.selectAll(".sequenceLayoutDurationOption")
        .data(dataSequenceLayoutDuration)
        .enter()
        .append("option")
        .attr("name", "sequenceLayoutDurationOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});


    var dataSequenceLayoutDelay = [];
    for(i=0;i<=10;i++){
        dataSequenceLayoutDelay.push(i*100);
    }

    div4.append("label")
        .html("<br>Delay:");

    var sequenceLayoutDelay = div4.append("select")
        .attr("class","sequenceLayoutDelaySelect")
        .on("change", function(){$this.selectSequenceLayoutDelay()});

    sequenceLayoutDelay.selectAll(".sequenceLayoutDelayOption")
        .data(dataSequenceLayoutDelay)
        .enter()
        .append("option")
        .attr("name", "sequenceLayoutDelayOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div4.append("label")
        .html("<br>");

    div4.append("button")
        .attr("id", "relayoutButton")
        .html("re-layout")
        .on("click", function(){
            if($this.selected_sequence!=null){
                $this.selected_sequence.autoLayout($this.sequenceLayoutDuration, $this.sequenceLayoutDelay, $this.sequenceLayout, false);
            }
        });


    var div5 = d3.select("#settings")
        .append("div");

    div5.append("label")
        .html("Sequences Vis:<br>");

    var displayModes = ["Scaled","ScaledLinks","Signature","Worm","XProj","YProj","TimeAlign","DistanceAlign","Donut"];

    var sequenceVisSelect = div5.append("select")
        .attr("class","sequenceVisModeSelect")
        .on("change", function(){$this.selectSequenceVisMode()});

    sequenceVisSelect
        .selectAll(".sequenceVisModeOption")
        .data(displayModes)
        .enter()
        .append("option")
        .attr("class","sequenceVisModeOption")
        .attr("name", "sequenceVisModeOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div5.append("label")
        .html("<br>Duration:");

    var sequenceVisDuration = [];
    for(i=0;i<=10;i++){
        sequenceVisDuration.push(i*100);
    }

    var sequenceVisDurationSelect = div5.append("select")
        .attr("class","sequenceVisDurationSelect")
        .on("change", function(){$this.selectSequenceVisDuration()});

    sequenceVisDurationSelect
        .selectAll(".sequenceVisDurationOption")
        .data(sequenceVisDuration)
        .enter()
        .append("option")
        .attr("class","sequenceVisDurationOption")
        .attr("name", "sequenceVisDurationOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div5.append("label")
        .html("<br>Delay:");

    var sequenceVisDelay = [];
    for(i=0;i<=10;i++){
        sequenceVisDelay.push(i*10);
    }

    var sequenceVisDelaySelect = div5.append("select")
        .attr("class","sequenceVisDelaySelect")
        .on("change", function(){$this.selectSequenceVisDelay()});

    sequenceVisDelaySelect
        .selectAll(".sequenceVisDelayOption")
        .data(sequenceVisDelay)
        .enter()
        .append("option")
        .attr("class","sequenceVisDelayOption")
        .attr("name", "sequenceVisDelayOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div5.append("label")
        .html("<br>Draw Field:");
    div5.append("input")
        .attr("checked", false)
        .attr("type", "checkbox")
        .attr("id","sequenceVisCheckField")
        .on("change", function(){$this.selectSequenceVisCheckField()});


    /* the export images div
    var div6 = d3.select("#settings")
        .append("div");

    div6.append("label")
        .html("Export Images:<br>");

    var exportModes = ["Focus Sequence","Thumbnail","Selected Vis"];

    var exportModesSelect = div6.append("select")
        .attr("class","exportModesSelect")
        .on("change", function(){$this.selectExportMode()});

    exportModesSelect
        .selectAll(".exportModeOption")
        .data(exportModes)
        .enter()
        .append("option")
        .attr("class","exportModeOption")
        .attr("name", "exportModeOption")
        .attr("value", function(d){return d})
        .html(function(d){return d});

    div6
        .append("button")
        .attr("id", "exportButton")
        .html("export")
        .on("click", function(){$this.exportImage()});*/

};



Data.prototype.selectAnimateClusteringDuration = function(){
    this.animateClusteringDuration = $('select option[name=animateClusteringDuration]:selected').val();
};
Data.prototype.selectAnimateSequenceDuration = function(){
    this.animateSequenceDuration = $('select option[name=animateSequenceDuration]:selected').val();
};
Data.prototype.selectNodeStyle = function(){
    this.nodeStyle = $('select option[name=nodeStyleOption]:selected').val();
    if(this.selected_sequence != undefined){
        this.selected_sequence.changeNodeStyle(this.nodeStyle,0);
    }
};
Data.prototype.selectPassClusterStyle = function(){
    this.passClusterStyle = $('select option[name=passClusterStyleOption]:selected').val();
};
Data.prototype.selectField = function(){
    this.fieldChecked = ($("#fieldCheck")).prop("checked");
    this.field.fieldDrawingLayer.selectAll(".fieldLines, .fieldPoints, .fieldRect")
        .style("opacity", (this.fieldChecked) ? 1 : 0);
};
Data.prototype.selectContext = function(){
    this.contextChecked = ($("#contextCheck")).prop("checked");
    if(this.selected_sequence != undefined){
        this.selected_sequence.showContextSelectedVis(this.contextChecked);
    }
};
Data.prototype.selectGlobalFlow = function(){
    this.globalFlowChecked = ($("#globalFlowCheck")).prop("checked");
    d3.select("#svg1").selectAll(".globalFlow")
        .style("opacity", (this.globalFlowChecked) ? 1 : 0);
};
Data.prototype.selectGlobalFlowInterpolate = function(){
    this.globalFlowInterpolate = $('select option[name=globalFlowInterpolateOption]:selected').val();
    if(this.selected_sequence != undefined){
        this.selected_sequence.updateGlobalFlow(500);
    }
};
Data.prototype.changeGlobalFlowSize = function(event,ui){
    this.globalFlowSize = ui.value;
    if(this.selected_sequence != undefined){
        this.selected_sequence.updateGlobalFlow(0);
    }
};
Data.prototype.selectSequenceLayout = function(){
    this.sequenceLayout = $('select option[name=sequenceLayoutOption]:selected').val();
};
Data.prototype.selectSequenceLayoutDuration = function(){
    this.sequenceLayoutDuration = $('select option[name=sequenceLayoutDurationOption]:selected').val();
};
Data.prototype.selectSequenceLayoutDelay = function(){
    this.sequenceLayoutDelay = $('select option[name=sequenceLayoutDelayOption]:selected').val();
};
Data.prototype.selectSequenceVisMode = function(){
    this.thumbnailMode = $('select option[name=sequenceVisModeOption]:selected').val();
    this.sequencesVis.setThumbnailsMode(this.thumbnailMode, this.thumbnailAnimationDuration, this.thumbnailAnimationDelay);
};
Data.prototype.selectSequenceVisDuration = function(){
    this.thumbnailAnimationDuration = $('select option[name=sequenceVisDurationOption]:selected').val();
};
Data.prototype.selectSequenceVisDelay = function(){
    this.thumbnailAnimationDelay = $('select option[name=sequenceVisDelayOption]:selected').val();
};
Data.prototype.selectSwitchVisDuration = function(){
    this.switchVisDuration = $('select option[name=switchVisDurationOption]:selected').val();
};
Data.prototype.selectSwitchVisType = function(){
    this.switchVisType = $('select option[name=switchVisTypeOption]:selected').val();
};
Data.prototype.changeVisType = function(){
    if(this.selected_sequence != undefined){
        this.selected_sequence.switchSelectedVis(this.switchVisType,this.switchVisDuration);
    }
};
Data.prototype.selectSequenceVisCheckField = function(){
    this.sequenceVisCheckField = ($("#sequenceVisCheckField")).prop("checked");
    this.sequencesVis.setDrawField(this.sequenceVisCheckField);
};
Data.prototype.selectExportMode = function(){
    this.exportmode = $('select option[name=exportModeOption]:selected').val();
};
Data.prototype.exportImage = function(){
    if(this.exportmode != undefined){
        console.log("TODO - export image "+this.exportmode);


        var canvas = document.getElementById('export-canvas');
        var innerSVG = $("#svg1-container").html();
        innerSVG.replace("href","xlink:href");
        innerSVG.replace(/>\s+/g, ">").replace(/\s+</g, "<");
        console.log(innerSVG);


        function open(){
            open_in_new_tab(canvas.toDataURL("image/png"));
        }

        var options = {
            //ignoreDimensions: true,
            ignoreAnimation: true,
            ignoreMouse: true,
            renderCallback: open
        };
        canvg(canvas, innerSVG, options);

        canvas.width = canvas.height = 0;

        /*TO CROP THE SVG
         var original = getSVG();
         var cropped  = original .replace(/viewBox="[^"]+"/,'viewBox="150 80 400 420"');
         canvg( canvases[0], original );
         canvg( canvases[1], cropped  );
         */

    }
};


Data.prototype.init = function(){
    var $this = this;
    //select the default sequence, animateMode, and animateDuration
    $('input:radio[name="seq"]').filter('[id="seqRadio-'+DEFAULT_SEQUENCE+'"]').attr('checked', true);
    $(".clusteringModeSelect").prop('selectedIndex', DEFAULT_ANIMATE_CLUSTERING_MODE);
    $(".clusteringDurationSelect").prop('selectedIndex', DEFAULT_ANIMATE_CLUSTERING_DURATION);

    $(".sequenceDurationSelect").prop('selectedIndex', DEFAULT_ANIMATE_SEQUENCE_DURATION);
    $(".nodesStyleSelect").prop('selectedIndex', DEFAULT_NODE_STYLE);
    $(".passClusterStyleSelect").prop('selectedIndex', DEFAULT_PASS_CLUSTER_STYLE);
    $(".globalFlowInterpolateSelect").prop('selectedIndex', DEFAULT_GLOBAL_FLOW_INTERPOLATE);

    $(".sequenceLayoutSelect").prop('selectedIndex', DEFAULT_SEQUENCE_LAYOUT);
    $(".sequenceLayoutDurationSelect").prop('selectedIndex', DEFAULT_SEQUENCE_LAYOUT_DURATION);
    $(".sequenceLayoutDelaySelect").prop('selectedIndex', DEFAULT_SEQUENCE_LAYOUT_DELAY);

    $(".switchVisTypeSelect").prop('selectedIndex', DEFAULT_SWITCH_VIS_TYPE);
    $(".switchVisDurationSelect").prop('selectedIndex', DEFAULT_SWITCH_VIS_DURATION);

    $(".sequenceVisModeSelect").prop('selectedIndex', DEFAULT_SEQUENCE_VIS_MODE);
    $(".sequenceVisDurationSelect").prop('selectedIndex', DEFAULT_SEQUENCE_VIS_ANIMATION_DURATION);
    $(".sequenceVisDelaySelect").prop('selectedIndex', DEFAULT_SEQUENCE_VIS_ANIMATION_DELAY);
    $(".sequenceVisCheckField").prop('checked', true);

    $(".exportModeSelect").prop('selectedIndex', DEFAULT_EXPORT_MODE);

    //selectSequence();
    $this.selectAnimateClusteringDuration();
    $this.selectAnimateSequenceDuration();
    $this.selectNodeStyle();
    $this.selectPassClusterStyle();
    $this.selectGlobalFlowInterpolate();
    $this.selectSequenceLayout();
    $this.selectSequenceLayoutDuration();
    $this.selectSequenceLayoutDelay();

    $this.selectSwitchVisDuration();
    $this.selectSwitchVisType();

    $this.selectSequenceVisDuration();
    $this.selectSequenceVisDelay();
    $this.selectSequenceVisMode();
    $this.selectSequenceVisCheckField();

    $this.selectExportMode();
};





Data.prototype.getNodePath = function(w){
    switch(this.nodeStyle){
        case "circle":
            return getCirclePath(w);
            break;
        case "jersey":
            return getJerseyPath(w*2);
            break;
        default:
            throw "unknown node style "+this.nodeStyle;
    }
};

function getJerseyPath(w){
    var hw = w/2;
    return "m "+(-5/8*hw)+" "+hw+" "+//1
        "v "+(-5/8*w)+" "+//2
        "l "+(-1/8*hw)+" "+(1/4*hw)+" "+//3
        "l "+(-1/4*hw)+" "+(-1/4*hw)+" "+//4
        "l "+(2/4*hw)+" "+(-3/4*hw)+" "+//5
        "h "+hw+" "+//6
        "l "+(2/4*hw)+" "+(3/4*hw)+" "+//7
        "l "+(-1/4*hw)+" "+(1/4*hw)+" "+//8
        "l "+(-1/8*hw)+" "+(-1/4*hw)+" "+//9
        "v "+(5/8*w)+" "+//10
        "z";//11
}

function getCirclePath(r){
    return "m -"+r+", 0 "+
        "a "+r+","+r+" 0 1,0 "+(r*2)+",0 "+
        "a "+r+","+r+" 0 1,0 -"+(r*2)+",0 ";
}


Data.prototype.selectSequence = function(seq_index){
    //console.log("selectsequence");
    var $this = this;
    var new_sel_seq = this.sequences[seq_index];

    //if hide the sequence
    if(new_sel_seq == this.selected_sequence){
        $this.selected_sequence.hideSequence(function(){
            $this.selected_sequence.destroy();
            $this.timeline.sequenceAnimationDone(seq_index);
            $this.textAutoVis.unselectSequence(seq_index);
            $this.sequencesVis.unselectSequence(seq_index);
            $this.selected_sequence = undefined;
        });
    }

    //if show new sequence, first hide the previous one
    else{
        if(this.selected_sequence != undefined){
            var old_index = this.selected_sequence.sid;
            this.selected_sequence.hideSequence(function(){
                $this.timeline.sequenceAnimationDone(old_index);
                $this.sequencesVis.unselectSequence(old_index);
                $this.textAutoVis.unselectSequence(old_index);
                $this.selected_sequence.destroy();
                $this.selected_sequence = new_sel_seq;
                $this.selected_sequence.showSequence(function(){
                    $this.timeline.sequenceAnimationDone(seq_index);
                    $this.sequencesVis.selectSequence(seq_index);
                    $this.textAutoVis.selectSequence(seq_index);
                });
            });
        }
        else{
            $this.selected_sequence = new_sel_seq;
            $this.selected_sequence.showSequence(function(){
                $this.timeline.sequenceAnimationDone(seq_index);
                $this.sequencesVis.selectSequence(seq_index);
                $this.textAutoVis.selectSequence(seq_index);
            });
        }
    }

};




function timeToSec(time){
    return time.min*60+time.sec+(time.period==1 ? 0 : 60);
}


Data.prototype.getPlayerNodeTitle = function(player){
    if(player.pid == PID_SHOT_DEST) return "";
    var infos = this.formation.getPlayerInfos(player.pid);
    return infos.first_name+" "+infos.last_name+"\n"+infos.jersey+" - "+infos.position;
};





var PID_SHOT_DEST = -1;


/*
 Constants for shots
 */
var SHOT_DEST_TYPE_MOUTH = 0;
var SHOT_DEST_TYPE_BLOCKED = 1;



/*
 Constants for clustering
 */
var SUB_CHAIN_TYPE_SHOT = 1;
var SUB_CHAIN_TYPE_LONG_RUN = 2;
var SUB_CHAIN_TYPE_NON_PASS_EVENT = 3;
var SUB_CHAIN_TYPE_PERSONAL_ACTION_BEFORE_SHOT = 4;
var SUB_CHAIN_TYPE_SIMPLE_NODE = 50;

//group of passes
var SUB_CHAIN_TYPE_PASS_CLUSTER = 6;

//unique passes
var SUB_CHAIN_TYPE_PASS_STANDARD = 100;
var SUB_CHAIN_TYPE_PASS_LONG = 101;
var SUB_CHAIN_TYPE_PASS_FREEKICK = 102;
var SUB_CHAIN_TYPE_PASS_HEAD = 103;
var SUB_CHAIN_TYPE_PASS_CENTRE = 104;
var SUB_CHAIN_TYPE_PASS_CORNER = 105;


/*----------------------------------------------
 The getContext functions for each visualization
 -----------------------------------------------*/


/*
 Get the corners from right or left
 */
Data.prototype.getContextCorners = function(context, fromRight, pid){
    var corners = [];

    if(context == CONTEXT_INVOLVED_PLAYERS){
        if(pid == undefined) throw "can't retrieve context involved players without pid argument !";
        if(!(pid instanceof Array)) pid = [pid];
    }

    this.players.forEach(function(player){
        if(player.events == undefined) return;
        if(context == CONTEXT_INVOLVED_PLAYERS && pid.indexOf(player.pid) == -1) return;
        player.events.forEach(function(event){
            if(isCorner(event, fromRight)){
                corners.push(event);
            }
        });
    });
    return corners;
};


/*
 Get all the centres from right or left, which ARE NOT CORNERS.
 Done by all the players in the team if context = CONTEXT_ALL_PLAYERS
 Done by the player doing the centre (pid) if context = CONTEXT_CONTEXT_INVOLVED_PLAYERS
 pid is optional
 */
Data.prototype.getContextCentres = function(context, fromRight, pid){
    var centres = [];

    if(context == CONTEXT_INVOLVED_PLAYERS){
        if(pid == undefined) throw "can't retrieve context involved players without pid argument !";
        if(!(pid instanceof Array)) pid = [pid];
    }

    this.players.forEach(function(player){
        if(player.events == undefined) return;
        if(context == CONTEXT_INVOLVED_PLAYERS && pid.indexOf(player.pid) == -1) return;
        player.events.forEach(function(event){
            if(isCentreAndNotCorner(event, fromRight)){
                centres.push(event);
            }
        });
    });
    return centres;
};

Data.prototype.getContextShots = function(context, pid){
    var shots = [];
    if(context == CONTEXT_INVOLVED_PLAYERS){
        if(pid == undefined) throw "can't retrieve context involved players without pid argument !";
        if(!(pid instanceof Array)) pid = [pid];
    }

    this.players.forEach(function(player){
        if(player.events == undefined) return;
        if(context == CONTEXT_INVOLVED_PLAYERS && pid.indexOf(player.pid) == -1) return;
        player.events.forEach(function(event){
            if(isShot(event)){
                shots.push(event);
            }
        });
    });
    return shots;
};

/*
 Return an array of length 3: [0]:left, [1]: center, [2]: right
 */
Data.prototype.getContextLongRuns = function(context, pid){
    var long_runs = {
        left: 0,
        right: 0,
        center: 0
    };

    if(context == CONTEXT_INVOLVED_PLAYERS){
        if(pid == undefined) throw "can't retrieve context involved players without pid argument !";
        if(!(pid instanceof Array)) pid = [pid];
    }

    this.players.forEach(function(player){
        if(player.events == undefined) return;
        if(context == CONTEXT_INVOLVED_PLAYERS && pid.indexOf(player.pid) == -1) return;
        player.events.forEach(function(event,e){
            if(e==0) return;
            var previousEvent = player.events[e-1];
            if(previousEvent==undefined) return;
            var long_run = getLongRunSide(event, previousEvent);
            if(long_run != null && long_run!=false){
                long_runs[long_run]++;
            }
        });
    });
    return [{side: "left", value: long_runs.left},{side: "center", value: long_runs.center},{side: "right", value: long_runs.right}];
};

Data.prototype.getContextGraphPass = function(context,pid){
    //console.log("TODO - getContextGraphPass");
};

Data.prototype.getContextMatrixPass = function(context, pids){
    var links = [];
    if(context == CONTEXT_INVOLVED_PLAYERS){
        if(pids == undefined) throw "can't retrieve context involved players without pid argument !";
        if(!(pids instanceof Array)) pids = [pids];
    }

    return this.matrixPass.filter(function(link){
        return (pids.indexOf(link.source) != -1 && pids.indexOf(link.target) != -1);
    });
};


Data.prototype.getPlayer = function(pid){
    if(pid == PID_SHOT_DEST) return null;
    for(var p in this.players){
        if(this.players[p].pid == pid) return this.players[p];
    }
    throw "no player with pid "+pid;
};


function getEventColor(eid){
    switch(eid){
        case E_PASS:
        case E_RUN:
            return "black";
        case E_SHOT_MISS:
            return "red";
        case E_SHOT_POST:
            return "pink";
        case E_SHOT_SAVED:
            return "blue";
        case E_SHOT_GOAL:
            return "green";
        case E_SHOT_CHANCE_MISSED:
            return "orange";
        case E_CORNER:
            return "pink";
        case E_SPECIAL_TAKE_ON:
        case E_SPECIAL_GOOD_SKILL:
            return "orange";
        case E_DEF_TACKLE:
            return "purple";
        case E_DEF_INTERCEPTION:
            return "orange";
        case E_DUPLICATE:
            return "gray";
        case E_LONG_RUN:
            return "gray";
        case E_AERIAL_DUEL:
            return "steelblue";
        case E_FOUL:
            return "brown";
        default:
            throw "unknown eid "+eid;

    }
}


function getColorFromSubChainType(type){
    switch(type){
        case SUB_CHAIN_TYPE_SHOT:
            return "#FF0000";
            break;
        case SUB_CHAIN_TYPE_LONG_RUN:
            return "yellow";
            break;
        case SUB_CHAIN_TYPE_NON_PASS_EVENT:
            return "#FFFF00";
            break;
        case SUB_CHAIN_TYPE_PERSONAL_ACTION_BEFORE_SHOT:
            return "#991100";
            break;
        case SUB_CHAIN_TYPE_PASS_CLUSTER:
            return "black";
            break;
        case SUB_CHAIN_TYPE_PASS_STANDARD:
            return "#33FFCC";
            break;
        case SUB_CHAIN_TYPE_PASS_LONG:
            return "black";
            break;
        case SUB_CHAIN_TYPE_PASS_CENTRE:
            return "black";
            break;
        case SUB_CHAIN_TYPE_PASS_CORNER:
            return "black";
            break;
        case SUB_CHAIN_TYPE_PASS_FREEKICK:
            return "#3333CC";
            break;
        case SUB_CHAIN_TYPE_PASS_HEAD:
            return "#334400";
            break;
        case SUB_CHAIN_TYPE_SIMPLE_NODE:
            return "pink";
        default:
            throw "Unknown subChain type "+type;
    }
}

function isShot(action){
    return C_SHOT.indexOf(action.eid) != -1;
}

var MIN_DIST_LONG_PASS = 30;

function isLongPass(action,source){
    if(action.eid != E_PASS) return false;
    return distance(getPassDestPosition(action), {x:source.x, y:source.y}) > MIN_DIST_LONG_PASS;
}

function posInCentreOriginArea(x,y){
    return x >= 80 && (y <= 30 || y >= 70 );
}

function posInCentreDestinationArea(x,y){
    return x >= 70 && y >= 20 && y <= 80 ;
}

/*
 return true if the action is a centre from the right if fromRight=true, from the left else, or both if undefined
 action needs fields:
 - eid
 */
function isCentreAndNotCorner(action, fromRight){
    if(action.eid != E_PASS) return false;

    //if a corner, return false
    if(isCorner(action)) return false;

    if(!posInCentreOriginArea(action.x, action.y))return false;
    var dest = getPassDestPosition(action);
    //console.log("dest",dest);
    if(!posInCentreDestinationArea(dest.x, dest.y))return false;

    if(fromRight != undefined) {
        if (fromRight) {
            return (action.y <= 50);
        }
        return (action.y > 50);
    }
    return true;

}

function isCorner(action, fromRight){
    if(action.eid != E_PASS) return false;
    var is_corner = false;
    for(var q in action.qualifiers){
        var qual = action.qualifiers[q];
        if(qual.qid == Q_PASS_CORNER){
            is_corner = true;
            break;
        }
    }
    if(is_corner){
        if(fromRight != undefined) {
            if (fromRight) {
                return (action.y <= 50);
            }
            return (action.y > 50);
        }
        return true;
    }
    return false;
}

var MIN_DIST_LONG_RUN = 20;


function isLongRunAndPass(action, previous_action){
    if(previous_action==undefined || previous_action.eid != E_PASS) return false;

    var run_orig = getPassDestPosition(previous_action),
        run_dest = {x: action.x, y:action.y};

    return run_dest.x > 50 && Math.abs(run_orig.x - run_dest.x) > MIN_DIST_LONG_RUN;
}

function getLongRunSide(action, previous_action){
    if(previous_action==undefined || previous_action.eid != E_PASS) return false;

    var run_orig = getPassDestPosition(previous_action),
        run_dest = {x: action.x, y:action.y};

    //if a long run
    if(run_dest.x>50 && Math.abs(run_orig.x-run_dest.x) > MIN_DIST_LONG_RUN){
        return getLongRunSideFromYCoords(run_orig.y,run_dest.y);
    }
    return null;
}

/*
 return "left","right" or "center" according to the y starting the run and the y ending the run
 */
function getLongRunSideFromYCoords(y0,y1){
    var y = d3.mean([y0,y1]);
    return (y > 70) ? "left" : (y < 30) ? "right" : "center";
}

function getPassCategory(pass, source){
    if(pass.eid != E_PASS) throw "Must be a pass: "+JSON.stringify(pass);

    //rebuild the event to check if a centre
    var rebuiltAction = {
        eid: pass.eid,
        qualifiers: pass.qualifiers,
        x: source.x,
        y: source.y
    };

    if(isCorner(rebuiltAction)){
        return SUB_CHAIN_TYPE_PASS_CORNER;
    }
    if(isCentreAndNotCorner(rebuiltAction)) {
        return SUB_CHAIN_TYPE_PASS_CENTRE;
    }


    //else
    for(var q in pass.qualifiers){
        var qual = pass.qualifiers[q];
        switch(qual.qid){
            //long passes
            case Q_PASS_LONG:
            case Q_PASS_CROSS:
            case Q_PASS_SWITCH_OF_PLAY:
            case Q_PASS_CHIPPED:
            case Q_PASS_THROUGH:
            case Q_PASS_LAY_OFF:
            case Q_PASS_LAUNCH:
                return SUB_CHAIN_TYPE_PASS_LONG;

            //freekicks/throw ins
            case Q_PASS_THROW_IN:
            case Q_PASS_FREE_KICK:
            case Q_PASS_CORNER:
                return SUB_CHAIN_TYPE_PASS_FREEKICK;

            /*
             //assist
             case Q_PASS_ASSIST:
             throw "can't be a pass assist ! "+JSON.stringify(pass);
             */
            //nothing to do
            case Q_PASS_ATTACKING:
            case Q_PASS_PULL_BACK:
                break;

            //head passes
            case Q_PASS_HEAD:
            case Q_PASS_FLICK_ON:
                return SUB_CHAIN_TYPE_PASS_HEAD;
        }
    }
    return SUB_CHAIN_TYPE_PASS_STANDARD;
}





function getPassDestPosition(action){
    if(action.eid != E_PASS) throw "action must be a pass !" +JSON.stringify(action);
    var endX, endY;
    for(var q in action.qualifiers){
        switch(action.qualifiers[q].qid){
            case Q_PASS_END_X:
                endX = action.qualifiers[q].value;
                break;
            case Q_PASS_END_Y:
                endY = action.qualifiers[q].value;
                break;
            default:
            //do nothing
        }
    }
    if(endX != undefined && endY != undefined) return {x: parseFloat(endX), y: parseFloat(endY)};
    else throw "Unknown pass destination in "+JSON.stringify(action);
}

function getShotDestination(action){
    if(C_SHOT.indexOf(action.eid)==-1) throw "action must be a shot ! "+JSON.stringify(action);
    var mouthY, mouthZ, blockedX, blockedY;
    for(var q in action.qualifiers){
        switch(action.qualifiers[q].qid){
            case Q_SHOT_GOAL_MOUTH_Y:
                mouthY = action.qualifiers[q].value;
                break;
            case Q_SHOT_GOAL_MOUTH_Z:
                mouthZ = action.qualifiers[q].value;
                break;
            case Q_SHOT_BLOCKED_X:
                blockedX = action.qualifiers[q].value;
                break;
            case Q_SHOT_BLOCKED_Y:
                blockedY = action.qualifiers[q].value;
                break;
            default:
            //do nothing
        }
    }
    if(mouthY != undefined && mouthZ != undefined) return {type: SHOT_DEST_TYPE_MOUTH, y: parseFloat(mouthY), z: parseFloat(mouthZ)};
    else if(blockedX != undefined && blockedY != undefined) return {type: SHOT_DEST_TYPE_BLOCKED, x: parseFloat(blockedX), y: parseFloat(blockedY)};
    else{
        console.log("Unknown shot mouth position in "+JSON.stringify(action));
        return {type: SHOT_DEST_TYPE_BLOCKED, x: parseFloat(action.x), y: parseFloat(action.y)};
    }
}


function getColorFromShotEvent(eid){
    switch(eid){
        case E_SHOT_GOAL:
            return "green";
            break;
        case E_SHOT_SAVED:
            return "blue";
            break;
        case E_SHOT_POST:
            return "orange";
            break;
        case E_SHOT_CHANCE_MISSED:
        case E_SHOT_MISS:
            return "red";
            break;
        default: throw eid+" is not a shot event";
    }
}

var POSITION_COLORS = {
    Goalkeeper: "#CC22EE",
    Defender: "#996633",
    Midfielder: "#00FFCC",
    Striker: "#CC0000",
    Substitute: "#CCFF00"
};

function getPlayerColorFromPosition(d){
    return POSITION_COLORS[d.position];
}

function getPositionGroupFromPosition(position){
    var index=0;
    for(var p in POSITION_COLORS){
        if(p == position) return index;
        index++;
    }
    return -1;
}


function getArc(sx,sy,tx,ty,r){

    var pivot1 = {
        x: sx + (tx - sx) / 4 + (ty - sy) / r,
        y: sy + (ty - sy) / 4 + (sx - tx) / r
    };
    var pivot2 = {
        x: sx + 3*(tx - sx) / 4 + (ty - sy) / r,
        y: sy + 3*(ty - sy) / 4 + (sx - tx) / r
    };

    return [
        {x:sx, y:sy}, {x:pivot1.x, y:pivot1.y},
        {x:pivot2.x, y:pivot2.y}, {x:tx, y:ty}];
}




function getEventName(eid){
    switch(eid){
        case -1: return "E_DUPLICATE";
        case 1000: return "E_LONG_RUN";
        case 1001: return "E_RUN";

        case 34: return "E_FORMATION";

        case 1: return "E_PASS";
        case 2: return "E_PASS_OFFSIDE";

        case 13: return "E_SHOT_MISS";
        case 14: return "E_SHOT_POST";
        case 15: return "E_SHOT_SAVED";
        case 16: return "E_SHOT_GOAL";
        case 60: return "E_SHOT_CHANCE_MISSED";

        case 4: return "E_FOUL";
        case 57: return "E_FOUL_THROW_IN";
        case 17: return "E_FOUL_CARD";

        case 7: return "E_DEF_TACKLE";
        case 8: return "E_DEF_INTERCEPTION";
        case 12: return "E_DEF_CLEARANCE";
        case 55: return "E_DEF_OFFSIDE_PROVOKED";
        case 56: return "E_DEF_SHIELD_BALL";

        case 9: return "E_ERROR_TURNOVER";
        case 45: return "E_ERROR_CHALLENGE";
        case 50: return "E_ERROR_DISPOSSESSED";
        case 51: return "E_ERROR_ERROR";

        case 3: return "E_SPECIAL_TAKE_ON";
        case 42: return "E_SPECIAL_GOOD_SKILL";

        case 44: return "E_AERIAL_DUEL";

        case 11: return "E_GK_CLAIM";
        case 52: return "E_GK_PICK_UP";
        case 10: return "E_GK_SAVE";
        case 41: return "E_GK_PUNCH";
        case 59: return "E_GK_SWEEPER";
        case 54: return "E_GK_SMOTHER";

        case 18: return "E_FORMATION_PLAYER_OFF";
        case 19: return "E_FORMATION_PLAYER_ON";

        case 30: return "E_PERIOD_START";
        case 32: return "E_PERIOD_END";

        case 5: return "E_BALL_OUT";
        case 6: return "E_CORNER";

        default: throw "Unknown eid: "+eid;
    }
}

function getQualifierName(qid){
    switch(qid){
//------Pass Qualifiers-------------//
        case 1: return "Q_PASS_LONG";
        case 2: return "Q_PASS_CROSS";
        case 3: return "Q_PASS_HEAD";
        case 4: return "Q_PASS_THROUGH";
        case 5: return "Q_PASS_FREE_KICK";
        case 6: return "Q_PASS_CORNER";
        case 7: return "Q_PASS_ID_OFFSIDE_PLAYER";
        case 8: return "Q_PASS_GOAL_DISALLOWED";
        case 106: return "Q_PASS_ATTACKING";
        case 107: return "Q_PASS_THROW_IN";
        case 140: return "Q_PASS_END_X";
        case 141: return "Q_PASS_END_Y";
        case 155: return "Q_PASS_CHIPPED";
        case 156: return "Q_PASS_LAY_OFF";
        case 157: return "Q_PASS_LAUNCH";
        case 168: return "Q_PASS_FLICK_ON";
        case 195: return "Q_PASS_PULL_BACK";
        case 196: return "Q_PASS_SWITCH_OF_PLAY";
        case 210: return "Q_PASS_ASSIST";


//------Shot Qualifiers---------------//
        case 9: return "Q_SHOT_PENALTY";
        case 15: return "Q_SHOT_HEAD";
        case 16: return "Q_SHOT_SMALL_BOX_CENTRE";
        case 17: return "Q_SHOT_BOX_CENTRE";
        case 18: return "Q_SHOT_OUT_OF_BOX_CENTRE";
        case 19: return "Q_SHOT_35_MORE_CENTRE";
        case 20: return "Q_SHOT_RIGHT_FOOTED";
        case 21: return "Q_SHOT_OTHER_BODY_PART";
        case 22: return "Q_SHOT_REGULAR_PLAY";
        case 23: return "Q_SHOT_FAST_BREAK";
        case 24: return "Q_SHOT_SET_PIECE";
        case 25: return "Q_SHOT_FROM_CORNER";
        case 26: return "Q_SHOT_FREE_KICK";
        case 28: return "Q_SHOT_OWN_GOAL";
        case 29: return "Q_SHOT_ASSISTED";
        case 55: return "Q_SHOT_RELATED_EVENT_ID";
        case 60: return "Q_SHOT_SMALL_BOX_RIGHT";
        case 61: return "Q_SHOT_SMALL_BOX_LEFT";
        case 62: return "Q_SHOT_BOX_DEEP_RIGHT";
        case 63: return "Q_SHOT_BOX_RIGHT";
        case 64: return "Q_SHOT_BOX_LEFT";
        case 65: return "Q_SHOT_BOX_DEEP_LEFT";
        case 66: return "Q_SHOT_OUT_OF_BOX_DEEP_RIGHT";
        case 67: return "Q_SHOT_OUT_OF_BOX_RIGHT";
        case 68: return "Q_SHOT_OUT_OF_BOX_LEFT";
        case 69: return "Q_SHOT_OUT_OF_BOX_DEEP_LEFT";
        case 70: return "Q_SHOT_35_MORE_RIGHT";
        case 71: return "Q_SHOT_35_MORE_LEFT";
        case 72: return "Q_SHOT_LEFT_FOOTED";
        case 73: return "Q_SHOT_LEFT";
        case 74: return "Q_SHOT_HIGH";
        case 75: return "Q_SHOT_RIGHT";
        case 76: return "Q_SHOT_LOW_LEFT";
        case 77: return "Q_SHOT_HIGH_LEFT";
        case 78: return "Q_SHOT_LOW_CENTRE";
        case 79: return "Q_SHOT_HIGH_CENTRE";
        case 80: return "Q_SHOT_LOW_RIGHT";
        case 81: return "Q_SHOT_HIGH_RIGHT";
        case 82: return "Q_SHOT_BLOCKED";
        case 83: return "Q_SHOT_CLOSE_LEFT";
        case 84: return "Q_SHOT_CLOSE_RIGHT";
        case 85: return "Q_SHOT_CLOSE_HIGH";
        case 86: return "Q_SHOT_CLOSE_LEFT_AND_HIGH";
        case 87: return "Q_SHOT_CLOSE_RIGHT_AND_HIGH";
        case 96: return "Q_SHOT_CORNER_SITUATION";
        case 97: return "Q_SHOT_DIRECT_FREE";
        case 100: return "Q_SHOT_SIX_YARD_BLOCKED";
        case 101: return "Q_SHOT_SAVED_OFF_LINE";
        case 102: return "Q_SHOT_GOAL_MOUTH_Y";
        case 103: return "Q_SHOT_GOAL_MOUTH_Z";
        case 108: return "Q_SHOT_VOLLEY";
        case 109: return "Q_SHOT_OVERHEAD";
        case 110: return "Q_SHOT_HALF_VOLLEY";
        case 111: return "Q_SHOT_DIVING_HEADER";
        case 112: return "Q_SHOT_SCRAMBLE";
        case 113: return "Q_SHOT_STRONG";
        case 114: return "Q_SHOT_WEAK";
        case 115: return "Q_SHOT_RISING";
        case 116: return "Q_SHOT_DIPPING";
        case 117: return "Q_SHOT_LOB";
        case 118: return "Q_SHOT_ONE_BOUNCE";
        case 119: return "Q_SHOT_FEW_BOUNCES";
        case 120: return "Q_SHOT_SWERVE_LEFT";
        case 121: return "Q_SHOT_SWERVE_RIGHT";
        case 122: return "Q_SHOT_SWERVE_MOVING";
        case 133: return "Q_SHOT_DEFLECTION";
        case 134: return "Q_SHOT_FAR_WIDE_LEFT";
        case 135: return "Q_SHOT_FAR_WIDE_RIGHT";
        case 136: return "Q_SHOT_KEEPER_TOUCHED";
        case 137: return "Q_SHOT_KEEPER_SAVED";
        case 138: return "Q_SHOT_HIT_WOODWORK";
        case 146: return "Q_SHOT_BLOCKED_X";
        case 147: return "Q_SHOT_BLOCKED_Y";
        case 153: return "Q_SHOT_NOT_PAST_GOAL_LINE";
        case 154: return "Q_SHOT_INTENTIONAL_ASSIST";
        case 160: return "Q_SHOT_THROW_IN_SET_PIECE";
        case 214: return "Q_SHOT_BIG_CHANCE";
        case 215: return "Q_SHOT_INDIVIDUAL_PLAY";


//------Defence Qualifiers---------------//
        case 14: return "Q_DEF_LAST_LINE";
        case 94: return "Q_DEF_BLOCK";
        case 167: return "Q_DEF_OUT_OF_PLAY";
        case 169: return "Q_DEF_LEADING_TO_ATTEMPT";
        case 170: return "Q_DEF_LEADING_TO_GOAL";
        case 185: return "Q_DEF_BLOCKED_CROSS";


//------General Qualifiers---------------//
        case 54: return "Q_GENERAL_END_CAUSE";
        case 56: return "Q_GENERAL_ZONE";
        case 57: return "Q_GENERAL_END_TYPE";
        case 127: return "Q_GENERAL_DIRECTION_OF_PLAY";
        case 144: return "Q_GENERAL_DELETED_EVENT_TYPE";
        case 189: return "Q_GENERAL_PLAYER_NOT_VISIBLE";
        case 190: return "Q_GENERAL_FROM_SHOT_OFF_TARGET";
        case 209: return "Q_GENERAL_GAME_END";
        case 211: return "Q_GENERAL_OVERRUN";
        case 212: return "Q_GENERAL_LENGTH";
        case 213: return "Q_GENERAL_ANGLE";


//------Goalkeeper Qualifiers---------------//
        case 88: return "Q_GK_HIGH_CLAIM";
        case 89: return "Q_GK_1_1";
        case 90: return "Q_GK_DEFLECTED_SAVE";
        case 91: return "Q_GK_DIVE_AND_DEFLECT";
        case 92: return "Q_GK_CATCH";
        case 93: return "Q_GK_DIVE_AND_CATCH";
        case 123: return "Q_GK_KEEPER_THROW";
        case 124: return "Q_GK_GOAL_KICK";
        case 128: return "Q_GK_PUNCH";
        case 139: return "Q_GK_OWN_PLAYER";
        case 173: return "Q_GK_PARRIED_SAFE";
        case 174: return "Q_GK_PARRIED_DANGER";
        case 175: return "Q_GK_FINGERTIP";
        case 176: return "Q_GK_CAUGHT";
        case 177: return "Q_GK_COLLECTED";
        case 178: return "Q_GK_STANDING";
        case 179: return "Q_GK_DIVING";
        case 180: return "Q_GK_STOOPING";
        case 181: return "Q_GK_REACHING";
        case 182: return "Q_GK_HANDS";
        case 183: return "Q_GK_FEET";
        case 186: return "Q_GK_SCORED";
        case 187: return "Q_GK_SAVED";
        case 188: return "Q_GK_MISSED";
        case 198: return "Q_GK_HOOF";
        case 199: return "Q_GK_KICK_FROM_HANDS";


//------Foul Qualifiers---------------//
        case 10: return "Q_FOUL_HAND";
        case 12: return "Q_FOUL_DANGEROUS";
        case 13: return "Q_FOUL_ALL";
        case 11: return "Q_FOUL_6_SEC";
        case 31: return "Q_FOUL_YELLOW_CARD";
        case 32: return "Q_FOUL_YELLOW_CARD_SECOND";
        case 33: return "Q_FOUL_RED_CARD";
        case 34: return "Q_FOUL_REFEREE_ABUSE";
        case 35: return "Q_FOUL_ARGUMENT";
        case 36: return "Q_FOUL_FIGHT";
        case 37: return "Q_FOUL_TIME_WASTING";
        case 38: return "Q_FOUL_EXCESSIVE_CELEBRATION";
        case 39: return "Q_FOUL_CROWD_INTERACTION";
        case 40: return "Q_FOUL_OTHER_REASON";
        case 95: return "Q_FOUL_BACK_PASS";
        case 132: return "Q_FOUL_DIVE";
        case 158: return "Q_FOUL_PERSISTENT_INFRINGEMENT";
        case 159: return "Q_FOUL_ABUSIVE_LANGUAGE";
        case 161: return "Q_FOUL_ENCROACHMENT";
        case 162: return "Q_FOUL_LEAVING_FIELD";
        case 163: return "Q_FOUL_ENTERING_FIELD";
        case 164: return "Q_FOUL_SPITTING";
        case 165: return "Q_FOUL_PROFESSIONAL_FOUL";
        case 166: return "Q_FOUL_HANDLING_ON_THE_LINE";
        case 171: return "Q_FOUL_RESCINDED_CARD";
        case 172: return "Q_FOUL_NO_IMPACT_ON_TIMING";
        case 184: return "Q_FOUL_DISSENT";
        case 191: return "Q_FOUL_OFF_THE_BALL";
        case 192: return "Q_FOUL_BLOCK_BY_HAND";


//------Line up / subs / formation qualifiers-----------//
        case 30: return "Q_FORMATION_INVOLVED";
        case 41: return "Q_FORMATION_INJURY";
        case 42: return "Q_FORMATION_TACTICAL";
        case 44: return "Q_FORMATION_PLAYER_POSITION";
        case 59: return "Q_FORMATION_JERSEY_NUMBER";
        case 130: return "Q_FORMATION_TEAM_FORMATION";
        case 131: return "Q_FORMATION_TEAM_PLAYER_FORMATION";
        case 145: return "Q_FORMATION_FORMATION_SLOT";
        case 194: return "Q_FORMATION_CAPTAIN";
        case 197: return "Q_FORMATION_TEAM_KIT";


//------Referee qualifiers-----------//
        case 50: return "Q_REFEREE_POSITION";
        case 51: return "Q_REFEREE_ID";
        case 200: return "Q_REFEREE_STOP";
        case 201: return "Q_REFEREE_DELAY";
        case 208: return "Q_REFEREE_INJURY";


//------Attendance qualifiers-----------//
        case 49: return "Q_ATTENDANCE_FIGURE";


//------Stoppages qualifiers-----------//
        case 53: return "Q_STOPPAGE_INJURED_PLAYER_ID";
        case 202: return "Q_STOPPAGE_WEATHER_PROBLEM";
        case 203: return "Q_STOPPAGE_CROWD_TROUBLE";
        case 204: return "Q_STOPPAGE_FIRE";
        case 205: return "Q_STOPPAGE_OBJECT_THROWN_ON_PITCH";
        case 206: return "Q_STOPPAGE_SPECTATOR_ON_PITCH";
        case 207: return "Q_STOPPAGE_AWAITHIN_OFFICIAL_DECISION";


//------Conditions qualifiers-----------//
        case 45: return "Q_CONDITIONS_TEMPERATURE";
        case 46: return "Q_CONDITIONS_CONDITIONS";
        case 47: return "Q_CONDITIONS_FIELD_PITCH";
        case 48: return "Q_CONDITIONS_LIGHTINGS";


        default: throw "Unknown qid: "+qid;
    }
}


var E_DUPLICATE = -1;

//----------------------------------Events Constants---------------------------------//
var E_FORMATION = 34;
var E_LONG_RUN = 1000;
var E_RUN = 1001;

var E_PASS = 1;
var E_PASS_OFFSIDE = 2;

var E_SHOT_MISS = 13;
var E_SHOT_POST = 14;
var E_SHOT_SAVED = 15;
var E_SHOT_GOAL = 16;
var E_SHOT_CHANCE_MISSED = 60;

var E_FOUL = 4;
var E_FOUL_THROW_IN = 57;
var E_FOUL_CARD = 17;

var E_DEF_TACKLE = 7;
var E_DEF_INTERCEPTION = 8;
var E_DEF_CLEARANCE = 12;
var E_DEF_OFFSIDE_PROVOKED = 55;
var E_DEF_SHIELD_BALL = 56;

var E_ERROR_TURNOVER = 9;
var E_ERROR_CHALLENGE = 45;
var E_ERROR_DISPOSSESSED = 50;
var E_ERROR_ERROR = 51;

var E_SPECIAL_TAKE_ON = 3;
var E_SPECIAL_GOOD_SKILL = 42;

var E_AERIAL_DUEL = 44;




var E_GK_CLAIM = 11;
var E_GK_PICK_UP = 52;
var E_GK_SAVE = 10;
var E_GK_PUNCH = 41;
var E_GK_SWEEPER = 59;
var E_GK_SMOTHER = 54;

var E_FORMATION_PLAYER_OFF = 18;
var E_FORMATION_PLAYER_ON = 19;

var E_PERIOD_START = 30;
var E_PERIOD_END = 32;

var E_BALL_OUT = 5;
var E_CORNER = 6;


//--------------------------------------Qualifiers Constants----------------------------//

//------Pass Qualifiers-------------//
var Q_PASS_LONG = 1;
var Q_PASS_CROSS = 2;
var Q_PASS_HEAD = 3;
var Q_PASS_THROUGH = 4;
var Q_PASS_FREE_KICK = 5;
var Q_PASS_CORNER = 6;
var Q_PASS_ID_OFFSIDE_PLAYER = 7;
var Q_PASS_GOAL_DISALLOWED = 8;
var Q_PASS_ATTACKING = 106;
var Q_PASS_THROW_IN = 107;
var Q_PASS_END_X = 140;
var Q_PASS_END_Y = 141;
var Q_PASS_CHIPPED = 155;
var Q_PASS_LAY_OFF = 156;
var Q_PASS_LAUNCH = 157;
var Q_PASS_FLICK_ON = 168;
var Q_PASS_PULL_BACK= 195;
var Q_PASS_SWITCH_OF_PLAY = 196;
var Q_PASS_ASSIST = 210;


//------Shot Qualifiers---------------//
var Q_SHOT_PENALTY = 9;
var Q_SHOT_HEAD = 15;
var Q_SHOT_SMALL_BOX_CENTRE = 16;
var Q_SHOT_BOX_CENTRE = 17;
var Q_SHOT_OUT_OF_BOX_CENTRE = 18;
var Q_SHOT_35_MORE_CENTRE = 19;
var Q_SHOT_RIGHT_FOOTED = 20;
var Q_SHOT_OTHER_BODY_PART = 21;
var Q_SHOT_REGULAR_PLAY = 22;
var Q_SHOT_FAST_BREAK = 23;
var Q_SHOT_SET_PIECE = 24;
var Q_SHOT_FROM_CORNER = 25;
var Q_SHOT_FREE_KICK = 26;
var Q_SHOT_OWN_GOAL = 28;
var Q_SHOT_ASSISTED = 29;
var Q_SHOT_RELATED_EVENT_ID = 55;
var Q_SHOT_SMALL_BOX_RIGHT = 60;
var Q_SHOT_SMALL_BOX_LEFT = 61;
var Q_SHOT_BOX_DEEP_RIGHT = 62;
var Q_SHOT_BOX_RIGHT = 63;
var Q_SHOT_BOX_LEFT = 64;
var Q_SHOT_BOX_DEEP_LEFT = 65;
var Q_SHOT_OUT_OF_BOX_DEEP_RIGHT = 66;
var Q_SHOT_OUT_OF_BOX_RIGHT = 67;
var Q_SHOT_OUT_OF_BOX_LEFT = 68;
var Q_SHOT_OUT_OF_BOX_DEEP_LEFT = 69;
var Q_SHOT_35_MORE_RIGHT = 70;
var Q_SHOT_35_MORE_LEFT = 71;
var Q_SHOT_LEFT_FOOTED = 72;
var Q_SHOT_LEFT = 73;
var Q_SHOT_HIGH = 74;
var Q_SHOT_RIGHT = 75;
var Q_SHOT_LOW_LEFT = 76;
var Q_SHOT_HIGH_LEFT = 77;
var Q_SHOT_LOW_CENTRE = 78;
var Q_SHOT_HIGH_CENTRE = 79;
var Q_SHOT_LOW_RIGHT = 80;
var Q_SHOT_HIGH_RIGHT = 81;
var Q_SHOT_BLOCKED = 82;
var Q_SHOT_CLOSE_LEFT = 83;
var Q_SHOT_CLOSE_RIGHT = 84;
var Q_SHOT_CLOSE_HIGH = 85;
var Q_SHOT_CLOSE_LEFT_AND_HIGH = 86;
var Q_SHOT_CLOSE_RIGHT_AND_HIGH = 87;
var Q_SHOT_CORNER_SITUATION = 96;
var Q_SHOT_DIRECT_FREE = 97;
var Q_SHOT_SIX_YARD_BLOCKED = 100;
var Q_SHOT_SAVED_OFF_LINE = 101;
var Q_SHOT_GOAL_MOUTH_Y = 102;
var Q_SHOT_GOAL_MOUTH_Z = 103;
var Q_SHOT_VOLLEY = 108;
var Q_SHOT_OVERHEAD = 109;
var Q_SHOT_HALF_VOLLEY = 110;
var Q_SHOT_DIVING_HEADER = 111;
var Q_SHOT_SCRAMBLE = 112;
var Q_SHOT_STRONG = 113;
var Q_SHOT_WEAK = 114;
var Q_SHOT_RISING = 115;
var Q_SHOT_DIPPING = 116;
var Q_SHOT_LOB = 117;
var Q_SHOT_ONE_BOUNCE = 118;
var Q_SHOT_FEW_BOUNCES = 119;
var Q_SHOT_SWERVE_LEFT = 120;
var Q_SHOT_SWERVE_RIGHT = 121;
var Q_SHOT_SWERVE_MOVING = 122;
var Q_SHOT_DEFLECTION = 133;
var Q_SHOT_FAR_WIDE_LEFT = 134;
var Q_SHOT_FAR_WIDE_RIGHT = 135;
var Q_SHOT_KEEPER_TOUCHED = 136;
var Q_SHOT_KEEPER_SAVED = 137;
var Q_SHOT_HIT_WOODWORK = 138;
var Q_SHOT_BLOCKED_X = 146;
var Q_SHOT_BLOCKED_Y = 147;
var Q_SHOT_NOT_PAST_GOAL_LINE = 153;
var Q_SHOT_INTENTIONAL_ASSIST = 154;
var Q_SHOT_THROW_IN_SET_PIECE = 160;
var Q_SHOT_BIG_CHANCE = 214;
var Q_SHOT_INDIVIDUAL_PLAY = 215;


//------Defence Qualifiers---------------//
var Q_DEF_LAST_LINE = 14;
var Q_DEF_BLOCK = 94;
var Q_DEF_OUT_OF_PLAY = 167;
var Q_DEF_LEADING_TO_ATTEMPT = 169;
var Q_DEF_LEADING_TO_GOAL = 170;
var Q_DEF_BLOCKED_CROSS = 185;


//------General Qualifiers---------------//
var Q_GENERAL_END_CAUSE = 54;
var Q_GENERAL_ZONE = 56;
var Q_GENERAL_END_TYPE = 57;
var Q_GENERAL_DIRECTION_OF_PLAY = 127;
var Q_GENERAL_DELETED_EVENT_TYPE = 144;
var Q_GENERAL_PLAYER_NOT_VISIBLE = 189;
var Q_GENERAL_FROM_SHOT_OFF_TARGET = 190;
var Q_GENERAL_GAME_END = 209;
var Q_GENERAL_OVERRUN = 211;
var Q_GENERAL_LENGTH = 212;
var Q_GENERAL_ANGLE = 213;


//------Goalkeeper Qualifiers---------------//
var Q_GK_HIGH_CLAIM = 88;
var Q_GK_1_1 = 89;
var Q_GK_DEFLECTED_SAVE = 90;
var Q_GK_DIVE_AND_DEFLECT = 91;
var Q_GK_CATCH = 92;
var Q_GK_DIVE_AND_CATCH = 93;
var Q_GK_KEEPER_THROW = 123;
var Q_GK_GOAL_KICK = 124;
var Q_GK_PUNCH = 128;
var Q_GK_OWN_PLAYER = 139;
var Q_GK_PARRIED_SAFE = 173;
var Q_GK_PARRIED_DANGER = 174;
var Q_GK_FINGERTIP = 175;
var Q_GK_CAUGHT = 176;
var Q_GK_COLLECTED = 177;
var Q_GK_STANDING = 178;
var Q_GK_DIVING = 179;
var Q_GK_STOOPING = 180;
var Q_GK_REACHING = 181;
var Q_GK_HANDS = 182;
var Q_GK_FEET = 183;
var Q_GK_SCORED = 186;
var Q_GK_SAVED = 187;
var Q_GK_MISSED = 188;
var Q_GK_HOOF = 198;
var Q_GK_KICK_FROM_HANDS = 199;


//------Foul Qualifiers---------------//
var Q_FOUL_HAND = 10;
var Q_FOUL_DANGEROUS = 12;
var Q_FOUL_ALL = 13;
var Q_FOUL_6_SEC = 11;
var Q_FOUL_YELLOW_CARD = 31;
var Q_FOUL_YELLOW_CARD_SECOND = 32;
var Q_FOUL_RED_CARD = 33;
var Q_FOUL_REFEREE_ABUSE = 34;
var Q_FOUL_ARGUMENT = 35;
var Q_FOUL_FIGHT = 36;
var Q_FOUL_TIME_WASTING = 37;
var Q_FOUL_EXCESSIVE_CELEBRATION = 38;
var Q_FOUL_CROWD_INTERACTION = 39;
var Q_FOUL_OTHER_REASON = 40;
var Q_FOUL_BACK_PASS = 95;
var Q_FOUL_DIVE = 132;
var Q_FOUL_PERSISTENT_INFRINGEMENT = 158;
var Q_FOUL_ABUSIVE_LANGUAGE = 159;
var Q_FOUL_ENCROACHMENT = 161;
var Q_FOUL_LEAVING_FIELD = 162;
var Q_FOUL_ENTERING_FIELD = 163;
var Q_FOUL_SPITTING = 164;
var Q_FOUL_PROFESSIONAL_FOUL = 165;
var Q_FOUL_HANDLING_ON_THE_LINE = 166;
var Q_FOUL_RESCINDED_CARD = 171;
var Q_FOUL_NO_IMPACT_ON_TIMING = 172;
var Q_FOUL_DISSENT = 184;
var Q_FOUL_OFF_THE_BALL = 191;
var Q_FOUL_BLOCK_BY_HAND = 192;


//------Line up / subs / formation qualifiers-----------//
var Q_FORMATION_INVOLVED = 30;
var Q_FORMATION_INJURY = 41;
var Q_FORMATION_TACTICAL = 42;
var Q_FORMATION_PLAYER_POSITION = 44;
var Q_FORMATION_JERSEY_NUMBER = 59;
var Q_FORMATION_TEAM_FORMATION = 130;
var Q_FORMATION_TEAM_PLAYER_FORMATION = 131;
var Q_FORMATION_FORMATION_SLOT = 145;
var Q_FORMATION_CAPTAIN = 194;
var Q_FORMATION_TEAM_KIT = 197;


//------Referee qualifiers-----------//
var Q_REFEREE_POSITION = 50;
var Q_REFEREE_ID = 51;
var Q_REFEREE_STOP = 200;
var Q_REFEREE_DELAY = 201;
var Q_REFEREE_INJURY = 208;


//------Attendance qualifiers-----------//
var Q_ATTENDANCE_FIGURE = 49;


//------Stoppages qualifiers-----------//
var Q_STOPPAGE_INJURED_PLAYER_ID = 53;
var Q_STOPPAGE_WEATHER_PROBLEM = 202;
var Q_STOPPAGE_CROWD_TROUBLE = 203;
var Q_STOPPAGE_FIRE = 204;
var Q_STOPPAGE_OBJECT_THROWN_ON_PITCH = 205;
var Q_STOPPAGE_SPECTATOR_ON_PITCH = 206;
var Q_STOPPAGE_AWAITHIN_OFFICIAL_DECISION = 207;
var Q_STOPPAGE_REFEREE_INJURY = 208;


//------Conditions qualifiers-----------//
var Q_CONDITIONS_TEMPERATURE = 45;
var Q_CONDITIONS_CONDITIONS = 46;
var Q_CONDITIONS_FIELD_PITCH = 47;
var Q_CONDITIONS_LIGHTINGS = 48;




var C_PASS = [E_PASS, E_PASS_OFFSIDE];
var C_SHOT = [E_SHOT_MISS, E_SHOT_POST, E_SHOT_SAVED, E_SHOT_GOAL, E_SHOT_CHANCE_MISSED];
var C_FOUL = [E_FOUL, E_FOUL_THROW_IN,E_FOUL_CARD];
var C_DEF = [E_DEF_TACKLE, E_DEF_INTERCEPTION, E_DEF_CLEARANCE];
var C_ERROR = [E_ERROR_TURNOVER, E_ERROR_CHALLENGE, E_ERROR_DISPOSSESSED, E_ERROR_ERROR];
var C_SPECIAL = [E_SPECIAL_TAKE_ON, E_SPECIAL_GOOD_SKILL];
var C_AERIAL = [E_AERIAL_DUEL];
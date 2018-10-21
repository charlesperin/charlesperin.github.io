/*
 TODO
 -Control table animation
 -Remove hover on table when dragging
 -Dragging non selected columns..
 -Show bins for other ranks (even if not focus), such as the selected and others -> make it an option
 -Transition from rect. cell to rounded focus
 -Compute and display the distance from mouse to curve
 -Implement ALL as URL params
 -Implement slopegraph as a feature (clippath)
 -Change line chart according to column ORDER (Where is it????)

 KNOWN BUGS
 -Should base drag on the dx and not on the cursor position
 -Bug when displaying the selected line (offset + should not be the focus one)
 -Update the line chart when changing the column order
 -When starting drag too quickly, bins don't follow

 OPTIONS
 -Transform selected lines as background halo (option)
 -Show the lines without having to activate using the drag (e.g. using hover)
 -Table and curves should have public "start", "during", and "end" callback functions
 -Show the focus circle on other curves?
 -Stick to focus when dragging the line
 -Sometimes cells are selected automatically (for instance when dragging one single row)
 */

function DragCurve(params){
  this.snapToTick = params.snapToTick;
  this.parentSVG = params.parentSVG;
  this.margins = params.margins;
  this.width = params.width;
  this.height = params.height;
  this.table = table;

  this.min = params.min;
  this.max = params.max;
  this.x = params.x;
  this.y = params.y;
  this.cell = params.cell;
  this.thumbRadius = params.thumbRadius;
  this.listeners = [];
  this.orientLabels = params.orientLabels;
  this.teamID = params.teamID;
  this.colID = params.colID;
  this.halo = params.halo || false;
  this.bins = params.bins || false;
  this.lines_opacity = params.lines_opacity || 0;
  this.table_opacity = params.table_opacity || 0;
  this.hover_cell = params.hover_cell || 0;
  this.provenance = params.provenance || "none";
  this.dailyResults = params.dailyResults || undefined;
  this.missing_data = this.table.missing_data;
  this.lineChartStrokeWidth = params.lineChartStrokeWidth || 2;

  this.timing = typeof(params.timing) == "undefined" ? 500 : params.timing;

  this.plateau = params.plateau || 1;
  this.multiscale = params.multiscale || "days";

  this.interpolation = params.interpolation || "none";
  this.resolution = params.resolution || "table";
  this.slope_graph = params.slope_graph || false;

  this.value = params.initValue;
  this.values = params.values;

  var $this = this;

  this.data = params.data;

  this.rankings = params.rankings;

  this.startDay = params.startDay;
  this.nbDays = params.nbDays;
  this.nbTeams = params.nbTeams;
  this.nbCols = params.nbCols;
  this.minDay = params.minDay;
  this.maxDay = params.maxDay;
  this.scale_height = params.scale_height;


/*
  this.curve_width = this.nbCols*this.cell_width;
  this.curve_height = this.nbTeams*this.cell_height;
  */
  var dimensions = this.table.dragCurveSize;
  this.curve_width = dimensions.width;

  if(curve_params.scale_chart == "false" || curve_params.scale_chart == false)
    this.curve_height = dimensions.height;
  else
    this.curve_height = $(window).height()*2/3;

  //console.log(params.scale_chart)

  // TODO retreive from params
  this.cell_width = this.curve_width/this.nbCols || 43;
  this.cell_height = this.curve_height/this.nbTeams || 23;


  // TODO: to fix it does not work
  // Scale to match the drag value and the curves position
  var resolution_range = $this.curve_width;
  if(this.resolution=="table")
    resolution_range = $this.curve_width;
  else if(this.resolution=="pixel")
    resolution_range = $this.nbDays;
  else if(params.resolution=="half")
    resolution_range = $this.curve_width;
  else (this.resolution=="twice");
  resolution_range = $this.curve_width*2;
  /*
   else if(this.resolution=="pixel")
   this.scale_drag = d3.scale.linear().domain([0, $this.nbDays]).range([0, $this.nbDays]);
   else if(this.resolution=="half")
   this.scale_drag = d3.scale.linear().domain([0, $this.nbDays]).range([0, $this.curve_width]);
   else (this.resolution=="twice")
   this.scale_drag = d3.scale.linear().domain([0, $this.nbDays]).range([0, $this.curve_width*2]);
   */
  this.scale_drag = d3.scale.linear().domain([$this.minDay, $this.maxDay]).range([0, $this.curve_width]);

  // Initialize the line_data
  $this.line_data = new Array(this.nbCols);
  for(var col=TEAM_ID+1;col<this.nbCols;col++){
    $this.line_data[col] = new Array(this.nbTeams);
    for(var team=0;team<this.nbTeams;team++){
      $this.line_data[col][team] = new Array(this.nbDays);
      for(var day=this.minDay;day<=this.maxDay;day++){
        if($this.data[day] != undefined && $this.data[day][team] != undefined && $this.data[day][col] != undefined){
          $this.line_data[col][team][day] = {
            value: $this.data[day][team][col],
            rank: $this.rankings[day][col].indexOf(team),
            teamID: team,
            time: day
          };
        }
      }
    }
  }

  if(this.type == "foot" || this.type == "citations") this.dailyResults = this.getDailyResults();

  //console.log(this.missing_data)
  this.create();
}

DragCurve.prototype.create = function(){
  var $this = this;
  table.overCell = false;

  this.sliderGroup = this.parentSVG.append('g')
      .attr("clip-path", "url(#clip)")
      .attr('class', 'slider-group')
      .attr('transform', 'translate(' + [this.x - (this.scale_drag(table.slider.value)), 0] + ')');

  this.curve_scale_x = d3.scale.linear().domain([this.minDay, this.maxDay]).range([0, this.curve_width]);
  this.curve_scale_y = d3.scale.linear().domain([0, this.nbTeams]).range([this.curve_height, 0]);

  $this.line = d3.svg.line()
      .interpolate($this.interpolation)
      .x(function(d) { return $this.curve_scale_x(d.time);})
      .y(function(d) { return $this.curve_scale_y(d.rank);});

  //---------------------------------------------------------------//
  //--------------------------The curve USED TO DRAG---------------//
  //---------------------------------------------------------------//

  // Find the rank of the selected row
  var focus_rank = 0;
  $this.line_data[this.colID][this.teamID].filter(function(d, i) {
    if(i==table.slider.value)
      focus_rank = d.rank;
  });



  // TODO: option to make it visible
  // The curve that is dragged (invisible by default)
  this.path = this.sliderGroup.append("svg:path")
      .style("stroke-width", $this.lineChartStrokeWidth)
      .style("stroke", $this.table.getLineChartColor($this.teamID))
      .attr("id", "line")
      .style("opacity", 0)
      .attr("transform", "translate("+[0, this.cell_height/2]+")")
      .attr("d", $this.line($this.line_data[this.colID][this.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: focus_rank, time: d.time} })))
      .transition().duration($this.timing)
      .attr("d", $this.line($this.line_data[this.colID][this.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: d.rank, time: d.time} })))
      .each("end", function(){
        /*
         Data for data provenance
         */
        if($this.dailyResults != undefined){
          var lineData = $this.line_data[$this.colID][$this.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: d.rank, time: d.time} });
          //console.log(lineData)
          $this.dailyProvenance = $this.dailyResults.map(function(d){return {result: d}});
          $this.dailyProvenance.forEach(function(d,i){
            if(d==undefined || d.result == undefined) return;
            if($this.table.type == "foot"){
              d.result = d.result.filter(function(d){return d.homeTeam == $this.teamID || d.awayTeam == $this.teamID})[0];
              //circles between time steps
              d.x = ($this.scale_drag(i) + $this.scale_drag(i-1))/2;
              d.y = Utils.find_y_given_x(d.x, $this.path);
            }
            else if($this.table.type == "citations"){
              d.result = d.result.filter(function(d){return d.authorIndexes.indexOf($this.teamID) != -1});
              //circles on time steps
              if(d.result.length > 0) d.x = $this.curve_scale_x(d.result[0].year);
              else d.x = 0;
              var rank = lineData.filter(function(d){return d.time == i})[0].rank;
              d.y = $this.curve_scale_y(rank);
              //d.x = $this.curve_scale_x(d.time)
              //d.x = ($this.scale_drag(i) + $this.scale_drag(i-1))/2;
              //d.y = Utils.find_y_given_x(d.x, $this.path);
            }
            else console.error("invalid type",$this.table.type);


          });
        }
        else if($this.missing_data != undefined){
          //console.log($this.missing_data)
          var lineData = $this.line_data[$this.colID][$this.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: d.rank, time: d.time} });
          $this.dailyMissing = $this.missing_data.map(function(d){return {missing: d}});
          $this.dailyMissing.forEach(function(d,i){
            if(d==undefined || d.missing == undefined) return;
            d.missing = d.missing.filter(function(d,team){return team == $this.teamID});
            if(d.missing.length == 0 || d.missing[0].length == 0) return;
            if(d.missing[0][$this.colID] == true){
              d.x = $this.curve_scale_x(i);
              var rank = lineData.filter(function(d){return d.time == i})[0].rank;
              d.y = $this.curve_scale_y(rank);
              //console.log("missing",i, d.x, d.y)
            }
          });
        }

        $this.sliderGroup.append("g")
            .attr("class","provenanceGroup")
            .attr("transform", "translate("+[0,0]+")");

        $this.sliderGroup.append("g")
            .attr("class","missingGroup")
            .attr("transform", "translate("+[0,0]+")");

      });


  this.start_value = table.slider.value;


  // Should go with the other curves
  if($this.halo) {
    $this.path_halo = this.sliderGroup.append("svg:path")
        .attr("class", "halo-curve")
        .style("stroke-width", this.cell_height)
        .style("stroke", $this.table.getLineChartColor($this.teamID))
        .attr("transform", "translate("+[0, this.cell_height/2]+")")
        .style("opacity", .3)
        .attr("d", $this.line($this.line_data[this.colID][this.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: focus_rank, time: d.time} })))
        .transition().duration($this.timing)
        .attr("d", $this.line($this.line_data[this.colID][this.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: d.rank, time: d.time} })))
        .attr("transform", "translate("+[0, this.cell_height/2]+")")
  }


  if($this.multiscale == "years") { // table.dragtable.sliders.time.multiscale
    var perspective = dz.projection.perspective()
        , cameraPos = [0, 10, 100]
        , r = 5
        , camera = perspective.camera().position(cameraPos).lookAt([0, 0, 0])
            .focalLength(1)
        , w = 800, h = 800//window.innerWidth, h = window.innerHeight
        , sin = Math.sin, cos = Math.cos, pi = Math.PI, tau = pi * 2
        , max = Math.max(w, h), min = Math.min(w, h), diff = max - min
    // screen scaling
        , ranges = [ [0, max] , [ - diff / 2, max - diff / 2] ]
        , screenX = d3.scale.linear().domain([-1, 1]).range(ranges[w < h ? 1 : 0])
        , screenY = d3.scale.linear().domain([1, -1]).range(ranges[w > h ? 1 : 0])
        , svg = d3.select('body').append('svg').attr({width: w, height: h})
        , line = d3.svg.line()
            .x(function(d){ return screenX(perspective.x(d)) })
            .y(function(d){ return screenY(perspective.y(d)) })
            .interpolate($this.interpolation);

    var sample_data = [[[1,2,3], [0,10,0], [2,10,0], [0,1000,0], [10,20,3]]];

    var d3_data = $this.line_data[this.colID][this.teamID].filter(function(d){return d != undefined}).map(function(d, i) { return [d.rank, i, 0] })

    perspective.camera().position(dz.matrix()//.rotateX(0).rotateY(4).rotateX(1.1).rotateZ(0)
        .multiVector(cameraPos));

    path = d3.select("svg").append("g").selectAll('path').data([d3_data]).enter().append('path').attr({d: line}).attr("class", "d3path")

  }


  //---------------------------------------------------------------//
  //--------------------------OTHER curves-------------------------//
  //----------------(including focus and selected)-----------------//

  var curves_data = $this.line_data[this.colID].filter(function(d){return d != undefined}).map(function(d,teamID){
    return {teamID: teamID, rank: d[table.slider.value].rank};
  });

  // Find verit
  var y_offset = this.cell_height/2;
  if(curve_params.scale_chart == "true" || curve_params.scale_chart == true)
    y_offset = $this.curve_scale_y(focus_rank) * table.height / this.curve_height - $this.curve_scale_y(focus_rank);

  this.sliderGroup.selectAll(".drag-curve")
      .data(curves_data)
      .enter()
      .append("svg:path")
      .attr("class", "drag-curve")
      .attr("transform", "translate("+[0, y_offset]+")")
      .style("stroke-width", function(d) {return ($this.teamID == d.teamID) ? $this.lineChartStrokeWidth : $this.lineChartStrokeWidth/2; })
      .style("opacity", function(d) { return (table.selected_teams.indexOf(d.teamID) > -1 || $this.teamID == d.teamID) ? 1 : $this.lines_opacity; })
      .style("stroke", function(d){return $this.table.getLineChartColor(d.teamID)})
      .attr("d", function(dLine){return $this.line($this.line_data[$this.colID][dLine.teamID].filter(function(d){return d != undefined}).map(function(d, i) { return {rank: dLine.rank, time: d.time}; }))})
      .transition().duration($this.timing)
      .attr("d", function(dLine) {
        var orig_line = $this.line_data[$this.colID][dLine.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: d.rank, time: d.time} });
        var plateau_line = [];
        orig_line.map(function(d) {
          var dd = d;
          for(var p=0; p<$this.plateau; p++) {
            var shift_center = ($this.plateau <= 1) ? 0 : .5;
            plateau_line.push( {rank: dd.rank, time: (dd.time + ( (p/$this.plateau) - shift_center) )});
          }
        });
        return $this.line(plateau_line);
      });


  if($this.bins == true) { // CHAR pb to be fixed

    // Bins' path (not visible!!)
    var bin_path = this.sliderGroup.append("svg:path")
        .attr("opacity", 0)
        .attr("class", "bins-curve")
        .attr("d", $this.line($this.line_data[this.colID][$this.teamID].filter(function(d){return d != undefined}).map(function(d) { return {rank: d.rank, time: d.time} })));

    $this.line_data[$this.colID][$this.teamID].filter(function(d){return d != undefined}).forEach(function(d, i) {

      $this.sliderGroup.append("circle")
          .attr("r", 4)
          .attr("class", "bins")
          .style("fill", $this.table.getLineChartColor($this.teamID))
          .attr("transform", function() {  return "translate("+[$this.curve_scale_x(i), $this.curve_scale_y(focus_rank)+$this.cell_height/2]+")"})
          .transition().duration($this.timing)
          .attr("transform", function() {  return "translate("+[$this.curve_scale_x(i),  Utils.find_y_given_x($this.scale_drag(i), bin_path)+$this.cell_height/2]+")"})

    })
  }

  //---------------------------------------------------------------//
  //--------------------------The thumb----------------------------//
  //---------------------------------------------------------------//
  this.thumbGroup = this.sliderGroup.selectAll(".slider-thumb")
      .data([{value: this.value, dx:0}])
      .enter()
      .append("g")
      .attr("class","slider-thumb")
      .attr("transform", "translate("+[this.scale_drag(table.slider.value), Utils.find_y_given_x(this.scale_drag(table.slider.value), $this.path)+this.cell_height/2]+")")

  this.thumbGroup.append("circle")
      .attr("r",this.thumbRadius)
      .attr("cx",this.thumbHeight);

  function dragSliderStart(d) {
    d.dx = 0;
  }

  function dragSliderMove(d) {
    $this.dragThumb(d3.event);
  }

  function dragSliderEnd(d) {
    d.dx = 0;
    $this.fireEvent("changed");
  }

  //---------------------------------------------------------------//
  //--------------------------Other Stuff--------------------------//
  //---------------------------------------------------------------//

  // TODO updates infos on the table
  // Current line length
  d3.select("#total-length").text(this.path.node().getTotalLength());
  d3.select("#curr-curv").text(this.scale_drag(table.slider.value));
  d3.select("#curr-chart").text(table.slider.value);


  offset_x = curve_params.x;//d3.event.sourceEvent.;
  offset_y = curve_params.y;

  // TODO: once finished, display the lines (but not before)
  $this.thumbGroup.append("path")
      .attr("class", 'cell-focus')
      .attr("x", 0)
    // .attr("transform", function(d,i) { return "translate("+$this.getCellTranslate(this_cell)+")"; })
//      .attr("transform", function(d,i) { return "translate("+(d3.event.sourceEvent.clientX-offset_x)+","
//          +(d3.event.sourceEvent.pageY-offset_y)+")"})
      .attr("d", rectangle)
      .transition()
      .duration($this.timing/3)
      .delay($this.timing/6)
      .attr("d", square)
      .transition()
      .duration($this.timing/3)
      .delay($this.timing/6)
      .attr("d", circle);



  if(this.slope_graph) {

    // clip path for the brown circle
    $this.sliderGroup.append("clipPath")
        .attr('id', function(d) { return "clip"; })
        .append('rect')
        .attr("x", function(d, i){ return -$this.cell_width/2;})
        .attr("width", function(d, i){ return $this.cell_width;})
        .attr("y", function(d, i) {return $this.cell_height;})
        .attr("height", function(d, i) {return $this.curve_height;})
        .attr("transform", "translate("+[$this.scale_drag($this.start_value), 0]+")");

  }

  d3.selectAll(".cell").transition().duration($this.timing+200).style("opacity", $this.table_opacity);





};

DragCurve.prototype.dragThumb = function() {
  var $this = this;
  this.cell.dx += d3.event.dx;

  // Make sure we stay in the right interval
  var translate_x = Math.max(-this.scale_drag(this.start_value), Math.min($this.cell.dx, $this.curve_width-this.scale_drag(this.start_value)));

  // Temporary hide the cursor
  d3.select("body").style("cursor", "none");


  // Find the rank of the selected row
  var focus_rank = 0;
  $this.line_data[this.colID][this.teamID].filter(function(d, i) {
    if(i==table.slider.value)
      focus_rank = d.rank;
  });

  // Find verit
  var y_offset = this.cell_height/2;
  if(curve_params.scale_chart == "true" || curve_params.scale_chart == true)
    y_offset = $this.curve_scale_y(focus_rank) * table.height / this.curve_height - $this.curve_scale_y(focus_rank);

  // Move curves -> change to $this.sliderGroup
  d3.selectAll(".drag-curve, .halo-curve, .bins-curve").attr("transform", "translate("+[-translate_x, y_offset]+")");

  // Bins
  d3.selectAll(".bins").attr("transform", function(d, i) { return "translate("+[$this.curve_scale_x(i)-translate_x,  Utils.find_y_given_x($this.scale_drag(i),  $this.path)+y_offset]+")"});


  var xPos = $this.scale_drag($this.start_value);
  var yPos = Utils.find_y_given_x(translate_x+$this.scale_drag($this.start_value), $this.path)+y_offset;
  //console.log([$this.scale_drag($this.start_value), Utils.find_y_given_x(translate_x+$this.scale_drag($this.start_value), $this.path)+$this.cell_height/2]);

  // Move thumb
  $this.thumbGroup.attr("transform", "translate("+[xPos, yPos]+")"); //   skewY(-60)

  var clientHeight = (window.innerHeight || document.body.clientHeight);

  //var thumbTr = d3.transform(this.thumbGroup.attr("transform")).translate;

  /*
  var cur = this.thumbGroup;
  while(cur.node().parentNode)
  */

  //console.log(thumbTr);

  var cur = this.thumbGroup;
  while(true){
    var parent = cur.node().parentNode;
    cur = d3.select(parent);
    var ty = d3.transform(cur.attr("transform")).translate[1];
    yPos += ty;
    if(cur[0][0].nodeName == "svg"){
      var y = cur.attr("y");
      if( y != undefined){
        yPos += y;
      }
      break;
    }
  }

  //here yPos is from the top of the page
  //check if going out of the page
  var vertOffset = sb_windowTools.scrollOffset.verticalOffset || 0;
  while(yPos > vertOffset + clientHeight/2 + 100){
    vertOffset += 100;
  }
  while(yPos < vertOffset + clientHeight/2 - 100){
    vertOffset -= 100;
  }

  //scroll the page
  if(curve_params.scale_chart == "true" || curve_params.scale_chart == true)
    window.scrollTo(0,y_offset);
  else
    window.scrollTo(0, vertOffset);


  //call that when auto scroll
  sb_windowTools.updateScrollOffset();

  // Move clippath
  // d3.select("#clip").attr("transform", "translate("+[$this.scale_drag($this.start_value), 0]+")");

  var floatDay = $this.curve_scale_x.invert(translate_x)+$this.start_value-$this.table.minDay;
  var closest_day = this.getClosestDay(translate_x);

  switch(curve_params.table_anim){
    case "none":
      break;
    case "linear":
      table.animateDayLinear(
          floatDay,
          $this.colID
      );
      break;
    case "curve":
      //TODO
      /*
       var curlen = 0;
       var curveLength = $this.path.node().getTotalLength();
       var seg_and_point = Utils.find_path_segment_and_point_given_x($this.scale_drag(floatDay),  $this.path);
       var segment = seg_and_point.segment;
       switch(segment.pathSegTypeAsLetter){
       case "M":break;//do nothing, it's the 1st point
       case "C":
       console.log("SegmentLength",segment);
       break;
       default: console.log("unknown path letter",segment.pathSegTypeAsLetter);
       }
       */


      break;
  }

  //show missing data
  if($this.missing_data != undefined){
    if($this.dailyMissing != undefined){

      var missingGroup = $this.sliderGroup.select(".missingGroup")
          .attr("transform", "translate("+[-translate_x,$this.cell_height/2]+")");

      var _data = $this.dailyMissing.filter(function(d,i){return d.missing != undefined && d.missing.length != 0});

      var crossGroup = missingGroup.selectAll(".missing")
          .data(_data);

      crossGroup.enter()
          .append("g")
          .attr("class","missing")
          .attr("transform", function(d,i){return "translate("+[d.x, d.y]+")"})
          .each(function(d){
            d3.select(this).append("line")
                .attr({
                  x1: -4,
                  y1: -4,
                  x2: 4,
                  y2: 4
                })
                .style({
                  stroke: "black",
                  "stroke-witdh": 1
                });
            d3.select(this).append("line")
                .attr({
                  x1: -4,
                  y1: 4,
                  x2: 4,
                  y2: -4
                })
                .style({
                  stroke: "black",
                  "stroke-witdh": 1
                });
          });

    }
  }

  //show data provenance
  if($this.dailyResults != undefined){
    if($this.dailyProvenance != undefined){

      var dayResult = $this.dailyProvenance[table.slider.value+1];

      var provGroup = $this.sliderGroup.select(".provenanceGroup")
          .attr("transform", "translate("+[-translate_x,$this.cell_height/2]+")");

      switch($this.provenance){
        case "none"://do nothing
          break;
        case "circles":
          var circleGroups = provGroup.selectAll(".provenance")
              .data($this.dailyProvenance.filter(function(d,i){return d.result != undefined}));

          circleGroups.enter()
              .append("g")
              .attr("class","provenance")
              .attr("transform", function(d,i){return "translate("+[d.x, d.y]+")"})
              .each(function(d){
                d3.select(this).append("circle")
                    .attr($this.getProvenanceCirclesAttr(d.result))
                    .style($this.getProvenanceCirclesStyle(d.result));
              });

          break;
        case "sparkline":
          console.log("TODO - provenance for sparkline");
          break;
        case "connection":
          console.log("TODO - provenance for connection");
          break;
        case "highlight":

          $this.sliderGroup.selectAll(".drag-curve")
              .each(function(d){
                d3.select(this).style($this.getProvenanceHighlightStyle(d,dayResult));
              });


          break;
        default: console.error("unknown provenance",$this.provenance);
      }
    }
  }


  // Update top slider to closest day if changed
  if(Math.round(floatDay) != table.slider.value){
    //console.log(closest_day)
    table.slider.setValue(closest_day);
  }

  // Other stuff
  d3.select("#curr-curv").text(this.scale_drag(table.slider.value));
  d3.select("#curr-chart").text(table.slider.value);
};

DragCurve.prototype.getProvenanceHighlightStyle = function(d,dayResult){
  var $this = this;
  var strokeWidth, opacity;

  if(table.selected_teams.indexOf(d.teamID) > -1 || $this.teamID == d.teamID) opacity = 1;
  if($this.teamID == d.teamID) strokeWidth = $this.lineChartStrokeWidth;
  else if(dayResult != undefined){
    if($this.table.type == "foot"){
      if(d.teamID == dayResult.result.homeTeam || d.teamID == dayResult.result.awayTeam) {
        strokeWidth =  $this.lineChartStrokeWidth*0.75;
        opacity = 1;
      }
      else {
        strokeWidth =  $this.lineChartStrokeWidth*0.5;
        opacity = $this.lines_opacity;
      }
    }
    else if($this.table.type == "citations"){
      var nbArticles = d3.sum(dayResult.result, function(article){
        return article.authorIndexes.indexOf(d.teamID) != -1 ? 1 : 0;
      });
      nbArticles = nbArticles || 0;
      if(nbArticles && nbArticles > 0){
        strokeWidth =  $this.lineChartStrokeWidth*nbArticles;
        opacity = 1;
      }
      else {
        strokeWidth =  $this.lineChartStrokeWidth*0.5;
        opacity = $this.lines_opacity;
      }
    }
  }

  return {
    opacity: opacity,
    "stroke-width": strokeWidth
  }
};

DragCurve.prototype.getProvenanceCirclesStyle = function(d){
  var fill, opacity = 1, stroke, strokeWidth;

  if(this.table.type == "foot"){
    if(d.homeTeam == this.teamID) fill = d.homeScore > d.awayScore ? "green" : d.homeScore < d.awayScore ? "red" : "yellow";
    else fill = d.awayScore > d.homeScore ? "green" : d.awayScore < d.homeScore ? "red" : "yellow";
    stroke = "black";
    strokeWidth = 1;
  }

  else if(this.table.type == "citations"){
    //if(d.filter(function(d){return d.best}).length > 0) fill = "yellow";
    //else fill = "blue";
    fill = "black";
    if(d.length == 0) opacity = 0;
    if(d.filter(function(d){return d.best}).length > 0){
      stroke = "red";
      strokeWidth = 3;
    }
    else {
      stroke = "black";
      strokeWidth = 1;
    }
  }
  else console.error("invalid type",this.table.type);

  return {
    opacity: opacity,
    fill: fill,
    stroke: stroke,
    "stroke-width": strokeWidth
  }
};
DragCurve.prototype.getProvenanceCirclesAttr = function(d){
  var r = 4;

  if(this.table.type == "citations"){
    r = d.length*4;
  }

  return {
    cx: 0,
    cy: 0,
    r: r
  }
};








/*
 returns an array associating to each day the result of the focus team
 */
DragCurve.prototype.getDailyResults = function(){
  var $this = this;
  if($this.dailyResults == undefined) console.error("dailyResults is undefined");

  if(this.table.type == "foot") return $this.dailyResults.map(function(dayResults){
    var result = dayResults.filter(function(dayResult){
      return dayResult.homeTeam == $this.teamID || dayResult.awayTeam == $this.teamID;
    });
    if(result.length == 0) result = undefined;
    else if(result.length == 1) result = result[0];
    else console.error("error in result",result);
    return result;
  });

  else if(this.table.type == "citations") return $this.dailyResults.map(function(dayResults){
    var result = dayResults.filter(function(dayResult){
      return dayResult.authorIndexes.indexOf($this.teamID) != -1;
    });
    if(result.length == 0) result = undefined;
    else if(result.length == 1) result = result[0];
    else console.error("error in result",result);
    return result;
  });

  else console.error("invalid type",this.type);
};


DragCurve.prototype.getClosestDay = function(translate_x){
// Update table and top slider to closest day (corresponds to step after so far)
  return Math.max(this.minDay,Math.min(this.maxDay, Math.round(this.curve_scale_x.invert(translate_x)+this.start_value-this.table.minDay)));
};

DragCurve.prototype.remove = function(){
  this.sliderGroup.remove();
};

DragCurve.prototype.endDrag = function(callback) {
  var $this = this;


  // Update table to closest day
  table.changeDay(table.slider.value);


  d3.select(".table-group").style("opacity", 1);

  // Restore mouse pointer
  d3.select("body").style("cursor", "default");

  offset_x = curve_params.x;//d3.event.sourceEvent.;
  offset_y = curve_params.y;

  // TODO: attach somewhere else
  $this.thumbGroup.append("path")
      .attr("class", 'cell-focus')
      .attr("x", 0)
    // .attr("transform", function(d,i) { return "translate("+$this.getCellTranslate(this_cell)+")"; })
      .attr("transform", function(d,i) {if(offset_x != undefined) return "translate("+(d3.event.sourceEvent.clientX-offset_x)+","
          +((d3.event.sourceEvent.pageY-offset_y))+")"})
      .attr("d", circle)
      .transition()
      .duration($this.timing/3)
      .delay($this.timing/6)
      .attr("d", square)
      .transition()
      .duration($this.timing/3)
      .delay($this.timing/6)
      .attr("d", rectangle);

  // TODO: Inverse transition for the lines + bins
  d3.selectAll(".drag-curve")
      .transition().duration(500)
      .attr("d", function(dd, t) {

        var curr_rank = 0;
        $this.line_data[$this.colID][t].filter(function(d, i) {
          if(i==table.slider.value)
            curr_rank = d.rank;
        });

        return $this.line($this.line_data[$this.colID][t].filter(function(d){return d != undefined}).map(function(d) { return {rank: curr_rank, time: d.time} }));
      })
      .each("end", function() {

        // we make sure everything has been removed
        $this.remove();

      })
      .remove();



  // Find the rank of the selected row
  var focus_rank = 0;
  $this.line_data[this.colID][this.teamID].filter(function(d, i) {
    if(i==table.slider.value)
      focus_rank = d.rank;
  });

  this.cell.dx += d3.event.dx;

  // Make sure we stay in the right interval
  var translate_x = Math.max(-this.scale_drag(this.start_value), Math.min($this.cell.dx, $this.curve_width-this.scale_drag(this.start_value)));

  // Flatten the bin path to the current rank

  var bin_path = d3.select(".bins-curve")
      .attr("d", function(dd, t) {


        return $this.line($this.line_data[$this.colID][t].filter(function(d){return d != undefined}).map(function(d) { return {rank: focus_rank, time: d.time} }));
      })

  // Bins
  d3.selectAll(".bins").transition().duration($this.timing)
      .attr("transform", function(d, i) {

        return "translate("+[d3.transform(d3.select(this).attr("transform")).translate[0],  Utils.find_y_given_x($this.scale_drag(i), bin_path)+$this.cell_height/2]+")"})



  /*
   .attr("transform", function(d, i) {
   return "translate("+[$this.curve_scale_x(i), $this.curve_scale_y(focus_rank)+$this.cell_height/2]+")"
   })
   .each("end", function() {

   })
   .remove();
   */
  // Lines

  // Halo
  d3.selectAll(".halo-curve")
      .transition().duration($this.timing)
      .attr("d", $this.line($this.line_data[$this.colID][$this.teamID].filter(function(d){return d != undefined}).map(function(d) { return focus_rank })))
      .remove();


  // TODO: put somewhere else (after lines are back?)

  // Table re-appears
  d3.selectAll(".cell").transition().duration($this.timing+200).style("opacity", 1);



  table.overCell = true;
  if(callback)
    callback.call(newVal);
};

DragCurve.prototype.addListener = function(listener){
  if(this.listeners.indexOf(listener) == -1) this.listeners.push(listener);
};

DragCurve.prototype.fireEvent = function(event){
  var $this = this;
  this.listeners.forEach(function(listener){
    listener.sliderChanged(event, $this.value);
  });
};




// Page Size and View Port Dimension Tools
// http://stevenbenner.com/2010/04/calculate-page-size-and-view-port-position-in-javascript/
if (!sb_windowTools) { var sb_windowTools = new Object(); };

sb_windowTools = {
  scrollBarPadding: 17, // padding to assume for scroll bars

  // EXAMPLE METHODS

  // center an element in the viewport
  centerElementOnScreen: function(element) {
    var pageDimensions = this.updateDimensions();
    element.style.top = ((this.pageDimensions.verticalOffset() + this.pageDimensions.windowHeight() / 2) - (this.scrollBarPadding + element.offsetHeight / 2)) + 'px';
    element.style.left = ((this.pageDimensions.windowWidth() / 2) - (this.scrollBarPadding + element.offsetWidth / 2)) + 'px';
    element.style.position = 'absolute';
  },

  // INFORMATION GETTERS

  // load the page size, view port position and vertical scroll offset
  updateDimensions: function() {
    this.updatePageSize();
    this.updateWindowSize();
    this.updateScrollOffset();
  },

  // load page size information
  updatePageSize: function() {
    // document dimensions
    var viewportWidth, viewportHeight;
    if (window.innerHeight && window.scrollMaxY) {
      viewportWidth = document.body.scrollWidth;
      viewportHeight = window.innerHeight + window.scrollMaxY;
    } else if (document.body.scrollHeight > document.body.offsetHeight) {
      // all but explorer mac
      viewportWidth = document.body.scrollWidth;
      viewportHeight = document.body.scrollHeight;
    } else {
      // explorer mac...would also work in explorer 6 strict, mozilla and safari
      viewportWidth = document.body.offsetWidth;
      viewportHeight = document.body.offsetHeight;
    };
    this.pageSize = {
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight
    };
  },

  // load window size information
  updateWindowSize: function() {
    // view port dimensions
    var windowWidth, windowHeight;
    if (self.innerHeight) {
      // all except explorer
      windowWidth = self.innerWidth;
      windowHeight = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) {
      // explorer 6 strict mode
      windowWidth = document.documentElement.clientWidth;
      windowHeight = document.documentElement.clientHeight;
    } else if (document.body) {
      // other explorers
      windowWidth = document.body.clientWidth;
      windowHeight = document.body.clientHeight;
    };
    this.windowSize = {
      windowWidth: windowWidth,
      windowHeight: windowHeight
    };
  },

  // load scroll offset information
  updateScrollOffset: function() {
    // viewport vertical scroll offset
    var horizontalOffset, verticalOffset;
    if (self.pageYOffset) {
      horizontalOffset = self.pageXOffset;
      verticalOffset = self.pageYOffset;
    } else if (document.documentElement && document.documentElement.scrollTop) {
      // Explorer 6 Strict
      horizontalOffset = document.documentElement.scrollLeft;
      verticalOffset = document.documentElement.scrollTop;
    } else if (document.body) {
      // all other Explorers
      horizontalOffset = document.body.scrollLeft;
      verticalOffset = document.body.scrollTop;
    };
    this.scrollOffset = {
      horizontalOffset: horizontalOffset,
      verticalOffset: verticalOffset
    };
  },

  // INFORMATION CONTAINERS

  // raw data containers
  pageSize: {},
  windowSize: {},
  scrollOffset: {},

  // combined dimensions object with bounding logic
  pageDimensions: {
    pageWidth: function() {
      return sb_windowTools.pageSize.viewportWidth > sb_windowTools.windowSize.windowWidth ?
          sb_windowTools.pageSize.viewportWidth :
          sb_windowTools.windowSize.windowWidth;
    },
    pageHeight: function() {
      return sb_windowTools.pageSize.viewportHeight > sb_windowTools.windowSize.windowHeight ?
          sb_windowTools.pageSize.viewportHeight :
          sb_windowTools.windowSize.windowHeight;
    },
    windowWidth: function() {
      return sb_windowTools.windowSize.windowWidth;
    },
    windowHeight: function() {
      return sb_windowTools.windowSize.windowHeight;
    },
    horizontalOffset: function() {
      return sb_windowTools.scrollOffset.horizontalOffset;
    },
    verticalOffset: function() {
      return sb_windowTools.scrollOffset.verticalOffset;
    }
  }
};

window.onscroll = function() {
  // update the scroll information
  sb_windowTools.updateScrollOffset();
};
var PODIUM_RANK = 3,
    EUROPE_RANK = 5,
    RELEGATION_RANK = 18;

var MAX_NAME_CHAR = 60;

function Table(params){
  this.init(params);
  this.setInteractionMode(params.mode,true);
  this.changeOrder(true);
}

Table.prototype.init = function(params){
  var $this = this;
  this.hasSlider = params.slider.hasSlider;
  this.x = params.x;
  this.y = params.y;
  this.animations = params.animations;
  this.width = params.width;
  this.height = params.height;
  this.margins = params.margins;
  this.data_index = params.data.current_day;
  this.column_labels = params.data.columnLabel;
  this.data = params.data.data;
  this.order_identifier = null;
  this.nbDays = params.data.nbDays;
  this.selected_teams = [];
  this.unique_days = params.data.unique_days;
  this.type = params.type;
  if(this.type == "foot") this.dailyResults = params.data.gameResults;
  if(this.type == "citations") this.dailyResults = params.data.citationResults;
  this.missing_data = params.data.missing_data;
  this.overCell = true;
  this.colorScale = params.colorScale || undefined;
  this.forceRowHeight = params.forceRowHeight;
  this.unique_teams = params.data.unique_teams;

  this.minDay = this.unique_days[0] + (this.type == "foot" ? -1 : 0);
  this.maxDay = this.unique_days[this.unique_days.length-1];
  this.initValue = this.minDay;

  if(DEBUG_CONSOLE)console.log(this.data);

  var tableY = this.hasSlider ? params.slider.height : 0;

  //---------------------------------------------------------------//
  //----------------------Some constants---------------------------//
  //---------------------------------------------------------------//
  var chartW = this.chartW = Math.max(this.width - this.margins.left - this.margins.right, 0.1);
  var chartH = this.chartH = Math.max(this.height - tableY - this.margins.top - this.margins.bottom, 0.1);
  var colHeaderH = this.colHeaderH = 20;


  //---------------------------------------------------------------//
  //---------the nodes are used to reorder the table---------------//
  //------consist of the raw data + an index, in an object---------//
  //---------------------------------------------------------------//
  this.nodes = [];
  this.data[this.data_index].forEach(function(d,i){
    $this.nodes.push({data:d, index:i});
  });
  this.nbTeams = this.nodes.length;

  if(this.forceRowHeight){
    this.height = this.margins.top + this.margins.bottom + tableY + this.nbTeams * this.forceRowHeight;
    chartH = this.chartH = Math.max(this.height - tableY - this.margins.top - this.margins.bottom, 0.1);
  }

  this.dragtable = new DragTable(this);

  //---------------------------------------------------------------//
  //---------Init the orders and apply the default order-----------//
  //---------------------------------------------------------------//
  this.computeOrders();
  this.order_identifier = [POINTS_DAY,1];
  this.order = this.orders[$this.order_identifier[0]][$this.order_identifier[1]];


  //---------------------------------------------------------------//
  //--------------------------The scales---------------------------//
  //---------------------------------------------------------------//

  var x_range = [], x_domain = [];
  this.column_labels.domain.forEach(function(d,i){
    x_range[i] = chartW*d;
    x_domain.push(i);
  });

  this.x_scale = d3.scale.linear()
      .domain(x_domain)
      .range(x_range);

  this.rowHeight = (chartH-colHeaderH)/this.nbTeams;
  var y_continuous_range = [], y_continuous_domain = [];
  for(var i=0;i<this.nbTeams;i++){
    y_continuous_range[i] = colHeaderH + $this.rowHeight*i;
    y_continuous_domain.push(i);
  }
  this.y_scale = d3.scale.linear()
      .domain(y_continuous_domain)
      .range(y_continuous_range);

  this.dragCurveSize = {width: chartW-50, height: chartH - colHeaderH, x: 50, y: colHeaderH};

  //console.log("y_continuous_range",y_continuous_range);


  //---------------------------------------------------------------//
  //-----------------------------SVG-------------------------------//
  //---------------------------------------------------------------//
  var svg = d3.select("#rankingTable").append("svg:svg")
      .attr("width",this.width+30)
      .attr("height",this.height);
  svg.append("defs")
      .append("filter")
      .attr("id","grayscale")
      .append("feColorMatrix")
      .attr("type","matrix")
      .attr("values","0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0");


  var globalGroup = svg.append('g')
      .attr('class', 'table-group')
      .attr('transform', 'translate(' + [this.margins.left , this.margins.top + tableY] + ')');
  this.tableGroup = globalGroup.append("g")
      .attr("class","cells-group");
  this.tableGroup.append("rect")
      .attr("class","table-bkg")
      .style("fill","white")
      .attr("width",this.width)
      .attr("height",482);


  //---------------------------------------------------------------//
  //-----------------------Col headers-----------------------------//
  //---------------------------------------------------------------//
  var ColHeadersGroup = this.tableGroup.append('g').attr('class', 'col-header-group');

  var arrow_width = 10, arrow_height = 8;

  ColHeadersGroup.selectAll(".col-header")
      .data(this.column_labels.names.map(function(d,i){return {name:d}}))
      .enter()
      .append("g")
      .attr("class", "col-header")
      .attr("transform", function(d,i){
        d.transform_init = "translate("+[$this.x_scale(i),0]+")";
        return d.transform_init;
      })
      .on("mouseover", function(d,i){
        if(i==RANK) return;
        d3.select(this).style("cursor", "pointer");
      })
      .on("click", function(d,i){
        if(i==RANK) return;
        ColHeadersGroup.selectAll(".col-header").filter(function(d2,i2){return i2 != i}).each(function(d){d.sorted = undefined});
        if(!d.sorted) d.sorted = 1;
        else d.sorted = 0;
        $this.order_identifier = [i, d.sorted];

        $this.order = $this.orders[$this.order_identifier[0]][$this.order_identifier[1]];//ascending

        $this.changeOrder();
      })
      .each(function(header,h){
        var cell_width = $this.x_scale(h+1)-$this.x_scale(h);
        header.bkg_width = cell_width;

        d3.select(this).append("title")
            .text($this.column_labels.titles[h]);

        d3.select(this).append("rect")
            .attr("class","bkg")
            .attr("width", header.bkg_width)
            .attr("height", colHeaderH);

        d3.select(this).append("text")
            .attr("x", header.bkg_width/2)
            .attr("y", colHeaderH/2+4.5)//to center...ugly
            .text(function(d){ return d.name; });

        d3.select(this).selectAll(".img-sort")
            .data([[h,0], [h,1]])//data are pairs [h,1 or -1] with h the header index and 0/1 descending/ascending
            .enter()
            .append("svg:path")
            .attr("class","img-sort")
            .attr("d", function(d){
              if(d[1] == 1){//go down
                return "M 0,0 l "+arrow_width+" 0 l -"+(arrow_width/2)+" "+arrow_height+" l -"+(arrow_width/2)+" -"+arrow_height+" z";
              }
              else{//go up
                return "M 0,0 l "+arrow_width+" 0 l -"+(arrow_width/2)+" -"+arrow_height+" l -"+(arrow_width/2)+" "+arrow_height+" z";
              }
            })
            .attr("transform", function(d){
              var dy = d[1] == 1 ? -arrow_height/2+1 : arrow_height/2;
              return "translate("+[cell_width-arrow_width-2,colHeaderH/2+dy]+")";
            })
            .style("visibility","hidden");
      });

  //---------------------------------------------------------------//
  //------------------------Data rows------------------------------//
  //---------------------------------------------------------------//
  this.tableGroup.selectAll(".row-group")
      .data(this.nodes)
      .enter().append("g")
      .attr("class", "row-group")
      .attr("transform", function(d, i) {
        d.oldTransform = [0,$this.y_scale($this.order.indexOf(i))];
        return "translate(" + d.oldTransform + ")";
      })
      .each(doRow);


  function doRow(row,r) {
    var cell = d3.select(this).selectAll(".cell")
        .data(row.data.map(function(v,i){
          return {value: v, index:i};
        }))
        .enter()
        .append("g")
        .attr("transform", function(d,i){
          return "translate("+[$this.x_scale(i),0]+")"
        })
        .attr("class", "cell");

    cell.append("rect")
        .attr("class","bkg")
        .attr("width", function(d,i){
          return $this.x_scale(i+1)-$this.x_scale(i);
        })
        .attr("height", $this.rowHeight);


    cell.each(function(d,i){
      d3.select(this).append("text")
          .attr("class","value")
          .attr("x", ($this.x_scale(i+1)-$this.x_scale(i))/2)
          .attr("y", $this.rowHeight/2+6)//to center...ugly
          .text(function(d){
            if(i==RANK){
              d.value = $this.order.indexOf(row.data[TEAM_ID]);
              return d.value+1;
            }
            else if(i==TEAM_ID){
              //console.log(d,tables.currentTable.unique_teams[d.value])
              //console.log(d.value,tables.currentTable.unique_teams,tables.currentTable.unique_teams[d.value])
              //console.log(d)
              var name = tables.currentTable.unique_teams[d.value];
              if(name != undefined && name.length > MAX_NAME_CHAR) {
                name = name.slice(0,MAX_NAME_CHAR-3);
                name += "...";
              }
              return name;
            }
            else return d.value != undefined ? d.value : "/";
          });
      if(i==TEAM_ID){
        var w = 12,
            h = 10,
            arrow_path = "M "+(-w/2)+" 0 v "+(-h/4)+" h "+(3*w/5)+" v "+(-h/4)+" l "+(2*w/5)+" "+(h/2)+" l "+(-2*w/5)+" "+(h/2)+" v "+(-h/4)+" h "+(-3*w/5)+" Z";

        d3.select(this)
            .append("g")
            .attr("transform", "translate("+[$this.x_scale(i+1)-$this.x_scale(i)-w-5,$this.rowHeight/2]+")")
            .append("svg:path")
            .attr("d",arrow_path)
            .attr("class","shadow-arrow")
            .style("opacity",0);

        w = 6;
        d3.select(this)
            .append("rect")
            .attr("class","team-name-checkbox")
            .attr("x",w)
            .attr("y",$this.rowHeight/2-w/2)
            .attr("width",w)
            .attr("height",w)
            .style("stroke-width",1)
            .style("stroke","black")
            .style("fill","lightgray");

      }
    });
  }

  //---------------------------------------------------------------//
  //--------------------------Area Lines---------------------------//
  //---------------------------------------------------------------//
  this.tableGroup.selectAll(".area-line")
      .data([PODIUM_RANK,EUROPE_RANK,RELEGATION_RANK-1])
      .enter()
      .append("line")
      .attr("class","area-line")
      .attr({
        x1:0,
        y1: function(d){return colHeaderH + $this.rowHeight * d},
        x2: $this.x_scale.range()[$this.x_scale.range().length-1],
        y2: function(d){return colHeaderH + $this.rowHeight * d}
      }).style("opacity", function() {return curve_params.table_land? 1: 0;});


  //---------------------------------------------------------------//
  //------------------------Table Slider---------------------------//
  //---------------------------------------------------------------//
  params.slider.parentSVG = svg;
  params.slider.max = this.maxDay;
  params.slider.min = this.minDay;
  params.slider.initValue = this.initValue;
  if(this.hasSlider) this.slider = new Slider(params.slider);
  this.tableGroup.moveToFront();
};

Table.prototype.createNoneInteractions = function(){
  this.tableGroup.select('.chart-group').remove();
  var cells = d3.selectAll('.cell');
  var $this = this;

  cells.on("click", null)
      .on("mouseover", null)
      .on("mouseout", null)
      .on('mousedown.drag', null);
  cells.selectAll(".interactionLayer").remove();//remove the interaction layer, if exist
  cells.select("text.value")
      .transition()
      .duration(200)
      .attr("x", function(d,i){return ($this.x_scale(d.index+1)-$this.x_scale(d.index))/2})
      .attr("y", $this.rowHeight/2+6);
};


Table.prototype.highlightClickCell = function(this_cell,c){
  var $this = this;

  var teamID = d3.select(this_cell).node().parentNode.__data__.index;

  if(c.index != TEAM_ID && !this.isTeamSelected(teamID)){
    $this.selectTeam(teamID);
  }
  if(c.index == TEAM_ID) {
    $this.selectTeam(teamID);
  }
};




//---------------------------------------------------------------//
//---------------------------DRAG-TABLE--------------------------//
//---------------------------------------------------------------//
Table.prototype.createDragTableInteraction = function(){
  var $this = this;

  var drag = d3.behavior.drag()
      .origin(Object)
      .on("dragstart", function(d){$this.dragtable.startDrag(d,this)})
      .on("drag", function(d){$this.dragtable.moveDrag(d,this)})
      .on("dragend", function(d){$this.dragtable.endDrag(d,this)});

  d3.selectAll('.cell')
      .on("click", function(c){$this.highlightClickCell(this,c)})
      .on("mouseover", function(d) {
        if(!$this.overCell) return;
        if(d.index == TEAM_ID) d3.select(this).style("cursor","pointer");
        else if($this.isTeamSelected(d3.select(this).node().parentNode.__data__.index)){
          //do nothing
        }
        else{
          //d3.select(this).classed("overed",true);
          switch(curve_params.hover_cell){
            case "Nothing":
              //do nothing
              break;
            case "ColorFill":
              d3.select(this).select(".bkg").style({
                "stroke-width": 1,
                fill: "lightgray"
              });
              break;
            case "Slope":
              console.log("TODO: hover_cell Slope");
              break;
            case "LineChart":

              var trCell = d3.transform(d3.select(this).attr("transform")).translate;
              var trRow = d3.transform(d3.select(this).attr("transform")).translate;

              var absPos = [trCell[0]+trRow[0]+parseInt(d3.select(this).select(".bkg").attr("width"))/2,
                trCell[1]+trRow[1]+parseInt(d3.select(this).select(".bkg").attr("height"))/2];

              d3.select(this).each(function(d,i){
                $this.cell_col_id = d.index;
                $this.cell_value = d.value;
                d3.select(d3.select(this).node().parentNode).each(function(d2,i2) {
                  $this.cell_team_id = d2.data[TEAM_ID];

                  //console.log(d, $this, d3.event, absPos, d3.select)

                  var c = d;
                  var drag_hover =  new DragCurve({
                    cell: c,
                    snapToTick: true,
                    parentSVG: $this.tableGroup,
                    x: absPos[0]/2 + 15, // quick fix
                    y: absPos[1],
                    width: 300,
                    height: 5,
                    orient: HORIZONTAL,
                    orientLabels: "top",
                    ticksOver: true,
                    ticksMargin: 1,
                    barHeight: 1,
                    thumbRadius: 5,
                    initValue: tables.currentTable.current_day,
                    values: d3.range($this.nbDays),
                    data:$this.data,
                    rankings:tables.currentTable.rankings,
                    teamID:$this.cell_team_id,
                    colID:c.index,
                    interpolation: curve_params.interpolation,
                    resolution: curve_params.resolution,
                    halo: curve_params.halo,
                    bins: curve_params.bins,
                    slope_graph: curve_params.slope_graph,
                    lines_opacity: curve_params.lines_opacity,
                    plateau: curve_params.plateau,
                    multiscale: curve_params.multiscale,
                    table: this,
                    cell_height: $this.rowHeight,

                    // CUSTOMS
                    timing: 1,
                    table_opacity: 75
                  })

                })});

              break;
          }
        }
      })
      .on("mouseout", function(d) {
        if(!$this.overCell) return;
        else if($this.isTeamSelected(d3.select(this).node().parentNode.__data__.index)){
          //do nothing
        }
        else{
        d3.select(this).select(".bkg").style({
          "stroke-width":.5,
          fill: "white"
        });
        }

        if(d.index == TEAM_ID) {


        }
        else{
          switch(curve_params.hover_cell){
            case "LineChart":
              // Dirty but efficient
              // Duration is needed to prevent disappearing when changing cell to hover
              d3.selectAll(".slider-group").transition().duration(0).style("opacity", 0).remove();
          }
        }

      })
      .call(drag);
};



Table.prototype.isTeamSelected = function(teamID){
  return this.selected_teams.indexOf(teamID) != -1;
};

Table.prototype.highlightSelectedTeams = function(){
  var $this = this;
  d3.selectAll(".row-group").each(function(d,i){
    d3.select(this).selectAll(".cell")
        .each(function(cell,c){
          d3.select(this).select(".bkg")
              .style("fill", $this.isTeamSelected(i) ? $this.getLineChartColor(i) : "white")
              .style("fill-opacity", ".3");
          if(c == TEAM_ID){
            d3.select(this).select(".team-name-checkbox")
                .style("fill",$this.isTeamSelected(i) ? "black" : "lightgray");
          }
        });
  });
};

Table.prototype.getLineChartColor = function(rowIndex){
  switch(this.type){
    case "foot":
        return getTeamColorsFromTeamID(rowIndex).primary;
      break;
    case "nations":
    case "citations":
    case "economy":
    case "products":
        return this.colorScale(tables.currentTable.rankings[this.maxDay][this.order_identifier[0]].indexOf(rowIndex));
      break;
    case "sort":
    //case "citations":
        return this.colorScale(this.unique_teams.indexOf(rowIndex));
      break;
    default: console.error("unknown type",this.type);
  }
};

Table.prototype.selectTeam = function(teamID){
  var $this = this;
  if($this.isTeamSelected(teamID)) $this.selected_teams.splice($this.selected_teams.indexOf(teamID),1);
  else $this.selected_teams.push(teamID);

  this.highlightSelectedTeams();
};


/*
 Compute the orders according to some rules:
 by team name: alphabetical order
 by points:          points then goal difference then scored goals then alphabetical order
 by home points:     home points then goal difference then scored goals then alphabetical order
 by away points:     away points then goal difference then scored goals then alphabetical order
 by scored goals:    scored goals then alphabetical order
 by conceded goals:  conceded goals then alphabetical order
 by goal diff:       goal diff then alphabetical order
 */
Table.prototype.computeOrders = function(){
  var $this = this;
  //precompute the orders
  this.orders = [];
  this.column_labels.names.forEach(function(name,i){
    $this.orders[i] = [
      tables.currentTable.rankings[$this.data_index][i],
      tables.currentTable.rankings[$this.data_index][i].slice().reverse()
    ];
  });
};





/*-----------------------------------------------------------------------
 UPDATE METHODS
 ----------------------------------------------------------------------*/


/*
 Reorder the table
 */
Table.prototype.changeOrder = function(isInitCall){
  var $this = this;


  d3.selectAll(".col-header").each(function(d,i){
    if(i == $this.order_identifier[0]){
      d3.select(this).classed("sorted",true);
      d3.select(this).selectAll(".img-sort").style("visibility", function(d){return d[1] == $this.order_identifier[1] ? "visible" : "hidden"});
    }
    else{
      d3.select(this).classed("sorted",false);
      d3.select(this).selectAll(".img-sort").style("visibility","hidden");
    }
  });

  //this.y_scale.domain(this.order);//reorder the nodes

  //update the rank of all lines
  d3.selectAll(".row-group")
      .each(function(row){
        d3.select(this).selectAll(".cell")
            .filter(function(d){return d.index == RANK})
            .select("text")
            .text(function(d){
              d.value = $this.order.indexOf(row.data[TEAM_ID]);
              return d.value+1
            });
      });

  d3.selectAll(".row-group")
      .transition()
      .duration(this.animations.sort.duration)
      .delay(function(d, i) { return $this.y_scale($this.order.indexOf(i)) * $this.animations.sort.delay; })
      .attr("transform", function(d, i) {
        d.oldTransform = [0,$this.y_scale($this.order.indexOf(i))];
        return "translate(" + d.oldTransform + ")";
      });

};

Table.prototype.changeDay = function(new_day){
  this.data_index = new_day;
  var $this = this;

  //update the nodes
  this.data[this.data_index].forEach(function(d,i){
    //find the corresponding bind data
    for(var n in $this.nodes){
      if($this.nodes[n].data[TEAM_ID] == d[TEAM_ID]){
        $this.nodes[n].data = d;
        break;
      }
    }
  });

  //update the orders
  this.computeOrders();
  this.order = this.orders[$this.order_identifier[0]][$this.order_identifier[1]];

  //update the y_scale demain, according to new order
  //this.y_scale.domain(this.order);

  //update the data rows
  this.tableGroup.selectAll(".row-group")
      .data(this.nodes)
      .transition()
      .duration(200)
      .delay(function(d, i) { return $this.y_scale($this.order.indexOf(i)) * $this.animations.change.delay; })
      .attr("transform", function(d, i) {
        d.oldTransform = [0,$this.y_scale($this.order.indexOf(i))];
        return "translate(" + d.oldTransform + ")";
      })
      .each(doRow);

  function doRow(row) {
    var cell = d3.select(this).selectAll(".cell")
        .data(row.data.map(function(v,i){
          return {value: v, index:i};
        }));

    cell.each(function(d,i){
      d3.select(this).select("text")
          .text(function(){
            if(i==RANK){
              d.value = $this.order.indexOf(row.data[TEAM_ID]);
              return d.value+1;
            }
            else if(i==TEAM_ID){//if team name
              var name = tables.currentTable.unique_teams[d.value];
              if(name != undefined && name.length > MAX_NAME_CHAR) {
                name = name.slice(0,MAX_NAME_CHAR-3);
                name += "...";
              }
              return name;
            }
            else return d.value != undefined ? d.value : "/";
          });
    });
  }
};

/*
 To link the animation to the dragCurve
 between startDay and endDay, with the current day value offseted by dDay
 */
Table.prototype.animateDayLinear = function(floatDay, column){
  //console.log("animate from",startDay,"to",endDay,"dDay=",dDay);

  var startDay = Math.floor(floatDay),
      endDay = Math.ceil(floatDay),
      dDay = floatDay - startDay,
      closestDay = Math.abs(startDay - floatDay) < Math.abs(endDay - floatDay) ? startDay : endDay,
      furthestDay = closestDay == startDay ? endDay : startDay;

  var $this = this;

  //check if day changes
  if(Math.round(floatDay) != this.data_index){
    this.data_index = Math.round(floatDay);
    this.updateRowContent();
    this.computeOrders();
    this.order = this.orders[$this.order_identifier[0]][$this.order_identifier[1]];
  }

  //update the data rows
  this.tableGroup.selectAll(".row-group")
      .data(this.nodes)
      .transition()
      .duration(200)
      .attr("transform", transformRow())
      .each(doRow);

  function transformRow(){
    return function(row,i){
      var startRank = tables.currentTable.rankings[startDay][column].indexOf(row.data[TEAM_ID]);
      var endRank = tables.currentTable.rankings[endDay][column].indexOf(row.data[TEAM_ID]);

      var floatRank = Math.min(startRank,endRank) + Math.abs(startRank-endRank) * (dDay);
      if($this.order_identifier[1] == 1){//ascending
        startRank = $this.nbTeams -1 - startRank;
        endRank = $this.nbTeams -1 - endRank;

        if(startRank > endRank){//chart is going up
          floatRank = Math.min(startRank,endRank) + Math.abs(startRank-endRank) * (1-dDay);
        }
        else floatRank = Math.min(startRank,endRank) + Math.abs(startRank-endRank) * (dDay);
      }

      return "translate(" + [0, $this.y_scale(floatRank)] + ")";
    }
  }


  function doRow(row) {
    var cell = d3.select(this).selectAll(".cell")
        .data(row.data.map(function(v,i){
          return {value: v, index:i};
        }));

    cell.each(function(d,i){
      d3.select(this).select("text")
          .text(function(){
            if(i==RANK){
              d.value = $this.order.indexOf(row.data[TEAM_ID]);
              return d.value+1;
            }
            else if(i==TEAM_ID){//if team name
              return tables.currentTable.unique_teams[d.value];
            }
            else return d.value != undefined ? d.value : "/";
          });
    });
  }
};

Table.prototype.updateRowContent = function(){
  var $this = this;
//update the nodes
  this.data[this.data_index].forEach(function(d,i){
    //find the corresponding bind data
    for(var n in $this.nodes){
      if($this.nodes[n].data[TEAM_ID] == d[TEAM_ID]){
        $this.nodes[n].data = d;
        break;
      }
    }
  });
};

/*
 action: "sort", "change"
 type: "duration", "delay"
 */
Table.prototype.setAnimation = function(action, type, duration){
  this.animations[action][type] = duration;
};

Table.prototype.setInteractionMode = function(_mode,isInit){
  if(_mode == this.mode) return;
  this.createNoneInteractions();
  this.createDragTableInteraction();
};

Table.prototype.getMinMax = function(teamId,colId){
  var values = this.getValues(teamId,colId);
  return {
    min: d3.min(values),
    max: d3.max(values)
  }
};

Table.prototype.getValues = function(teamId,colId){
  return this.data.map(function(day_data){
    return day_data[teamId][colId];
  });
};
function DragTable(table){
    this.table = table;
}

DragTable.prototype.startDrag = function(c,the_cell){
    var $this = this;

    if(c.index == TEAM_ID) return;

    if(c.index == RANK) {
        c.drag_value = c.currentValidValue = $this.data[$this.table.data_index].length-c.value;
    }
    else {
        c.drag_value = c.currentValidValue = c.value;
    }

    //console.log("dragmove start", c, d3.event, d3.event.translate);
    //d3.select(the_cell).classed("dragged",true);
    c.dx = 0;

    d3.select(the_cell).each(function(d,i){
        $this.cell_col_id = d.index;
        $this.cell_value = d.value;
        d3.select(d3.select(this).node().parentNode).each(function(d2,i2) {
            $this.cell_team_id = d2.data[TEAM_ID];

            var trCell = d3.transform(d3.select(the_cell).attr("transform")).translate;
            var trRow = d3.transform(d3.select(this).attr("transform")).translate;

            var absPos = [trCell[0]+trRow[0]+parseInt(d3.select(the_cell).select(".bkg").attr("width"))/2,
                trCell[1]+trRow[1]+parseInt(d3.select(the_cell).select(".bkg").attr("height"))/2];

            if(drag_type == "horizontal") {

              $this.sliders = {
                  time: new DragSlider({
                      cell: c,
                      snapToTick: true,
                      parentSVG: $this.table.tableGroup,
                      x: absPos[0],
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
                      values: d3.range($this.table.nbDays)
                  })/*,
                  value: new DragSlider({

                  })*/
              };

            } else if(drag_type == "vertical") {

              var minMax = $this.table.getMinMax($this.cell_team_id, c.index)
              var values = d3.range(minMax.min,minMax.max);

              $this.sliders = {
                time: new DragSlider({
                  cell: c,
                  snapToTick: true,
                  parentSVG: $this.table.tableGroup,
                  x: absPos[0],
                  y: absPos[1],
                  width: 300,
                  height: 5,
                  orient: VERTICAL,
                  orientLabels: "left",
                  ticksOver: true,
                  ticksMargin: 1,
                  barHeight: 1,
                  thumbRadius: 5,
                  initValue: $this.table.data[tables.currentTable.current_day][$this.cell_team_id][c.index],
                  values: values
                })
              };

            } else if(drag_type == "drag_horiz") {
              //console.log("here", tables.currentTable.data);
              $this.sliders = {
                  time: new DragCurve({
                      cell: c,
                      snapToTick: true,
                      parentSVG: $this.table.tableGroup,
                      x: absPos[0],
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
                      values: d3.range($this.table.nbDays),
                      data:tables.currentTable.data,
                      rankings:tables.currentTable.rankings,
                      teamID:$this.cell_team_id,
                      colID:c.index,
                      interpolation: curve_params.interpolation,
                      resolution: curve_params.resolution,
                      halo: curve_params.halo,
                      bins: curve_params.bins,
                      slope_graph: curve_params.slope_graph,
                      lines_opacity: curve_params.lines_opacity,
                      table_opacity: curve_params.table_opacity,
                      plateau: curve_params.plateau,
                      multiscale: curve_params.multiscale,
                      scale_height: curve_params.scale_height,
                      provenance: curve_params.provenance,
                      dailyResults: $this.table.dailyResults,
                      nbDays: $this.table.nbDays,
                      nbTeams: $this.table.nbTeams,
                      nbCols: $this.table.column_labels.names.length,
                      minDay: $this.table.minDay,
                      maxDay: $this.table.maxDay,
                      table: $this.table,
                      cell_height: $this.table.rowHeight,
                      lineChartStrokeWidth: curve_params.lineChartWidth
                  })
                };
              
            }

        });
    });
};

DragTable.prototype.moveDrag = function(){
  //if(drag_type == "horizontal") {
    this.sliders.time.dragThumb();
  //}  else if(drag_type == "vertical") {
  //  this.sliders.time.dragThumb();
  //}else if(drag_type == "curve") {
  //  this.sliders.time.dragThumb();
  //}
};
DragTable.prototype.endDrag = function(c,the_cell){
    var $this = this;
    if(c.index == TEAM_ID) return;

    //console.log("dragmove end");

    if(drag_type == "horizontal") {
        //set the new time
       this.sliders.time.endDrag(function(){
         widgets.setValue(this);
         $this.table.changeDay(this);
       });

    } else if(drag_type == "vertical") {
      this.sliders.time.endDrag();
    } else if(drag_type == "drag_horiz") {
       this.sliders.time.endDrag();
    }
   
    //this.sliders.values.remove();

  /*
    d3.select(the_cell).classed("dragged",false);
    d3.select(the_cell).select("text").text(function(){
        if(c.index == TEAM_ID) return $this.unique_teams[c.value];
        else if(c.index == RANK)return c.value+1;
        else return c.value;
    });
    if(c.index == RANK){
        c.drag_value = c.value-1;
    }
    c.drag_value = c.value;

    //if change table
    if(c.currentClosestTable != undefined){
        widgets.setValue(c.currentClosestTable);
        $this.table.changeDay(c.currentClosestTable);
    }

    c.currentClosestTable = undefined;
    c.currentValidValue = undefined;
    $this.closest_table = undefined;
    $this.cell_team_id = undefined;
    $this.cell_col_id = undefined;
    $this.cell_value = undefined;
    $this.cell_min = undefined;
    $this.cell_max = undefined;
    $this.corresponding_tables = [];

    $this.table.tableGroup.selectAll(".row-group .cell text")
        .style("fill",null);
    $this.table.tableGroup.selectAll(".cell .shadow-arrow")
        .transition()
        .delay(1000)
        .duration(500)
        .style("opacity",0);

    //re-color the selected teams
    //$this.table.highlightSelectedTeams();
    */

};


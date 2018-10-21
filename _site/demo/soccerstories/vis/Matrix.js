/* ------------------------------------------------------------------
 * Matrix.js
 * 
 * Romain Vuillemot, INRIA
 * ------------------------------------------------------------------
 */
Matrix = function(sel, _svg, _mid, _posx, _posy) {
  svg = _svg;
  self = this;
  self.mid = _mid;
  self.visType = "Matrix";
  self.create(sel, self.mid, parseInt(_posx), parseInt(_posy));
}

Matrix.prototype.create = function(ret, mid, posX, posY) {

  for(var r in ret) {
    var newX = parseInt(posX)+(parseInt(r)*NODE_SIZE);
    var newY = parseInt(posY)+(parseInt(r)*NODE_SIZE);

    // Move selected nodes into a diagonal
    d3.selectAll(".node").filter(function(d) { 
      if(d.id==parseInt(ret[r])) {
        d.prevX = d.x;
        d.prevY = d.y;
        d.x = newX;
        d.y = newY;
        d.mid = mid;
        return d;
      }
    })
    .transition().duration(500)
    .each("end", function() {  self.draw(self.mid);})
    .attr("x", function(d) { return d.x})
    .attr("y", function(d) { return d.y})
    .attr("data-matrix", function(d) { return "matid_" + d.mid;})  
  }

  var sel = {};
    sel.nodes = data.nodes.filter(function(d, i) {
      for(var r in ret) {
        if(ret[r]==i) {
          d.index = i;
          return d; 
        }
      }
    });

  sel.links = data.links.filter(function(d, i) {
    var is_source=false, is_target=false;

    sel.nodes.forEach(function(dd,ii) {

      if(d.source.index==dd.index)
        is_source=true;

      if(d.target.index==dd.index)
        is_target=true;

    });

    if(is_source && is_target) {
      return d; // TOFIX
    }
  });


  matrix = [],
      nodes = sel.nodes,
      n = nodes.length;

  position = [{ x: posX, y: posY }];

  NODE_SIZE = 10;

  width = n*NODE_SIZE,
      height = n*NODE_SIZE;

  LABEL_SIZE = 120;
  LABEL_OFFSET = 6;

  x = d3.scale.ordinal().rangeBands([0, width]), prev_x = d3.scale.ordinal().rangeBands([0, width]),
      z = d3.scale.linear().domain([0, 4]).clamp(true),
      c = d3.scale.category10().domain(d3.range(10));

  // Compute index per node.
  nodes.forEach(function(node, i) {
    node.idx = i;
    node.count = 0;
    matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
  });

  // Convert links to matrix; count character occurrences.
  sel.links.forEach(function(link) {
    matrix[link.source.idx][link.target.idx].z += link.value;
    matrix[link.target.idx][link.source.idx].z += link.value;
    matrix[link.source.idx][link.source.idx].z += link.value;
    matrix[link.target.idx][link.target.idx].z += link.value;
    nodes[link.source.idx].count += link.value;
    nodes[link.target.idx].count += link.value;
  });

  // Precompute the orders.
  orders = {
    name: d3.range(n).sort(function(a, b) { return d3.ascending(nodes[a].name, nodes[b].name); }),
    count: d3.range(n).sort(function(a, b) { return nodes[b].count - nodes[a].count; }),
    group: d3.range(n).sort(function(a, b) { return nodes[b].group - nodes[a].group; })
  };

  // The default sort order.
  x.domain(orders.name);
  prev_x.domain(orders.name);  

  var g = svg.selectAll("#matid_"+mid)
    .data([{x:position[0].x, y:position[0].y, nodes:nodes}]);

drag = d3.behavior.drag()
  .origin(Object)
  .on("drag", function(d) {
    d.x = d3.event.x;
    d.y = d3.event.y;
        var mid = d3.select(this).node().id.replace("matid_", "");
        // Move underlying nodes
        d3.selectAll(".node[data-matrix='matid_"+mid+"']").each(function(n) {
          n.x += d3.event.dx;
          n.y += d3.event.dy;
          n.mid = parseInt(mid);
          return n;
        });

    self.draw(mid);
  });

  gMatrix = g.enter().append("g").call(drag);

  gMatrix
    .attr("class", "gmatrix")
    .attr("id", "matid_"+mid)
    .attr("opacity", 0)
    .on("click", function() {
      if(d3.event.which==2)
        self.removeMatrix(d3.select(this).attr("id").replace("matid_", ""));
    })
  .transition().duration(2000)
    .attr("opacity", 1);

  var row = gMatrix.selectAll(".row")
      .data(matrix)
    .enter().append("g")
      .attr("class", "row")
      .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
      .each(row);

  row.append("line")
      .attr("x2", width);

  row.append("text")
      .attr("class", "text-row") 
      .attr("x", -LABEL_OFFSET)
      .attr("y", x.rangeBand() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "end")
      .text(function(d, i) { return nodes[i].name; })

  row.append("rect")        
      .attr("class", "rect-label")
      .attr("x", -LABEL_SIZE-LABEL_OFFSET)
      .attr("y", 0)
      .attr("nid", function(d, i) { return nodes[i].id; })
      .attr("width", LABEL_SIZE)
      .attr("height", x.rangeBand())
      .on("mouseover", this.onMouseOverLabel)
      .on("mouseout", this.onMouseOutLabel)
      .call(self.dragLabel());

  var column = g.selectAll(".column")
      .data(matrix)
    .enter().append("g")
      .attr("class", "column")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

  column.append("line")
      .attr("x1", -width);

  column.append("text")
      .attr("class", "text-col") 
      .attr("x", 6)
      .attr("y", x.rangeBand() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "start")
      .text(function(d, i) { return nodes[i].name; });

  column.append("rect")        
    .attr("class", "rect-label")
      .attr("x", LABEL_OFFSET)
      .attr("y", 0)
      .attr("nid", function(d, i) { return nodes[i].id; })
      .attr("width", LABEL_SIZE)
      .attr("height", x.rangeBand())
      .on("mouseover", this.onMouseOverLabel)
      .on("mouseout", this.onMouseOutLabel)
     // .call(this.dragLabel);

  function row(row) {
    var cell = d3.select(this).selectAll(".cell")
        .data(row.filter(function(d) { return d.z; }))
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.rangeBand()-2)
        .attr("height", x.rangeBand()-2)
        .style("fill-opacity", function(d) { return z(d.z); })
        .style("fill", function(d) { return nodes[d.x].group == nodes[d.y].group ? c(nodes[d.x].group) : null; })
        .on("mouseover", function() {
          d3.select(this).style("border-width", "5px")
            .style("border-color", "gray")
            .style("border-style","solid")
            .style("background-color","red"); 
      })
        //.on("mouseover", mouseover)
        //.on("mouseout", mouseout);
  }    



  gMatrix.append("rect")
    .attr("class", "background")
    .attr("x", -2)
    .attr("y", -2)
    .attr("width", width+4)
    .attr("height", height+4)
    .on("mouseover", this.onMouseOverLabel)
    .on("mouseout", this.onMouseOutLabel)
    .on("click", function(d, i) {
      //if(d3.event.which==2)    // middle click
      //  self.removeMatrix(d3.select(this).node().parentNode.id.replace("matid_", ""));
    });


  // Hide in-betwen nodes
  d3.selectAll(".link").filter(function(d) {
     if(d.source.mid != null && d.source.mid == d.target.mid) {
      console.log(d.source.mid, d.target.mid)
    d3.select(this).attr("display", "none");
      return d;
    }
  })
}

Matrix.prototype.removeMatrix = function(mid) { 

  // Re-Display hidden links
  thatNTP.svg.selectAll(".link").filter(function(d) {
     if(d.source.mid != null && d.source.mid == d.target.mid) {
      d3.select(this).attr("display", "block");
      return d;
    }
  });

  // Remove vis id in each node (and eventually back to previous position)
  var mx = d3.select("#matid_"+mid).data()[0];

  d3.selectAll(".node").filter(function(d) {
      if(d.mid!=mid)
        return;

     var nid = d.id;
     d3.selectAll(".node[id='"+nid+"']").attr("data-matrix", null);
    // d.x = d.prevX;
    // d.y = d.prevY;
     d.mid = null;
     NodeLink.prototype.drawNode(nid);
  });

  d3.select("#matid_"+mid)
      .transition().duration(500)
      .style("opacity", 0)
      .remove();
};


Matrix.prototype.draw = function(mid) {


  g = svg.selectAll("g")
    .data([{ x: 0, y: 0 }]);
  
  gEnter = g.enter().append("g")
    .call(drag);

  g.attr("transform", function(d) { return "translate("+d.x+","+d.y+")"; });



  var gm = d3.select("#matid_"+mid);

  gm.attr("transform", function(d,i){
      return "translate(" + [ d.x, d.y ] + ")"
    })

    // Re-Draw each node connected to the matrix
    d3.selectAll(".node[data-matrix='matid_"+mid+"']")
        .each(function(d) {
            var nid =  d3.select(this).attr("id");
            NodeLink.prototype.drawNode(nid);
        });
}

Matrix.prototype.drag = function(e) {

    var drag = d3.behavior.drag()
      .origin(Object)
      .on("drag", function(d) {

        //var dd = d3.select(this).node().parentNode.__data__;
        var dx = d3.event.dx;
        var dy = d3.event.dy;
        var mid = d3.select(this).node().parentNode.id.replace("matid_", "");
        var dd = d3.select(this).node().parentNode.__data__;

      //  var tmpx = dd.x+d3.event.dx;
        dd = d3.event.x;
        dd = d3.event.y;


    // Re-Draw each node connected to the matrix
    d3.selectAll(".node[data-matrix='matid_"+mid+"']")
        .each(function(d) {
            var nid =  d3.select(this).attr("id");
            NodeLink.prototype.drawNode(nid);
        });

        // Move underlying nodes
        d3.selectAll(".node[data-matrix='matid_"+mid+"']").each(function(n) {
          n.x += dx;
          n.y += dy;
          n.mid = parseInt(mid);
          return n;
        });

     //   console.log("ADDING DRAG", dd.x, dd.y, mid)
       // self.draw(mid);
     });  
  return drag;
}

Matrix.prototype.dragLabel = function() {
    console.log("DRAGLABEL")
  var dragLabel = d3.behavior.drag()
      .origin(Object)
      .on("dragstart", function(d) {
        console.log("start", d3.event.sourceEvent)
          layerHulls.append("rect")
            .data(d3.select(this).node().__data__)
            .attr("class", "rect-label")
              .style("stroke", "gray")
            .attr("x",  d3.event.sourceEvent.layerX)
            .attr("y",  d3.event.sourceEvent.layerY)
            .attr("id", "dragrect")
            .attr("width", LABEL_SIZE)
            .attr("height", x.rangeBand());

      })
      .on("dragend", function(d) {
         d3.selectAll("#dragrect").remove();
          var nid = d3.select(this).attr("nid");
          var newSel = [];

         var nds = d3.select("#matid_1").node().__data__.nodes;

          for(var n=0; n<nds.length; n++) {
              if(nds[n].id!=nid) {
                  newSel.push(nds[n].id)
              }
          }
          self.removeMatrix(1);
          var mx = new Matrix(newSel, thatNTP.svg, 2, 200, 200);
          console.log("newsel ", newSel)
      })
      .on("drag", function(d) {

        d3.selectAll("#dragrect")
            .attr("x",  d3.event.sourceEvent.layerX)
            .attr("y",  d3.event.sourceEvent.layerY)

        var mid = d3.select(this).node().parentNode.parentNode.id.replace("matid_", "");
        console.log("draglabel", d, mid)
       //TODO
        var dm = d3.select(this).node().parentNode.parentNode.__data__;
        var nid = d3.select(this).attr("nid");

          console.log("is dragging: ", d3.select(this).attr("nid"))
          /*
      // Remove the current matrix
      self.removeMatrix(mid);

      // Move the node to the current mouse position

      // Remove the node from the matrix selection

      console.log("REMOVE Node", nid, data.nodes, newSel)
      // Create new matrix at previous position
      //var mx = new Matrix(newSel, thatNTP.svg, dm.id, dm.x, dm.y);
      d3.select(".node[id='"+nid+"']").attr("x", d3.event.x);
      d3.select(".node[id='"+nid+"']").attr("y", d3.event.y);
    // TODO: drag
    // if drag d.x > 5 then remove the node from the matrix

*/
    // Remove drag from preivous noe

   });  
  return dragLabel;
}

Matrix.prototype.onMouseOverLabel = function(d) {
         d3.select(this)
          .style("fill", "red")
          .style("fill-opacity", 0)
          .style("stroke", "gray");
}

Matrix.prototype.onMouseOutLabel = function(d) {
         d3.select(this)
          .style("fill", "white")
          .style("fill-opacity", 0)
          .style("stroke", "white");
}

Matrix.prototype.drawNode = function(d) {
  var src = {};

  if(d.target.y<d.source.y) { // bottom
     src.target_x = d.target.x+NODE_SIZE/2;
     src.target_y = d.target.y;//+NODE_SIZE*5+parseInt(d3.selectAll("#matid_"+d.source.mid).select(".background").attr("height"));
     src.target_x_pivot =  src.target_x;
     src.target_y_pivot =  src.target_y+NODE_SIZE*5;
  } else { // top
     src.target_x = d.target.x+NODE_SIZE/2;
     src.target_y = d.target.y;
     src.target_x_pivot =  src.target_x;
     src.target_y_pivot = d.target.y-LABEL_SIZE;
  }

  if(d.source.y<d.target.y) { // bottom
    src.source_x = d.source.x+NODE_SIZE/2;
    src.source_y = d.source.y;//+NODE_SIZE*5+parseInt(d3.selectAll("#matid_"+d.source.mid).select(".background").attr("height"));
    src.source_x_pivot = src.source_x;
    src.source_y_pivot = src.source_y+NODE_SIZE*5;
  } else { // top
    src.source_x = d.source.x+NODE_SIZE/2;
    src.source_y = d.source.y;
    src.source_x_pivot = src.source_x;
    src.source_y_pivot = d.source.y-LABEL_SIZE;
  }
  return src;
}

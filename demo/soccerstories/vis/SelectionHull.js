var SelectionHull = function(size) {
  this.queriesHulls = new Array(size);
  this.visType = "SelectionHull";
  thatSH = this;
  return this;
};

SelectionHull.prototype.removeHull = function(vid) {

  // Re-Display hidden links
  thatNTP.svg.selectAll(".link").filter(function(d) {
      if(d.source.mid != null && d.source.mid == d.target.mid) {
          d3.select(this).attr("display", "block");
          return d;
      }
  });

  d3.selectAll(".node").filter(function(d) {
      if(d.mid!=vid)
          return;

      var nid = d.id;
      d3.selectAll(".node[id='"+nid+"']").attr("data-matrix", null);
      d.vid = null;
      NodeLink.prototype.drawNode(nid);
  });

  d3.select("#hulls-"+vid)
      .transition().duration(500)
      .style("opacity", 0)
      .remove();

};

// COnstructs a query hull from SVG group which have an object with id
SelectionHull.prototype.constructQueryHull = function(q, pts) {
    if(pts.length==0)
        return;

    var ptsA = new Array();

    for(var p=0; p<pts.length; p++) {
        var the_obj = d3.select("svg").select("[id='"+pts[p]+"']");
        var tx=null,
            ty=null;
        //if a translate, get it
        var tr = d3.transform(the_obj.attr("transform"));
        if(tr.translate instanceof Array){
            tx = tr.translate[0];
            ty = tr.translate[1];
        }

        //if x and y attributes
        var x = the_obj.attr("x");
        var y = the_obj.attr("y");
        //if a circle (cx and cy attributes)
        if(x==null) {
            x = the_obj.attr("cx");
            y = the_obj.attr("cy");
        }

        if(tx==null && ty==null && x==null && y==null) throw "unknown svg element: "+the_obj;

        //get the bounding box of the element
        var bbox = the_obj.node().getBBox();

        if(tx!=null && x!=null) tx = parseFloat(tx)+parseFloat(x)+bbox.width/2;
        if(ty!=null && y!=null) ty = parseFloat(ty)+parseFloat(y)+bbox.height/2;
        if(tx==null) tx = parseFloat(x);
        if(ty==null) ty = parseFloat(y);

        ptsA.push([tx, ty]);
        //TODO - handle the +dx, depending on the size of the elements
        //ptsA.push([parseInt(d3.select("svg").select("[id='"+pts[p]+"']").attr("x"))+5, parseInt(d3.select("svg").select("[id='"+pts[p]+"']").attr("y"))+5]);
    }

    //if 2 pts, add 2 middle points
    insertIntermediatePoints(ptsA);

    // We only want external points, not inner
    //cv = getConvexHullD3(pts);

    // If the Hull does not exist, we create it
    if(!this.queriesHulls[q]) {
      
      drag = d3.behavior.drag()
        .origin(Object)
        .on("drag", function(d) {
            //d.x += d3.event.dx;
            //d.y += d3.event.dy;

            var vid =d3.select(this).node().id.replace("hulls-", "");
            // Move underlying nodes
            d3.selectAll(".node[data-matrix='matid_"+vid+"']").each(function(n) {
                n.x += d3.event.dx;
                n.y += d3.event.dy;
                n.mid = parseInt(vid);
                NodeLink.prototype.drawNode(d3.select(this).attr("id"));
            });

            if(nd.vm.visList[vid-1].visType == "SelectionHull") {
              nd.vm.visList[vid-1].update();
            }
           // d3.select("#hulls-"+q).attr("transform", function(d) { return "translate("+d3.event.x+","+d3.event.y+")"; });
            // self.draw(mid);
        });

        this.queriesHulls[q] = layerHulls.append("g")
            .data([{ x: 0, y: 0 }])
            .attr("id", "hulls-"+q)
            .call(drag)
            .append("svg:path")
            .attr("class", "hulls")
            .attr("rx", 10)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("query", q)

        d3.select("#hulls-"+q).on("click", function(d) {
            if(d3.event.which==2)
                thatSH.removeHull(d3.select(this).attr("id").replace("hulls-", ""));
        });
    }

    return d3.geom.hull(ptsA);
//    return drawLineXY(ppp);
};

SelectionHull.prototype.setAttribute = function(attr, value){
  thatSH.queriesHulls[this.vid]
    .attr(attr, value);
};

SelectionHull.prototype.create = function(vid, pts) {
  if(pts.length==0)
      return;
    
  thatSH.vid = vid;
  thatSH.pts = pts;
  this.pts = pts;

  // Set the vis id to the points
  for(var r in pts) {
      // Move selected nodes into a diagonal
      d3.selectAll(".node").filter(function(d) {
          if(d.id==parseInt(pts[r])) {
              return d;
          }
      })
      .transition().duration(500)
      .attr("data-matrix", function(d) { return "matid_" + vid;})
  }

  var cq = this.constructQueryHull(vid, pts);
  // Allow lasso drawing over hulls
  // this.queriesHulls[vid].attr("d", drawCluster(cq));//.on("mousedown", mousedown);

    var cq = this.constructQueryHull(vid, pts);
    // Allow lasso drawing over hulls
    //this.queriesHulls[vid].attr("d", drawCluster(cq));//.on("mousedown", mousedown);

    //console.log("OTS", cq)
    this.queriesHulls[vid].attr("d", drawCluster(cq));
};

// We already know where are the points
SelectionHull.prototype.update = function() {

    console.log("UPDATE", this.pts, this.vid, this.queriesHulls[this.vid])
    this.queriesHulls[this.vid].attr("d", drawCluster(d3.geom.hull(getConvexHullD3(this.pts))));
};

SelectionHull.prototype.setToPts = function(pts,duration,callback){
    if(pts.length==0)
        return;

    // We only want external points, not inner
    //cv = getConvexHullD3(pts);
    var d = drawCluster(d3.geom.hull(pts));//drawLineXY(ppp);

    if(!duration)
        this.queriesHulls[this.vid].attr("d", d);
    else
        this.queriesHulls[this.vid]
            .transition()
            .duration(duration)
            .attr("d", d)
            .each("end", function(){callback.call()});
};


SelectionHull.prototype.animateWithNodesTransition = function(duration, callback){
    //console.log("animateWithNodesTransition",this.pts)
    if(this.pts.length==0)
        return;

    var ptsA = new Array();

    for(var p=0; p<this.pts.length; p++) {
        var the_obj = d3.select("svg").select("[id='"+this.pts[p]+"']");

        //get the future translate attribute of the node being animated
        var newTr = the_obj.datum().transform;
        //get the bounding box of the element
        var bbox = the_obj.node().getBBox();

        if(newTr==null){
            throw "newTr is null !! for" + JSON.stringify(the_obj);
        }

        ptsA.push([newTr.translate[0], newTr.translate[1]]);
    }

    insertIntermediatePoints(ptsA);


    var d = drawCluster(ptsA);//drawLineXY(ppp);

    //and apply the new data to the hull
    this.queriesHulls[this.vid]
            .transition()
            .duration(duration)
            .attr("d", d)
            .each("end", function(){callback.call()});

};

SelectionHull.prototype.setOpacity = function(opacity,duration,callback){
    if(duration == null) duration = 0;

    this.queriesHulls[this.vid]
        .transition()
        .duration(duration)
        .style("opacity",opacity)
        .each("end",function(){callback.call()});
};

var curve = d3.svg.line()
    .interpolate("cardinal-closed")
    .tension(.85);

function drawCluster(d) {
  return curve(d); // 0.8
}

function getConvexHullD3(pts) {
  // New Hull
  var hull_pts = [];

  for(var p=0; p<pts.length; p++) {
      var the_obj = d3.select("svg").select("[id='"+pts[p]+"']");
      hull_pts.push([parseInt(the_obj.attr("x"))+10, parseInt(the_obj.attr("y"))+10])
   }

    insertIntermediatePoints(hull_pts);

     return hull_pts;
}

function insertIntermediatePoints(pts){
    //if 2 pts, add 2 middle points
    if(pts.length == 2){
        var x = d3.mean(pts, function(d){return d[0]});
        var y = d3.mean(pts, function(d){return d[1]});
        pts.splice(1,0,[x+1,y+1],[x-1,y-1]);
    }
}
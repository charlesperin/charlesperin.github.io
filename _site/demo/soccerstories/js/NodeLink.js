NodeLink = function(data, svg) {
  var width = 960,
      height = 500;

  var color = d3.scale.category20();

  var force = d3.layout.force()
      .charge(-240)
      .linkDistance(40)
      .size([width, height]);

	var n = 0;// data.nodes.length;

	force.nodes(data.nodes).links(data.links);


	// Initialize the positions deterministically, for better results.
	data.nodes.forEach(function(d, i) { d.x = d.y = width / n * i; });

	// Run the layout a fixed number of times.
	// The ideal number of times scales with graph complexity.
	// Of course, don't run too long—you'll hang the page!
	force.start();
	for (var i = n; i > 0; --i) force.tick();
	force.stop();
/*
	// Center the nodes in the middle.
	var ox = 0, oy = 0;
	data.nodes.forEach(function(d) { ox += d.x, oy += d.y; });
	ox = ox / n - width / 2, oy = oy / n - height / 2;
     data.nodes.forEach(function(d) { d.x -= ox, d.y -= oy; });
	*/
	data.nodes.forEach(function(d,i) {
        d.x = d.geo.x;
        d.y = d.geo.y;
    });

	var line = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
   	.interpolate("basis");

	var link = svg.selectAll(".link")
	  .data(data.links)
	  .enter()
	  .append("path")
	  .attr("class", "link")
	  .attr("d", function(d,i) { 
        // Intermediate nodes must be defined
	  		return line([
          {x:d.source.x+NODE_SIZE/2, y:d.source.y+NODE_SIZE/2}, {x:d.source.x+NODE_SIZE/2, y:d.source.y+NODE_SIZE/2},
          {x:d.target.x+NODE_SIZE/2, y:d.target.y+NODE_SIZE/2}, {x:d.target.x+NODE_SIZE/2, y:d.target.y+NODE_SIZE/2}]);
	  	}
	  );

	selfNL = this;

	var drag = d3.behavior.drag()
	  .origin(Object)
	  .on("drag", selfNL.dragmove)
		.on("dragend", function() {

      // TODO: CHECK IF OVER A VIS OR NOT

      for(var i=0; i<nd.vm.visList.length; i++) {
     //   console.log("AAAAtesting matrix ", i)

      }

		   d3.selectAll(".background")
            .style("stroke", "none");
		})
	  
	var node = svg.selectAll(".node")
	    .data(data.nodes)
	  .enter().append("rect")
	    .attr("class", "node")
	    .attr("id", function(d) { return d.index; })
	    .attr("x", function(d) { return d.x; })
	    .attr("y", function(d) { return d.y; })
	    .attr("width", NODE_SIZE)
	    .attr("height", NODE_SIZE)
	    .style("fill", function(d) { return color(d.group); })
	    .on("mouseover", function() {
      	d3.select(this).append("text")
          .text(function(d) {return d.x;})
          .attr("x", function(d) {return d.x+20;})
          .attr("y", function (d) {return d.y;}); })
	    .style("color", "black")
	   .call(drag);

	 node.append("title")
	  .text(function(d) { return d.name; });

}

NodeLink.prototype.init = function(d) {

}

NodeLink.prototype.dragmove = function(d) {

  var cur_id = d3.select(this).attr("id");

	d3.selectAll(".background").style("stroke", "none");

  var dx = d3.event.dx;
  var dy = d3.event.dy;
  //var mid = d3.select(this).node().parentNode.id.replace("matid_", "");

  // Update currently selected node position
  d3.select(this).filter(function(d) {
    d.x += dx;
    d.y += dy;
    return d;
  })

  var currX = parseInt(d3.select(this).attr("x"));
  var currY = parseInt(d3.select(this).attr("y"));

  // Check if belongs to a visualization and then Selection Hulls
  // TODO: use some internal ticking instead
  if(d3.select(this).attr("data-matrix") != null) {
    var vid = d3.select(this).attr("data-matrix").replace("matid_", '');
    if(nd.vm.visList[vid-1].visType == "SelectionHull") {
      nd.vm.visList[vid-1].update();
    }
    //nd.vm.visList[d.source.mid-1].dragNode(d);
  }

  selfNL.drawNode(cur_id);

  d3.selectAll(".gmatrix")
  	.each(function(d, i) {
  		var mid_data = d3.select(this).data()[0], 
  		mid_width = parseInt(d3.select(this).select(".background").attr("width")), 
  		mid_height = parseInt(d3.select(this).select(".background").attr("height"));

  		if(currX > mid_data.x && currX < (mid_data.x+mid_width) && currY > mid_data.y && currY < (mid_data.y+mid_height)) {
				d3.select(this).select(".background")
        	.style("stroke", "gray");
  		}

  	})
}

NodeLink.prototype.drawNode = function(nid, duration, delay) {
	
  if(duration==null)
    duration = 0;

  if(delay==null)
    delay = 0;

	var line = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
   	.interpolate("basis");

  d3.selectAll(".node").filter(function(d) { 
      if(d.id==parseInt(nid))
      	return d;
   }) 
  .transition().duration(duration).delay(delay)
  .attr("x", function(d) { return d.x})
  .attr("y", function(d) { return d.y})

	//var currX = parseInt(d3.select(".node[id='"+nid+"']").attr("x"));
	//var currY = parseInt(d3.select(".node[id='"+nid+"']").attr("y"));
/*
 d3.selectAll(".link").filter(function(d) {
   if(d.target.index==nid) {
   		return d;
   	}
  }).attr("d", function(d,i) { 
  	if(d.target.mid!=null) {

      return line([{x:d.source.x, y:d.source.y}, 
                   {x:d.target.x+NODE_SIZE/2, y:d.target.y-LABEL_SIZE}, 
                   {x:d.target.x+NODE_SIZE/2, y:d.target.y}]);
  	} else {
	  	return line([{x:d.source.x+NODE_SIZE/2, y:d.source.y+NODE_SIZE/2}, 
	  							 {x:d.target.x+NODE_SIZE/2, y:d.target.y+NODE_SIZE/2}]);
	  }
  });
*/
 d3.selectAll(".link").filter(function(d) {
   if(d.source.index==nid || d.target.index==nid) {
   		return d;
   	}
  })
  .transition().duration(duration)
  .attr("d", function(d,i) { 

    // DEFAULT NODE DRAWING: STRAIGHT LINES
    var source_x=d.source.x+NODE_SIZE/2, source_y=d.source.y+NODE_SIZE/2, source_x_pivot=source_x, source_y_pivot=source_y;
    var target_x=d.target.x+NODE_SIZE/2, target_y=d.target.y+NODE_SIZE/2, target_x_pivot=target_x, target_y_pivot=target_y;

    // NODE DRAWING STRATEGIES

    // Node to be handled by a visualization
  	if(d.source.mid!=null) {
     if(nd.vm.visList[d.source.mid-1].visType == "Matrix") {
        var src = nd.vm.visList[d.source.mid-1].drawNode(d);
        source_x = src.source_x;
        source_y = src.source_y;
        source_x_pivot = src.source_x_pivot;
        source_y_pivot = src.source_y_pivot;
      }
  	}

  	if(d.target.mid!=null) {
     if(nd.vm.visList[d.target.mid-1].visType == "Matrix") {
        var src = nd.vm.visList[d.target.mid-1].drawNode(d);
        target_x = src.target_x;
        target_y = src.target_y;
        target_x_pivot = src.target_x_pivot;
        target_y_pivot = src.target_y_pivot;
      }
  	}
		return line([{x:source_x, y:source_y}, 
                {x:source_x_pivot, y:source_y_pivot}, 
                {x:target_x_pivot, y:target_y_pivot}, 
							 {x:target_x, y:target_y}]);
  });
}
ChainedVisPanel = function(_nd, title, _data) {
  WINDOW_WIDTH = 750;//window.innerWidth;
  WINDOW_HEIGHT = 750;//window.innerHeight;
  NODE_SIZE = 10;
  LABEL_SIZE = 20;

  // TODO: set as default values 
  SELECTION_TYPE="lasso";
  LASSO_COLOR="red";
  MATRIX_LABELS_SIZE=50;

  data = _data;
  thatNTP = this;
  this.init();
  nd=_nd;
  svg = null;
}

ChainedVisPanel.prototype.init = function() {

  path = null;
  hasMouseMoved = false;

  //Overview panel
  this.svg = d3.select("#nodetrix-container")
    .append("svg:svg")
      .attr("width", this.WINDOW_WIDTH)
      .attr("height", this.WINDOW_HEIGHT)

  // Append here to prevent lasso to mess up with other selections
  d3.select("svg")
    .append("rect")
    .attr("width", WINDOW_WIDTH)
    .attr("height", WINDOW_HEIGHT)
    .attr("fill", "red")
    .attr("opacity", 0)
    .on("mousedown", this.mousedown)
    .on("mousemove", this.mousemove);

  // Make sure anywhere the lasso is up closes the selection
  d3.select("svg")
    .on("mouseup", this.mouseup);      

	layerHulls = this.svg.append("g"); 

  nl = new NodeLink(data, this.svg);
}

ChainedVisPanel.prototype.mousedown = function(d) {

  var cur_mouse = d3.mouse(this);

  if(SELECTION_TYPE=="lasso") {
    path = layerHulls.append("svg:path");
    lasso = new Lasso(new Point2D(cur_mouse[0], cur_mouse[1]));
  }
  
  d3.event.preventDefault();
  hasMouseMoved = false;
}

ChainedVisPanel.prototype.mousemove = function(d) {

  hasMouseMoved = true;

  if(SELECTION_TYPE=="lasso") { 
  
    if (!path) return;

    x12 = d3.mouse(path.node());
    var d3line2 = d3.svg.line()
                      .x(function(d){return d.x;})
                      .y(function(d){return d.y;});//.interpolate("linear");      
   
    var origin = [];
   
    origin[0] = lasso.GetOrigin();
    pathPoints = lasso.drag(new Point2D(x12[0], x12[1])); 
    
    if(pathPoints.length>0) {
      var pts =pathPoints;
                         
      path.attr("d", d3line2(pts)).attr("class", "lasso")
        .style("stroke", LASSO_COLOR)
        .style("fill", LASSO_COLOR);
 
    }
  }
}

ChainedVisPanel.prototype.mouseup = function(d) {
  
  var cur_mouse = d3.mouse(this);

  if(SELECTION_TYPE=="lasso") {  
  
    if (!path) return;
    
    path.remove();
    path = null;

    var pathPoints = lasso.drag(null);

    // Retrieve the selected points
    var px = [], py = [];
    for(var p in pathPoints) {
      px.push(pathPoints[p].x);
      py.push(pathPoints[p].y);
    }

    // compute vis id
   

    // Convert points into corresponding nodes
    var sel = Array();
    thatNTP.svg.selectAll(".node")
      .filter(function(d) {
        if((lasso.pointInPolygon(pathPoints.length, px, py, 
                                d3.select(this).attr("x"), d3.select(this).attr("y"))>0)) { 
                                  // Skipe nodes already in a matrix
                                  if(!(d3.select(this).attr("data-matrix")!=null))
                                    sel.push(parseInt(d3.select(this).attr("id")));
                                }
        });

    //1 RECUPERER LES NOEUDS sel: selected nodes (Array of node ids) [23, 24, ..]

    var dropdown_vis = d3.select("#select-visualization");
    var dropdown_layout = d3.select("#select-layout");

    var selected_vis = dropdown_vis.node().options[dropdown_vis.node().selectedIndex].value;
    selected_vis = selected_vis.length>0 ? selected_vis : "ConvexHull";

    var selected_layout = dropdown_layout.node().options[dropdown_layout.node().selectedIndex].value;
    selected_layout = selected_layout.length>0 ? selected_layout : "OriginalLayout";

    var vid = nd.vm.visList.length+1;

    if(selected_vis=="ConvexHull") {

      var sh = new SelectionHull(1);
      sh.create(vid, sel);
      nd.vm.visList.push(sh);

      if(selected_layout=="CircleLayout") {

        var sv = new StarVis();
        sv.create(vid, sel);

      } else if(selected_layout=="DiagLayout") {

        var dl = new DiagLayout();
        dl.create(vid, sel);

      } 

    } else if(selected_vis=="Matrix") {

      var mx = new Matrix(sel, thatNTP.svg, vid, cur_mouse[0], cur_mouse[1]);
      nd.vm.visList.push(mx);

    } else if(selected_vis=="GoogleMap") {

      var gm = new GoogleMap();
      gm.create(vid, sel);
      nd.vm.visList.push(gm);

    } else if(selected_vis=="AlignVis") {

      var av = new AlignVis();
      av.create(vid, sel);
      nd.vm.visList.push(av);

    }



  }
}
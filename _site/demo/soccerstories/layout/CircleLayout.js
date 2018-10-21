var StarVis = function() {
    this.visType = "AlignVis";
    this.NODE_INTERVAL = 10;

    twopi  = Math.PI * 2,
    halfpi = Math.PI / 2;
}

StarVis.prototype.createPoints = function(n) {
  var data = [];
  var radius = 50;
  for (var i = 0; i < n; i++) {
    // convert negative coordintes to positive by adding the radius
    var x = radius + (radius * Math.cos((i * twopi) / n)),
        y = radius + (radius * Math.sin((i * twopi) / n));
    data.push([x, y]);
  }
  return data;
}

StarVis.prototype.create = function(vid, pts, center_x, center_y) {
    if(pts.length==0)
        return;

    if(typeof center_x=="undefined")
        center_x = 500*Math.random();

    if(typeof center_y=="undefined")
        center_y = 500*Math.random();;


    // Compute some infos on the sequence
    var min_id = d3.min(pts);
    var max_id = d3.max(pts);
    var nb_nodes = pts.length;
    var positions = this.createPoints(nb_nodes);

    for(var i=0; i<pts.length; i++) {

      var nid = pts[i];

      d3.select(".node[id='"+nid+"']").node().__data__.x = positions[i][0]+center_x;
      d3.select(".node[id='"+nid+"']").node().__data__.y = positions[i][1]+center_y;

      NodeLink.prototype.drawNode(nid, 500, i*50);

    }

};

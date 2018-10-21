var LineLayout = function() {
    this.visType = "AlignVis";
    NODE_INTERVAL = 20;
}

LineLayout.prototype.create = function(vid, pts, group) {
    if(pts.length==0)
        return;

    var min_id = d3.min(pts);
    var max_id = d3.max(pts);
    var nb_nodes = pts.length;
    //var slope = parseFloat(d3.selectAll(".node[id='"+max_id+"']").attr("y"))-parseFloat(d3.selectAll(".node[id='"+min_id+"']").attr("y"))/parseFloat(d3.selectAll(".node[id='"+max_id+"']").attr("x"))-parseFloat(d3.selectAll(".node[id='"+min_id+"']").attr("x"));
    //var b = parseFloat(d3.selectAll(".node[id='"+min_id+"']").attr("y")) - parseFloat(d3.selectAll(".node[id='"+min_id+"']").attr("x")) * slope;

    // align on a line starting at entry and ending at exit

 // TODO http://bl.ocks.org/mbostock/705856

    for(var i=0; i<pts.length; i++) {

      var nid = pts[i];
      var align_x = i*NODE_INTERVAL;
      var align_y = group*NODE_INTERVAL;

      // Interesting but needs stages
      // d3.select(".node[id='"+nid+"']").node().__data__.x = align_x;
      // d3.select(".node[id='"+nid+"']").node().__data__.y = parseFloat(d3.select(".node[id='"+min_id+"']").attr("y"));

      d3.select(".node[id='"+nid+"']").node().__data__.x = align_x;
      d3.select(".node[id='"+nid+"']").node().__data__.y = align_y;


      NodeLink.prototype.drawNode(nid, 500);



    }
};

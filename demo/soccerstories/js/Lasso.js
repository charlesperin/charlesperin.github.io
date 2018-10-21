/* ------------------------------------------------------------------
 * Lasso.js
 * 
 * Romain Vuillemot, INRIA
 * ------------------------------------------------------------------
 */
Lasso = function(pos) {
  MIN_POINT_DISTANCE = 10.0;
  points = [];
  points.push(pos);
}
  
Lasso.prototype.drag = function(pos) {
  if(pos==null)
    return points;
  lastPos = points[points.length - 1];
  if (this.Points2Ddistance(lastPos, pos) >= MIN_POINT_DISTANCE) {
    points.push(pos);
    return points;
  } else {
    return [];
  }
}
  
Lasso.prototype.Points2Ddistance = function(pt1, pt2) {
  var px = pt1.x - pt2.x;
  var py = pt1.y - pt2.y;
  return Math.sqrt(px * px + py * py);
}

Lasso.prototype.GetOrigin = function() {
  return points[0];
}

Lasso.prototype.draw = function() {

}

Lasso.prototype.pointInPolygon = function(polySides, polyX, polyY, x, y) {

  var i, j=polySides-1 ;
  var  oddNodes=false;

  for (i=0; i<polySides; i++) {
    if ((polyY[i]< y && polyY[j]>=y
    ||   polyY[j]< y && polyY[i]>=y)
    &&  (polyX[i]<=x || polyX[j]<=x)) {
      oddNodes^=(polyX[i]+(y-polyY[i])/(polyY[j]-polyY[i])*(polyX[j]-polyX[i])<x); }
    j=i; }

  return oddNodes; 
}
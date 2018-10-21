function BaseSelection(name, color, size) {
  this.rowSet = new BitSet(size);
  this.name = name;
  this.color = color;
  this.enabled = true;
  this.clear();
}

BaseSelection.prototype.clear = function() {
  this.rowSet.clear();
}

BaseSelection.prototype.getName = function() {
  return this.name;
}

BaseSelection.prototype.setName = function(name) {
  this.name = name;
}

BaseSelection.prototype.getColor = function() {
  return this.color;
}

BaseSelection.prototype.setColor = function(color) {
  this.color = color;
}

BaseSelection.prototype.isEmpty = function() {
  return this.rowSet.isEmpty();
}

BaseSelection.prototype.draw = function(p1, p2, dirX, dirY, scale) { // Depends on selection type

}

BaseSelection.prototype.intersect = function(rows) {
  // Create the intersection of rows
  if (this.rowSet.isEmpty()) {
      this.rowSet.or(rows);
  } else {
      this.rowSet.and(rows);
  }
}

BaseSelection.prototype.union = function(rows) {	
  // Create the union of rows
  rowSet.or(rows);
}
    
BaseSelection.prototype.substract = function(rows) {
  this.rowSet.andNot(rows);
  //setChanged();
  //notifyObservers();
}

BaseSelection.prototype.size = function() {
  return this.rowSet.cardinality();
}

BaseSelection.prototype.equals = function(o) {
  if (o instanceof BaseSelection) {
      var bs = o;
      return this.rowSet.equals(bs.rowSet);
    }
    return false;
  }
    
BaseSelection.prototype.isEnabled = function(rows) {
  return this.enabled;
}

BaseSelection.prototype.setEnable = function(enabled) {
  this.enabled = enabled; 
}

BaseSelection.prototype.setAlpha = function(alpha) {
  if (this.alpha != CURRENT_SELECTION_ALPHA && alpha == CURRENT_SELECTION_ALPHA) {
      pulsingAlpha.start(SELECTION_ALPHA, CURRENT_SELECTION_ALPHA, PULSATION_TIME / 4);
    }
  this.alpha = alpha;
}

BaseSelection.prototype.pulseAlpha = function(rows) {
}
    
BaseSelection.prototype.getAlpha = function() {
}

BaseSelection.prototype.getRows = function() {
  return this.rowSet;
}
    
BaseSelection.prototype.isSelected = function(row) {
      if (this.rowSet == null) return false;
      return this.rowSet.get(row);
  }
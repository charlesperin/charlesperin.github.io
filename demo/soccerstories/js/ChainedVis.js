// ChainedVis main application class
ChainedVis = function(_name, _data) {
//  this.panel = {};
  this.vm = new VisManager();

  // Create the visualization canvas 
  this.panel = new ChainedVisPanel(this, _name, _data);

  return this;
}
  
ChainedVis.prototype.run = function() {

}


// TODO: implement vertical slider
var VERTICAL = 0,
  HORIZONTAL = 1;

function DragSlider(params){
  this.snapToTick = params.snapToTick;
  this.parentSVG = params.parentSVG;
  this.margins = params.margins;
  this.width = params.width;
  this.height = params.height;
  this.values = params.values;
  this.min = params.min || d3.min(this.values);
  this.max = params.max || d3.max(this.values);
  this.x = params.x;
  this.y = params.y;
  this.cell = params.cell;
  this.orient = params.orient;
  this.ticksOver = params.ticksOver;
  this.ticksMargin = params.ticksMargin;
  this.barHeight = params.barHeight;
  this.thumbRadius = params.thumbRadius;
  this.listeners = [];
  this.orientLabels = params.orientLabels;
  this.value = params.initValue;


  //console.log(this.values)
  this.create();
}

DragSlider.prototype.create = function(){
  var tickHeight = this.ticksOver ? this.barHeight + this.ticksMargin : this.ticksMargin;

  var $this = this;

  this.axis_scale = d3.scale.ordinal().domain(this.values).rangePoints([0,this.width]);
  this.slider_scale_inverse = d3.scale.linear().domain([0,this.width]).range([this.min,this.max]);

  // When creating the slider, adjusting according to current value
  this.sliderGroup = this.parentSVG.selectAll(".slider-group")
    .data([{value: this.value, dx:0}])
    .enter()
    .append("g")
    .attr('class', 'slider-group')
    .attr('transform', 'translate(' + ($this.orient == HORIZONTAL ? [this.x - ($this.axis_scale($this.value)), this.y] : [this.x, this.y - ($this.axis_scale($this.value))]) + ')');

  var sliderAxis = d3.svg.axis()
    .scale(this.axis_scale)
    .orient(this.orientLabels)
    .tickSize(tickHeight,0,tickHeight+this.ticksMargin)
    .tickValues(this.values);

  this.sliderGroup.append("g")
    .attr("class", "slider-axis-thmb")
    .attr("width", this.width)
    .append("g")
    .call(sliderAxis);

  //---------------------------------------------------------------//
  //--------------------------The thumb----------------------------//
  //---------------------------------------------------------------//
  this.thumbGroup = this.sliderGroup.append("g")
    .attr("class","slider-thumb")
    .attr("transform", function(d){return "translate("+($this.orient==HORIZONTAL ? [$this.axis_scale(d.value), 0] : [0,$this.axis_scale(d.value)])+")"});

  this.thumbGroup.append("circle")
    .attr("r",this.thumbRadius)
    .attr("cx",this.thumbHeight);
};


DragSlider.prototype.dragThumb = function() {
  var $this = this;
  this.cell.dx += this.orient == HORIZONTAL ? d3.event.dx : d3.event.dy;

  this.sliderGroup.select(".slider-axis-thmb")
    .each(function(d){
      var mouseX = d3.mouse(this)[0];
      d3.selectAll(".slider-axis-thmb").attr("transform", function(){
        return "translate("+($this.orient == HORIZONTAL ? [-$this.cell.dx, 0] : [0,-$this.cell.dx])+")";
      });
    });
};

DragSlider.prototype.endDrag = function(callback){
  var $this = this;
  var newVal = Math.round($this.value+$this.slider_scale_inverse($this.cell.dx));
  if($this.min < 0) newVal -= $this.min;
  if(newVal < $this.min) newVal = $this.min;
  if(newVal > $this.max) newVal = $this.max;
  this.remove();

  console.log("change from ",$this.value+" to "+newVal);
  if(callback)callback.call(newVal);
};

DragSlider.prototype.remove = function(){
  this.sliderGroup.remove();
};

DragSlider.prototype.addListener = function(listener){
  if(this.listeners.indexOf(listener) == -1) this.listeners.push(listener);
};

DragSlider.prototype.fireEvent = function(event){
  var $this = this;
  console.log("fire event ",event);
  this.listeners.forEach(function(listener){
    listener.sliderChanged(event, $this.value);
  });
};
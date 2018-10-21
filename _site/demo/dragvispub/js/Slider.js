function Slider(params){
  this.snapToTick = params.snapToTick;
  this.parentSVG = params.parentSVG;
  this.margins = params.margins;
  this.width = params.width;
  this.height = params.height;
  this.min = params.min;
  this.max = params.max;
  this.orient = params.orient;
  this.ticksOver = params.ticksOver;
  this.ticksMargin = params.ticksMargin;
  this.barHeight = params.barHeight;
  this.thumbWidth = params.thumbWidth;
  this.thumbHeight = params.thumbHeight;
  this.thumbType = params.thumbType;
  this.axisStyle = params.axisStyle;
  this.listeners = [];
  this.value = params.initValue;
  this.tickValues = params.tickValues || d3.range(this.max+1);
  this.thumbFill = params.thumbFill || "black";
  this.ghosts = [];



  var $this = this;

  var sliderW = this.width - this.margins.left - this.margins.right;

  this.axis_scale = d3.scale.ordinal().domain(d3.range(this.min, this.max+1)).rangePoints([0,sliderW]);
  this.slider_scale_inverse = d3.scale.linear().domain([0,sliderW]).range([0,this.max-this.min]);

  this.sliderGroup = this.parentSVG.append('g')
      .attr('class', 'slider-group')
      .attr('transform', 'translate(' + [this.margins.left , this.margins.top] + ')');

  var tickHeight = undefined;
  switch(this.axisStyle){
    case "large":
      this.sliderGroup.append("rect")
          .attr("class","slider-bar")
          .attr("width",sliderW)
          .attr("height",this.barHeight);
      if(this.ticksOver) tickHeight = this.barHeight + this.ticksMargin;
      else tickHeight = this.ticksMargin;
      break;
    case "thin":
      this.sliderGroup.append("line")//useless but need it to get mouse position when dragging thumb
          .attr("class","slider-bar");
      tickHeight = this.ticksMargin;
      break;
    default: console.log("invalid axisStyle",this.axisStyle);
  }

  var sliderAxis = d3.svg.axis()
      .scale(this.axis_scale)
      .orient(this.orient)
      .tickSize(tickHeight,0,tickHeight+this.ticksMargin)
      .tickValues(this.tickValues);

  this.sliderGroup.append("g")
      .attr("class", "slider-axis")
      .attr("width", sliderW)
      .attr("transform","translate("+[0,this.barHeight]+")")
      .append("g")
      .call(sliderAxis);


  //---------------------------------------------------------------//
  //--------------------------The thumb----------------------------//
  //---------------------------------------------------------------//
  var drag = d3.behavior.drag()
      .origin(Object)
      .on("dragstart", dragSliderStart)
      .on("drag", dragSliderMove)
      .on("dragend", dragSliderEnd);

  this.yThumb = undefined;
  switch(this.axisStyle){
    case "large":
      this.yThumb = 0;
      break;
    case "thin":
      this.yThumb = this.barHeight;
      break;
    default: console.log("invalid axisStyle",this.axisStyle);
  }

  var thumbGroup = this.sliderGroup.selectAll(".slider-thumb")
      .data([{value: this.value, dx:0}])
      .enter()
      .append("g")
      .attr("class","slider-thumb")
      .attr("transform", function(d){return "translate("+[$this.axis_scale(d.value), $this.yThumb]+")"})
      .on("mouseover", function(d){
        d3.select(this).style("cursor", "pointer")
      })
      .call(drag);

  switch(this.thumbType){
    case "circle":
      thumbGroup.append("circle")
          .style({
            stroke: "black",
            "stroke-width": 2,
            fill: this.thumbFill
          })
          .attr("r",this.thumbWidth/2);
      break;
    case "rect":
      thumbGroup.append("rect")
          .attr("width",this.thumbWidth)
          .attr("height",this.thumbHeight)
          .attr("x",-this.thumbWidth/2)
          .attr("y",-(this.thumbHeight-this.barHeight)/2);
      break;
    default: console.log("invalid thumbType",this.thumbType);
  }



  function dragSliderStart(d) {
    d.dx = 0;
  }

  function dragSliderMove(d) {
    d.dx += d3.event.dx;

    d3.select(".slider-bar")
        .each(function(){
          var mouseX = d3.mouse(this)[0];

          var newVal = Math.round(d.value+$this.slider_scale_inverse(d.dx));

          if(newVal != d.value && newVal <= $this.max && newVal >= $this.min){
            d.value = newVal;
            $this.value = d.value;
            var newPos = $this.axis_scale(d.value);
            d.dx = mouseX - newPos;
            thumbGroup.attr("transform", "translate("+[newPos, $this.yThumb]+")");

            $this.fireEvent("dragged");
          }
        });
  }

  function dragSliderEnd(d) {
    d.dx = 0;
    $this.fireEvent("changed");
  }
}

Slider.prototype.addListener = function(listener){
  if(this.listeners.indexOf(listener) == -1) this.listeners.push(listener);
};

Slider.prototype.fireEvent = function(event){
  var $this = this;
  this.listeners.forEach(function(listener){
    listener.sliderChanged(event, $this.value);
  });
};

Slider.prototype.setValue = function(value){
  var $this = this;
  if(value != this.value){
    this.sliderGroup.select(".slider-thumb")
        .attr("transform", function(d){
          d.value = $this.value = value;
          return "translate("+[$this.axis_scale(d.value), $this.yThumb]+")";
        });
  }
};

/*
 level is between 0 and 1 and is opacity of the ghost thumb
 */
Slider.prototype.addGhost = function(value,level){
  var $this = this;
  if(value != this.value){
    this.ghosts.push({value: value, level: level});
    this.sliderGroup.selectAll(".slider-thumb-ghost")
        .data(this.ghosts)
        .enter()
        .append("g")
        .attr("class","slider-thumb-ghost")
        .attr("transform", function(d){return "translate("+[$this.axis_scale(d.value), $this.yThumb]+")"})
        .append("rect")
        .attr("width",this.thumbWidth)
        .attr("height",this.thumbHeight)
        .attr("x",-this.thumbWidth/2)
        .attr("y",-(this.thumbHeight-this.barHeight)/2)
        .style("opacity", function(d){
          return level;
        })
  }
};

/*
 Ghosts are objects {value, level} with level in [0,1]
 */
Slider.prototype.setGhosts = function(ghosts){
  var $this = this;
  this.sliderGroup.selectAll(".slider-thumb-ghost").remove();
  this.sliderGroup.selectAll(".slider-thumb-ghost")
      .data(ghosts)
      .enter()
      .append("g")
      .attr("class","slider-thumb-ghost")
      .attr("transform", function(d){return "translate("+[$this.axis_scale(d.value), $this.yThumb]+")"})
      .append("rect")
      .attr("width",this.thumbWidth)
      .attr("height",this.thumbHeight)
      .attr("x",-this.thumbWidth/2)
      .attr("y",-(this.thumbHeight-this.barHeight)/2)
      .style("opacity", function(d){
        return d.level;
      })
};
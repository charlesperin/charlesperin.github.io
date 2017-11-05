
/*
 append a field to the svg in param
 given x, y, width, height
 */
Field = function(svg, x, y, width, height){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.x_scale = d3.scale.linear().domain([0,100]).range([0,this.width]).clamp(true);
    this.y_scale = d3.scale.linear().domain([0,100]).range([this.height,0]).clamp(true);

    this.fieldGroup = svg.append("g")
        .attr("class", "field")
        .attr("transform", "translate("+x+","+y+")")
        .attr("width", width)
        .attr("height", height);

    this.drawField();

};


Field.prototype.drawField = function(){
    this.fieldDrawingLayer = this.fieldGroup
        .append("g");
    //the field rect
    this.drawFieldRect(0, 0, 100, 100, true);
    //central circle
    this.drawFieldCircle(50, 50, 18);
    //central point
    this.drawFieldCircle(50, 50,.5, true);
    //central line
    this.drawFieldLine(50, 0, 50, 100);
    //left circle
    this.drawFieldCircle(10, 50, 14);
    //right circle
    this.drawFieldCircle(90, 50, 14);
    //left big rect
    this.drawFieldRect(0, 19.1, 15, 61.5, true);
    //right big rect
    this.drawFieldRect(85, 19.1, 15, 61.5, true);
    //left small rect
    this.drawFieldRect(0, 36, 5, 28);
    //right small rect
    this.drawFieldRect(95, 36, 5, 28);
    //left goals
    this.drawFieldRect(0, 44.45, 0.5, 11);
    //right goals
    this.drawFieldRect(99.5, 44.45, 0.5, 11);
    //left penalty point
    this.drawFieldCircle(10, 50, 0.4, true);
    //right penalty point
    this.drawFieldCircle(90, 50, 0.4, true);
};

/*
 x, y center of the circle
 r radius of the circle, as a fraction of X
 isFilled true if point
 */
Field.prototype.drawFieldCircle = function(x, y, r, isFilled){
    var c = isFilled ? "fieldLines fieldPoints" : "fieldLines";
    this.fieldDrawingLayer.append("circle")
        .attr("class", c)
        .attr("cx", this.x_scale(x))
        .attr("cy", this.y_scale(100-y))
        .attr("r", this.y_scale(100-r));
};

/*
 x, width as fractions of X
 y, height as fractions on Y
 */
Field.prototype.drawFieldRect = function(x, y, width, height, isFilled){
    var c = isFilled ? "fieldRect" : "fieldLines";
    this.fieldDrawingLayer.append("rect")
        .attr("class", c)
        .attr("x", this.x_scale(x))
        .attr("y", this.y_scale(100-y))
        .attr("width", this.x_scale(width))
        .attr("height", this.y_scale(100-height));
};

/*
 x1, x2 as fractions of X
 y1, y2 as fractions of Y
 */
Field.prototype.drawFieldLine = function(x1, y1, x2, y2){
    this.fieldDrawingLayer.append("line")
        .attr("class", "fieldLines")
        .attr("x1", this.x_scale(x1))
        .attr("y1", this.y_scale(100-y1))
        .attr("x2", this.x_scale(x2))
        .attr("y2", this.y_scale(100-y2));
};

Widgets = function(params){
    this.widgets = [];
    this.min_day = 0;
    this.max_day = params.nb_days-1;
};

Widgets.prototype.addWidget = function(widget){
    if(this.widgets.indexOf(widget == -1)) this.widgets.push(widget);
};

Widgets.prototype.setValue = function(new_day){
    if(new_day != tables.currentTable.current_day){
        tables.currentTable.current_day = new_day;
        this.widgets.forEach(function(widget){
            widget.setValue(new_day);
        });
        table.changeDay(new_day);
    }
};

/*
Event fired by the slider custom widget
 */
Widgets.prototype.sliderChanged = function(type, value){
    //TODO - check if dragged or changed
    this.setValue(value);
};


AbstractWidget = function(params){
    this.handler = params.handler;
    this.dom_id = params.id;
    this.isAnimate = true;
};

AbstractWidget.prototype.setAnimate = function(isAnimate){
    this.isAnimate = isAnimate;
};


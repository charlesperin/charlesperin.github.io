var defaultChart = function chart(args) {
	
	// private vars defined ordinarily 
	var a, b, c, d;
	  
	// let's refer to the instance as obj	
	var obj = {};
	  
	// place to hold publicly accessible properties	
	obj.props = {};
	  
	// all publicly accessible properties are defined here
	obj.props.width=200;
	obj.props.height=100;
	  
	obj.props.area = function() {	  	
		return this.props.height *  this.props.width 
	}
	
	obj.props.someArray = [];
	
	obj.props.test = function() {
		return Math.random();
	}
	
	// create getters/setters 
	getterSetter();

 	// PRIVATE METHODS 
	var create = function() { 
		console.log('Creating new defautlChart');
	}
	  
 	// PUBLIC METHODS 
	obj.render = function() {
  			    
		console.log('rendering chart with width = ' + obj.props.width +  ' and height = ' + obj.props.height)
		    
		if (args) console.log('detected component scoped argument: ' + args)		    
		return obj;
	}

	return obj; 
}

// OTHER PUBLIC METHODS 
defaultChart.prototype.drag = function(d) {

    var drag = d3.behavior.drag()
     .origin(Object)
      .on("drag", function(d) {

      });
}
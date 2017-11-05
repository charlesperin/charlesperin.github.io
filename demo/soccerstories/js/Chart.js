
var defaultChart = function chart(args) {
	
	// private vars defined ordinarily 
	var a, b, c, d;
	  
	// let's refer to the instance as obj	
	var obj = {};
	  
	// place to hold publicly accessible properties	
	obj.props = {};
	  
	// all publicly accessible properties are defined here
	obj.props.width=60;
	obj.props.height=70;
	  
	obj.props.area = function() {	  	
		return this.props.height *  this.props.width 
	}
	
	obj.props.someArray = [];
	
	obj.props.test = function() {
		return Math.random();
	}
	
	// create getters/setters 
	getterSetter();
	
	// this is how private methods are defined
	var somePrivateMethod = function() { 
		console.log('hi, i am a private method');
	}
	  
	// this is how public methods are defined... 
	obj.render = function() {
  	
		// generate chart here, using `obj.props.width` and `obj.props.height`
		    
		console.log('rendering chart with width = ' + obj.props.width +  ' and height = ' + obj.props.height)
		    
		if (args) console.log('detected component scoped argument: ' + args)
		    
		return obj;
	}

	return obj; 
}
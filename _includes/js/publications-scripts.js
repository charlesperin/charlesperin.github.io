$( document ).ready(function() {
	
	var known_types = ["journal","conference","abstract",,"workshop","poster","demo","contest","chapter","thesis","patent"];
	
	//Assign data to years
	var years = d3.select("#pub-ul").selectAll(".pub-year");
	years.each(function(){
		var year = parseInt(d3.select(this).select("h3").html());
		d3.select(this).datum({year: year});
	});
	
	//Assign data to publications
	var publications = d3.select("#pub-ul").selectAll("li");
	publications.each(function(){
		var data = {classes: []};
		var classes = [];
		d3.select(this).selectAll(".pub-tags").selectAll(".pub-type").filter(function(tag){
			var _class = d3.select(this).attr("class").split(" ")[1];
			if(known_types.indexOf(_class) == -1) return false;
			data.classes.push(_class);
			return true;
		});
		data.year = parseInt(d3.select(this).attr("class").split(" ")[1]);
		d3.select(this).datum(data);
	});
	
	//Assign data to filter buttons
	var buttons = d3.select("#pub-legend").selectAll(".pub-legend");
	buttons.each(function(){
			var data = {disabled: false};
			var classes = d3.select(this).attr("class");
			data.classes = classes.substring("pub-legend ".length, classes.indexOf(" button")).split(" ");
			data.classes.forEach(function(_class){
				if(known_types.indexOf(_class) == -1) throw ("Unknown class: "+_class);
			});
			d3.select(this).datum(data);
		})
	.on("click", function(but){
		//switch
		but.disabled = !but.disabled;
		updateButtonsStyle();
		updatePublicationsList();
		updateYears();
	});
	
	function updateButtonsStyle(){
		buttons.classed("disabled", d => d.disabled);
	}
	
	function updatePublicationsList(){
		publications.classed("hidden", function(pub){
			var enabled = false;
			for(var c=0; c < pub.classes.length; c++){
				if(!isDisabled(pub.classes[c])) {
					pub.hidden = false;
					return pub.hidden;
				}
			}
			pub.hidden = true;
			return pub.hidden;
		});
	}
	
	function updateYears(){
		years.classed("hidden", function(year){
			year.hidden = !hasOnePublication(year.year);
			return year.hidden;
		});
	}
	
	function isDisabled(className){
		return getButton(className).datum().disabled;
	}
	
	function getButton(className){
		var _button = buttons.filter(function(d){
			return d.classes.indexOf(className) != -1;
		});
		return _button;
	}
	
	function hasOnePublication(yearInt){
		var pubs = publications.filter(function(pub){
			return !pub.hidden && pub.year == yearInt;
		});
		return pubs != null && !pubs.empty();
	}
	
});






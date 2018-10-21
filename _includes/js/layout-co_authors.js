$( document ).ready(function() {
	
	
	
	var $grid = $('.grid').masonry({
		itemSelector: '.grid-item',
		  percentPosition: true,
			columnWidth: 10,
			gutter: 0
	});
	
	// layout Masonry after each image loads
	$grid.imagesLoaded().progress( function() {
		$grid.masonry('layout');
	});
	
});






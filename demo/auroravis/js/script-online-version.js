var currentPositions = [];
var currentPosition = -1;

var hoverStart = 0;
var hoverButton = '';
var hoverTime = 1500;

var selectStart = 0;
var selectNight = null;
var selectTime = 1500;

var scrubbingStart = 0;
var oldMeta = '';

var kinectActive = Array(20).fill(false);
var kinectActiveCutoff = 550;

var alignCenter = false;

$(document).ready(function() {
	kinect.start();
	kinect.addListener(onKinectUpdate);

	$('.nights').on('click', 'div', showDetail);
	$('.nights').on('mousemove', '.selected', scrubVideoMouse);

	$('.help').on('click', toggleOverlay);
	$('.sort').on('click', sortNightsBy);
	$('body').on('click', '.back', toggleOverlay);
	$('#back').on('click', hideDetail);
	$('#playpause').on('click', playpauseVideo);
	$('#videosnap').on('click', saveVideoSnapshot);
	$('#savekeogram').on('click', saveKeogram);

	$(document).on('click', deleteHover);
	$(document).on('mousemove', handleMouseMove);
	$(document).on('touchmove', handleTouchMove);

	// disable right click
	$(document).on('contextmenu', function(){ return false;	});

	// handle keyboard
	$(document).keydown(onKeydown);

	generateNights();

	window.requestAnimationFrame(calculateLayout);
});

function onKeydown(event) {
	switch (event.key) {
		case ' ':
			playpauseVideo(event);
			break;
		case 'ArrowLeft':
			seekVideo(-1);
			event.preventDefault();
			break;
		case 'ArrowRight':
			seekVideo(1);
			event.preventDefault();
			break;
		case 'Home':
			seekVideo(-1000);
			event.preventDefault();
			break;
		case 'End':
			seekVideo(1000);
			event.preventDefault();
			break;
		case 't':
			$('body').toggleClass('noimages');
			break;
		case 'a':
			alignCenter = !alignCenter;
			break;
	}
}

function handleTouchMove(event) {
	var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
	if($('.nights .selected').is(event.target))
	{
		var width = $('.selected').attr('data-height');
		var offset = width - (touch.pageX - $('.selected').offset().left);
		scrubVideo(offset);
	}
	else
	{
		if(!kinectIsActive() && !$('button').is(event.target))
			currentPositions = [touch.pageX];
	}
	event.preventDefault();
}

function handleMouseMove(event) {
	if(!kinectIsActive()
		&& !$('button').is(event.toElement)
		&& !$('body').hasClass('detail')
		&& !$('body').hasClass('overlay1')
		&& !$('body').hasClass('overlay2')
		&& !$('body').hasClass('overlay3'))
		currentPositions = [event.pageX];
}

function onKinectUpdate(data) {
	if (data === parseInt(data, 10)) // if we get depth updates
	{
		kinectActive.shift();
		kinectActive.push(data > kinectActiveCutoff);
	}
	else // if we get body updates
	{
		if(!kinectIsActive())
		{
			currentPosition = -1;
			$('#cursor')
				.removeClass('active')
				.removeClass('upper');
			$('.hover').removeClass('hover');
			$('body').addClass('nokinect');
			return;
		}

		$('body').removeClass('nokinect');
		var bodies = data;
		var windowWidth = $(window).width();

		var closestIndex = -1;
		var closestDistance = 100;
		currentPosition = -1;
		
		for (var i = 0; i < bodies.length; i++) {
			if(bodies[i].Joints.SpineShoulder.Position.X != 0 &&
				bodies[i].Joints.SpineShoulder.Position.Y != 0 &&
				bodies[i].Joints.SpineShoulder.Position.Z != 0 &&
				bodies[i].Joints.SpineShoulder.Position.Z < closestDistance)
			{
				closestDistance = bodies[i].Joints.SpineShoulder.Position.Z;
				closestIndex = i;
			}
		}

		// interaction by body position
		currentPositions = [];
		bodies.forEach(function(body, i) {
			if(body.TrackingId > 0)
			{
				var newX = (body.Joints.SpineShoulder.Position.X + 1) * windowWidth * 0.5;
				var newPos = Math.max(0, Math.min($(window).width() - 1, newX));
				currentPositions.push(newPos);
				if(i === closestIndex)
					currentPosition = newPos;
			}
		});

		var now = Date.now();
		var buttons = [];

		if(closestIndex < 0)
			return;

		var joints = bodies[closestIndex].Joints;

		// hand interaction
		if($('body').hasClass('detail'))
		{
			buttons = [
				'#back',
				'#playpause'
				//'#videosnap',
				//'#savekeogram'
			];
		}
		else if($('body').hasClass('overlay1'))
		{
			buttons = [
				'.overlay1 .back',
				'#help1',
				'#help2',
				'#help3'
			];
		}
		else if($('body').hasClass('overlay2'))
		{
			buttons = [
				'.overlay2 .back',
				'#help1',
				'#help2',
				'#help3'
			];
		}
		else if($('body').hasClass('overlay3'))
		{
			buttons = [
				'.overlay3 .back',
				'#help1',
				'#help2',
				'#help3'
			];
		}
		else
		{
			buttons = [
				'#help1',
				'#help2',
				'#help3',
				'#data-date',
				'#data-height',
				'#data-v'
			];
		}

		var threshold = joints.SpineMid.Position.Y + (joints.SpineShoulder.Position.Y - joints.SpineMid.Position.Y) * 0.8;
		
		// interaction with buttons on the top
		if(joints.HandRight.Position.Y > threshold)
		{
			var left = (joints.HandRight.Position.X - joints.SpineShoulder.Position.X) * windowWidth * 3 - windowWidth * 0.5;
			$('#cursor')
				.addClass('active')
				.addClass('upper')
				.css('top', 25)
				.css('left', left);
			var overElem = getOverElementHorizontal(left, buttons);

			// if no hover started yet
			if(hoverStart === 0 && overElem)
			{
				hoverStart = now;
				hoverButton = overElem;
				$(hoverButton).addClass('hover');
			}
			// if a hover started and there is still a hover
			else if(hoverStart > 0 && overElem)
			{
				// hover element didn't change
				if(hoverButton === overElem)
				{
					$(hoverButton).addClass('hover');
					// check if hover time ran out
					if(hoverStart < now - hoverTime) {
						$(overElem).trigger('click');
						$(hoverButton).removeClass('hover');
						hoverStart = 0;
					}
				}
				// hover element changed
				else
				{
					$(hoverButton).removeClass('hover');
					hoverStart = now;
					hoverButton = overElem;
					$(hoverButton).addClass('hover');
				}
			}
			// if a hover started and there is no hover anymore
			else
			{
				hoverStart = 0;
				$(hoverButton).removeClass('hover');
			}
		}
		else
		{
			$('#cursor')
				.removeClass('active')
				.removeClass('upper');
			hoverStart = 0;
			$(hoverButton).removeClass('hover');
		}

		// interactions with nights on the bottom
		if(joints.HandRight.Position.Z < joints.SpineShoulder.Position.Z - 0.4 &&
			joints.HandRight.Position.Y < threshold &&
			!$('body').hasClass('detail'))
		{
			var currentNight = $('.nights div').eq(getCurrentNightIndex());

			$('.nights div').removeClass('hover');
			currentNight.addClass('hover');
			if(currentNight.is(selectNight) && selectStart > 0)
			{
				if(selectStart < now - selectTime) {
					currentNight.trigger('click');
					selectStart = 0;
				}
			}
			else
			{
				selectNight = currentNight;
				selectStart = now;
			}

			$('#cursor')
				.addClass('active');
		}
		else
		{
			$('.nights div').removeClass('hover');
			selectStart = 0;
		}

		// interaction with keogram on the bottom
		if(joints.HandRight.Position.Z < joints.SpineShoulder.Position.Z - 0.4 &&
			joints.HandRight.Position.Y < threshold &&
			$('body').hasClass('detail'))
		{
			$('#cursor')
				.addClass('active');
			if(scrubbingStart === 0)
			{
				scrubbingStart = joints.HandRight.Position.X;
			}
			else
			{
				var sec = (joints.HandRight.Position.X - scrubbingStart) * 5;
				seekVideo(sec);
			}
		}
		else
		{
			scrubbingStart = 0;
		}
	}
}

function getOverElementHorizontal(x, elems) {
	for (var i = elems.length - 1; i >= 0; i--) {
		if(isOverElementHorizontal(x, elems[i]))
			return elems[i];
	}
	return null;
}

function isOverElementHorizontal(x, elem) {
	if(x > $(elem).offset().left && x < $(elem).offset().left + $(elem).outerWidth())
		return true;
	else
		return false;
}

function getDateForPosition(position) {
	var windowWidth = $(window).width();
	var index = Math.floor(position / (windowWidth / nights.length));
	return $('.nights div').eq(index).attr('data-date');
}

function getCurrentNightIndex() {
	var windowWidth = $(window).width();
	return Math.floor(currentPosition / (windowWidth / nights.length));
}

function getSortedFocusNights() {
	var windowWidth = $(window).width();
	var result = [];
	currentPositions.forEach(function(position) {
		result.push(Math.floor(position / (windowWidth / nights.length)));
	});
	return result;
}

function playpauseVideo(event) {
	var video = $('video').get(0);
	video.paused ? video.play() : video.pause();
	
	event.preventDefault();
}

function seekVideo(sec) {
	var video = $('video').get(0);
	video.currentTime = Math.max(0, Math.min(video.duration - 0.1, video.currentTime + sec));
}

function calculateLayout() {
	resizeInterface();
	resizeNights();	
	window.requestAnimationFrame(calculateLayout);
}

function showDetail(event) {
	if(!$('body').hasClass('detail') && !$(this).hasClass('selected')) {
		var windowWidth = $(window).width();
		var windowHeight = $(window).height();

		$(this).animate({
			width: $(this).attr('data-width'),
			height: $(this).attr('data-height'),
			left: (windowWidth - $(this).attr('data-width')) * 0.5,
			top: windowHeight * 0.8 - $(this).attr('data-height') * 0.5
		}, 0, function() {
			loadVideo($(this).attr('data-date'));
			$(this).addClass('selected');
			$('body').addClass('detail');
			$('#date').html(date2text($(this).attr('data-date')));
		});
	}

	event.preventDefault();
}

function deleteHover(event) {
	if($('.nights').is(event.toElement))
	{
		currentPositions = [];
		currentPosition = -1;
	}
	else if($('body').hasClass('detail')
		&& !$('.selected').is(event.toElement)
		&& !$('.marker').is(event.toElement)
		&& !$('button').is(event.toElement)
		&& event.hasOwnProperty('originalEvent'))
	{
		if($('video').is(event.toElement))
			playpauseVideo(event);
		else
			hideDetail(event);
	}
}

function scrubVideoMouse(event) {
	scrubVideo(event.offsetY);
}

function scrubVideo(offset) {
	var width = $('.selected').attr('data-height');
	var relative = Math.round((width - offset) / width * 100) / 100;
	var video = $('video').get(0);
	video.currentTime = Math.max(0, Math.min(video.duration - 0.1, video.duration * relative));
}

function hideDetail(event) {
	$('.nights div').removeClass('selected');
	$('body').removeClass('detail');
	resizeNights();
	
	event.preventDefault();
}

function generateNights() {
	$.each(nights, function(i, night) {
		var elem = $('<div>')
			.attr('data-width', night.width)
			.attr('data-height', night.height)
			.attr('data-h', night.hue)
			.attr('data-s', night.saturation)
			.attr('data-v', night.value)
			.attr('data-date', night.date)
			.css('background-color', night.color)
			.css('background-image', 'url(images/' + night.image + ')')
			.addClass('moon' + night.moon);
		$('.nights').append(elem);
	});

	resizeNights();
	resizeInterface();
}

function resizeNights() {
	var windowWidth = $(window).width();
	var windowHeight = $(window).height() - 50;
	var height = windowHeight * 0.8 / 1000;

	// calculate width for all nights
	var nightWidths = new Array($('.nights div').length).fill(1);
	if(!$('body').hasClass('detail'))
	{
		var focusNights = getSortedFocusNights();
		for (var i = 0; i < focusNights.length; i++) {

			// -2
			if(focusNights[i] > 1
				&& focusNights[i - 1] != focusNights[i] - 2)
			{
				if(focusNights[i - 1] == focusNights[i] - 1
					|| focusNights[i - 1] == focusNights[i] - 3)
					nightWidths[focusNights[i] - 2] = 5;
				else
					nightWidths[focusNights[i] - 2] = 3;
			}

			// -1
			if(focusNights[i] > 0
				&& focusNights[i - 1] != focusNights[i] - 1)
				nightWidths[focusNights[i] - 1] = 5;

			// +-0
			nightWidths[focusNights[i]] = 7;

			// +1
			if(focusNights[i] < nightWidths.length - 1
				&& focusNights[i + 1] != focusNights[i] + 1)
				nightWidths[focusNights[i] + 1] = 5;

			// +2
			if(focusNights[i] < nightWidths.length - 2
				&& focusNights[i + 1] != focusNights[i] + 2)
			{
				if(focusNights[i + 1] == focusNights[i] + 1
					|| focusNights[i + 1] == focusNights[i] + 3)
					nightWidths[focusNights[i] + 2] = 5;
				else
					nightWidths[focusNights[i] + 2] = 3;
			}
		}
	}
	
	var fullWidth = nightWidths.reduce((prev, curr) => prev + curr);
	var baseWidth = windowWidth / (fullWidth + 1);

	var index = $('.nights div').index($('.selected'));
	var gap = windowWidth - windowHeight * 0.6 * 1.77;

	// calculate size and position for scale
	var scaleHeight = 1005 * height;
	var scaleTop = windowHeight - 1005 * height;
	if(alignCenter)
		scaleTop = (windowHeight - 1005 * height) * 0.5 + 50;
	$('#scale')
		.width(baseWidth - 2)
		.height(scaleHeight)
		.css('left', 0)
		.css('top', scaleTop);

	$('#background')
		.height(scaleHeight)
		.css('top', scaleTop);

	// set size and position for each night
	$('.nights div').each(function(i, night) {
		var offsetX = 0;
		var offsetY = 50;

		var left = 0;
		var top = 0;

		if($(this).hasClass('selected'))
		{
			left = (windowWidth - $(this).attr('data-width')) * 0.5;
			top = windowHeight * 0.92 - $(this).attr('data-height') * 0.5;
			$(this)
				.width($(this).attr('data-width'))
				.height($(this).attr('data-height'))
				.css('left', left)
				.css('top', top);

			var video = $('video').get(0);
			var relative = video.currentTime / video.duration;
			var offset = relative * $(this).attr('data-height');

			var leftHelper = (windowWidth - $(this).attr('data-height')) * 0.5 + offset;
			var topHelper = windowHeight * 0.92 - $(this).attr('data-width') * 0.5 - 10;

			$('.video .marker')
				.height(parseInt($(this).attr('data-width')) + 20)
				.css('left', leftHelper)
				.css('top', topHelper);

			if(!$('#cursor').hasClass('upper'))
			{
				$('#cursor')
					.css('left', leftHelper)
					.css('top', topHelper);
			}
		}
		else
		{
			if($('body').hasClass('detail'))
			{
				left = (i - index + Math.floor(gap * 0.35 / baseWidth)) * baseWidth;
				if(i > index)
					left = windowWidth + (i - index - Math.floor(gap * 0.35 / baseWidth) - 1) * baseWidth;
			}
			else
			{
				var previousWidths = 0;
				if(i > 0)
					previousWidths = nightWidths.slice(0, i).reduce((prev, curr) => prev + curr);
				left = previousWidths * baseWidth;
			}

			left += baseWidth;
			top = windowHeight - $(this).attr('data-height') * height;
			if(alignCenter)
				top = (windowHeight - $(this).attr('data-height') * height) * 0.5 + 50;
			offsetX = (nightWidths[i] * baseWidth - 2) * 0.5;
			$(this)
				.width(nightWidths[i] * baseWidth - 2)
				.height($(this).attr('data-height') * height)
				.css('top', top)
				.css('left', left);
		}

		var newMeta = '';
		if($('body').hasClass('detail'))
		{
			newMeta = date2text($('.selected').attr('data-date'));
		}
		else
		{
			if(currentPosition < 0)
			{
				if(currentPositions.length > 0)
					newMeta = date2text(getDateForPosition(currentPositions[0]));
				else
					newMeta = '<span>no night selected</span>';
			}
			else
				newMeta = date2text(getDateForPosition(currentPosition));
		}

		if(oldMeta != newMeta)
		{
			$('#meta').html(newMeta);
			oldMeta = newMeta;
		}
		
		switch(i) {
			//case 0:
			case 19:
				$('#dec')
					.css('left', left + offsetX)
					.css('top', top - offsetY);
				break;
			//case 31:
			case 50:
				$('#jan')
					.css('left', left + offsetX)
					.css('top', top - offsetY);
				break;
			//case 62:
			case 81:
				$('#feb')
					.css('left', left + offsetX)
					.css('top', top - offsetY);
				break;
			//case 91:
			case 110:
				$('#mar')
					.css('left', left + offsetX)
					.css('top', top - offsetY);
				break;
			//case 122:
			case 141:
				$('#apr')
					.css('left', left + offsetX)
					.css('top', top - offsetY);
				break;
		}

		if(!$('#cursor').hasClass('upper') &&
			i == getCurrentNightIndex() &&
			!$('body').hasClass('detail'))
		{
			$('#cursor')
				.css('left', left + offsetX)
				.css('top', top - offsetY * 0.5);
		}	
	});
}

function sortNights(attr) {
	if(attr === 'data-date')
		$('body').removeClass('nolabel');
	else
		$('body').addClass('nolabel');

	var nights = $('.nights').find('div');
	[].sort.call(nights, function(a,b) {
		return +$(a).attr(attr) - +$(b).attr(attr);
	});
	nights.each(function(){
		$('.nights').append(this);
	});

	resizeNights();
}

function resizeInterface() {
	var windowWidth = $(window).width();
	var windowHeight = $(window).height();

$('video')
	//	.width(windowWidth)
	 	.width(windowHeight * 0.6 * 1.77)
		.height(windowHeight * 0.6)
	//	.css('left', 0)
	 	.css('left', (windowWidth - windowHeight * 0.6 * 1.77) * 0.5)
		.css('top', windowHeight * 0.12);

	$('.sidebar.left')
		.css('left', (windowWidth - windowHeight * 0.9 * 1.77) * 0.5)
		.css('top', windowHeight * 0.3);

	$('.sidebar.right')
		.css('right', (windowWidth - windowHeight * 0.9 * 1.77) * 0.5)
		.css('top', windowHeight * 0.3);

	$('.buttons').css('top', 20);
	$('.detailbuttons').css('top', 20);
	$('#meta').css('top', 32);
}

function loadVideo(date) {
	var folder = [date.slice(0, 4), '/', date.slice(4, 6), '/', date.slice(6, 8)].join('');
	var source = 'http://data.phys.ucalgary.ca/sort_by_project/AuroraMAX/rt-movies/mp4/' + folder + '/auroramaxHD_' + date+ '_480p.mp4';
	//var source = 'video/auroramaxHD_' + date+ '_720p.mp4';

	$(this).removeClass('loaded');
	$('video').attr('src', source);
	$('video').bind('loadeddata', function(e) {
		$(this).addClass('loaded');
	});
}

function saveVideoSnapshot()
{
	var video  = $('video').get(0);
	var canvas = $('<canvas>').get(0);
	canvas.width  = video.videoWidth;
	canvas.height = video.videoHeight;
	var ctx = canvas.getContext('2d');
	ctx.drawImage(video, 0, 0);
	window.open(canvas.toDataURL('image/jpeg'), '_blank');
}

function saveKeogram()
{
	var index = $('.nights div').index($('.selected'));
	window.open('images/' + nights[index]['image'], '_blank');
}

function sortNightsBy(event) {
	sortNights($(this).attr('id'));
	$('.buttons .active').not('#images').removeClass('active');
	$(this).addClass('active');
	event.preventDefault();
}

function toggleOverlay() {
	$('body').removeClass('overlay1');
	$('body').removeClass('overlay2');
	$('body').removeClass('overlay3');
	if($(this).attr('value'))
		$('body').addClass($(this).attr('value'));
}

function date2text(date) {
	var months = {'01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'};
	var year = date.slice(0, 4);
	var month = date.slice(4, 6);
	var day = date.slice(6, 8);
	return '<span>' + day + '</span><span>' + months[month] + '</span><span>' + year + '</span>';
}

function kinectIsActive() {
	return kinectActive.filter(function(value){
		return value === true;
	}).length > 10;
}

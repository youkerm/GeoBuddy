var searching = false;
var SHIFT_KEY_DOWN = false;
var coord_input;
var loc_input;
var zoomMap;
var map;
var hoveredNode;

window.onload = function() {
	coord_input = document.getElementById("geocoords");
	loc_input = document.getElementById("location_input");
}

function setMapCenter(bounds) {
	zoomMap.clearMap();
	searching = true;
	map.fitBounds(bounds);
	searching = false;
	if (map.getZoom() < 9) {
		zoomMap.drawUpperLevel();
	} else {
		zoomMap.drawLowerLevel();
	}
}

function initAutocomplete() {

	var mapOptions = {
		zoom: 4,
		center: new google.maps.LatLng(40.5, -100.7),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};

	map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);	
	
	var input = document.getElementById('pac-input');
	
	var searchBox = new google.maps.places.SearchBox(input);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
		
	var south_west = new google.maps.LatLng(14.819484, -170.704466);
	var north_east = new google.maps.LatLng(71.706221, -66.949822605);
	var bounds = new google.maps.LatLngBounds(south_west, north_east);

	zoomMap = new ZoomMap(map);
	
	hoveredNode = new google.maps.Rectangle({
		strokeWeight: 3,
		strokeColor: '#00ff00',
        fillColor: '#00ff00',
		strokeOpacity: 0,
        fillOpacity: 0,
        map: map
	});

	google.maps.event.addListenerOnce(map, 'idle', function() {
		//zoomMap.generate(bounds, 40, 10);
		zoomMap.loadStatic();
		zoomMap.drawUpperLevel();
	});
	
	google.maps.event.addDomListener(document.getElementById('generate'), 'click', function() {
		var bigParts = parseInt(document.getElementById('big_parts').value);
		var smallParts = parseInt(document.getElementById('small_parts').value);
		
		if (bigParts >= 10 && bigParts <= 50 && smallParts >= 10 && bigParts <= 50) {
			zoomMap.generate(bounds, bigParts, smallParts);
			map.setOptions(mapOptions);
			zoomMap.drawUpperLevel();
		}
	});

	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});

	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();

		if (places.length == 0) {
			return;
		}

		var bounds = new google.maps.LatLngBounds();
		places.forEach(function(place) {
			if (!place.geometry) {
				console.log("Returned place contains no geometry");
				return;
			}
	 
			if (place.geometry.viewport) {
				bounds.union(place.geometry.viewport);
			} else {
				bounds.extend(place.geometry.location);
			}
		});
		setMapCenter(bounds);	
	});
		

	google.maps.event.addListener(map, 'zoom_changed', function() {
		if (!searching) {
			if (map.getZoom() < 9) {
				zoomMap.drawUpperLevel();
			} else {
				zoomMap.drawLowerLevel();
			}
		}
	});
		
	google.maps.event.addListener(map, 'dragend', function() {
		if (zoomMap.isLowerLevelDrawn()) {
			zoomMap.clearMap();
			zoomMap.drawLowerLevel();
		}
	});
		
	google.maps.event.addListener(map, 'mouseout', function() {
		if (zoomMap.isLowerLevelDrawn()) {
			zoomMap.clearMap();
			zoomMap.drawLowerLevel();
		}
	});
	
	google.maps.event.addDomListener(document, 'keydown', function (e) {
		var code = (e.keyCode ? e.keyCode : e.which);
        if (code === 16) {
			SHIFT_KEY_DOWN = true;
        }
    });
	
	google.maps.event.addDomListener(document, 'keyup', function (e) {
		var code = (e.keyCode ? e.keyCode : e.which);
        if (code === 16) {
			SHIFT_KEY_DOWN = false;
        }
    });
	
	function saveXML() {
		var xml = "<usa>";
		for (var i = 0; i < zoomMap.getZoomBounds().length; i++) {
			var big = zoomMap.getZoomBounds()[i];
			var bounds = big.getBounds();
			xml = xml + "\n\t<big_rectangle>\n\t\t<visible>\n\t\t\t" + big.isVisible() + "\n\t\t</visible>\n\t\t<bounds>\n\t\t\t<south_west>\n\t\t\t\t<latitude>" + bounds.getSouthWest().lat() + "</latitude>\n\t\t\t\t<longitude>" + bounds.getSouthWest().lng() + "</longitude>\n\t\t\t</south_west>\n\t\t\t<north_east>\n\t\t\t\t<latitude>" + bounds.getNorthEast().lat() + "</latitude>\n\t\t\t\t<longitude>" + bounds.getNorthEast().lng() + "</longitude>\n\t\t\t</north_east>\n\t\t</bounds>\n\t\t<small_rectangles>";
			var smalls = big.getChildren();
			for (var j = 0; j < smalls.length; j++) {
				bounds = smalls[j].getBounds();
				xml = xml + "\n\t\t\t<small_rectangle>\n\t\t\t\t<visible>\n\t\t\t\t\t" + smalls[j].isVisible() + "\n\t\t\t\t</visible>\n\t\t\t\t<bounds>\n\t\t\t\t\t<south_west>\n\t\t\t\t\t\t<latitude>" + bounds.getSouthWest().lat() + "</latitude>\n\t\t\t\t\t\t<longitude>" + bounds.getSouthWest().lng() + "</longitude>\n\t\t\t\t\t</south_west>\n\t\t\t\t\t<north_east>\n\t\t\t\t\t\t<latitude>" + bounds.getNorthEast().lat() + "</latitude>\n\t\t\t\t\t\t<longitude>" + bounds.getNorthEast().lng() + "</longitude>\n\t\t\t\t\t</north_east>\n\t\t\t\t</bounds>\n\t\t\t</small_rectangle>";
			}
			xml = xml + "\n\t\t</small_rectangles>\n\t</big_rectangle>";
		}
		xml = xml + "\n</usa>";
		var blob = new Blob([xml], {type: "text/xml;charset=utf-8"});
		saveAs(blob, "geo_data.xml");
	}

	function saveCVS() {
		var big_schema = 'big_location_id\t north_east\t south_west\n';
		var small_schema = 'small_location_id\t big_location_id\t north_east\t south_west\n';
		for (var i = 0; i < zoomMap.getZoomBounds().length; i++) {
			var big = zoomMap.getZoomBounds()[i];
			
			if (big.isVisible()) {
				var bounds = big.getBounds();
				var b_uuid = uuid.v4();
				big_schema = big_schema + b_uuid + '\t ' +
									'POINT(' + bounds.getNorthEast().lat() + ', ' + bounds.getNorthEast().lng() + ')\t ' +
									'POINT(' + bounds.getSouthWest().lat() + ', ' + bounds.getSouthWest().lng() + ')\n';
				
				
				var smalls = big.getChildren();
				for (var j = 0; j < smalls.length; j++) {
					if (smalls[j].isVisible()) {
						bounds = smalls[j].getBounds();
						small_schema = small_schema + uuid.v4() + '\t ' + b_uuid + '\t ' +
									'POINT(' + bounds.getNorthEast().lat() + ', ' + bounds.getNorthEast().lng() + ')\t ' +
									'POINT(' + bounds.getSouthWest().lat() + ', ' + bounds.getSouthWest().lng() + ')\n';
					}
				}
			}
		}
		var big_blog = new Blob([big_schema], {type: "text/xml;charset=utf-8"});
		var small_blog = new Blob([small_schema], {type: "text/xml;charset=utf-8"});
		saveAs(big_blog, "big_data.csv");
		saveAs(small_blog, "small_data.csv");
	}
	
	google.maps.event.addDomListener(document.getElementById('save'), 'click', function() {
		saveXML();
		saveCVS();
		zoomMap.generateArray();
	});
	
	google.maps.event.addDomListener(document.getElementById('files'), 'change', function() {
		zoomMap.clearMap();
		if (window.File && window.FileReader && window.FileList && window.Blob) {
			var selectedFile = document.getElementById('files').files[0];
			if (selectedFile != null) {
				
				var reader = new FileReader();
				var parser = new DOMParser();
				var doc;
				
				reader.onloadend = function(event) {
					var text = event.target.result;
					var doc = parser.parseFromString(text, "text/xml");
					
					var zoomBounds = new Array();
					
					var big_recs = doc.getElementsByTagName("big_rectangle");
					for (var i = 0; i < big_recs.length; i++) {
						var sw = big_recs[i].getElementsByTagName("south_west")[0];
						var ne = big_recs[i].getElementsByTagName("north_east")[0];
						var visibility = big_recs[i].getElementsByTagName("visible")[0];
						
						var south_west = new google.maps.LatLng(sw.getElementsByTagName("latitude")[0].textContent, sw.getElementsByTagName("longitude")[0].textContent);
						var north_east = new google.maps.LatLng(ne.getElementsByTagName("latitude")[0].textContent, ne.getElementsByTagName("longitude")[0].textContent);
						
						var bigBounds = new google.maps.LatLngBounds(south_west, north_east);
						var big = new ZoomRect(bigBounds, visibility);
						
						var small_recs = big_recs[i].getElementsByTagName("small_rectangle");
						var smalls = new Array();
						for (var j = 0; j < small_recs.length; j++) {
							sw = small_recs[j].getElementsByTagName("south_west")[0];
							ne = small_recs[j].getElementsByTagName("north_east")[0];
							visibility = small_recs[j].getElementsByTagName("visible")[0];
							
							south_west = new google.maps.LatLng(sw.getElementsByTagName("latitude")[0].textContent, sw.getElementsByTagName("longitude")[0].textContent);
							north_east = new google.maps.LatLng(ne.getElementsByTagName("latitude")[0].textContent, ne.getElementsByTagName("longitude")[0].textContent);
							
							var smallBounds = new google.maps.LatLngBounds(south_west, north_east);
							var small = new ZoomRect(smallBounds, visibility);
							smalls.push(small);
						}
						big.setChildren(smalls);
						zoomBounds.push(big);
					}
					if (map.getZoom() < 9) {
						zoomMap.drawUpperLevel();
					} else {
						zoomMap.drawLowerLevel();
					}	
				}
				reader.readAsText(selectedFile);
			}
		} else {
		  alert('The File APIs are not fully supported in this browser.');
		}
	});
}

/* PrettyPieMenu by Rami Laine
 * 
 * Heavily modified and transformed to JQueryUI widget from 
 * Radial pie menu HTML5 canvas implementation by Andreas Fuchs (2009).
 * 
 * from http://www.cs.tut.fi/~laine9/demo/ppmenu/piedemo.html
 */

// Embedding these two circles because file references in Electron are not easy.

var GREEN_CIRCLE_BASE64 = "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";

var RED_CIRCLE_BASE64 = "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";

(function( $, undefined ) {
var piemenuId = 0;

function getNextPieMenuId() {
	return ++piemenuId;
}

$.widget("ui.prettypiemenu", {
	options: {
	    buttons: {},
	    closeRadius: 20,
	    closePadding: 3,
	    outerPadding: 10,
	    globalAlpha: 1.0,
	    onSelection: function() {},
	    className: "ui-ppmenu-pieBg",
	    centerIconInActive: "data:image/gif;base64," + RED_CIRCLE_BASE64,
	    centerIconActive: "data:image/gif;base64," + GREEN_CIRCLE_BASE64,
	    backgroundColor: 'transparent',
	    iconW: 16,
	    iconH: 16,
	    centerIconW: 30,
	    centerIconH: 30,
	    showAnimationSpeed: 300,
	    showStartAnimation: true,
        showTitles: false
	},

	_create: function() {
		var self = this,
		options = self.options;

		// variables
		var idPrefix = self.idPrefix = "piemenu_" + getNextPieMenuId() + "_img_";
		var highlight = self.highlight = 'x';
	    var nSegments = self.nSegments = $(options.buttons).length;
	    var radius = self.radius = self._minRadius(options) + options.closeRadius + options.closePadding;
	    self.showStartAnimation = options.showStartAnimation;
	    
	    // elements
		var pieArea = self.pieArea = $(document.createElement('div'))
		    .appendTo(document.body)
		    .hide()
			.addClass(options.className)
			.css({
				width: radius*2,
				height: radius*2,
				position: "absolute"
			})
			.bind('contextmenu', function(e) {
				e.preventDefault();
				return false;
			});
	
		var tooltip = self.tooltip = $(document.createElement('div'))
		.hide()
		.addClass("ui-widget ui-widget-content ui-ppmenu-tooltip")
		.appendTo($(pieArea))
		.css({
			top: options.closeRadius - options.iconH/2,
			left: options.closeRadius - options.iconW/2
		});
		
		// var ballIconW = 16;
		// var ballIconH = 16;
		
		var ballIcon = self.ballIcon = $(document.createElement('span'))
			.hide()
			.addClass("ui-icon ui-icon-radio-off")
			.appendTo($(pieArea))
			.css({
				top: options.closeRadius - options.iconH/2,
				left: options.closeRadius - options.iconW/2,
				position: "absolute"
			});

		var centerIcon = self.centerIcon = $(document.createElement('img'))
			.attr("src", options.centerIconInActive)
			.appendTo($(pieArea))
			.css({
				top: radius - options.centerIconH/2,
				left: radius - options.centerIconW/2,
				position: "absolute",
				border: 0
			});

		// segments
		$(options.buttons).each( function(i, img) {
			var pos = self._iconPos(radius, i, nSegments, options.outerPadding, options, 50, 2);
			var pieSegment = $(document.createElement("div"))
				.appendTo($(pieArea))
				.addClass("ui-ppmenu-iconBg ui-state-hover")
				.css({
					top:  pos.top,
					left: pos.left,
					width: options.iconW,
					height: options.iconH
				});

			var pieSegmentIcon = $(document.createElement("span"))
				.attr( { id: idPrefix + i })
				.appendTo($(pieSegment))
				.addClass("ui-icon " + img.img);
		});		
		
		$(self.element).mousedown(function(e) {
			e.preventDefault();
			if (e.which == 3)
			{
				// checking if the menu if going outside the window
				if (e.pageX - radius < 0)
				{
					self.show({left: e.pageX - (e.pageX - radius), top: e.pageY});
				}
				else if (e.pageX + radius > $(window).width())
				{
					self.show({left: e.pageX - (e.pageX + radius - $(window).width()), top: e.pageY});
				}
				else
				{
					self.show({left: e.pageX, top: e.pageY});
				}
			}
			return false;
		});
	},

	_init: function() {
		var self = this,
		options = self.options;

		// variables
		var highlight = self.highlight = 'x';
	    var nSegments = self.nSegments = $(options.buttons).length;
	    var radius = self.radius = self._minRadius(options) + options.closeRadius + options.closePadding;
	    self.showStartAnimation = options.showStartAnimation;
	},
	hide: function() {
		var self = this;	
		
		$(self.options.buttons).each( function(i, img) {   
			var pos = self._iconPos(self.radius, i, self.nSegments, self.options.outerPadding, self.options, 50, 2);
			$("#" + self.idPrefix + i).parent().animate({ top: pos.top, left: pos.left }, 500);
			$("#" + self.idPrefix + i).parent().switchClass("ui-state-active", "ui-state-hover", 0);
		});
		
		self.pieArea.fadeOut(400, function() {
			$(document.body).unbind('contextmenu');
			return false;
		});
		
		self.ballIcon.hide();
		self.tooltip.hide();
		self.centerIcon.attr("src", self.options.centerIconInActive);

		return self;
	},
	_unbindEvents: function() {
		var self = this;		
		self.pieArea.unbind('mousemove').unbind('mouseup');
		$(document.body).unbind('mouseup.ppmenu');
		$(document.body).unbind('mousemove.ppmenu');
	},
	destroy: function() {
		this._unbindEvents();
		this.hide();
		return self;
	},

	widget: function() {
		return this.pieArea;
	},

    _innerSegmentAngle: function(n) {
        return this._paddedSegmentAngle(n) - (Math.PI/180)*4;
    },

    _paddedSegmentAngle: function(n) {
        return 2*Math.PI / n;
    },

    _startAngle: function (n, total) {
        return (-Math.PI/2) + this._paddedSegmentAngle(total) * n;
    },

   _endAngle: function(n, total) {
       return this._startAngle(n, total) + this._innerSegmentAngle(total);
   },
   _iconPos: function(radius, i, nSegments, outerPadding, options, animPaddingOffset, animAngleOffset) {
		 var startA = this._startAngle(i, nSegments), endA = this._endAngle(i, nSegments);
		 // var iconW = $(img).width(), iconH = $(img).height();
		 var iconW = this.options.iconW, iconH = this.options.iconH;
		 var iconCenterRadius = radius - Math.max(iconW, iconH)/2-outerPadding + animPaddingOffset;
		 var midAngle = startA + (endA - startA)/2 + animAngleOffset,
		 iconX = Math.cos(midAngle) * iconCenterRadius,
		 iconY = Math.sin(midAngle) * iconCenterRadius;  
		 
		 return {top: radius + iconY-iconH/2, left: radius + iconX-(iconW/2)};
   },
   _minRadius: function(options) {
	   var diagonal = 0, maxside = 0;
	   $(options.buttons).each( function(_, img) {
		   // var w = $(img).width(), h = $(img).height();
		   var w = options.iconW, h = options.iconH;
		   diagonal = Math.max(diagonal, Math.sqrt(w*w + h*h));
		   maxside = Math.max(maxside, w, h);
	   });
	   var segmentAngle = this._paddedSegmentAngle($(options.buttons).length);
	   var dHalved = diagonal/2, alpha = (Math.PI - segmentAngle) / 2;
	   return Math.ceil(dHalved * Math.sin(alpha) +
			   Math.max(dHalved, maxside) + options.outerPadding);

   },
   show: function(position) {
	   var self = this;
	   
	   self.highlight = 'x';	   
	   self.pieArea.css({
	       top: position.top - self.radius,
	       left: position.left - self.radius
	   });
	   
	   $(document.body).bind('contextmenu', function(e) {
			e.preventDefault();
			return false;
		}, false);
	   
	   // binds
	   $(document.body).bind('mouseup.ppmenu', function(event) {
		   							event.preventDefault();
		   							self.destroy(event);
		   							return false;
		   						 }, false); 
	   $(document.body).bind('mousemove.ppmenu', function(event) {
		   		event.preventDefault();
		   		self._changeHighlight(event);
		   		return false;
			 }, false);
	   
	   self.pieArea.mousemove(function(event) {
			self._changeHighlight(event); 
		}, false)
		.bind('mouseup', self.options, function(event) {
			self._onClick(event); 
		}, false);	   
	   
	   self.pieArea.fadeIn(self.options.showAnimationSpeed);
	   self.showStartAnimation = self.options.showStartAnimation;;

	   $(self.options.buttons).each( function(i, img) {   
		   var pos = self._iconPos(self.radius, i, self.nSegments, self.options.outerPadding, self.options, 50, 2);
		   $("#" + self.idPrefix + i).parent().css({ top: pos.top, left: pos.left });
	   });	
	   
	   self._draw();
   },
   _draw: function() {
	   var self = this;

	   // Draw segments
	   $(self.options.buttons).each( function(i, img) {
		   var icon = $("#" + self.idPrefix + i);

		   if (self.showStartAnimation)
		   {
			   var pos = self._iconPos(self.radius, i, self.nSegments, self.options.outerPadding, self.options, 0, 0);
			   $(icon).parent().animate({ top: pos.top, left: pos.left }, self.options.showAnimationSpeed, 
					   					  function() { self.highlight = 'x'; });
		   }

		   if (i === self.highlight)
		   {
			   $(icon).parent().switchClass("ui-state-hover", "ui-state-active", 0);
			   if (self.options.showTitles)
			   {
				   var tooltipPos = self._iconPos(self.radius, i, self.nSegments, self.options.outerPadding, self.options, 0, 0);
				   self.tooltip.html(img.title);
				   var tooltipLeftside  = { top: tooltipPos.top, left: tooltipPos.left - self.tooltip.width() - self.options.iconW*2 }
				   var tooltipRightside = { top: tooltipPos.top, left: tooltipPos.left + self.options.iconW*2 }
				   
				   if (tooltipPos.left < self.radius)
				   {
					   tooltipPos = tooltipLeftside;
				   }
				   else
				   {
					   tooltipPos = tooltipRightside;
				   }
				   
				   // have to calculate if the title is going outside of the window				   
				   self.tooltip.animate({
					   top:  tooltipPos.top,
					   left: tooltipPos.left
				   }, 300, function() { 
					   if (self.tooltip.offset().left < 0)
					   {
						   self.tooltip.css({top: tooltipRightside.top, left: tooltipRightside.left});
					   }
					   else if (self.tooltip.offset().left + self.tooltip.width() > $(window).width())
					   {
						   self.tooltip.css({top: tooltipLeftside.top, left: tooltipLeftside.left});
					   }
				   });


			   }
		   }
		   else
		   {
			   $(icon).parent().switchClass("ui-state-active", "ui-state-hover", 0);
		   }
	   });
	   self.showStartAnimation = false;
   },	
   _onClick: function(e){
       var self = this;
	   
       self._unbindEvents();	   
	   
	   if (self.highlight >= 0 && self.highlight < self.nSegments) 
	   {
		   if (e.data.onSelection)
		   {
			   e.data.onSelection(self.highlight, self.element);
		   }
	   }
	   
	   self.hide();
   },
   _changeHighlight: function(e) {
        var self = this;
        var prevHighlight = self.highlight;
        var posn = self.pieArea.offset();
        var x = e.pageX - posn.left, y = e.pageY - posn.top;
        var cX = self.pieArea.width()/2, cY = self.pieArea.height()/2;
        var centerDistance = Math.sqrt((cX - x)*(cX - x) + (cY - y)*(cY - y));
        
        if (centerDistance < self.options.closeRadius) 
        {
        	// mouse at center
        	self.highlight = 'x';
        	if (self.highlight != prevHighlight)
        	{
        		self._draw();
        		self.centerIcon.attr("src", self.options.centerIconInActive);
        		self.ballIcon.hide();   
        		self.tooltip.fadeOut();
        	}
        } 
        else if (centerDistance > self.options.closeRadius + self.options.closePadding) 
        {
            var dX = x - cX, dY = y - cY;
            var angle = null;
            if (dX < 0)
                angle = Math.PI + Math.asin(-dY/centerDistance);
            else
                angle = Math.asin(dY/centerDistance);

            $(self.options.buttons).each( function(i, img) {
            	if (self._startAngle(i, self.nSegments) < angle &&
            		self._endAngle(i, self.nSegments) >= angle) 
            	{
            		self.highlight = i;
            		return false;
            	}
            	return true;
            });
            
            // change icon to active and show ball if necessary
            if (self.highlight != prevHighlight)
            {
            	self._draw();
            }

            if (centerDistance > self.radius + self.options.outerPadding)
            {
            	if (self.centerIcon.attr("src") != self.options.centerIconInActive)
            	{	
            		self.centerIcon.attr("src", self.options.centerIconInActive);
            		self.tooltip.fadeOut();
            	}
            }
            else
            {
            	if (self.centerIcon.attr("src") != self.options.centerIconActive)
            	{	 
            		self.centerIcon.attr("src", self.options.centerIconActive);
            		self.ballIcon.show();
     			    if (self.options.showTitles)
    			    {
     			    	self.tooltip.fadeIn();
    			    }
            	}
            }
            
            
            var ballPosX = Math.cos(angle)*(self.options.closeRadius);
            var ballPosY = Math.sin(angle)*(self.options.closeRadius);

            self.ballIcon.css({
            	top:  self.radius + ballPosY - self.options.iconH/2,
            	left: self.radius + ballPosX - self.options.iconW/2
            });
        }

        
        return false;
    }	
});

$.extend($.ui.prettypiemenu, {
	version: "1.8.8"
});

}(jQuery));

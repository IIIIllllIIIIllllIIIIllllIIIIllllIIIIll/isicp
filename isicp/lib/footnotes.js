// Shows footnotes as popups, requires jQuery.
// Originally written by Lukas Mathis:
// http://ignorethecode.net/blog/2010/04/20/footnotes/
// Adapted by Andres Raba, public domain.

$(document).ready(function() {

  // Configuration
  var doc = "html",
      popup = "#footnote_popup",
      old_doc_bg = $(doc).css("background"),
      old_popup_bg = $(popup).css("background"),
      new_doc_bg = "#e8e8e8",
      new_popup_bg = "#ffffff";

  var Footnotes = {
      footnotetimeout: false,
      setup: function() {
	var footnotelinks = $("a[class='footnote_link']");
          
	footnotelinks.unbind('mouseover',Footnotes.footnoteover);
	footnotelinks.unbind('mouseout',Footnotes.footnoteout);
          
	footnotelinks.bind('mouseover',Footnotes.footnoteover);
	footnotelinks.bind('mouseout',Footnotes.footnoteout);
      },

      footnoteover: function() {
	clearTimeout(Footnotes.footnotetimeout);
	$(popup).stop();
        $(popup).remove();
          
        var id = $(this).attr('href').substr(1);
        var position = $(this).offset();
      
        var div = $(document.createElement('div'));
        div.attr('id', popup.substr(1));
        div.bind('mouseover',Footnotes.divover);
        div.bind('mouseout',Footnotes.footnoteout);
  
        var el = document.getElementById(id);
        div.html($(el).html());
          
	var popup_width = $("#main").width() * 0.96;
        div.css({
          position:'absolute',
          width: popup_width,
          opacity:1
        });
  
        $(document.body).append(div);
  
        var left = $("#main").offset().left - 10;

	// Popup opens below the link unless there's 
	// not enough room below and enough above.
	var top = position.top + 33;
	if ((top + div.height() + 18 > 
	      $(window).height() + $(window).scrollTop()) 
	    &&
	    (top - div.height() - 40 > $(window).scrollTop())) {
	      top = position.top - div.height() - 5;
	}
	div.css({ left: left, 
		  top: top, 
		  background: new_popup_bg });
  	$(doc).css({ background: new_doc_bg });
      },

      footnoteout: function() {
        Footnotes.footnotetimeout = setTimeout(function() {
          $(popup).animate({
            opacity: 0
          }, 0, function() {
	    $(popup).remove();
	    $(doc).css({ background: old_doc_bg });
	    $(popup).css({ background: old_popup_bg });
          });
        },600);
      },

      divover: function() {
        clearTimeout(Footnotes.footnotetimeout);
        $(popup).stop();
        $(popup).css({
          opacity: 1
        });
  	$(doc).css({ background: new_doc_bg });
	$(popup).css({ background: new_popup_bg });
      }
  }

  Footnotes.setup();

});

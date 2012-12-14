// Binds tooltip to preceding element having class "footnote".
var bind_footnote = function() {
  $(document).ready( function() {
    $(".footnote").tooltip({ delay: 500 })
      .dynamic({	
  		top:	  { direction: 'up' },
  		bottom:	  { direction: 'down' },
  		left:	  { direction: 'right' },
  		right:	  { direction: 'left' } 
  	       });
  });
};

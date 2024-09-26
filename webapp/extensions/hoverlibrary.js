jQuery.sap.declare("sap.m.ObjectIdentifierHover");
sap.m.ObjectIdentifier.extend("sap.m.ObjectIdentifierHover", { // call the new Control type "HoverButton" 
                                                // and let it inherit from sap.m.Button
      metadata: {
          events: {
              "hover" : {}  // this Button has also a "hover" event, in addition to "press" of the normal Button
          }
      },
  
      // the hover event handler:
      onmouseover : function(evt) {   // is called when the Button is hovered - no event registration required
          this.fireHover();
      },

      renderer: {} // add nothing, just inherit the ButtonRenderer as is; 
  });
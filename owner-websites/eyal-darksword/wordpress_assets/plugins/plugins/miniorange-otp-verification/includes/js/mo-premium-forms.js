/* global moDisablePremiumFormElements */
var $mo = jQuery;

( function( $mo ) {
	'use strict';

	$mo( function() {
		if ( 'function' === typeof window.moDisablePremiumFormElements ) {
			window.moDisablePremiumFormElements();
		}
	} );
} )( $mo );


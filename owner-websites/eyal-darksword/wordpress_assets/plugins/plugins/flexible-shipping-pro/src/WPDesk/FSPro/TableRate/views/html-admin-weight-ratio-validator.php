<?php
/**
 * View for Feedback Notice.
 *
 * @package WPDesk\FSPro\TableRate
 */

use WPDesk\FSPro\TableRate\Rule\Condition\DimensionalWeight;

?>

<script type="text/javascript">
	document.addEventListener( "DOMContentLoaded", function ( event ) {
		document.querySelector( '#mainform button[name="save"]' ).addEventListener( "click", function ( event ) {
			let ratio_field = document.querySelector( '#woocommerce_flexible_shipping_weight_ratio' );
			let weight_ratio = ratio_field.value;

			if ( weight_ratio.length > 0 ) {
				return;
			}


			let selected_field = false;
			document.querySelectorAll( 'select.condition' ).forEach( function ( select ) {
				if ( select.value === "<?php echo esc_js( DimensionalWeight::CONDITION_ID ); ?>" ) {
					selected_field = true;
				}
			} );

			if ( !selected_field ) {
				return;
			}

			event.preventDefault();

			alert( "<?php echo esc_js( __( 'Entering the DIM Factor value is required if the When: Dimensional weight condition was used. Please fill it in and save the changes once again.', 'flexible-shipping-pro' ) ); ?>" );

			ratio_field.focus();
		} );
	} );
</script>

<?php
/**
 * Trait ShippingClassSettings
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

/**
 * Shipping class settings.
 */
trait ShippingClassSettings {

	/**
	 * Prepare shipping class options.
	 *
	 * @return array
	 */
	public function prepare_shipping_class_options() {
		$options             = array();
		$options['all']      = __( 'All products', 'flexible-shipping-pro' );
		$options['any']      = __( 'Any class (must be set)', 'flexible-shipping-pro' );
		$options['none']     = __( 'None', 'flexible-shipping-pro' );
		$wc_shipping_classes = WC()->shipping->get_shipping_classes();
		foreach ( $wc_shipping_classes as $shipping_class ) {
			$options[ $shipping_class->term_id ] = $shipping_class->name;
		}

		return $options;
	}

}

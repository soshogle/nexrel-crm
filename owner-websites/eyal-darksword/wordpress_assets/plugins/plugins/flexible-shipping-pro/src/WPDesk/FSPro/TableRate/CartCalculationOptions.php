<?php
/**
 * Class CartCalculationOptions
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

use FSProVendor\WPDesk\FS\TableRate\AbstractOptions;

/**
 * Can provide cart calculation options.
 */
class CartCalculationOptions extends AbstractOptions {

	/**
	 * @return array
	 */
	public function get_options() {
		return array(
			'cart'    => __( 'Cart value', 'flexible-shipping-pro' ),
			'package' => __( 'Package value', 'flexible-shipping-pro' ),
		);
	}

}

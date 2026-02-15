<?php
/**
 * Class CartCalculationOptions
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

/**
 * Can provide calculation method options.
 */
class CalculationMethodOptions extends \FSProVendor\WPDesk\FS\TableRate\CalculationMethodOptions {

	/**
	 * @return array
	 */
	public function get_options() {
		return array(
			'sum'     => __( 'Sum', 'flexible-shipping-pro' ),
			'lowest'  => __( 'Lowest cost', 'flexible-shipping-pro' ),
			'highest' => __( 'Highest cost', 'flexible-shipping-pro' ),
		);
	}

}

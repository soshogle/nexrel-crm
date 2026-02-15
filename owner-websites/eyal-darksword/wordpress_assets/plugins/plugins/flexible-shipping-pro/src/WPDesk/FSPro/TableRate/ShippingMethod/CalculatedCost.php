<?php
/**
 * Class CalculatedCost
 *
 * @package WPDesk\FSPro\TableRate\ShippingMethod
 */

namespace WPDesk\FSPro\TableRate\ShippingMethod;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can modify calculated shipping method cost.
 */
class CalculatedCost implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/shipping-method/calculated-cost', array( $this, 'modify_calculated_cost_according_to_max_cost' ), 10, 2 );
	}

	/**
	 * @param float $cost .
	 * @param array $shipping_method_settings .
	 *
	 * @return float
	 */
	public function modify_calculated_cost_according_to_max_cost( $cost, array $shipping_method_settings ) {
		if ( isset( $shipping_method_settings['method_max_cost'] ) ) {
			$method_max_cost = $shipping_method_settings['method_max_cost'];
			if ( '' !== $method_max_cost && is_numeric( $method_max_cost ) ) {
				if ( $cost > (float) $method_max_cost ) {
					$cost = (float) $method_max_cost;
				}
			}
		}

		return $cost;
	}

}

<?php
/**
 * Class BasedOnWeight
 *
 * @package WPDesk\FSPro\TableRate\RuleCost\Cost
 */

namespace WPDesk\FSPro\TableRate\RuleCost\Cost;

use WPDesk\FS\TableRate\Rule\Cost\AbstractAdditionalCost;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;

/**
 * Based on weight additional cost.
 */
class BasedOnWeight extends AbstractAdditionalCost {

	/**
	 * BasedOnPrice constructor.
	 */
	public function __construct() {
		$this->based_on = 'weight';
		// Translators: weight unit.
		$this->name = sprintf( __( 'Weight (%1$s)', 'flexible-shipping-pro' ), get_option( 'woocommerce_weight_unit' ) );
	}

	/**
	 * Returns value from shipment contents to calculate cost.
	 *
	 * @param ShippingContents $shipping_contents .
	 *
	 * @return float
	 */
	protected function get_value_from_shipment_contents( $shipping_contents ) {
		return $shipping_contents->get_contents_weight( false );
	}


}

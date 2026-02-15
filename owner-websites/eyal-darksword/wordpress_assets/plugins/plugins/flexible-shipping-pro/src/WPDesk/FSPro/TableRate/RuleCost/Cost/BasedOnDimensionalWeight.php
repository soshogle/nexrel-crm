<?php
/**
 * Class BasedOnDimensionalWeight
 *
 * @package WPDesk\FSPro\TableRate\RuleCost\Cost
 */

namespace WPDesk\FSPro\TableRate\RuleCost\Cost;

use WPDesk\FS\TableRate\Rule\Cost\AbstractAdditionalCost;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use WPDesk\FSPro\TableRate\Rule\Condition\DimensionalWeight;
use WPDesk\FSPro\TableRate\Rule\Condition\DimensionalWeight\DimensionalWeightCalculator;

/**
 * Based on dimensional weight additional cost.
 *
 * @codeCoverageIgnore
 */
class BasedOnDimensionalWeight extends AbstractAdditionalCost {
	use DimensionalWeightCalculator;

	/**
	 * BasedOnPrice constructor.
	 */
	public function __construct() {
		$this->based_on = 'dimensional_weight';
		// Translators: weight unit.
		$this->name = sprintf( __( 'Dimensional Weight (%1$s)', 'flexible-shipping-pro' ), get_option( 'woocommerce_weight_unit' ) );
	}

	/**
	 * Returns value from shipment contents to calculate cost.
	 *
	 * @param ShippingContents $shipping_contents .
	 *
	 * @return float
	 */
	protected function get_value_from_shipment_contents( $shipping_contents ) {
		$method_settings = $this->method_settings->get_raw_settings();
		$weight_ratio    = isset( $method_settings[ DimensionalWeight::RATIO ] ) ? (float) str_replace( ',', '.', $method_settings[ DimensionalWeight::RATIO ] ) : 0;

		return $this->get_contents_weight( $shipping_contents, $weight_ratio );
	}
}

<?php
/**
 * Class BasedOnVolume
 *
 * @package WPDesk\FSPro\TableRate\RuleCost\Cost
 */

namespace WPDesk\FSPro\TableRate\RuleCost\Cost;

use WPDesk\FS\TableRate\Rule\Cost\AbstractAdditionalCost;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use WPDesk\FSPro\TableRate\VolumeCalculation;

/**
 * Based on Price additional cost.
 */
class BasedOnVolume extends AbstractAdditionalCost {

	use VolumeCalculation;

	const CURRENCY_MULTIPLIER = 1000000;

	/**
	 * @var int
	 */
	private $rounding_precision;

	/**
	 * BasedOnPrice constructor.
	 *
	 * @param int $rounding_precision .
	 */
	public function __construct() {
		$this->based_on = 'volume';
		// Translators: currency.
		$this->name = sprintf( __( 'Volume (%1$s)', 'flexible-shipping-pro' ), get_option( 'woocommerce_dimension_unit' ) . '&sup3;' );
	}

	/**
	 * Returns value from shipment contents to calculate cost.
	 *
	 * @param ShippingContents $shipping_contents .
	 *
	 * @return float
	 */
	protected function get_value_from_shipment_contents( $shipping_contents ) {
		return round( $this->get_contents_volume( $shipping_contents ), $this->rounding_precision );
	}

	/**
	 * @param array $additional_cost_settings .
	 *
	 * @return float|null
	 */
	public function get_per_value( array $additional_cost_settings ) {
		$per_value = parent::get_per_value( $additional_cost_settings );
		if ( null !== $per_value ) {
			$per_value = apply_filters( 'flexible_shipping_value_in_currency', $per_value * self::CURRENCY_MULTIPLIER ) / self::CURRENCY_MULTIPLIER;
		}

		return $per_value;
	}

}

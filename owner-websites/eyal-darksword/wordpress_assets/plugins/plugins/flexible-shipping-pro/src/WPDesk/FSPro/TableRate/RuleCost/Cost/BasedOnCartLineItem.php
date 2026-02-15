<?php
/**
 * Class BasedOnLineItem
 *
 * @package WPDesk\FSPro\TableRate\RuleCost\Cost
 */

namespace WPDesk\FSPro\TableRate\RuleCost\Cost;

use WPDesk\FS\TableRate\Rule\Cost\AbstractAdditionalCost;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;

/**
 * Based on Line Item additional cost.
 */
class BasedOnCartLineItem extends AbstractAdditionalCost {

	/**
	 * BasedOnPrice constructor.
	 */
	public function __construct() {
		$this->based_on = 'cart_line_item';
		// Translators: currency.
		$this->name = __( 'Line item (pos)', 'flexible-shipping-pro' );
	}

	/**
	 * Returns value from shipment contents to calculate cost.
	 *
	 * @param ShippingContents $shipping_contents .
	 *
	 * @return float
	 */
	protected function get_value_from_shipment_contents( $shipping_contents ) {
		return count( $shipping_contents->get_contents() );
	}

}

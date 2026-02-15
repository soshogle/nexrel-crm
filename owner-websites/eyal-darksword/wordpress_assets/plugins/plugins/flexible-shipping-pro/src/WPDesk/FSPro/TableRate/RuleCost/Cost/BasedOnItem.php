<?php
/**
 * Class BasedOnItem
 *
 * @package WPDesk\FSPro\TableRate\RuleCost\Cost
 */

namespace WPDesk\FSPro\TableRate\RuleCost\Cost;

use WPDesk\FS\TableRate\Rule\Cost\AbstractAdditionalCost;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;

/**
 * Based on Item additional cost.
 */
class BasedOnItem extends AbstractAdditionalCost {

	/**
	 * BasedOnPrice constructor.
	 */
	public function __construct() {
		$this->based_on = 'item';
		// Translators: currency.
		$this->name = __( 'Item (qty)', 'flexible-shipping-pro' );
	}

	/**
	 * Returns value from shipment contents to calculate cost.
	 *
	 * @param ShippingContents $shipping_contents .
	 *
	 * @return float
	 */
	protected function get_value_from_shipment_contents( $shipping_contents ) {
		return $shipping_contents->get_contents_items_count();
	}

}

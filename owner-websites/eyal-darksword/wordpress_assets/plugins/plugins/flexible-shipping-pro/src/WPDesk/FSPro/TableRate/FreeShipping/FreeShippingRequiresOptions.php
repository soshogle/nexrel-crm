<?php
/**
 * Class FreeShippingRequiresOptions
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate\FreeShipping;

use FSProVendor\WPDesk\FS\TableRate\AbstractOptions;

/**
 * Can provide free shipping requires options.
 */
class FreeShippingRequiresOptions extends AbstractOptions {

	const ORDER_AMOUNT            = 'order_amount';
	const COUPON                  = 'coupon';
	const ORDER_AMOUNT_OR_COUPON  = 'order_amount_or_coupon';
	const ORDER_AMOUNT_AND_COUPON = 'order_amount_and_coupon';

	/**
	 * @return array
	 */
	public function get_options() {
		return array(
			self::ORDER_AMOUNT            => __( 'Minimum order amount', 'flexible-shipping-pro' ),
			self::COUPON                  => __( 'Free shipping coupon', 'flexible-shipping-pro' ),
			self::ORDER_AMOUNT_OR_COUPON  => __( 'Free shipping coupon or minimum order amount', 'flexible-shipping-pro' ),
			self::ORDER_AMOUNT_AND_COUPON => __( 'Free shipping coupon and minimum order amount', 'flexible-shipping-pro' ),
		);
	}

}

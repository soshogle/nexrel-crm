<?php
/**
 * Class WOOMULTI_CURRENCY_Plugin_Subscriptions_for_woocommerce_wpswing
 * Subscriptions for WooCommerce – Subscription Plugin for Collecting Recurring Revenue, Sell Membership Subscription Services & Products
 * Author: WP Swings
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Subscriptions_for_woocommerce_wpswing {
//	protected $settings;

	public function __construct() {
//		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();

		add_filter( 'wps_sfw_cart_price_subscription', array( $this, 'wps_sfw_cart_price_subscription' ), 10, 2 );
	}

	public function wps_sfw_cart_price_subscription( $product_price, $cart_data ) {

		return wmc_revert_price( $product_price );
	}
}
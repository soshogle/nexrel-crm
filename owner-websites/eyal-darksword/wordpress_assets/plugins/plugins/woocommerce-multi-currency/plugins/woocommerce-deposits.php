<?php
/**
 * Plugin Woocommerce Deposits
 * Author: WooCommerce
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Woocommerce_Deposits {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		add_filter( 'woocommerce_deposits_fixed_deposit_amount', array( $this, 'woocommerce_deposits_fixed_deposit_amount' ), 10, 2 );
	}

	/**
	 * @param $price
	 *
	 * @return float|int|mixed
	 */
	public function woocommerce_deposits_fixed_deposit_amount( $price ) {
		return wmc_get_price( $price );
	}
}
<?php

//fpd_wc_cart_item_price


/**
 * Class WOOMULTI_CURRENCY_Plugin_Fancy
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Fancy {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {

			add_filter( 'fpd_wc_cart_item_price', array( $this, 'revert_price' ), 10, 3 );

		}
	}

	public function revert_price( $final_price, $cart_item, $fpd_data ) {
		$final_price = wmc_revert_price( $final_price );
		return $final_price;
	}

}

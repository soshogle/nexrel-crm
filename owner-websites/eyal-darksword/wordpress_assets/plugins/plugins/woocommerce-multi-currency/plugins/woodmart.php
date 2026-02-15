<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Woodmart
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Woodmart {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_filter( 'woodmart_shipping_progress_bar_amount', array( $this, 'woodmart_shipping_progress_bar_amount' ) );
		}
	}

	public function woodmart_shipping_progress_bar_amount( $limit ) {
		return wmc_get_price( $limit );
	}
}
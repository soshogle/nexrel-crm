<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WOOMULTI_CURRENCY_Plugin_Wc_Dynamic_Pricing_And_Discounts
 */
class WOOMULTI_CURRENCY_Plugin_Woocs {
	protected $settings;
	protected $convert;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		$this->convert  = false;
		if ( $this->settings->get_enable() ) {
			add_filter( 'woocs_exchange_value',
				array( $this, 'woocs_exchange_value' ) );
		}
	}

	/**
	 * @param $amount
	 *
	 * @return float|int|mixed
	 */
	public function woocs_exchange_value( $amount ) {

		return wmc_get_price( $amount );
	}
}
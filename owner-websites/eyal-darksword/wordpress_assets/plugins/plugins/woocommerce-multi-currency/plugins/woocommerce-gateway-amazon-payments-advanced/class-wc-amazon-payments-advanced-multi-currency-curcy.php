<?php
/**
 * Handle CURCY – Multi Currency for WooCommerce compatibility.
 * https://villatheme.com/extensions/woo-multi-currency/
 */

//use WC_Amazon_Payments_Advanced_Multi_Currency_Abstract;

class WC_Amazon_Payments_Advanced_Multi_Currency_Curcy extends WC_Amazon_Payments_Advanced_Multi_Currency_Abstract {

	/**
	 * Specify hooks where compatibility action takes place.
	 */
	public function __construct() {
		parent::__construct();
	}

	/**
	 * Get WOOMULTI_CURRENCY_Data selected currency.
	 *
	 * @return string
	 */
	public static function get_active_currency() {
		$curcy_settings   = WOOMULTI_CURRENCY_Data::get_ins();
		$current_currency = $curcy_settings->get_current_currency();

		return $current_currency;
	}

	public function is_front_end_compatible() {
		return true;
	}

}
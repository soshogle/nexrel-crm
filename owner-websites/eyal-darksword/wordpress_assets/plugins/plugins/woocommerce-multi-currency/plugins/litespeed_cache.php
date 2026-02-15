<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Litespeed_Cache
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Litespeed_Cache {
	protected $settings;
	private static $_cookies = array(
		'wmc_current_currency',
		'wmc_current_currency_old',
		'wmc_ip_info',
	);

	public function __construct() {

		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_filter( 'litespeed_vary_curr_cookies', array(
				$this,
				'check_cookies'
			) ); // this is for vary response headers, only add when needed
			add_filter( 'litespeed_vary_cookies', array(
				$this,
				'register_cookies'
			) ); // this is for rewrite rules, so always add
		}
	}

	public function register_cookies( $list ) {
		return array_merge( $list, self::$_cookies );
	}

	/**
	 * If the page is not a woocommerce page, ignore the logic.
	 * Else check cookies. If cookies are set, set the vary headers, else do not cache the page.
	 *
	 * @param $list
	 *
	 * @return array
	 */
	public function check_cookies( $list ) {
		// NOTE: is_cart and is_checkout should also be checked, but will be checked by woocommerce anyway.
		if ( ! is_woocommerce() ) {
			return $list;
		}

		return array_merge( $list, self::$_cookies );
	}
}
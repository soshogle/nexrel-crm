<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Paid_Memberships_Pro
 * Paid Memberships Pro
 * Author Paid Memberships Pro
 * This plugin has custom currency setting, need more wc filter to change display currency
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Paid_Memberships_Pro {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		add_filter( 'pmpro_format_price', array( $this, 'pmpro_format_price' ), 10, 4 );
		add_filter( 'pmpro_round_price', array( $this, 'pmpro_round_price' ) );
		add_filter( 'streamit_pmpro_currency_symbol', array( $this, 'streamit_pmpro_currency_symbol' ), 10,1 );
	}

	public function pmpro_format_price( $formatted, $price, $pmpro_currency, $pmpro_currency_symbol ) {
		$r_price = wmc_get_price( $price );
		$pmpro_currency_symbol =get_woocommerce_currency_symbol();
//		$formatted = wc_price( $r_price, array( 'currency' => $this->settings->get_current_currency() ) );
		$formatted = $pmpro_currency_symbol . number_format( $r_price, pmpro_get_decimal_place() );;

		return $formatted;
	}

	public function pmpro_round_price( $rounded ) {
		$r_price = wmc_get_price( $rounded );
		$r_price = WOOMULTI_CURRENCY_Data::convert_price_to_float( $r_price );

		return $r_price;
	}

	public function streamit_pmpro_currency_symbol($symbol){
		if ($this->settings->get_enable()){
			$symbol = get_woocommerce_currency_symbol();
		}
		return $symbol;
	}
}
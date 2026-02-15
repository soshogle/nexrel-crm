<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WOOMULTI_CURRENCY_Frontend_Coupon
 */
class WOOMULTI_CURRENCY_Frontend_Coupon {
	protected $settings;
	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			add_filter( 'woocommerce_coupon_get_amount', array( $this, 'woocommerce_coupon_get_amount' ), 10, 2 );
			add_filter( 'woocommerce_coupon_get_minimum_amount', array(
				$this,
				'woocommerce_coupon_get_minimum_amount'
			) );
			add_filter( 'woocommerce_coupon_get_maximum_amount', array(
				$this,
				'woocommerce_coupon_get_maximum_amount'
			) );
			add_filter( 'woocommerce_boost_sales_coupon_amount_price', array(
				$this,
				'woocommerce_boost_sales_coupon_amount_price'
			) );
		}
	}

	/**
	 * @param $data
	 * @param $obj WC_Coupon
	 *
	 * @return float|int|mixed|void
	 */
	public function woocommerce_coupon_get_amount( $data, $obj ) {
		if ( function_exists( 'ywpar_is_redeeming_coupon' ) ) {
			if ( ywpar_is_redeeming_coupon( $obj ) ) {
				return $data;
			}
		}

		if ( $obj->is_type( array( 'percent', 'recurring_percent', 'sign_up_fee_percent', 'sumosubs_recurring_fee_percent_discount', 'sumosubs_signupfee_percent_discount' ) ) ) {
			return $data;
		}

		return wmc_get_price( $data );
	}


	public function woocommerce_boost_sales_coupon_amount_price( $data ) {
		return wmc_get_price( $data );
	}

	/**
	 * @param $data
	 *
	 * @return mixed
	 */
	public function woocommerce_coupon_get_minimum_amount( $data ) {

		return wmc_get_price( $data, false, false, true );
	}

	public function woocommerce_coupon_get_maximum_amount( $data ) {
		return wmc_get_price( $data, false, false, true );
	}
}

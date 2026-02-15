<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Wpfunnels
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Wpfunnels {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() ) {
			//Order bump price
			add_filter( 'wpfunnels/modify_orderbump_product_price_data', array( $this, 'modify_orderbump_product_price_data' ), 10 );

			//Order bump discount price from setting
			add_action( 'wpfunnels/order_bump_settings', array( $this, 'wpfunnels_order_bump_settings' ), 10, 3 );

			if ( ! is_plugin_active( 'wpfunnels-pro/wpfnl-pro.php' ) ||
			     ( defined( 'WPFNL_PRO_VERSION' ) && version_compare( WPFNL_PRO_VERSION, '2.5.1', '<' ) ) ) {
				add_action( 'wpfunnels/checkout_discount_amount', array( $this, 'wpfunnels_checkout_discount_amount' ), 10 );
			}
		}
	}

	public function modify_orderbump_product_price_data( $custom_price ) {

		return wmc_revert_price( $custom_price );
	}

	public function wpfunnels_checkout_discount_amount( $discount_amount ) {

		return wmc_revert_price( $discount_amount );
	}

	public function wpfunnels_order_bump_settings( $ob_settings, $funnel_id, $checkout_id ) {
		foreach ( $ob_settings as $ob_key => $ob_setting ) {
			if ( is_array( $ob_setting ) && isset( $ob_setting['discountPrice'] ) ) {
				$ob_settings[$ob_key]['discountPrice'] = wmc_get_price( (float) $ob_setting['discountPrice'] );
			}
		}

		return $ob_settings;
	}
}
<?php
/**
 * Class WOOMULTI_CURRENCY_Plugin_Yith_Dynamic_Pricing_And_Discount
 * Author: Yith
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Yith_Dynamic_Pricing_And_Discount {
	public function __construct() {
		add_filter( 'ywdpd_change_dynamic_price', array( $this, 'ywdpd_change_dynamic_price' ) );
//		add_filter( 'ywdpd_maybe_should_be_converted', array( $this, 'ywdpd_maybe_should_be_converted' ) );

		add_filter( 'ywdpd_price_rule_get_gift_subtotal', array( $this, 'convert_amount' ) );
		add_filter( 'ywdpd_maybe_should_be_converted', array( $this, 'convert_amount' ), 99, 1 );
//		add_filter( 'ywdpd_cart_item_display_price', array( $this, 'convert_amount' ), 99, 1 );
		add_filter( 'ywdpd_cart_item_adjusted_price', array( $this, 'convert_amount' ), 99, 1 );
		add_filter( 'ywdpd_cart_rule_get_minimum_subtotal', array( $this, 'convert_amount' ), 99, 1 );
		add_filter( 'ywdpd_cart_rule_get_maximum_subtotal', array( $this, 'convert_amount' ), 99, 1 );
		add_filter( 'yith_wcmcs_apply_currency_filters', array( $this, 'apply_currency_filter' ), 20 );

		if ( is_plugin_active( 'yith-woocommerce-dynamic-pricing-and-discounts-premium/init.php' ) ) {
			add_filter( 'ywdpd_get_discounted_price', array( $this, 'convert_default_currency' ), 99, 1 );

			add_filter( 'ywdpd_set_price_base', array( $this, 'set_the_right_price' ), 10, 2 );
			add_filter( 'ywdpd_cart_item_display_price', array( $this, 'set_the_right_cart_item_price' ), 10, 2 );

			add_action( 'ywdpd_before_calculate_discounts', array( $this, 'remove_filters' ), 1 );
			add_action( 'ywdpd_before_get_price_to_discount', array( $this, 'remove_filters' ), 1 );
			add_action( 'ywdpd_after_calculate_discounts', array( $this, 'add_filters' ), 1 );
			add_action( 'ywdpd_after_get_price_to_discount', array( $this, 'add_filters' ), 1 );

			add_filter( 'ywdpd_advanced_conditions_get_minimum_subtotal', array( $this, 'convert_amount' ), 99, 1 );
			add_filter( 'ywdpd_advanced_conditions_get_maximum_subtotal', array( $this, 'convert_amount' ), 99, 1 );
		} else {
			add_filter( 'ywdpd_cart_item_display_price', array( $this, 'convert_amount' ), 99, 1 );
		}

		/*ywdpd_before_calculate_discounts and ywdpd_after_calculate_discounts hooks called in frontend/price.php*/
	}

	public function convert_amount( $price ) {
		return wmc_get_price( $price );
	}

	public function ywdpd_change_dynamic_price( $price ) {
		return wmc_revert_price( $price );
	}

	public function convert_default_currency( $price ) {
		return wmc_revert_price( $price );
	}

	public function ywdpd_maybe_should_be_converted( $price ) {
		return wmc_get_price( $price );
	}

	public function set_the_right_price( $price, $cart_item ) {
		if ( ! function_exists( 'ywdpd_dynamic_pricing_discounts' )) {
			return $price;
		}
		ywdpd_dynamic_pricing_discounts()->get_frontend_manager()->remove_price_filters();
		$price = (float) wc_get_product( $cart_item['data'] )->get_price();
		ywdpd_dynamic_pricing_discounts()->get_frontend_manager()->add_price_filters();

		return $price;
	}

	public function set_the_right_cart_item_price( $display_price, $cart_item ){
		if ( ! function_exists( 'ywdpd_dynamic_pricing_discounts' )) {
			return $display_price;
		}
		ywdpd_dynamic_pricing_discounts()->get_frontend_manager()->remove_price_filters();
		$price = (float) wc_get_product( $cart_item['data'] )->get_price();
		ywdpd_dynamic_pricing_discounts()->get_frontend_manager()->add_price_filters();

		return $price;
	}

	public function remove_filters() {
		remove_filter( 'ywdpd_maybe_should_be_converted', array( $this, 'convert_amount' ), 99 );
	}

	public function add_filters() {
		add_filter( 'ywdpd_maybe_should_be_converted', array( $this, 'convert_amount' ), 99, 1 );
	}

	public function apply_currency_filter( $apply ) {
		$dynamic_ajax_actions = array(
			'ywdpd_add_gift_to_cart',
			'ywdpd_update_gift_popup',
			'ywdpd_add_special_to_cart',
		);
		$apply                = $apply || isset( $_REQUEST['action'] ) && in_array( $_REQUEST['action'], $dynamic_ajax_actions, true ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		return $apply;
	}
}
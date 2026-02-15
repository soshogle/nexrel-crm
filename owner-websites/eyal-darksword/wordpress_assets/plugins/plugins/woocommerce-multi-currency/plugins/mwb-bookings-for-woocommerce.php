<?php
/**
 * Class WOOMULTI_CURRENCY_Plugin_Mwb_bookings_for_woocommerce
 * Bookings For WooCommerce (Bookings for WooCommerce – Schedule Appointments, Manage Bookings, Show Availability, Calendar Listings)
 * Author: WP Swings
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Mwb_bookings_for_woocommerce {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();

		if ( $this->settings->get_enable() && is_plugin_active( 'mwb-bookings-for-woocommerce/mwb-bookings-for-woocommerce.php' ) ) {
			add_filter( 'mwb_mbfw_change_price_ajax_global_rule', array(
				$this,
				'mwb_mbfw_change_price_ajax_global_rule'
			), 10, 2 );
			add_filter( 'wps_mbfw_set_unit_cost_price_day_single', array(
				$this,
				'wps_mbfw_set_unit_cost_price_day_single'
			), 10, 4 );
			add_filter( 'wps_mbfw_set_unit_cost_price_hour', array(
				$this,
				'wps_mbfw_set_unit_cost_price_hour'
			), 10, 5 );
			add_filter( 'wps_mbfw_set_unit_cost_price_day', array( $this, 'wps_mbfw_set_unit_cost_price_day' ), 10, 5 );

			add_filter( 'mwb_mbfw_vary_product_base_price', array( $this, 'mwb_mbfw_vary_product_base_price' ), 10, 4 );
//			add_filter( 'mwb_mbfw_vary_product_unit_price', array( $this, 'mwb_mbfw_vary_product_unit_price' ), 10, 4 );

			add_filter( 'mbfw_set_price_individually_during_adding_in_cart', array( $this, 'mbfw_set_price_individually_during_adding_in_cart' ), 10, 4 );
		}
	}

	public function mwb_mbfw_change_price_ajax_global_rule( $price, $mwb_data ) {

		return wmc_get_price( $price );
	}

	public function wps_mbfw_set_unit_cost_price_day_single( $product_price, $product_id, $booking_dates, $unit ) {

		return wmc_get_price( $product_price );
	}

	public function wps_mbfw_set_unit_cost_price_hour( $product_price, $product_id, $date_time_from, $date_time_to, $unit ) {

		return wmc_get_price( $product_price );
	}

	public function wps_mbfw_set_unit_cost_price_day( $product_price, $product_id, $date_time_from, $date_time_to, $unit ) {

		return wmc_get_price( $product_price );
	}

	public function mwb_mbfw_vary_product_base_price( $base_price, $custom_cart_data, $cart_object, $cart ) {
		remove_filter( 'mwb_mbfw_change_price_ajax_global_rule', array( $this, 'mwb_mbfw_change_price_ajax_global_rule' ), 10 );
		remove_filter( 'wps_mbfw_set_unit_cost_price_day_single', array( $this, 'wps_mbfw_set_unit_cost_price_day_single' ), 10 );
		remove_filter( 'wps_mbfw_set_unit_cost_price_hour', array( $this, 'wps_mbfw_set_unit_cost_price_hour' ), 10 );
		remove_filter( 'wps_mbfw_set_unit_cost_price_day', array( $this, 'wps_mbfw_set_unit_cost_price_day' ), 10 );

		return $base_price;
//		return wmc_get_price( $base_price );
	}

	public function mwb_mbfw_vary_product_unit_price( $unit_price, $custom_cart_data, $cart_object, $cart ) {

		return wmc_get_price( $unit_price );
	}

	public function mbfw_set_price_individually_during_adding_in_cart( $new_price, $custom_cart_data, $cart_object ) {
		add_filter( 'mwb_mbfw_change_price_ajax_global_rule', array(
			$this,
			'mwb_mbfw_change_price_ajax_global_rule'
		), 10, 2 );
		add_filter( 'wps_mbfw_set_unit_cost_price_day_single', array(
			$this,
			'wps_mbfw_set_unit_cost_price_day_single'
		), 10, 4 );
		add_filter( 'wps_mbfw_set_unit_cost_price_hour', array(
			$this,
			'wps_mbfw_set_unit_cost_price_hour'
		), 10, 5 );
		add_filter( 'wps_mbfw_set_unit_cost_price_day', array( $this, 'wps_mbfw_set_unit_cost_price_day' ), 10, 5 );

		return wmc_revert_price( $new_price );
	}
}
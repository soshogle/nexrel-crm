<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Woocommerce_Appointments
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Woocommerce_Appointments {
	protected static $settings;

	public function __construct() {
		self::$settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( is_plugin_active( 'woocommerce-appointments/woocommerce-appointments.php' ) ) {
			add_filter( 'wc_appointments_adjust_addon_cost', array(
				$this,
				'wc_appointments_adjust_addon_cost'
			), 10, 4 );
			add_filter( 'appointments_calculated_product_price', array(
				$this,
				'appointments_calculated_product_price'
			), 10, 4 );
		}
	}

	public function wc_appointments_adjust_addon_cost( $adjusted_cost, $appointment_cost, $product, $posted ) {
		if ( self::$settings->get_current_currency() !== self::$settings->get_default_currency() ) {
			// Get addon cost.
			$addon_cost = $posted['wc_appointments_field_addons_cost'] ?? 0;

			// Adjust.
			if ( $addon_cost !== 0 ) {
				$adjusted_cost = floatval( $appointment_cost ) + wmc_revert_price( $addon_cost );
				$adjusted_cost = $adjusted_cost > 0 ? $adjusted_cost : 0; #turn negative cost to zero.
				// Do nothing.
			} else {
				$adjusted_cost = $appointment_cost;
			}
		}

		return $adjusted_cost;
	}

	public function appointments_calculated_product_price( $product_price, $product, $posted ) {
		if ( isset( $_REQUEST['_woo_multi_currency_nonce'] ) && ! wp_verify_nonce( wc_clean( wp_unslash( $_REQUEST['_woo_multi_currency_nonce'] ) ), 'wmc_plugin_nonce' ) ) {
			return $product_price;
		}
		if ( isset( $_REQUEST['action'] ) && wc_clean( wp_unslash( $_REQUEST['action'] ) ) == 'wc_appointments_calculate_costs' ) {

			return $product_price;
		}
		$current_currency = self::$settings->get_current_currency();
		if ( $current_currency !== self::$settings->get_default_currency() ) {
			if ( self::$settings->check_fixed_price() ) {
				return $product->get_data()['price'];
			} else {
				return wmc_revert_price( $product_price );
			}
		}

		return $product_price;
	}

	public function get_fixed_price( $product, $currency ) {
		$id = $product->get_id();

		$product_price = wmc_adjust_fixed_price( json_decode( $product->get_meta( '_regular_price_wmcp', true ), true ) );
		$sale_price    = wmc_adjust_fixed_price( json_decode( $product->get_meta( '_sale_price_wmcp', true ), true ) );

		if ( isset( $product_price[ $currency ] ) && ! $product->is_on_sale() ) {
			if ( $product_price[ $currency ] > 0 ) {

				return $product_price[ $currency ];
			}
		} elseif ( isset( $sale_price[ $currency ] ) ) {
			if ( $sale_price[ $currency ] > 0 ) {

				return $sale_price[ $currency ];
			}
		}

		return $product->get_price();
	}
}
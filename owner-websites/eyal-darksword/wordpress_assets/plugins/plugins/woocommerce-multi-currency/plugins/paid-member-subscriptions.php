<?php

/**
 * Class WOOMULTI_CURRENCY_Plugin_Paid_Member_Subscriptions
 * Membership & Content Restriction – Paid Member Subscriptions
 * Author Cozmoslabs
 * This plugin has custom currency setting, need more wc filter to change display currency
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_Paid_Member_Subscriptions {
	protected $settings;

	public function __construct() {
		$this->settings = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() && is_plugin_active( 'paid-member-subscriptions/index.php' ) ) {
			add_filter( 'pms_format_price', array( $this, 'pms_format_price' ), 10, 4 );
			add_filter( 'pms_format_price_before_html', array( $this, 'pms_format_price_before_html' ), 10, 3 );
			//cannot convert
//			add_filter( 'woocommerce_order_subtotal_to_display', array( $this, 'pms_format_price_order_subtotal' ), 10, 3 );
//			add_filter( 'woocommerce_get_formatted_order_total', array( $this, 'pms_format_price_order_total' ), 10, 2 );
		}
	}

	public function pms_format_price( $output, $price, $currency, $args ) {
		$selected_currencies = $this->settings->get_list_currencies();
		$c_currency = $this->settings->get_current_currency();
		if ( isset( $selected_currencies[ $c_currency ] ) && isset( $selected_currencies[ $c_currency ]['custom'] ) && $selected_currencies[ $c_currency ]['custom'] != '' ) {
			$currency_symbol = $selected_currencies[ $c_currency ]['custom'];
			$output = str_replace($currency, $currency_symbol, $output);

			return $output;
		}

		$output = str_replace($currency, get_woocommerce_currency_symbol(), $output);

		return $output;
	}

	public function pms_format_price_order_total( $formatted_total, $this_order ) {
		$c_currency = $this->settings->get_current_currency();
		$d_currency = $this->settings->get_default_currency();
		$c_order_price = $this_order->get_total();
		if ( $c_currency != $d_currency ) {
			$c_order_price = wmc_get_price( $c_order_price );
		}

		$output = wc_price( $c_order_price, array( 'currency' => $c_currency ) );

		return $output;
	}

	public function pms_format_price_order_subtotal( $subtotal, $compound, $this_order ) {
		$tax_display = get_option( 'woocommerce_tax_display_cart' );
		//get_cart_subtotal_for_order is a protected function, cannot use it here
		$subtotal    = $this_order->get_cart_subtotal_for_order();

		if ( ! $compound ) {
			if ( 'incl' === $tax_display ) {
				$subtotal_taxes = 0;
				foreach ( $this_order->get_items() as $item ) {
					$subtotal_taxes += WC_Order::round_line_tax( $item->get_subtotal_tax(), false );
				}
				$subtotal += wc_round_tax_total( $subtotal_taxes );
			}

			$subtotal = self::format_price_before_html( $subtotal );

			if ( 'excl' === $tax_display && $this_order->get_prices_include_tax() && wc_tax_enabled() ) {
				$subtotal .= ' <small class="tax_label">' . WC()->countries->ex_tax_or_vat() . '</small>';
			}
		} else {
			if ( 'incl' === $tax_display ) {
				return '';
			}

			// Add Shipping Costs.
			$subtotal += $this_order->get_shipping_total();

			// Remove non-compound taxes.
			foreach ( $this_order->get_taxes() as $tax ) {
				if ( $tax->is_compound() ) {
					continue;
				}
				$subtotal = $subtotal + $tax->get_tax_total() + $tax->get_shipping_tax_total();
			}

			// Remove discounts.
			$subtotal = $subtotal - $this_order->get_total_discount();
			$subtotal = self::format_price_before_html( $subtotal );
		}

		return $subtotal;
	}

	public function format_price_before_html( $price ) {
		$c_currency = $this->settings->get_current_currency();
		$d_currency = $this->settings->get_default_currency();
		if ( $c_currency != $d_currency ) {
			$price = wmc_get_price( $price );
		}

		$output = wc_price( $price, array( 'currency' => $c_currency ) );

		return $output;
	}

	public function pms_format_price_before_html( $price, $currency, $args ) {
		$output = wmc_get_price( $price );

		return $output;
	}
}
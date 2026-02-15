<?php
/**
 * Class FreeShippingCalculatorCallback
 *
 * @package WPDesk\FSPro\TableRate\ShippingMethod
 */

namespace WPDesk\FSPro\TableRate\ShippingMethod;

use FSProVendor\WPDesk\FS\TableRate\Settings\MethodSettings;
use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WPDesk\FSPro\TableRate\Settings\ProMethodSettingsFactory;
use WPDesk\FSPro\TableRate\Settings\ProMethodSettingsImplementation;

/**
 * Can calculate free shipping.
 */
class FreeShippingCalculatorCallback implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/shipping-method/free-shipping-callback', array( $this, 'prepare_free_shipping_callback' ), 10, 2 );
	}

	/**
	 * @param callable $callback .
	 * @param array    $shipping_method_settings .
	 */
	public function prepare_free_shipping_callback( $callback, $shipping_method_settings ) {
		return array( $this, 'is_free_shipping' );
	}

	/**
	 * @param array $shipping_method_settings .
	 * @param float $cart_contents_cost .
	 *
	 * @return bool
	 */
	public function is_free_shipping( $shipping_method_settings, $cart_contents_cost ) {
		$shipping_method       = ProMethodSettingsFactory::create_from_array( $shipping_method_settings );
		$cart                  = WC()->cart;
		$is_free_shipping      = false;
		$free_shipping_setting = (float) $shipping_method->get_free_shipping();

		if ( $free_shipping_setting ) {
			$free_shipping_setting = apply_filters( 'flexible_shipping_value_in_currency', $free_shipping_setting );
		}

		if ( $this->method_free_shipping_ignore_discounts( $shipping_method ) ) {
			$cart_contents_cost += $cart->get_discount_total();
			if ( $cart->display_prices_including_tax() ) {
				$cart_contents_cost += $cart->get_discount_tax();
			}
		}
		$method_free_shipping_requires = $this->method_free_shipping_requires( $shipping_method );

		if ( 'order_amount' === $method_free_shipping_requires || 'order_amount_or_coupon' === $method_free_shipping_requires ) {
			if ( $free_shipping_setting && $free_shipping_setting <= $cart_contents_cost ) {
				$is_free_shipping = true;
			}
		}

		if ( 'order_amount' !== $method_free_shipping_requires ) {
			if ( $this->is_free_shipping_coupon_in_cart() ) {
				if ( 'coupon' === $method_free_shipping_requires || 'order_amount_or_coupon' === $method_free_shipping_requires ) {
					$is_free_shipping = true;
				}
				if ( 'order_amount_and_coupon' === $method_free_shipping_requires ) {
					if ( $free_shipping_setting && $free_shipping_setting <= $cart_contents_cost ) {
						$is_free_shipping = true;
					}
				}
			}
		}

		return $is_free_shipping;
	}

	/**
	 * Method free shipping requires option.
	 *
	 * @param ProMethodSettingsImplementation $shipping_method .
	 *
	 * @return string
	 */
	private function method_free_shipping_requires( ProMethodSettingsImplementation $shipping_method ) {
		$free_shipping_requires = $shipping_method->get_free_shipping_requires();
		if ( empty( $free_shipping_requires ) ) {
			return 'order_amount';
		} else {
			return $free_shipping_requires;
		}
	}

	/**
	 * Method free shipping ignore discounts?
	 *
	 * @param ProMethodSettingsImplementation $shipping_method Flexible shipping method settings.
	 *
	 * @return bool
	 */
	private function method_free_shipping_ignore_discounts( ProMethodSettingsImplementation $shipping_method ) {
		return 'yes' === $shipping_method->get_free_shipping_ignore_discounts();
	}

	/**
	 * Is free shipping coupon in cart?
	 *
	 * @return bool
	 */
	private function is_free_shipping_coupon_in_cart() {
		$has_coupon = false;
		$discounts  = new \WC_Discounts( WC()->cart );

		$coupons = WC()->cart->get_coupons();
		if ( $coupons ) {
			foreach ( $coupons as $code => $coupon ) {
				/** @var $coupon \WC_Coupon $coupon */
				try {
					$is_valid = $discounts->is_coupon_valid( $coupon );
					if ( is_wp_error( $is_valid ) ) {
						$is_valid = false;
					}
				} catch ( \Exception $e ) {
					$is_valid = false;
				}

				if ( $is_valid && $coupon->get_free_shipping() ) {
					$has_coupon = true;
					break;
				}
			}
		}

		return $has_coupon;
	}

}

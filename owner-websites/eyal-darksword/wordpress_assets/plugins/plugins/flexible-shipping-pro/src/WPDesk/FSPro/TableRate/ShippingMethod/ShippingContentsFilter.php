<?php
/**
 * Class ShippingContentsFilter
 *
 * @package WPDesk\FSPro\TableRate\ShippingMethod
 */

namespace WPDesk\FSPro\TableRate\ShippingMethod;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WPDesk\FS\TableRate\Rule\ShippingContents\DestinationAddressFactory;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContentsImplementation;

/**
 * Provides shipping contents depended on shipping method settings.
 */
class ShippingContentsFilter implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible_shipping_shipping_contents', array( $this, 'get_shipping_contents_based_on_settings' ), 10, 4 );
	}

	/**
	 * @param ShippingContents $shipping_contents .
	 * @param array            $shipping_method_settings .
	 * @param \WC_Cart         $cart .
	 * @param array            $package .
	 *
	 * @return ShippingContents
	 */
	public function get_shipping_contents_based_on_settings( ShippingContents $shipping_contents, array $shipping_method_settings, $cart, $package ) {
		if ( isset( $shipping_method_settings['cart_calculation'] ) && 'package' === $shipping_method_settings['cart_calculation'] ) {
			$cost_rounding_precision = wc_get_price_decimals();
			$prices_includes_tax     = $this->prices_include_tax();
			$shipping_contents       = new ShippingContentsImplementation(
				$package['contents'],
				$prices_includes_tax,
				$cost_rounding_precision,
				DestinationAddressFactory::create_from_package_destination( $package['destination'] ),
				get_woocommerce_currency()
			);
		}

		return $shipping_contents;
	}

	/**
	 * @return bool
	 */
	private function prices_include_tax() {
		return (bool) apply_filters( 'flexible_shipping_prices_include_tax', WC()->cart->display_prices_including_tax() );
	}

}

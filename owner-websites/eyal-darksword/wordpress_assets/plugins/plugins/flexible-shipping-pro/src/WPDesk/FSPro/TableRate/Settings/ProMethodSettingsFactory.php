<?php
/**
 * Method Factory.
 *
 * @package WPDesk\FS\TableRate\Settings
 */

namespace WPDesk\FSPro\TableRate\Settings;

use FSProVendor\WPDesk\FS\TableRate\Settings\IntegrationSettingsFactory;
use FSProVendor\WPDesk\FS\TableRate\Settings\MethodSettings;

/**
 * Can create Method.
 */
class ProMethodSettingsFactory {

	/**
	 * @param array $shipping_method_array .
	 *
	 * @return ProMethodSettingsImplementation
	 */
	public static function create_from_array( $shipping_method_array ) {
		return new ProMethodSettingsImplementation(
			$shipping_method_array,
			isset( $shipping_method_array['id'] ) ? $shipping_method_array['id'] : 'no',
			isset( $shipping_method_array['method_enabled'] ) ? $shipping_method_array['method_enabled'] : 'no',
			isset( $shipping_method_array['method_title'] ) ? $shipping_method_array['method_title'] : '',
			isset( $shipping_method_array['method_description'] ) ? $shipping_method_array['method_description'] : '',
			isset( $shipping_method_array['tax_status'] ) ? $shipping_method_array['tax_status'] : '',
			isset( $shipping_method_array['prices_include_tax'] ) ? $shipping_method_array['prices_include_tax'] : '',
			isset( $shipping_method_array['method_free_shipping_requires'] ) ? $shipping_method_array['method_free_shipping_requires'] : '',
			isset( $shipping_method_array['method_free_shipping'] ) ? $shipping_method_array['method_free_shipping'] : '',
			isset( $shipping_method_array['method_free_shipping_ignore_discounts'] ) ? $shipping_method_array['method_free_shipping_ignore_discounts'] : '',
			isset( $shipping_method_array['method_free_shipping_label'] ) ? $shipping_method_array['method_free_shipping_label'] : '',
			isset( $shipping_method_array['method_free_shipping_cart_notice'] ) ? $shipping_method_array['method_free_shipping_cart_notice'] : 'no',
			isset( $shipping_method_array['method_max_cost'] ) ? $shipping_method_array['method_max_cost'] : '',
			isset( $shipping_method_array['method_calculation_method'] ) ? $shipping_method_array['method_calculation_method'] : 'sum',
			! empty( $shipping_method_array['cart_calculation'] ) ? $shipping_method_array['cart_calculation'] : 'cart',
			isset( $shipping_method_array['method_visibility'] ) ? $shipping_method_array['method_visibility'] : 'no',
			isset( $shipping_method_array['method_default'] ) ? $shipping_method_array['method_default'] : 'no',
			isset( $shipping_method_array['method_debug_mode'] ) ? $shipping_method_array['method_debug_mode'] : 'no',
			isset( $shipping_method_array['method_integration'] ) ? $shipping_method_array['method_integration'] : 'no',
			IntegrationSettingsFactory::create_from_shipping_method_settings( $shipping_method_array ),
			isset( $shipping_method_array['method_rules'] ) && is_array( $shipping_method_array['method_rules'] ) ? $shipping_method_array['method_rules'] : []
		);
	}

	/**
	 * .
	 *
	 * @param array  $shipping_method_array .
	 * @param string $tax_status .
	 *
	 * @return ProMethodSettingsImplementation
	 */
	public static function create_from_array_and_tax_status( $shipping_method_array, $tax_status ) {
		$shipping_method_array['tax_status'] = $tax_status;
		return self::create_from_array( $shipping_method_array );
	}


}

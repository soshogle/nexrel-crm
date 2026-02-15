<?php
/**
 * Class WOOMULTI_CURRENCY_Plugin_WooCommerce_gateway_amazon_payments_advanced
 * Author: WooCommerce
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WOOMULTI_CURRENCY_Plugin_WooCommerce_gateway_amazon_payments_advanced {
	protected $settings;

	public $compatible_wmc;

	public function __construct() {
		$this->compatible_wmc = array(
			'class_WOOMULTI_CURRENCY' => 'CURCY - WooCommerce Multi Currency Premium',
		);
		$this->settings       = WOOMULTI_CURRENCY_Data::get_ins();
		if ( $this->settings->get_enable() && is_plugin_active( 'woocommerce-gateway-amazon-payments-advanced/woocommerce-gateway-amazon-payments-advanced.php' ) ) {
			add_filter( 'woocommerce_amazon_pa_ml_compat_plugins', array(
				$this,
				'woocommerce_amazon_pa_ml_compat_plugins'
			) );
			add_filter( 'woocommerce_amazon_pa_matched_compat_plugin_class_WOOMULTI_CURRENCY', array(
				$this,
				'woocommerce_amazon_pa_matched_compat_plugin_class_WOOMULTI_CURRENCY'
			) );
			add_filter( 'woocommerce_amazon_pa_compat_plugin_instance_class_WOOMULTI_CURRENCY', array(
				$this,
				'woocommerce_amazon_pa_compat_plugin_instance_class_WOOMULTI_CURRENCY'
			), 10, 2 );
		}
	}

	function woocommerce_amazon_pa_ml_compat_plugins( $already_compatible_plugins ) {
		foreach ( $this->compatible_wmc as $definition_name => $name ) {
			if ( isset( $already_compatible_plugins[ $definition_name ] ) ) {
				continue;
			}

			$already_compatible_plugins[ $definition_name ] = $name;
		}

		return $already_compatible_plugins;
	}

	function woocommerce_amazon_pa_matched_compat_plugin_class_WOOMULTI_CURRENCY( $instance_exists_already ) {
		if ( $instance_exists_already ) {
			return $instance_exists_already;
		}

		// If the conditions are met, then we return true to tell the plugin that the instance is available.
		return true;
	}

	function woocommerce_amazon_pa_compat_plugin_instance_class_WOOMULTI_CURRENCY( $found_plugin_instance, $init ) {
		if ( null !== $found_plugin_instance ) {
			return $found_plugin_instance;
		}

		// We make sure that the WooCommerce Amazon Pay plugin has already loaded the abstract class we will be extending in our own implementation.
		if ( ! class_exists( 'WC_Amazon_Payments_Advanced_Multi_Currency_Abstract' ) ) {
			return $found_plugin_instance;
		}

		require_once __DIR__ . '/woocommerce-gateway-amazon-payments-advanced/class-wc-amazon-payments-advanced-multi-currency-curcy.php';

		return $init ? new WC_Amazon_Payments_Advanced_Multi_Currency_Curcy() : WC_Amazon_Payments_Advanced_Multi_Currency_Curcy::class;
	}
}
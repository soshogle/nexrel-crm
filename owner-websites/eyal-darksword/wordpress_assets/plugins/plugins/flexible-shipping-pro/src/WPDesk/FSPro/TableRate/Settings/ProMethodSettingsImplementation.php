<?php
/**
 * Method Settings Implementation.
 *
 * @package WPDesk\FS\TableRate\Settings
 */

namespace WPDesk\FSPro\TableRate\Settings;

use FSProVendor\WPDesk\FS\TableRate\Settings\IntegrationSettingsImplementation;
use FSProVendor\WPDesk\FS\TableRate\Settings\RuleSettings;
use WPDesk\FSPro\TableRate\CalculationMethodOptions;
use WPDesk\FSPro\TableRate\CartCalculationOptions;
use WPDesk\FSPro\TableRate\FreeShipping\FreeShippingRequiresOptions;

/**
 * Class MethodSettingsImplementation
 */
class ProMethodSettingsImplementation extends \FSProVendor\WPDesk\FS\TableRate\Settings\MethodSettingsImplementation {

	/**
	 * @var string
	 */
	private $free_shipping_requires;

	/**
	 * @var string
	 */
	private $free_shipping_ignore_discounts;

	/**
	 * @var string
	 */
	private $max_cost;

	/**
	 * @var string
	 */
	private $cart_calculation;

	/**
	 * MethodSettingsImplementation constructor.
	 *
	 * @param array                             $raw_settings .
	 * @param string                            $id .
	 * @param string                            $enabled .
	 * @param string                            $title .
	 * @param string                            $description .
	 * @param string                            $tax_status .
	 * @param string                            $prices_include_tax .
	 * @param string                            $free_shipping_requires .
	 * @param string                            $free_shipping .
	 * @param string                            $free_shipping_ignore_discounts .
	 * @param string                            $free_shipping_label .
	 * @param string                            $free_shipping_cart_notice .
	 * @param string                            $max_cost .
	 * @param string                            $calculation_method .
	 * @param string                            $cart_calculation .
	 * @param string                            $visibility .
	 * @param string                            $default .
	 * @param string                            $debug_mode .
	 * @param string                            $integration .
	 * @param IntegrationSettingsImplementation $integration_settings .
	 * @param array                             $rules_settings .
	 */
	public function __construct(
		array $raw_settings,
		$id,
		$enabled,
		$title,
		$description,
		$tax_status,
		$prices_include_tax,
		$free_shipping_requires,
		$free_shipping,
		$free_shipping_ignore_discounts,
		$free_shipping_label,
		$free_shipping_cart_notice,
		$max_cost,
		$calculation_method,
		$cart_calculation,
		$visibility,
		$default,
		$debug_mode,
		$integration,
		IntegrationSettingsImplementation $integration_settings,
		array $rules_settings
	) {
		parent::__construct( $raw_settings, $id, $enabled, $title, $description, $tax_status, $prices_include_tax, $free_shipping, $free_shipping_label, $free_shipping_cart_notice, $calculation_method, $cart_calculation, $visibility, $default, $debug_mode, $integration, $integration_settings, $rules_settings );
		$this->free_shipping_requires         = $free_shipping_requires;
		$this->free_shipping_ignore_discounts = $free_shipping_ignore_discounts;
		$this->max_cost                       = $max_cost;
		$this->cart_calculation               = $cart_calculation;
	}

	/**
	 * @return string
	 */
	public function get_free_shipping_requires() {
		return $this->free_shipping_requires;
	}

	/**
	 * @return string
	 */
	public function get_free_shipping_ignore_discounts() {
		return $this->free_shipping_ignore_discounts;
	}

	/**
	 * @return string
	 */
	public function get_max_cost() {
		return $this->max_cost;
	}

	/**
	 * @return string
	 */
	public function get_cart_calculation() {
		return $this->cart_calculation;
	}

	/**
	 * @return string
	 */
	public function format_for_log() {
		return sprintf(
			// Translators: shipping method settings.
			__( 'Method settings:%1$s Enabled: %2$s Method Title: %3$s Method Description: %4$s Tax status: %5$s Costs includes tax: %6$s Free Shipping requires: %7$s Free Shipping: %8$s Coupons discounts (Apply minimum order rule before coupon discount): %9$s Free Shipping Label: %10$s \'Left to free shipping\' notice: %11$s Maximum Cost: %12$s Rules Calculation: %13$s Cart calculation: %14$s Visibility (Show only for logged in users): %15$s Default: %16$s Debug mode: %17$s', 'flexible-shipping-pro' ),
			"\n",
			$this->get_as_translated_checkbox_value( $this->get_enabled() ) . "\n",
			$this->get_title() . "\n",
			$this->get_description() . "\n",
			$this->get_tax_status_translated() . "\n",
			$this->get_prices_include_tax() . "\n",
			( new FreeShippingRequiresOptions() )->get_option_label( $this->get_free_shipping_requires() ) . "\n",
			$this->get_free_shipping() . "\n",
			$this->get_as_translated_checkbox_value( $this->get_free_shipping_ignore_discounts() ) . "\n",
			$this->get_free_shipping_label() . "\n",
			$this->get_as_translated_checkbox_value( $this->get_free_shipping_cart_notice() ) . "\n",
			$this->get_max_cost() . "\n",
			( new CalculationMethodOptions() )->get_option_label( $this->get_calculation_method() ) . "\n",
			( new CartCalculationOptions() )->get_option_label( $this->get_cart_calculation() ) . "\n",
			$this->get_as_translated_checkbox_value( $this->get_visible() ) . "\n",
			$this->get_as_translated_checkbox_value( $this->get_default() ) . "\n",
			$this->get_as_translated_checkbox_value( $this->get_debug_mode() ) . "\n"
		) . $this->get_integration_settings()->format_for_log();
	}

}

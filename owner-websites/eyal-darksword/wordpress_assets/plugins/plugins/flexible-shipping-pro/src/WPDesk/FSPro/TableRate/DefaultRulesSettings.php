<?php
/**
 * Class DefaultRulesSettings
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WPDesk\FS\TableRate\Rule\Condition\Price;

/**
 * Can modify default rule settings.
 */
class DefaultRulesSettings implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/shipping-method/default-rules-settings', array( $this, 'append_additional_settings_to_default' ) );
	}

	/**
	 * @param array $default_rule_settings .
	 *
	 * @return array
	 *
	 * @internal
	 */
	public function append_additional_settings_to_default( $default_rule_settings ) {
		foreach ( $default_rule_settings as $key => $rule_setting ) {
			$default_rule_settings[ $key ]['additional_costs'] = array( array( 'based_on' => Price::CONDITION_ID ) );
		}

		return $default_rule_settings;
	}
}

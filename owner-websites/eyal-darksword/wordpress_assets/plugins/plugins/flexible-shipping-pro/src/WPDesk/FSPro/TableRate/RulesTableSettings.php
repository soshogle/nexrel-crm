<?php
/**
 * Class RulesTableSettings
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can change rules table settings.
 */
class RulesTableSettings implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible_shipping_rules_table_settings', array( $this, 'enable_multiple_conditions' ) );
	}

	/**
	 * @param array $rules_table_settings .
	 *
	 * @return array
	 */
	public function enable_multiple_conditions( array $rules_table_settings ) {
		$rules_table_settings['multiple_conditions_available']       = true;
		$rules_table_settings['multiple_additional_costs_available'] = true;
		$rules_table_settings['special_actions_available']           = true;

		return $rules_table_settings;
	}

}


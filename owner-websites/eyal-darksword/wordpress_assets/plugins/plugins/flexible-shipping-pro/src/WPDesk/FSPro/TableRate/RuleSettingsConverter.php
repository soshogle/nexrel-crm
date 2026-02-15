<?php
/**
 * Class RuleSettingsHooks
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Rule settings.
 */
class RuleSettingsConverter implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible_shipping_converted_rule_settings', array( $this, 'convert_settings_if_old_format' ), 10, 2 );
	}

	/**
	 * Convert settings from old format.
	 *
	 * @param array $converted_rule_settings .
	 * @param array $rule_settings .
	 *
	 * @return mixed
	 */
	public function convert_settings_if_old_format( $converted_rule_settings, $rule_settings ) {
		if ( isset( $rule_settings['based_on'] ) && in_array( $rule_settings['based_on'], array( 'item', 'cart_line_item' ), true )
			&& ( ! empty( $rule_settings['min'] ) || ! empty( $rule_settings['max'] ) )
		) {
			$converted_rule_settings['conditions'][] = array(
				'condition_id' => $rule_settings['based_on'],
				'min'          => isset( $rule_settings['min'] ) ? $rule_settings['min'] : '',
				'max'          => isset( $rule_settings['max'] ) ? $rule_settings['max'] : '',
			);
		}
		if ( ! empty( $rule_settings['shipping_class'] ) && is_array( $rule_settings['shipping_class'] )
			&& ( count( $rule_settings['shipping_class'] ) > 1 || ShippingClass::ALL_PRODUCTS !== $rule_settings['shipping_class'][0] )
		) {
			$converted_rule_settings['conditions'][] = array(
				'condition_id'   => 'shipping_class',
				'shipping_class' => $rule_settings['shipping_class'],
			);
		}
		unset( $converted_rule_settings['shipping_class'] );

		if ( ! empty( $rule_settings['cost_additional'] ) || ! empty( $rule_settings['per_value'] ) ) {
			$converted_rule_settings['additional_costs'][] = array(
				'additional_cost' => isset( $rule_settings['cost_additional'] ) ? $rule_settings['cost_additional'] : '',
				'per_value'       => isset( $rule_settings['per_value'] ) ? $rule_settings['per_value'] : '',
				'based_on'        => isset( $rule_settings['based_on'] ) ? $rule_settings['based_on'] : '',
			);
		}
		unset( $converted_rule_settings['cost_additional'] );
		unset( $converted_rule_settings['per_value'] );

		if ( ! empty( $rule_settings['stop'] ) && 1 === (int) $rule_settings['stop'] ) {
			$converted_rule_settings['special_action'] = 'stop';
		}

		if ( ! empty( $rule_settings['cancel'] ) && 1 === (int) $rule_settings['cancel'] ) {
			$converted_rule_settings['special_action'] = 'cancel';
		}

		unset( $converted_rule_settings['stop'] );
		unset( $converted_rule_settings['cancel'] );

		return $converted_rule_settings;
	}

}

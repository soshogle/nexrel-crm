<?php
/**
 * Class RuleAdditionalCostHooks
 *
 * @package WPDesk\FSPro\TableRate\RuleCost
 */

namespace WPDesk\FSPro\TableRate\RuleCost;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use FSVendor\WPDesk\Forms\Field;
use FSVendor\WPDesk\Forms\Field\InputTextField;
use FSVendor\WPDesk\Forms\Field\SelectField;
use WPDesk\FSPro\TableRate\RuleCost\Cost\BasedOnDimensionalWeight;
use WPDesk\FSPro\TableRate\RuleCost\Cost\BasedOnItem;
use WPDesk\FSPro\TableRate\RuleCost\Cost\BasedOnCartLineItem;
use WPDesk\FSPro\TableRate\RuleCost\Cost\BasedOnValue;
use WPDesk\FSPro\TableRate\RuleCost\Cost\BasedOnVolume;
use WPDesk\FSPro\TableRate\RuleCost\Cost\BasedOnWeight;

/**
 * Additional costs.
 */
class RuleAdditionalCostHooks implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible_shipping_rule_additional_cost', [ $this, 'add_rule_additional_cost_fields' ] );
	}

	/**
	 * @param Field[] $rule_additional_cost_fields .
	 *
	 * @return Field[]
	 */
	public function add_rule_additional_cost_fields( array $rule_additional_cost_fields ) {
		$value              = new BasedOnValue( wc_get_price_decimals() );
		$weight             = new BasedOnWeight();
		$item               = new BasedOnItem();
		$cart_line_item     = new BasedOnCartLineItem();
		$dimensional_weight = new BasedOnDimensionalWeight();
		$volume             = new BasedOnVolume();

		$rule_additional_cost_fields[ $value->get_based_on() ]              = $value;
		$rule_additional_cost_fields[ $weight->get_based_on() ]             = $weight;
		$rule_additional_cost_fields[ $dimensional_weight->get_based_on() ] = $dimensional_weight;
		$rule_additional_cost_fields[ $item->get_based_on() ]               = $item;
		$rule_additional_cost_fields[ $cart_line_item->get_based_on() ]     = $cart_line_item;
		$rule_additional_cost_fields[ $volume->get_based_on() ]             = $volume;

		return $rule_additional_cost_fields;
	}

}

<?php
/**
 * Class PreconfiguredScenarios Pro
 *
 * @package WPDesk\FSPro\TableRate\Rule\PreconfiguredScenarios
 */

namespace WPDesk\FSPro\TableRate\Rule\PreconfiguredScenarios;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;
use WPDesk\FS\TableRate\Rule\PreconfiguredScenarios\PredefinedScenario;

/**
 * Can provide preconfigured scenarios.
 */
class PreconfiguredScenariosPro implements Hookable {

	/**
	 * .
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/method-rules/predefined-scenarios', [ $this, 'append_predefined_scenarios' ] );
	}

	/**
	 * @param PredefinedScenario[] $scenarios .
	 *
	 * @return PredefinedScenario[]
	 */
	public function append_predefined_scenarios( array $scenarios ) {
		$scenarios = $this->add_price_scenarios( $scenarios );
		$scenarios = $this->add_shipping_class_scenarios( $scenarios );
		$scenarios = $this->add_additional_costs_scenarions( $scenarios );

		return $scenarios;
	}

	/**
	 * @param PredefinedScenario[] $scenarios .
	 *
	 * @return PredefinedScenario[]
	 */
	private function add_additional_costs_scenarions( array $scenarios ) {
		if ( $this->is_shipping_class_scenarios_available() ) {
			$scenarios['progressive_weight_based_shipping'] = $this->prepare_progressive_weight_based_shipping_scenario();
		}

		return $scenarios;
	}

	/**
	 * @param PredefinedScenario[] $scenarios .
	 *
	 * @return PredefinedScenario[]
	 */
	private function add_price_scenarios( array $scenarios ) {
		$url = $this->is_pl() ? 'https://octol.io/fs-percentage-cost-pl' : 'https://octol.io/fs-percentage-cost';

		$scenarios['cart_percentage'] = new PredefinedScenario(
			__( 'Price', 'flexible-shipping-pro' ),
			__( 'Shipping cost as a percentage of order’s value', 'flexible-shipping-pro' ),
			__( 'Shipping cost always equals 15% of cart total price.', 'flexible-shipping-pro' ),
			$url,
			'[{"conditions":[{"condition_id":"value","min":"","max":""}],"cost_per_order":"","additional_costs":[{"additional_cost":"0.0015","per_value":"0.01","based_on":"value"}],"special_action":"none"}]'
		);

		$scenarios['extra_cost_for_every_item'] = $this->prepare_extra_cost_for_every_item_scenario();

		return $scenarios;
	}

	/**
	 * @param PredefinedScenario[] $scenarios .
	 *
	 * @return PredefinedScenario[]
	 */
	private function add_shipping_class_scenarios( array $scenarios ) {
		if ( $this->is_shipping_class_scenarios_available() ) {
			$scenarios['combining_shipping_classes']            = $this->prepare_combining_shipping_classes_scenario();
			$scenarios['disable_or_hide_shipping_method']       = $this->prepare_disable_or_hide_shipping_method_scenario();
			$scenarios['combining_cost_calculation_conditions'] = $this->prepare_combining_cost_calculation_conditions_scenario();
		}

		return $scenarios;
	}

	/**
	 * @return PredefinedScenario
	 */
	private function prepare_combining_shipping_classes_scenario() {
		$url = $this->is_pl() ? 'https://octol.io/fs-combine-classes-pl' : 'https://octol.io/fs-combine-classes';
		$shipping_classes = $this->get_shipping_classes();
		$available = count( $shipping_classes ) >= 3;
		$rules = $available
			? '[{"conditions":[{"condition_id":"shipping_class","operator":"all","shipping_class":["' . $shipping_classes[0] . '","' . $shipping_classes[1] . '","' . $shipping_classes[2] . '"],"deleted":false}],"cost_per_order":"35","additional_costs":[],"special_action":"stop","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"all","shipping_class":["' . $shipping_classes[0] . '","' . $shipping_classes[1] . '"],"deleted":false}],"cost_per_order":"30","additional_costs":[],"special_action":"stop","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"all","shipping_class":["' . $shipping_classes[0] . '","' . $shipping_classes[2] . '"],"deleted":false}],"cost_per_order":"25","additional_costs":[],"special_action":"stop","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"all","shipping_class":["' . $shipping_classes[1] . '","' . $shipping_classes[2] . '"],"deleted":false}],"cost_per_order":"20","additional_costs":[],"special_action":"stop","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"all","shipping_class":["' . $shipping_classes[0] . '"],"deleted":false}],"cost_per_order":"15","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"all","shipping_class":["' . $shipping_classes[1] . '"],"deleted":false}],"cost_per_order":"10","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"all","shipping_class":["' . $shipping_classes[2] . '"],"deleted":false}],"cost_per_order":"5","additional_costs":[],"special_action":"none","selected":false,"deleted":false}]'
			: '[{},{},{},{},{},{},{}]';
		return new PredefinedScenario(
			__( 'Shipping classes', 'flexible-shipping-pro' ),
			__( 'Combining different shipping classes in the cart', 'flexible-shipping-pro' ),
			__( 'Different shipping cost for specific shipping classes\' combinations and different for products purchased one at a time.', 'flexible-shipping-pro' ),
			$url,
			$rules,
			$available,
			$this->prepare_missing_shipping_classes_message(),
			__( '3 existing shipping classes required - if not present, please add them before using the scenario.', 'flexible-shipping-pro' )
		);
	}

	/**
	 * @return PredefinedScenario
	 */
	private function prepare_disable_or_hide_shipping_method_scenario() {
		$url = $this->is_pl() ? 'https://octol.io/fs-hide-pl' : 'https://octol.io/fs-hide';
		$shipping_classes = $this->get_shipping_classes();
		$available = count( $shipping_classes ) >= 1;
		$rules = $available
			? '[{"conditions":[{"condition_id":"shipping_class","operator":"any","shipping_class":["' . $shipping_classes[0] . '"],"deleted":false},{"condition_id":"item","operator":"is","min":"1","max":"","deleted":false}],"cost_per_order":"","additional_costs":[],"special_action":"cancel","selected":false,"deleted":false},{"conditions":[{"condition_id":"weight","operator":"is","min":"70","max":"","deleted":false}],"cost_per_order":"","additional_costs":[],"special_action":"cancel","selected":false,"deleted":false},{"conditions":[{"condition_id":"item","operator":"is","min":"15","max":"","deleted":false}],"cost_per_order":"","additional_costs":[],"special_action":"cancel","selected":false,"deleted":false},{"conditions":[{"condition_id":"weight","operator":"is","min":"","max":"5","deleted":false}],"cost_per_order":"7","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"weight","operator":"is","min":"5.001","max":"10","deleted":false}],"cost_per_order":"15","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"weight","operator":"is","min":"10.001","max":"","deleted":false}],"cost_per_order":"30","additional_costs":[],"special_action":"none","selected":false,"deleted":false}]'
			: '[{},{},{},{},{},{}]';
		return new PredefinedScenario(
			__( 'Shipping classes', 'flexible-shipping-pro' ),
			__( 'Disable or hide the shipping method', 'flexible-shipping-pro' ),
			__( 'The shipping method remains hidden not being displayed in the cart and checkout once the specific condition is met.', 'flexible-shipping-pro' ),
			$url,
			$rules,
			$available,
			$this->prepare_missing_shipping_classes_message(),
			__( '1 existing shipping class required - if not present, please add it before using the scenario.', 'flexible-shipping-pro' )
		);
	}

	/**
	 * @return PredefinedScenario
	 */
	private function prepare_extra_cost_for_every_item_scenario() {
		$url = $this->is_pl() ? 'https://octol.io/fs-extra-cost-pl' : 'https://octol.io/fs-extra-cost';
		return new PredefinedScenario(
			__( 'Price', 'flexible-shipping-pro' ),
			__( 'Extra cost for every item', 'flexible-shipping-pro' ),
			__( 'Basic shipping cost based on price and additional cost added with each single item in the cart.', 'flexible-shipping-pro' ),
			$url,
			'[{"conditions":[{"condition_id":"value","min":"","max":"50","deleted":false}],"cost_per_order":"10","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"value","min":"50.01","max":"150","deleted":false}],"cost_per_order":"15","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"value","min":"150.01","max":"","deleted":false}],"cost_per_order":"20","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"item","min":"","max":"","deleted":false}],"cost_per_order":"","additional_costs":[{"additional_cost":"5","per_value":"1","based_on":"item","deleted":false}],"special_action":"none","selected":false,"deleted":false}]'
		);
	}

	/**
	 * @return PredefinedScenario
	 */
	private function prepare_progressive_weight_based_shipping_scenario() {
		$url = $this->is_pl() ? 'https://octol.io/fs-increasing-weight-pl' : 'https://octol.io/fs-increasing-weight';
		$rules = '[{"conditions":[{"condition_id":"none","deleted":false}],"cost_per_order":"20","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"weight","min":"5","max":"","deleted":false}],"cost_per_order":"-15","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"weight","min":"5","max":"","deleted":false}],"cost_per_order":"","additional_costs":[{"additional_cost":"3","per_value":"1","based_on":"weight","deleted":false}],"special_action":"none","selected":false,"deleted":false}]';
		return new PredefinedScenario(
			__( 'Additional cost', 'flexible-shipping-pro' ),
			__( 'Progressively increasing weight based shipping', 'flexible-shipping-pro' ),
			__( 'Fixed basic shipping cost and progressively calculated additional shipping cost increasing with every 1 kg of weight.', 'flexible-shipping-pro' ),
			$url,
			$rules
		);
	}

	/**
	 * @return PredefinedScenario
	 */
	private function prepare_combining_cost_calculation_conditions_scenario() {
		$url = $this->is_pl() ? 'https://octol.io/fs-combine-cost-pl' : 'https://octol.io/fs-combine-cost';
		$shipping_classes = $this->get_shipping_classes();
		$available = count( $shipping_classes ) >= 1;
		$rules = $available
			? '[{"conditions":[{"condition_id":"weight","operator":"is","min":"","max":"20","deleted":false},{"condition_id":"value","operator":"is","min":"","max":"100","deleted":false}],"cost_per_order":"15","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"weight","operator":"is","min":"20.001","max":"","deleted":false},{"condition_id":"value","operator":"is","min":"100.01","max":"","deleted":false}],"cost_per_order":"25","additional_costs":[],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"any","shipping_class":["' . $shipping_classes[0] . '"],"deleted":false},{"condition_id":"value","operator":"is","min":"","max":"100","deleted":false},{"condition_id":"weight","operator":"is","min":"","max":"20","deleted":false}],"cost_per_order":"30","additional_costs":[{"additional_cost":"5","per_value":"1","based_on":"item","deleted":false}],"special_action":"none","selected":false,"deleted":false},{"conditions":[{"condition_id":"shipping_class","operator":"any","shipping_class":["103"],"deleted":false},{"condition_id":"value","operator":"is","min":"100.01","max":"","deleted":false},{"condition_id":"weight","operator":"is","min":"20.001","max":"","deleted":false}],"cost_per_order":"60","additional_costs":[{"additional_cost":"10","per_value":"1","based_on":"item","deleted":false}],"special_action":"none","selected":false,"deleted":false}]'
			: '[{},{},{},{}]';
		return new PredefinedScenario(
			__( 'Shipping classes', 'flexible-shipping-pro' ),
			__( 'Combining the shipping cost calculation conditions', 'flexible-shipping-pro' ),
			__( 'Shipping cost calculated based on various conditions\' combinations.', 'flexible-shipping-pro' ),
			$url,
			$rules,
			$available,
			$this->prepare_missing_shipping_classes_message(),
			__( '1 existing shipping class required - if not present, please add it before using the scenario.', 'flexible-shipping-pro' )
		);
	}

	/**
	 * @return string
	 */
	private function prepare_missing_shipping_classes_message() {
		return __( 'There are not enough existing shipping classes required to use the scenario. Create the required number of shipping classes and try again.', 'flexible-shipping-pro' );
	}

	/**
	 * @return array
	 */
	private function get_shipping_classes() {
		$wc_shipping_classes = WC()->shipping()->get_shipping_classes();
		$shipping_classes = [];
		foreach ( $wc_shipping_classes as $term ) {
			$shipping_classes[] = $term->term_id;
		}

		return $shipping_classes;
	}

	/**
	 * @return bool
	 */
	private function is_shipping_class_scenarios_available() {
		return defined( 'FLEXIBLE_SHIPPING_VERSION' ) && version_compare( FLEXIBLE_SHIPPING_VERSION, '3.8.3', '>=' );
	}

	/**
	 * @return bool
	 */
	private function is_pl() {
		return get_locale() === 'pl_PL';
	}

}

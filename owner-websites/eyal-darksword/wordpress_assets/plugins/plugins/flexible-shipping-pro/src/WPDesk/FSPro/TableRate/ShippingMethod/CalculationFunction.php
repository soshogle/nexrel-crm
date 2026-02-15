<?php
/**
 * Class CalculationFunction
 *
 * @package WPDesk\FSPro\TableRate\Rule
 */

namespace WPDesk\FSPro\TableRate\ShippingMethod;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can provide rule calculation function.
 */
class CalculationFunction implements Hookable {

	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible-shipping/shipping-method/rules-calculation-function', array( $this, 'prepare_calculation_function_callback' ), 10, 2 );
	}

	/**
	 * @param callable $callback .
	 * @param string   $callback_setting .
	 *
	 * @return callable
	 */
	public function prepare_calculation_function_callback( $callback, $callback_setting ) {
		if ( 'lowest' === $callback_setting ) {
			$callback = array( $this, 'lowest' );
		}
		if ( 'highest' === $callback_setting ) {
			$callback = array( $this, 'highest' );
		}
		return $callback;
	}

	/**
	 * @param float $calculated_cost .
	 * @param float $rule_cost .
	 *
	 * @return float
	 *
	 * @internal
	 */
	public function lowest( $calculated_cost, $rule_cost ) {
		if ( null === $calculated_cost ) {
			$calculated_cost = INF;
		}

		return min( $calculated_cost, $rule_cost );
	}

	/**
	 * @param float $calculated_cost .
	 * @param float $rule_cost .
	 *
	 * @return float
	 *
	 * @internal
	 */
	public function highest( $calculated_cost, $rule_cost ) {
		if ( null === $calculated_cost ) {
			$calculated_cost = -INF;
		}

		return max( $calculated_cost, $rule_cost );
	}

}

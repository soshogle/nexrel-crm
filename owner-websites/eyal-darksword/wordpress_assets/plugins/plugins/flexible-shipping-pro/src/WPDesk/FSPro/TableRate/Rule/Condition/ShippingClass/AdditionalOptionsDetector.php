<?php
/**
 * Class AdditionalOptionsDetector
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

use WPDesk\FS\TableRate\ShippingMethodSingle;
use WPDesk\FSPro\TableRate\Rule\Condition\ShippingClass;

/**
 * Can detect if shipping class condition uses additional options.
 */
class AdditionalOptionsDetector {

	/**
	 * @var array
	 */
	private $get;

	/**
	 * AdditionalOptionsDetector constructor.
	 *
	 * @param array $get .
	 */
	public function __construct( array $get ) {
		$this->get = $get;
	}

	/**
	 * @return bool
	 */
	public function should_add_additional_options() {
		if ( isset( $this->get['page'] ) && isset( $this->get['tab'] ) && isset( $this->get['instance_id'] )
			&& 'wc-settings' === $this->get['page'] && 'shipping' === $this->get['tab']
		) {
			$instance_id = (int) $this->get['instance_id'];
			$shipping_method = $this->get_shipping_method( $instance_id );
			if ( $shipping_method && $shipping_method instanceof ShippingMethodSingle ) {
				$method_rules = $shipping_method->get_method_rules();
				return $this->method_rules_contains_additional_options( $method_rules );
			}
		}

		return true;
	}

	/**
	 * @param array $method_rules .
	 *
	 * @return bool
	 */
	private function method_rules_contains_additional_options( array $method_rules ) {
		$contains_additional_options = false;
		foreach ( $method_rules as $single_method_rule ) {
			if ( isset( $single_method_rule['conditions'] ) ) {
				foreach ( $single_method_rule['conditions'] as $condition ) {
					if ( $this->is_shipping_class_condition( $condition ) ) {
						$contains_additional_options = $contains_additional_options || $this->condition_contains_additional_option( $condition );
					}
				}
			}
		}

		return $contains_additional_options;
	}

	/**
	 * @param array $condition .
	 *
	 * @return bool
	 */
	private function is_shipping_class_condition( array $condition ) {
		return isset( $condition['condition_id'] ) && ShippingClass::CONDITION_ID === $condition['condition_id'];
	}

	/**
	 * @param array $condition .
	 *
	 * @return bool
	 */
	private function condition_contains_additional_option( array $condition ) {
		if ( isset( $condition['shipping_class'] ) && is_array( $condition['shipping_class'] ) ) {
			foreach ( $condition['shipping_class'] as $shipping_class ) {
				if ( in_array( $shipping_class, [ ShippingClass::ANY_CLASS, ShippingClass::ALL_PRODUCTS ], true ) ) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * @param int $instance_id .
	 *
	 * @return bool|\WC_Shipping_Method
	 */
	protected function get_shipping_method( $instance_id ) {
		return \WC_Shipping_Zones::get_shipping_method( $instance_id );
	}

}

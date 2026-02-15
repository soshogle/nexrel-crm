<?php


namespace WPDesk\FSPro\TableRate\RuleCost;

use WPDesk\FS\TableRate\RuleCost\RuleCostSettingsField;

class Value implements RuleCostSettingsField {

	public function get_field_name() {
		return 'per_value';
	}

	public function get_field_label() {
		return __( 'Value', 'flexible-shipping-pro' );
	}

	public function get_field_hint() {
		return __( 'Value for additional cost.', 'flexible-shipping-pro' );
	}

	public function get_field_type() {
		return 'number';
	}

	public function get_field_options() {
		return array();
	}

}

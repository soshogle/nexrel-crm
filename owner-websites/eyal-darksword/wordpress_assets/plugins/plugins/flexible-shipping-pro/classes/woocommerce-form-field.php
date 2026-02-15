<?php

class WPDesk_Flexible_Shipping_Pro_Woocommerce_Form_Field {

	public function hooks() {
		add_filter( 'woocommerce_form_field_select_multiple', [
			$this,
			'render_select_multiple_field',
		], 10, 4 );
	}

	public function render_select_multiple_field( $field, $key, $args, $value ) {

		if ( is_null( $value ) ) {
			$value = $args['default'];
		}

		// Custom attribute handling.
		$custom_attributes = [];

		if ( ! empty( $args['custom_attributes'] ) && is_array( $args['custom_attributes'] ) ) {
			foreach ( $args['custom_attributes'] as $attribute => $attribute_value ) {
				$custom_attributes[] = esc_attr( $attribute ) . '="' . esc_attr( $attribute_value ) . '"';
			}
		}

		$options = '';
		if ( ! empty( $args['options'] ) ) {
			foreach ( $args['options'] as $option_key => $option_text ) {
				if ( '' === $option_key ) {
					// If we have a blank option, select2 needs a placeholder.
					if ( empty( $args['placeholder'] ) ) {
						$args['placeholder'] = $option_text ? $option_text : __( 'Choose an option', 'flexible-shipping-pro' );
					}
					$custom_attributes[] = 'data-allow_clear="true"';
				}

				$selected = '';

				if ( in_array( esc_attr( $option_key ), (array) $value, true ) ) {
					$selected = ' selected';
				}

				$options .= '<option value="' . esc_attr( $option_key ) . '" ' . $selected . '>' . esc_attr( $option_text ) . '</option>';
			}

			$field .= '<select multiple name="' . esc_attr( $key ) . '" id="' . esc_attr( $args['id'] ) . '" class="select ' .
			          esc_attr( implode( ' ', $args['input_class'] ) ) . '" ' .
			          implode( ' ', $custom_attributes ) . ' placeholder="' . esc_attr( $args['placeholder'] ) . '">
					' . $options . '
				</select>';
		}

		return $field;
	}

}

<?php
/**
 * Class WeightCalculationSettings
 *
 * @package WPDesk\FSPro\TableRate
 */

namespace WPDesk\FSPro\TableRate;

use FSProVendor\WPDesk\PluginBuilder\Plugin\Hookable;

/**
 * Can add new field settings.
 */
class WeightCalculationSettings implements Hookable {
	/**
	 * Hooks.
	 */
	public function hooks() {
		add_filter( 'flexible_shipping_method_settings', [ $this, 'append_weight_calculation_settings' ] );
		add_action( 'flexible-shipping/method-rules-settings/table/after', [ $this, 'add_validator' ] );
	}

	/**
	 * .
	 */
	public function add_validator() {
		include __DIR__ . '/views/html-admin-weight-ratio-validator.php';
	}

	/**
	 * @param array $settings_fields .
	 *
	 * @return array
	 */
	public function append_weight_calculation_settings( $settings_fields ) {
		$new_settings_fields = [];

		foreach ( $settings_fields as $key => $settings_field ) {
			$new_settings_fields[ $key ] = $settings_field;

			if ( 'method_debug_mode' === $key ) {
				$new_settings_fields['weight_ratio'] = [
					'title'             => __( 'DIM Factor', 'flexible-shipping-pro' ),
					'type'              => 'number',
					'placeholder'       => __( 'e.g. 166', 'flexible-shipping-pro' ),
					'custom_attributes' => [
						'step' => 'any',
					],
					'desc_tip'          => sprintf(
					// Translators: strong tag open, strong tag close.
						__( 'Filling in the %1$sDIM Factor%2$s value in this field is required if you use the %1$sWhen: Dimensional weight%2$s condition to calculate the shipping cost. What\'s more, all the products in your shop should have their dimensions entered.', 'flexible-shipping-pro' ),
						'<strong>',
						'</strong>'
					),
					'description'       => sprintf(
					// Translators:new line tag, docs url tag open, docs url tag close.
						__( 'Learn more about the %1$sdifference between dimensional and actual weight →%2$s', 'flexible-shipping-pro' ),
						'<a target="_blank" href="' . esc_url( $this->get_docs_url() ) . '">',
						'</a>'
					),
				];
			}
		}

		return $new_settings_fields;
	}

	/**
	 * @return string
	 */
	private function get_docs_url() {
		if ( get_user_locale() === 'pl_PL' ) {
			return 'https://octol.io/fs-volume-weight-pl';
		}

		return 'https://octol.io/fs-volume-weight';
	}
}

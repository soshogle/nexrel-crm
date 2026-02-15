<?php
/**
 * Settings
 *
 * @package iconic-onboard
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( class_exists( 'Iconic_WooThumbs_Onboard_Settings' ) ) {
	return;
}

/**
 * Iconic_WooThumbs_Onboard_Settings.
 */
class Iconic_WooThumbs_Onboard_Settings {
	/**
	 * Plugin slug.
	 *
	 * @var mixed
	 */
	protected static $plugin_slug;

	/**
	 * Template path.
	 *
	 * @var mixed
	 */
	protected static $template_path;

	/**
	 * Setting Defaults.
	 *
	 * @var array
	 */
	protected static $setting_defaults = array(
		'id'          => 'default_field',
		'title'       => 'Default Field',
		'desc'        => '',
		'std'         => '',
		'type'        => 'text',
		'placeholder' => '',
		'choices'     => array(),
		'class'       => '',
		'subfields'   => array(),
	);

	/**
	 * Initialize.
	 *
	 * @param array $args Configuration settings.
	 */
	public static function run( $args ) {
		self::$plugin_slug   = $args['plugin_slug'];
		self::$template_path = $args['plugin_path'] . '/inc/vendor/iconic-onboard/templates/';

		add_action( 'iconic_onboard_' . self::$plugin_slug . '_slide_settings', array( __CLASS__, 'add_settings' ) );
	}

	/**
	 * Returns $setting_defaults array.
	 *
	 * @return array
	 */
	public static function get_field_defaults() {
		return self::$setting_defaults;
	}

	/**
	 * Add Settings.
	 *
	 * @param array $slide Slide parameters.
	 */
	public static function add_settings( $slide ) {
		if ( ! $slide['slide']['fields'] || ! count( $slide['slide']['fields'] ) ) {
			return;
		}

		foreach ( $slide['slide']['fields'] as $slide_index => $field ) {
			$field          = wp_parse_args( $field, self::$setting_defaults );
			$field['id']    = sprintf( '%s_%s', 'iconic_onboard', $field['id'] );
			$field['value'] = isset( $field['default'] ) ? $field['default'] : '';
			$field['name']  = self::generate_field_name( $field['id'] );
			include self::$template_path . '/admin/single-field.php';
		}
	}

	/**
	 * Generate: Field ID
	 *
	 * @param mixed $id Field ID.
	 *
	 * @return string
	 */
	public static function generate_field_name( $id ) {
		return sprintf( '%s_settings[%s]', self::$plugin_slug, $id );
	}

	/**
	 * Do field method, if it exists
	 *
	 * @param array $args Field arguments.
	 */
	public static function do_field_method( $args ) {
		$generate_field_method = sprintf( 'generate_%s_field', $args['type'] );

		if ( method_exists( __CLASS__, $generate_field_method ) ) {
			self::$generate_field_method( $args );
		}
	}

	/**
	 * Generate: Text field
	 *
	 * @param array $args Text field arguments.
	 */
	public static function generate_text_field( $args ) {
		$args['value'] = esc_attr( stripslashes( $args['value'] ) );

		echo '<input type="text" name="' . esc_attr( $args['name'] ) . '" id="' . esc_attr( $args['id'] ) . '" value="' . esc_attr( $args['value'] ) . '" placeholder="' . esc_attr( $args['placeholder'] ) . '" class="regular-text ' . esc_attr( $args['class'] ) . '" />';

		self::generate_description( $args['desc'] );
	}


	/**
	 * Generate: Select field
	 *
	 * @param array $args Select field arguments.
	 */
	public static function generate_select_field( $args ) {
		$args['value'] = esc_html( esc_attr( $args['value'] ) );

		echo '<select name="' . esc_attr( $args['name'] ) . '" id="' . esc_attr( $args['id'] ) . '" class="' . esc_attr( $args['class'] ) . '">';

		foreach ( $args['choices'] as $value => $text ) {
			if ( is_array( $text ) ) {
				if ( ! isset( $text['group_label'] ) ) {
					continue;
				}

				echo '<optgroup label="' . esc_attr( $text['group_label'] ) . '">';
				foreach ( $text['values'] as $value => $text ) {

					echo sprintf( '<option value="%s" %s>%s</option>', esc_attr( $value ), selected( $value, $args['value'], false ), esc_html( $text ) );
				}
				echo '</optgroup>';
			} else {
				echo sprintf( '<option value="%s" %s>%s</option>', esc_attr( $value ), selected( $value, $args['value'], false ), esc_html( $text ) );
			}
		}

		echo '</select>';

		self::generate_description( $args['desc'] );
	}

	/**
	 * Generate: Radio field
	 *
	 * @param array $args Radio field arguments.
	 */
	public static function generate_radio_field( $args ) {
		$args['value'] = esc_html( esc_attr( $args['value'] ) );

		echo '<ul class="iconic-onboard-fields-list iconic-onboard-fields-list--radio iconic-onboard-fields-list--bordered">';

		foreach ( $args['choices'] as $value => $text ) {
			$field_id = sprintf( '%s_%s', $args['id'], $value );

			echo sprintf( '<li><label><input type="radio" name="%s" id="%s" value="%s" class="%s" %s> %s</label></li>', esc_attr( $args['name'] ), esc_attr( $field_id ), esc_attr( $value ), esc_attr( $args['class'] ), checked( $value, $args['value'], false ), esc_html( $text ) );
		}

		echo '</ul>';

		self::generate_description( $args['desc'] );
	}

	/**
	 * Generate: Checkbox field
	 *
	 * @param array $args Checkbox field arguments.
	 */
	public static function generate_checkbox_field( $args ) {
		$args['value'] = esc_attr( stripslashes( $args['value'] ) );

		echo '<input type="hidden" name="' . esc_attr( $args['name'] ) . '" value="0" />';
		echo '<label><input type="checkbox" name="' . esc_attr( $args['name'] ) . '" id="' . esc_attr( $args['id'] ) . '" value="1" class="' . esc_attr( $args['class'] ) . '" ' . checked( $args['value'], true, false ) . '> ' . esc_html( $args['desc'] ) . '</label>';
	}

	/**
	 * Generate: Checkboxes field
	 *
	 * @param array $args Checkboxes field arguments.
	 */
	public static function generate_checkboxes_field( $args ) {
		echo '<input type="hidden" name="' . esc_attr( $args['name'] ) . '" value="0" />';

		echo '<ul class="iconic-onboard-fields-list iconic-onboard-fields-list--checkboxes iconic-onboard-fields-list--bordered">';

		foreach ( $args['choices'] as $value => $text ) {
			$checked  = is_array( $args['value'] ) && in_array( $value, $args['value'], true );
			$field_id = sprintf( '%s_%s', $args['id'], $value );

			echo sprintf( '<li><label><input type="checkbox" name="%s[]" id="%s" value="%s" class="%s" %s> %s</label></li>', esc_attr( $args['name'] ), esc_attr( $field_id ), esc_attr( $value ), esc_attr( $args['class'] ), checked( $checked, true, false ), esc_html( $text ) );
		}

		echo '</ul>';

		self::generate_description( $args['desc'] );
	}

	/**
	 * Generate Image Checkboxes
	 *
	 * @param array $args Image checkboxes field arguments.
	 *
	 * @return void
	 */
	public static function generate_image_checkboxes_field( $args ) {

		echo '<input type="hidden" name="' . esc_attr( $args['name'] ) . '" value="0" />';

		echo '<ul class="iconic-onboard-fields-list iconic-onboard-fields-list--image-checkboxes iconic-onboard-fields-list--grid iconic-onboard-fields-list--cols">';

		foreach ( $args['choices'] as $value => $choice ) {
			$checked  = is_array( $args['value'] ) && in_array( $value, $args['value'] );
			$field_id = sprintf( '%s_%s', $args['id'], $value );

			echo sprintf(
				'<li>
					<label>
						<img src="%s" >
						<input type="checkbox" name="%s[]" id="%s" value="%s" class="%s" %s> 
						%s
					</label>
				</li>',
				esc_url( $choice['image'] ),
				esc_attr( $args['name'] ),
				esc_attr( $field_id ),
				esc_attr( $value ),
				esc_attr( $args['class'] ),
				checked( $checked, true, false ),
				esc_html( $choice['text'] )
			);
		}

		echo '</ul>';

		self::generate_description( $args['desc'] );
	}

	/**
	 * Generate: Image Radio field
	 *
	 * @param array $args Image radio field arguments.
	 */
	public static function generate_image_radio_field( $args ) {
		$args['value'] = esc_html( esc_attr( $args['value'] ) );
		$count         = count( $args['choices'] );
		echo sprintf( '<ul class="iconic-onboard-fields-list iconic-onboard-fields-list--image-radio iconic-onboard-fields-list--grid iconic-onboard-fields-list--cols iconic-onboard-fields-list--col-%s ">', esc_attr( $count ) );

		foreach ( $args['choices'] as $value => $choice ) {
			$field_id = sprintf( '%s_%s', $args['id'], $value );
			$checked  = $value === $args['value'];

			echo sprintf(
				'<li class="iconic-onboard-fields-list__item %s">				
								<label>
									<div class="iconic-onboard-fields-list-image-radio__img_wrap">
										<img src="%s">
									</div>
									<input type="radio" name="%s" id="%s" value="%s" class="%s" %s>
									%s
								</label>
							</li>	
							',
				( $checked ? 'iconic-onboard-fields-list__item--checked' : '' ),
				esc_url( $choice['image'] ),
				esc_attr( $args['name'] ),
				esc_attr( $field_id ),
				esc_attr( $value ),
				esc_attr( $args['class'] ),
				checked( $checked, true, false ),
				esc_html( $choice['text'] )
			);
		}
		echo '</ul>';
		self::generate_description( $args['desc'] );
	}

	/**
	 * Generate: Custom field
	 *
	 * @param array $args Custom field arguments.
	 */
	public static function generate_custom_field( $args ) {
		echo filter_var( $args['default'] ); // filter_var used to bypass phpcs.
	}

	/**
	 * Generate: Description
	 *
	 * @param string $description Field description text.
	 */
	public static function generate_description( $description ) {
		if ( $description && '' !== $description ) {
			echo '<p class="description">' . esc_html( $description ) . '</p>';
		}
	}

}

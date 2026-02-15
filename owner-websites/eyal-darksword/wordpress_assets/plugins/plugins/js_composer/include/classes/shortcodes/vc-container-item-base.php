<?php
/**
 * VC Grid Container Item Base Shortcode Class.
 * This class is used as a base for grid container items like grid columns and flexbox items.
 *
 * @since 8.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}

/**
 * Class WPBakeryShortCode_Vc_Container_Item_Base
 *
 * @since 8.7
 *
 * @package WPBakeryPageBuilder
 */
abstract class WPBakeryShortCode_Vc_Container_Item_Base extends WPBakeryShortCode {
	/**
	 * Class for non-draggable item.
	 *
	 * @since 8.7
	 *
	 * @var string
	 */
	public $non_draggable_class = 'vc-non-draggable-item';

	/**
	 * Get item type label.
	 *
	 * @return string
	 * @since 8.7
	 */
	abstract protected function getItemTypeLabel();


	/**
	 * Builds the HTML for grid item controls in the backend editor.
	 *
	 * @param mixed $controls Controls to display (array or string).
	 * @param string $extended_css Optional extended CSS.
	 * @return string HTML output for controls.
	 * @throws Exception
	 * @since 8.7
	 */
	public function getElementControls( $controls, $extended_css = '' ) {
		$output = '<div class="vc_controls vc_control-column vc_controls-visible' . ( ! empty( $extended_css ) ? " {$extended_css}" : '' ) . '">';
		$controls_end = '</div>';

		$edit_access = vc_user_access_check_shortcode_edit( $this->shortcode );
		$all_access = vc_user_access_check_shortcode_all( $this->shortcode );

		if ( is_array( $controls ) && ! empty( $controls ) ) {
			$output .= $this->buildControlsFromArray( $controls, $edit_access, $all_access, $extended_css );
		} elseif ( is_string( $controls ) ) {
			$output .= $this->buildControlsFromString( $controls, $edit_access, $all_access, $extended_css );
		} else {
			$output .= $this->buildDefaultControls( $edit_access, $all_access, $extended_css );
		}

		$output .= $controls_end;
		return $output;
	}

	/**
	 * Builds HTML for controls from an array.
	 *
	 * @since 8.7
	 *
	 * @param array $controls List of control names.
	 * @param bool $edit_access Edit access flag.
	 * @param bool $all_access Full access flag.
	 * @param string $extended_css Optional extended CSS.
	 * @return string HTML for controls.
	 */
	public function buildControlsFromArray( $controls, $edit_access, $all_access, $extended_css ) {
		$html = '';
		foreach ( $controls as $control ) {
			if ( $this->canShowControl( $control, $edit_access, $all_access ) ) {
				$html .= $this->getControlHtml( $control, $extended_css );
			}
		}
		return $html;
	}

	/**
	 * Builds HTML for controls from a string.
	 *
	 * @since 8.7
	 *
	 * @param string $controls Control name or 'full'.
	 * @param bool $edit_access Edit access flag.
	 * @param bool $all_access Full access flag.
	 * @param string $extended_css Optional extended CSS.
	 * @return string HTML for controls.
	 */
	public function buildControlsFromString( $controls, $edit_access, $all_access, $extended_css ) {
		if ( 'full' === $controls ) {
			return $this->getControlsByAccess( $edit_access, $all_access, $extended_css );
		}
		if ( $this->canShowControl( $controls, $edit_access, $all_access ) ) {
			return $this->getControlHtml( $controls, $extended_css );
		}
		return '';
	}

	/**
	 * Builds default controls HTML if none are provided.
	 *
	 * @since 8.7
	 *
	 * @param bool $edit_access Edit access flag.
	 * @param bool $all_access Full access flag.
	 * @param string $extended_css Optional extended CSS.
	 * @return string HTML for default controls.
	 */
	public function buildDefaultControls( $edit_access, $all_access, $extended_css ) {
		return $this->getControlsByAccess( $edit_access, $all_access, $extended_css );
	}

	/**
	 * Returns HTML for controls based on access permissions.
	 *
	 * @since 8.7
	 *
	 * @param bool $edit_access Edit access flag.
	 * @param bool $all_access Full access flag.
	 * @param string $extended_css Optional extended CSS.
	 * @return string HTML for controls.
	 */
	private function getControlsByAccess( $edit_access, $all_access, $extended_css ) {
		if ( $all_access ) {
			return $this->getControlHtml( 'add', $extended_css ) .
				$this->getControlHtml( 'edit', $extended_css ) .
				$this->getControlHtml( 'paste', $extended_css ) .
				$this->getControlHtml( 'delete', $extended_css );
		} elseif ( $edit_access ) {
			return $this->getControlHtml( 'add', $extended_css ) .
				$this->getControlHtml( 'edit', $extended_css ) .
				$this->getControlHtml( 'paste', $extended_css );
		}
		return $this->getControlHtml( 'add', $extended_css );
	}

	/**
	 * Returns HTML for a specific control.
	 *
	 * @since 8.7
	 *
	 * @param string $control Control name.
	 * @param string $extended_css Optional extended CSS.
	 * @return string HTML for the control or empty string.
	 */
	public function getControlHtml( $control, $extended_css ) {
		$item_type = $this->getItemTypeLabel();
		$controls_map = [
			'add' => '<a class="vc_control column_add vc_column-add" data-vc-control="add" href="#" title="' .
				( 'bottom-controls' === $extended_css ? sprintf( __( 'Append to this %s item', 'js_composer' ), $item_type ) : sprintf( __( 'Prepend to this %s item', 'js_composer' ), $item_type ) ) .
				'"><i class="vc-composer-icon vc-c-icon-add"></i></a>',
			'edit' => '<a class="vc_control column_edit vc_column-edit"  data-vc-control="edit" href="#" title="' .
				sprintf( __( 'Edit %s item', 'js_composer' ), $item_type ) . '"><i class="vc-composer-icon vc-c-icon-mode_edit"></i></a>',
			'paste' => '<a class="vc_control column_paste vc_column-paste"  data-vc-control="paste" href="#" title="' .
				__( 'Paste', 'js_composer' ) . '"><i class="vc-composer-icon vc-c-icon-paste"></i></a>',
			'delete' => '<a class="vc_control column_delete vc_column-delete" data-vc-control="delete"  href="#" title="' .
				sprintf( __( 'Delete this %s item', 'js_composer' ), $item_type ) . '"><i class="vc-composer-icon vc-c-icon-delete_empty"></i></a>',
		];
		return isset( $controls_map[ $control ] ) ? $controls_map[ $control ] : '';
	}

	/**
	 * Checks if a control should be shown based on access.
	 *
	 * @since 8.7
	 *
	 * @param string $control Control name.
	 * @param bool $edit_access Edit access flag.
	 * @param bool $all_access Full access flag.
	 * @return bool True if control should be shown.
	 */
	public function canShowControl( $control, $edit_access, $all_access ) {
		if ( 'add' === $control ) {
			return vc_user_access()->part( 'shortcodes' )->checkStateAny( true, 'custom', null )->get();
		}
		if ( 'edit' === $control ) {
			return $edit_access || $all_access;
		}
		return $all_access;
	}

	/**
	 * Get Grid item Backend editor output.
	 *
	 * @since 8.7
	 *
	 * @param array $atts
	 * @param null $content
	 * @return string
	 */
	public function contentAdmin( $atts, $content = null ) {
		$atts = vc_map_get_attributes( $this->getShortcode(), $atts );
		// @codingStandardsIgnoreLine
		extract( $atts );
		$this->atts = $atts;
		$output = '';

		$controls = $this->getElementControls( $this->settings( 'controls' ) );
		$controls_bottom = $this->getElementControls( 'add', 'bottom-controls' );

		$output .= '<div ' . $this->mainHtmlBlockParams() . '>';
		$output .= $controls;
		$output .= '<div class="wpb_element_wrapper">';
		$output .= '<div class="wpb_column_container vc_container_for_children">';
		$output .= do_shortcode( shortcode_unautop( $content ) );
		$output .= '</div>';
		$output .= '</div>';
		$output .= $controls_bottom;
		$output .= '</div>';

		return $output;
	}

	/**
	 * Get main html block params.
	 *
	 * @return string
	 * @throws Exception
	 * @since 8.7
	 */
	public function mainHtmlBlockParams() {
		$sortable = ( vc_user_access_check_shortcode_all( $this->shortcode ) ? 'wpb_sortable' : $this->non_draggable_class );

		return 'data-element_type="' . $this->settings['base'] . '" class="wpb_' . $this->settings['base'] . ' ' . $sortable . ' ' . ( ! empty( $this->settings['class'] ) ? ' ' . $this->settings['class'] : '' ) . ' wpb_content_holder"';
	}

	/**
	 * Get element output.
	 *
	 * @since 8.7
	 *
	 * @param string $content
	 * @return string
	 */
	public function template( $content = '' ) {
		return $this->contentAdmin( $this->atts );
	}

	/**
	 * Get shortcode output.
	 *
	 * @param array $atts
	 * @param null|string $content
	 *
	 * @return mixed
	 */
	public function loadTemplate( $atts, $content = null ) {
		$atts = vc_map_get_attributes( $this->getShortcode(), $atts );
		wp_enqueue_script( 'wpb_composer_front_js' );

		return parent::loadTemplate( $atts, $content );
	}

	/**
	 * Output wrapper attributes.
	 *
	 * @since 8.7
	 * @param array $atts
	 * @param string $item_class
	 */
	public function output_wrapper_attributes( $atts, $item_class = '' ) {
		$el_class = isset( $atts['el_class'] ) ? $atts['el_class'] : '';
		$css_animation = isset( $atts['css_animation'] ) ? $atts['css_animation'] : '';

		$css_classes = [
			$this->getItemClass(),
			$this->getExtraClass( $el_class ) . $this->getCSSAnimation( $css_animation ),
			$item_class,
		];

		$wrapper_attributes = [];
		$css_classes = implode( ' ', array_filter( $css_classes ) );
		$class = apply_filters( VC_SHORTCODE_CUSTOM_CSS_FILTER_TAG, $css_classes, $this->settings['base'], $atts );

		$css_class = preg_replace( '/\s+/', ' ', $class );
		$wrapper_attributes[] = 'class="' . esc_attr( trim( $css_class ) ) . '"';
		if ( ! empty( $atts['el_id'] ) ) {
			$wrapper_attributes[] = 'id="' . esc_attr( $atts['el_id'] ) . '"';
		}

		echo implode( ' ', $wrapper_attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * Output custom CSS class (.vc_custom_id) coming from Design Options.
	 *
	 * @since 8.7
	 * @param array $atts
	 */
	public function output_custom_css_class( $atts ) {
		if ( ! isset( $atts['css'] ) ) {
			echo '';
			return;
		}

		echo esc_attr( trim( vc_shortcode_custom_css_class( $atts['css'] ) ) );
	}
}

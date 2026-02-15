<?php

/**
 * Elementor: theme compatibility Class
 *
 * @since 4.6.11
 */
class Iconic_WooThumbs_Compat_Elementor {
	/**
	 * Run.
	 */
	public static function run() {
		add_action( 'init', array( __CLASS__, 'init' ) );
	}

	/**
	 * Run once all plugins are loaded.
	 */
	public static function init() {
		if ( ! defined( 'ELEMENTOR_PRO_VERSION' ) ) {
			return;
		}

		add_filter( 'elementor/widget/render_content', array( __CLASS__, 'elementor_replace_woo_images_module_output' ), 10, 2 );
		add_action( 'elementor/element/woocommerce-product-images/section_product_gallery_style/before_section_end', array( __CLASS__, 'modify_product_gallery_component_settings' ), 10, 2 );
	}

	/**
	 * Replace the output of Elementor's Woo Images Module with the output of WooThumbs.
	 *
	 * @param string $content       The output of widget.
	 * @param Object $widget_object The widget object.
	 *
	 * @return string $output
	 */
	public static function elementor_replace_woo_images_module_output( $content, $widget_object ) {
		$name = $widget_object->get_name();

		if ( 'woocommerce-product-images' !== $name ) {
			return $content;
		}

		global $iconic_woothumbs_class;

		ob_start();
		$iconic_woothumbs_class->show_product_images();

		return ob_get_clean();
	}

	/**
	 * Checks if Elementor is enabled for the current post/product.
	 * Should be called after Elementor has been initialised.
	 *
	 * @return bool
	 */
	public static function check_is_elementor() {
		global $post;

		if ( ! is_object( $post ) ) {
			return false;
		}

		return Elementor\Plugin::$instance->documents->get( $post->ID )->is_built_with_elementor();
	}

	/**
	 * Link to WooThumbs settings in element settings panel.
	 *
	 * @param Controls_Stack $element
	 * @param array          $args
	 *
	 * @return mixed
	 */
	public static function modify_product_gallery_component_settings( $element, $args ) {
		$controls = $element->get_controls();

		if ( ! empty( $controls ) ) {
			foreach ( $controls as $control ) {
				if ( 'section' === $control['type'] || 'style' !== $control['tab'] ) {
					continue;
				}

				if ( 'sale_flash' === $control['name'] ) {
					$control['type'] = 'hidden';
					$control['default'] = 'no';
					$element->update_control( $control['name'], $control );
					continue;
				}

				$element->remove_control( $control['name'] );
			}
		}

		$element->add_control(
			'iconic_woothumbs_style_warning',
			array(
				'type'            => Elementor\Controls_Manager::RAW_HTML,
				/* translators: %s is the link to WooThumbs settings page. */
				'raw'             => sprintf( __( 'This element is styled by WooThumbs. Go to the <a href="%s" target="_blank">settings page</a> to customise the product gallery.', 'iconic-woothumbs' ), esc_url( admin_url( 'admin.php?page=iconic-woothumbs-settings' ) ) ),
				'content_classes' => 'elementor-panel-alert elementor-panel-alert-info',
			)
		);

		return $element;
	}
}

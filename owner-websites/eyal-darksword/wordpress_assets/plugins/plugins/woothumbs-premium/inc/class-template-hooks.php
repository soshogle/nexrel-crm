<?php

/**
 * Template hooks.
 *
 * @since 4.6.12
 */
class Iconic_WooThumbs_Template_Hooks {
	/**
	 * Init.
	 */
	public static function run() {
		add_action( 'init', array( __CLASS__, 'init_layout' ) );
		add_action( 'iconic_woothumbs_image', array( __CLASS__, 'slide_content' ), 10, 3 );
	}

	/**
	 * Init gallery layout.
	 */
	public static function init_layout() {
		global $iconic_woothumbs_class;

		// Default to slider if the Iconic_WooThumbs class isn't available for whatever reason.
		$layout = ( is_object( $iconic_woothumbs_class ) ) ? 'layout_' . $iconic_woothumbs_class->settings['display_general_layout'] : 'layout_slider';

		if ( method_exists( __CLASS__, $layout ) ) {
			add_action( 'iconic_woothumbs_layout', array( __CLASS__, $layout ), 10, 2 );
		}
	}

	/**
	 * Layout: Slider.
	 *
	 * @param WC_Product $product
	 * @param array      $args
	 */
	public static function layout_slider( $product, $args ) {
		if ( $args['navigation_thumbnails_enable'] && ( "above" === $args['navigation_thumbnails_position'] || "left" === $args['navigation_thumbnails_position'] ) ) {
			self::get_woothumbs_template( 'layouts/slider/loop-thumbnails.php', $args );
		}

		self::get_woothumbs_template( 'layouts/slider/loop-images.php', $args );

		if ( $args['navigation_thumbnails_enable'] && ( "below" === $args['navigation_thumbnails_position'] || "right" === $args['navigation_thumbnails_position'] ) ) {
			self::get_woothumbs_template( 'layouts/slider/loop-thumbnails.php', $args );
		}
	}

	/**
	 * Layout: Stacked.
	 *
	 * @param WC_Product $product
	 * @param array      $args
	 */
	public static function layout_stacked( $product, $args ) {
		self::get_woothumbs_template( 'layouts/stacked/loop-images.php', $args );
	}

	/**
	 * Helper: get a WooThumbs template from the theme
	 * if an override exists, or get from the plugin.
	 *
	 * @param string $path Path relative to the WooThumbs /templates/ base e.g. layouts/example/loop-images.php.
	 * @param array  $args Optional array of arguments for the template to be exposed as $args; defaults to an empty array.
	 * @param string $type Whether to include or require; defaults to include.
	 */
	public static function get_woothumbs_template( $path, $args = array(), $type = 'include' ) {
		if ( ! $path ) {
			return;
		}

		// Check the theme for a template override.
		$template = locate_template( 'woocommerce/woothumbs/' . $path );

		// Fall back to the default WooThumbs template.
		if ( ! $template ) {
			$template = ICONIC_WOOTHUMBS_TEMPLATES_PATH . $path;
		}

		if ( 'require' === $type ) {
			require $template;
		} else {
			include $template;
		}
	}

	/**
	 * Slide content.
	 *
	 * @param $image
	 * @param $i
	 * @param $images
	 */
	public static function slide_content( $image, $i, $images ) {
		global $iconic_woothumbs_class;

		$data_lazy = 'slider' === $iconic_woothumbs_class->settings['display_general_layout'];

		if ( ! empty( $image['media_embed'] ) ) {
			if ( defined( 'WP_ROCKET_VERSION' ) ) {
				// Output the featured image to cater for delay JS execution;
				// we will remove this from the DOM when the JS loads.
				$data = Iconic_WooThumbs::get_image_loop_data( $image, $i, $data_lazy );
				$data['class'] = $data['class'] . ' iconic-woothumbs-remove-on-js-load';
				?>
				<img <?php echo Iconic_WooThumbs::array_to_html_atts( $data ); ?>>
				<?php
			}
			echo $image['media_embed'];
		} else {
		?>
			<img <?php echo Iconic_WooThumbs::array_to_html_atts( Iconic_WooThumbs::get_image_loop_data( $image, $i, $data_lazy ) ); ?>>
		<?php }
	}
}

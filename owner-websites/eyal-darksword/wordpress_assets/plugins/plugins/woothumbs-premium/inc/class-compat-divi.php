<?php
/**
 * Divi theme compatibility Class.
 *
 * @package  Iconic_WooThumbs
 */

/**
 * Divi theme compatibility Class
 * https://www.elegantthemes.com/
 *
 * @since 4.7.2
 */
class Iconic_WooThumbs_Compat_Divi {

	/**
	 * Init.
	 */
	public static function run() {
		$theme = wp_get_theme();

		if ( 'divi' !== strtolower( $theme->template ) ) {
			return;
		}

		add_action( 'wp', array( __CLASS__, 'hooks' ) );
		add_filter( 'iconic_woothumbs_load_assets', '__return_true' );
	}

	/**
	 * After theme setup.
	 *
	 * @return void
	 */
	public static function hooks() {
		global $themename, $iconic_woothumbs_class, $post, $product;

		if ( ! is_object( $post ) && ! is_object( $product ) ) {
			return;
		}

		if ( ! isset( $themename ) || 'Divi' !== $themename ) {
			return;
		}

		if ( ! $iconic_woothumbs_class->is_enabled() ) {
			return;
		}

		$is_theme_builder_enabled  = self::is_divi_theme_builder_enabled();
		$is_visual_builder_enabled = 'on' === get_post_meta( $post->ID, '_et_pb_use_builder', true );

		// Only disable WooThumbs default action when either
		// Divi Visual Builder or Divi Theme Builder is enabled for the product.
		if ( is_product() && ( $is_theme_builder_enabled || $is_visual_builder_enabled ) ) {
			remove_action( 'woocommerce_before_single_product_summary', array( $iconic_woothumbs_class, 'show_product_images' ), 20 );
		}

		// Replace the output of Divi's image module with WooThumbs.
		add_filter( 'et_module_shortcode_output', array( __CLASS__, 'change_divi_woo_images_module_output' ), 10, 3 );
	}

	/**
	 * Replace the output of Divi's WooCommerce Images module with WooThumbs.
	 *
	 * @param string $output      The HTML output of the module.
	 * @param string $render_slug The slug/shortcode of module.
	 * @param Object $element     The module object.
	 *
	 * @return string $output
	 */
	public static function change_divi_woo_images_module_output( $output, $render_slug, $element ) {
		global $iconic_woothumbs_class, $post, $product;

		if ( 'et_pb_wc_images' !== $render_slug || isset( $_REQUEST['et_fb'] ) ) {
			return $output;
		}

		$sale_flash = '';
		$product_id = $element->props['product'];

		// In a "current" context, we just use the current product
		// object, but only if we're on a product page.
		if ( is_product() && $product_id && 'current' === $product_id ) {
			$product_id = $product->get_id();
		}

		// If this is a page and we have no product ID e.g. "current" or
		// falsey, just return the default WooCommerce gallery output.
		if ( is_page() && $product_id && ! is_numeric( $product_id ) ) {
			return $output;
		}

		$the_product = ( is_product() ) ? $product : wc_get_product( $product_id );

		if ( ! $the_product ) {
			return $output;
		}

		$shortcode = sprintf( '[woothumbs-gallery id="%d"]', $product_id );

		return do_shortcode( $shortcode );
	}

	/**
	 * Is Divi builder enabled for current product?
	 * https://www.elegantthemes.com/documentation/divi/the-divi-theme-builder/
	 *
	 * @return bool
	 */
	public static function is_divi_theme_builder_enabled() {
		$layouts = et_theme_builder_get_template_layouts();

		if ( empty( $layouts ) ) {
			return false;
		}

		return $layouts[ ET_THEME_BUILDER_BODY_LAYOUT_POST_TYPE ]['override'];
	}

}

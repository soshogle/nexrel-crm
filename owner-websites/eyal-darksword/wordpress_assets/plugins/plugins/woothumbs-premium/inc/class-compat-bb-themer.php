<?php
/**
 * Beaver Builder Themer.
 *
 * @package iconic-woothumbs
 */

/**
 * BB Themer compatibility Class
 *
 * @since 5.0.1
 */
class Iconic_WooThumbs_Compat_BB_Themer {
	/**
	 * Init.
	 */
	public static function run() {
		add_action( 'plugins_loaded', array( __CLASS__, 'plugins_loaded_hook' ) );
	}

	/**
	 * Add hooks on plugins loaded.
	 *
	 * @return void
	 */
	public static function plugins_loaded_hook() {
		add_filter( 'fl_theme_builder_woocommerce_template_html_woocommerce_show_product_images', array( __CLASS__, 'replace_bb_themer_woo_gallery_module' ) );
	}

	/**
	 * Replace the callback used to generate
	 * the WooCommerce Product Images module.
	 *
	 * @param  string $function Callback function name.
	 *
	 * @return string
	 */
	public static function replace_bb_themer_woo_gallery_module( $function ) {
		$callback = 'iconic_woothumbs_show_product_images_callable';
		// We need to create a function to ensure that we can
		// pass a valid callable into the function_exists check
		// in FLPageDataWooCommerce::get_template_html().
		//
		// This function now exists in the global namespace,
		// despite being created within a class.
		if ( ! function_exists( $callback ) ) {
			/**
			 * Callback function in the global namespace
			 * to generate the WooThumbs gallery.
			 *
			 * @return void
			 */
			function iconic_woothumbs_show_product_images_callable() {
				global $iconic_woothumbs_class;
				$iconic_woothumbs_class->show_product_images();
			}

			$function = $callback;
		}

		return $function;
	}
}

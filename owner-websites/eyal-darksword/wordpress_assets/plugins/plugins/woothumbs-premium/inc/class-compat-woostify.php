<?php

/**
 * Woostify theme compatibility Class
 *
 * @since 4.9.0
 */
class Iconic_WooThumbs_Compat_Woostify {
	/**
	 * Init.
	 */
	public static function run() {
		$theme = wp_get_theme();

		if ( 'woostify' !== $theme->template ) {
			return;
		}

		add_action( 'init', array( __CLASS__, 'remove_gallery' ) );
	}

	/**
	 * Remove gallery.
	 */
	public static function remove_gallery() {
		remove_action( 'woocommerce_before_single_product_summary', 'woostify_single_product_gallery_open', 20 );

		remove_action( 'woocommerce_before_single_product_summary', 'woostify_single_product_gallery_image_slide', 30 );
		remove_action( 'woocommerce_before_single_product_summary', 'woostify_single_product_gallery_thumb_slide', 40 );

		remove_action( 'woocommerce_before_single_product_summary', 'woostify_print_out_of_stock_label', 30 );
		remove_action( 'woocommerce_before_single_product_summary', 'woostify_product_video_button_play', 35 );
		remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_images', 40 );

		remove_action( 'woocommerce_before_single_product_summary', 'woostify_single_product_gallery_close', 50 );
		remove_action( 'woocommerce_before_single_product_summary', 'woostify_single_product_gallery_dependency', 100 );
	}
}

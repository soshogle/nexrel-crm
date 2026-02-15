<?php

/**
 * Yith Badge Management compatibility Class
 *
 * @since 4.6.11
 */
class Iconic_WooThumbs_Compat_Yith_Badge {
	/**
	 * Init.
	 */
	public static function run() {
		add_action( 'iconic_woothumbs_before_images', array( __CLASS__, 'show_badge_on_product' ), 10 );
	}

	/**
	 * Show badge on product.
	 */
	public static function show_badge_on_product() {
		if ( ! function_exists( 'YITH_WCBM_Frontend' ) ) {
			return;
		}

		global $product;

		$yith_wcbm_fe = YITH_WCBM_Frontend();

		echo $yith_wcbm_fe->show_badge_on_product( '', $product->get_id() );
	}
}
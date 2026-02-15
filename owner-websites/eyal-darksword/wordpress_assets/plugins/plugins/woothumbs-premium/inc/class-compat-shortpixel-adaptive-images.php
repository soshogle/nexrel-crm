<?php
/**
 * Compatibility: ShortPixel Adaptive Images.
 *
 * @package iconic-woothumbs
 */

/**
 * ShortPixel Adaptive Images compatibility Class
 *
 * @since 4.8.12
 */
class Iconic_WooThumbs_Compat_ShortPixel_Adaptive_Images {
	/**
	 * Init.
	 */
	public static function run() {
		add_action( 'plugins_loaded', array( __CLASS__, 'init' ) );
	}

	/**
	 * Run once all plugins are loaded.
	 */
	public static function init() {
		if ( ! class_exists( 'ShortPixel\AI\TagRule' ) ) {
			return;
		}

		add_action( 'shortpixel/ai/customRules', array( __CLASS__, 'woothumbs_image_sizes' ), 0 );
	}

	/**
	 * Add WooThumbs Image Sizes.
	 *
	 * Adds WooThumbs image sizes to the ShortPixel regex.
	 *
	 * @param array $regex_items Image Size Regex.
	 */
	public static function woothumbs_image_sizes( $regex_items ) {
		$regex_items[] = array( 'img', 'data-large_image', false, false, false, false, true );
		$regex_items[] = new ShortPixel\AI\TagRule( 'img', 'srcset', false, false, false, false, false, 'srcset', 'replace_custom_srcset' );
		$regex_items[] = new ShortPixel\AI\TagRule( 'div', 'data-default', 'iconic-woothumbs-all-images-wrap', false, false, false, false, 'srcset', 'replace_custom_json_attr' );

		return $regex_items;
	}
}

<?php
/**
 * QuickView Compatibility
 *
 * @package iconic-woothumbs
 */

/**
 * Iconic QuickView compatibility Class
 *
 * @since 4.16.12
 */
class Iconic_WooThumbs_Compat_Iconic_QuickView {
	/**
	 * Init.
	 */
	public static function run() {
		add_action( 'jckqv-before-addtocart', array( __CLASS__, 'modal_insert_variation_data' ) );
	}

	/**
	 * Insert the WooThumbs variation data into the modal.
	 *
	 * @return void
	 */
	public static function modal_insert_variation_data() {
		global $iconic_woothumbs_class;

		$iconic_woothumbs_class->generate_variation_data();
	}
}



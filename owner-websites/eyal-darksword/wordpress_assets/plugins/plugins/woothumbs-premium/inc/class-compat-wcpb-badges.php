<?php
/**
 * Compatibility: WCPB Badges.
 *
 * @package iconic-woothumbs
 */

/**
 * WCPB Badges plugin compatibility.
 * https://woocommerce.com/products/product-badges/
 *
 * @since 4.8.13
 */
class Iconic_WooThumbs_Compat_WCPB_Badges {
	/**
	 * Run.
	 */
	public static function run() {
		add_action( 'plugins_loaded', array( __CLASS__, 'hook_badges' ) );
	}

	/**
	 * Add missing badges hook.
	 */
	public static function hook_badges() {
		if ( ! class_exists( 'WCPB_Product_Badges_Public' ) ) {
			return;
		}

		if ( version_compare( phpversion(), '5.4', '<' ) ) {
			return;
		}

		add_action( 'iconic_woothumbs_before_images', array( __CLASS__, 'add_badge' ) );
	}

	/**
	 * Output badge.
	 *
	 * @throws ReflectionException
	 */
	public static function add_badge() {
		global $product;

		$reflection    = new ReflectionClass( 'WCPB_Product_Badges_Public' );
		$wcpb_instance = $reflection->newInstanceWithoutConstructor();

		// We need to filter/hack the visibility meta value to ensure that
		// the badge is output when it's set to anything other than "all".
		//
		// This is because of the hook specific conditional logic in the
		// class-wcpb-product-badges-public.php file in the Product Badges
		// plugin. We are firing the call on iconic_woothumbs_before_images,
		// which is a different hook to what their logic is expecting.
		add_filter( 'get_post_metadata', array( __CLASS__, 'filter_visibility_meta' ), 10, 5 );

		$wcpb_instance->badge( $product, true );

		// We need to immediately remove the meta value filter to ensure everything
		// works as normal elsewhere.
		remove_filter( 'get_post_metadata', array( __CLASS__, 'filter_visibility_meta' ), 10 );
	}

	/**
	 * Filter the badge visibility meta value
	 *
	 * @param mixed  $value     The value to return, either a single metadata value or an array
	 *                          of values depending on the value of `$single`. Default null.
	 * @param int    $object_id ID of the object metadata is for.
	 * @param string $meta_key  Metadata key.
	 * @param bool   $single    Whether to return only the first value of the specified `$meta_key`.
	 * @param string $meta_type Type of object metadata is for. Accepts 'post', 'comment', 'term', 'user',
	 *                          or any other object type with an associated meta table.
	 *
	 * @return mixed
	 */
	public static function filter_visibility_meta( $value, $object_id, $meta_key, $single, $meta_type ) {
		if ( '_wcpb_product_badges_display_visibility' === $meta_key ) {
			return 'all';
		}

		return $value;
	}
}
